(function installDailyLearningRoute(root) {
  'use strict';

  if (!root || typeof document === 'undefined' || root.__dailyLearningRouteInstalled) return;
  root.__dailyLearningRouteInstalled = true;

  const ROUTE_URL = 'data/daily-learning-route.json';
  const ROUTE_TIMEOUT_MS = 2800;
  const ROUTE_MAX_AGE_MS = 60 * 1000;
  const VISIBILITY_REFRESH_AGE_MS = 30 * 1000;
  const GRAMMAR_DAILY_KEY_PREFIX = 'grammar_challenge_daily_v1_';
  const DAILY_ROUTE_CACHE_KEY = 'daily_learning_route_cache_v1';

  const state = {
    status: 'idle',
    route: null,
    error: null,
    fetchedAt: 0,
    promise: null,
    grammarRecord: null,
    grammarRecords: null,
    grammarRecordStudent: '',
    classroomRecord: null,
    classroomRecordStudent: '',
    frameObservers: [],
    frameLoadHandlerInstalled: false,
    activeGrammarChallengeId: '',
    activeGrammarStudent: '',
    refreshingReason: ''
  };

  function currentStudent() {
    try {
      return typeof currentUser !== 'undefined' && currentUser === 'brother' ? 'brother' : 'sister';
    } catch (_) {
      return root.currentUser === 'brother' ? 'brother' : 'sister';
    }
  }

  function isTeacherMode() {
    try {
      return typeof root.isTeacher === 'function' ? root.isTeacher() : currentUser === 'teacher';
    } catch (_) {
      return root.currentUser === 'teacher';
    }
  }

  function todayKey() {
    const date = new Date();
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function installStyles() {
    if (document.getElementById('dailyLearningRouteStyles')) return;
    const style = document.createElement('style');
    style.id = 'dailyLearningRouteStyles';
    style.textContent = `
      .student-home-card[data-route-state="loading"]{cursor:wait;opacity:.78}
      .student-home-card[data-route-state="error"]{outline:2px dashed rgba(185,118,89,.35);outline-offset:-4px}
      .student-home-card[data-route-state="loading"] .student-home-card__scene{filter:saturate(.7)}
      .daily-learning-route-status{display:inline-flex;align-items:center;gap:5px}
      .daily-learning-route-status::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.65}
      .student-home-card[data-route-state="loading"] .daily-learning-route-status::before{animation:daily-route-pulse .8s ease-in-out infinite alternate}
      @keyframes daily-route-pulse{from{transform:scale(.72);opacity:.35}to{transform:scale(1.15);opacity:.9}}
    `;
    document.head.appendChild(style);
  }

  function grammarEntry() {
    return document.getElementById('grammarChallengeHomeEntry');
  }

  function classroomEntry() {
    return document.getElementById('studentClassroomPracticeEntry');
  }

  function grammarCopy() {
    const entry = grammarEntry();
    if (!entry) return {};
    const copy = entry.querySelector('.student-home-card__copy');
    const title = copy && copy.querySelector('strong');
    const subtitle = copy && copy.querySelector('small');
    let status = document.getElementById('grammarChallengeHomeStatus');
    if (copy && !status) {
      status = document.createElement('span');
      status.id = 'grammarChallengeHomeStatus';
      status.className = 'student-home-card__status daily-learning-route-status';
      copy.appendChild(status);
    }
    if (status) status.classList.add('daily-learning-route-status');
    return { entry, title, subtitle, status };
  }

  function classroomCopy() {
    const entry = classroomEntry();
    if (!entry) return {};
    const copy = entry.querySelector('.student-home-card__copy');
    const title = copy && copy.querySelector('strong');
    const subtitle = copy && copy.querySelector('small');
    const status = document.getElementById('studentClassroomPracticeStatus');
    if (status) status.classList.add('daily-learning-route-status');
    return { entry, title, subtitle, status };
  }

  function setEntryState(entry, routeState, disabled) {
    if (!entry) return;
    entry.dataset.routeState = routeState;
    entry.setAttribute('aria-busy', routeState === 'loading' ? 'true' : 'false');
    entry.disabled = Boolean(disabled);
  }

  function renderLoading(reason) {
    if (isTeacherMode()) return;
    const grammar = grammarCopy();
    const classroom = classroomCopy();
    if (grammar.title) grammar.title.textContent = '语法挑战';
    if (grammar.subtitle) grammar.subtitle.textContent = '正在读取上一节课内容…';
    if (grammar.status) grammar.status.textContent = reason === 'action' ? '正在确认今日挑战' : '正在读取';
    if (classroom.title) classroom.title.textContent = '随堂练习';
    if (classroom.subtitle) classroom.subtitle.textContent = '正在读取今天的新课…';
    if (classroom.status) classroom.status.textContent = reason === 'action' ? '正在确认今日练习' : '正在读取';
    setEntryState(grammar.entry, 'loading', true);
    setEntryState(classroom.entry, 'loading', true);
  }

  function renderError() {
    if (isTeacherMode()) return;
    const grammar = grammarCopy();
    const classroom = classroomCopy();
    if (grammar.title) grammar.title.textContent = '语法挑战';
    if (grammar.subtitle) grammar.subtitle.textContent = '今日内容暂时无法读取';
    if (grammar.status) grammar.status.textContent = '点一下重新读取';
    if (classroom.title) classroom.title.textContent = '随堂练习';
    if (classroom.subtitle) classroom.subtitle.textContent = '今日课程暂时无法读取';
    if (classroom.status) classroom.status.textContent = '点一下重新读取';
    setEntryState(grammar.entry, 'error', false);
    setEntryState(classroom.entry, 'error', false);
  }

  function routeLabel(item, fallback) {
    return String(item && (item.displayTitle || item.lessonTitle || item.reviewTitle || item.title) || fallback).trim();
  }

  function renderReady() {
    if (isTeacherMode() || !state.route) return;
    const grammar = grammarCopy();
    const classroom = classroomCopy();
    const grammarRoute = state.route.grammarChallenge;
    const classroomRoute = state.route.classroomPractice;

    if (grammar.title) grammar.title.textContent = '语法挑战';
    if (grammar.subtitle) grammar.subtitle.textContent = `${routeLabel(grammarRoute, '近期知识')} 10 题 + 历史 10 题`;
    if (grammar.status) {
      const grammarRecord = state.grammarRecordStudent === currentStudent() ? state.grammarRecord : null;
      grammar.status.textContent = grammarRecord && grammarRecord.status === 'completed'
        ? '今日已完成'
        : grammarRecord && grammarRecord.status === 'started'
          ? '继续今日挑战'
          : '今日挑战已准备';
    }
    if (grammar.entry) {
      grammar.entry.setAttribute('aria-label', `语法挑战，${routeLabel(grammarRoute, '近期知识')}10题加历史知识10题，一天一次，完成可领取5金币`);
    }

    if (classroom.title) classroom.title.textContent = '随堂练习';
    if (classroom.subtitle) classroom.subtitle.textContent = `今日：${routeLabel(classroomRoute, '新课练习')}`;
    if (classroom.status) {
      const classroomRecord = state.classroomRecordStudent === currentStudent() ? state.classroomRecord : null;
      classroom.status.textContent = classroomRecord && classroomRecord.status === 'completed'
        ? '今日已完成'
        : classroomRecord
          ? '继续今日练习'
          : '今日内容已准备';
    }
    if (classroom.entry) {
      classroom.entry.setAttribute('aria-label', `随堂练习，${routeLabel(classroomRoute, '今日新课')}，一天一次，完成可领取10金币`);
    }

    setEntryState(grammar.entry, 'ready', false);
    setEntryState(classroom.entry, 'ready', false);
  }

  function validateRoute(value) {
    if (!value || typeof value !== 'object') throw new Error('route payload is not an object');
    const grammar = value.grammarChallenge;
    const classroom = value.classroomPractice;
    if (!grammar || typeof grammar !== 'object' || !String(grammar.id || '').trim()) {
      throw new Error('grammar challenge route is missing');
    }
    if (!classroom || typeof classroom !== 'object' || !String(classroom.id || '').trim()) {
      throw new Error('classroom practice route is missing');
    }
    return {
      schemaVersion: Number(value.schemaVersion || value.schema_version || 1),
      updatedAt: String(value.updatedAt || value.updated_at || ''),
      grammarChallenge: { ...grammar, id: String(grammar.id) },
      classroomPractice: { ...classroom, id: String(classroom.id) }
    };
  }

  function readCachedRoute() {
    try {
      const raw = root.localStorage?.getItem(DAILY_ROUTE_CACHE_KEY);
      const envelope = raw ? JSON.parse(raw) : null;
      return envelope && envelope.route ? validateRoute(envelope.route) : null;
    } catch (_) {
      return null;
    }
  }

  function writeCachedRoute(route) {
    try {
      root.localStorage?.setItem(DAILY_ROUTE_CACHE_KEY, JSON.stringify({
        version: 1,
        cachedAt: new Date().toISOString(),
        route: validateRoute(route)
      }));
    } catch (_) {}
  }

  const initialCachedRoute = readCachedRoute();
  if (initialCachedRoute) {
    state.status = 'ready';
    state.route = initialCachedRoute;
    state.fetchedAt = 0;
  }

  function routeRequestUrl() {
    const separator = ROUTE_URL.includes('?') ? '&' : '?';
    return `${ROUTE_URL}${separator}fresh=${Date.now()}`;
  }

  async function fetchFreshRoute() {
    const prefetched = root.__dailyLearningRoutePrefetchPromise;
    if (prefetched && typeof prefetched.then === 'function') {
      root.__dailyLearningRoutePrefetchPromise = null;
      return validateRoute(await prefetched);
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = root.setTimeout(() => controller && controller.abort(), ROUTE_TIMEOUT_MS);
    try {
      const response = await fetch(routeRequestUrl(), {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller ? controller.signal : undefined,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`route HTTP ${response.status}`);
      return validateRoute(await response.json());
    } finally {
      root.clearTimeout(timer);
    }
  }

  function routeIsFresh() {
    return state.status === 'ready' && state.route && Date.now() - state.fetchedAt < ROUTE_MAX_AGE_MS;
  }

  async function loadDailyLearningRoute(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const force = settings.force === true;
    if (!force && routeIsFresh()) return state.route;
    if (state.promise) return state.promise;

    const fallbackRoute = state.route;
    state.status = fallbackRoute ? 'ready' : 'loading';
    state.error = null;
    state.refreshingReason = settings.reason || 'startup';
    if (fallbackRoute) renderReady();
    else renderLoading(state.refreshingReason);

    state.promise = fetchFreshRoute()
      .then(route => {
        state.route = route;
        state.status = 'ready';
        state.error = null;
        state.fetchedAt = Date.now();
        writeCachedRoute(route);
        renderReady();
        root.dispatchEvent?.(new CustomEvent('daily-learning-route-ready', { detail: route }));
        refreshGrammarHomeRecord().catch(() => {});
        return route;
      })
      .catch(error => {
        state.route = fallbackRoute || null;
        state.status = fallbackRoute ? 'ready' : 'error';
        state.error = error;
        state.fetchedAt = 0;
        if (fallbackRoute) renderReady();
        else renderError();
        console.warn('Unable to load current daily learning route', error && (error.message || error));
        return fallbackRoute || null;
      })
      .finally(() => {
        state.promise = null;
      });

    return state.promise;
  }

  async function ensureRouteForAction() {
    if (state.route) {
      refreshDailyRouteInBackground('action');
      return state.route;
    }
    return loadDailyLearningRoute({ force: true, reason: 'action' });
  }

  function refreshDailyRouteInBackground(reason) {
    loadDailyLearningRoute({ force: true, reason: reason || 'background' }).catch(() => null);
    return state.route;
  }

  function showHomeNotice(message) {
    const notice = document.getElementById('studentHomeNotice');
    if (!notice) {
      if (message) root.alert?.(message);
      return;
    }
    notice.textContent = message || '';
    notice.hidden = !message;
  }

  function grammarRecordKey(user) {
    return GRAMMAR_DAILY_KEY_PREFIX + (user === 'brother' ? 'brother' : 'sister');
  }

  async function fetchKvValue(key, timeoutMs) {
    if (typeof SB_URL === 'undefined' || typeof SB_HEADERS === 'undefined') {
      throw new Error('cloud configuration unavailable');
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = root.setTimeout(() => controller && controller.abort(), timeoutMs || ROUTE_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${SB_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
        { headers: SB_HEADERS, cache: 'no-store', signal: controller ? controller.signal : undefined }
      );
      if (!response.ok) throw new Error(`cloud HTTP ${response.status}`);
      const rows = await response.json();
      const value = rows && rows.length ? rows[0].value : null;
      if (value !== null) root.updateMirrorValue?.(key, value);
      return value;
    } finally {
      root.clearTimeout(timer);
    }
  }

  async function writeKvValue(key, value, timeoutMs) {
    if (typeof SB_URL === 'undefined' || typeof SB_HEADERS === 'undefined') {
      throw new Error('cloud configuration unavailable');
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = root.setTimeout(() => controller && controller.abort(), timeoutMs || 3800);
    try {
      const response = await fetch(`${SB_URL}/rest/v1/kv_store`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ key, value }),
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) throw new Error(`cloud HTTP ${response.status}`);
      root.updateMirrorValue?.(key, value);
      return true;
    } finally {
      root.clearTimeout(timer);
    }
  }

  async function loadGrammarRecord(user) {
    const student = user === 'brother' ? 'brother' : 'sister';
    const key = grammarRecordKey(student);
    const cached = typeof root.getMirrorValue === 'function' ? root.getMirrorValue(key) : null;
    const remote = await fetchKvValue(key, 2600);
    const records = remote && typeof remote === 'object'
      ? { ...remote }
      : cached && typeof cached === 'object' ? { ...cached } : {};
    if (currentStudent() === student) {
      state.grammarRecords = records;
      state.grammarRecordStudent = student;
    }
    const record = records[todayKey()];
    return record && typeof record === 'object' ? record : null;
  }

  function cachedGrammarRecord(user) {
    const student = user === 'brother' ? 'brother' : 'sister';
    const key = grammarRecordKey(student);
    const values = typeof root.getMirrorValue === 'function'
      ? root.getMirrorValue(key)
      : null;
    const record = values && values[todayKey()];
    return record && typeof record === 'object' ? record : null;
  }

  async function saveGrammarRecord(user, record) {
    const student = user === 'brother' ? 'brother' : 'sister';
    const key = grammarRecordKey(student);
    const cached = typeof root.getMirrorValue === 'function' ? root.getMirrorValue(key) : null;
    const next = state.grammarRecordStudent === student
      && state.grammarRecords && typeof state.grammarRecords === 'object'
      ? { ...state.grammarRecords }
      : cached && typeof cached === 'object' ? { ...cached } : {};
    next[todayKey()] = record;
    root.updateMirrorValue?.(key, next);
    if (currentStudent() === student) {
      state.grammarRecords = next;
      state.grammarRecordStudent = student;
      state.grammarRecord = record;
      renderReady();
    }
    await writeKvValue(key, next, 3800);
    return record;
  }

  async function refreshGrammarHomeRecord() {
    if (isTeacherMode() || !state.route) return null;
    const student = currentStudent();
    try {
      const record = await loadGrammarRecord(student);
      if (currentStudent() !== student) return null;
      state.grammarRecord = record;
      state.grammarRecordStudent = student;
      renderReady();
      return state.grammarRecord;
    } catch (_) {
      return null;
    }
  }

  function extractGrammarResult(doc) {
    const scoreText = doc && doc.getElementById('scoreText')?.textContent;
    const score = Number.parseInt(scoreText, 10);
    const completionText = String(doc && doc.getElementById('completionText')?.textContent || '');
    const correctMeta = String(doc && doc.getElementById('correctMeta')?.textContent || '');
    const combined = `${correctMeta} ${completionText}`;
    const countMatch = combined.match(/(?:答对\s*)?(\d+)\s*\/\s*(\d+)/);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null,
      correctCount: countMatch ? Number(countMatch[1]) : null,
      totalCount: countMatch ? Number(countMatch[2]) : null
    };
  }

  function grammarDocumentComplete(doc) {
    if (!doc) return false;
    if (doc.querySelector('[data-complete="true"]')) return true;
    const resultScreen = doc.getElementById('resultScreen');
    return Boolean(resultScreen && !resultScreen.hidden);
  }

  function disableGrammarRetries(doc) {
    if (!doc) return;
    ['newRoundButton', 'restartButton', 'retryButton'].forEach(id => {
      const button = doc.getElementById(id);
      if (!button) return;
      button.disabled = true;
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
    });
  }

  function clearFrameObservers() {
    state.frameObservers.forEach(observer => observer.disconnect());
    state.frameObservers = [];
  }

  async function markGrammarCompleted(doc) {
    if (!state.route || !state.activeGrammarChallengeId) return;
    const user = state.activeGrammarStudent || currentStudent();
    const existing = state.grammarRecordStudent === user
      ? state.grammarRecord
      : await loadGrammarRecord(user).catch(() => null);
    if (existing && existing.status === 'completed') return;
    const result = extractGrammarResult(doc);
    const now = new Date().toISOString();
    const record = {
      ...(existing && typeof existing === 'object' ? existing : {}),
      challengeId: String(state.activeGrammarChallengeId),
      routeUpdatedAt: state.route.updatedAt || '',
      reviewLessonKey: state.route.grammarChallenge.reviewLessonKey || state.route.grammarChallenge.lessonKey || '',
      title: state.route.grammarChallenge.title || '',
      status: 'completed',
      startedAt: existing && existing.startedAt ? existing.startedAt : now,
      completedAt: now,
      score: result.score,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      answersShown: true,
      rewarded: false,
      rewardPending: true
    };
    await saveGrammarRecord(user, record);
    if (typeof root.recordStudentRewardSource === 'function') {
      const rewardAmount = Number.isFinite(result.score)
        && typeof root.StudentRewards?.challengeRewardAmount === 'function'
        ? root.StudentRewards.challengeRewardAmount(user, result.score, 5)
        : 5;
      await root.recordStudentRewardSource(user, 'grammarChallenge', rewardAmount, 'set');
    }
  }

  function installGrammarFrameWatcher() {
    const frame = document.getElementById('grammarChallengeFrame');
    if (!frame || state.frameLoadHandlerInstalled) return;
    state.frameLoadHandlerInstalled = true;
    frame.addEventListener('load', () => {
      clearFrameObservers();
      let doc;
      try { doc = frame.contentDocument; } catch (_) { return; }
      if (!doc) return;
      disableGrammarRetries(doc);
      let handled = false;
      const check = () => {
        disableGrammarRetries(doc);
        if (handled || !grammarDocumentComplete(doc)) return;
        handled = true;
        clearFrameObservers();
        markGrammarCompleted(doc).catch(error => {
          handled = false;
          console.warn('Unable to save grammar challenge completion', error && (error.message || error));
        });
      };
      const completionState = doc.querySelector('[data-complete]');
      const resultScreen = doc.getElementById('resultScreen');
      if (typeof root.MutationObserver === 'function' && completionState) {
        const observer = new root.MutationObserver(check);
        observer.observe(completionState, { attributes: true, attributeFilter: ['data-complete', 'open'] });
        state.frameObservers.push(observer);
      }
      if (typeof root.MutationObserver === 'function' && resultScreen) {
        const observer = new root.MutationObserver(check);
        observer.observe(resultScreen, { attributes: true, attributeFilter: ['hidden'] });
        state.frameObservers.push(observer);
      }
      check();
    });
  }

  async function openStudentGrammarChallenge() {
    if (isTeacherMode()) return;
    showHomeNotice('');
    const route = await ensureRouteForAction();
    if (!route) {
      showHomeNotice('今日语法挑战暂时无法读取，请检查网络后再点一次。');
      return;
    }

    const user = currentStudent();
    let record = cachedGrammarRecord(user);
    state.grammarRecord = record;
    state.grammarRecordStudent = user;
    renderReady();

    if (record && record.status === 'completed') {
      const scoreText = Number.isFinite(Number(record.score)) ? `，成绩 ${Number(record.score)} 分` : '';
      showHomeNotice(`今天的语法挑战已经完成${scoreText}，奖励请回首页点击宝箱领取。`);
      return;
    }

    try {
      await root.loadFeatureGroup?.('grammarChallenge');
      let adaptiveReady = true;
      try {
        await root.loadFeatureGroup?.('grammarAdaptive');
        adaptiveReady = typeof root.prepareAdaptiveGrammarChallenge === 'function';
      } catch (error) {
        adaptiveReady = false;
        console.warn('Adaptive grammar bundle unavailable; using the cached challenge', error);
      }

      if (adaptiveReady) {
        const prepared = await root.prepareAdaptiveGrammarChallenge({
          user,
          date: todayKey(),
          record,
          route
        });
        record = prepared.record;
        if (prepared.completed || record.status === 'completed') {
          const scoreText = Number.isFinite(Number(record.score)) ? `，成绩 ${Number(record.score)} 分` : '';
          showHomeNotice(`今天的语法挑战已经完成${scoreText}，奖励请回首页点击宝箱领取。`);
          return;
        }
        state.grammarRecord = record;
        state.grammarRecordStudent = user;
        installGrammarFrameWatcher();
        if (typeof root.openGrammarChallenge !== 'function') throw new Error('grammar challenge player unavailable');
        state.activeGrammarChallengeId = prepared.challengeId;
        state.activeGrammarStudent = user;
        root.openGrammarChallenge(prepared.challengeId);
        return;
      }

      const challengeId = record && record.status === 'started' && record.challengeId
        ? String(record.challengeId)
        : route.grammarChallenge.id;
      loadGrammarRecord(user).then(fresh => {
        if (currentStudent() !== user || state.grammarRecordStudent !== user || !fresh) return;
        state.grammarRecord = fresh;
        renderReady();
      }).catch(() => null);
      if (!record) {
        const now = new Date().toISOString();
        record = {
          challengeId,
          routeUpdatedAt: route.updatedAt || '',
          reviewLessonKey: route.grammarChallenge.reviewLessonKey || route.grammarChallenge.lessonKey || '',
          title: route.grammarChallenge.title || '',
          status: 'started',
          startedAt: now,
          completedAt: '',
          score: null,
          correctCount: null,
          totalCount: null,
          answersShown: false,
          rewarded: false
        };
        saveGrammarRecord(user, record).catch(error => {
          console.warn('Grammar start record will retry after entry', error && (error.message || error));
        });
      }
      state.grammarRecord = record;
      state.grammarRecordStudent = user;
      installGrammarFrameWatcher();
      if (typeof root.openGrammarChallenge !== 'function') throw new Error('grammar challenge player unavailable');
      state.activeGrammarChallengeId = challengeId;
      state.activeGrammarStudent = user;
      root.openGrammarChallenge(challengeId);
    } catch (error) {
      console.warn(error);
      showHomeNotice('语法挑战加载失败，请检查网络后重试。');
    }
  }

  async function openStudentClassroomPractice() {
    if (isTeacherMode()) return;
    showHomeNotice('');
    const route = await ensureRouteForAction();
    if (!route) {
      showHomeNotice('今日随堂练习暂时无法读取，请检查网络后再点一次。');
      return;
    }
    try {
      await root.loadFeatureGroup?.('courseware');
      if (typeof root.openCourseware !== 'function') throw new Error('classroom practice player unavailable');
      return await root.openCourseware(route.classroomPractice.id);
    } catch (error) {
      console.warn(error);
      showHomeNotice('随堂练习加载失败，请检查网络后重试。');
    }
  }

  function installEntryHandlers() {
    const grammar = grammarEntry();
    const classroom = classroomEntry();
    if (grammar) {
      grammar.removeAttribute('onclick');
      grammar.onclick = () => openStudentGrammarChallenge();
    }
    if (classroom) {
      classroom.removeAttribute('onclick');
      classroom.onclick = () => openStudentClassroomPractice();
    }
  }

  function installClassroomHomeHook() {
    const original = root.applyStudentClassroomPracticeHomeRecord;
    if (typeof original !== 'function' || original.__dailyRouteWrapped) return;
    const wrapped = function dailyRouteClassroomHome(record) {
      state.classroomRecordStudent = currentStudent();
      state.classroomRecord = record && typeof record === 'object' ? record : null;
      const result = original.apply(this, arguments);
      if (state.status === 'loading') renderLoading(state.refreshingReason);
      else if (state.status === 'ready') renderReady();
      else if (state.status === 'error') renderError();
      return result;
    };
    wrapped.__dailyRouteWrapped = true;
    root.applyStudentClassroomPracticeHomeRecord = wrapped;
  }

  function installHomeHook() {
    const original = root.loadHome;
    if (typeof original !== 'function' || original.__dailyRouteWrapped) return;
    const wrapped = async function dailyRouteAwareHome() {
      const student = currentStudent();
      const studentChanged = state.grammarRecordStudent && state.grammarRecordStudent !== student;
      if (studentChanged) {
        state.grammarRecord = null;
        state.grammarRecords = null;
        state.grammarRecordStudent = '';
        state.classroomRecord = null;
        state.classroomRecordStudent = '';
      }
      if (!isTeacherMode() && state.status === 'idle') {
        loadDailyLearningRoute({ force: true, reason: 'startup' });
      }
      const result = await original.apply(this, arguments);
      installEntryHandlers();
      if (state.status === 'loading') {
        renderLoading(state.refreshingReason);
      } else if (state.status === 'ready') {
        if (!routeIsFresh()) {
          loadDailyLearningRoute({ force: true, reason: 'visibility' });
        } else {
          renderReady();
          if (!isTeacherMode() && state.grammarRecordStudent !== student) {
            refreshGrammarHomeRecord().catch(() => {});
          }
        }
      } else if (state.status === 'error') {
        renderError();
      }
      return result;
    };
    wrapped.__dailyRouteWrapped = true;
    root.loadHome = wrapped;
  }

  function installVisibilityRefresh() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || isTeacherMode()) return;
      if (Date.now() - state.fetchedAt < VISIBILITY_REFRESH_AGE_MS) return;
      loadDailyLearningRoute({ force: true, reason: 'visibility' });
    });
    root.addEventListener?.('daily-route-override-updated', () => {
      refreshDailyRouteInBackground('override-updated');
    });
  }

  function startDailyLearningRoute() {
    installStyles();
    installEntryHandlers();
    installClassroomHomeHook();
    installHomeHook();
    installVisibilityRefresh();
    if (isTeacherMode()) return Promise.resolve(null);
    if (state.route) {
      renderReady();
      refreshDailyRouteInBackground('startup');
      return Promise.resolve(state.route);
    }
    return loadDailyLearningRoute({ force: true, reason: 'startup' });
  }

  installStyles();
  installEntryHandlers();
  installClassroomHomeHook();
  installHomeHook();

  root.startDailyLearningRoute = startDailyLearningRoute;
  root.loadDailyLearningRoute = loadDailyLearningRoute;
  root.getDailyLearningRoute = () => state.route;
  root.getDailyLearningRouteState = () => ({ ...state, promise: undefined, frameObservers: undefined });
  root.loadDailyGrammarRecord = loadGrammarRecord;
  root.saveDailyGrammarRecord = saveGrammarRecord;
  root.getCachedDailyGrammarRecord = cachedGrammarRecord;
  root.openStudentGrammarChallengeBase = openStudentGrammarChallenge;
  root.openStudentGrammarChallenge = openStudentGrammarChallenge;
  root.openStudentClassroomPractice = openStudentClassroomPractice;
  root.installDailyGrammarFrameWatcher = installGrammarFrameWatcher;
})(typeof globalThis !== 'undefined' ? globalThis : window);
