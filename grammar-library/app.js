const SUPABASE_URL = 'https://pnwxpuwsoprfehdvnlik.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud3hwdXdzb3ByZmVoZHZubGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTE5MjIsImV4cCI6MjA5NjgyNzkyMn0.aDdixCpy7l4NR3zK-WyOCvBmFLmZ7pbP8Pg4w8WYClg';
const TEMP_MARKS_STORAGE_KEY = 'grammar_library_temp_marks_v1';
const LEGACY_PROGRESS_KEYS = ['grammarProgress', 'grammar-progress', 'grammar_checked', 'englishGrammarProgress', 'eng_grammar_progress'];

const STATUS_META = {
  not_started: { label: '未开始', className: 'not_started' },
  materials_ready: { label: '已备课待教授', className: 'materials_ready' },
  to_teach: { label: '待补讲', className: 'to_teach' },
  needs_review: { label: '需复习确认', className: 'needs_review' },
  confirmed_complete: { label: '已教授', className: 'confirmed_complete' }
};

const LEVEL_LABELS = {
  core: '核心主线',
  extension: '扩充表达',
  advanced: '进阶储备',
  reference: '基础参考'
};

const MODULES = {
  A: { title: 'A 已完成基础区', short: '基础' },
  B: { title: 'B 当前优先补强区', short: '当前补强' },
  C: { title: 'C 扩充句子区', short: '扩充句子' },
  D: { title: 'D 时间轴区', short: '时间轴' },
  E: { title: 'E 句法与表达区', short: '句法表达' },
  F: { title: 'F 进阶储备区', short: '进阶储备' },
  R: { title: '基础参考', short: '参考' }
};

const TOPIC_KEY_ALIASES = {
  'possessive-pronouns': 'possessive-pronouns-basic',
  whose: 'whose-questions'
};

const TOPIC_PATCHES = {
  'of-part-whole': {
    topicKey: 'of-part-whole',
    titleZh: 'of 部分与整体结构',
    titleEn: 'part-whole expressions with of',
    moduleKey: 'B',
    sequenceOrder: 211.5,
    parentTopicKey: 'possession-choice',
    category: 'syntax',
    level: 'core',
    isAssessableNow: false,
    tags: ['of', '部分与整体', '所属关系'],
    summary: '用“部分 + of + 整体”表达整体中的某一部分，不把它和名词所有格混为一谈。',
    rules: ['部分名词放在 of 前', '整体名词或代词放在 of 后', '结构重点是部分与整体关系'],
    examples: ['the door of the car', 'the top of the box'],
    pitfalls: ['不是所有 of 结构都能直接改成 ’s 所有格']
  },
  'whose-questions': {
    topicKey: 'whose-questions',
    titleZh: 'Whose 基础问答',
    titleEn: 'basic whose questions',
    moduleKey: 'B',
    sequenceOrder: 213,
    parentTopicKey: 'possession-choice',
    category: 'syntax',
    level: 'core',
    isAssessableNow: false,
    tags: ['whose', '所有关系', '名词所有格'],
    summary: '用 Whose + 名词询问物品属于谁，并用名词所有格或物主代词回答。',
    rules: ['Whose + 名词 + be + ...?', '回答可以使用名词所有格', 'who 问人，whose 问谁的'],
    examples: ["Whose book is this? It is Amy's.", 'Whose pencils are these? They are mine.'],
    pitfalls: ['不要用 Who book is this?']
  },
  'subject-object-pronouns': {
    topicKey: 'subject-object-pronouns',
    titleZh: '人称代词主格与宾格',
    titleEn: 'subject and object pronouns',
    moduleKey: 'B',
    sequenceOrder: 214,
    parentTopicKey: 'pronoun-system',
    category: 'morphology',
    level: 'core',
    isAssessableNow: false,
    tags: ['主格', '宾格', '人称代词'],
    summary: '主格放在主语位置，宾格放在动词或介词后承接动作。',
    rules: ['I/he/she/we/they 常作主语', 'me/him/her/us/them 常作宾语', '介词后通常使用宾格'],
    examples: ['She helps me.', 'They play with us.'],
    pitfalls: ['不能说 Me like apples.']
  },
  'possessive-pronouns-basic': {
    topicKey: 'possessive-pronouns-basic',
    titleZh: '形容词性与名词性物主代词',
    titleEn: 'possessive determiners and pronouns',
    moduleKey: 'B',
    sequenceOrder: 215,
    parentTopicKey: 'possession-choice',
    category: 'morphology',
    level: 'core',
    isAssessableNow: false,
    tags: ['物主代词', 'my', 'mine'],
    summary: '形容词性物主代词后接名词，名词性物主代词可以单独使用。',
    rules: ['my/your/his/her/its/our/their + 名词', 'mine/yours/his/hers/ours/theirs 单独使用'],
    examples: ['This is my bag.', 'The bag is mine.'],
    pitfalls: ['不能说 mine bag']
  }
};

