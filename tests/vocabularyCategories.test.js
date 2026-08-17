const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const referenceImport = require('../js/referenceWordbookImport.js');

const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/vocabularyCategories.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'js/vocabularyLessonCategories.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-vocabulary-lesson-categories.css'), 'utf8');
const lazyFeatures = fs.readFileSync(path.join(root, 'js/lazyFeatures.js'), 'utf8');
const reviewData = fs.readFileSync(path.join(root, 'js/vocabularyReviewData.js'), 'utf8');
const lowPressure = fs.readFileSync(path.join(root, 'js/vocabularyLessonLowPressureGroups.js'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'js/repository.js'), 'utf8');
const task016 = fs.readFileSync(path.join(root, 'js/vocabularyLesson016.js'), 'utf8');
const groupStyles = fs.readFileSync(path.join(root, 'styles-vocabulary-lesson-groups.css'), 'utf8');
const review = fs.readFileSync(path.join(root, 'js/vocabularyReview.js'), 'utf8');

assert.equal(registry.schemaVersion, 1);
assert.ok(Array.isArray(registry.groups) && registry.groups.length >= 2);
assert.match(registry.source, /完整词条版/);

const categories = registry.groups.flatMap(group => group.categories || []);
assert.ok(categories.length >= 25);
assert.equal(new Set(categories.map(category => category.id)).size, categories.length, 'category ids must be unique');

categories.forEach(category => {
  assert.ok(category.name);
  assert.ok(Array.isArray(category.words) && category.words.length > 0);
  assert.ok(category.words.length <= 40, `${category.id} should remain within four ten-word teaching batches`);
  const normalized = category.words.map(word => String(word).toLowerCase().replace(/[^a-z0-9]+/g, ''));
  assert.equal(new Set(normalized).size, normalized.length, `${category.id} contains duplicate match keys`);
});

const allWords = categories.flatMap(category => category.words);
const normalizedAllWords = new Set(allWords.map(word => String(word).toLowerCase().replace(/[^a-z0-9]+/g, '')));
assert.equal(allWords.length, 630, 'the uploaded 33-page source should be fully represented');
assert.equal(normalizedAllWords.size, 624, 'cross-category repeats should remain intentional');
[
  'pencil-case',
  'TV reporter',
  'sweet potato',
  'science museum',
  'have a stomachache',
  'do morning exercises',
  'put away the clothes',
  'how large'
].forEach(word => assert.ok(allWords.includes(word), `missing source entry: ${word}`));

const orangeCategories = categories.filter(category => category.words.some(word => String(word).toLowerCase() === 'orange'));
assert.ok(orangeCategories.length >= 2, 'one official card may appear in multiple categories');

