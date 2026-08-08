const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const queue = require('../js/vocabularyAdventureLessonQueue.js');
const groups = require('../js/vocabularyLessonGroups.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventureLessonQueue.js'), 'utf8');
assert.match(source, /saveCurrentVocabularyAdventureStateWithLessonQueue\(stateValue, \.\.\.saveArgs\)/);
assert.equal((source.match(/originalSave\.call\(root, (?:stateValue|merged), \.\.\.saveArgs\)/g) || []).length, 2);
assert.match(source, /saveCurrentVocabularyAdventureStateWithLessonQueue\.__vteCoordinatorWrapped/);

// Dependency gate: this stacked PR must continue running against the current
// 20-word lesson-group base. The base branch's own safety tests cover failed
// cloud reads and migration markers in the same pull-request merge ref.
assert.equal(groups.GROUP_SIZE, 20);

function progress(count, eligibleDate = '2026-08-02') {
  return {
    version: 1,
    groups: {},
    challengeQueue: {
      'book:g01': {
        eligibleDate,
        wordKeys: Array.from({ length: count }, (_, index) => `word-${index + 1}`),
        consumedWordKeys: [],
        createdAt: '2026-08-01T20:00:00+08:00'
      }
    },
    migrations: {}
  };
}

const sourceState = {
  version: 1,
  session: { date: '2026-08-02', plan: [], cursor: 0, completed: true },
  words: {
    'word-1': { lastResult: 'D', reviewCount: 0, challengeFlagAt: 'old-flag' },
    old: { lastResult: 'F', reviewCount: 3, intervalIndex: 2, nextReviewAt: '2026-08-01' },
    unseen: { lastResult: '', reviewCount: 0 }
  }
};

const today = queue.decorateAdventureStateForLessonQueue({
  state: sourceState,
  progress: progress(2),
  today: '2026-08-01',
  visibleWordKeys: ['word-1', 'word-2', 'old', 'unseen']
});
assert.deepEqual(today.queuedItems, []);
assert.equal(today.state.words['word-1'].challengeFlagAt, 'old-flag');

const tomorrow = queue.decorateAdventureStateForLessonQueue({
  state: sourceState,
  progress: progress(2),
  today: '2026-08-02',
  visibleWordKeys: ['word-1', 'word-2', 'old', 'unseen']
});
assert.deepEqual(tomorrow.queuedKeys, ['word-1', 'word-2']);
assert.equal(tomorrow.state.words['word-1'].lastResult, 'F');
assert.equal(tomorrow.state.words['word-1'].reviewCount, 1);
assert.equal(tomorrow.state.words['word-1'].challengeFlagAt, '');
assert.equal(tomorrow.state.words['word-2'].lastResult, 'F');
assert.equal(tomorrow.state.words.old.lastResult, 'D');
assert.equal(tomorrow.state.words.old.nextReviewAt, '2026-10-01');
assert.equal(tomorrow.state.words.unseen.reviewCount, 0);
assert.equal(sourceState.words['word-1'].challengeFlagAt, 'old-flag', 'source state must stay immutable');
assert.equal(sourceState.words.old.lastResult, 'F', 'source priorities must stay immutable');

const merged = queue.mergeChallengeStateIntoOriginal(sourceState, {
  ...tomorrow.state,
  challengeDaily: { date: '2026-08-02', attempts: 1, bestScore: 70 },
  challengeSession: { date: '2026-08-02', status: 'completed', items: [] },
  words: {
    ...tomorrow.state.words,
    'word-2': { ...tomorrow.state.words['word-2'], challengeFlagAt: '2026-08-02T10:00:00Z' }
  }
});
assert.equal(merged.words['word-1'].lastResult, 'D', 'synthetic F state must not persist');
assert.equal(merged.words.old.lastResult, 'F', 'original review state must be preserved');
assert.equal(merged.words['word-2'].lastResult, undefined);
assert.equal(merged.words['word-2'].challengeFlagAt, '2026-08-02T10:00:00Z');
assert.equal(merged.challengeDaily.attempts, 1);
assert.equal(merged.challengeSession.status, 'completed');

