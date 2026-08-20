const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'teacherDashboardSummaries.js'), 'utf8');

function makeElement(textContent = '') {
  const attributes = new Map();
  return {
    textContent,
    dataset: {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    removeAttribute(name) { attributes.delete(name); }
  };
}

function createContext(overrides = {}) {
  const elements = new Map([
    ['teacherLatestPracticeSummary', makeElement()],
    ['teacherLatestPracticeDate', makeElement('—')],
    ['teacherLatestPracticeTitle', makeElement('暂未读取练习目录')],
    ['teacherKnowledgeSummary', makeElement()],
    ['teacherKnowledgeProgressCount', makeElement('— / —')],
    ['teacherKnowledgeLastTopic', makeElement('暂未读取')],
    ['teacherKnowledgeNextTopic', makeElement('暂未读取')],
    ['teacherActivityPanel', makeElement('金币与次数调整')],
    ['teacherLatestAssessmentEntry', makeElement('错题整理')]
  ]);
  const warnings = [];
  const context = vm.createContext({
    console: { warn: (...args) => warnings.push(args.join(' ')) },
    Date,
    Map,
    Number,
    Object,
    Promise,
    String,
    document: { getElementById: id => elements.get(id) || null },
    isTeacher: () => true,
    loadIndependentFeatureScript: async () => {},
    fetch: async () => ({ ok: true, json: async () => [] }),
    ...overrides
  });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(source, context, { filename: 'teacherDashboardSummaries.js' });
  return { context, elements, warnings };
}

(async () => {
  const { context } = createContext();
  const api = context.TeacherDashboardSummaries;
  assert.ok(api);

  const latest = api.latestPractice([
    { id: 'courseware-2026-08-01', title: '26.08.01｜较早练习' },
    { id: 'courseware-2026-08-04', title: '26.08.04｜时间介词 in / on / at 随堂练习' },
    { id: 'courseware-2026-02-31', title: '无效日期练习' }
  ]);
  assert.deepEqual(
    { title: latest.title, date: latest.date },
    { title: '时间介词 in / on / at 随堂练习', date: '2026年8月4日' }
  );

  const topics = [
    { topicKey: 'done-old', titleZh: '较早知识点', sequenceOrder: 1 },
    { topicKey: 'done-new', titleZh: '最近知识点', sequenceOrder: 2 },
    { topicKey: 'ready-first', titleZh: '下一知识点', sequenceOrder: 3 },
    { topicKey: 'ready-later', titleZh: '稍后知识点', sequenceOrder: 4 }
  ];
  const store = {
    topics: {
      'done-old': { status: 'confirmed_complete', last_lesson_date: '2026-07-20' },
      'done-new': { status: 'confirmed_complete', last_lesson_date: '2026-07-31' },
      'ready-later': { status: 'materials_ready', last_lesson_date: '2026-08-04' },
      'ready-first': { status: 'materials_ready', last_lesson_date: '2026-08-01' }
    }
  };
  const knowledge = api.buildKnowledgeSummary(topics, store, []);
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

  const failed = createContext({
    loadIndependentFeatureScript: async () => { throw new Error('practice unavailable'); },
    fetch: async () => { throw new Error('knowledge unavailable'); }
  });
  await failed.context.TeacherDashboardSummaries.refresh();
  assert.equal(failed.elements.get('teacherLatestPracticeSummary').dataset.state, 'unavailable');
  assert.equal(failed.elements.get('teacherKnowledgeSummary').dataset.state, 'unavailable');
  assert.equal(failed.elements.get('teacherActivityPanel').textContent, '金币与次数调整');
  assert.equal(failed.elements.get('teacherLatestAssessmentEntry').textContent, '错题整理');
  assert.equal(failed.warnings.length, 2);

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const lazy = fs.readFileSync(path.join(root, 'js', 'lazyFeatures.js'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'js', 'home.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

  assert.match(html, /id="teacherLatestPracticeTitle"/);
  assert.match(html, /id="teacherKnowledgeProgressCount"/);
  assert.match(html, /id="teacherKnowledgeLastTopic"/);
  assert.match(html, /id="teacherKnowledgeNextTopic"/);
  assert.match(styles, /\.teacher-dashboard-card__insight\s*\{/);
  assert.match(lazy, /function loadIndependentFeatureScript\(src\)[\s\S]*script\.async = true/);
  assert.match(lazy, /loadIndependentFeatureScript\('js\/teacherDashboardSummaries\.js'\)/);
  assert.match(home, /window\.refreshTeacherDashboardSummaries\?\.\(\)/);
  assert.match(main, /root\.refreshTeacherDashboardSummaries\?\.\(\)/);
  assert.doesNotMatch(serviceWorker, /'\.\/js\/teacherDashboardSummaries\.js'/);
  assert.doesNotMatch(serviceWorker, /'\.\/js\/courseware-data\.js'/);
  assert.doesNotMatch(serviceWorker, /'\.\/grammar-library\/data\/topics\.json'/);
  assert.doesNotMatch(serviceWorker, /'\.\/grammar-library\/data\/initial-progress\.json'/);

  console.log('teacher dashboard summary tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
