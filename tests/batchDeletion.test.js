const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
let refreshed = 0;
const remoteData = {
  batches: [
    { id: 'keep', name: '保留' },
    { id: 'screening-common-words-1-sister', name: '07.20｜常用词1' }
  ]
};

const context = vm.createContext({
  console,
  confirm: () => true,
  canWriteCloudData: () => true,
  isTeacher: () => true,
  refreshTeacherWordCards: () => { refreshed += 1; },
  loadHome() {},
  updateMainDataSafely: async mutator => {
    const next = JSON.parse(JSON.stringify(remoteData));
    return mutator(next) === false ? next : next;
  }
});
vm.runInContext(fs.readFileSync(path.join(root, 'js/home.js'), 'utf8'), context);

context.isTeacher = () => true;
context.refreshTeacherWordCards = () => { refreshed += 1; };
context.updateMainDataSafely = async mutator => {
  const next = JSON.parse(JSON.stringify(remoteData));
  assert.equal(mutator(next), true);
  assert.deepEqual(next.batches.map(batch => batch.id), ['keep']);
  return next;
};

vm.runInContext("deleteBatch('screening-common-words-1-sister')", context);
setImmediate(() => {
  assert.equal(refreshed, 1);
  console.log('batch deletion tests passed');
});
