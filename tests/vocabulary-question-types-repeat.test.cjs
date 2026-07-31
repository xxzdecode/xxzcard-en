'use strict';

const assert = require('node:assert/strict');
const patch = require('../js/vocabularyQuestionTypesRepeatBootstrap.js');

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shuffle(values, seed, identity) {
  const getIdentity = typeof identity === 'function' ? identity : value => String(value);
  return [...values].map((value, index) => ({
    value,
    index,
    rank: hash(`${seed}|${getIdentity(value)}|${index}`)
  })).sort((a, b) => a.rank - b.rank || a.index - b.index).map(entry => entry.value);
}

const baseCore = {
  SCREENING_TASK_TYPES: Object.freeze(['wordToMeaning', 'audioToWord', 'meaningToWord']),
  adventureWordKey(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  },
  stableAdventureHash: hash,
  deterministicAdventureShuffle: shuffle,
  normalizeVocabularyAdventureState(value) {
    return JSON.parse(JSON.stringify(value || { words: {}, session: null }));
  },
  prepareVocabularyAdventureResult(state, submission) {
    assert.ok(['wordToMeaning', 'audioToWord', 'meaningToWord'].includes(submission.taskType));
    const next = JSON.parse(JSON.stringify(state));
    const index = next.session.cursor;
    next.session.plan[index].taskType = submission.taskType;
    next.session.plan[index].status = 'completed';
    next.session.cursor += 1;
    next.words[submission.wordKey] = {
      ...(next.words[submission.wordKey] || {}),
      lastTaskType: submission.taskType
    };
    return next;
  }
};

function simpleChoice(type) {
  return {
    id: type,
    category: 'basic',
    build(context) {
      return {
        ok: true,
        interaction: 'choice',
        questionType: type,
        wordKey: context.planItem.wordKey,
        prompt: type,
        options: [{ label: 'A', correct: true }, { label: 'B', correct: false }],
        correctIndex: 0
      };
    }
  };
}

const baseReview = {
  BASIC_TYPES: Object.freeze(['visualMatch', 'wordToMeaning', 'meaningToWord', 'audioToWord']),
  FORM_TYPES: Object.freeze(['phoneticToWord', 'missingLetters', 'letterOrder', 'audioSpelling']),
  USAGE_TYPES: Object.freeze(['collocationCloze', 'exampleCloze', 'sentenceOrder']),
  VocabularyAdventureReviewTypes: Object.freeze({
    visualMatch: simpleChoice('visualMatch'),
    wordToMeaning: simpleChoice('wordToMeaning'),
    meaningToWord: simpleChoice('meaningToWord'),
    audioToWord: simpleChoice('audioToWord'),
    phoneticToWord: simpleChoice('phoneticToWord'),
    missingLetters: simpleChoice('missingLetters'),
    letterOrder: simpleChoice('letterOrder'),
    audioSpelling: simpleChoice('audioSpelling'),
    collocationCloze: simpleChoice('collocationCloze'),
    exampleCloze: simpleChoice('exampleCloze'),
    sentenceOrder: simpleChoice('sentenceOrder')
  }),
  reviewReasonFromState(planItem) {
    return planItem.reviewReason || 'due';
  },
  gradeVocabularyAdventureReviewQuestion(question, answer) {
    return Number(answer) === question.correctIndex;
  },
  visualMatchOutcome(errors) {
    return errors ? { result: 'H', requiresConfirmation: false } : { result: 'D', requiresConfirmation: false };
  }
};

const { core, review } = patch.install(baseCore, baseReview);

function candidates(size) {
  return Array.from({ length: size }, (_, index) => ({
    key: `word${index}`,
    word: `word${index}`,
    card: {
      word: `word${index}`,
      meaning: `意思${index}`,
      phonetic: `/w${index}/`,
      emoji: index === 0 ? '🍎' : ''
    }
  }));
}

assert.deepEqual(core.SCREENING_TASK_TYPES, ['wordToMeaning', 'audioToMeaning', 'meaningToWord']);
assert.ok(!core.SCREENING_TASK_TYPES.includes('audioToWord'));

