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

const teacherElements = new Map();
function createTeacherElement(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    style: {},
    dataset: {},
    hidden: false,
    appendChild(node) { if (node.id) teacherElements.set(node.id, node); },
    addEventListener() {},
    setAttribute() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    insertAdjacentElement(_position, node) { if (node.id) teacherElements.set(node.id, node); },
    remove() { if (this.id) teacherElements.delete(this.id); }
  };
}
const teacherNav = createTeacherElement('nav');
const teacherGrid = createTeacherElement('div');
teacherGrid.id = 'teacherDashboardGrid';
teacherElements.set(teacherGrid.id, teacherGrid);
const teacherDocument = {
  head: { appendChild(node) { if (node.id) teacherElements.set(node.id, node); } },
  createElement: createTeacherElement,
  getElementById(id) { return teacherElements.get(id) || null; },
  querySelector(selector) { return selector === '.teacher-home-nav' ? teacherNav : null; },
  querySelectorAll() { return []; },
  addEventListener() {}
};
const teacherContext = vm.createContext({
  console,
  document: teacherDocument,
  currentUser: 'teacher',
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  addEventListener() {},
  isTeacher: () => true,
  loadHome: async () => 'teacher-home-loaded',
  loadFeatureGroup: async group => group,
  sbGet: async () => null,
  sbSet: async () => true,
  alert() {},
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
teacherContext.globalThis = teacherContext;
teacherContext.window = teacherContext;
vm.runInContext(source, teacherContext, { filename: 'studentActivityControls.teacher-race.js' });
const initialTeacherPanel = teacherElements.get('teacherActivityPanel');
assert.ok(initialTeacherPanel, 'late-loaded controls must install the teacher panel immediately');

Promise.all([
  context.loadHome(),
  teacherContext.loadHome(),
  context.loadVocabularyAdventureState('sister', { requireRemote: true })
]).then(([result, teacherResult]) => {
  assert.equal(result, 'home-loaded');
  assert.equal(teacherResult, 'teacher-home-loaded');
  assert.equal(
    teacherElements.get('teacherActivityPanel'),
    initialTeacherPanel,
    'subsequent home loads must reuse the existing teacher panel'
  );
  assert.equal(adventureLoadOptions.some(options => options && options.requireRemote === true), true);
  console.log('student activity controls browser smoke test passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
