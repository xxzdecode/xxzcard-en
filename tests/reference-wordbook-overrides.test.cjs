'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MasterVocabularyLibrary = require('../js/masterVocabularyLibrary.js');
const ReferenceWordbookImport = require('../js/referenceWordbookImport.js');
const VocabularyJsonImport = require('../js/vocabularyJsonImport.js');

function card(word, meaning, pos = 'n.') {
  return {
    word,
    meaning,
    pos,
    phonetic: '',
    emoji: '',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: ''
  };
}

test('reference override keeps the master homograph unchanged', () => {
  const data = {
    schemaVersion: 2,
    masterCards: {
      miss: card('miss', '错过', 'v.')
    },
    batches: []
  };
  MasterVocabularyLibrary.normalizeAppData(data);

  const input = VocabularyJsonImport.parseReferenceImportPayload({
    schemaVersion: 2,
    wordbook: {
      id: 'book-people',
      name: '人物',
      bookType: 'reference',
      bookPurpose: 'common',
      cardRefs: [{
        wordKey: 'miss',
        overrides: {
          word: 'Miss',
          meaning: '小姐；女士（用于女子姓氏或姓名前）',
          pos: 'title',
          phonetic: '/mɪs/',
          emoji: '👩',
          morphology: [],
          collocations: [],
          irregularForms: [],
          synonyms: [],
          wordFamily: [],
          tip: 'Miss 作称谓时首字母大写。'
        }
      }]
    },
    masterPatch: {
      create: [],
      setIfEmpty: [],
      appendUnique: []
    }
  });

  const plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  assert.equal(plan.summary.directReuse, 1);
  assert.equal(plan.summary.create, 0);

  const result = ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-31' });
  assert.equal(data.masterCards.miss.meaning, '错过');
  assert.equal(data.masterCards.miss.pos, 'v.');
  assert.equal(result.batch.cardRefs[0].wordKey, 'miss');
  assert.equal(result.batch.cardRefs[0].overrides.word, 'Miss');
  assert.equal(result.batch.cardRefs[0].overrides.meaning, '小姐；女士（用于女子姓氏或姓名前）');

  MasterVocabularyLibrary.normalizeAppData(data);
  assert.equal(data.batches[0].cards[0].word, 'Miss');
  assert.equal(data.batches[0].cards[0].meaning, '小姐；女士（用于女子姓氏或姓名前）');
  assert.equal(data.masterCards.miss.meaning, '错过');
  assert.equal(Object.prototype.propertyIsEnumerable.call(data.batches[0], 'cards'), false);
});
