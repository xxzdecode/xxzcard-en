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

assert.equal(challenge.collectChallengeCandidates(candidates, state, today).length, 14);
const withUnscreened = {
  ...state,
  words: { ...state.words, word0: { ...state.words.word0, reviewCount: 0 } }
};
assert.equal(challenge.collectChallengeCandidates(candidates, withUnscreened, today).length, 13);

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
assert.deepEqual(
  challenge.buildChallengeSession({ candidates: candidates.slice(0, 9), state, today, userKey: 'sister' }),
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
  let answer;
  if (item.question.interaction === 'choice') answer = item.question.correctIndex;
  else if (item.question.interaction === 'input') answer = item.question.answer;
  else answer = item.question.answer;
  activeState = challenge.prepareChallengeAnswer(activeState, {
    today,
    expectedCursor: session.cursor,
    wordKey: item.wordKey,
    answer,
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
const correctAnswer = pendingItem.question.interaction === 'choice'
  ? pendingItem.question.correctIndex
  : pendingItem.question.answer;
const correct = challenge.prepareChallengeAnswer(pendingState, {
  today,
  expectedCursor: 0,
  wordKey: pendingItem.wordKey,
  answer: correctAnswer,
  answeredAt: '2026-07-29T03:00:00.000Z'
});
assert.equal(correct.correct, true);
assert.equal(
  correct.state.words[pendingWord].challengeFlagAt,
  pendingState.words[pendingWord].challengeFlagAt,
  'a correct challenge answer must not clear an existing pending flag'
);

const exitState = challenge.prepareChallengeExit({
  ...state,
  challengeSession: first.session
}, { today, exitedAt: '2026-07-29T04:00:00.000Z' });
assert.equal(exitState.challengeSession.status, 'abandoned');
assert.equal(exitState.challengeDaily.attempts, 1);
assert.throws(() => challenge.prepareChallengeExit(exitState, { today }), /CHALLENGE_NOT_ACTIVE/);

assert.equal(challenge.challengeHomeStatus({
  state,
  candidates: candidates.slice(0, 9),
  today
}).state, 'insufficient');
assert.equal(challenge.challengeHomeStatus({
  state: activeState,
  candidates,
  today,
  legacyAttempts: 1
}).state, 'locked');
assert.equal(challenge.normalizeChallengeDaily({ date: '2026-07-28', attempts: 2, bestScore: 100 }, today).attempts, 0);

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventureChallenge.js'), 'utf8');
const tasksSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'tasks.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
assert.doesNotMatch(source, /Math\.random/);
assert.match(tasksSource, /getSharedVocabularyChallengeUsage/);
assert.match(html, /id="vocabularyAdventureUnifiedHome"[^>]*hidden/);
assert.match(html, /id="vocabularyAdventureChallengeEntry"/);
assert.match(html, /id="screenVocabularyAdventureChallenge"/);
assert.doesNotMatch(serviceWorker, /vocabularyAdventureChallenge/);

console.log('vocabulary adventure challenge tests passed');
