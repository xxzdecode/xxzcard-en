'use strict';

const assert = require('node:assert/strict');
const patch = require('../js/vocabularyQuestionTypesRepeatBootstrap.js');
const feedback = require('../js/vocabularyFeedbackErrorUI.js');
const practiceUI = require('../js/vocabularyPracticeUI.js');
const feedbackRendererSource = require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', 'js', 'vocabularyFeedbackErrorUI.js'),
  'utf8'
);
const feedbackCoordinatorSource = require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', 'js', 'vocabularyFeedbackSaveCoordinator.js'),
  'utf8'
);
const playerSource = require('node:fs').readFileSync(
  require('node:path').join(__dirname, '..', 'js', 'vocabularyAdventurePlayer.js'),
  'utf8'
);

assert.doesNotMatch(feedbackRendererSource, /wrapSaveFunction|__vteWrapped/,
  'the teaching renderer must not own save orchestration');
assert.match(feedbackCoordinatorSource, /function ownsFeedback\(\)/,
  'the save coordinator must expose feedback ownership');
assert.match(playerSource, /VocabularyFeedbackSaveCoordinator\?\.ownsFeedback\?\.\(\)/,
  'the player must suppress its legacy continue page when coordinated feedback is active');

const duplicateHistory = {
  challengeSession: {
    attemptIndex: 1,
    items: [
      { wordKey: 'apple', taskType: 'audioToWord', question: { prompt: '', options: [{ label: 'apple' }] } },
      { wordKey: 'pear', taskType: 'wordToMeaning', question: { prompt: 'pear', options: [{ label: '梨' }] } },
      { wordKey: 'apple', taskType: 'missingLetters', question: { prompt: 'a__le', options: [{ label: 'PP' }] } }
    ]
  }
};
const history = patch.challengeHistoryByWord(duplicateHistory);
assert.equal(history.get('apple').length, 2, 'all first-attempt items for one word must be retained');
assert.deepEqual(history.get('apple').map(item => item.taskType), ['audioToWord', 'missingLetters']);

const choiceQuestion = {
  ok: true,
  interaction: 'choice',
  questionType: 'wordToMeaning',
  wordKey: 'apple',
  options: [{ label: '梨' }, { label: '苹果' }],
  correctIndex: 1
};
assert.equal(feedback.correctAnswerText(choiceQuestion), '苹果');
assert.equal(feedback.userAnswerText(choiceQuestion, 0), '梨');

const orderQuestion = {
  ok: true,
  interaction: 'order',
  questionType: 'letterOrder',
  tokens: [{ id: '0:a', label: 'a' }, { id: '1:p', label: 'p' }],
  answer: ['0:a', '1:p']
};
assert.equal(feedback.correctAnswerText(orderQuestion), 'ap');
assert.equal(feedback.userAnswerText(orderQuestion, ['1:p', '0:a']), 'pa');

const challengeState = {
  challengeSession: {
    date: '2026-07-31',
    attemptIndex: 1,
    cursor: 1,
    status: 'active',
    items: [{
      wordKey: 'apple',
      status: 'answered',
      correct: false,
      userAnswer: 0,
      question: choiceQuestion
    }]
  }
};
const challengeResult = feedback.extractSavedResult(challengeState, { snapshot: '<div>question</div>' });
assert.equal(challengeResult.mode, 'challenge');
assert.equal(challengeResult.correct, false);
assert.equal(challengeResult.correctAnswer, '苹果');
assert.equal(challengeResult.userAnswer, '梨');
assert.match(challengeResult.fingerprint, /challenge\|2026-07-31\|1\|1/);

const adventureState = {
  words: { apple: { lastResult: 'F' } },
  session: {
    date: '2026-07-31',
    cursor: 1,
    completed: false,
    plan: [{ wordKey: 'apple', status: 'completed', result: 'F', taskType: 'wordToMeaning' }]
  }
};
const adventureResult = feedback.extractSavedResult(adventureState, {
  snapshot: '<div>question</div>',
  selectedAnswer: 0,
  questionContext: { question: choiceQuestion }
});
assert.equal(adventureResult.mode, 'adventure');
assert.equal(adventureResult.result, 'F');
assert.equal(adventureResult.correctAnswer, '苹果');
assert.equal(adventureResult.userAnswer, '梨');

const visualEnv = {
  VOCABULARY_LESSON_ASSETS: [
    './assets/vocabulary-lessons/unit/apple-thumb.webp',
    './assets/vocabulary-lessons/unit/apple.webp'
  ]
};
assert.deepEqual(feedback.chooseVisual({ word: 'apple', emoji: '🍎' }, visualEnv), {
  kind: 'image',
  value: './assets/vocabulary-lessons/unit/apple.webp'
});
assert.deepEqual(feedback.chooseVisual({ word: 'pear', emoji: '🍐' }, visualEnv), { kind: 'emoji', value: '🍐' });
assert.deepEqual(feedback.chooseVisual({ word: 'unknown' }, visualEnv), { kind: 'placeholder', value: '◇' });

let nextCount = 0;
const once = feedback.createOneShot(() => { nextCount += 1; });
assert.equal(once(), true);
assert.equal(once(), false);
assert.equal(nextCount, 1);

const cue = practiceUI.decodeCue(
  practiceUI.MISSING_PROMPT_PREFIX + encodeURIComponent(JSON.stringify({ meaning: '苹果', maskedWord: 'a__le' }))
);
assert.equal(cue.kind, 'missingLetters');
assert.equal(cue.value.maskedWord, 'a__le');

function fakeButton(classes) {
  return {
    classList: { contains: value => classes.includes(value) }
  };
}
assert.equal(practiceUI.optionStateLabel(fakeButton(['is-selected'])), '已选择');
assert.equal(practiceUI.optionStateLabel(fakeButton(['is-wrong'])), '错误答案');
assert.equal(practiceUI.optionStateLabel(fakeButton(['is-correct'])), '正确答案');

console.log('vocabulary system integration tests passed');
