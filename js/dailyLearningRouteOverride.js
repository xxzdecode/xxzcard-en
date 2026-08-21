(function (root) {
  'use strict';
  const KEY = 'daily_learning_route_override_v1';
  const PREFIX = 'manual-courseware::';
  const OVERRIDE_CACHE_KEY = 'daily_learning_route_override_cache_v1';
  const ROUTE_CACHE_KEY = 'daily_learning_route_cache_v1';
  const READ_TIMEOUT_MS = 1800;
  const VERIFY_TIMEOUT_MS = 2200;
  const baseFetch = typeof root.fetch === 'function' ? root.fetch.bind(root) : null;

  const LEGACY_GRAMMAR_SELECTIONS = Object.freeze({
    'courseware-2026-08-21-adjectives-linking-verbs': {
      id: 'grammar-2026-08-22-adjectives-linking-verbs-review',
      title: '形容词与系动词复习挑战',
      lessonKey: 'adjectives-linking-verbs'
    },
    'courseware-2026-08-20-pronoun-system': {
      id: 'grammar-2026-08-21-pronoun-system-review',
      title: '人称代词系统复习挑战',
      lessonKey: 'pronoun-system'
    },
    'courseware-2026-08-19-although': {
      id: 'grammar-2026-08-20-although-review',
      title: 'although 让步转折复习挑战',
      lessonKey: 'although'
    },
    'courseware-2026-08-18-why-because-so': {
      id: 'grammar-2026-08-19-why-because-so-review',
      title: 'why / because / so 复习挑战',
      lessonKey: 'why-because-so'
    },
    'courseware-2026-08-06': {
      id: 'grammar-2026-08-18-place-prepositions-review',
      title: '地点介词上与下复习挑战',
      lessonKey: 'place-prepositions-on-over-above-under-below'
    },
    'courseware-2026-08-04': {
      id: 'grammar-2026-08-06-time-prepositions-review',
      title: '时间介词快速挑战',
      lessonKey: 'time-prepositions-in-on-at'
    },
    'courseware-2026-08-03': {
      id: 'grammar-2026-08-04-cardinal-ordinal-review',
      title: '数字排队快速挑战',
      lessonKey: 'cardinal-ordinal-numbers-basics'
    },
    'courseware-2026-08-02-word-family-basics': {
      id: 'grammar-2026-08-03-word-family-review',
      title: '词族侦探快速挑战',
      lessonKey: 'word-family-basics'
    },
    'courseware-2026-08-01-adverb-basics-ly': {
      id: 'grammar-2026-08-02-adverb-review',
      title: '副词侦探快速挑战',
      lessonKey: 'adverb-basics-ly'
    }
  });

  function latestLegacySelection(value) {
    const dates = value && typeof value === 'object' && value.dates && typeof value.dates === 'object'
      ? value.dates
      : {};
    return Object.entries(dates)
      .filter(([, entry]) => entry && typeof entry === 'object')
      .sort((left, right) => {
        const leftTime = Date.parse(String(left[1].updatedAt || ''));
        const rightTime = Date.parse(String(right[1].updatedAt || ''));
        if (Number.isFinite(leftTime) || Number.isFinite(rightTime)) {
          return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
        }
        return right[0].localeCompare(left[0]);
      })[0]?.[1] || null;
  }

  const normalize = value => {
    const source = value && typeof value === 'object' ? value : {};
    const current = source.current && typeof source.current === 'object'
      ? source.current
      : latestLegacySelection(source);
    return {
      schemaVersion: 2,
      current: current && typeof current === 'object' ? { ...current } : null
    };
  };

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

  function readCachedRoute() {
    try {
      const envelope = JSON.parse(root.localStorage?.getItem(ROUTE_CACHE_KEY) || 'null');
      return envelope && envelope.route && typeof envelope.route === 'object'
        ? envelope.route
        : null;
    } catch (_) {
      return null;
    }
  }

  function warmPracticeAssets(value) {
    if (!baseFetch || typeof root.location === 'undefined') return;
    const source = normalize(value).current;
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
    if (value && value.lessonKey && value.id) {
      return {
        ...routeSnapshot(value),
        source: 'manual-grammar-selection',
        reviewLessonKey: String(value.lessonKey),
        lessonKey: String(value.lessonKey)
      };
    }
    const practice = snapshot(value);
    if (!practice) return null;
    const mapped = LEGACY_GRAMMAR_SELECTIONS[practice.practiceId];
    if (mapped) {
      return {
        ...mapped,
        displayTitle: mapped.title.replace(/复习挑战|快速挑战/g, '').trim(),
        reviewLessonKey: mapped.lessonKey,
        source: 'manual-grammar-selection',
        sourcePracticeId: practice.practiceId,
        sourcePath: practice.path
      };
    }
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

  function mergeRoute(route, store) {
    if (!route || typeof route !== 'object') return route;
    const current = normalize(store).current;
    if (!current || typeof current !== 'object') return route;
    const grammar = manualGrammarRoute(current.grammarChallenge);
    const classroom = manualClassroomRoute(current.classroomPractice);
    if (!grammar && !classroom) return route;
    const next = {
      ...route,
      updatedAt: current.updatedAt || route.updatedAt || '',
      manualSelection: { updatedAt: current.updatedAt || '' }
    };
    if (grammar) next.grammarChallenge = grammar;
    if (classroom) next.classroomPractice = classroom;
    return next;
  }

  function hasPracticeData(html) {
    return /\bid\s*=\s*["']practice-data["']/i.test(String(html || ''));
  }

  const api = {
    KEY,
    PREFIX,
    READ_TIMEOUT_MS,
    VERIFY_TIMEOUT_MS,
    mergeRoute,
    normalize,
    routeSnapshot,
    hasPracticeData,
    latestLegacySelection
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

  async function readDirect(timeoutMs = READ_TIMEOUT_MS) {
    if (typeof SB_URL === 'undefined' || typeof SB_HEADERS === 'undefined') return null;
    const limit = Math.max(READ_TIMEOUT_MS, Number(timeoutMs) || READ_TIMEOUT_MS);
    const response = await timedFetch(`${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(KEY)}&select=value`, {
      headers: SB_HEADERS,
      cache: 'no-store'
    }, limit, 'override read');
    if (!response.ok) throw new Error(`override HTTP ${response.status}`);
    const rows = await withTimeout(response.json(), limit, 'override json');
    return rows && rows.length ? rows[0].value : null;
  }

  let routeRefreshTimer = 0;

  function notifyOverrideUpdated() {
    root.dispatchEvent?.(new CustomEvent('daily-route-override-updated'));
    if (routeRefreshTimer) root.clearTimeout(routeRefreshTimer);
    routeRefreshTimer = root.setTimeout(() => {
      routeRefreshTimer = 0;
      if (typeof root.loadDailyLearningRoute === 'function') {
        root.loadDailyLearningRoute({ force: true, reason: 'override-updated' }).catch?.(() => null);
      }
    }, 150);
  }

  root.fetch = async function (input, init) {
    let path = '';
    try { path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname; } catch (_) {}
    if (!path.endsWith('/data/daily-learning-route.json')) return baseFetch(input, init);

    const [routeResult, freshResult] = await Promise.all([
      Promise.resolve()
        .then(() => baseFetch(input, init))
        .then(response => ({ ok: true, response }))
        .catch(error => ({ ok: false, error })),
      readDirect().then(value => ({ ok: true, value })).catch(error => ({ ok: false, error }))
    ]);
    const response = routeResult.response || null;
    try {
      const automatic = response && response.ok
        ? await response.clone().json()
        : readCachedRoute();
      if (!automatic || typeof automatic !== 'object') {
        if (response) return response;
        throw routeResult.error || new Error('daily route unavailable');
      }
      const selected = freshResult.ok ? normalize(freshResult.value) : readCachedOverride();
      if (freshResult.ok) {
        writeCachedOverride(selected);
        warmPracticeAssets(selected);
      } else {
        console.warn('daily route selection sync unavailable', freshResult.error);
      }
      const merged = mergeRoute(automatic, selected);
      return new Response(JSON.stringify(merged), {
        status: response && response.ok ? response.status : 200,
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Cache-Control': 'no-store' }
      });
    } catch (error) {
      console.warn('daily route override unavailable', error);
      if (response) return response;
      throw error;
    }
  };

  const items = () => Array.isArray(root.CLASSROOM_PRACTICE_ITEMS)
    ? root.CLASSROOM_PRACTICE_ITEMS
    : Array.isArray(root.COURSEWARE_ITEMS) ? root.COURSEWARE_ITEMS : [];
  const findItem = id => items().find(item => String(item.id) === String(id));
  const grammarItems = () => {
    const bankIds = new Set((root.GRAMMAR_QUESTION_BANK?.items || []).map(item => String(item.sourceChallengeId || '')));
    return (Array.isArray(root.GRAMMAR_CHALLENGE_CATALOG) ? root.GRAMMAR_CHALLENGE_CATALOG : [])
      .filter(item => item && item.id && item.lessonKey && bankIds.has(String(item.id)));
  };

  async function loadCoursewareData() {
    if (items().length) return;
    for (let attempt = 0; attempt < 60 && typeof root.loadFeatureScript !== 'function'; attempt += 1) {
      await new Promise(resolve => root.setTimeout(resolve, 50));
    }
    if (typeof root.loadFeatureScript !== 'function') throw new Error('courseware loader unavailable');
    await root.loadFeatureScript('js/courseware-data.js');
  }

  async function loadGrammarSelectionData() {
    for (let attempt = 0; attempt < 60 && typeof root.loadFeatureGroup !== 'function'; attempt += 1) {
      await new Promise(resolve => root.setTimeout(resolve, 50));
    }
    if (typeof root.loadFeatureGroup !== 'function') throw new Error('grammar loader unavailable');
    await Promise.all([
      root.loadFeatureGroup('grammarChallenge'),
      root.loadFeatureGroup('grammarAdaptive')
    ]);
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
      <h2>当前学习安排</h2><p>这里只使用你手动保存的选择；不按日期自动切换。下次修改前会一直保持不变。</p>
      <div class="daily-route-grid">
        <div class="daily-route-field"><label for="teacherGrammarOverride">语法挑战近期知识</label><select id="teacherGrammarOverride"></select><small>固定 20 题：所选近期知识 10 题 + 历史知识 10 题。</small></div>
        <div class="daily-route-field"><label for="teacherClassroomOverride">随堂练习</label><select id="teacherClassroomOverride"></select><small>学生首页始终进入最后一次保存的练习。</small></div>
      </div>
      <div class="daily-route-actions"><span id="teacherDailyRouteStatus"></span><button class="daily-route-refresh" id="teacherDailyRouteRefresh">重新读取</button><button class="daily-route-save" id="teacherDailyRouteSave">保存当前安排</button></div>`;
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

  function grammarSelection(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.id && value.lessonKey) return routeSnapshot(value);
    const practiceId = String(value.practiceId || value.sourcePracticeId || '').trim();
    return practiceId ? LEGACY_GRAMMAR_SELECTIONS[practiceId] || null : null;
  }

  function grammarSnap(id) {
    const item = grammarItems().find(entry => String(entry.id) === String(id));
    return item ? {
      id: item.id,
      title: item.title,
      displayTitle: String(item.title || '').replace(/复习挑战|快速挑战|｜语法挑战/g, '').trim(),
      lessonKey: item.lessonKey,
      reviewLessonKey: item.lessonKey,
      source: 'manual-grammar-selection'
    } : null;
  }

  async function refreshPanel() {
    addPanel();
    status('正在读取最后一次保存的安排…');
    try {
      await Promise.all([loadCoursewareData(), loadGrammarSelectionData()]);
      const store = normalize(typeof root.sbGet === 'function'
        ? await withTimeout(root.sbGet(KEY), READ_TIMEOUT_MS, 'override panel read')
        : await readDirect());
      writeCachedOverride(store);
      warmPracticeAssets(store);
      const current = store.current || {};
      const grammar = document.getElementById('teacherGrammarOverride');
      const classroom = document.getElementById('teacherClassroomOverride');
      const availableGrammar = grammarItems();
      grammar.replaceChildren(...availableGrammar.map(item => new Option(item.title, item.id)));
      classroom.replaceChildren(...items().map(classroomOption));

      const selectedGrammar = grammarSelection(current.grammarChallenge);
      const selectedGrammarId = selectedGrammar && selectedGrammar.id;
      grammar.value = availableGrammar.some(item => item.id === selectedGrammarId)
        ? selectedGrammarId
        : availableGrammar[0]?.id || '';
      const selectedClassroomId = current.classroomPractice && current.classroomPractice.practiceId;
      classroom.value = items().some(item => item.id === selectedClassroomId)
        ? selectedClassroomId
        : items()[0]?.id || '';
      status(current.grammarChallenge && current.classroomPractice
        ? '已读取最后一次保存的安排。'
        : '请选择两项内容并保存。');
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
      await Promise.all([loadCoursewareData(), loadGrammarSelectionData()]);
      const grammar = grammarSnap(document.getElementById('teacherGrammarOverride').value);
      const classroom = snap(document.getElementById('teacherClassroomOverride').value);
      if (!grammar || !classroom) {
        status('请完整选择语法挑战和随堂练习。');
        return;
      }
      const store = {
        schemaVersion: 2,
        current: {
          grammarChallenge: grammar,
          classroomPractice: classroom,
          updatedAt: new Date().toISOString()
        }
      };
      await withTimeout(root.sbSet(KEY, store), VERIFY_TIMEOUT_MS, 'override save');
      writeCachedOverride(store);
      warmPracticeAssets(store);
      notifyOverrideUpdated();
      status('当前安排已保存，学生网页会读取这次选择。');
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
})(typeof globalThis !== 'undefined' ? globalThis : window);
