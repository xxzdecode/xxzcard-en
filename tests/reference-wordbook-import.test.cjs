'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const MasterVocabularyLibrary = require('../js/masterVocabularyLibrary.js');
const ReferenceWordbookImport = require('../js/referenceWordbookImport.js');
const VocabularyJsonImport = require('../js/vocabularyJsonImport.js');

function card(word, overrides = {}) {
  return {
    word,
    meaning: `${word}-meaning`,
    pos: 'noun',
    phonetic: '',
    emoji: '',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: '',
    ...overrides
  };
}

function baseData() {
  const data = {
    schemaVersion: 2,
    masterCards: { red: card('red', { meaning: '红色' }) },
    batches: []
  };
  MasterVocabularyLibrary.normalizeAppData(data);
  return data;
}

function pkg(overrides = {}) {
  return {
    schemaVersion: 2,
    wordbook: {
      id: 'book-colours',
      name: '颜色',
      bookPurpose: 'common',
      cardRefs: [{ wordKey: 'red' }],
      ...(overrides.wordbook || {})
    },
    masterPatch: {
      create: [],
      setIfEmpty: [],
      appendUnique: [],
      ...(overrides.masterPatch || {})
    }
  };
}

test('existing identical word is reused and wordbook persists only cardRefs', () => {
  const data = baseData();
  const plan = ReferenceWordbookImport.auditReferenceImport(data, pkg());
  assert.equal(plan.summary.directReuse, 1);
  assert.equal(plan.summary.create, 0);
  const result = ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-30' });
  assert.deepEqual(result.batch.cardRefs, [{ wordKey: 'red' }]);
  assert.equal(Object.prototype.propertyIsEnumerable.call(result.batch, 'cards'), false);
  assert.equal(data.masterCards.red.meaning, '红色');
});

test('new word is created once and referenced', () => {
  const data = baseData();
  const input = pkg({
    wordbook: { cardRefs: [{ wordKey: 'red' }, { wordKey: 'blue' }] },
    masterPatch: { create: [card('blue', { meaning: '蓝色' })] }
  });
  const plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  assert.equal(plan.summary.create, 1);
  ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-30' });
  assert.equal(data.masterCards.blue.meaning, '蓝色');
  assert.deepEqual(data.batches[0].cardRefs.map(ref => ref.wordKey), ['red', 'blue']);
});

test('setIfEmpty and appendUnique add only safe differences', () => {
  const data = baseData();
  data.masterCards.red.phonetic = '';
  data.masterCards.red.collocations = [{ phrase: 'red apple', example: '' }];
  const input = pkg({
    masterPatch: {
      setIfEmpty: [{ wordKey: 'red', fields: { phonetic: '/red/' } }],
      appendUnique: [{
        wordKey: 'red',
        fields: { collocations: [
          { phrase: 'red apple', example: '' },
          { phrase: 'red light', example: '' }
        ] }
      }]
    }
  });
  const plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  assert.equal(plan.summary.setIfEmpty, 1);
  assert.equal(plan.summary.appendUnique, 1);
  ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-30' });
  assert.equal(data.masterCards.red.phonetic, '/red/');
  assert.equal(data.masterCards.red.collocations.length, 2);
});

test('non-empty conflicts are previewed and never overwritten', () => {
  const data = baseData();
  const input = pkg({
    masterPatch: { setIfEmpty: [{ wordKey: 'red', fields: { meaning: '赤色' } }] }
  });
  const plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  assert.equal(plan.conflicts.length, 1);
  assert.throws(
    () => ReferenceWordbookImport.applyReferenceImport(data, plan),
    error => error.code === 'REFERENCE_IMPORT_CONFLICT_CONFIRMATION_REQUIRED'
  );
  ReferenceWordbookImport.applyReferenceImport(data, plan, { confirmConflicts: true, date: '2026-07-30' });
  assert.equal(data.masterCards.red.meaning, '红色');
});

test('same package is idempotent', () => {
  const data = baseData();
  const input = pkg({
    wordbook: { cardRefs: [{ wordKey: 'red' }, { wordKey: 'blue' }] },
    masterPatch: { create: [card('blue', { meaning: '蓝色' })] }
  });
  let plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-30' });
  const once = JSON.parse(JSON.stringify(data));
  plan = ReferenceWordbookImport.auditReferenceImport(data, input);
  ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-30' });
  assert.deepEqual(JSON.parse(JSON.stringify(data)), once);
});

test('add mode merges refs without duplicates', () => {
  const data = baseData();
  let plan = ReferenceWordbookImport.auditReferenceImport(data, pkg());
  ReferenceWordbookImport.applyReferenceImport(data, plan, { date: '2026-07-30' });
  data.masterCards.blue = card('blue', { meaning: '蓝色' });
  const addPackage = pkg({ wordbook: { cardRefs: [{ wordKey: 'red' }, { wordKey: 'blue' }] } });
  plan = ReferenceWordbookImport.auditReferenceImport(data, addPackage, { targetBatchId: 'book-colours' });
  const result = ReferenceWordbookImport.applyReferenceImport(data, plan, { mergeRefs: true, date: '2026-07-30' });
  assert.deepEqual(result.batch.cardRefs.map(ref => ref.wordKey), ['red', 'blue']);
});

test('formal JSON rejects legacy cards and category fields', () => {
  assert.throws(
    () => VocabularyJsonImport.parseReferenceImportPayload([card('red')]),
    /旧完整卡片 JSON 数组已停用/
  );
  assert.throws(
    () => VocabularyJsonImport.parseReferenceImportPayload({
      schemaVersion: 2,
      categoryId: 'colours',
      wordbook: { id: 'book-colours', name: '颜色', cardRefs: ['red'] },
      masterPatch: {}
    }),
    /不得包含分类字段/
  );
});

test('formal JSON requires stable wordbook id and array-only appendUnique', () => {
  assert.throws(
    () => VocabularyJsonImport.parseReferenceImportPayload({
      schemaVersion: 2,
      wordbook: { name: '颜色', cardRefs: ['red'] },
      masterPatch: {}
    }),
    /wordbook.id 为必填字段/
  );
  assert.throws(
    () => VocabularyJsonImport.parseReferenceImportPayload({
      schemaVersion: 2,
      wordbook: { id: 'book-colours', name: '颜色', cardRefs: ['red'] },
      masterPatch: { appendUnique: [{ wordKey: 'red', fields: { meaning: ['x'] } }] }
    }),
    /不支持的字段/
  );
});
