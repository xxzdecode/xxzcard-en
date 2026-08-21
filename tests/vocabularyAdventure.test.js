const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../js/vocabularyAdventureCore.js');
const { createVocabularyAdventureAdapter } = require('../js/vocabularyAdventure.js');

const TODAY = '2026-07-28';
const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventure.js'), 'utf8');
assert.match(adapterSource, /visibleBatches\(\)/);
assert.match(adapterSource, /filterBatchesByBookPurpose\(batches,\s*true,\s*false\)/);
assert.match(adapterSource, /getValue:\s*key\s*=>\s*sbGet\(key\)/);
assert.match(adapterSource, /setValue:\s*\(key,\s*value\)\s*=>\s*sbSet\(key,\s*value\)/);
assert.match(adapterSource, /PENDING_STATE_PREFIX = 'wc_vocab_adventure_pending_v1_'/);
assert.match(adapterSource, /root\.addEventListener\('online'/);

function card(word, meaning = `meaning-${word}`) {
  return { word, meaning };
}

function batch(id, words, extra = {}) {
  return {
    id,
    name: `book-${id}`,
    cards: words.map(value => typeof value === 'string' ? card(value) : value),
    ...extra
  };
}

function candidates(count, prefix = 'word', start = 0) {
  return core.collectVocabularyAdventureCandidates([
    batch(prefix, Array.from({ length: count }, (_, index) => `${prefix}-${index + start}`))
  ]);
}

function reviewedState(candidateList, makeState) {
  const words = {};
  candidateList.forEach((candidate, index) => {
    words[candidate.key] = {
      lastResult: 'D',
      intervalIndex: 0,
      lastReviewedAt: '2026-07-20T10:00:00.000Z',
      nextReviewAt: TODAY,
      reviewCount: 1,
      lastTaskType: '',
      challengeFlagAt: '',
      ...(makeState ? makeState(candidate, index) : {})
    };
  });
  return { version: 1, words, session: null };
}

assert.equal(core.normalizeAdventureWord('  Ice   CREAM  '), 'ice cream');
assert.equal(core.normalizeAdventureWord(null), '');
assert.equal(core.adventureWordKey(' APPLE '), 'apple');

const deduped = core.collectVocabularyAdventureCandidates([
  batch('one', [
    card(' Apple ', '苹果'),
    card('apple', '另一义'),
    card('', '空词'),
    card('blank-meaning', '  ')
  ]),
  batch('two', [card('Pear', '梨')])
]);
assert.deepEqual(deduped.map(item => item.key), ['apple', 'pear']);
assert.equal(deduped[0].batchId, 'one');
assert.equal(deduped[0].cardIndex, 0);
assert.equal(deduped[0].card.word, ' Apple ');

const firstCandidates = candidates(35, 'first');
const firstPlan = core.buildVocabularyAdventurePlan({
  candidates: firstCandidates,
  state: core.defaultVocabularyAdventureState(),
  today: TODAY
});
assert.equal(firstPlan.length, 30);
assert.ok(firstPlan.every(item => item.phase === 'screening'));
assert.equal(new Set(firstPlan.map(item => item.wordKey)).size, 30);
const sisterFirstPlan = core.buildVocabularyAdventurePlan({
  candidates: firstCandidates,
  state: core.defaultVocabularyAdventureState(),
  today: TODAY,
  userKey: 'sister'
});
const brotherFirstPlan = core.buildVocabularyAdventurePlan({
  candidates: firstCandidates,
  state: core.defaultVocabularyAdventureState(),
  today: TODAY,
  userKey: 'brother'
});
assert.deepEqual(
  sisterFirstPlan.map(item => item.wordKey).slice().sort(),
  brotherFirstPlan.map(item => item.wordKey).slice().sort(),
  'siblings must receive the same daily word set'
);
assert.notDeepEqual(
  sisterFirstPlan.map(item => item.wordKey),
  brotherFirstPlan.map(item => item.wordKey),
  'siblings must receive a different stable order'
);
assert.deepEqual(
  core.buildVocabularyAdventurePlan({
    candidates: firstCandidates,
    state: core.defaultVocabularyAdventureState(),
    today: TODAY,
    userKey: 'sister'
  }),
  sisterFirstPlan,
  'daily sibling order must be stable across reloads'
);
assert.equal(core.buildVocabularyAdventurePlan({
  candidates: candidates(7, 'short-first'),
  state: core.defaultVocabularyAdventureState(),
  today: TODAY
}).length, 7);

const screeningPool = candidates(30, 'screen');
const reviewPool = candidates(20, 'review');
const normalCandidates = [...screeningPool, ...reviewPool].map((item, index) => ({ ...item, sourceIndex: index }));
const normalState = reviewedState(reviewPool);
const normalPlan = core.buildVocabularyAdventurePlan({ candidates: normalCandidates, state: normalState, today: TODAY });
assert.equal(normalPlan.filter(item => item.phase === 'screening').length, 20);
assert.equal(normalPlan.filter(item => item.phase === 'review').length, 10);
assert.deepEqual(normalPlan.map(item => item.phase), [...Array(20).fill('screening'), ...Array(10).fill('review')]);

const fourReviews = reviewPool.slice(0, 4);
const plan26And4 = core.buildVocabularyAdventurePlan({
  candidates: [...screeningPool, ...fourReviews].map((item, index) => ({ ...item, sourceIndex: index })),
  state: reviewedState(fourReviews),
  today: TODAY
});
assert.equal(plan26And4.filter(item => item.phase === 'screening').length, 26);
assert.equal(plan26And4.filter(item => item.phase === 'review').length, 4);

const sevenScreening = screeningPool.slice(0, 7);
const manyReviews = [...reviewPool, ...candidates(10, 'more-review')];
const plan7And23 = core.buildVocabularyAdventurePlan({
  candidates: [...sevenScreening, ...manyReviews].map((item, index) => ({ ...item, sourceIndex: index })),
  state: reviewedState(manyReviews),
  today: TODAY
});
assert.equal(plan7And23.filter(item => item.phase === 'screening').length, 7);
assert.equal(plan7And23.filter(item => item.phase === 'review').length, 23);

const smallScreen = candidates(3, 'small-screen');
const smallReview = candidates(5, 'small-review');
const smallPlan = core.buildVocabularyAdventurePlan({
  candidates: [...smallScreen, ...smallReview].map((item, index) => ({ ...item, sourceIndex: index })),
  state: reviewedState(smallReview),
  today: TODAY
});
assert.equal(smallPlan.length, 8);
assert.equal(new Set(smallPlan.map(item => item.wordKey)).size, 8);

const priorityCandidates = core.collectVocabularyAdventureCandidates([
  batch('priority', ['stable', 'due', 'severe', 'hinted', 'failed', 'challenge'])
]);
const priorityState = reviewedState(priorityCandidates, candidate => ({
  challenge: { challengeFlagAt: '2026-07-27T10:00:00.000Z', nextReviewAt: '2026-08-20' },
  failed: { lastResult: 'F', nextReviewAt: '2026-08-20' },
  hinted: { lastResult: 'H', nextReviewAt: '2026-08-20' },
  severe: { nextReviewAt: '2026-07-25' },
  due: { nextReviewAt: TODAY },
  stable: { intervalIndex: 4, nextReviewAt: '2026-08-20' }
})[candidate.key]);
const priorityPool = core.classifyVocabularyAdventureCandidates(priorityCandidates, priorityState, TODAY);
assert.deepEqual(priorityPool.review.map(item => item.reason), [
  'challenge', 'failed', 'hinted', 'severeOverdue', 'due', 'stable'
]);
assert.deepEqual(priorityPool.review.map(item => item.candidate.key), [
  'challenge', 'failed', 'hinted', 'severe', 'due', 'stable'
]);
assert.deepEqual(
  core.buildVocabularyAdventurePlan({
    candidates: priorityCandidates,
    state: priorityState,
    today: TODAY
  }).map(item => item.reviewReason),
  ['challenge', 'failed', 'hinted', 'severeOverdue', 'due', 'stable']
);

const stableCandidates = core.collectVocabularyAdventureCandidates([batch('stable-order', ['due-one', 'stable-one'])]);
const stableState = reviewedState(stableCandidates, candidate => candidate.key === 'stable-one'
  ? { intervalIndex: 5, nextReviewAt: '2026-09-01' }
  : { nextReviewAt: TODAY });
assert.deepEqual(
  core.classifyVocabularyAdventureCandidates(stableCandidates, stableState, TODAY).review.map(item => item.candidate.key),
  ['due-one', 'stable-one']
);

const dueCandidates = candidates(12, 'due-only');
const stableFillCandidates = candidates(3, 'stable-fill');
const enoughDuePlan = core.buildVocabularyAdventurePlan({
  candidates: [...screeningPool, ...dueCandidates, ...stableFillCandidates]
    .map((item, index) => ({ ...item, sourceIndex: index })),
  state: reviewedState([...dueCandidates, ...stableFillCandidates], candidate => (
    candidate.key.startsWith('stable-fill')
      ? { intervalIndex: 5, nextReviewAt: '2026-09-01' }
      : { nextReviewAt: TODAY }
  )),
  today: TODAY
});
assert.equal(enoughDuePlan.filter(item => item.wordKey.startsWith('stable-fill')).length, 0);

const urgentFour = candidates(4, 'urgent-four');
const stableTwenty = candidates(20, 'stable-twenty');
const urgentBeforeStablePlan = core.buildVocabularyAdventurePlan({
  candidates: [...screeningPool, ...urgentFour, ...stableTwenty]
    .map((item, index) => ({ ...item, sourceIndex: index })),
  state: reviewedState([...urgentFour, ...stableTwenty], candidate => (
    candidate.key.startsWith('stable-twenty')
      ? { intervalIndex: 5, nextReviewAt: '2026-09-01' }
      : { nextReviewAt: TODAY }
  )),
  today: TODAY
});
assert.equal(urgentBeforeStablePlan.filter(item => item.phase === 'screening').length, 26);
assert.equal(urgentBeforeStablePlan.filter(item => item.wordKey.startsWith('urgent-four')).length, 4);
assert.equal(urgentBeforeStablePlan.filter(item => item.wordKey.startsWith('stable-twenty')).length, 0);

const threeScreen = candidates(3, 'three-screen');
const fiveUrgent = candidates(5, 'five-urgent');
const thirtyStable = candidates(30, 'thirty-stable');
const stableLastPlan = core.buildVocabularyAdventurePlan({
  candidates: [...threeScreen, ...fiveUrgent, ...thirtyStable]
    .map((item, index) => ({ ...item, sourceIndex: index })),
  state: reviewedState([...fiveUrgent, ...thirtyStable], candidate => (
    candidate.key.startsWith('thirty-stable')
      ? { intervalIndex: 5, nextReviewAt: '2026-09-01' }
      : { nextReviewAt: TODAY }
  )),
  today: TODAY
});
assert.equal(stableLastPlan.length, 30);
assert.equal(stableLastPlan.filter(item => item.phase === 'screening').length, 3);
assert.equal(stableLastPlan.filter(item => item.wordKey.startsWith('five-urgent')).length, 5);
assert.equal(stableLastPlan.filter(item => item.wordKey.startsWith('thirty-stable')).length, 22);

const sameDayState = {
  ...normalState,
  session: {
    date: TODAY,
    plan: normalPlan.slice(0, 2),
    cursor: 1,
    phase: 'screening',
    completed: false,
    rewardGranted: false
  }
};
const sameDay = core.resolveVocabularyAdventureSession({
  candidates: candidates(50, 'changed'),
  state: sameDayState,
  today: TODAY
});
assert.equal(sameDay.action, 'resume_today');
assert.deepEqual(sameDay.session.plan, core.normalizeVocabularyAdventureState(sameDayState).session.plan);

const completedToday = core.resolveVocabularyAdventureSession({
  candidates: normalCandidates,
  state: { ...sameDayState, session: { ...sameDayState.session, cursor: 2, completed: true } },
  today: TODAY
});
assert.equal(completedToday.action, 'completed');

const previousIncomplete = core.resolveVocabularyAdventureSession({
  candidates: normalCandidates,
  state: { ...sameDayState, session: { ...sameDayState.session, date: '2026-07-27' } },
  today: TODAY
});
assert.equal(previousIncomplete.action, 'resume_previous');

const newDay = core.resolveVocabularyAdventureSession({
  candidates: normalCandidates,
  state: { ...sameDayState, session: { ...sameDayState.session, date: '2026-07-27', cursor: 2, completed: true } },
  today: TODAY
});
assert.equal(newDay.action, 'created');
assert.equal(newDay.session.date, TODAY);

assert.equal(core.updateVocabularyAdventureSessionCursor(sameDayState.session, -5).cursor, 0);
const ended = core.updateVocabularyAdventureSessionCursor(sameDayState.session, 99);
assert.equal(ended.cursor, ended.plan.length);
assert.equal(ended.completed, true);
assert.equal(ended.phase, 'completed');

const reviewedAt = new Date(2026, 6, 28, 10, 0, 0);
const firstD = core.applyAdventureResult(null, 'D', reviewedAt);
const firstH = core.applyAdventureResult(null, 'H', reviewedAt);
const firstF = core.applyAdventureResult(null, 'F', reviewedAt);
assert.equal(firstD.intervalIndex, 1);
assert.equal(firstD.nextReviewAt, '2026-07-31');
assert.equal(firstH.nextReviewAt, '2026-07-29');
assert.equal(firstF.nextReviewAt, '2026-07-29');

let advancing = { ...firstF, challengeFlagAt: '2026-07-28T01:00:00.000Z' };
[3, 7, 14, 30, 60, 60].forEach(expectedDays => {
  advancing = core.applyAdventureResult(advancing, 'D', reviewedAt);
  assert.equal(core.INTERVAL_DAYS[advancing.intervalIndex], expectedDays);
});
assert.equal(advancing.challengeFlagAt, '');
assert.equal(core.applyAdventureResult({ ...advancing, intervalIndex: 3 }, 'H', reviewedAt).intervalIndex, 3);
assert.equal(core.applyAdventureResult({ ...advancing, intervalIndex: 5 }, 'F', reviewedAt).intervalIndex, 0);
assert.equal(core.applyAdventureResult({ ...advancing, intervalIndex: 99 }, 'H', reviewedAt).intervalIndex, 0);

const badState = core.normalizeVocabularyAdventureState({
  words: {
    ' APPLE ': {
      lastResult: 'X',
      intervalIndex: 99,
      lastReviewedAt: 'bad',
      nextReviewAt: '2026-02-30',
      reviewCount: -2,
      challengeFlagAt: 'bad'
    }
  },
  session: { date: 'bad', plan: 'bad' }
});
assert.deepEqual(badState, {
  version: 1,
  words: {
    apple: {
      lastResult: '',
      intervalIndex: 0,
      lastReviewedAt: '',
      nextReviewAt: '',
      reviewCount: 0,
      lastTaskType: '',
      challengeFlagAt: '',
      lessonChallengeAt: ''
    }
  },
  session: null
});

(async () => {
const storage = new Map();
let remoteReads = 0;
const commonVisible = batch('common-visible', ['Apple'], { bookPurpose: 'common', sharedWith: ['sister'] });
const supportVisible = batch('support-visible', ['Helper'], { bookPurpose: 'support', sharedWith: ['sister'] });
const hidden = batch('hidden', ['Secret'], { bookPurpose: 'common', sharedWith: ['brother'] });
let currentUser = 'sister';
const adapter = createVocabularyAdventureAdapter({
  getCurrentUser: () => currentUser,
  isTeacherUser: () => currentUser === 'teacher',
  visibleBatchesForCurrentUser: () => [commonVisible, supportVisible, hidden].filter(
    item => (item.sharedWith || []).includes(currentUser)
  ),
  commonBatchesOnly: batches => batches.filter(item => item.bookPurpose === 'common'),
  getValue: async key => storage.get(key) || null,
  getRemoteValue: async key => {
    remoteReads += 1;
    return storage.get(key) || null;
  },
  setValue: async (key, value) => storage.set(key, structuredClone(value)),
  warn: () => {}
});
assert.equal(adapter.adventureStateKeyForUser('sister'), 'vocab_adventure_v1_sister');
assert.equal(adapter.adventureStateKeyForUser('brother'), 'vocab_adventure_v1_brother');
assert.equal(adapter.adventureStateKeyForUser('teacher'), '');
assert.deepEqual(adapter.collectVisibleVocabularyAdventureCandidates().map(item => item.key), ['apple']);
assert.equal(await adapter.saveVocabularyAdventureState('sister', { words: { apple: firstD } }), true);
assert.equal(await adapter.saveVocabularyAdventureState('brother', { words: { pear: firstH } }), true);
assert.deepEqual(Object.keys((await adapter.loadVocabularyAdventureState('sister')).words), ['apple']);
assert.deepEqual(Object.keys((await adapter.loadVocabularyAdventureState('brother')).words), ['pear']);
assert.deepEqual(
  Object.keys((await adapter.loadVocabularyAdventureState('sister', { requireRemote: true })).words),
  ['apple']
);
assert.equal(remoteReads, 1);
assert.deepEqual(await adapter.loadVocabularyAdventureState('teacher'), core.defaultVocabularyAdventureState());
storage.clear();
currentUser = 'sister';
const createdAndSaved = await adapter.loadOrCreateVocabularyAdventureSession(TODAY);
assert.equal(createdAndSaved.action, 'created');
assert.equal(createdAndSaved.saved, true);
const savedPlan = structuredClone(createdAndSaved.session.plan);
commonVisible.cards.push(card('Changed Later'));
const resumedFromStorage = await adapter.loadOrCreateVocabularyAdventureSession(TODAY);
assert.equal(resumedFromStorage.action, 'resume_today');
assert.equal(resumedFromStorage.saved, null);
assert.deepEqual(resumedFromStorage.session.plan, savedPlan);
currentUser = 'teacher';
assert.deepEqual(adapter.collectVisibleVocabularyAdventureCandidates(), []);
assert.equal(await adapter.saveVocabularyAdventureState('teacher', { words: { bad: firstF } }), false);

const failedAdapter = createVocabularyAdventureAdapter({
  getCurrentUser: () => 'sister',
  isTeacherUser: () => false,
  visibleBatchesForCurrentUser: () => [],
  commonBatchesOnly: value => value,
  getValue: async () => null,
  setValue: async () => { throw new Error('offline'); },
  warn: () => {}
});
assert.deepEqual(await failedAdapter.loadVocabularyAdventureState('sister'), core.defaultVocabularyAdventureState());
assert.equal(await failedAdapter.saveVocabularyAdventureState('sister', { words: {} }), false);

function challengeState(cursor, updatedAt) {
  return {
    version: 1,
    words: {},
    session: null,
    challengeSession: {
      date: TODAY,
      attemptIndex: 1,
      startedAt: `${TODAY}T08:00:00.000Z`,
      updatedAt,
      cursor,
      status: cursor >= 10 ? 'completed' : 'active'
    }
  };
}

const pendingStorage = new Map();
const backgroundWrites = [];
let backgroundAvailable = false;
const remoteState = challengeState(1, `${TODAY}T08:01:00.000Z`);
const queuedAdapter = createVocabularyAdventureAdapter({
  getCurrentUser: () => 'sister',
  isTeacherUser: () => false,
  visibleBatchesForCurrentUser: () => [],
  commonBatchesOnly: value => value,
  getValue: async () => structuredClone(remoteState),
  setValue: async () => { throw new Error('foreground cloud unavailable'); },
  setBackgroundValue: async (_key, value) => {
    backgroundWrites.push(structuredClone(value));
    return backgroundAvailable;
  },
  readPending: key => pendingStorage.get(key) || null,
  writePending: (key, value) => { pendingStorage.set(key, value); return true; },
  removePending: key => pendingStorage.delete(key),
  schedule: () => {},
  warn: () => {}
});
const queuedCursorTwo = challengeState(2, `${TODAY}T08:02:00.000Z`);
assert.equal(
  await queuedAdapter.saveCurrentVocabularyAdventureState(queuedCursorTwo, { queue: true }),
  true,
  'queue saves must succeed immediately after the local pending record is durable'
);
assert.equal(pendingStorage.size, 1);
assert.equal(
  (await queuedAdapter.loadVocabularyAdventureState('sister')).challengeSession.cursor,
  2,
  'a newer local cursor must win over the older cloud cursor'
);
assert.equal(await queuedAdapter.flushPendingVocabularyAdventureState('sister'), false);
assert.equal(pendingStorage.size, 1, 'a failed background write must retain pending progress');

const queuedCursorThree = challengeState(3, `${TODAY}T08:03:00.000Z`);
assert.equal(await queuedAdapter.queueVocabularyAdventureState('sister', queuedCursorThree), true);
backgroundAvailable = true;
assert.equal(await queuedAdapter.flushPendingVocabularyAdventureState('sister'), true);
assert.equal(pendingStorage.size, 0, 'successful recovery must clear the pending record');
assert.equal(backgroundWrites.at(-1).challengeSession.cursor, 3);
assert.equal(
  backgroundWrites.filter(value => value.challengeSession.cursor === 2).length,
  1,
  'recovery must not replay stale queued states after a newer cursor replaces them'
);

let prefetchedReads = 0;
const prefetchedAdapter = createVocabularyAdventureAdapter({
  getCurrentUser: () => 'sister',
  isTeacherUser: () => false,
  visibleBatchesForCurrentUser: () => [],
  commonBatchesOnly: value => value,
  getValue: async () => { prefetchedReads += 1; return null; },
  setValue: async () => true,
  warn: () => {}
});
globalThis.__vocabularyAdventurePrefetchedState = {
  user: 'sister',
  state: { words: { apple: firstD } },
  loadedAt: Date.now()
};
assert.deepEqual(
  Object.keys((await prefetchedAdapter.loadVocabularyAdventureState('sister')).words),
  ['apple']
);
assert.equal(prefetchedReads, 0);
assert.equal(globalThis.__vocabularyAdventurePrefetchedState, undefined);

console.log(JSON.stringify({
  sample: '26 screening + 4 review',
  total: plan26And4.length,
  screening: plan26And4.filter(item => item.phase === 'screening').length,
  review: plan26And4.filter(item => item.phase === 'review').length
}));
console.log('vocabulary adventure tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
