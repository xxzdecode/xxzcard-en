const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'studentActivityControls.js'), 'utf8');
const elements = new Map();
const document = {
  head: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
  createElement(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      style: {},
      dataset: {},
      hidden: false,
      appendChild() {},
      addEventListener() {},
      setAttribute() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      insertAdjacentElement() {},
      remove() {}
    };
  },
  getElementById(id) { return elements.get(id) || null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {}
};
const listeners = new Map();
const adventureLoadOptions = [];
const context = vm.createContext({
  console,
  document,
  currentUser: 'sister',
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  addEventListener(name, handler) { listeners.set(name, handler); },
  isTeacher: () => false,
  loadHome: async () => 'home-loaded',
  loadFeatureGroup: async group => group,
  loadVocabularyAdventureState: async (_user, options) => {
    adventureLoadOptions.push(options || null);
    return { version: 1, words: {}, session: null };
  },
  saveCurrentVocabularyAdventureState: async () => true,
  getVocabularyAdventureLegacyChallengeUsage: async () => ({ attempts: 0, bestScore: 0 }),
  sbGet: async () => null,
  sbSet: async () => true,
  alert() {},
  prompt() { return null; },
  Date,
  Math,
  JSON,
  Object,
  Array,
  Number,
  String,
  Promise,
  Map,
  Set
});
context.globalThis = context;
context.window = context;
vm.runInContext(source, context, { filename: 'studentActivityControls.js' });

assert.ok(context.StudentActivityControls);
assert.equal(typeof context.getStudentActivityAttemptTotal, 'function');
assert.equal(typeof context.openStudentGrammarChallenge, 'function');
assert.equal(typeof context.openStudentClassroomPractice, 'function');
assert.ok(elements.has('studentActivityControlStyles'));

Promise.all([
  context.loadHome(),
  context.loadVocabularyAdventureState('sister', { requireRemote: true })
]).then(([result]) => {
  assert.equal(result, 'home-loaded');
  assert.equal(adventureLoadOptions.some(options => options && options.requireRemote === true), true);
  console.log('student activity controls browser smoke test passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