const audioMeaning = core.buildVocabularyAdventureQuestion({
  candidates: candidates(5),
  sessionDate: '2026-07-31',
  wordKey: 'word0',
  planIndex: 0,
  taskType: 'audioToMeaning'
});
assert.equal(audioMeaning.ok, true);
assert.equal(audioMeaning.taskType, 'audioToMeaning');
assert.ok(audioMeaning.options.every(option => option.label.startsWith('意思')));
assert.ok(audioMeaning.prompt.startsWith(patch.FEATURE_PROMPT_PREFIX));

const oldChallengeAudio = core.buildVocabularyAdventureQuestion({
  candidates: candidates(5),
  sessionDate: '2026-07-31',
  wordKey: 'word0',
  planIndex: 0,
  taskType: 'audioToWord'
});
assert.equal(oldChallengeAudio.ok, true);
assert.ok(oldChallengeAudio.options.every(option => option.label.startsWith('word')));

const phoneticMeaning = review.VocabularyAdventureReviewTypes.phoneticToMeaning.build({
  session: { date: '2026-07-31' },
  planItem: { wordKey: 'word0' },
  planIndex: 2,
  wordState: {},
  allCards: candidates(5),
  userKey: 'sister'
});
assert.equal(phoneticMeaning.ok, true);
assert.equal(phoneticMeaning.questionType, 'phoneticToMeaning');
assert.ok(phoneticMeaning.options.every(option => option.label.startsWith('意思')));

const missing = review.VocabularyAdventureReviewTypes.missingLetters.build({
  session: { date: '2026-07-31' },
  planItem: { wordKey: 'word0' },
  planIndex: 3,
  wordState: {},
  allCards: candidates(8),
  userKey: 'sister'
});
assert.equal(missing.ok, true);
assert.equal(missing.interaction, 'choice');
assert.ok(missing.options.length >= 3 && missing.options.length <= 4);
assert.ok(missing.correctIndex >= 0);
assert.equal(missing.cue.meaning, '意思0');
assert.equal(missing.cue.emoji, '🍎');
assert.ok(missing.maskedWord.includes('_'));
assert.ok(!missing.prompt.includes('word0'));

const noEmojiCandidates = candidates(5);
delete noEmojiCandidates[0].card.emoji;
const fallbackMissing = review.VocabularyAdventureReviewTypes.missingLetters.build({
  session: { date: '2026-07-31' },
  planItem: { wordKey: 'word0' },
  planIndex: 4,
  wordState: {},
  allCards: noEmojiCandidates,
  userKey: 'brother'
});
assert.equal(fallbackMissing.cue.placeholder, '📝');

assert.ok(review.BASIC_TYPES.includes('audioToMeaning'));
assert.ok(!review.BASIC_TYPES.includes('audioToWord'));
assert.ok(review.FORM_TYPES.includes('phoneticToMeaning'));
assert.ok(!review.FORM_TYPES.includes('phoneticToWord'));
assert.ok(review.VocabularyAdventureReviewTypes.audioToWord);
assert.ok(review.VocabularyAdventureReviewTypes.phoneticToWord);

const adventureReview = review.buildVocabularyAdventureReviewQuestion({
  session: { date: '2026-07-31' },
  planItem: { wordKey: 'word0', reviewReason: 'failed' },
  planIndex: 1,
  wordState: {},
  allCards: candidates(8),
  userKey: 'sister'
});
assert.ok(!['audioToWord', 'phoneticToWord'].includes(adventureReview.questionType));

const firstSession = {
  words: {},
  challengeSession: {
    attemptIndex: 1,
    items: Array.from({ length: 10 }, (_, index) => ({
      wordKey: `word${index}`,
      taskType: 'audioToWord',
      question: {
        ok: true,
        interaction: 'choice',
        questionType: 'audioToWord',
        prompt: '',
        options: [{ label: `word${index}` }, { label: `word${(index + 1) % 10}` }],
        correctIndex: 0
      }
    }))
  }
};
core.normalizeVocabularyAdventureState(firstSession);
const repeatedType = review.VocabularyAdventureReviewTypes.audioToWord.build({
  session: { date: '2026-07-31' },
  planItem: { wordKey: 'word0' },
  planIndex: 0,
  wordState: {},
  allCards: candidates(15),
  userKey: 'sister|attempt:2'
});
assert.equal(repeatedType, null);
const changedType = review.VocabularyAdventureReviewTypes.phoneticToWord.build({
  session: { date: '2026-07-31' },
  planItem: { wordKey: 'word0' },
  planIndex: 0,
  wordState: {},
  allCards: candidates(15),
  userKey: 'sister|attempt:2'
});
assert.equal(changedType.ok, true);

