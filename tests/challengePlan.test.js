const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const summaries = [];
const planErrors = [];
const context = vm.createContext({
  console: {
    info(message) { summaries.push(message); },
    error(...args) { planErrors.push(args); }
  },
  getCardWord: card => card && card.word || '',
  getCardMeaning: card => card && card.meaning || '',
  findClozeSpan(text, word) {
    const sentence = String(text || '').split('/')[0].trim();
    const target = String(word || '').split('/')[0].trim();
    if (!sentence || !target) return null;
    const index = sentence.toLocaleLowerCase().indexOf(target.toLocaleLowerCase());
    return index < 0 ? null : {
      prefix: sentence.slice(0, index),
      matched: sentence.slice(index, index + target.length),
      suffix: sentence.slice(index + target.length)
    };
  },
  buildSpellingPuzzle(word) {
    const answer = String(word || '').toLocaleLowerCase();
    return { slots: answer.split(''), slotAnswers: answer.split(''), choices: [] };
  }
});

vm.runInContext(fs.readFileSync(path.join(root, 'js/questionTypes.js'), 'utf8'), context);

const formalTypes = Array.from(vm.runInContext('CHALLENGE_TYPE_IDS', context));
const registeredTypes = Array.from(vm.runInContext('Object.keys(ChallengeQuestionTypes)', context));
const labels = vm.runInContext('CHALLENGE_TYPE_LABELS', context);
const classes = vm.runInContext('CHALLENGE_TYPE_CLASSES', context);
const interfacesComplete = vm.runInContext(`CHALLENGE_TYPE_IDS.every(id => {
  const type = ChallengeQuestionTypes[id];
  return type && ['build', 'render', 'setup', 'grade', 'applyResult'].every(name => typeof type[name] === 'function');
})`, context);

assert.deepEqual(formalTypes, ['A', 'B', 'C', 'L', 'S', 'O', 'D', 'P', 'K', 'R']);
assert.ok(formalTypes.every(type => registeredTypes.includes(type) && labels[type] && classes[type]));
assert.equal(interfacesComplete, true, 'all challenge types must expose the rendering and grading contract');

const words = ['apple', 'bridge', 'candle', 'dragon', 'eagle', 'flower', 'garden', 'harbor', 'island', 'jungle'];

function makeCards(count = 10, options = {}) {
  return words.slice(0, count).map((word, index) => ({
    word,
    meaning: `释义${index + 1}`,
    phonetic: options.noPhonetic ? '' : `/${word}/`,
    pos: 'n.',
    collocations: options.noCollocations ? [] : [{
      phrase: `learn ${word} well`,
      example: `We learn ${word} every day / 示例句`
    }]
  }));
}

function build(cards, allCards = cards) {
  context.testDeck = cards;
  context.testAllCards = allCards;
  return vm.runInContext('buildChallengePlan(testDeck, testAllCards)', context);
}

function typeCounts(plan) {
  return Object.fromEntries(formalTypes.map(type => [type, plan.filter(question => question.actualType === type).length]));
}

function assertComplete(plan, label) {
  assert.equal(plan.length, 10, `${label}: should contain exactly 10 questions`);
  assert.ok(plan.every(question => question && question.card && question.requestedType && question.actualType), `${label}: incomplete question`);
  plan.filter(question => Array.isArray(question.options)).forEach(question => {
    assert.equal(question.options.length, 4, `${label}/${question.actualType}: should contain four options`);
    assert.equal(new Set(question.options.map(option => String(option).trim().toLocaleLowerCase())).size, 4,
      `${label}/${question.actualType}: options must be unique`);
    assert.ok(question.options.every(option => String(option).trim()), `${label}/${question.actualType}: blank option`);
  });
}

const completeCards = makeCards();
const complete = build(completeCards);
assertComplete(complete, 'complete');
assert.deepEqual(typeCounts(complete), Object.fromEntries(formalTypes.map(type => [type, 1])));
assert.equal(new Set(complete.map(question => question.card)).size, 10, 'complete: should use one card per question');
assert.ok(complete.every(question => question.fallbackFrom === null), 'complete: should not use fallbacks');

