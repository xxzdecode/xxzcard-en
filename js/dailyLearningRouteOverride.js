(function (root) {
  'use strict';
  const KEY = 'daily_learning_route_override_v1';
  const PREFIX = 'manual-courseware::';
  const OVERRIDE_CACHE_KEY = 'daily_learning_route_override_cache_v1';
  const ROUTE_CACHE_KEY = 'daily_learning_route_cache_v1';
  const READ_TIMEOUT_MS = 1800;
  const REMOTE_REFRESH_TIMEOUT_MS = 5000;
  const REFRESH_MIN_INTERVAL_MS = 15000;
  const VERIFY_TIMEOUT_MS = 2200;
  const baseFetch = typeof root.fetch === 'function' ? root.fetch.bind(root) : null;

  const LEGACY_GRAMMAR_SELECTIONS = Object.freeze({
    'courseware-2026-08-28-classroom-english-grammar-language': {
      id: 'grammar-2026-08-28-parts-of-speech-review',
      title: '课堂英语与语法术语',
      lessonKey: 'parts-of-speech-map'
    },
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
    },
    'courseware-2026-07-30': {
      id: 'grammar-2026-07-31-parts-of-speech-review',
      title: '词性地图',
      lessonKey: 'parts-of-speech-map'
    },
    'courseware-2026-07-27': {
      id: 'grammar-2026-07-30-possessive-pronouns-review',
      title: 'my 与 mine',
      lessonKey: 'possessive-pronouns-basic'
    },
    'courseware-2026-07-26-subject-object-pronouns': {
      id: 'grammar-2026-07-27-subject-object-review',
      title: '主格与宾格代词',
      lessonKey: 'subject-object-pronouns'
    },
    'courseware-2026-07-25-possessive-whose-of': {
      id: 'grammar-2026-07-26-possessive-whose-of-review',
      title: '所属关系',
      lessonKey: 'possession-choice'
    },
    'courseware-2026-07-24-can-there-be-it': {
      id: 'grammar-2026-07-25-can-there-be-it-review',
      title: 'can、there be 与 it',
      lessonKey: 'can-there-be-it'
    },
    'courseware-2026-07-24-frequency-adverbs': {
      id: 'grammar-2026-07-24-frequency-review',
      title: '频度副词',
      lessonKey: 'frequency-adverbs'
    },
    'courseware-2026-07-23-special-questions': {
      id: 'grammar-2026-07-24-special-questions',
      title: '特殊疑问句',
      lessonKey: 'wh-question-method'
    },
    'courseware-2026-07-22-simple-present-2': {
      id: 'grammar-2026-07-23-simple-present-2',
      title: '一般现在时第二课',
      lessonKey: 'simple-present-negative-question'
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
    if (!current || typeof current !== 'object') return { schemaVersion: 3, current: null };
    const next = { ...current };
    const currentCourse = typeof next.currentCourse === 'object'
      ? String(next.currentCourse.lessonKey || next.currentCourse.courseKey || next.currentCourse.questionBankKey || '').trim()
      : String(next.currentCourse || '').trim();
    if (currentCourse) next.currentCourse = currentCourse;
    else delete next.currentCourse;
    return { schemaVersion: 3, current: next };
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
    const currentCourse = resolveCurrentCourse(source.currentCourse);
    if (currentCourse?.classroomPracticePath) paths.add(currentCourse.classroomPracticePath);
    ['currentCourse', 'grammarChallenge', 'classroomPractice'].forEach(slot => {
      const path = String(source[slot] && source[slot].path || '').trim();
      const coursePath = String(source[slot] && source[slot].classroomPracticePath || '').trim();
      if (path) paths.add(path);
      if (coursePath) paths.add(coursePath);
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
      'sourcePath', 'date', 'lessonKey', 'courseKey', 'questionBankKey', 'path', 'lessonTitle', 'updatedAt'
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

  function currentCourseSnapshot(value) {
    if (!value || typeof value !== 'object') return null;
    const lessonKey = String(value.lessonKey || value.courseKey || value.questionBankKey || '').trim();
    const practiceId = String(value.classroomPracticeId || value.practiceId || '').trim();
    const path = String(value.classroomPracticePath || value.path || '').trim();
    const displayName = String(value.displayTitle || value.displayName || value.title || '').trim();
    if (!lessonKey || !practiceId || !path || !displayName) return null;
    return {
      courseKey: lessonKey,
      lessonKey,
      questionBankKey: lessonKey,
      lessonDate: String(value.lessonDate || value.date || '').trim(),
      displayName,
      displayTitle: displayName,
      classroomPracticeId: practiceId,
      classroomPracticePath: path
    };
  }

  function resolveCurrentCourse(value) {
    const lessonKey = String(
      value && typeof value === 'object'
        ? value.lessonKey || value.courseKey || value.questionBankKey || ''
        : value || ''
    ).trim();
    if (!lessonKey) return null;
    const courses = typeof root.GrammarAdaptiveChallenge?.courseCatalog === 'function'
      ? root.GrammarAdaptiveChallenge.courseCatalog(root.GRAMMAR_COURSE_QUESTION_BANKS || root.GRAMMAR_QUESTION_BANK)
      : [];
    const course = courses.find(item => item.lessonKey === lessonKey);
    if (!course) return null;
    const practices = Array.isArray(root.CLASSROOM_PRACTICE_ITEMS)
      ? root.CLASSROOM_PRACTICE_ITEMS
      : Array.isArray(root.COURSEWARE_ITEMS) ? root.COURSEWARE_ITEMS : [];
    const directId = String(course.classroomPracticeId || course.source && course.source.classroomPracticeId || '').trim();
    const directPath = String(course.classroomPracticePath || course.source && course.source.classroomPracticePath || '').trim();
    const practice = directId
      ? practices.find(item => String(item.id) === directId)
      : directPath
        ? practices.find(item => String(item.path) === directPath)
        : practices.find(item => String(item.lessonKey || item.courseKey || item.questionBankKey || '').trim() === lessonKey);
    if (!practice) return null;
    return currentCourseSnapshot({
      ...course,
      displayTitle: String(practice.title || course.displayTitle || course.displayName || lessonKey).trim(),
      classroomPracticeId: practice && practice.id || directId,
      classroomPracticePath: practice && practice.path || directPath
    });
  }

  function routeFromCurrentCourse(value) {
    const course = resolveCurrentCourse(value);
    if (!course) return null;
    return {
      currentCourse: course,
      grammarChallenge: {
        id: `grammar-course::${course.lessonKey}`,
        title: `${course.displayName}｜语法挑战`,
        displayTitle: course.displayName,
        lessonKey: course.lessonKey,
        reviewLessonKey: course.lessonKey,
        courseKey: course.lessonKey,
        questionBankKey: course.lessonKey,
        date: course.lessonDate,
        source: 'current-course'
      },
      classroomPractice: {
        id: course.classroomPracticeId,
        title: course.displayName,
        displayTitle: course.displayName,
        lessonTitle: course.displayName,
        lessonKey: course.lessonKey,
        courseKey: course.lessonKey,
        questionBankKey: course.lessonKey,
        source: 'current-course',
        path: course.classroomPracticePath
      }
    };
  }

  function buildCourseOptions(courseValues, practiceValues) {
    const practices = Array.isArray(practiceValues) ? practiceValues : [];
    return (Array.isArray(courseValues) ? courseValues : []).filter(course => course && course.selectable !== false)
      .map(course => {
        const lessonKey = String(course.lessonKey || course.courseKey || course.questionBankKey || '').trim();
        const source = course.source && typeof course.source === 'object' ? course.source : {};
        const directId = String(course.classroomPracticeId || source.classroomPracticeId || '').trim();
        const directPath = String(course.classroomPracticePath || source.classroomPracticePath || '').trim();
        const practice = directId
          ? practices.find(item => String(item.id) === directId)
          : directPath
            ? practices.find(item => String(item.path) === directPath)
            : practices.find(item => String(
              item.lessonKey || item.courseKey || item.questionBankKey
              || LEGACY_GRAMMAR_SELECTIONS[item.id]?.lessonKey
              || ''
            ).trim() === lessonKey);
        return {
          ...course,
          lessonKey,
          displayTitle: String(practice && practice.title || course.displayTitle || course.displayName || course.title || lessonKey).trim(),
          classroomPracticeId: practice && practice.id || directId,
          classroomPracticePath: practice && practice.path || directPath,
          practiceOrder: practice ? practices.indexOf(practice) : Number.MAX_SAFE_INTEGER
        };
      })
      .filter(course => course.lessonKey && course.classroomPracticeId && course.classroomPracticePath)
      .sort((left, right) => left.practiceOrder - right.practiceOrder
        || String(right.lessonDate || '').localeCompare(String(left.lessonDate || ''))
        || String(left.displayTitle || '').localeCompare(String(right.displayTitle || ''), 'zh-CN'));
  }

  function mergeRoute(route, store) {
    if (!route || typeof route !== 'object') return route;
    const current = normalize(store).current;
    if (!current || typeof current !== 'object') return route;
    const unified = routeFromCurrentCourse(current.currentCourse);
    const grammar = manualGrammarRoute(current.grammarChallenge);
    const classroom = manualClassroomRoute(current.classroomPractice);
    if (!unified && !grammar && !classroom) return route;
    const next = {
      ...route,
      updatedAt: current.updatedAt || route.updatedAt || '',
      manualSelection: { updatedAt: current.updatedAt || '' }
    };
    if (unified) {
      next.currentCourse = unified.currentCourse;
      next.grammarChallenge = unified.grammarChallenge;
      next.classroomPractice = unified.classroomPractice;
      return next;
    }
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
    REMOTE_REFRESH_TIMEOUT_MS,
    VERIFY_TIMEOUT_MS,
    mergeRoute,
    normalize,
    routeSnapshot,
    currentCourseSnapshot,
    resolveCurrentCourse,
    routeFromCurrentCourse,
    buildCourseOptions,
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

  function notifyOverrideUpdated() {
    root.dispatchEvent?.(new CustomEvent('daily-route-override-updated'));
  }

  let overrideRefreshPromise = null;
  let lastOverrideRefreshAt = 0;

  function hasManualSelection(value) {
    const current = normalize(value).current;
    return !!(current
      && (routeFromCurrentCourse(current.currentCourse)
        || (manualGrammarRoute(current.grammarChallenge) && manualClassroomRoute(current.classroomPractice))));
  }

  function refreshOverrideFromCloud(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const now = Date.now();
    if (overrideRefreshPromise) return overrideRefreshPromise;
    if (settings.force !== true && now - lastOverrideRefreshAt < REFRESH_MIN_INTERVAL_MS) {
      return Promise.resolve(readCachedOverride());
    }
    lastOverrideRefreshAt = now;
    overrideRefreshPromise = readDirect(REMOTE_REFRESH_TIMEOUT_MS)
      .then(async value => {
        const fresh = normalize(value);
        if (typeof fresh.current?.currentCourse === 'string') {
          await Promise.all([loadCoursewareData(), loadGrammarSelectionData()]);
        }
        if (!hasManualSelection(fresh)) throw new Error('manual route selection is missing');
        const changed = writeCachedOverride(fresh);
        if (changed || settings.notifyAlways === true) notifyOverrideUpdated();
        return fresh;
      })
      .catch(error => {
        root.dispatchEvent?.(new CustomEvent('daily-route-override-refresh-failed', { detail: error }));
        throw error;
      })
      .finally(() => {
        overrideRefreshPromise = null;
      });
    overrideRefreshPromise.catch(error => {
      console.warn('daily route selection sync unavailable', error && (error.message || error));
    });
    return overrideRefreshPromise;
  }

  root.refreshDailyLearningRouteOverride = refreshOverrideFromCloud;

  root.fetch = async function (input, init) {
    let path = '';
    try { path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname; } catch (_) {}
    if (!path.endsWith('/data/daily-learning-route.json')) return baseFetch(input, init);

    const routeResult = await Promise.resolve()
      .then(() => baseFetch(input, init))
      .then(response => ({ ok: true, response }))
      .catch(error => ({ ok: false, error }));
    const response = routeResult.response || null;
    try {
      const automatic = response && response.ok
        ? await response.clone().json()
        : readCachedRoute();
      if (!automatic || typeof automatic !== 'object') {
        if (response) return response;
        throw routeResult.error || new Error('daily route unavailable');
      }
      const selected = readCachedOverride();
      if (typeof selected.current?.currentCourse === 'string') {
        await Promise.all([loadCoursewareData(), loadGrammarSelectionData()]);
      }
      const hasCachedManualSelection = hasManualSelection(selected);
      const merged = hasCachedManualSelection
        ? mergeRoute(automatic, selected)
        : { ...automatic, manualSelectionPending: true };
      refreshOverrideFromCloud({ force: true, reason: 'route-request' }).catch(() => null);
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

  function courseItems() {
    const courses = typeof root.GrammarAdaptiveChallenge?.courseCatalog === 'function'
      ? root.GrammarAdaptiveChallenge.courseCatalog(root.GRAMMAR_COURSE_QUESTION_BANKS || root.GRAMMAR_QUESTION_BANK)
      : [];
    return buildCourseOptions(courses, items());
  }

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
    if (typeof root.loadGrammarCourseQuestionBank === 'function') {
      await root.loadGrammarCourseQuestionBank();
    }
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
      <h2>当前课程</h2><p>选择一节已备课课程；随堂练习和语法挑战会共同读取这节课的题库。选择不会自动标记为已授课。</p>
      <div class="daily-route-grid">
        <div class="daily-route-field"><label for="teacherCurrentCourse">当前课程</label><select id="teacherCurrentCourse"></select><small>固定 15 道计分题：当前课程 8 题 + 正式薄弱项 4 题 + 历史复习 3 题；不足由当前课程补齐。</small></div>
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

  const courseOption = item => new Option(
    [item.lessonDate, item.displayTitle || item.displayName].filter(Boolean).join('｜'),
    item.lessonKey
  );

  function grammarSelection(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.id && value.lessonKey) return routeSnapshot(value);
    const practiceId = String(value.practiceId || value.sourcePracticeId || '').trim();
    return practiceId ? LEGACY_GRAMMAR_SELECTIONS[practiceId] || null : null;
  }

  function courseSnap(id) {
    const item = courseItems().find(entry => String(entry.lessonKey) === String(id));
    return item ? {
      courseKey: item.lessonKey,
      lessonKey: item.lessonKey,
      questionBankKey: item.lessonKey,
      lessonDate: item.lessonDate || '',
      displayName: item.displayTitle || item.displayName,
      displayTitle: item.displayTitle || item.displayName,
      classroomPracticeId: item.classroomPracticeId,
      classroomPracticePath: item.classroomPracticePath
    } : null;
  }

  async function refreshPanel() {
    addPanel();
    status('正在读取最后一次保存的安排…');
    try {
      const [, , store] = await Promise.all([
        loadCoursewareData(),
        loadGrammarSelectionData(),
        refreshOverrideFromCloud({ force: true, reason: 'teacher-panel' })
      ]);
      writeCachedOverride(store);
      warmPracticeAssets(store);
      const current = store.current || {};
      const select = document.getElementById('teacherCurrentCourse');
      const availableCourses = courseItems();
      select.replaceChildren(...availableCourses.map(courseOption));
      const legacyGrammar = grammarSelection(current.grammarChallenge);
      const selectedLessonKey = String(
        typeof current.currentCourse === 'string' ? current.currentCourse
        : current.currentCourse && (current.currentCourse.lessonKey || current.currentCourse.courseKey)
        || legacyGrammar && legacyGrammar.lessonKey
        || ''
      );
      select.value = availableCourses.some(item => item.lessonKey === selectedLessonKey)
        ? selectedLessonKey
        : availableCourses[0]?.lessonKey || '';
      status(current.currentCourse
        ? '已读取最后一次保存的安排。'
        : current.grammarChallenge && current.classroomPractice
          ? '已读取旧安排；保存后会统一为当前课程。'
          : '请选择当前课程并保存。');
    } catch (_) {
      status('读取失败，请检查网络。');
    }
  }

  async function savePanel() {
    if (typeof root.canWriteCloudData === 'function' && !root.canWriteCloudData()) return;
    status('正在保存…');
    try {
      await Promise.all([loadCoursewareData(), loadGrammarSelectionData()]);
      const course = courseSnap(document.getElementById('teacherCurrentCourse').value);
      if (!course) {
        status('请选择一节题库完整的课程。');
        return;
      }
      const store = {
        schemaVersion: 3,
        current: {
          currentCourse: course.lessonKey,
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
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshOverrideFromCloud({ force: true, reason: 'visibility' }).catch(() => null);
    }
  });
  root.addEventListener?.('pageshow', () => {
    refreshOverrideFromCloud({ force: true, reason: 'pageshow' }).catch(() => null);
  });
  refreshOverrideFromCloud({ force: true, reason: 'startup' }).catch(() => null);
  try { if (typeof root.isTeacher === 'function' && root.isTeacher()) refreshPanel(); } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : window);
