const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'courseware.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const items = [
  { id: 'practice-a', title: '练习 A', description: '第一项', icon: 'book', tone: 'purple', path: 'a.html' },
  { id: 'practice-b', title: '练习 B', description: '第二项', icon: 'screen', tone: 'blue', path: 'b.html' }
];
const records = {};
const alerts = [];
const screens = [];

function fakeClassList() {
  const values = new Set();
  return {
    add: value => values.add(value),
    remove: value => values.delete(value),
    contains: value => values.has(value)
  };
}

const elements = {
  coursewareList: { innerHTML: '' },
  coursewareListTitle: { textContent: '' },
  coursewareBookTitle: { textContent: '' },
  coursewareTitle: { textContent: '' },
  coursewareFrame: { src: '', onload: null, contentDocument: null }
};

const context = {
  console,
  window: { CLASSROOM_PRACTICE_ITEMS: items },
  currentUser: 'sister',
  document: {
    body: { classList: fakeClassList() },
    getElementById: id => elements[id] || null
  },
  isTeacher: () => context.currentUser === 'teacher',
  todayISO: () => '2026-07-30',
  sbGet: async key => records[key] ? JSON.parse(JSON.stringify(records[key])) : null,
  sbSet: async (key, value) => { records[key] = JSON.parse(JSON.stringify(value)); },
  canWriteCloudData: () => true,
  showStorageError: error => { throw error; },
  showScreen: id => screens.push(id),
  loadHome: async () => {},
  alert: message => alerts.push(message),
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  Date
};

vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  await context.openCoursewareList();
  assert.equal(elements.coursewareListTitle.textContent, '选择随堂练习');
  assert.equal(elements.coursewareBookTitle.textContent, '任选 1 项 · 每天只能完成一次');
  assert.match(elements.coursewareList.innerHTML, /练习 A/);
  assert.doesNotMatch(elements.coursewareList.innerHTML, /disabled/);

  await context.openCourseware('practice-a');
  const daily = records.classroom_practice_daily_v1_sister['2026-07-30'];
  assert.equal(daily.practiceId, 'practice-a');
  assert.equal(daily.status, 'started');
  assert.equal(elements.coursewareFrame.src, 'a.html');
  assert.equal(screens.at(-1), 'screenCoursewarePlayer');

  await context.openCoursewareList();
  assert.match(elements.coursewareList.innerHTML, /继续今日练习/);
  assert.match(elements.coursewareList.innerHTML, /今日已选择其他练习/);

  await context.openCourseware('practice-b');
  assert.match(alerts.at(-1), /一天只能选择一项/);
  assert.equal(elements.coursewareFrame.src, 'a.html');

  await context.markStudentCoursewareCompleted();
  assert.equal(records.classroom_practice_daily_v1_sister['2026-07-30'].status, 'completed');

  await context.openCourseware('practice-a');
  assert.match(alerts.at(-1), /今天的随堂练习已经完成/);

  const standardComplete = {
    getElementById: () => ({ dataset: { complete: 'true' }, hasAttribute: () => true }),
    querySelector: () => null
  };
  assert.equal(context.coursewareDocumentIsComplete(standardComplete), true);

  context.currentUser = 'teacher';
  const writesBeforeTeacher = JSON.stringify(records);
  await context.openCourseware('practice-b');
  assert.equal(elements.coursewareFrame.src, 'b.html');
  assert.equal(JSON.stringify(records), writesBeforeTeacher);

  assert.match(html, /onclick="closeCoursewareList\(\)"/);
  assert.match(source, /classroom_practice_daily_v1_/);
  assert.match(source, /record\.status === 'completed'/);
  assert.match(source, /MutationObserver/);

  console.log('student classroom practice tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