const displayOrders = new Set([complete, build(completeCards), build(completeCards)]
  .map(plan => plan.map(question => question.actualType).join('')));
assert.ok(displayOrders.size > 1, 'complete: final display order should be shuffled');

const noCollocations = build(makeCards(10, { noCollocations: true }));
assertComplete(noCollocations, 'no collocations');
assert.ok(noCollocations.filter(question => ['A', 'K', 'R'].includes(question.requestedType))
  .every(question => question.fallbackFrom === question.requestedType));

const noPhonetic = build(makeCards(10, { noPhonetic: true }));
assertComplete(noPhonetic, 'no phonetic');
assert.equal(noPhonetic.find(question => question.requestedType === 'P').fallbackFrom, 'P');

const threeCards = makeCards(3);
const smallPool = build(threeCards);
assertComplete(smallPool, 'three cards');
assert.equal(new Set(smallPool.map(question => question.card)).size, 3, 'three cards: all cards should be used before repeats');
assert.ok(smallPool.every(question => !['A', 'B', 'C', 'L', 'P', 'K'].includes(question.actualType)),
  'three cards: choice types without four unique options must be replaced');

const illegalCards = [
  { word: '', meaning: '空', phonetic: '', collocations: [] },
  { word: '-', meaning: '横线', phonetic: '', collocations: [] },
  { word: 'ice cream', meaning: '冰淇淋', phonetic: '', collocations: [] },
  ...makeCards(7)
];
const illegalPlan = build(illegalCards);
assertComplete(illegalPlan, 'illegal spellings');
assert.ok(illegalPlan.filter(question => ['D', 'S', 'O'].includes(question.actualType))
  .every(question => /^[a-z]+$/.test(question.card.word)), 'illegal spellings: simple-word types used an invalid card');

const unusable = build([{ word: '', meaning: '', phonetic: '', collocations: [] }]);
assert.deepEqual(Array.from(unusable), [], 'no usable data: should stop without placeholder questions');
assert.ok(planErrors.length > 0, 'no usable data: should emit a diagnostic error');

const taskEngineSource = fs.readFileSync(path.join(root, 'js/taskEngine.js'), 'utf8');
const quizSource = fs.readFileSync(path.join(root, 'js/quiz.js'), 'utf8');
const homeSource = fs.readFileSync(path.join(root, 'js/home.js'), 'utf8');
const mergeSource = fs.readFileSync(path.join(root, 'js/merge.js'), 'utf8');
assert.match(taskEngineSource, /startChallengeTask[\s\S]*buildChallengePlan\(deck, activeTaskAllCards, 'task-challenge'\)/);
assert.doesNotMatch(taskEngineSource, /deck\.map\(card => makeTaskChallengeQuestion/);
assert.match(quizSource, /startDailyQuiz[\s\S]*startPlannedDailyQuiz\(pool, batch\.cards, 'daily'\)/);
assert.match(homeSource, /startPlannedDailyQuiz\(pool,[\s\S]*'global-daily'\)/);
assert.match(mergeSource, /startPlannedDailyQuiz\(deck,[\s\S]*'merge-daily'\)/);
assert.match(quizSource, /completeActiveChallenge\(dqCorrect, dqQuestions\.length\)/);

console.log(JSON.stringify({
  complete: complete.map(question => `${question.actualType}(${question.card.word})`),
  noCollocations: noCollocations.map(question => `${question.requestedType}->${question.actualType}`),
  noPhonetic: noPhonetic.map(question => `${question.requestedType}->${question.actualType}`),
  threeCards: smallPool.map(question => `${question.requestedType}->${question.actualType}(${question.card.word})`),
  illegalSpellings: illegalPlan.map(question => `${question.actualType}(${question.card.word})`),
  noUsableQuestions: unusable.length
}, null, 2));
console.log('challengePlan tests passed');
