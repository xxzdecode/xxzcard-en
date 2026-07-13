const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const taskEngineSource = fs.readFileSync(path.join(root, 'js/taskEngine.js'), 'utf8');
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  window: { speechSynthesis: { cancel() {} } },
  document: {},
  getCardWord: card => card && card.en || '',
  getCardMeaning: card => card && card.zh || '',
  findClozeSpan(text, word) {
    const source = String(text || '');
    const target = String(word || '').split('/')[0].trim();
    if (!source || !target) return null;
    const index = source.toLocaleLowerCase().indexOf(target.toLocaleLowerCase());
    if (index < 0) return null;
    return {
      prefix: source.slice(0, index),
      matched: source.slice(index, index + target.length),
      suffix: source.slice(index + target.length)
    };
  },
  activeTaskAllCards: [],
  reviewSteps: [],
  reviewIndex: 0
});

vm.runInContext(fs.readFileSync(path.join(root, 'js/review.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/questionTypes.js'), 'utf8'), context);

const words = [
  'apple', 'bridge', 'candle', 'dragon', 'eagle',
  'flower', 'garden', 'harbor', 'island', 'jungle',
  'kitten', 'ladder', 'market', 'needle', 'orange',
  'pencil', 'queen', 'river', 'school', 'turtle'
];

function makeCards(count, options = {}) {
  return words.slice(0, count).map((word, index) => ({
    en: word,
    zh: `释义${index + 1}`,
    phonetic: options.noPhonetic ? '' : `/${word}/`,
    pos: 'n.',
    collocations: options.noCollocations ? [] : [{
      phrase: `use ${word} daily`,
      example: `We use ${word} every day / 我们每天使用它`
    }]
  }));
}

function build(cards) {
  context.activeTaskAllCards = cards;
  return vm.runInContext('buildReviewPlan(activeTaskAllCards, activeTaskAllCards)', context);
}

function types(plan) {
  return Array.from(plan, step => step.type);
}

function requestedTypes(plan) {
  return Array.from(plan, step => step.requestedType);
}

const expectedRequested = [
  'match',
  'repeat', 'repeat', 'repeat',
  'listen', 'listen', 'listen',
  'phonetic', 'phonetic',
  'blank', 'blank', 'blank',
  'sort', 'sort',
  'dictation', 'dictation',
  'collocation', 'collocation',
  'sentenceOrder', 'sentenceOrder'
];

function assertCompletePlan(plan, label) {
  assert.equal(plan.length, 20, `${label}: should contain 20 steps`);
  assert.deepEqual(requestedTypes(plan), expectedRequested, `${label}: template positions changed`);
  assert.ok(plan.every(Boolean), `${label}: contains an empty step`);
}

const complete = build(makeCards(20));
assertCompletePlan(complete, 'complete');
assert.deepEqual(types(complete), expectedRequested, 'complete: should not use fallbacks');

const noPhonetic = build(makeCards(20, { noPhonetic: true }));
assertCompletePlan(noPhonetic, 'no phonetic');
assert.equal(noPhonetic.filter(step => step.fallbackFrom === 'phonetic').length, 2);
assert.ok(noPhonetic.filter(step => step.requestedType === 'phonetic').every(step => step.type === 'listen'));

const noCollocations = build(makeCards(20, { noCollocations: true }));
assertCompletePlan(noCollocations, 'no collocations');
assert.ok(noCollocations.filter(step => step.requestedType === 'collocation').every(step => step.type === 'blank'));
assert.ok(noCollocations.filter(step => step.requestedType === 'sentenceOrder').every(step => step.type === 'sort'));

for (const size of [1, 3, 8]) {
  const plan = build(makeCards(size));
  assertCompletePlan(plan, `${size} card pool`);
  assert.equal(plan[0].cards.length, Math.min(4, size), `${size} card pool: match size`);
  assert.ok(plan.every(step => step.type === 'match' || step.card), `${size} card pool: cardless single step`);
  if (size > 1) {
    const singleWords = plan.slice(1).map(step => context.getCardWord(step.card));
    assert.ok(singleWords.every((word, index) => index === 0 || word !== singleWords[index - 1]), `${size} card pool: adjacent duplicate`);
  }
}

assert.match(taskEngineSource, /startTodayReview\(\)[\s\S]*startTask\(\{ source: 'today', mode: 'review' \}\)/);
assert.match(taskEngineSource, /startMixedReview\(\)[\s\S]*startTask\(\{ source: 'mixed', mode: 'review' \}\)/);
assert.match(taskEngineSource, /startBatchReview\(batchId\)[\s\S]*startTask\(\{ source: 'batch', mode: 'review', batchId \}\)/);
assert.match(taskEngineSource, /async function startReviewTask[\s\S]*buildReviewSteps\(deck\)/);

const sequences = {
  complete: types(complete),
  noPhonetic: types(noPhonetic),
  noCollocations: types(noCollocations),
  smallPools: Object.fromEntries([1, 3, 8].map(size => [size, types(build(makeCards(size))) ]))
};

console.log(JSON.stringify(sequences, null, 2));
console.log('reviewPlan tests passed');
