const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../js/vocabularyAdventureCore.js');
const challenge = require('../js/vocabularyAdventureChallenge.js');

const today = '2026-07-29';
const reviewedAt = '2026-07-20T02:00:00.000Z';

function candidate(index) {
  const word = `word${index}`;
  return {
    key: word,
    word,
    batchId: 'common',
    cardIndex: index,
    card: {
      word,
      meaning: `意思${index}`,
      phonetic: `/wɜːd${index}/`,
      emoji: '🌟',
      collocations: [{
        phrase: `${word} practice`,
        example: `We use ${word} in this example today`
      }]
    }
  };
}

function correctAnswerFor(item) {
  if (item.question.interaction === 'choice') return item.question.correctIndex;
  return item.question.answer;
}

const candidates = Array.from({ length: 14 }, (_, index) => candidate(index));
const words = Object.fromEntries(candidates.map((item, index) => [item.key, {
  lastResult: index % 3 === 0 ? 'F' : index % 3 === 1 ? 'H' : 'D',
  intervalIndex: index % 5,
  lastReviewedAt: reviewedAt,
  nextReviewAt: index < 8 ? '2026-07-25' : '2026-08-10',
  reviewCount: 1,
  lastTaskType: '',
  challengeFlagAt: index === 13 ? '2026-07-28T02:00:00.000Z' : ''
}]));
const frozenPlan = [{
  wordKey: 'word0',
  word: 'word0',
  batchId: 'common',
  cardIndex: 0,
  phase: 'review',
  reviewReason: 'failed',
  taskType: '',
  status: 'pending',
  result: ''
}];
const state = {
  version: 1,
  words,
  session: {
    date: today,
    plan: frozenPlan,
    cursor: 0,
    phase: 'review',
    completed: false,
    rewardGranted: false
  }
};

const eligible = challenge.collectChallengeCandidates(candidates, state, today);
assert.equal(eligible.length, 13);
assert.equal(eligible.some(item => item.key === 'word13'), false, 'challenge pending words must stay out of challenge');

const withUnscreened = {
  ...state,
  words: { ...state.words, word0: { ...state.words.word0, reviewCount: 0 } }
};
assert.equal(challenge.collectChallengeCandidates(candidates, withUnscreened, today).length, 12);

const first = challenge.buildChallengeSession({
  candidates,
  state,
  today,
  userKey: 'sister',
  attemptIndex: 1,
  startedAt: '2026-07-29T01:00:00.000Z'
});
assert.equal(first.ok, true);
assert.equal(first.session.items.length, 10);
assert.equal(new Set(first.session.items.map(item => item.wordKey)).size, 10);
assert.equal(first.session.items.some(item => item.wordKey === 'word13'), false);
assert.equal(first.session.items.every(item => item.question && item.question.ok), true);
assert.equal(first.session.items.every(item => item.question.interaction !== 'match'), true);

const refreshed = challenge.buildChallengeSession({
  candidates,
  state,
  today,
  userKey: 'sister',
  attemptIndex: 1,
  startedAt: '2026-07-29T01:00:00.000Z'
});
assert.deepEqual(refreshed, first);

const secondAttempt = challenge.buildChallengeSession({
  candidates,
  state,
  today,
  userKey: 'sister',
  attemptIndex: 2,
  startedAt: '2026-07-29T01:00:00.000Z'
});
assert.notDeepEqual(
  secondAttempt.session.items.map(item => [item.wordKey, item.taskType]),
  first.session.items.map(item => [item.wordKey, item.taskType])
);

const nineEligibleState = {
  ...state,
  words: Object.fromEntries(Object.entries(state.words).map(([key, value], index) => [
    key,
    index < 4 ? { ...value, challengeFlagAt: `2026-07-28T0${index}:00:00.000Z` } : value
  ]))
};
assert.deepEqual(
  challenge.buildChallengeSession({ candidates, state: nineEligibleState, today, userKey: 'sister' }),
  { ok: false, code: 'INSUFFICIENT_CHALLENGE_WORDS', available: 9 }
);

