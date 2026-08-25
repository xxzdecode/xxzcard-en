const assert = require('node:assert/strict');
const core = require('../js/vocabularyAdventureCore.js');
const review = require('../js/vocabularyAdventureReview.js');

const TODAY = '2026-07-29';

function card(word, meaning, extra = {}) {
  return {
    word,
    meaning,
    pos: 'n.',
    phonetic: `/${word}/`,
    emoji: `🔹`,
    morphology: [],
    collocations: [{
      phrase: `use ${word}`,
      meaning: `使用 ${meaning}`,
      example: `I use ${word} every day.`
    }],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: '',
    ...extra
  };
}

const candidates = core.collectVocabularyAdventureCandidates([{
  id: 'common',
  name: '正式词本',
  cards: [
    card('apple', '苹果', { emoji: '🍎', phonetic: '/ˈæpəl/' }),
    card('banana', '香蕉', { emoji: '🍌' }),
    card('candle', '蜡烛', { emoji: '🕯️' }),
    card('dragon', '龙', { emoji: '🐉' }),
    card('eagle', '鹰', { emoji: '🦅' })
  ]
}]);

function context(overrides = {}) {
  const planItem = {
    wordKey: 'apple',
    word: 'apple',
    phase: 'review',
    reviewReason: 'due',
    taskType: '',
    status: 'pending',
    result: '',
    ...(overrides.planItem || {})
  };
  return {
    session: { date: TODAY, cursor: 0 },
    planItem,
    planIndex: 0,
    wordState: {
      lastResult: 'D',
      intervalIndex: 1,
      lastReviewedAt: '2026-07-26T02:00:00.000Z',
      nextReviewAt: TODAY,
      reviewCount: 1,
      lastTaskType: '',
      challengeFlagAt: ''
    },
    card: candidates[0].card,
    allCards: candidates,
    userKey: 'sister',
    ...overrides,
    planItem
  };
}

for (const taskType of review.ALL_TYPES) {
  const built = review.buildVocabularyAdventureReviewQuestion({
    ...context(),
    taskType
  });
  assert.equal(built.ok, true, `${taskType} should build`);
  assert.equal(built.questionType, taskType);
  assert.deepEqual(
    review.buildVocabularyAdventureReviewQuestion({ ...context(), taskType }),
    built,
    `${taskType} should be deterministic`
  );
}

for (let index = 0; index < 20; index += 1) {
  const challenge = review.buildVocabularyAdventureReviewQuestion(context({
    planIndex: index,
    planItem: { wordKey: candidates[index % candidates.length].key, reviewReason: 'challenge' }
  }));
  assert.ok(review.BASIC_TYPES.includes(challenge.questionType));

  const failed = review.buildVocabularyAdventureReviewQuestion(context({
    planIndex: index,
    planItem: { wordKey: candidates[index % candidates.length].key, reviewReason: 'failed' }
  }));
  assert.equal(review.USAGE_TYPES.includes(failed.questionType), false);

  const severe = review.buildVocabularyAdventureReviewQuestion(context({
    planIndex: index,
    planItem: { wordKey: candidates[index % candidates.length].key, reviewReason: 'severeOverdue' }
  }));
  assert.equal(review.USAGE_TYPES.includes(severe.questionType), false);
}

const hintedTypes = new Set(Array.from({ length: 30 }, (_, index) => (
  review.buildVocabularyAdventureReviewQuestion(context({
    planIndex: index,
    planItem: { wordKey: candidates[index % candidates.length].key, reviewReason: 'hinted' }
  })).questionType
)));
assert.equal([...hintedTypes].some(type => review.BASIC_TYPES.includes(type) || review.FORM_TYPES.includes(type)), true);
assert.equal([...hintedTypes].some(type => review.USAGE_TYPES.includes(type)), false);

const dueTypes = new Set(Array.from({ length: 80 }, (_, index) => (
  review.buildVocabularyAdventureReviewQuestion(context({
    planIndex: index,
    planItem: { wordKey: candidates[index % candidates.length].key, reviewReason: 'due' }
  })).questionType
)));
assert.equal([...dueTypes].some(type => review.USAGE_TYPES.includes(type)), true);
const stableTypes = new Set(Array.from({ length: 80 }, (_, index) => (
  review.buildVocabularyAdventureReviewQuestion(context({
    planIndex: index,
    planItem: { wordKey: candidates[index % candidates.length].key, reviewReason: 'stable' }
  })).questionType
)));
assert.equal([...stableTypes].some(type => review.USAGE_TYPES.includes(type)), true);

const initiallyAssigned = review.buildVocabularyAdventureReviewQuestion(context({
  planItem: { wordKey: 'apple', reviewReason: 'challenge' }
})).questionType;
const avoidRepeated = review.buildVocabularyAdventureReviewQuestion(context({
  wordState: { ...context().wordState, lastTaskType: initiallyAssigned },
  planItem: { wordKey: 'apple', reviewReason: 'challenge' }
}));
assert.notEqual(avoidRepeated.questionType, initiallyAssigned);

