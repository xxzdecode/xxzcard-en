const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'courseware.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const coursewareFiles = fs.readdirSync(path.join(root, 'courseware')).filter(name => name.endsWith('.html'));
coursewareFiles.forEach(name => {
  const page = fs.readFileSync(path.join(root, 'courseware', name), 'utf8');
  const match = page.match(/<script id="practice-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return;
  const config = JSON.parse(match[1]);
  assert.equal(config.round.size, 15, `${name} should present 15 questions per classroom round`);
  assert.match(
    page,
    /首次正确|一次答对|正确 \$\{first\}/,
    `${name} should expose a first-try result for proportional rewards`
  );
  if (config.round.quotas && config.round.shuffle !== false) {
    assert.match(page, /return shuffle\(picked\)\.slice\(0, config\.round\.size\);/,
      `${name} should honor the configured round size after quota selection`);
  }
});

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
  assert.equal(elements.coursewareListTitle.textContent, '今日随堂练习');
  assert.equal(elements.coursewareBookTitle.textContent, '正在读取今日安排');
  assert.match(elements.coursewareList.innerHTML, /练习 A/);
  assert.doesNotMatch(elements.coursewareList.innerHTML, /disabled/);

  await context.openCourseware('practice-a');
  const daily = records.classroom_practice_daily_v1_sister['2026-07-30'];
  assert.equal(daily.practiceId, 'practice-a');
  assert.equal(daily.status, 'started');
  assert.equal(elements.coursewareFrame.src, 'a.html');
  assert.equal(screens.at(-1), 'screenCoursewarePlayer');

  await context.openCoursewareList();
  assert.equal(elements.coursewareBookTitle.textContent, '继续今天的练习');
  assert.match(elements.coursewareList.innerHTML, /继续今日练习/);
  assert.match(elements.coursewareList.innerHTML, /今日已安排其他练习/);

  await context.openCourseware('practice-b');
  assert.match(alerts.at(-1), /一天只能完成一项/);
  assert.equal(elements.coursewareFrame.src, 'a.html');

  const scoredComplete = {
    getElementById: id => {
      if (id === 'completionDialog') {
        return { dataset: { complete: 'true' }, hasAttribute: () => true, textContent: '' };
      }
      if (id === 'completionText') {
        return { textContent: '本轮完成。首次正确 6 / 15，最终正确 15 / 15。' };
      }
      return null;
    },
    querySelector: () => null
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.coursewareCompletionResult(scoredComplete))),
    { correctCount: 6, totalCount: 15, score: 40 }
  );

  const completed = await context.markStudentCoursewareCompleted(scoredComplete);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.correctCount, 6);
  assert.equal(completed.totalCount, 15);
  assert.equal(completed.score, 40);
  assert.equal(records.classroom_practice_daily_v1_sister['2026-07-30'].status, 'completed');
  assert.equal(records.classroom_practice_daily_v1_sister['2026-07-30'].score, 40);

  await context.openCourseware('practice-a');
  assert.match(alerts.at(-1), /今天的随堂练习已经完成/);

  const standardComplete = {
    getElementById: () => ({ dataset: { complete: 'true' }, hasAttribute: () => true }),
    querySelector: () => null
  };
  assert.equal(context.coursewareDocumentIsComplete(standardComplete), true);

  const legacyFirstTry = {
    getElementById: id => {
      if (id === 'completionStats') return { textContent: '一次答对 6 题｜需要回顾 8 题' };
      if (id === 'progressText') return { textContent: '14 / 14' };
      return null;
    },
    querySelector: () => null
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.coursewareCompletionResult(legacyFirstTry))),
    { correctCount: 6, totalCount: 14, score: 43 }
  );

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
