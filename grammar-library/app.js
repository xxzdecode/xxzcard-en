const SUPABASE_URL = 'https://pnwxpuwsoprfehdvnlik.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud3hwdXdzb3ByZmVoZHZubGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTE5MjIsImV4cCI6MjA5NjgyNzkyMn0.aDdixCpy7l4NR3zK-WyOCvBmFLmZ7pbP8Pg4w8WYClg';
const STATUS_LABELS = {
  not_started: '未开始',
  to_teach: '待补讲',
  needs_review: '需复习确认',
  confirmed_complete: '确认完成'
};
const LEVEL_LABELS = { core: '核心主线', extension: '扩充表达', advanced: '进阶储备', reference: '基础参考' };
const MODULES = {
  A: { title: 'A 已完成基础区', short: '基础' },
  B: { title: 'B 当前优先补强区', short: '当前补强' },
  C: { title: 'C 扩充句子区', short: '扩充句子' },
  D: { title: 'D 时间轴区', short: '时间轴' },
  E: { title: 'E 句法与表达区', short: '句法表达' },
  F: { title: 'F 进阶储备区', short: '进阶储备' },
  R: { title: '基础参考', short: '参考' }
};

const state = {
  topics: [],
  coverage: [],
  initialProgress: [],
  progress: new Map(),
  selectedModule: 'all',
  databaseReady: true,
  saving: new Set()
};

function apiHeaders(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...extra };
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`无法读取 ${path}`);
  return response.json();
}

function makeInitialProgressMap() {
  return new Map(state.initialProgress.map(item => [item.topicKey, {
    topic_key: item.topicKey,
    status: item.status,
    note: item.note || '',
    updated_at: '',
    source: 'initial'
  }]));
}

async function loadRemoteProgress() {
  const store = await readRemoteProgressStore();
  const progress = makeInitialProgressMap();
  Object.entries(store.topics || {}).forEach(([key, row]) => {
    if (state.topics.some(topic => topic.topicKey === key)) progress.set(key, { ...row, topic_key: key, source: 'database' });
  });
  state.progress = progress;
  state.databaseReady = true;
}

