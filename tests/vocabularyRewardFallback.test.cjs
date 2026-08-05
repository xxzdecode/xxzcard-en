const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const core = require('../js/vocabularyAdventureCore.js');
const challenge = require('../js/vocabularyAdventureChallenge.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventure.js'), 'utf8');
const browserRoot = {
  console: { warn() {} },
  loadFeatureScript: async () => { throw new Error('injected settlement module outage'); }
};
const context = vm.createContext({
  ...browserRoot,
  globalThis: browserRoot,
  module: { exports: {} },
  require(id) {
    if (id === './vocabularyAdventureCore.js') return core;
    if (id === './studentVocabularyRewardSettlement.js') return null;
    throw new Error(`unexpected require: ${id}`);
  }
});
context.globalThis = context;
vm.runInContext(source, context, { filename: 'vocabularyAdventure.js' });

const { createVocabularyAdventureAdapter } = context.module.exports;
const writes = [];
const adapter = createVocabularyAdventureAdapter({
  getCurrentUser: () => 'sister',
  isTeacherUser: () => false,
  visibleBatchesForCurrentUser: () => [],
  commonBatchesOnly: value => value,
  getValue: async () => null,
  setValue: async (key, value) => {
    writes.push({ key, value: JSON.parse(JSON.stringify(value)) });
    return true;
  },
  rewardApi: () => null,
  reportStorageError() {},
  warn() {}
});

const date = '2026-08-05';
const rewardSettlement = challenge.createCompletedChallengeRewardMarker(
  { date, attempts: 1, bestScore: 100 },
  { date, correctCount: 10 },
  `${date}T08:00:00.000Z`
);
const completed = {
  version: 1,
  words: {},
  session: null,
  challengeDaily: { date, attempts: 1, bestScore: 100, rewardSettlement },
  challengeSession: {
    date,
    status: 'completed',
    correctCount: 10,
    completedAt: `${date}T08:00:00.000Z`
  }
};

(async () => {
  const saved = await adapter.saveVocabularyAdventureState('sister', completed);
  assert.equal(saved, true, 'score save must succeed even while settlement support is unavailable');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'vocab_adventure_v1_sister');
  assert.equal(writes[0].value.challengeDaily.bestScore, 100);
  assert.equal(writes[0].value.challengeDaily.rewardSettlement.status, 'pending');
  assert.equal(writes[0].value.challengeDaily.rewardSettlement.target, 10);
  console.log('vocabulary reward fallback tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
