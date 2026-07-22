const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const warnings = [];
const context = vm.createContext({
  console: { warn: (...args) => warnings.push(args), log() {}, error() {} },
  currentUser: 'sister',
  appData: { batches: [] },
  document: { getElementById: () => null }
});
vm.runInContext(fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8'), context);

const purposeOf = batch => vm.runInContext(`getBookPurpose(${JSON.stringify(batch)})`, context);
assert.equal(purposeOf({ id: 'legacy', name: '普通旧词本' }), 'common');
assert.equal(purposeOf({ id: 'summer', name: '暑假辅助词' }), 'support');
assert.equal(purposeOf({ id: 'support', name: '任意', bookPurpose: 'support' }), 'support');
assert.equal(purposeOf({ id: 'common', name: '暑假', bookPurpose: 'common' }), 'common');
assert.equal(purposeOf({ id: 'invalid', name: '暑假', bookPurpose: 'other' }), 'common');
assert.equal(warnings.length, 1, 'invalid purposes should be diagnosable without crashing');

context.appData.batches = [
  { id: 'sister-support', name: '暑假词', sharedWith: ['sister'] },
  { id: 'both-support', name: '辅助', bookPurpose: 'support', sharedWith: ['sister', 'brother'] },
  { id: 'brother-common', name: '常用', bookPurpose: 'common', sharedWith: ['brother'] },
  { id: 'sister-common', name: '常用', bookPurpose: 'common', sharedWith: ['sister'] }
];

const visibleIds = vm.runInContext(
  'filterBatchesByBookPurpose(visibleBatches(), true, false).map(batch => batch.id)',
  context
);
assert.deepEqual(Array.from(visibleIds), ['sister-common']);

const supportIds = vm.runInContext(
  'filterBatchesByBookPurpose(visibleBatches(), false, true).map(batch => batch.id)',
  context
);
assert.deepEqual(Array.from(supportIds), ['sister-support', 'both-support']);

context.currentUser = 'brother';
const brotherIds = vm.runInContext(
  'filterBatchesByBookPurpose(visibleBatches(), true, true).map(batch => batch.id)',
  context
);
assert.deepEqual(Array.from(brotherIds), ['both-support', 'brother-common']);
assert.equal(vm.runInContext('filterBatchesByBookPurpose(visibleBatches(), false, false).length', context), 0);

const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(indexSource, /studentCommonBookFilter[^>]*checked/);
assert.match(indexSource, /studentSupportBookFilter/);
assert.match(indexSource, /teacherCommonBookFilter[^>]*checked/);
assert.match(indexSource, /teacherSupportBookFilter/);

const repositorySource = fs.readFileSync(path.join(root, 'js/repository.js'), 'utf8');
assert.match(repositorySource, /bookPurpose:\s*bookPurpose === 'support' \? 'support' : 'common'/);

console.log('book purpose tests passed');
