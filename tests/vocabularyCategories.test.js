const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/vocabularyCategories.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'js/vocabularyLessonCategories.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-vocabulary-lesson-categories.css'), 'utf8');
const lazyFeatures = fs.readFileSync(path.join(root, 'js/lazyFeatures.js'), 'utf8');

assert.equal(registry.schemaVersion, 1);
assert.ok(Array.isArray(registry.groups) && registry.groups.length >= 2);

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

const orangeCategories = categories.filter(category => category.words.some(word => String(word).toLowerCase() === 'orange'));
assert.ok(orangeCategories.length >= 2, 'one official card may appear in multiple categories');

assert.match(script, /data\/vocabularyCategories\.json/);
assert.match(script, /normalizeCategoryWord/);
assert.match(script, /availableCategoryGroups/);
assert.match(script, /其他未分类/);
assert.match(script, /appData\.batches\.push\(virtualBatch\)/);
assert.match(script, /appData\.batches\.splice\(index, 1\)/);
assert.doesNotMatch(script, /card\.(category|categories|topic)\s*=/, 'word-card JSON fields must remain untouched');
assert.match(script, /originalSelectVocabularyLessonBook\(virtualBatch\.id\)/);
assert.match(script, /同一个词可以出现在多个类别中/);

const taskIndex = lazyFeatures.indexOf("'js/vocabularyLesson016.js'");
const categoryIndex = lazyFeatures.indexOf("'js/vocabularyLessonCategories.js'");
assert.ok(taskIndex >= 0 && categoryIndex > taskIndex, 'category enhancement must load after task 016');

assert.match(styles, /grid-template-columns:\s*repeat\(3,/);
assert.match(styles, /orientation:\s*landscape/);
assert.match(styles, /min-height:\s*64px/);

console.log('vocabulary category index tests passed');