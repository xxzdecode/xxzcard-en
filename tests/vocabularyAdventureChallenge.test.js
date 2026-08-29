const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const challenge = require('../js/vocabularyAdventureChallenge.js');

const today = '2026-07-29';
const recentDirectAt = '2026-07-27T02:00:00.000Z';

function candidate(index) {
  const word = `word${index}`;
  return {
    key: word,
    word,
    card: {
      word,
      meaning: `意思${index}`,
      phonetic: `/wɜːd${index}/`,
      emoji: '🌟',
      collocations: [{ phrase: `${word} practice`, example: `We use ${word} in this example today` }]
    }
  };
}

function correctAnswerFor(item) {
  return item.question.interaction === 'choice' ? item.question.correctIndex : item.question.answer;
}

function wrongAnswerFor(item) {
  if (item.question.interaction === 'choice') {
    return (item.question.correctIndex + 1) % item.question.options.length;
  }
  return item.question.interaction === 'input' ? '__wrong__' : [];
}

const candidates = Array.from({ length: 14 }, (_, index) => candidate(index));
const words = Object.fromEntries(candidates.map((item, index) => [item.key, {
  lastResult: 'D',
  intervalIndex: index % 5,
  lastReviewedAt: recentDirectAt,
  nextReviewAt: '2026-08-10',
  reviewCount: 1,
  lastTaskType: '',
  challengeFlagAt: '',
  rapidConfirmAt: index === 13 ? '2026-07-28T02:00:00.000Z' : ''
}]));
const state = { version: 1, words, session: null };

assert.equal(challenge.collectChallengeCandidates(candidates, state, today).length, 14);
assert.equal(challenge.collectRapidFlipCandidates(candidates, state, today).length, 13);
assert.equal(challenge.RAPID_FLIP_LIMIT, 4);
assert.equal(challenge.STANDARD_CHALLENGE_LIMIT, 6);

const staleDirectState = {
  ...state,
  words: { ...state.words, word0: { ...state.words.word0, lastReviewedAt: '2026-07-21T02:00:00.000Z' } }
};
assert.equal(
  challenge.collectRapidFlipCandidates(candidates, staleDirectState, today).some(item => item.key === 'word0'),
  false,
  'only direct answers from the last seven calendar days may become rapid flips'
);

const first = challenge.buildChallengeSession({
  candidates, state, today, userKey: 'sister', attemptIndex: 1, startedAt: '2026-07-29T01:00:00.000Z'
});
assert.equal(first.ok, true);
assert.equal(first.session.items.length, 10);
assert.equal(new Set(first.session.items.map(item => item.wordKey)).size, 10);
assert.equal(first.session.items.slice(0, 4).every(item => item.kind === 'rapidFlip'), true);
assert.equal(first.session.items.slice(0, 4).every(item => item.question.rapidFlip === true), true);
assert.equal(first.session.items.slice(4).every(item => item.kind === 'standard'), true);
assert.equal(first.session.items.every(item => item.correctionQuestion && item.correctionQuestion.ok), true);
assert.deepEqual(challenge.buildChallengeSession({
  candidates, state, today, userKey: 'sister', attemptIndex: 1, startedAt: '2026-07-29T01:00:00.000Z'
}), first, 'an unfinished session can be reconstructed deterministically');

const insufficientRapid = challenge.buildChallengeSession({
  candidates,
  state: { ...state, words: Object.fromEntries(Object.entries(words).map(([key, value]) => [
    key, { ...value, rapidConfirmAt: '2026-07-28T02:00:00.000Z' }
  ])) },
  today,
  userKey: 'sister'
});
assert.equal(insufficientRapid.ok, false);
assert.equal(insufficientRapid.code, 'INSUFFICIENT_RAPID_FLIP_WORDS');

let active = challenge.normalizeChallengeState({ ...state, challengeSession: first.session }, today);
const firstItem = active.challengeSession.items[0];
const originalWord = structuredClone(active.words[firstItem.wordKey]);
const rapidCorrect = challenge.prepareChallengeAnswer(active, {
  today, userKey: 'sister', expectedCursor: 0, wordKey: firstItem.wordKey,
  answer: correctAnswerFor(firstItem), answeredAt: '2026-07-29T02:00:00.000Z'
});
assert.equal(rapidCorrect.correct, true);
assert.equal(rapidCorrect.state.challengeSession.cursor, 1);
assert.equal(rapidCorrect.state.words[firstItem.wordKey].rapidConfirmAt, '2026-07-29T02:00:00.000Z');
assert.equal(rapidCorrect.state.words[firstItem.wordKey].lastResult, originalWord.lastResult);
assert.equal(rapidCorrect.state.words[firstItem.wordKey].intervalIndex, originalWord.intervalIndex);
assert.equal(rapidCorrect.state.words[firstItem.wordKey].reviewCount, originalWord.reviewCount);

