(function (root) {
  'use strict';
  const KEY = 'daily_learning_route_override_v1';
  const PREFIX = 'manual-courseware::';
  const baseFetch = root.fetch.bind(root);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const normalize = value => ({
    schemaVersion: 1,
    dates: value && typeof value === 'object' && value.dates && typeof value.dates === 'object' ? { ...value.dates } : {}
  });
  const snapshot = value => {
    if (!value || typeof value !== 'object') return null;
    const practiceId = String(value.practiceId || '').trim();
    const title = String(value.title || '').trim();
    const path = String(value.path || '').trim();
    return practiceId && title && path ? { practiceId, title, path } : null;
  };
  function mergeRoute(route, store, date = today()) {
    if (!route || typeof route !== 'object') return route;
    const day = normalize(store).dates[date];
    if (!day || typeof day !== 'object') return route;
    const grammar = snapshot(day.grammarChallenge);
    const classroom = snapshot(day.classroomPractice);
    if (!grammar && !classroom) return route;
    const next = { ...route, manualOverride: { date, updatedAt: day.updatedAt || '' } };
    if (grammar) next.grammarChallenge = {
      id: PREFIX + grammar.practiceId,
      title: grammar.title.replace(/随堂练习/g, '语法挑战'),
      displayTitle: grammar.title.replace(/^\d{2}\.\d{2}\.\d{2}｜/, '').replace(/随堂练习/g, ''),
      reviewLessonKey: `manual-courseware:${grammar.practiceId}`,
      source: 'courseware-practice', sourcePracticeId: grammar.practiceId, sourcePath: grammar.path
    };
    if (classroom) next.classroomPractice = {
      id: classroom.practiceId,
      title: classroom.title,
      displayTitle: classroom.title.replace(/^\d{2}\.\d{2}\.\d{2}｜/, '').replace(/随堂练习/g, ''),
      lessonTitle: classroom.title,
      lessonKey: `manual-courseware:${classroom.practiceId}`,
      source: 'courseware-practice', path: classroom.path
    };
    return next;
  }
  const api = { KEY, PREFIX, mergeRoute, normalize };
  root.DailyLearningRouteOverride = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document || root.__dailyRouteOverrideInstalled) return;
  root.__dailyRouteOverrideInstalled = true;

  async function readDirect() {
    if (typeof SB_URL === 'undefined' || typeof SB_HEADERS === 'undefined') return null;
    const response = await baseFetch(`${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(KEY)}&select=value`, {
      headers: SB_HEADERS, cache: 'no-store'
    });
    if (!response.ok) throw new Error(`override HTTP ${response.status}`);
    const rows = await response.json();
    return rows && rows.length ? rows[0].value : null;
  }

  root.fetch = async function (input, init) {
    const response = await baseFetch(input, init);
    let path = '';
    try { path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname; } catch (_) {}
    if (!response.ok || !path.endsWith('/data/daily-learning-route.json')) return response;
    try {
      const automatic = await response.clone().json();
      const merged = mergeRoute(automatic, await readDirect());
      return new Response(JSON.stringify(merged), {
        status: response.status,
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Cache-Control': 'no-store' }
      });
    } catch (error) {
      console.warn('daily route override unavailable', error);
      return response;
    }
  };

  const items = () => Array.isArray(root.CLASSROOM_PRACTICE_ITEMS)
    ? root.CLASSROOM_PRACTICE_ITEMS
    : Array.isArray(root.COURSEWARE_ITEMS) ? root.COURSEWARE_ITEMS : [];
  const findItem = id => items().find(item => String(item.id) === String(id));
  async function loadCoursewareData() {
    if (items().length) return;
    for (let attempt = 0; attempt < 60 && typeof root.loadFeatureScript !== 'function'; attempt += 1) {
      await new Promise(resolve => root.setTimeout(resolve, 50));
    }
    if (typeof root.loadFeatureScript !== 'function') throw new Error('courseware loader unavailable');
    await root.loadFeatureScript('js/courseware-data.js');
  }

  function openManualGrammar(id, title) {
    const practiceId = String(id || '').startsWith(PREFIX) ? String(id).slice(PREFIX.length) : '';
    if (!practiceId) return false;
    loadCoursewareData().then(() => {
      const item = findItem(practiceId);
      if (!item) throw new Error('practice not found');
      const frame = document.getElementById('grammarChallengeFrame');
      const heading = document.getElementById('grammarChallengeTitle');
      if (heading) heading.textContent = String(title || item.title).replace(/随堂练习/g, '语法挑战');
      if (frame) frame.src = `grammar-challenge/practices/courseware-daily.html?${new URLSearchParams({ source: item.path, practiceId: item.id, title: item.title })}`;
      document.body.classList.add('grammar-challenge-open');
      root.showScreen('screenGrammarChallengePlayer');
    }).catch(() => alert('这条随堂练习暂时无法作为语法挑战打开。'));
    return true;
  }

  function patchGrammarLoader() {
    if (typeof root.loadFeatureGroup !== 'function' || root.loadFeatureGroup.__dailyOverride) return;
    const originalLoad = root.loadFeatureGroup;
    const wrappedLoad = function (group) {
      return Promise.resolve(originalLoad.apply(this, arguments)).then(result => {
        if (group === 'grammarChallenge' && typeof root.openGrammarChallenge === 'function' && !root.openGrammarChallenge.__dailyOverride) {
          const originalOpen = root.openGrammarChallenge;
          const wrappedOpen = function (id) {
            const route = root.getDailyLearningRoute && root.getDailyLearningRoute();
            const title = route && route.grammarChallenge && route.grammarChallenge.id === id ? route.grammarChallenge.title : '';
            if (openManualGrammar(id, title)) return;
            return originalOpen.apply(this, arguments);
          };
          wrappedOpen.__dailyOverride = true;
          root.openGrammarChallenge = wrappedOpen;
          try { openGrammarChallenge = wrappedOpen; } catch (_) {}
        }
        return result;
      });
    };
    wrappedLoad.__dailyOverride = true;
    root.loadFeatureGroup = wrappedLoad;
    try { loadFeatureGroup = wrappedLoad; } catch (_) {}
  }

  function addPanel() {
    if (document.getElementById('teacherDailyRoutePanel')) return;
    const home = document.getElementById('screenHome');
    if (!home) return;
    const panel = document.createElement('section');
    panel.id = 'teacherDailyRoutePanel';
    panel.className = 'teacher-only';
    panel.innerHTML = `
      <style>
        #teacherDailyRoutePanel{display:none;margin:12px auto;width:min(1180px,calc(100% - 24px));padding:14px;border:1px solid #ddd2f1;border-radius:18px;background:#fbf8ff;box-shadow:0 8px 24px rgba(101,73,159,.1)}
        body.is-teacher #teacherDailyRoutePanel{display:block}#teacherDailyRoutePanel h2{margin:0 0 4px;color:#65499f;font-size:19px}#teacherDailyRoutePanel p{margin:0 0 12px;color:#756b7d;font-size:13px}
        .daily-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.daily-route-field{display:grid;gap:6px}.daily-route-field label{font-weight:800}.daily-route-field select{min-height:44px;border:1px solid #d8cdeb;border-radius:11px;padding:8px;background:#fff}
        .daily-route-actions{display:flex;align-items:center;gap:8px;margin-top:12px}.daily-route-actions span{margin-right:auto;font-size:13px;font-weight:700;color:#6e6474}.daily-route-actions button{min-height:42px;border:0;border-radius:999px;padding:8px 15px;font-weight:800}.daily-route-save{background:#7658ba;color:#fff}.daily-route-refresh{background:#eee8fb;color:#65499f}@media(max-width:760px){.daily-route-grid{grid-template-columns:1fr}}
      </style>
      <h2>今日学习安排</h2><p>自动安排继续保留；这里只手动替换今天。选择“自动安排”即可恢复。</p>
      <div class="daily-route-grid">
        <div class="daily-route-field"><label for="teacherGrammarOverride">今日语法挑战</label><select id="teacherGrammarOverride"><option value="">自动安排</option></select><small>从所选随堂练习中抽取 10 题。</small></div>
        <div class="daily-route-field"><label for="teacherClassroomOverride">今日随堂练习</label><select id="teacherClassroomOverride"><option value="">自动安排</option></select><small>学生首页直接进入所选练习。</small></div>
      </div>
      <div class="daily-route-actions"><span id="teacherDailyRouteStatus"></span><button class="daily-route-refresh" id="teacherDailyRouteRefresh">重新读取</button><button class="daily-route-save" id="teacherDailyRouteSave">保存今日安排</button></div>`;
    const anchor = document.getElementById('currentModeBadge');
    anchor && anchor.parentNode === home ? anchor.insertAdjacentElement('afterend', panel) : home.prepend(panel);
    panel.querySelector('#teacherDailyRouteRefresh').onclick = refreshPanel;
    panel.querySelector('#teacherDailyRouteSave').onclick = savePanel;
  }

  const status = text => { const el = document.getElementById('teacherDailyRouteStatus'); if (el) el.textContent = text || ''; };
  const option = item => new Option(item.title, item.id);
  async function refreshPanel() {
    addPanel(); status('正在读取…');
    try {
      await loadCoursewareData();
      const store = normalize(typeof sbGet === 'function' ? await sbGet(KEY) : await readDirect());
      const day = store.dates[today()] || {};
      const grammar = document.getElementById('teacherGrammarOverride');
      const classroom = document.getElementById('teacherClassroomOverride');
      grammar.replaceChildren(new Option('自动安排', ''), ...items().map(option));
      classroom.replaceChildren(new Option('自动安排', ''), ...items().map(option));
      grammar.value = day.grammarChallenge && day.grammarChallenge.practiceId || '';
      classroom.value = day.classroomPractice && day.classroomPractice.practiceId || '';
      status(day.grammarChallenge || day.classroomPractice ? '今天有手动替换。' : '今天使用自动安排。');
    } catch (_) { status('读取失败，请检查网络。'); }
  }
  const snap = id => { const item = findItem(id); return item ? { practiceId: item.id, title: item.title, path: item.path } : null; };
  async function savePanel() {
    if (typeof canWriteCloudData === 'function' && !canWriteCloudData()) return;
    status('正在保存…');
    try {
      const store = normalize(await sbGet(KEY));
      const grammar = snap(document.getElementById('teacherGrammarOverride').value);
      const classroom = snap(document.getElementById('teacherClassroomOverride').value);
      if (grammar || classroom) store.dates[today()] = { grammarChallenge: grammar || undefined, classroomPractice: classroom || undefined, updatedAt: new Date().toISOString() };
      else delete store.dates[today()];
      await sbSet(KEY, store);
      status(grammar || classroom ? '今日手动安排已保存。' : '已恢复自动安排。');
    } catch (error) { status('保存失败，请重试。'); if (typeof showStorageError === 'function') showStorageError(error); }
  }

  addPanel();
  patchGrammarLoader();
  document.addEventListener('click', event => {
    if (event.target && event.target.closest && event.target.closest('#uBtnTeacher')) setTimeout(refreshPanel, 0);
  });
  root.addEventListener && root.addEventListener('daily-learning-route-ready', patchGrammarLoader);
  try { if (typeof isTeacher === 'function' && isTeacher()) refreshPanel(); } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : window);