function completedSession(keys, status = 'completed') {
  return {
    date: '2026-08-02',
    status,
    items: keys.map(wordKey => ({ wordKey, status: 'answered' }))
  };
}

const abandoned = queue.consumeCompletedChallengeQueue(progress(20), completedSession(['word-1'], 'abandoned'));
assert.equal(abandoned.changed, false);
assert.equal(groups.collectEligibleQueuedWords(abandoned.progress, '2026-08-02').length, 20);

const firstTen = queue.consumeCompletedChallengeQueue(
  progress(20),
  completedSession(Array.from({ length: 10 }, (_, index) => `word-${index + 1}`))
);
assert.equal(firstTen.changed, true);
assert.equal(firstTen.consumedItems.length, 10);
assert.equal(groups.collectEligibleQueuedWords(firstTen.progress, '2026-08-02').length, 10);

const twelve = queue.consumeCompletedChallengeQueue(
  progress(12),
  completedSession(Array.from({ length: 10 }, (_, index) => `word-${index + 1}`))
);
assert.equal(groups.collectEligibleQueuedWords(twelve.progress, '2026-08-02').length, 2);

const repairedAgain = queue.consumeCompletedChallengeQueue(firstTen.progress, completedSession(
  Array.from({ length: 10 }, (_, index) => `word-${index + 1}`)
));
assert.equal(repairedAgain.changed, false, 'repair must be idempotent');
assert.equal(groups.collectEligibleQueuedWords(repairedAgain.progress, '2026-08-02').length, 10);

console.log('vocabulary adventure lesson queue tests passed');

(async () => {
  let savedAdventure = null;
  let savedProgress = null;
  let loadOptions = null;
  const screens = {
    screenVocabularyAdventure: false,
    screenVocabularyAdventureChallenge: false
  };
  const actual = {
    version: 1,
    words: { old: { lastResult: 'H', reviewCount: 2, intervalIndex: 1, nextReviewAt: '2026-08-02' } },
    session: { date: '2026-08-02', plan: [], cursor: 0, completed: true }
  };
  const fakeRoot = {
    currentUser: 'sister',
    document: {
      getElementById(id) {
        return { classList: { contains: () => !!screens[id] } };
      }
    },
    VocabularyAdventureCore: { localDateKey: () => '2026-08-02' },
    collectVisibleVocabularyAdventureCandidates() {
      return ['word-1', 'word-2', 'old'].map(key => ({ key, word: key }));
    },
    async loadVocabularyAdventureState(_user, options) {
      loadOptions = options || null;
      return JSON.parse(JSON.stringify(actual));
    },
    async saveCurrentVocabularyAdventureState(value) {
      savedAdventure = JSON.parse(JSON.stringify(value));
      return true;
    },
    async sbGet() { return progress(2); },
    async sbSet(_key, value) { savedProgress = JSON.parse(JSON.stringify(value)); }
  };

  assert.equal(queue.installVocabularyAdventureLessonQueueBrowserPatch(fakeRoot), true);
  const decorated = await fakeRoot.loadVocabularyAdventureState('sister', { requireRemote: true });
  assert.deepEqual(loadOptions, { requireRemote: true });
  assert.equal(decorated.words['word-1'].lastResult, 'F');
  assert.equal(decorated.words.old.lastResult, 'D');

  screens.screenVocabularyAdventureChallenge = true;
  decorated.challengeDaily = { date: '2026-08-02', attempts: 1, bestScore: 100 };
  decorated.challengeSession = completedSession(['word-1', 'old']);
  assert.equal(await fakeRoot.saveCurrentVocabularyAdventureState(decorated, { mode: 'challenge' }), true);
  assert.equal(savedAdventure.words['word-1'], undefined, 'browser bridge must not persist queue priority decoration');
  assert.equal(savedAdventure.words.old.lastResult, 'H', 'browser bridge must preserve original adventure review state');
  assert.equal(savedProgress.challengeQueue['book:g01'].consumedWordKeys.length, 1);
  console.log('vocabulary adventure lesson queue browser bridge passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