const wrongItem = rapidCorrect.state.challengeSession.items[1];
const wrong = challenge.prepareChallengeAnswer(rapidCorrect.state, {
  today, userKey: 'sister', expectedCursor: 1, wordKey: wrongItem.wordKey,
  answer: wrongAnswerFor(wrongItem), answeredAt: '2026-07-29T02:01:00.000Z'
});
assert.equal(wrong.correct, false);
assert.equal(wrong.needsImmediateCorrection, true);
assert.equal(wrong.state.challengeSession.cursor, 2, 'the formal item is recorded before its one immediate retry');
assert.equal(wrong.state.challengeSession.correction.wordKey, wrongItem.wordKey);
assert.equal(wrong.state.challengeSession.correction.status, 'pending');
assert.equal(wrong.state.challengeDaily.attempts, 0, 'retries do not become a separate challenge attempt');
assert.equal(wrong.state.words[wrongItem.wordKey].challengeFlagAt, '2026-07-29T02:01:00.000Z');
assert.equal(wrong.state.challengeSession.wrongItems.length, 1);

const correction = challenge.prepareChallengeCorrectionAnswer(wrong.state, {
  today, expectedCursor: 2, wordKey: wrongItem.wordKey,
  answer: correctAnswerFor(wrong.state.challengeSession.correction), answeredAt: '2026-07-29T02:02:00.000Z'
});
assert.equal(correction.kind, 'correction');
assert.equal(correction.correct, true);
assert.equal(correction.completed, false);
assert.equal(correction.state.challengeSession.correction, null);
assert.equal(correction.state.challengeSession.wrongItems.length, 1, 'a successful retry never deletes the original error');
assert.equal(correction.state.challengeSession.correctCount, 1, 'a retry never changes formal scoring');
assert.equal(challenge.normalizeChallengeState(wrong.state, today).challengeSession.correction.wordKey, wrongItem.wordKey);

let finalRound = challenge.normalizeChallengeState({ ...state, challengeSession: first.session }, today);
while (finalRound.challengeSession.cursor < 9) {
  const item = finalRound.challengeSession.items[finalRound.challengeSession.cursor];
  finalRound = challenge.prepareChallengeAnswer(finalRound, {
    today, userKey: 'sister', expectedCursor: finalRound.challengeSession.cursor,
    wordKey: item.wordKey, answer: correctAnswerFor(item),
    answeredAt: `2026-07-29T03:${String(finalRound.challengeSession.cursor).padStart(2, '0')}:00.000Z`
  }).state;
}
const finalItem = finalRound.challengeSession.items[9];
const finalWrong = challenge.prepareChallengeAnswer(finalRound, {
  today, userKey: 'sister', expectedCursor: 9, wordKey: finalItem.wordKey,
  answer: wrongAnswerFor(finalItem), answeredAt: '2026-07-29T03:10:00.000Z'
});
assert.equal(finalWrong.formalCompleted, true);
assert.equal(finalWrong.completed, false);
assert.equal(finalWrong.state.challengeSession.status, 'correction');
assert.equal(finalWrong.state.challengeDaily.attempts, 1);
assert.equal(finalWrong.state.challengeDaily.bestScore, 90);
const finalCorrection = challenge.prepareChallengeCorrectionAnswer(finalWrong.state, {
  today, expectedCursor: 10, wordKey: finalItem.wordKey,
  answer: wrongAnswerFor(finalWrong.state.challengeSession.correction), answeredAt: '2026-07-29T03:11:00.000Z'
});
assert.equal(finalCorrection.completed, true);
assert.equal(finalCorrection.state.challengeSession.status, 'completed');
assert.equal(finalCorrection.state.challengeDaily.attempts, 1, 'a retry can never add an attempt');

const exitState = challenge.prepareChallengeExit(wrong.state, { today, exitedAt: '2026-07-29T04:00:00.000Z' });
assert.equal(exitState.challengeSession.status, 'abandoned');
assert.equal(exitState.challengeDaily.attempts, 1, 'exit from a pending retry retains the consumed-attempt rule');

const legacySession = structuredClone(first.session);
legacySession.items.forEach(item => {
  delete item.kind;
  delete item.correctionQuestion;
  delete item.correctionMode;
  delete item.correctionExplanation;
});
const legacyNormalized = challenge.normalizeChallengeSession(legacySession);
assert.equal(legacyNormalized.items.length, 10, 'old sessions without rapid/retry fields remain resumable');
assert.equal(legacyNormalized.items[0].kind, 'standard');

const homeStatus = challenge.challengeHomeStatus({ state, candidates, today });
assert.equal(homeStatus.state, 'ready');
assert.match(homeStatus.text, /4题翻翻乐/);

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventureChallenge.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventureCore.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
assert.doesNotMatch(source, /Math\.random/);
assert.match(source, /RAPID_FLIP_LIMIT = 4/);
assert.match(source, /prepareChallengeCorrectionAnswer/);
assert.match(source, /rapidConfirmAt/);
assert.match(coreSource, /rapidConfirmAt/);
assert.match(html, /id="screenVocabularyAdventureChallenge"/);
assert.match(serviceWorker, /xxzcard-app-shell-v102/);

console.log('vocabulary adventure challenge tests passed');