assert.match(script, /data\/vocabularyCategories\.json/);
assert.match(script, /normalizeCategoryWord/);
assert.match(script, /normalizeCategoryAssignment/);
assert.match(script, /effectiveCategoryRegistry/);
assert.match(script, /categoryAssignments/);
assert.match(script, /availableCategoryGroups/);
assert.match(script, /其他未分类/);
assert.doesNotMatch(script, /appData\.batches\.(?:push|splice)\(/);
assert.doesNotMatch(lowPressure, /appData\.batches\.(?:push|splice)\(/);
assert.doesNotMatch(script, /createdAt:\s*['"]9999-12-31['"]/);
assert.match(script, /vocabularyLessonTransient:\s*true/);
assert.match(script, /selectVocabularyLessonVirtualBatch\(virtualBatch/);
assert.match(repository, /stripVocabularyLessonTransientData/);
assert.match(repository, /const storedValue = key === 'main' \? cloneMainForStorage\(value\) : value/);
assert.doesNotMatch(script, /card\.(category|categories|topic)\s*=/, 'word-card JSON fields must remain untouched');
assert.match(script, /同一个词可以出现在多个类别中/);
assert.match(script, /renderVocabularyLessonBookSelection = renderBookSelectionWithCategoryEntry/);
assert.match(script, /id = 'vocabularyLessonCategoryEntry'/);
assert.match(script, /次级入口/);
assert.match(review, /selectionRoute:\s*'books'/);
assert.match(review, /renderCurrentVocabularyLessonSelectionRoute/);
assert.match(review, /refreshVocabularyLessonSelectionRoute/);
assert.doesNotMatch(review, /list && list\.classList\.contains\('active'\)\) renderVocabularyLessonBookSelection\(\)/);
assert.match(lowPressure, /renderVocabularyLessonCategoryGroups = renderCategoryGroups/);
assert.match(task016, /vocabulary-lesson-book-title/);
assert.match(groupStyles, /\.vocabulary-lesson-book-title::before/);
assert.match(groupStyles, /background:\s*#fff1a0/);
assert.match(groupStyles, /color:\s*#2a7197/);

const taskIndex = lazyFeatures.indexOf("'js/vocabularyLesson016.js'");
const categoryIndex = lazyFeatures.indexOf("'js/vocabularyLessonCategories.js'");
assert.ok(taskIndex >= 0 && categoryIndex > taskIndex, 'category enhancement must load after task 016');
assert.equal((lazyFeatures.match(/'js\/vocabularyLesson016\.js'/g) || []).length, 1);
assert.doesNotMatch(reviewData, /vocabularyLesson016\.js/, 'task 016 must only load through the lazy feature group');

assert.match(styles, /grid-template-columns:\s*repeat\(3,/);
assert.match(styles, /orientation:\s*landscape/);
assert.match(styles, /min-height:\s*64px/);

function card(word, meaning) {
  return {
    word,
    meaning,
    pos: 'n.',
    phonetic: `/${word}/`,
    emoji: '📘',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: ''
  };
}

const importData = {
  schemaVersion: 2,
  masterCards: {
    season: card('season', '季节'),
    truck: card('truck', '卡车')
  },
  batches: []
};
const packageWithCategories = {
  schemaVersion: 2,
  wordbook: {
    id: 'precision-reading-test',
    name: '精读测试',
    bookPurpose: 'support',
    cardRefs: [{ wordKey: 'season' }, { wordKey: 'truck' }],
    categoryAssignments: [
      {
        categoryId: 'weather-seasons',
        categoryName: '气象与季节',
        groupId: 'themes',
        groupName: '主题词汇',
        icon: '🌦️',
        words: ['Season', 'season']
      },
      {
        categoryId: 'vehicles',
        categoryName: '交通工具',
        groupId: 'themes',
        groupName: '主题词汇',
        icon: '🚌',
        words: ['truck']
      }
    ]
  },
  masterPatch: { create: [], setIfEmpty: [], appendUnique: [] }
};

const normalizedPackage = referenceImport.normalizePackage(packageWithCategories);
assert.equal(normalizedPackage.wordbook.categoryAssignments.length, 2);
assert.deepEqual(normalizedPackage.wordbook.categoryAssignments[0].words, ['season']);
const audit = referenceImport.auditReferenceImport(importData, packageWithCategories);
assert.deepEqual(audit.errors, []);
referenceImport.applyReferenceImport(importData, audit);
assert.equal(importData.batches[0].categoryAssignments.length, 2);
assert.deepEqual(importData.batches[0].categoryAssignments[1].words, ['truck']);

const packageWithoutCategories = {
  schemaVersion: 2,
  wordbook: {
    id: 'precision-reading-test',
    name: '精读测试更新',
    bookPurpose: 'support',
    cardRefs: [{ wordKey: 'season' }, { wordKey: 'truck' }]
  },
  masterPatch: { create: [], setIfEmpty: [], appendUnique: [] }
};
referenceImport.applyReferenceImport(
  importData,
  referenceImport.auditReferenceImport(importData, packageWithoutCategories)
);
assert.equal(importData.batches[0].categoryAssignments.length, 2, 'omitted assignments must preserve existing categories');

const clearCategoriesPackage = {
  ...packageWithoutCategories,
  wordbook: { ...packageWithoutCategories.wordbook, categoryAssignments: [] }
};
referenceImport.applyReferenceImport(
  importData,
  referenceImport.auditReferenceImport(importData, clearCategoriesPackage)
);
assert.deepEqual(importData.batches[0].categoryAssignments, [], 'an explicit empty list must clear assignments');

const builtPackage = referenceImport.buildPackageFromCards(importData, [card('season', '季节')], {
  id: 'built-with-categories',
  name: '自动分类导入包',
  bookPurpose: 'support',
  categoryAssignments: packageWithCategories.wordbook.categoryAssignments.slice(0, 1)
});
assert.equal(builtPackage.wordbook.categoryAssignments.length, 1);
assert.deepEqual(builtPackage.wordbook.categoryAssignments[0].words, ['season']);

console.log('vocabulary category index tests passed');