const SEQUENCE_OVERRIDES = {
  which: 216,
  'how-many-much': 217,
  quantifiers: 218,
  'prices-measures': 219,
  'why-because-so': 220,
  although: 221
};

const state = {
  topics: [],
  coverage: [],
  initialProgress: [],
  progress: new Map(),
  localMarks: readLocalMarks(),
  selectedModule: 'all',
  databaseReady: false,
  formalSource: 'initial'
};

function apiHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`无法读取 ${path}`);
  return response.json();
}

function readLocalMarks() {
  try {
    const value = JSON.parse(localStorage.getItem(TEMP_MARKS_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch (_) {
    return new Set();
  }
}

function saveLocalMarks() {
  localStorage.setItem(TEMP_MARKS_STORAGE_KEY, JSON.stringify([...state.localMarks]));
}

function canonicalTopicKey(topicKey) {
  return TOPIC_KEY_ALIASES[topicKey] || topicKey;
}

function normalizeTopicCatalog() {
  const normalized = [];
  const seen = new Set();

  state.topics.forEach(topic => {
    const originalKey = topic.topicKey;
    const topicKey = canonicalTopicKey(originalKey);
    const patch = TOPIC_PATCHES[topicKey] || {};
    const next = {
      ...topic,
      topicKey,
      sequenceOrder: SEQUENCE_OVERRIDES[originalKey] || topic.sequenceOrder,
      ...patch
    };
    if (!seen.has(topicKey)) {
      normalized.push(next);
      seen.add(topicKey);
    }
  });

  Object.values(TOPIC_PATCHES).forEach(topic => {
    if (!seen.has(topic.topicKey)) {
      normalized.push({ ...topic });
      seen.add(topic.topicKey);
    }
  });

  state.topics = normalized.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

function makeInitialProgressMap() {
  return new Map(state.initialProgress.map(item => [canonicalTopicKey(item.topicKey), {
    topic_key: canonicalTopicKey(item.topicKey),
    status: item.status,
    note: item.note || '',
    updated_at: '',
    source: 'initial'
  }]));
}

async function readRemoteProgressStore() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/kv_store?key=eq.grammar_progress&select=value`,
    { headers: apiHeaders(), cache: 'no-store' }
  );
  if (!response.ok) throw new Error(`无法读取 Supabase 进度（HTTP ${response.status}）`);
  const rows = await response.json();
  return rows.length && rows[0].value && typeof rows[0].value === 'object'
    ? rows[0].value
    : { schemaVersion: 1, scopeKey: 'shared', topics: {}, events: [] };
}

function ensureRemoteTopic(topicKey, row) {
  if (state.topics.some(topic => topic.topicKey === topicKey)) return;
  state.topics.push({
    topicKey,
    titleZh: row.title || topicKey,
    titleEn: topicKey,
    moduleKey: row.module || 'R',
    sequenceOrder: Number(row.sequence) || 9999,
    parentTopicKey: 'supabase-progress',
    category: 'reference',
    level: 'core',
    isAssessableNow: false,
    tags: ['Supabase 正式记录'],
    summary: row.note || '该知识点来自 Supabase 正式教学进度，网页目录尚未提供详细说明。',
    rules: [],
    examples: [],
    pitfalls: []
  });
}

async function loadRemoteProgress() {
  const store = await readRemoteProgressStore();
  const remoteProgress = new Map();

  Object.entries(store.topics || {}).forEach(([rawKey, row]) => {
    const topicKey = canonicalTopicKey(rawKey);
    ensureRemoteTopic(topicKey, row || {});
    remoteProgress.set(topicKey, {
      ...(row || {}),
      topic_key: topicKey,
      source: 'supabase'
    });
  });

  state.topics.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  state.progress = remoteProgress;
  state.databaseReady = true;
  state.formalSource = 'supabase';
}

function statusFor(topicKey) {
  return (state.progress.get(topicKey) || {}).status || 'not_started';
}

function statusMeta(status) {
  return STATUS_META[status] || {
    label: `其他状态：${status}`,
    className: 'unknown'
  };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showBanner(message, kind = '') {
  const banner = document.getElementById('syncBanner');
  banner.textContent = message;
  banner.className = `sync-banner ${kind}`.trim();
  banner.hidden = !message;
}

function coverageFor(topicKey) {
  return state.coverage.filter(item => {
    const mapped = canonicalTopicKey(item.topicKey);
    if (mapped === topicKey) return true;
    return topicKey === 'subject-object-pronouns'
      && item.topicKey === 'pronoun-system'
      && /主格|宾格|人称代词/.test(item.sourceTitle || '');
  });
}

function searchableText(topic) {
  return [
    topic.topicKey,
    topic.titleZh,
    topic.titleEn,
    topic.summary,
    topic.category,
    ...(topic.tags || []),
    ...(topic.rules || []),
    ...(topic.examples || []),
    ...coverageFor(topic.topicKey).map(item => `${item.sourceItemKey} ${item.sourceTitle}`)
  ].join(' ').toLowerCase();
}

function getFilters() {
  return {
    search: document.getElementById('searchInput').value.trim().toLowerCase(),
    category: document.getElementById('categoryFilter').value,
    status: document.getElementById('statusFilter').value,
    level: document.getElementById('levelFilter').value
  };
}

function visibleTopics() {
  const filters = getFilters();
  return state.topics.filter(topic => {
    if (state.selectedModule !== 'all' && topic.moduleKey !== state.selectedModule) return false;
    if (filters.search && !searchableText(topic).includes(filters.search)) return false;
    if (filters.category !== 'all' && topic.category !== filters.category) return false;
    if (filters.status !== 'all' && statusFor(topic.topicKey) !== filters.status) return false;
    if (filters.level === 'current' && ['advanced', 'reference'].includes(topic.level)) return false;
    if (!['all', 'current'].includes(filters.level) && topic.level !== filters.level) return false;
    return true;
  }).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

function renderModuleNav() {
  const nav = document.getElementById('moduleNav');
  nav.innerHTML = [
    `<button class="module-button${state.selectedModule === 'all' ? ' active' : ''}" data-module="all">全部</button>`,
    ...Object.entries(MODULES).map(([key, module]) => `<button class="module-button${state.selectedModule === key ? ' active' : ''}" data-module="${key}">${escapeHtml(module.short)}</button>`)
  ].join('');

  nav.querySelectorAll('[data-module]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedModule = button.dataset.module;
      renderModuleNav();
      renderTopics();
    });
  });
}

function toggleLocalMark(topicKey) {
  if (state.localMarks.has(topicKey)) state.localMarks.delete(topicKey);
  else state.localMarks.add(topicKey);
  saveLocalMarks();
  renderTopics();
}

function renderTopics() {
  const topics = visibleTopics();
  const list = document.getElementById('topicList');
  document.getElementById('visibleCount').textContent = topics.length;
  document.getElementById('completeCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'confirmed_complete').length;
  document.getElementById('readyCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'materials_ready').length;
  document.getElementById('reviewCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'needs_review').length;
  document.getElementById('teachCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'to_teach').length;
  document.getElementById('emptyState').hidden = topics.length > 0;

  let lastModule = '';
  list.innerHTML = topics.map(topic => {
    const status = statusFor(topic.topicKey);
    const meta = statusMeta(status);
    const localMarked = state.localMarks.has(topic.topicKey);
    const heading = topic.moduleKey !== lastModule
      ? `<div class="module-heading"><h2>${escapeHtml((MODULES[topic.moduleKey] || MODULES.R).title)}</h2><span>${state.topics.filter(item => item.moduleKey === topic.moduleKey).length} 个知识点</span></div>`
      : '';
    lastModule = topic.moduleKey;

    return `${heading}<article class="topic-row status-${meta.className}${status === 'confirmed_complete' ? ' complete' : ''}${localMarked ? ' local-marked' : ''}" data-topic-key="${escapeHtml(topic.topicKey)}">
      <button class="check-button" type="button" data-action="local" aria-pressed="${localMarked}" aria-label="${localMarked ? '取消本机临时标记' : '添加本机临时标记'}" title="仅保存在当前浏览器，不会修改 Supabase">${localMarked ? '●' : '○'}</button>
      <button class="topic-main" type="button" data-action="detail">
        <div class="topic-meta"><span class="sequence">${String(topic.sequenceOrder).padStart(3, '0')}</span><span class="level-chip">${LEVEL_LABELS[topic.level] || '知识点'}</span>${state.formalSource === 'supabase' ? '<span class="formal-source-chip">Supabase</span>' : '<span class="formal-source-chip offline">离线初始值</span>'}</div>
        <h3 class="topic-title">${escapeHtml(topic.titleZh)}</h3>
        <p class="topic-summary">${escapeHtml(topic.summary)}</p>
      </button>
      <span class="topic-status status-${meta.className}" aria-label="正式教学状态：${escapeHtml(meta.label)}">${escapeHtml(meta.label)}</span>
    </article>`;
  }).join('');

  list.querySelectorAll('.topic-row').forEach(row => {
    const key = row.dataset.topicKey;
    row.querySelector('[data-action="detail"]').addEventListener('click', () => openTopic(key));
    row.querySelector('[data-action="local"]').addEventListener('click', () => toggleLocalMark(key));
  });
}

function listHtml(items) {
  return items && items.length
    ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty-detail">暂无目录说明。</p>';
}

function openTopic(topicKey) {
  const topic = state.topics.find(item => item.topicKey === topicKey);
  const progress = state.progress.get(topicKey) || {};
  const refs = coverageFor(topicKey);
  const meta = statusMeta(statusFor(topicKey));
  const dialog = document.getElementById('topicDialog');
  const updatedAt = progress.updated_at
    ? new Date(progress.updated_at).toLocaleString('zh-CN')
    : '暂无正式更新时间';

  dialog.innerHTML = `<form method="dialog" class="dialog-topbar"><div><p class="eyebrow">${escapeHtml((MODULES[topic.moduleKey] || MODULES.R).title)}</p><h2>${escapeHtml(topic.titleZh)}</h2></div><button class="icon-button" aria-label="关闭">×</button></form>
    <div class="topic-dialog-body">
      <p>${escapeHtml(topic.summary)}</p>
      <div class="tag-row">${(topic.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="detail-grid">
        <section class="detail-section"><h3>规则</h3>${listHtml(topic.rules)}</section>
        <section class="detail-section"><h3>例句</h3>${listHtml(topic.examples)}</section>
        <section class="detail-section"><h3>易错点</h3>${listHtml(topic.pitfalls)}</section>
        <section class="detail-section progress-detail"><h3>正式进度</h3><p><strong class="inline-status status-${meta.className}">${escapeHtml(meta.label)}</strong></p><p>${escapeHtml(progress.note || '暂无备注')}</p><p>课程日期：${escapeHtml(progress.last_lesson_date || '未记录')}</p><p>最后更新：${escapeHtml(updatedAt)}</p><p class="read-only-note">正式状态来自 Supabase；本页不提供“点击即完成”的写入操作。</p></section>
      </div>
      <div class="detail-sources"><strong>来源映射：</strong> ${refs.map(item => `${escapeHtml(item.sourceItemKey)} ${escapeHtml(item.sourceTitle)}（${escapeHtml(item.coverageMode)}）`).join('；') || '无'}</div>
    </div>`;
  dialog.showModal();
}

function findLegacyProgress() {
  for (const key of LEGACY_PROGRESS_KEYS) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value) return { key, value };
    } catch (_) {}
  }
  return null;
}

function mapLegacyProgress(legacy) {
  const values = legacy && legacy.value;
  const completed = new Set(Array.isArray(values) ? values.map(String) : []);
  if (values && !Array.isArray(values) && typeof values === 'object') {
    Object.entries(values).forEach(([key, value]) => {
      if (value === true || value === 'completed' || value === 'confirmed_complete') completed.add(key);
    });
  }

  const mapped = [];
  const failed = [];
  completed.forEach(value => {
    const normalized = value.trim().toLowerCase();
    const topic = state.topics.find(item =>
      item.topicKey.toLowerCase() === canonicalTopicKey(normalized)
      || item.titleZh === value
      || item.titleEn.toLowerCase() === normalized
    );
    if (topic) mapped.push(topic.topicKey);
    else failed.push(value);
  });
  return { mapped: [...new Set(mapped)], failed };
}

function importLegacyProgress() {
  const legacy = findLegacyProgress();
  if (!legacy) return;
  const mapping = mapLegacyProgress(legacy);
  mapping.mapped.forEach(topicKey => state.localMarks.add(topicKey));
  saveLocalMarks();
  renderTopics();
  showBanner(`旧进度已转为本机临时标记：映射 ${mapping.mapped.length}，无法映射 ${mapping.failed.length}${mapping.failed.length ? `（${mapping.failed.join('、')}）` : ''}。未写入 Supabase，也未覆盖任何正式状态。`, mapping.failed.length ? '' : 'ok');
}

function renderSourceView() {
  const counts = Object.fromEntries(['D1', 'D2', 'D3'].map(catalog => [catalog, state.coverage.filter(item => item.sourceCatalog === catalog).length]));
  document.getElementById('sourceSummary').innerHTML = `<span>D1 ${counts.D1} / 59</span><span>D2 ${counts.D2} / 65</span><span>D3 ${counts.D3} / 29</span><span>合计 ${state.coverage.length}</span>`;
  document.getElementById('sourceTableWrap').innerHTML = `<table class="source-table"><thead><tr><th>来源</th><th>原知识点</th><th>归属 topic</th><th>处理</th><th>说明</th></tr></thead><tbody>${state.coverage.map(item => `<tr><td>${escapeHtml(item.sourceItemKey)}</td><td>${escapeHtml(item.sourceTitle)}</td><td>${escapeHtml(canonicalTopicKey(item.topicKey))}</td><td>${escapeHtml(item.coverageMode)}</td><td>${escapeHtml(item.notes)}</td></tr>`).join('')}</tbody></table>`;
}

function bindEvents() {
  ['searchInput', 'categoryFilter', 'statusFilter', 'levelFilter'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'searchInput' ? 'input' : 'change', renderTopics);
  });
  document.getElementById('sourceViewButton').addEventListener('click', () => document.getElementById('sourceDialog').showModal());
  document.getElementById('legacyImportButton').hidden = !findLegacyProgress();
  document.getElementById('legacyImportButton').addEventListener('click', importLegacyProgress);
}

async function init() {
  try {
    [state.topics, state.coverage, state.initialProgress] = await Promise.all([
      loadJson('data/topics.json'),
      loadJson('data/source-coverage.json'),
      loadJson('data/initial-progress.json')
    ]);
    normalizeTopicCatalog();
    state.progress = makeInitialProgressMap();
    renderModuleNav();
    renderSourceView();
    bindEvents();
    renderTopics();

    try {
      await loadRemoteProgress();
      renderModuleNav();
      showBanner('已读取 Supabase 共享教学进度。正式状态只读；左侧圆点仅是本机临时标记。', 'ok');
    } catch (error) {
      state.databaseReady = false;
      state.formalSource = 'initial';
      showBanner(`${error.message}。当前仅显示离线初始值；正式状态不可用，页面不会写入 Supabase。`, 'error');
    }
    renderTopics();
  } catch (error) {
    showBanner(`知识点库加载失败：${error.message}`, 'error');
  }
}

init();
