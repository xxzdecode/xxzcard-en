const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const queue = require('../js/vocabularyAdventureLessonQueue.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventureLessonQueue.js'), 'utf8');
assert.match(source, /challengeDate = candidateMode === 'challenge'/);
assert.match(source, /loadVocabularyLessonTaughtState/);
assert.match(source, /challengeSession\.status === 'completed'/);

const taughtState = {
  version: 1,
  groups: {
    'book-old:g01': {
      status: 'taught',
      taughtAt: '2026-08-19T10:00:00+08:00',
      eligibleDate: '2026-08-20',
      wordKeysSnapshot: ['old', 'shared']
    },
    'book-today:g01': {
      status: 'taught',
      taughtAt: '2026-08-21T10:00:00+08:00',
      eligibleDate: '2026-08-22',
      wordKeysSnapshot: ['bus', 'car', 'shared']
    }
  },
  migrations: {}
};

const candidates = ['old', 'bus', 'car', 'shared', 'untaught'].map(word => ({ key: word, word }));
assert.deepEqual(
  queue.filterTaughtCandidates(candidates, taughtState).map(item => item.key),
  ['old', 'bus', 'car', 'shared'],
  'adventure receives every globally taught word immediately'
);
assert.deepEqual(
  queue.filterTaughtCandidates(candidates, taughtState, '2026-08-21').map(item => item.key),
  ['old', 'shared'],
  'challenge excludes groups taught today'
);
assert.deepEqual(
  queue.filterTaughtCandidates(candidates, taughtState, '2026-08-22').map(item => item.key),
  ['old', 'bus', 'car', 'shared'],
  'challenge includes the group from the next day'
);

const actual = {
  version: 1,
  words: {
    old: { lastResult: 'D', reviewCount: 4, nextReviewAt: '2026-09-01', challengeFlagAt: '' },
    bus: { lastResult: '', reviewCount: 0, challengeFlagAt: '' },
    car: { lastResult: 'H', reviewCount: 2, challengeFlagAt: '2026-08-20T09:00:00+08:00' }
  },
  session: null
};
const prepared = queue.decorateAdventureStateForLessonQueue({
  state: actual,
  taughtState,
  today: '2026-08-22',
  visibleWordKeys: ['old', 'bus', 'car', 'untaught']
});
assert.equal(prepared.state.words.bus.lastResult, 'F');
assert.equal(prepared.state.words.bus.reviewCount, 1);
assert.equal(prepared.state.words.bus.nextReviewAt, '2026-08-22');
assert.equal(prepared.state.words.car.lastResult, 'F', 'a pre-lesson challenge flag does not consume the new lesson');
assert.equal(prepared.state.words.untaught, undefined);
assert.equal(actual.words.bus.reviewCount, 0, 'challenge priority decoration must stay non-mutating');

const abandoned = queue.mergeChallengeStateIntoOriginal(actual, {
  ...prepared.state,
  challengeSession: {
    status: 'active',
    items: [{ wordKey: 'bus', status: 'answered', answeredAt: '2026-08-22T11:00:00Z' }]
  },
  words: { ...prepared.state.words, bus: { ...prepared.state.words.bus, challengeFlagAt: '2026-08-22T11:00:00Z' } }
});
assert.equal(abandoned.words.bus.challengeFlagAt, '', 'an unfinished challenge must not consume lesson priority');
assert.equal(abandoned.words.bus.lessonChallengeAt, undefined);
assert.equal(abandoned.words.bus.lastResult, '', 'synthetic priority state must never overwrite adventure mastery');

const completed = queue.mergeChallengeStateIntoOriginal(actual, {
  ...prepared.state,
  challengeDaily: { date: '2026-08-22', attempts: 1, bestScore: 90 },
  challengeSession: {
    status: 'completed',
    items: [{ wordKey: 'bus', status: 'answered', answeredAt: '2026-08-22T11:00:00Z' }]
  },
  words: { ...prepared.state.words, bus: { ...prepared.state.words.bus, challengeFlagAt: '2026-08-22T11:00:00Z' } }
});
assert.equal(completed.words.bus.challengeFlagAt, '2026-08-22T11:00:00Z');
assert.equal(completed.words.bus.lessonChallengeAt, '2026-08-22T11:00:00Z');
assert.equal(completed.words.bus.lastResult, '');
assert.equal(completed.words.old.lastResult, 'D');
assert.equal(completed.challengeDaily.attempts, 1);

console.log('vocabulary adventure lesson queue tests passed');