const missingFields = candidates.map(candidate => ({
  ...candidate,
  card: { ...candidate.card, phonetic: '', collocations: [] }
}));
const fallback = review.buildVocabularyAdventureReviewQuestion(context({
  allCards: missingFields,
  taskType: 'sentenceOrder'
}));
assert.equal(fallback.ok, true);
assert.equal(review.USAGE_TYPES.includes(fallback.questionType), false);

const impossibleCandidates = core.collectVocabularyAdventureCandidates([{
  id: 'only',
  name: 'only',
  cards: [card('a', '一个', { phonetic: '', emoji: '', collocations: [] })]
}]);
const impossible = review.buildVocabularyAdventureReviewQuestion(context({
  allCards: impossibleCandidates,
  card: impossibleCandidates[0].card,
  planItem: { wordKey: 'a', reviewReason: 'challenge' }
}));
assert.deepEqual(
  { ok: impossible.ok, reason: impossible.reason, wordKey: impossible.wordKey },
  { ok: false, reason: 'NO_SAFE_QUESTION', wordKey: 'a' }
);

const invisible = review.buildVocabularyAdventureReviewQuestion(context({
  planItem: { wordKey: 'hidden', reviewReason: 'due' }
}));
assert.equal(invisible.reason, 'WORD_NOT_VISIBLE');

const seedApple = review.buildVocabularyAdventureReviewQuestion(context({ taskType: 'letterOrder' }));
const seedBanana = review.buildVocabularyAdventureReviewQuestion(context({
  taskType: 'letterOrder',
  planItem: { wordKey: 'banana', reviewReason: 'due' }
}));
assert.notEqual(seedApple.seed, seedBanana.seed);

const visual = review.buildVocabularyAdventureReviewQuestion(context({
  taskType: 'visualMatch',
  visualByWord: { apple: 'apple-picture' }
}));
assert.equal(visual.pairs.find(pair => pair.key === 'apple').visual, 'apple-picture');
assert.equal(visual.pairs.find(pair => pair.key === 'apple').visualKind, 'visual');
const emojiVisual = review.buildVocabularyAdventureReviewQuestion(context({ taskType: 'visualMatch' }));
assert.equal(emojiVisual.pairs.find(pair => pair.key === 'apple').visual, '🍎');
const meaningCandidates = candidates.map(candidate => ({
  ...candidate,
  card: { ...candidate.card, emoji: '' }
}));
const meaningVisual = review.buildVocabularyAdventureReviewQuestion(context({
  taskType: 'visualMatch',
  allCards: meaningCandidates
}));
assert.equal(meaningVisual.pairs.find(pair => pair.key === 'apple').visual, '苹果');
assert.deepEqual(review.visualMatchOutcome(0), { result: 'D', requiresConfirmation: false });
assert.deepEqual(review.visualMatchOutcome(1), { result: 'H', requiresConfirmation: false });
assert.deepEqual(review.visualMatchOutcome(2), { result: '', requiresConfirmation: true });

const choice = review.buildVocabularyAdventureReviewQuestion(context({ taskType: 'wordToMeaning' }));
assert.equal(review.gradeVocabularyAdventureReviewQuestion(choice, choice.correctIndex), true);
assert.equal(review.gradeVocabularyAdventureReviewQuestion(choice, (choice.correctIndex + 1) % choice.options.length), false);
const missing = review.buildVocabularyAdventureReviewQuestion(context({ taskType: 'missingLetters' }));
assert.equal(review.gradeVocabularyAdventureReviewQuestion(missing, missing.answer.toUpperCase()), true);
const order = review.buildVocabularyAdventureReviewQuestion(context({ taskType: 'sentenceOrder' }));
assert.equal(review.gradeVocabularyAdventureReviewQuestion(order, order.answer), true);
assert.equal(review.gradeVocabularyAdventureReviewQuestion(order, [...order.answer].reverse()), false);
const cleverOrder = {
  ok: true,
  interaction: 'order',
  questionType: 'letterOrder',
  tokens: [...'clever'].map((label, index) => ({ id: `${index}:${label}`, label })),
  answer: [...'clever'].map((label, index) => `${index}:${label}`)
};
assert.equal(
  review.gradeVocabularyAdventureReviewQuestion(cleverOrder, ['0:c', '1:l', '4:e', '3:v', '2:e', '5:r']),
  true,
  'visually identical repeated letters must be interchangeable'
);

const confirmation = review.buildVocabularyAdventureMeaningConfirmation(context());
assert.equal(confirmation.ok, true);
assert.equal(review.BASIC_TYPES.includes(confirmation.questionType), true);
assert.equal(confirmation.confirmation, true);

