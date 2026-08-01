const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../js/vocabularyAdventureCore.js');
const review = require('../js/vocabularyAdventureReview.js');
const player = require('../js/vocabularyAdventurePlayer.js');
const challenge = require('../js/vocabularyAdventureChallenge.js');

const TODAY = '2026-08-01';

function candidate(index, phonetic = `/wɜːd${index}/`) {
  const word = `word${index}`;
  return {
    key: word,
    word,
    batchId: 'common',
    cardIndex: index,
    card: {
      word,
      meaning: `意思${index}`,
      phonetic,
      emoji: '🌟',
      collocations: [{
        phrase: `${word} practice`,
        example: `We use ${word} in this example today.`
      }]
    }
  };
}

function wordState(index) {
  return {
    lastResult: index % 3 === 0 ? 'F' : index % 3 === 1 ? 'H' : 'D',
    intervalIndex: index % 5,
    lastReviewedAt: '2026-07-20T02:00:00.000Z',
    nextReviewAt: '2026-07-25',
    reviewCount: 1,
    lastTaskType: '',
    challengeFlagAt: ''
  };
}

function reviewContext(candidates, wordKey) {
  return {
    session: { date: TODAY, cursor: 0 },
    planItem: {
      wordKey,
      word: wordKey,
      phase: 'review',
      reviewReason: 'due',
      taskType: 'audioSpelling',
      status: 'pending',
      result: ''
    },
    planIndex: 0,
    wordState: wordState(0),
    card: candidates.find(item => item.key === wordKey).card,
    allCards: candidates,
    userKey: 'sister',
    taskType: 'audioSpelling'
  };
}

const candidates = Array.from({ length: 14 }, (_, index) => candidate(index));
const formal = 'UK /ˈwɜːd/ · US /ˈwɝːd/';
candidates[0] = candidate(0, `  ${formal}  `);

assert.equal(
  review.readVocabularyAudioSpellingPhonetic(candidates[0].card),
  formal,
  'the shared helper must read only card.phonetic and preserve formal notation'
);
for (const card of [
  {},
  { phonetic: '' },
  { phonetic: '   ' },
  { phonetic: null },
  { phonetic: undefined }
]) {
  assert.equal(review.readVocabularyAudioSpellingPhonetic(card), '');
}
assert.equal(review.readVocabularyAudioSpellingPhonetic(null), '');

const adventureQuestion = review.buildVocabularyAdventureReviewQuestion(
  reviewContext(candidates, 'word0')
);
assert.equal(adventureQuestion.ok, true);
assert.equal(adventureQuestion.questionType, 'audioSpelling');
assert.equal(adventureQuestion.prompt, formal);
assert.equal(adventureQuestion.answer, 'word0');
assert.equal(review.gradeVocabularyAdventureReviewQuestion(adventureQuestion, 'WORD0'), true);
assert.equal(review.gradeVocabularyAdventureReviewQuestion(adventureQuestion, 'wrong'), false);

