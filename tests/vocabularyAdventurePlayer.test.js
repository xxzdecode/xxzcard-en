const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../js/vocabularyAdventureCore.js');
const player = require('../js/vocabularyAdventurePlayer.js');

const root = path.resolve(__dirname, '..');
const TODAY = '2026-07-28';

function makeCard(word, meaning, extra = {}) {
  return {
    word,
    meaning,
    pos: '名词',
    phonetic: `/${word}/`,
    emoji: '🧪',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: '',
    ...extra
  };
}

function makeCandidates(entries) {
  return core.collectVocabularyAdventureCandidates([{
    id: 'common',
    name: '正式常用词',
    cards: entries.map(([word, meaning], index) => makeCard(word, meaning, { emoji: `E${index}` }))
  }]);
}

const questionCandidates = makeCandidates([
  ['apple', '苹果'],
  ['pear', '梨'],
  ['peach', '桃子'],
  ['plum', '李子'],
  ['grape', '葡萄']
]);

for (const taskType of core.SCREENING_TASK_TYPES) {
  const settings = {
    candidates: questionCandidates,
    sessionDate: TODAY,
    wordKey: 'apple',
    planIndex: 3,
    taskType
  };
  const first = core.buildVocabularyAdventureQuestion(settings);
  const refreshed = core.buildVocabularyAdventureQuestion(settings);
  assert.equal(first.ok, true);
  assert.deepEqual(first, refreshed, `${taskType} must remain stable after refresh`);
  assert.equal(first.options.length, 4);
  assert.equal(first.options.filter(option => option.correct).length, 1);
  assert.ok(first.correctIndex >= 0);
  assert.equal(new Set(first.options.map(option => option.key)).size, first.options.length);
  assert.doesNotMatch(first.seed, /undefined/);
}

const assignedTypes = new Set(Array.from({ length: 30 }, (_, planIndex) => (
  core.assignVocabularyAdventureTaskType({
    sessionDate: TODAY,
    wordKey: questionCandidates[planIndex % questionCandidates.length].key,
    planIndex
  })
)));
assert.deepEqual(assignedTypes, new Set(core.SCREENING_TASK_TYPES));
const initialType = core.assignVocabularyAdventureTaskType({
  sessionDate: TODAY,
  wordKey: 'apple',
  planIndex: 0
});
assert.notEqual(core.assignVocabularyAdventureTaskType({
  sessionDate: TODAY,
  wordKey: 'apple',
  planIndex: 0,
  lastTaskType: initialType
}), initialType);

const duplicateMeanings = makeCandidates([
  ['apple', '水果'],
  ['pear', '水果'],
  ['carrot', '胡萝卜'],
  ['onion', '洋葱']
]);
const meaningQuestion = core.buildVocabularyAdventureQuestion({
  candidates: duplicateMeanings,
  sessionDate: TODAY,
  wordKey: 'apple',
  planIndex: 0,
  taskType: 'wordToMeaning'
});
assert.equal(meaningQuestion.ok, true);
assert.equal(new Set(meaningQuestion.options.map(option => option.label)).size, meaningQuestion.options.length);
assert.equal(meaningQuestion.options.filter(option => option.label === '水果').length, 1);

assert.equal(core.buildVocabularyAdventureQuestion({
  candidates: questionCandidates.slice(0, 3),
  sessionDate: TODAY,
  wordKey: 'apple',
  planIndex: 0,
  taskType: 'meaningToWord'
}).options.length, 3);
assert.equal(core.buildVocabularyAdventureQuestion({
  candidates: questionCandidates.slice(0, 2),
  sessionDate: TODAY,
  wordKey: 'apple',
  planIndex: 0,
  taskType: 'audioToWord'
}).options.length, 2);
assert.deepEqual(core.buildVocabularyAdventureQuestion({
  candidates: questionCandidates.slice(0, 1),
  sessionDate: TODAY,
  wordKey: 'apple',
  planIndex: 0,
  taskType: 'audioToWord'
}), {
  ok: false,
  code: 'INSUFFICIENT_OPTIONS',
  wordKey: 'apple',
  taskType: 'audioToWord'
});
assert.equal(core.buildVocabularyAdventureQuestion({
  candidates: questionCandidates,
  sessionDate: TODAY,
  wordKey: 'hidden',
  planIndex: 0
}).code, 'WORD_NOT_VISIBLE');

const direct = player.createVocabularyAdventureAttemptTracker();
assert.deepEqual(direct.answer(true), { kind: 'result', result: 'D', attemptCount: 1, hintUsed: false });
assert.equal(direct.answer(false).kind, 'locked');

const hinted = player.createVocabularyAdventureAttemptTracker();
assert.deepEqual(hinted.answer(false), { kind: 'hint', attemptCount: 1, hintUsed: true });
assert.deepEqual(hinted.answer(true), { kind: 'result', result: 'H', attemptCount: 2, hintUsed: true });
assert.equal(hinted.answer(true).kind, 'locked');

const failed = player.createVocabularyAdventureAttemptTracker();
assert.equal(failed.answer(false).kind, 'hint');
assert.deepEqual(failed.answer(false), { kind: 'result', result: 'F', attemptCount: 2, hintUsed: true });
assert.equal(failed.snapshot().locked, true);

function stateWithPlan(plan) {
  return {
    version: 1,
    words: {},
    session: {
      date: TODAY,
      plan,
      cursor: 0,
      phase: plan[0].phase,
      completed: false,
      rewardGranted: false
    }
  };
}