const orderedLarge = core.deterministicAdventureShuffle(
  candidates(20),
  '2026-07-31|sister|challenge|2|priority:3',
  candidate => candidate.key
).slice(0, 10);
assert.ok(orderedLarge.filter(candidate => Number(candidate.key.slice(4)) >= 10).length >= 6);

const expanded = patch.expandChallengeCandidates(candidates(5), 10);
assert.equal(expanded.length, 10);
assert.ok(expanded.every((item, index) => index === 0 || item.key !== expanded[index - 1].key));
assert.deepEqual(
  patch.expandChallengeCandidates(candidates(5), 10).map(item => item.key),
  expanded.map(item => item.key)
);

const savedState = {
  words: { word0: {} },
  session: { cursor: 0, plan: [{ wordKey: 'word0', status: 'pending', taskType: '' }] }
};
const saved = core.prepareVocabularyAdventureResult(savedState, {
  wordKey: 'word0',
  taskType: 'audioToMeaning'
});
assert.equal(saved.session.plan[0].taskType, 'audioToMeaning');
assert.equal(saved.words.word0.lastTaskType, 'audioToMeaning');

function simulateChallengeBuild(poolSize, attemptIndex, priorSession) {
  const pool = patch.expandChallengeCandidates(candidates(poolSize), 10);
  core.normalizeVocabularyAdventureState(priorSession
    ? { words: {}, challengeSession: priorSession }
    : { words: {} });
  const ordered = core.deterministicAdventureShuffle(
    pool,
    `2026-07-31|sister|challenge|${attemptIndex}|priority:3`,
    candidate => candidate.key
  ).slice(0, 10);
  const typeOrder = [
    'exampleCloze', 'meaningToWord', 'wordToMeaning', 'audioToWord',
    'missingLetters', 'letterOrder', 'audioSpelling', 'phoneticToWord',
    'collocationCloze', 'sentenceOrder'
  ];
  return ordered.map((candidate, index) => {
    const start = (hash(`2026-07-31|sister|challenge|${attemptIndex}|types`) + index) % typeOrder.length;
    const rotated = [...typeOrder.slice(start), ...typeOrder.slice(0, start)];
    for (const taskType of rotated) {
      const definition = review.VocabularyAdventureReviewTypes[taskType];
      const question = definition && definition.build({
        session: { date: '2026-07-31' },
        planItem: { wordKey: candidate.key, taskType },
        planIndex: index,
        wordState: {},
        allCards: pool,
        userKey: `sister|attempt:${attemptIndex}`
      });
      if (question && question.ok) return { wordKey: candidate.key, taskType, question };
    }
    throw new Error(`No safe question for ${candidate.key}`);
  });
}

const firstLargeItems = simulateChallengeBuild(20, 1, null);
const secondLargeItems = simulateChallengeBuild(20, 2, { attemptIndex: 1, items: firstLargeItems });
const firstLargeWords = new Set(firstLargeItems.map(item => item.wordKey));
assert.ok(secondLargeItems.filter(item => !firstLargeWords.has(item.wordKey)).length >= 6);

const firstMediumItems = simulateChallengeBuild(12, 1, null);
const secondMediumItems = simulateChallengeBuild(12, 2, { attemptIndex: 1, items: firstMediumItems });
const firstMediumByWord = new Map(firstMediumItems.map(item => [item.wordKey, item.taskType]));
secondMediumItems.forEach(item => {
  if (firstMediumByWord.has(item.wordKey)) assert.notEqual(item.taskType, firstMediumByWord.get(item.wordKey));
});

const firstSmallItems = simulateChallengeBuild(5, 1, null);
assert.equal(firstSmallItems.length, 10);
assert.ok(firstSmallItems.every((item, index) => index === 0 || item.wordKey !== firstSmallItems[index - 1].wordKey));
const firstSmallAgain = simulateChallengeBuild(5, 1, null);
assert.deepEqual(
  firstSmallAgain.map(item => patch.questionFingerprint(item.wordKey, item.taskType, item.question)),
  firstSmallItems.map(item => patch.questionFingerprint(item.wordKey, item.taskType, item.question))
);

console.log('vocabulary question-types/repeat tests passed');
