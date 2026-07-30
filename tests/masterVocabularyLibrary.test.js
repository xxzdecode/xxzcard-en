const assert = require('node:assert/strict');
const library = require('../js/masterVocabularyLibrary.js');

function card(word, overrides = {}) {
  return {
    word,
    meaning: `${word} meaning`,
    pos: 'n.',
    phonetic: `/${word}/`,
    emoji: '📘',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: '',
    ...overrides
  };
}

const data = {
  batches: [
    {
      id: 'old-1',
      name: '旧单词本一',
      cards: [
        card('red', { meaning: '红色的', collocations: [{ phrase: 'a red apple', example: '' }] }),
        card('go', { meaning: '去；走', tip: 'go home 前不加 to。' })
      ],
      sharedWith: ['sister']
    },
    {
      id: 'old-2',
      name: '旧单词本二',
      cards: [
        card('go', {
          meaning: '去；走',
          tip: 'go 的过去式是 went。',
          collocations: [{ phrase: 'go out', example: '' }],
          irregularForms: [{ label: '过去式', form: 'went' }]
        })
      ],
      sharedWith: ['brother']
    }
  ]
};

library.normalizeAppData(data);

assert.equal(data.schemaVersion, 2);
assert.deepEqual(Object.keys(data.masterCards).sort(), ['go', 'red']);
assert.equal(data.batches[0].bookType, 'reference');
assert.deepEqual(data.batches[0].cardRefs, [{ wordKey: 'red' }, { wordKey: 'go' }]);
assert.equal(Object.prototype.propertyIsEnumerable.call(data.batches[0], 'cards'), false);
assert.equal(data.batches[0].cards[0], data.masterCards.red, 'runtime batch cards should reuse the master card object');
assert.equal(data.masterCards.go.collocations.length, 1);
assert.equal(data.masterCards.go.irregularForms.length, 1);
assert.match(data.masterCards.go.tip, /go home/);
assert.match(data.masterCards.go.tip, /went/);

const persisted = library.persistedCopy(data);
assert.equal(Object.prototype.hasOwnProperty.call(persisted.batches[0], 'cards'), false);
assert.deepEqual(persisted.batches[1].cardRefs, [{ wordKey: 'go' }]);
assert.ok(persisted.masterCards.go);

library.normalizeAppData(persisted);
persisted.batches[0].cards.push(card('blue', { meaning: '蓝色的；蓝色' }));
library.normalizeAppData(persisted);
assert.ok(persisted.masterCards.blue);
assert.deepEqual(persisted.batches[0].cardRefs.map(item => item.wordKey), ['red', 'go', 'blue']);

persisted.batches[0].cards[0].tip = 'shared edit';
assert.equal(persisted.masterCards.red.tip, 'shared edit');
assert.equal(library.findInvalidData(persisted), null);

const overrideData = {
  schemaVersion: 2,
  masterCards: { orange: card('orange', { meaning: '橙子；橙色的' }) },
  batches: [{
    id: 'colours',
    name: '颜色',
    cardRefs: [{ wordKey: 'orange', overrides: { meaning: '橙色；橙色的' } }]
  }]
};
library.normalizeAppData(overrideData);
assert.equal(overrideData.batches[0].cards[0].meaning, '橙色；橙色的');
assert.equal(overrideData.masterCards.orange.meaning, '橙子；橙色的');

console.log('master vocabulary library tests passed');