let activeState = challenge.normalizeChallengeState({
  ...state,
  challengeSession: first.session
}, today);
const adventureSnapshot = JSON.stringify(activeState.session);
const firstItem = activeState.challengeSession.items[0];
const previousWord = { ...activeState.words[firstItem.wordKey] };
const wrongAnswer = firstItem.question.interaction === 'choice'
  ? (firstItem.question.correctIndex + 1) % firstItem.question.options.length
  : firstItem.question.interaction === 'input'
    ? '__wrong__'
    : [];

const wrong = challenge.prepareChallengeAnswer(activeState, {
  today,
  expectedCursor: 0,
  wordKey: firstItem.wordKey,
  answer: wrongAnswer,
  answeredAt: '2026-07-29T02:00:00.000Z'
});
assert.equal(wrong.correct, false);
assert.equal(wrong.state.challengeSession.cursor, 1);
assert.equal(wrong.state.challengeSession.wrongCount, 1);
assert.equal(wrong.state.words[firstItem.wordKey].challengeFlagAt, '2026-07-29T02:00:00.000Z');
assert.equal(wrong.state.words[firstItem.wordKey].lastResult, previousWord.lastResult);
assert.equal(wrong.state.words[firstItem.wordKey].intervalIndex, previousWord.intervalIndex);
assert.equal(wrong.state.words[firstItem.wordKey].reviewCount, previousWord.reviewCount);
assert.equal(JSON.stringify(wrong.state.session), adventureSnapshot, 'frozen adventure plan must not change');

const sisterSameWordState = challenge.normalizeChallengeState({
  ...state,
  challengeSession: first.session
}, today);
const brotherSameWordState = challenge.normalizeChallengeState({
  ...state,
  challengeSession: first.session
}, today);
const brotherSnapshot = structuredClone(brotherSameWordState);
const sisterSameWordWrong = challenge.prepareChallengeAnswer(sisterSameWordState, {
  today,
  expectedCursor: 0,
  wordKey: firstItem.wordKey,
  answer: wrongAnswer,
  answeredAt: '2026-07-29T02:30:00.000Z'
}).state;
assert.ok(sisterSameWordWrong.words[firstItem.wordKey].challengeFlagAt);
assert.deepEqual(
  brotherSameWordState,
  brotherSnapshot,
  'sister answering the same wordKey must not mutate brother state'
);
const brotherSameWordCorrect = challenge.prepareChallengeAnswer(brotherSameWordState, {
  today,
  expectedCursor: 0,
  wordKey: firstItem.wordKey,
  answer: correctAnswerFor(firstItem),
  answeredAt: '2026-07-29T02:31:00.000Z'
}).state;
assert.equal(brotherSameWordCorrect.words[firstItem.wordKey].challengeFlagAt, '');
assert.equal(brotherSameWordCorrect.challengeSession.cursor, 1);
assert.equal(sisterSameWordWrong.challengeSession.cursor, 1);
assert.equal(sisterSameWordWrong.challengeSession.wrongItems.length, 1);
assert.equal(brotherSameWordCorrect.challengeSession.wrongItems.length, 0);

assert.throws(() => challenge.prepareChallengeAnswer(wrong.state, {
  today,
  expectedCursor: 0,
  wordKey: firstItem.wordKey,
  answer: wrongAnswer
}), /CHALLENGE_CURSOR_MISMATCH/);

activeState = wrong.state;
while (activeState.challengeSession.status === 'active') {
  const session = activeState.challengeSession;
  const item = session.items[session.cursor];
  activeState = challenge.prepareChallengeAnswer(activeState, {
    today,
    expectedCursor: session.cursor,
    wordKey: item.wordKey,
    answer: correctAnswerFor(item),
    answeredAt: `2026-07-29T02:${String(session.cursor).padStart(2, '0')}:00.000Z`
  }).state;
}
assert.equal(activeState.challengeSession.status, 'completed');
assert.equal(activeState.challengeSession.cursor, 10);
assert.equal(activeState.challengeDaily.attempts, 1);
assert.equal(activeState.challengeDaily.bestScore, 90);
assert.equal(activeState.challengeSession.wrongItems.length, 1);
assert.equal(activeState.words[firstItem.wordKey].challengeFlagAt, '2026-07-29T02:00:00.000Z');

