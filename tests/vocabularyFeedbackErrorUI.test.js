const assert = require('node:assert/strict');
const ui = require('../js/vocabularyFeedbackErrorUI.js');

const env = {
  VOCABULARY_LESSON_ASSETS: [
    './assets/vocabulary-lessons/unit/apple-thumb.webp',
    './assets/vocabulary-lessons/unit/apple.webp'
  ]
};

assert.deepEqual(ui.chooseVisual({ word: 'apple', emoji: '🍎' }, env), {
  kind: 'image',
  value: './assets/vocabulary-lessons/unit/apple.webp'
});
assert.deepEqual(ui.chooseVisual({ word: 'pear', emoji: '🍐' }, env), { kind: 'emoji', value: '🍐' });
assert.deepEqual(ui.chooseVisual({ word: 'unknown' }, env), { kind: 'placeholder', value: '◇' });

const adventure = ui.buildTeachingModel({
  word: 'apple',
  meaning: '苹果',
  phonetic: '/ˈæp.əl/',
  pos: 'n.',
  collocations: [{ phrase: 'an apple', example: 'I eat an apple. / 我吃一个苹果。' }],
  irregularForms: ['apples'],
  tip: '开头是 a。'
}, {
  source: 'adventure',
  correctAnswer: '苹果',
  userAnswer: '香蕉'
}, env);
assert.equal(adventure.title, '再认识一次这个词');
assert.equal(adventure.collocation, 'an apple');
assert.match(adventure.example, /I eat an apple/);

const challenge = ui.buildTeachingModel({ word: 'apple', meaning: '苹果', emoji: '🍎' }, {
  source: 'challenge',
  correctAnswer: 'apple',
  userAnswer: 'orange'
}, {});
const html = ui.renderTeachingHtml(challenge, 'challenge-1');
assert.match(html, /这道题的正确答案/);
assert.match(html, /正确答案/);
assert.match(html, /刚才的答案/);
assert.match(html, /下一题/);
assert.doesNotMatch(html, /已记录为|提示后答对|第一次就答对|明天会更快|\bD\b|\bH\b|\bF\b/);

let count = 0;
const once = ui.createOneShot(() => { count += 1; });
assert.equal(once(), true);
assert.equal(once(), false);
assert.equal(count, 1);

console.log('vocabulary feedback error UI tests passed');
