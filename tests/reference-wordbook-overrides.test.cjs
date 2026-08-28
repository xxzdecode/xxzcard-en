'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

test('classroom grammar terms reuse object without overwriting its everyday meaning', () => {
  const input = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../data/imports/book-classroom-grammar-terms.reference.json'),
    'utf8'
  ));
  const data = {
    schemaVersion: 2,
    masterCards: {
      object: {
        ...card('object', '物体；物品'),
        phonetic: '/ˈɒbdʒɪkt/',
        emoji: '📦',
        collocations: [{
          phrase: 'a heavy object',
          example: 'The crane lifted a heavy object. / 起重机吊起了一个重物。'
        }],
        synonyms: [{ word: 'thing', meaning: '东西；物品' }],
        tip: '作名词“物体”时重音在第一个音节。'
      }
    },
    batches: []
  };

  MasterVocabularyLibrary.normalizeAppData(data);
  const plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.summary.directReuse, 1);
  assert.equal(plan.summary.create, 18);
  assert.equal(plan.summary.conflicts, 0);

  const result = ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-08-28' });
  const objectRef = result.batch.cardRefs.find(ref => ref.wordKey === 'object');
  assert.equal(data.masterCards.object.meaning, '物体；物品');
  assert.equal(data.masterCards.object.emoji, '📦');
  assert.equal(objectRef.overrides.meaning, '宾语');
  assert.equal(objectRef.overrides.emoji, '🎯');

  MasterVocabularyLibrary.normalizeAppData(data);
  const hydratedObject = data.batches[0].cards.find(item => item.word === 'object');
  assert.equal(hydratedObject.meaning, '宾语');
  assert.equal(data.masterCards.object.meaning, '物体；物品');
  assert.equal(Object.prototype.propertyIsEnumerable.call(data.batches[0], 'cards'), false);
});