function planEntry(wordKey, phase = 'screening') {
  return {
    wordKey,
    word: wordKey,
    batchId: 'common',
    batchName: '正式常用词',
    cardIndex: 0,
    phase,
    taskType: '',
    status: 'pending',
    result: ''
  };
}

const originalState = stateWithPlan([planEntry('apple'), planEntry('pear')]);
const originalSnapshot = structuredClone(originalState);
const nextState = core.prepareVocabularyAdventureResult(originalState, {
  expectedCursor: 0,
  wordKey: 'apple',
  taskType: 'wordToMeaning',
  result: 'D',
  reviewedAt: new Date(2026, 6, 28, 10, 0, 0)
});
assert.deepEqual(originalState, originalSnapshot, 'result preparation must not mutate input');
assert.equal(nextState.words.apple.reviewCount, 1);
assert.equal(nextState.words.apple.lastResult, 'D');
assert.equal(nextState.words.apple.lastTaskType, 'wordToMeaning');
assert.equal(nextState.session.plan[0].status, 'completed');
assert.equal(nextState.session.plan[0].result, 'D');
assert.equal(nextState.session.plan[0].taskType, 'wordToMeaning');
assert.equal(nextState.session.cursor, 1);
assert.equal(nextState.session.completed, false);
assert.throws(() => core.prepareVocabularyAdventureResult(nextState, {
  expectedCursor: 0,
  wordKey: 'apple',
  taskType: 'wordToMeaning',
  result: 'D',
  reviewedAt: new Date()
}), error => error.code === 'CURSOR_MISMATCH');
assert.throws(() => core.prepareVocabularyAdventureResult(originalState, {
  expectedCursor: 0,
  wordKey: 'pear',
  taskType: 'wordToMeaning',
  result: 'D',
  reviewedAt: new Date()
}), error => error.code === 'WORD_MISMATCH');
assert.throws(() => core.prepareVocabularyAdventureResult(
  stateWithPlan([planEntry('apple', 'review')]),
  {
    expectedCursor: 0,
    wordKey: 'apple',
    taskType: 'wordToMeaning',
    result: 'D',
    reviewedAt: new Date()
  }
), error => error.code === 'NOT_SCREENING');

const completedState = core.prepareVocabularyAdventureResult(
  stateWithPlan([planEntry('apple')]),
  {
    expectedCursor: 0,
    wordKey: 'apple',
    taskType: 'audioToWord',
    result: 'F',
    reviewedAt: new Date(2026, 6, 28, 10, 0, 0)
  }
);
assert.equal(completedState.session.cursor, 1);
assert.equal(completedState.session.completed, true);
assert.equal(completedState.session.phase, 'completed');

assert.equal(player.isVocabularyAdventurePreviewEnabled('?previewVocabularyAdventure=1', null), true);
assert.equal(player.isVocabularyAdventurePreviewEnabled('', { getItem: () => '1' }), true);
assert.equal(player.isVocabularyAdventurePreviewEnabled('', { getItem: () => null }), false);
assert.equal(player.isVocabularyAdventurePreviewEnabled('', { getItem: () => { throw new Error('blocked'); } }), false);

const fullCard = player.renderAdventureFullCardHtml(makeCard('apple', '苹果', {
  collocations: [{ phrase: 'an apple', example: 'I eat an apple.' }],
  irregularForms: [{ label: '复数', form: 'apples' }],
  synonyms: [{ word: 'fruit', meaning: '水果' }],
  wordFamily: [{ word: 'apple tree', meaning: '苹果树' }],
  tip: '每天一个苹果'
}));
for (const expected of ['apple', '苹果', 'an apple', 'apples', 'fruit', 'apple tree', '每天一个苹果']) {
  assert.match(fullCard, new RegExp(expected));
}

(async () => {
  const savedObjects = [];
  let shouldSave = false;
  const coordinator = player.createVocabularyAdventureSaveCoordinator(async value => {
    savedObjects.push(value);
    return shouldSave;
  });
  const preparedState = { marker: 'same-object' };
  const prepared = coordinator.prepare(preparedState, { result: 'H' });
  assert.equal(coordinator.prepare({ marker: 'ignored' }, { result: 'F' }), prepared);
  const firstSave = await coordinator.retry();
  assert.equal(firstSave.ok, false);
  assert.equal(coordinator.getPrepared(), prepared);
  shouldSave = true;
  const retrySave = await coordinator.retry();
  assert.equal(retrySave.ok, true);
  assert.equal(savedObjects[0], preparedState);
  assert.equal(savedObjects[1], preparedState);
  assert.equal(coordinator.getPrepared(), null);

  const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const homeSource = fs.readFileSync(path.join(root, 'js', 'home.js'), 'utf8');
  const playerSource = fs.readFileSync(path.join(root, 'js', 'vocabularyAdventurePlayer.js'), 'utf8');
  const screeningSource = fs.readFileSync(path.join(root, 'js', 'vocabularyScreening.js'), 'utf8');
  const serviceWorkerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert.match(indexSource, /id="todayWordBtn"/);
  assert.match(indexSource, /id="mixedWordBtn"/);
  assert.match(indexSource, /id="vocabularyAdventurePreviewEntry"[^>]*hidden/);
  assert.match(indexSource, /id="screenVocabularyAdventure"/);
  assert.match(homeSource, /updateVocabularyAdventurePreviewEntry/);
  assert.match(screeningSource, /const VOCABULARY_SCREENING_ENABLED = false/);
  assert.doesNotMatch(playerSource, /Math\.random/);
  assert.doesNotMatch(serviceWorkerSource, /vocabularyAdventure|styles-vocabulary-adventure/);

  console.log('vocabulary adventure player tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