async function readRemoteProgressStore() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/kv_store?key=eq.grammar_progress&select=value`, { headers: apiHeaders() });
  if (!response.ok) throw new Error(`无法读取 Supabase 进度（HTTP ${response.status}）`);
  const rows = await response.json();
  return rows.length && rows[0].value && typeof rows[0].value === 'object'
    ? rows[0].value
    : { schemaVersion: 1, scopeKey: 'shared', topics: {}, events: [] };
}

async function writeRemoteProgressStore(store) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/kv_store`, {
    method: 'POST',
    headers: apiHeaders({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({ key: 'grammar_progress', value: store })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
}

function statusFor(topicKey) {
  return (state.progress.get(topicKey) || {}).status || 'not_started';
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function showBanner(message, kind = '') {
  const banner = document.getElementById('syncBanner');
  banner.textContent = message;
  banner.className = `sync-banner ${kind}`.trim();
  banner.hidden = !message;
}

function coverageFor(topicKey) {
  return state.coverage.filter(item => item.topicKey === topicKey);
}

function searchableText(topic) {
  return [topic.titleZh, topic.titleEn, topic.summary, topic.category, ...(topic.tags || []), ...(topic.rules || []), ...(topic.examples || []), ...coverageFor(topic.topicKey).map(item => `${item.sourceItemKey} ${item.sourceTitle}`)].join(' ').toLowerCase();
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
  nav.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => {
    state.selectedModule = button.dataset.module;
    renderModuleNav();
    renderTopics();
  }));
}

function statusOptions(selected) {
  return Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`).join('');
}

function renderTopics() {
  const topics = visibleTopics();
  const list = document.getElementById('topicList');
  document.getElementById('visibleCount').textContent = topics.length;
  document.getElementById('completeCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'confirmed_complete').length;
  document.getElementById('reviewCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'needs_review').length;
  document.getElementById('teachCount').textContent = state.topics.filter(topic => statusFor(topic.topicKey) === 'to_teach').length;
  document.getElementById('emptyState').hidden = topics.length > 0;
  let lastModule = '';
  list.innerHTML = topics.map(topic => {
    const status = statusFor(topic.topicKey);
    const heading = topic.moduleKey !== lastModule
      ? `<div class="module-heading"><h2>${escapeHtml(MODULES[topic.moduleKey].title)}</h2><span>${state.topics.filter(item => item.moduleKey === topic.moduleKey).length} 个知识点</span></div>`
      : '';
    lastModule = topic.moduleKey;
    const disabled = !state.databaseReady || state.saving.has(topic.topicKey);
    return `${heading}<article class="topic-row ${status === 'confirmed_complete' ? 'complete' : ''}" data-topic-key="${topic.topicKey}">
      <button class="check-button" type="button" data-action="toggle" aria-label="${status === 'confirmed_complete' ? '取消完成' : '标记完成'}" ${disabled ? 'disabled' : ''}>✓</button>
      <button class="topic-main" type="button" data-action="detail">
        <div class="topic-meta"><span class="sequence">${String(topic.sequenceOrder).padStart(3, '0')}</span><span class="level-chip">${LEVEL_LABELS[topic.level]}</span></div>
        <h3 class="topic-title">${escapeHtml(topic.titleZh)}</h3>
        <p class="topic-summary">${escapeHtml(topic.summary)}</p>
      </button>
      <select class="topic-status status-${status}" data-action="status" aria-label="设置 ${escapeHtml(topic.titleZh)} 的状态" ${disabled ? 'disabled' : ''}>${statusOptions(status)}</select>
    </article>`;
  }).join('');

  list.querySelectorAll('.topic-row').forEach(row => {
    const key = row.dataset.topicKey;
    row.querySelector('[data-action="detail"]').addEventListener('click', () => openTopic(key));
    row.querySelector('[data-action="toggle"]').addEventListener('click', () => updateProgress(key, statusFor(key) === 'confirmed_complete' ? 'not_started' : 'confirmed_complete'));
    row.querySelector('[data-action="status"]').addEventListener('change', event => updateProgress(key, event.target.value));
  });
}

function openTopic(topicKey) {
  const topic = state.topics.find(item => item.topicKey === topicKey);
  const progress = state.progress.get(topicKey) || {};
  const refs = coverageFor(topicKey);
  const dialog = document.getElementById('topicDialog');
  dialog.innerHTML = `<form method="dialog" class="dialog-topbar"><div><p class="eyebrow">${escapeHtml(MODULES[topic.moduleKey].title)}</p><h2>${escapeHtml(topic.titleZh)}</h2></div><button class="icon-button" aria-label="关闭">×</button></form>
    <div class="topic-dialog-body">
      <p>${escapeHtml(topic.summary)}</p>
      <div class="tag-row">${(topic.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="detail-grid">
        <section class="detail-section"><h3>规则</h3><ul>${topic.rules.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
        <section class="detail-section"><h3>例句</h3><ul>${topic.examples.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
        <section class="detail-section"><h3>易错点</h3><ul>${topic.pitfalls.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
        <section class="detail-section"><h3>当前进度</h3><p><strong>${STATUS_LABELS[statusFor(topicKey)]}</strong></p><p>${escapeHtml(progress.note || '暂无备注')}</p><p>${progress.updated_at ? `最后更新：${escapeHtml(new Date(progress.updated_at).toLocaleString())}` : '使用初始化状态，尚无数据库更新时间'}</p></section>
      </div>
      <div class="detail-sources"><strong>来源映射：</strong> ${refs.map(item => `${item.sourceItemKey} ${item.sourceTitle}（${item.coverageMode}）`).join('；') || '无'}</div>
    </div>`;
  dialog.showModal();
}

async function updateProgress(topicKey, nextStatus, options = {}) {
  const previous = state.progress.get(topicKey) || { topic_key: topicKey, status: 'not_started', note: '' };
  state.progress.set(topicKey, { ...previous, status: nextStatus, updated_at: new Date().toISOString() });
  state.saving.add(topicKey);
  renderTopics();
  try {
    const store = await readRemoteProgressStore();
    const stored = store.topics && store.topics[topicKey];
    if (options.onlyIfMissing && stored) {
      state.progress.set(topicKey, { ...stored, topic_key: topicKey, source: 'database' });
      showBanner('数据库已有记录，旧进度未覆盖。', 'ok');
      return { status: 'skipped_existing' };
    }
    const updatedAt = new Date().toISOString();
    const note = options.note || previous.note || '';
    const topic = state.topics.find(item => item.topicKey === topicKey);
    const nextRecord = {
      title: topic.titleZh,
      module: topic.moduleKey,
      sequence: topic.sequenceOrder,
      status: nextStatus,
      last_lesson_date: options.lessonDate || (stored && stored.last_lesson_date) || null,
      note,
      updated_at: updatedAt
    };
    const nextStore = {
      schemaVersion: 1,
      scopeKey: 'shared',
      updatedAt,
      topics: { ...(store.topics || {}), [topicKey]: nextRecord },
      events: [...(Array.isArray(store.events) ? store.events : []), {
        topic_key: topicKey,
        old_status: stored ? stored.status : 'not_started',
        new_status: nextStatus,
        lesson_date: options.lessonDate || null,
        note,
        created_at: updatedAt
      }].slice(-1000)
    };
    await writeRemoteProgressStore(nextStore);
    state.progress.set(topicKey, { ...nextRecord, topic_key: topicKey, source: 'database' });
    const payload = { status: 'saved', updatedAt };
    showBanner(payload.status === 'skipped_existing' ? '数据库已有记录，旧进度未覆盖。' : '教学进度已保存到 Supabase。', 'ok');
    return payload;
  } catch (error) {
    state.progress.set(topicKey, previous);
    showBanner(`保存失败，页面状态已回滚：${error.message}`, 'error');
    return { status: 'failed', error: error.message };
  } finally {
    state.saving.delete(topicKey);
    renderTopics();
  }
}

function renderSourceView() {
  const counts = Object.fromEntries(['D1', 'D2', 'D3'].map(catalog => [catalog, state.coverage.filter(item => item.sourceCatalog === catalog).length]));
  document.getElementById('sourceSummary').innerHTML = `<span>D1 ${counts.D1} / 59</span><span>D2 ${counts.D2} / 65</span><span>D3 ${counts.D3} / 29</span><span>合计 ${state.coverage.length}</span>`;
  document.getElementById('sourceTableWrap').innerHTML = `<table class="source-table"><thead><tr><th>来源</th><th>原知识点</th><th>归属 topic</th><th>处理</th><th>说明</th></tr></thead><tbody>${state.coverage.map(item => `<tr><td>${item.sourceItemKey}</td><td>${escapeHtml(item.sourceTitle)}</td><td>${escapeHtml(item.topicKey)}</td><td>${escapeHtml(item.coverageMode)}</td><td>${escapeHtml(item.notes)}</td></tr>`).join('')}</tbody></table>`;
}

function findLegacyProgress() {
  const candidates = ['grammarProgress', 'grammar-progress', 'grammar_checked', 'englishGrammarProgress'];
  for (const key of candidates) {
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
    Object.entries(values).forEach(([key, value]) => { if (value === true || value === 'completed' || value === 'confirmed_complete') completed.add(key); });
  }
  const mapped = [];
  const failed = [];
  completed.forEach(value => {
    const normalized = value.trim().toLowerCase();
    const topic = state.topics.find(item => item.topicKey.toLowerCase() === normalized || item.titleZh === value || item.titleEn.toLowerCase() === normalized);
    if (topic) mapped.push(topic.topicKey); else failed.push(value);
  });
  return { mapped: [...new Set(mapped)], failed };
}

async function importLegacyProgress() {
  const legacy = findLegacyProgress();
  if (!legacy) return;
  const mapping = mapLegacyProgress(legacy);
  const results = [];
  for (const topicKey of mapping.mapped) results.push(await updateProgress(topicKey, 'confirmed_complete', { onlyIfMissing: true, note: `从 localStorage ${legacy.key} 一次性导入` }));
  const saved = results.filter(item => item.status === 'saved').length;
  const skipped = results.filter(item => item.status === 'skipped_existing').length;
  showBanner(`旧进度导入完成：映射 ${mapping.mapped.length}，新增 ${saved}，数据库已有并跳过 ${skipped}，无法映射 ${mapping.failed.length}${mapping.failed.length ? `（${mapping.failed.join('、')}）` : ''}。`, mapping.failed.length ? '' : 'ok');
}

function bindEvents() {
  ['searchInput', 'categoryFilter', 'statusFilter', 'levelFilter'].forEach(id => document.getElementById(id).addEventListener(id === 'searchInput' ? 'input' : 'change', renderTopics));
  document.getElementById('sourceViewButton').addEventListener('click', () => document.getElementById('sourceDialog').showModal());
  document.getElementById('legacyImportButton').hidden = !findLegacyProgress();
  document.getElementById('legacyImportButton').addEventListener('click', importLegacyProgress);
}

async function init() {
  try {
    [state.topics, state.coverage, state.initialProgress] = await Promise.all([
      loadJson('data/topics.json'), loadJson('data/source-coverage.json'), loadJson('data/initial-progress.json')
    ]);
    state.progress = makeInitialProgressMap();
    renderModuleNav();
    renderSourceView();
    bindEvents();
    renderTopics();
    try {
      await loadRemoteProgress();
      showBanner('已读取 Supabase 共享教学进度。', 'ok');
    } catch (error) {
      state.databaseReady = false;
      showBanner(`${error.message}。当前显示初始进度，云端不可用时为只读。`, 'error');
    }
    renderTopics();
  } catch (error) {
    showBanner(`知识点库加载失败：${error.message}`, 'error');
  }
}

init();
