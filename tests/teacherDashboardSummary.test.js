const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, Date, Map, Number, Object, Promise, Set, String });
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'home.js'), 'utf8'), context);

const coursewareContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'courseware-data.js'), 'utf8'), coursewareContext);
context.__courseware = coursewareContext.window.CLASSROOM_PRACTICE_ITEMS;

const latest = vm.runInContext('latestTeacherPractice(__courseware)', context);
assert.deepEqual(
  { title: latest.title, date: latest.date },
  { title: '时间介词 in / on / at 随堂练习', date: '2026年8月4日' }
);

context.__topics = [
  { topicKey: 'done-old', titleZh: '较早知识点', sequenceOrder: 1 },
  { topicKey: 'done-new', titleZh: '最近知识点', sequenceOrder: 2 },
  { topicKey: 'ready-first', titleZh: '下一知识点', sequenceOrder: 3 },
  { topicKey: 'ready-later', titleZh: '稍后知识点', sequenceOrder: 4 }
];
context.__store = {
  topics: {
    'done-old': { title: '较早知识点', status: 'confirmed_complete', last_lesson_date: '2026-07-20' },
    'done-new': { title: '最近知识点', status: 'confirmed_complete', last_lesson_date: '2026-07-31' },
    'ready-later': { title: '稍后知识点', status: 'materials_ready', last_lesson_date: '2026-08-04' },
    'ready-first': { title: '下一知识点', status: 'materials_ready', last_lesson_date: '2026-08-01' }
  }
};
context.__initial = [];

const knowledge = vm.runInContext(
  'buildTeacherKnowledgeSummary(__topics, __store, __initial)',
  context
);
assert.deepEqual(
  {
    completed: knowledge.completed,
    total: knowledge.total,
    lastTitle: knowledge.lastTitle,
    nextTitle: knowledge.nextTitle,
    source: knowledge.source
  },
  {
    completed: 2,
    total: 4,
    lastTitle: '最近知识点',
    nextTitle: '下一知识点',
    source: 'remote'
  }
);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.match(html, /id="teacherLatestPracticeTitle"/);
assert.match(html, /id="teacherKnowledgeProgressCount"/);
assert.match(html, /id="teacherKnowledgeLastTopic"/);
assert.match(html, /id="teacherKnowledgeNextTopic"/);
assert.match(styles, /\.teacher-dashboard-card__insight\s*\{/);
assert.match(styles, /\.teacher-dashboard-entry-card\s*\{[^}]*min-height:\s*286px/s);

console.log('teacher dashboard summary tests passed');