const adventureHtml = player.renderAudioSpellingPhoneticHtml(adventureQuestion);
assert.match(adventureHtml, /vocabulary-adventure-audio-spelling-phonetic/);
assert.match(adventureHtml, new RegExp(formal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.equal(
  player.renderAudioSpellingPhoneticHtml({ ...adventureQuestion, prompt: '' }),
  '',
  'empty phonetics must not create an empty text node'
);
assert.equal(
  player.renderAudioSpellingPhoneticHtml({ questionType: 'missingLetters', prompt: formal }),
  '',
  'non-audioSpelling questions must not render phonetics'
);
assert.equal(
  player.renderAudioSpellingPhoneticHtml({ questionType: 'audioSpelling', prompt: '<unsafe>' }),
  '<div class="vocabulary-adventure-audio-spelling-phonetic">&lt;unsafe&gt;</div>'
);

const noPhoneticCandidates = candidates.map((item, index) => index === 0
  ? { ...item, card: { ...item.card, phonetic: '   ' } }
  : item);
const noPhoneticQuestion = review.buildVocabularyAdventureReviewQuestion(
  reviewContext(noPhoneticCandidates, 'word0')
);
assert.equal(noPhoneticQuestion.ok, true);
assert.equal(noPhoneticQuestion.prompt, '');
assert.equal(player.renderAudioSpellingPhoneticHtml(noPhoneticQuestion), '');

const nextQuestion = review.buildVocabularyAdventureReviewQuestion(
  reviewContext(candidates, 'word1')
);
assert.equal(nextQuestion.prompt, '/wɜːd1/');
assert.notEqual(nextQuestion.prompt, adventureQuestion.prompt);
assert.match(player.renderAudioSpellingPhoneticHtml(nextQuestion), /\/wɜːd1\//);
assert.equal(player.renderAudioSpellingPhoneticHtml(noPhoneticQuestion), '');
assert.match(player.renderAudioSpellingPhoneticHtml(adventureQuestion), new RegExp(formal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const missingLetters = review.buildVocabularyAdventureReviewQuestion({
  ...reviewContext(candidates, 'word0'),
  taskType: 'missingLetters',
  planItem: {
    ...reviewContext(candidates, 'word0').planItem,
    taskType: 'missingLetters'
  }
});
assert.equal(missingLetters.questionType, 'missingLetters');
assert.notEqual(missingLetters.prompt, formal);
assert.equal(player.renderAudioSpellingPhoneticHtml(missingLetters), '');

const words = Object.fromEntries(candidates.map((item, index) => [item.key, wordState(index)]));
const state = {
  version: 1,
  words,
  session: {
    date: TODAY,
    plan: [{
      wordKey: 'word0',
      word: 'word0',
      batchId: 'common',
      batchName: '正式常用词',
      cardIndex: 0,
      phase: 'review',
      reviewReason: 'due',
      taskType: '',
      status: 'pending',
      result: ''
    }],
    cursor: 0,
    phase: 'review',
    completed: false,
    rewardGranted: false
  }
};

const built = challenge.buildChallengeSession({
  candidates,
  state,
  today: TODAY,
  userKey: 'sister',
  attemptIndex: 1,
  startedAt: '2026-08-01T01:00:00.000Z'
});
assert.equal(built.ok, true);
const audioItem = built.session.items.find(item => item.taskType === 'audioSpelling');
assert.ok(audioItem, 'the fixed ten-type challenge must contain audioSpelling');
const audioCard = candidates.find(item => item.key === audioItem.wordKey).card;
assert.equal(
  audioItem.question.prompt,
  review.readVocabularyAudioSpellingPhonetic(audioCard),
  'challenge and adventure must use the same formal field and helper rule'
);

const whitespaceCandidates = candidates.map(item => item.key === audioItem.wordKey
  ? { ...item, card: { ...item.card, phonetic: '   ' } }
  : item);
const rebuiltWithoutPhonetic = challenge.buildChallengeSession({
  candidates: whitespaceCandidates,
  state,
  today: TODAY,
  userKey: 'sister',
  attemptIndex: 1,
  startedAt: '2026-08-01T01:00:00.000Z'
});
const challengeWithoutPhonetic = rebuiltWithoutPhonetic.session.items
  .find(item => item.wordKey === audioItem.wordKey);
assert.equal(challengeWithoutPhonetic.taskType, 'audioSpelling');
assert.equal(challengeWithoutPhonetic.question.prompt, '');

const reorderedSession = {
  ...built.session,
  items: [
    structuredClone(audioItem),
    ...built.session.items.filter(item => item !== audioItem).map(item => structuredClone(item))
  ],
  cursor: 0,
  correctCount: 0,
  wrongCount: 0,
  wrongItems: []
};
const challengeState = challenge.normalizeChallengeState({
  ...state,
  challengeSession: reorderedSession
}, TODAY);
const adventureSnapshot = structuredClone(challengeState.session);
const typedAnswer = audioItem.question.answer.toUpperCase();
const answered = challenge.prepareChallengeAnswer(challengeState, {
  today: TODAY,
  expectedCursor: 0,
  wordKey: audioItem.wordKey,
  answer: typedAnswer,
  answeredAt: '2026-08-01T02:00:00.000Z'
});
assert.equal(answered.correct, true);
assert.equal(answered.state.challengeSession.items[0].userAnswer, typedAnswer);
assert.deepEqual(answered.state.session, adventureSnapshot);

const styles = fs.readFileSync(
  path.join(__dirname, '..', 'styles-vocabulary-adventure.css'),
  'utf8'
);
assert.match(styles, /\.vocabulary-adventure-audio-spelling-phonetic/);
assert.match(
  styles,
  /#screenVocabularyAdventureChallenge \.vocabulary-adventure-audio-prompt \+ \.vocabulary-adventure-prompt-text/
);

console.log('audio spelling phonetic tests passed');
