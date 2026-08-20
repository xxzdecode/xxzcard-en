(function (root) {
  'use strict';
  const KEY = 'daily_learning_route_override_v1';
  const PREFIX = 'manual-courseware::';
  const ASSIGNMENT_PREFIX = 'daily_learning_route_assignment_v1_';
  const OVERRIDE_CACHE_KEY = 'daily_learning_route_override_cache_v1';
  const ASSIGNMENT_CACHE_PREFIX = 'daily_learning_route_assignment_cache_v1_';
  const READ_TIMEOUT_MS = 1800;
  const VERIFY_TIMEOUT_MS = 2200;
  const baseFetch = typeof root.fetch === 'function' ? root.fetch.bind(root) : null;

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const normalize = value => ({
    schemaVersion: 1,
    dates: value && typeof value === 'object' && value.dates && typeof value.dates === 'object'
      ? { ...value.dates }
      : {}
  });

  const normalizeAssignments = value => ({
    schemaVersion: 1,
    dates: value && typeof value === 'object' && value.dates && typeof value.dates === 'object'
      ? { ...value.dates }
      : {}
  });

  function readCachedOverride() {
    try {
      return normalize(JSON.parse(root.localStorage?.getItem(OVERRIDE_CACHE_KEY) || 'null'));
    } catch (_) {
      return normalize(null);
    }
  }

  function writeCachedOverride(value) {
    try {
      const serialized = JSON.stringify(normalize(value));
      const changed = root.localStorage?.getItem(OVERRIDE_CACHE_KEY) !== serialized;
      root.localStorage?.setItem(OVERRIDE_CACHE_KEY, serialized);
      return changed;
    } catch (_) {
      return false;
    }
  }

  function assignmentCacheKey(user) {
    return ASSIGNMENT_CACHE_PREFIX + (user === 'brother' ? 'brother' : 'sister');
  }

  function readCachedAssignment(user) {
    try {
      return normalizeAssignments(JSON.parse(root.localStorage?.getItem(assignmentCacheKey(user)) || 'null'));
    } catch (_) {
      return normalizeAssignments(null);
    }
  }

  function writeCachedAssignment(user, value) {
    try { root.localStorage?.setItem(assignmentCacheKey(user), JSON.stringify(normalizeAssignments(value))); } catch (_) {}
  }

  function warmPracticeAssets(value, date = today()) {
    if (!baseFetch || typeof root.location === 'undefined') return;
    const source = value && value.dates && value.dates[date];
    if (!source || typeof source !== 'object') return;
    const paths = new Set();
    ['grammarChallenge', 'classroomPractice'].forEach(slot => {
      const path = String(source[slot] && source[slot].path || '').trim();
      if (path) paths.add(path);
    });
    paths.forEach(path => {
      let url;
      try { url = new URL(path, root.location.href); } catch (_) { return; }
      if (url.origin !== root.location.origin) return;
      baseFetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).catch(() => null);
    });
  }

  const snapshot = value => {
    if (!value || typeof value !== 'object') return null;
    const practiceId = String(value.practiceId || '').trim();
    const title = String(value.title || '').trim();
    const path = String(value.path || '').trim();
    return practiceId && title && path ? { practiceId, title, path } : null;
  };

  const routeSnapshot = value => {
    if (!value || typeof value !== 'object') return null;
    const id = String(value.id || '').trim();
    if (!id) return null;
    const fields = [
      'id', 'title', 'displayTitle', 'reviewLessonKey', 'source', 'sourcePracticeId',
      'sourcePath', 'date', 'lessonKey', 'path', 'lessonTitle', 'updatedAt'
    ];
    const result = {};
    fields.forEach(field => {
      if (value[field] !== undefined && value[field] !== null && String(value[field]).trim() !== '') {
        result[field] = value[field];
      }
    });
    result.id = id;
    return result;
  };

  function manualGrammarRoute(value) {
    const practice = snapshot(value);
    if (!practice) return null;
    return {
      id: PREFIX + practice.practiceId,
      title: practice.title.replace(/随堂练习/g, '语法挑战'),
      displayTitle: practice.title.replace(/^\d{2}\.\d{2}\.\d{2}｜/, '').replace(/随堂练习/g, ''),
      reviewLessonKey: `manual-courseware:${practice.practiceId}`,
      source: 'courseware-practice',
      sourcePracticeId: practice.practiceId,
      sourcePath: practice.path
    };
  }

  function manualClassroomRoute(value) {
    const practice = snapshot(value);
    if (!practice) return null;
    return {
      id: practice.practiceId,
      title: practice.title,
      displayTitle: practice.title.replace(/^\d{2}\.\d{2}\.\d{2}｜/, '').replace(/随堂练习/g, ''),
      lessonTitle: practice.title,
      lessonKey: `manual-courseware:${practice.practiceId}`,
      source: 'courseware-practice',
      path: practice.path
    };
  }

  function mergeRoute(route, store, date = today()) {
    if (!route || typeof route !== 'object') return route;
    const day = normalize(store).dates[date];
    if (!day || typeof day !== 'object') return route;
    const grammar = manualGrammarRoute(day.grammarChallenge);
    const classroom = manualClassroomRoute(day.classroomPractice);
    if (!grammar && !classroom) return route;
    const next = { ...route, manualOverride: { date, updatedAt: day.updatedAt || '' } };
    if (grammar) next.grammarChallenge = grammar;
    if (classroom) next.classroomPractice = classroom;
    return next;
  }

  function mergePinnedRoute(route, assignment, date = today()) {
    if (!route || typeof route !== 'object') return route;
    const day = normalizeAssignments(assignment).dates[date];
    if (!day || typeof day !== 'object') return route;
    const grammar = routeSnapshot(day.grammarChallenge);
    const classroom = routeSnapshot(day.classroomPractice);
    if (!grammar && !classroom) return route;
    const next = { ...route, assignmentPinned: { date, updatedAt: day.updatedAt || '' } };
    if (grammar) next.grammarChallenge = grammar;
    if (classroom) next.classroomPractice = classroom;
    return next;
  }

  function hasPracticeData(html) {
    return /\bid\s*=\s*["']practice-data["']/i.test(String(html || ''));
  }

  function assignmentKey(user) {
    return ASSIGNMENT_PREFIX + (user === 'brother' ? 'brother' : 'sister');
  }

  const api = {
    KEY,
    PREFIX,
    ASSIGNMENT_PREFIX,
    READ_TIMEOUT_MS,
    VERIFY_TIMEOUT_MS,
    mergeRoute,
    mergePinnedRoute,
    normalize,
    normalizeAssignments,
    routeSnapshot,
    hasPracticeData,
    assignmentKey
  };
  root.DailyLearningRouteOverride = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document || root.__dailyRouteOverrideInstalled) return;
  root.__dailyRouteOverrideInstalled = true;

  function timeoutPromise(ms, label) {
    return new Promise((_, reject) => {
      root.setTimeout(() => reject(new Error(`${label || 'operation'} timeout`)), ms);
    });
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([Promise.resolve(promise), timeoutPromise(ms, label)]);
  }

  async function timedFetch(input, init, ms, label) {
    if (!baseFetch) throw new Error('fetch unavailable');
    const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    const timer = controller ? root.setTimeout(() => controller.abort(), ms) : null;
    try {
      return await withTimeout(baseFetch(input, {
        ...(init || {}),
        signal: controller ? controller.signal : init && init.signal
      }), ms, label || 'fetch');
    } finally {
      if (timer) root.clearTimeout(timer);
    }
  }

  async function readDirect() {
    if (typeof SB_URL === 'undefined' || typeof SB_HEADERS === 'undefined') return null;
    const response = await timedFetch(`${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(KEY)}&select=value`, {
      headers: SB_HEADERS,
      cache: 'no-store'
    }, READ_TIMEOUT_MS, 'override read');
    if (!response.ok) throw new Error(`override HTTP ${response.status}`);
    const rows = await withTimeout(response.json(), READ_TIMEOUT_MS, 'override json');
    return rows && rows.length ? rows[0].value : null;
  }

  let overrideSyncPromise = null;
  function refreshOverride() {
    if (overrideSyncPromise) return overrideSyncPromise;
    overrideSyncPromise = readDirect()
      .then(value => {
        const normalized = normalize(value);
        if (writeCachedOverride(normalized)) {
          root.dispatchEvent?.(new CustomEvent('daily-route-override-updated'));
        }
        warmPracticeAssets(normalized);
        return { fresh: true, value: normalized };
      })
      .catch(error => {
        console.warn('daily route override sync unavailable', error);
        return { fresh: false, value: null };
      })
      .finally(() => { overrideSyncPromise = null; });
    return overrideSyncPromise;
  }

  root.fetch = async function (input, init) {
    const response = await baseFetch(input, init);
    let path = '';
    try { path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname; } catch (_) {}
    if (!response.ok || !path.endsWith('/data/daily-learning-route.json')) return response;
    try {
      const automatic = await response.clone().json();
      const cached = readCachedOverride();
      const refreshed = await refreshOverride();
      const merged = mergeRoute(automatic, refreshed.fresh ? refreshed.value : cached);
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

  const compatibilityCache = new Map();

  async function verifyGrammarCompatibility(item) {
    if (!item || !item.path) return { state: 'incompatible', reason: 'missing-path' };
    if (typeof item.grammarCompatible === 'boolean') {
      return item.grammarCompatible
        ? { state: 'compatible', reason: 'catalog' }
        : { state: 'incompatible', reason: 'catalog-missing-practice-data' };
    }
    const key = String(item.path);
    if (compatibilityCache.has(key)) return compatibilityCache.get(key);
    const promise = timedFetch(key, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'text/html' }
    }, VERIFY_TIMEOUT_MS, 'practice compatibility')
      .then(async response => {
        if (!response.ok) return { state: 'unverified', reason: `HTTP ${response.status}` };
        const html = await withTimeout(response.text(), VERIFY_TIMEOUT_MS, 'practice html');
        return hasPracticeData(html)
          ? { state: 'compatible', reason: '' }
          : { state: 'incompatible', reason: 'missing-practice-data' };
      })
      .catch(error => ({ state: 'unverified', reason: error && error.message || 'request-failed' }));
    compatibilityCache.set(key, promise);
    return promise;
  }

  async function mapWithLimit(list, limit, worker) {
    const result = new Array(list.length);
    let cursor = 0;
    const runners = new Array(Math.min(limit, list.length)).fill(null).map(async () => {
      while (cursor < list.length) {
        const index = cursor++;
        result[index] = await worker(list[index], index);
      }
    });
    await Promise.all(runners);
    return result;
  }

  function currentStudent() {
    try {
      if (typeof currentUser !== 'undefined' && currentUser === 'brother') return 'brother';
    } catch (_) {}
    return root.currentUser === 'brother' ? 'brother' : 'sister';
  }

  function readLocalJson(key) {
    try {
      const raw = root.localStorage && root.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function routeFromGrammarId(id, title) {
    const challengeId = String(id || '').trim();
    if (!challengeId) return null;
    if (challengeId.startsWith(PREFIX)) {
      const item = findItem(challengeId.slice(PREFIX.length));
      return item ? manualGrammarRoute({ practiceId: item.id, title: item.title, path: item.path }) : null;
    }
    const catalog = Array.isArray(root.GRAMMAR_CHALLENGE_CATALOG) ? root.GRAMMAR_CHALLENGE_CATALOG : [];
    const entry = catalog.find(item => item && String(item.id) === challengeId);
    return routeSnapshot(entry || { id: challengeId, title: title || challengeId });
  }

  function routeFromClassroomId(id, title) {
    const item = findItem(id);
    return item
      ? manualClassroomRoute({ practiceId: item.id, title: item.title, path: item.path })
      : routeSnapshot({ id, title: title || id });
  }

  async function startedRouteFor(slot, user, date, currentRoute) {
    if (slot === 'grammarChallenge') {
      const active = readLocalJson(`grammar_challenge_active_v2_${user}`);
      if (active && [ 'in_progress', 'interrupted' ].includes(active.status)
          && String(active.startedAt || '').slice(0, 10) === date && active.challengeId) {
        return routeFromGrammarId(active.challengeId, active.challengeTitle);
      }
      if (typeof root.sbGet === 'function') {
        const daily = await withTimeout(root.sbGet(`grammar_challenge_daily_v1_${user}`), READ_TIMEOUT_MS, 'grammar daily read').catch(() => null);
        const record = daily && daily[date];
        if (record && record.challengeId && record.status && record.status !== 'not_started') {
          return routeFromGrammarId(record.challengeId, record.title || record.challengeTitle);
        }
      }
    }

    if (slot === 'classroomPractice') {
      let record = null;
      if (typeof root.loadStudentClassroomPracticeRecord === 'function') {
        record = await withTimeout(root.loadStudentClassroomPracticeRecord(user, date), READ_TIMEOUT_MS, 'classroom daily read').catch(() => null);
      } else if (typeof root.sbGet === 'function') {
        const daily = await withTimeout(root.sbGet(`classroom_practice_daily_v1_${user}`), READ_TIMEOUT_MS, 'classroom daily read').catch(() => null);
        record = daily && daily[date];
      }
      if (record && record.practiceId && record.status && record.status !== 'not_started') {
        return routeFromClassroomId(record.practiceId, record.title);
      }
    }

    return routeSnapshot(currentRoute && currentRoute[slot]);
  }

  let activeAssignmentContext = null;

  async function ensurePinnedSlot(slot) {
    if (typeof root.sbGet !== 'function' || typeof root.sbSet !== 'function') {
      throw new Error('route assignment storage unavailable');
    }
    await loadCoursewareData().catch(() => {});
    const user = currentStudent();
    const date = today();
    const key = assignmentKey(user);
    const assignment = normalizeAssignments(await withTimeout(root.sbGet(key), READ_TIMEOUT_MS, 'assignment read'));
    writeCachedAssignment(user, assignment);
    warmPracticeAssets(assignment, date);
    const day = assignment.dates[date] && typeof assignment.dates[date] === 'object'
      ? { ...assignment.dates[date] }
      : {};
    if (routeSnapshot(day[slot])) return { assignment, date, user };

    const route = typeof root.loadDailyLearningRoute === 'function'
      ? await root.loadDailyLearningRoute({ force: false, reason: 'assignment-pin' })
      : root.getDailyLearningRoute && root.getDailyLearningRoute();
    const selected = await startedRouteFor(slot, user, date, route);
    if (!selected) throw new Error(`${slot} route unavailable`);
    day[slot] = selected;
    day.updatedAt = new Date().toISOString();
    assignment.dates[date] = day;
    await withTimeout(root.sbSet(key, assignment), VERIFY_TIMEOUT_MS, 'assignment save');
    writeCachedAssignment(user, assignment);
    warmPracticeAssets(assignment, date);
    return { assignment, date, user };
  }

  function syncPinnedSlotInBackground(slot) {
    return ensurePinnedSlot(slot).catch(error => {
      console.warn('daily route assignment background sync unavailable', error);
      return null;
    });
  }

  function installRouteAssignmentWrappers() {
    if (typeof root.loadDailyLearningRoute === 'function' && !root.loadDailyLearningRoute.__dailyRouteAssignmentWrapped) {
      const original = root.loadDailyLearningRoute;
      const wrapped = async function assignmentAwareLoadRoute() {
        const route = await original.apply(this, arguments);
        return activeAssignmentContext
          ? mergePinnedRoute(route, activeAssignmentContext.assignment, activeAssignmentContext.date)
          : route;
      };
      wrapped.__dailyRouteAssignmentWrapped = true;
      root.loadDailyLearningRoute = wrapped;
    }

    if (typeof root.getDailyLearningRoute === 'function' && !root.getDailyLearningRoute.__dailyRouteAssignmentWrapped) {
      const original = root.getDailyLearningRoute;
      const wrapped = function assignmentAwareGetRoute() {
        const route = original.apply(this, arguments);
        return activeAssignmentContext
          ? mergePinnedRoute(route, activeAssignmentContext.assignment, activeAssignmentContext.date)
          : route;
      };
      wrapped.__dailyRouteAssignmentWrapped = true;
      root.getDailyLearningRoute = wrapped;
    }

    const wrapEntry = (name, slot, failureMessage) => {
      const original = root[name];
      if (typeof original !== 'function' || original.__dailyRouteAssignmentWrapped) return;
      const wrapped = async function assignmentAwareStudentEntry() {
        const user = currentStudent();
        const date = today();
        const cachedAssignment = readCachedAssignment(user);
        activeAssignmentContext = { assignment: cachedAssignment, date, user };
        syncPinnedSlotInBackground(slot);
        try {
          return await wrapped.__dailyRouteAssignmentOriginal.apply(this, arguments);
        } catch (error) {
          console.warn('daily route entry unavailable', error);
          const notice = document.getElementById('studentHomeNotice');
          if (notice) {
            notice.textContent = failureMessage;
            notice.hidden = false;
          } else {
            root.alert?.(failureMessage);
          }
          return undefined;
        } finally {
          activeAssignmentContext = null;
        }
      };
      wrapped.__dailyRouteAssignmentWrapped = true;
      // Keep the inner entry replaceable. Student attempt controls and this
      // assignment layer load independently, so either can arrive first on a
      // cold start without one wrapper silently displacing the other.
      wrapped.__dailyRouteAssignmentOriginal = original;
      root[name] = wrapped;
    };

    wrapEntry('openStudentGrammarChallenge', 'grammarChallenge', '今日语法挑战暂时无法固定，请检查网络后重试。');
    wrapEntry('openStudentClassroomPractice', 'classroomPractice', '今日随堂练习暂时无法固定，请检查网络后重试。');
  }

  function openManualGrammar(id) {
    const practiceId = String(id || '').startsWith(PREFIX) ? String(id).slice(PREFIX.length) : '';
    if (!practiceId) return false;
    loadCoursewareData().then(async () => {
      const item = findItem(practiceId);
      if (!item) throw new Error('practice not found');
      const compatibility = await verifyGrammarCompatibility(item);
      if (compatibility.state !== 'compatible') throw new Error('practice is not grammar-compatible');
      const route = root.getDailyLearningRoute && root.getDailyLearningRoute();
      const routeTitle = route && route.grammarChallenge && route.grammarChallenge.id === id
        ? route.grammarChallenge.title
        : '';
      const frame = document.getElementById('grammarChallengeFrame');
      const heading = document.getElementById('grammarChallengeTitle');
      if (heading) heading.textContent = String(routeTitle || item.title).replace(/随堂练习/g, '语法挑战');
      if (frame) frame.src = `grammar-challenge/practices/courseware-daily.html?${new URLSearchParams({ source: item.path, practiceId: item.id, title: item.title })}`;
      document.body.classList.add('grammar-challenge-open');
      root.showScreen('screenGrammarChallengePlayer');
    }).catch(() => root.alert?.('这条随堂练习缺少可转换题目数据，暂时不能作为语法挑战打开。'));
    return true;
  }
  root.openManualGrammarChallenge = openManualGrammar;

  function addPanel() {
    if (document.getElementById('teacherDailyRoutePanel')) return;
    const home = document.getElementById('screenHome');
    if (!home) return;
    const panel = document.createElement('section');
    panel.id = 'teacherDailyRoutePanel';
    panel.className = 'teacher-dashboard-card teacher-dashboard-card--route teacher-only';
    panel.innerHTML = `
      <h2>今日学习安排</h2><p>自动安排继续保留；这里只手动替换今天。选择“自动安排”即可恢复。</p>
      <div class="daily-route-grid">
        <div class="daily-route-field"><label for="teacherGrammarOverride">今日语法挑战</label><select id="teacherGrammarOverride"><option value="">自动安排</option></select><small>仅可选择含标准题目数据的随堂练习，最多抽取 10 题。</small></div>
        <div class="daily-route-field"><label for="teacherClassroomOverride">今日随堂练习</label><select id="teacherClassroomOverride"><option value="">自动安排</option></select><small>学生首页直接进入所选练习。</small></div>
      </div>
      <div class="daily-route-actions"><span id="teacherDailyRouteStatus"></span><button class="daily-route-refresh" id="teacherDailyRouteRefresh">重新读取</button><button class="daily-route-save" id="teacherDailyRouteSave">保存今日安排</button></div>`;
    const grid = document.getElementById('teacherDashboardGrid');
    const anchor = document.getElementById('currentModeBadge');
    if (grid) grid.appendChild(panel);
    else if (anchor && anchor.parentNode === home) anchor.insertAdjacentElement('afterend', panel);
    else home.prepend(panel);
    panel.querySelector('#teacherDailyRouteRefresh').onclick = refreshPanel;
    panel.querySelector('#teacherDailyRouteSave').onclick = savePanel;
  }

  const status = text => {
    const el = document.getElementById('teacherDailyRouteStatus');
    if (el) el.textContent = text || '';
  };

  const classroomOption = item => new Option(item.title, item.id);

  async function refreshPanel() {
    addPanel();
    status('正在读取并检查可转换练习…');
    try {
      await loadCoursewareData();
      const store = normalize(typeof root.sbGet === 'function'
        ? await withTimeout(root.sbGet(KEY), READ_TIMEOUT_MS, 'override panel read')
        : await readDirect());
      writeCachedOverride(store);
      warmPracticeAssets(store);
      const day = store.dates[today()] || {};
      const grammar = document.getElementById('teacherGrammarOverride');
      const classroom = document.getElementById('teacherClassroomOverride');
      classroom.replaceChildren(new Option('自动安排', ''), ...items().map(classroomOption));

      const checks = await mapWithLimit(items(), 6, verifyGrammarCompatibility);
      const grammarOptions = items().map((item, index) => {
        const check = checks[index];
        const suffix = check.state === 'compatible'
          ? ''
          : check.state === 'incompatible' ? '（缺少标准题目数据）' : '（暂时无法验证）';
        const option = new Option(item.title + suffix, item.id);
        option.disabled = check.state !== 'compatible';
        return option;
      });
      grammar.replaceChildren(new Option('自动安排', ''), ...grammarOptions);
      grammar.value = day.grammarChallenge && day.grammarChallenge.practiceId || '';
      classroom.value = day.classroomPractice && day.classroomPractice.practiceId || '';
      const incompatibleCount = checks.filter(item => item.state === 'incompatible').length;
      const unverifiedCount = checks.filter(item => item.state === 'unverified').length;
      const base = day.grammarChallenge || day.classroomPractice ? '今天有手动替换。' : '今天使用自动安排。';
      const details = [
        incompatibleCount ? `已禁用 ${incompatibleCount} 条不可转换练习。` : '',
        unverifiedCount ? `另有 ${unverifiedCount} 条暂时无法验证，请重新读取。` : ''
      ].filter(Boolean).join(' ');
      status(details ? `${base} ${details}` : base);
    } catch (_) {
      status('读取失败，请检查网络。');
    }
  }

  const snap = id => {
    const item = findItem(id);
    return item ? { practiceId: item.id, title: item.title, path: item.path } : null;
  };

  async function savePanel() {
    if (typeof root.canWriteCloudData === 'function' && !root.canWriteCloudData()) return;
    status('正在保存…');
    try {
      const grammarId = document.getElementById('teacherGrammarOverride').value;
      const grammarItem = findItem(grammarId);
      if (grammarItem) {
        const compatibility = await verifyGrammarCompatibility(grammarItem);
        if (compatibility.state !== 'compatible') {
          status('该练习缺少标准题目数据，不能保存为语法挑战。');
          return;
        }
      }
      const store = normalize(await withTimeout(root.sbGet(KEY), READ_TIMEOUT_MS, 'override save read'));
      const grammar = snap(grammarId);
      const classroom = snap(document.getElementById('teacherClassroomOverride').value);
      if (grammar || classroom) {
        store.dates[today()] = {
          grammarChallenge: grammar || undefined,
          classroomPractice: classroom || undefined,
          updatedAt: new Date().toISOString()
        };
      } else {
        delete store.dates[today()];
      }
      await withTimeout(root.sbSet(KEY, store), VERIFY_TIMEOUT_MS, 'override save');
      writeCachedOverride(store);
      warmPracticeAssets(store);
      status(grammar || classroom ? '今日手动安排已保存。' : '已恢复自动安排。');
    } catch (error) {
      status('保存失败，请重试。');
      if (typeof root.showStorageError === 'function') root.showStorageError(error);
    }
  }

  addPanel();
  document.addEventListener('click', event => {
    if (event.target && event.target.closest && event.target.closest('#uBtnTeacher')) root.setTimeout(refreshPanel, 0);
  });
  try { if (typeof root.isTeacher === 'function' && root.isTeacher()) refreshPanel(); } catch (_) {}

  [0, 120, 400, 1000, 2300, 3500].forEach(delay => {
    root.setTimeout(installRouteAssignmentWrappers, delay);
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