function reviewState(intervalIndex = 1, result = 'D') {
  return {
    version: 1,
    words: {
      apple: {
        lastResult: result,
        intervalIndex,
        lastReviewedAt: '2026-07-26T02:00:00.000Z',
        nextReviewAt: TODAY,
        reviewCount: 1,
        lastTaskType: 'wordToMeaning',
        challengeFlagAt: '2026-07-28T02:00:00.000Z'
      }
    },
    session: {
      date: TODAY,
      plan: [{
        wordKey: 'apple',
        word: 'apple',
        batchId: 'stale',
        batchName: 'stale',
        cardIndex: 999,
        phase: 'review',
        reviewReason: 'challenge',
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
}

for (const [startIndex, result, expectedIndex] of [
  [0, 'D', 1],
  [1, 'D', 2],
  [2, 'D', 3],
  [3, 'D', 4],
  [4, 'D', 5],
  [5, 'D', 5],
  [3, 'H', 3],
  [3, 'F', 0]
]) {
  const before = reviewState(startIndex);
  const snapshot = structuredClone(before);
  const after = core.prepareVocabularyAdventureReviewResult(before, {
    expectedCursor: 0,
    wordKey: 'apple',
    taskType: 'exampleCloze',
    confirmationTaskType: result === 'H' ? 'wordToMeaning' : '',
    outcomeDetail: result === 'H' ? 'usageWeak' : '',
    result,
    reviewedAt: new Date(2026, 6, 29, 10, 0, 0)
  });
  assert.deepEqual(before, snapshot);
  assert.equal(after.words.apple.intervalIndex, expectedIndex);
  assert.equal(after.words.apple.reviewCount, 2);
  assert.equal(after.words.apple.lastTaskType, 'exampleCloze');
  assert.equal(after.words.apple.challengeFlagAt, '');
  assert.equal(after.session.plan[0].status, 'completed');
  assert.equal(after.session.plan[0].result, result);
  assert.equal(after.session.plan[0].reviewReason, 'challenge');
  assert.equal(after.session.completed, true);
  if (result === 'H') {
    assert.equal(after.session.plan[0].outcomeDetail, 'usageWeak');
    assert.equal(after.session.plan[0].confirmationTaskType, 'wordToMeaning');
  }
}

const completed = core.prepareVocabularyAdventureReviewResult(reviewState(), {
  expectedCursor: 0,
  wordKey: 'apple',
  taskType: 'visualMatch',
  result: 'D',
  reviewedAt: new Date(2026, 6, 29, 10, 0, 0)
});
assert.throws(() => core.prepareVocabularyAdventureReviewResult(completed, {
  expectedCursor: 0,
  wordKey: 'apple',
  taskType: 'visualMatch',
  result: 'D',
  reviewedAt: new Date()
}), error => error.code === 'SESSION_UNAVAILABLE');
assert.throws(() => core.prepareVocabularyAdventureReviewResult(reviewState(), {
  expectedCursor: 0,
  wordKey: 'banana',
  taskType: 'visualMatch',
  result: 'D',
  reviewedAt: new Date()
}), error => error.code === 'WORD_MISMATCH');
const malformedState = reviewState();
malformedState.session.plan.unshift({
  wordKey: 'banana',
  word: 'banana',
  phase: 'screening',
  status: 'pending',
  result: ''
});
malformedState.session.cursor = 1;
assert.throws(() => core.prepareVocabularyAdventureReviewResult(malformedState, {
  expectedCursor: 1,
  wordKey: 'apple',
  taskType: 'wordToMeaning',
  result: 'D',
  reviewedAt: new Date()
}), error => error.code === 'SCREENING_INCOMPLETE');

const summaryState = {
  version: 1,
  words: {},
  session: {
    date: TODAY,
    cursor: 4,
    phase: 'completed',
    completed: true,
    rewardGranted: false,
    plan: [
      { wordKey: 'one', phase: 'screening', status: 'completed', result: 'D' },
      { wordKey: 'two', phase: 'review', reviewReason: 'due', status: 'completed', result: 'H', outcomeDetail: 'usageWeak' },
      { wordKey: 'three', phase: 'review', reviewReason: 'severeOverdue', status: 'completed', result: 'F' },
      { wordKey: 'four', phase: 'review', reviewReason: 'stable', status: 'completed', result: 'D' }
    ]
  }
};
assert.deepEqual(core.summarizeVocabularyAdventureSession(summaryState), {
  total: 4,
  screeningCompleted: 1,
  reviewCompleted: 3,
  reviewTotal: 3,
  direct: 2,
  hinted: 1,
  failed: 1,
  usageWeak: 1,
  severeOverdueCompleted: true,
  completed: true
});
assert.deepEqual(core.summarizeVocabularyAdventureSession({
  version: 1,
  words: {},
  session: {
    date: TODAY,
    cursor: 1,
    phase: 'completed',
    completed: true,
    rewardGranted: false,
    plan: [{ wordKey: 'only-screening', phase: 'screening', status: 'completed', result: 'D' }]
  }
}), {
  total: 1,
  screeningCompleted: 1,
  reviewCompleted: 0,
  reviewTotal: 0,
  direct: 1,
  hinted: 0,
  failed: 0,
  usageWeak: 0,
  severeOverdueCompleted: false,
  completed: true
});

console.log('vocabulary adventure review tests passed');