const pendingWord = first.session.items[1].wordKey;
const pendingState = challenge.normalizeChallengeState({
  ...state,
  words: {
    ...state.words,
    [pendingWord]: { ...state.words[pendingWord], challengeFlagAt: '2026-07-28T03:00:00.000Z' }
  },
  challengeSession: first.session
}, today);
const pendingItem = pendingState.challengeSession.items[0];
const correct = challenge.prepareChallengeAnswer(pendingState, {
  today,
  expectedCursor: 0,
  wordKey: pendingItem.wordKey,
  answer: correctAnswerFor(pendingItem),
  answeredAt: '2026-07-29T03:00:00.000Z'
});
assert.equal(correct.correct, true);
assert.equal(
  correct.state.words[pendingWord].challengeFlagAt,
  pendingState.words[pendingWord].challengeFlagAt,
  'a correct challenge answer must not clear an existing pending flag'
);

// Exiting follows the legacy rule: one consumed attempt and the score achieved
// so far is recorded against the fixed ten-question denominator.
const exitStart = challenge.normalizeChallengeState({
  ...state,
  challengeSession: first.session
}, today);
const exitFirstItem = exitStart.challengeSession.items[0];
const oneCorrect = challenge.prepareChallengeAnswer(exitStart, {
  today,
  expectedCursor: 0,
  wordKey: exitFirstItem.wordKey,
  answer: correctAnswerFor(exitFirstItem),
  answeredAt: '2026-07-29T04:00:00.000Z'
}).state;
const exitState = challenge.prepareChallengeExit(oneCorrect, {
  today,
  exitedAt: '2026-07-29T04:01:00.000Z'
});
assert.equal(exitState.challengeSession.status, 'abandoned');
assert.equal(exitState.challengeDaily.attempts, 1);
assert.equal(exitState.challengeDaily.bestScore, 10);
assert.throws(() => challenge.prepareChallengeExit(exitState, { today }), /CHALLENGE_NOT_ACTIVE/);

assert.equal(challenge.challengeHomeStatus({
  state,
  candidates: [...candidates.slice(0, 9), candidates[13]],
  today
}).state, 'insufficient', 'one pending word leaves only nine eligible candidates');

assert.equal(challenge.challengeHomeStatus({
  state: activeState,
  candidates,
  today,
  legacyAttempts: 1
}).state, 'locked');

assert.equal(
  challenge.normalizeChallengeDaily({ date: '2026-07-28', attempts: 2, bestScore: 100 }, today).attempts,
  0
);

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventureChallenge.js'), 'utf8');
const tasksSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'tasks.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
assert.doesNotMatch(source, /Math\.random/);
assert.match(source, /&& !wordState\.challengeFlagAt/);
assert.match(source, /next\.challengeDaily\.bestScore = Math\.max\(next\.challengeDaily\.bestScore, score\)/);

const homeToggle = source.match(/function toggleLegacyHome\(hidden\) \{[\s\S]*?\n    \}/);
assert.ok(homeToggle);
assert.match(homeToggle[0], /homeQuickActions/);
assert.doesNotMatch(
  homeToggle[0],
  /grammarChallengeHomeEntry|vocabularyTourHomeEntry|studentFeatureNav|homeCheckinRow/
);

assert.match(tasksSource, /getSharedVocabularyChallengeUsage/);
assert.match(html, /id="studentDashboard"/);
assert.match(html, /id="vocabularyAdventureChallengeEntry"/);
assert.match(html, /id="screenVocabularyAdventureChallenge"/);
assert.match(source, /const enabled = !!studentUser\(\)/);
assert.doesNotMatch(source, /if \(!previewEnabled\(\) \|\| !studentUser\(\)\) return/);
assert.match(serviceWorker, /\.\/js\/vocabularyAdventureChallenge\.js/);

console.log('vocabulary adventure challenge tests passed');
