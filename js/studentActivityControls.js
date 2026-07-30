(function studentActivityControlsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.StudentActivityControls = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStudentActivityControls() {
  'use strict';

  const CONTROL_KEY_PREFIX = 'student_activity_control_v1_';
  const REWARD_KEY_PREFIX = 'student_reward_v1_';
  const CONTROL_VERSION = 1;
  const MAX_ATTEMPT_TOTAL = 99;
  const PROJECTS = Object.freeze({
    adventure: Object.freeze({ label: '词汇探险', baseAttempts: 1, rewardSource: 'adventure', sourceMax: 5 }),
    vocabularyChallenge: Object.freeze({ label: '单词挑战', baseAttempts: 2, rewardSource: 'vocabularyChallenge', sourceMax: 10 }),
    grammarChallenge: Object.freeze({ label: '语法挑战', baseAttempts: 1, rewardSource: 'grammarChallenge', sourceMax: 5 }),
    classroomPractice: Object.freeze({ label: '随堂练习', baseAttempts: 1, rewardSource: 'classroomPractice', sourceMax: 10 }),
    breakthrough: Object.freeze({ label: '突破金币', baseAttempts: null, rewardSource: 'breakthrough', sourceMax: 10 })
  });
  const ACTIVITY_PROJECT_KEYS = Object.freeze([
    'adventure',
    'vocabularyChallenge',
    'grammarChallenge',
    'classroomPractice'
  ]);

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function integer(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : (fallback || 0);
  }

  function nonNegativeInteger(value, fallback) {
    return Math.max(0, integer(value, fallback));
  }

  function dateKey(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (!Number.isFinite(date.getTime())) return '';
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function normalizeControlDay(value) {
    const source = isPlainObject(value) ? value : {};
    const coinTotals = {};
    const attemptTotals = {};
    const attemptUsage = {};

    ACTIVITY_PROJECT_KEYS.forEach(project => {
      if (isPlainObject(source.coinTotals) && Number.isFinite(Number(source.coinTotals[project]))) {
        coinTotals[project] = nonNegativeInteger(source.coinTotals[project]);
      }
      const base = PROJECTS[project].baseAttempts;
      const suppliedTotal = isPlainObject(source.attemptTotals) ? source.attemptTotals[project] : null;
      attemptTotals[project] = Math.max(
        base,
        Math.min(MAX_ATTEMPT_TOTAL, nonNegativeInteger(suppliedTotal, base))
      );
      const suppliedUsage = isPlainObject(source.attemptUsage) ? source.attemptUsage[project] : null;
      attemptUsage[project] = nonNegativeInteger(suppliedUsage);
    });

    return {
      ...source,
      coinTotals,
      attemptTotals,
      attemptUsage,
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
    };
  }

  function normalizeControlRecord(value) {
    const source = isPlainObject(value) ? value : {};
    const rawDaily = isPlainObject(source.daily) ? source.daily : {};
    const daily = {};
    Object.keys(rawDaily).forEach(key => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) daily[key] = normalizeControlDay(rawDaily[key]);
    });
    return { ...source, version: CONTROL_VERSION, daily };
  }

  function controlDay(recordValue, day) {
    const record = normalizeControlRecord(recordValue);
    return normalizeControlDay(record.daily[String(day || dateKey())]);
  }

  function projectAttemptTotal(recordValue, day, project, fallback) {
    const meta = PROJECTS[project];
    const base = meta && meta.baseAttempts != null
      ? meta.baseAttempts
      : Math.max(0, nonNegativeInteger(fallback));
    if (!meta || meta.baseAttempts == null) return base;
    const current = controlDay(recordValue, day).attemptTotals[project];
    return Math.max(base, Math.min(MAX_ATTEMPT_TOTAL, nonNegativeInteger(current, base)));
  }

  function projectAttemptUsage(recordValue, day, project) {
    if (!ACTIVITY_PROJECT_KEYS.includes(project)) return 0;
    return nonNegativeInteger(controlDay(recordValue, day).attemptUsage[project]);
  }

  function applyAttemptIncrease(recordValue, options) {
    const settings = isPlainObject(options) ? options : {};
    const project = String(settings.project || '');
    if (!ACTIVITY_PROJECT_KEYS.includes(project)) {
      return { record: normalizeControlRecord(recordValue), changed: false, total: 0 };
    }
    const dayKey = String(settings.date || dateKey());
    const record = normalizeControlRecord(recordValue);
    const day = normalizeControlDay(record.daily[dayKey]);
    const delta = Math.max(0, integer(settings.delta));
    const current = projectAttemptTotal(record, dayKey, project);
    const next = Math.min(MAX_ATTEMPT_TOTAL, current + delta);
    if (next === current) return { record, changed: false, total: current };
    day.attemptTotals[project] = next;
    day.updatedAt = String(settings.at || new Date().toISOString());
    record.daily[dayKey] = day;
    return { record, changed: true, total: next };
  }

  function applyUsageMinimum(recordValue, options) {
    const settings = isPlainObject(options) ? options : {};
    const project = String(settings.project || '');
    if (!ACTIVITY_PROJECT_KEYS.includes(project)) {
      return { record: normalizeControlRecord(recordValue), changed: false, usage: 0 };
    }
    const dayKey = String(settings.date || dateKey());
    const record = normalizeControlRecord(recordValue);
    const day = normalizeControlDay(record.daily[dayKey]);
    const current = nonNegativeInteger(day.attemptUsage[project]);
    const next = Math.max(current, nonNegativeInteger(settings.minimum));
    if (next === current) return { record, changed: false, usage: current };
    day.attemptUsage[project] = next;
    day.updatedAt = String(settings.at || new Date().toISOString());
    record.daily[dayKey] = day;
    return { record, changed: true, usage: next };
  }

  function applyUsageIncrement(recordValue, options) {
    const settings = isPlainObject(options) ? options : {};
    const project = String(settings.project || '');
    const dayKey = String(settings.date || dateKey());
    const current = projectAttemptUsage(recordValue, dayKey, project);
    return applyUsageMinimum(recordValue, {
      ...settings,
      minimum: current + Math.max(1, nonNegativeInteger(settings.delta, 1))
    });
  }

  function calculateCoinAdjustment(currentValue, totalCoins, requestedDelta) {
    const current = nonNegativeInteger(currentValue);
    const availableTotal = nonNegativeInteger(totalCoins);
    const requested = integer(requestedDelta);
    const lowerBound = -Math.min(current, availableTotal);
    const boundedDelta = Math.max(lowerBound, requested);
    const appliedDelta = boundedDelta === 0 ? 0 : boundedDelta;
    const next = Math.max(0, current + appliedDelta);
    return { current, requestedDelta: requested, appliedDelta, next };
  }

  function virtualizeWordChallengeUsage(actualLegacy, actualState, allowedTotal, baseTotal) {
    const base = Math.max(1, nonNegativeInteger(baseTotal, PROJECTS.vocabularyChallenge.baseAttempts));
    const allowed = Math.max(base, nonNegativeInteger(allowedTotal, base));
    const bonus = Math.max(0, allowed - base);
    const legacy = nonNegativeInteger(actualLegacy);
    const state = nonNegativeInteger(actualState);
    const virtualLegacy = Math.max(0, legacy - bonus);
    const residualRequested = Math.max(0, bonus - legacy);
    const residualBonus = Math.min(state, residualRequested);
    const virtualState = state - residualBonus;
    return {
      base,
      allowed,
      bonus,
      actualLegacy: legacy,
      actualState: state,
      virtualLegacy,
      residualBonus,
      virtualState,
      virtualTotal: virtualLegacy + virtualState
    };
  }

  function resetAdventureSessionForAttempt(stateValue, today, attemptIndex) {
    const state = isPlainObject(stateValue) ? JSON.parse(JSON.stringify(stateValue)) : {};
    const session = isPlainObject(state.session) ? state.session : null;
    if (!session || session.date !== today || !Array.isArray(session.plan) || !session.plan.length) return null;
    const plan = session.plan.map(item => ({
      ...item,
      taskType: '',
      confirmationTaskType: '',
      outcomeDetail: '',
      status: 'pending',
      result: ''
    }));
    state.session = {
      ...session,
      attemptIndex: Math.max(1, nonNegativeInteger(attemptIndex, 1)),
      plan,
      cursor: 0,
      phase: plan[0].phase === 'review' ? 'review' : 'screening',
      completed: false,
      rewardGranted: false
    };
    return state;
  }

  function install(root) {
    if (!root || root.__studentActivityControlsInstalled) return;
    root.__studentActivityControlsInstalled = true;

    const runtime = {
      rawLoadAdventureState: null,
      rawSaveAdventureState: null,
      rawLegacyUsage: null,
      rawOpenAdventure: null,
      rawCloseAdventure: null,
      rawOpenWordChallenge: null,
      rawCloseWordChallenge: null,
      rawMarkCoursewareCompleted: null,
      wordChallengeVirtualActive: false,
      adventurePlayerActive: false,
      activeGrammarToken: '',
      completedGrammarToken: '',
      activeCoursewareToken: '',
      grammarFrameLoadInstalled: false,
      coursewareHookInstalled: false,
      refreshSequence: 0
    };

    function studentKey(user) {
      return user === 'brother' ? 'brother' : 'sister';
    }

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

    function controlKey(user) {
      return CONTROL_KEY_PREFIX + studentKey(user);
    }

    function rewardKey(user) {
      return REWARD_KEY_PREFIX + studentKey(user);
    }

    async function loadControl(user) {
      if (typeof root.sbGet !== 'function') return normalizeControlRecord(null);
      return normalizeControlRecord(await root.sbGet(controlKey(user)));
    }

    async function saveControl(user, record) {
      if (typeof root.sbSet !== 'function') return false;
      try {
        await root.sbSet(controlKey(user), normalizeControlRecord(record));
        return true;
      } catch (error) {
        root.showStorageError?.(error);
        return false;
      }
    }

    async function getAttemptTotal(user, project, fallback) {
      if (!ACTIVITY_PROJECT_KEYS.includes(project)) return nonNegativeInteger(fallback);
      return projectAttemptTotal(await loadControl(user), dateKey(), project, fallback);
    }

    async function getAttemptUsage(user, project, inferredMinimum) {
      const student = studentKey(user);
      const today = dateKey();
      const record = await loadControl(student);
      const current = projectAttemptUsage(record, today, project);
      const minimum = Math.max(current, nonNegativeInteger(inferredMinimum));
      if (minimum === current) return current;
      const result = applyUsageMinimum(record, { date: today, project, minimum });
      if (result.changed) await saveControl(student, result.record);
      return result.usage;
    }

    async function incrementUsage(user, project, minimum) {
      const student = studentKey(user);
      const today = dateKey();
      const record = await loadControl(student);
      let result;
      if (Number.isFinite(Number(minimum))) {
        result = applyUsageMinimum(record, { date: today, project, minimum });
      } else {
        result = applyUsageIncrement(record, { date: today, project, delta: 1 });
      }
      if (result.changed && !await saveControl(student, result.record)) return projectAttemptUsage(record, today, project);
      return result.usage;
    }

    function rewardRecord(value) {
      if (root.StudentRewards && typeof root.StudentRewards.normalizeRewardRecord === 'function') {
        return root.StudentRewards.normalizeRewardRecord(value);
      }
      const source = isPlainObject(value) ? JSON.parse(JSON.stringify(value)) : {};
      return {
        ...source,
        totalCoins: nonNegativeInteger(source.totalCoins),
        daily: isPlainObject(source.daily) ? source.daily : {},
        transactions: Array.isArray(source.transactions) ? source.transactions : []
      };
    }

    function rewardDay(value) {
      if (root.StudentRewards && typeof root.StudentRewards.normalizeDay === 'function') {
        return root.StudentRewards.normalizeDay(value);
      }
      const source = isPlainObject(value) ? value : {};
      return {
        ...source,
        coins: nonNegativeInteger(source.coins),
        breakthroughCoins: nonNegativeInteger(source.breakthroughCoins),
        sources: isPlainObject(source.sources) ? { ...source.sources } : {},
        teacherSourceOverrides: isPlainObject(source.teacherSourceOverrides)
          ? { ...source.teacherSourceOverrides }
          : {},
        unallocatedCoins: nonNegativeInteger(source.unallocatedCoins)
      };
    }

    function automaticSourceTotal(sources) {
      return ACTIVITY_PROJECT_KEYS.reduce((sum, project) => {
        const meta = PROJECTS[project];
        return sum + Math.max(0, Math.min(meta.sourceMax, nonNegativeInteger(sources && sources[project])));
      }, 0);
    }

    async function loadReward(user) {
      return rewardRecord(typeof root.sbGet === 'function' ? await root.sbGet(rewardKey(user)) : null);
    }

    async function saveReward(user, record) {
      if (typeof root.sbSet !== 'function') return false;
      try {
        await root.sbSet(rewardKey(user), record);
        return true;
      } catch (error) {
        root.showStorageError?.(error);
        return false;
      }
    }

    function selectedProject() {
      const value = String(document.getElementById('teacherActivityProject')?.value || 'vocabularyChallenge');
      return Object.prototype.hasOwnProperty.call(PROJECTS, value) ? value : 'vocabularyChallenge';
    }

    function projectCoinValue(reward, control, project, today) {
      const day = rewardDay(reward.daily && reward.daily[today]);
      if (project === 'breakthrough') return nonNegativeInteger(day.breakthroughCoins);
      const controlToday = controlDay(control, today);
      if (Object.prototype.hasOwnProperty.call(controlToday.coinTotals, project)) {
        return nonNegativeInteger(controlToday.coinTotals[project]);
      }
      return nonNegativeInteger(day.sources && day.sources[project]);
    }

    async function adjustActivityCoin(user, project, requestedDelta) {
      const today = dateKey();
      const [reward, control] = await Promise.all([loadReward(user), loadControl(user)]);
      const current = projectCoinValue(reward, control, project, today);
      const calculated = calculateCoinAdjustment(current, reward.totalCoins, requestedDelta);
      if (!calculated.appliedDelta) return { ok: true, total: current, delta: 0 };

      const previousControl = normalizeControlRecord(control);
      const nextControl = normalizeControlRecord(control);
      const nextControlDay = normalizeControlDay(nextControl.daily[today]);
      nextControlDay.coinTotals[project] = calculated.next;
      nextControlDay.updatedAt = new Date().toISOString();
      nextControl.daily[today] = nextControlDay;

      const nextReward = rewardRecord(reward);
      const day = rewardDay(nextReward.daily[today]);
      const meta = PROJECTS[project];
      const sourceValue = Math.max(0, Math.min(meta.sourceMax, calculated.next));
      day.sources = { ...day.sources, [project]: sourceValue };
      day.teacherSourceOverrides = { ...day.teacherSourceOverrides, [project]: sourceValue };
      const regularMax = root.StudentRewards && Number(root.StudentRewards.REGULAR_DAILY_MAX) || 30;
      day.coins = Math.max(0, Math.min(
        regularMax,
        nonNegativeInteger(day.unallocatedCoins) + automaticSourceTotal(day.sources)
      ));
      day.updatedAt = new Date().toISOString();
      nextReward.daily[today] = day;
      nextReward.totalCoins = Math.max(0, nonNegativeInteger(nextReward.totalCoins) + calculated.appliedDelta);
      nextReward.transactions = Array.isArray(nextReward.transactions) ? nextReward.transactions : [];
      nextReward.transactions.push({
        id: `${today}:${project}:teacher-total:${day.updatedAt}`,
        date: today,
        kind: 'teacher-total-adjustment',
        source: project,
        delta: calculated.appliedDelta,
        projectTotal: calculated.next,
        at: day.updatedAt
      });
      nextReward.transactions = nextReward.transactions.slice(-100);

      if (!await saveControl(user, nextControl)) return { ok: false, total: current, delta: 0 };
      if (!await saveReward(user, nextReward)) {
        await saveControl(user, previousControl);
        return { ok: false, total: current, delta: 0 };
      }
      return { ok: true, total: calculated.next, delta: calculated.appliedDelta };
    }

    async function adjustBreakthroughCoin(user, delta) {
      if (typeof root.recordStudentRewardAdjustment !== 'function') return { ok: false };
      return root.recordStudentRewardAdjustment(studentKey(user), 'breakthrough', integer(delta));
    }

    async function adjustAttempts(user, project, delta) {
      const record = await loadControl(user);
      const result = applyAttemptIncrease(record, { date: dateKey(), project, delta });
      if (result.changed && !await saveControl(user, result.record)) return { ok: false, total: projectAttemptTotal(record, dateKey(), project) };
      return { ok: true, total: result.total };
    }

    function installStyles() {
      if (document.getElementById('studentActivityControlStyles')) return;
      const style = document.createElement('style');
      style.id = 'studentActivityControlStyles';
      style.textContent = `
        .teacher-activity-panel{width:min(980px,calc(100% - 24px));margin:12px auto 28px;padding:14px;border:1px solid #eadde6;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(80,55,75,.07)}
        .teacher-activity-panel__top{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.6fr);gap:14px;align-items:end}
        .teacher-activity-panel__summary h2{margin:0;color:#6b4e7a;font-size:18px}.teacher-activity-panel__summary p{margin:6px 0 0;color:#685e65;font-size:13px;font-weight:700}
        .teacher-activity-selectors{display:grid;grid-template-columns:minmax(110px,.75fr) minmax(150px,1.25fr);gap:8px}.teacher-activity-selectors label{display:grid;gap:4px;font-size:11px;color:#7f727b}.teacher-activity-selectors select{height:40px;border:1px solid #dfd1da;border-radius:10px;padding:6px 9px;background:#fff;color:#594f56;font:inherit}
        .teacher-activity-actions{display:grid;grid-template-columns:auto 1fr;gap:10px 18px;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #f0e7ec}
        .teacher-activity-actions__label{font-size:12px;font-weight:800;color:#6f616a;white-space:nowrap}.teacher-activity-actions__buttons{display:flex;flex-wrap:wrap;gap:8px}
        .teacher-activity-actions button{min-width:62px;height:38px;border:0;border-radius:10px;padding:6px 12px;font-weight:850;cursor:pointer;background:#eef4f2;color:#31584d}.teacher-activity-actions button[data-tone="subtract"]{background:#f7dce2;color:#7c3d50}.teacher-activity-actions button[data-tone="large"]{background:#fff1bd;color:#75520d}.teacher-activity-actions button[data-tone="custom"]{background:#ebe2f2;color:#654476}
        .teacher-activity-actions button:disabled{cursor:wait;opacity:.55}.teacher-activity-custom{display:inline-flex;gap:6px;align-items:center}.teacher-activity-custom[hidden]{display:none}.teacher-activity-custom input{width:92px;height:38px;border:1px solid #dfd1da;border-radius:10px;padding:6px 9px;font:inherit}.teacher-activity-status{min-height:18px;margin-top:6px;text-align:right;font-size:12px;font-weight:700;color:#b65360}
        @media(max-width:760px){.teacher-activity-panel__top{grid-template-columns:1fr}.teacher-activity-actions{grid-template-columns:1fr}.teacher-activity-actions__buttons{width:100%}.teacher-activity-actions button{flex:1}}
      `;
      document.head.appendChild(style);
    }

    function panelButtons() {
      return [...document.querySelectorAll('#teacherActivityPanel button')];
    }

    function setPanelBusy(busy) {
      panelButtons().forEach(button => { button.disabled = Boolean(busy); });
    }

    function setPanelError(message) {
      const status = document.getElementById('teacherActivityStatus');
      if (status) status.textContent = message || '';
    }

    async function refreshTeacherPanel() {
      const panel = document.getElementById('teacherActivityPanel');
      if (!panel || !isTeacherMode()) return;
      const sequence = ++runtime.refreshSequence;
      const user = document.getElementById('teacherActivityStudent')?.value === 'brother' ? 'brother' : 'sister';
      const project = selectedProject();
      const today = dateKey();
      const [reward, control] = await Promise.all([loadReward(user), loadControl(user)]);
      if (sequence !== runtime.refreshSequence) return;
      const coinTotal = projectCoinValue(reward, control, project, today);
      const attemptTotal = PROJECTS[project].baseAttempts == null
        ? null
        : projectAttemptTotal(control, today, project);
      const current = document.getElementById('teacherActivityCurrent');
      if (current) current.textContent = attemptTotal == null
        ? `金币总数：${coinTotal}`
        : `金币总数：${coinTotal}　次数总数：${attemptTotal}`;
      const attemptRow = document.getElementById('teacherActivityAttemptRow');
      const attemptLabel = document.getElementById('teacherActivityAttemptLabel');
      if (attemptRow) attemptRow.hidden = attemptTotal == null;
      if (attemptLabel) attemptLabel.hidden = attemptTotal == null;
      setPanelError('');
    }

    async function runPanelAction(action) {
      const user = document.getElementById('teacherActivityStudent')?.value === 'brother' ? 'brother' : 'sister';
      const project = selectedProject();
      setPanelBusy(true);
      setPanelError('');
      try {
        let result;
        if (action.kind === 'attempt') {
          result = await adjustAttempts(user, project, action.delta);
        } else if (project === 'breakthrough') {
          result = await adjustBreakthroughCoin(user, action.delta);
        } else {
          result = await adjustActivityCoin(user, project, action.delta);
        }
        if (!result || result.ok === false) setPanelError('保存失败，请检查网络后重试');
        await refreshTeacherPanel();
      } finally {
        setPanelBusy(false);
      }
    }

    function toggleCustomCoinAdjustment() {
      const wrap = document.getElementById('teacherActivityCustomWrap');
      const input = document.getElementById('teacherActivityCustomValue');
      if (!wrap || !input) return;
      wrap.hidden = !wrap.hidden;
      if (!wrap.hidden) {
        input.value = '';
        input.focus();
      }
    }

    function submitCustomCoinAdjustment() {
      const input = document.getElementById('teacherActivityCustomValue');
      const wrap = document.getElementById('teacherActivityCustomWrap');
      const delta = integer(input && input.value);
      if (!delta) {
        setPanelError('请输入非 0 的整数');
        input?.focus();
        return;
      }
      if (wrap) wrap.hidden = true;
      runPanelAction({ kind: 'coin', delta });
    }

    function installTeacherPanel() {
      if (!isTeacherMode()) return;
      document.getElementById('teacherRewardPanel')?.remove();
      if (document.getElementById('teacherActivityPanel')) {
        refreshTeacherPanel();
        return;
      }
      const nav = document.querySelector('.teacher-home-nav');
      if (!nav) return;
      const panel = document.createElement('section');
      panel.id = 'teacherActivityPanel';
      panel.className = 'teacher-activity-panel teacher-only';
      panel.innerHTML = `
        <div class="teacher-activity-panel__top">
          <div class="teacher-activity-panel__summary"><h2>金币与次数调整</h2><p id="teacherActivityCurrent">正在读取…</p></div>
          <div class="teacher-activity-selectors">
            <label><span>学生</span><select id="teacherActivityStudent"><option value="sister">姐姐</option><option value="brother">弟弟</option></select></label>
            <label><span>项目</span><select id="teacherActivityProject"><option value="vocabularyChallenge">单词挑战</option><option value="grammarChallenge">语法挑战</option><option value="classroomPractice">随堂练习</option><option value="adventure">词汇探险</option><option value="breakthrough">突破金币</option></select></label>
          </div>
        </div>
        <div class="teacher-activity-actions">
          <span class="teacher-activity-actions__label">金币</span>
          <div class="teacher-activity-actions__buttons">
            <button type="button" data-coin-delta="-1" data-tone="subtract">-1</button>
            <button type="button" data-coin-delta="1">+1</button>
            <button type="button" data-coin-delta="10" data-tone="large">+10</button>
            <button type="button" id="teacherActivityCustomCoin" data-tone="custom">自定义调整</button>
            <span class="teacher-activity-custom" id="teacherActivityCustomWrap" hidden><input id="teacherActivityCustomValue" type="number" step="1" inputmode="numeric" placeholder="+5 或 -3" aria-label="自定义金币调整数量"><button type="button" id="teacherActivityCustomConfirm">确定</button></span>
          </div>
          <span class="teacher-activity-actions__label" id="teacherActivityAttemptLabel">次数</span>
          <div class="teacher-activity-actions__buttons" id="teacherActivityAttemptRow">
            <button type="button" data-attempt-delta="1">+1</button>
            <button type="button" data-attempt-delta="2">+2</button>
          </div>
        </div>
        <div class="teacher-activity-status" id="teacherActivityStatus" role="status" aria-live="polite"></div>`;
      nav.insertAdjacentElement('afterend', panel);
      document.getElementById('teacherActivityStudent')?.addEventListener('change', refreshTeacherPanel);
      document.getElementById('teacherActivityProject')?.addEventListener('change', () => {
        const custom = document.getElementById('teacherActivityCustomWrap');
        if (custom) custom.hidden = true;
        refreshTeacherPanel();
      });
      panel.querySelectorAll('[data-coin-delta]').forEach(button => {
        button.addEventListener('click', () => runPanelAction({ kind: 'coin', delta: integer(button.dataset.coinDelta) }));
      });
      panel.querySelectorAll('[data-attempt-delta]').forEach(button => {
        button.addEventListener('click', () => runPanelAction({ kind: 'attempt', delta: integer(button.dataset.attemptDelta) }));
      });
      document.getElementById('teacherActivityCustomCoin')?.addEventListener('click', toggleCustomCoinAdjustment);
      document.getElementById('teacherActivityCustomConfirm')?.addEventListener('click', submitCustomCoinAdjustment);
      document.getElementById('teacherActivityCustomValue')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') submitCustomCoinAdjustment();
      });
      refreshTeacherPanel();
    }

    function showStudentNotice(message) {
      const notice = document.getElementById('studentHomeNotice');
      if (notice) {
        notice.textContent = message || '';
        notice.hidden = !message;
      } else if (message) {
        root.alert?.(message);
      }
    }

    async function rawAdventureState(user) {
      const loader = runtime.rawLoadAdventureState || root.loadVocabularyAdventureState;
      return typeof loader === 'function' ? loader(studentKey(user)) : null;
    }

    async function rawLegacyUsage() {
      const loader = runtime.rawLegacyUsage || root.getVocabularyAdventureLegacyChallengeUsage;
      return typeof loader === 'function' ? loader() : { attempts: 0, bestScore: 0 };
    }

    function adventureCompletedToday(state, today) {
      return !!(state && state.session && state.session.date === today && state.session.completed === true);
    }

    async function installAdventureHooks() {
      if (typeof root.loadVocabularyAdventureState !== 'function'
          || typeof root.saveCurrentVocabularyAdventureState !== 'function') return;

      if (!runtime.rawLoadAdventureState) runtime.rawLoadAdventureState = root.loadVocabularyAdventureState;
      if (!runtime.rawSaveAdventureState) runtime.rawSaveAdventureState = root.saveCurrentVocabularyAdventureState;
      if (!runtime.rawLegacyUsage && typeof root.getVocabularyAdventureLegacyChallengeUsage === 'function') {
        runtime.rawLegacyUsage = root.getVocabularyAdventureLegacyChallengeUsage;
      }

      if (!root.loadVocabularyAdventureState.__activityVirtualized) {
        const wrappedLoad = async function activityAwareLoadVocabularyAdventureState(user) {
          const state = await runtime.rawLoadAdventureState(user);
          if (!state || !ACTIVITY_PROJECT_KEYS.includes('vocabularyChallenge')) return state;
          const student = studentKey(user);
          const allowed = await getAttemptTotal(student, 'vocabularyChallenge', PROJECTS.vocabularyChallenge.baseAttempts);
          const legacy = await rawLegacyUsage();
          const today = dateKey();
          const stateAttempts = state.challengeDaily && state.challengeDaily.date === today
            ? nonNegativeInteger(state.challengeDaily.attempts)
            : 0;
          const virtual = virtualizeWordChallengeUsage(legacy.attempts, stateAttempts, allowed);
          const next = JSON.parse(JSON.stringify(state));
          next.challengeDaily = {
            ...(isPlainObject(next.challengeDaily) ? next.challengeDaily : {}),
            date: today,
            attempts: virtual.virtualState
          };
          return next;
        };
        wrappedLoad.__activityVirtualized = true;
        root.loadVocabularyAdventureState = wrappedLoad;
      }

      if (runtime.rawLegacyUsage && !root.getVocabularyAdventureLegacyChallengeUsage.__activityVirtualized) {
        const wrappedLegacy = async function activityAwareLegacyUsage() {
          const actual = await runtime.rawLegacyUsage();
          const allowed = await getAttemptTotal(currentStudent(), 'vocabularyChallenge', PROJECTS.vocabularyChallenge.baseAttempts);
          const virtual = virtualizeWordChallengeUsage(actual.attempts, 0, allowed);
          return { ...actual, attempts: virtual.virtualLegacy };
        };
        wrappedLegacy.__activityVirtualized = true;
        root.getVocabularyAdventureLegacyChallengeUsage = wrappedLegacy;
      }

      if (!root.saveCurrentVocabularyAdventureState.__activityAware) {
        const wrappedSave = async function activityAwareSaveVocabularyAdventureState(nextState) {
          const user = currentStudent();
          const today = dateKey();
          let prepared = nextState && typeof nextState === 'object'
            ? JSON.parse(JSON.stringify(nextState))
            : nextState;
          const current = await runtime.rawLoadAdventureState(user).catch(() => null);

          if (runtime.wordChallengeVirtualActive && prepared && prepared.challengeDaily) {
            const allowed = await getAttemptTotal(user, 'vocabularyChallenge', PROJECTS.vocabularyChallenge.baseAttempts);
            const actualLegacy = await rawLegacyUsage();
            const actualStateAttempts = current && current.challengeDaily && current.challengeDaily.date === today
              ? nonNegativeInteger(current.challengeDaily.attempts)
              : 0;
            const virtual = virtualizeWordChallengeUsage(actualLegacy.attempts, actualStateAttempts, allowed);
            prepared.challengeDaily.attempts = nonNegativeInteger(prepared.challengeDaily.attempts) + virtual.residualBonus;
          }

          const adventureTransitioned = !!(
            runtime.adventurePlayerActive
            && prepared
            && prepared.session
            && prepared.session.date === today
            && prepared.session.completed === true
            && !(current && current.session && current.session.date === today && current.session.completed === true)
          );
          const saved = await runtime.rawSaveAdventureState(prepared);
          if (saved && adventureTransitioned) await incrementUsage(user, 'adventure');
          return saved;
        };
        wrappedSave.__activityAware = true;
        root.saveCurrentVocabularyAdventureState = wrappedSave;
      }

      if (typeof root.openVocabularyAdventure === 'function' && !root.openVocabularyAdventure.__activityAware) {
        runtime.rawOpenAdventure = root.openVocabularyAdventure;
        const wrappedOpenAdventure = async function activityAwareOpenAdventure() {
          const user = currentStudent();
          const today = dateKey();
          runtime.wordChallengeVirtualActive = false;
          runtime.adventurePlayerActive = true;
          const state = await runtime.rawLoadAdventureState(user).catch(() => null);
          const inferred = adventureCompletedToday(state, today) ? 1 : 0;
          const usage = await getAttemptUsage(user, 'adventure', inferred);
          const total = await getAttemptTotal(user, 'adventure', PROJECTS.adventure.baseAttempts);
          if (state && adventureCompletedToday(state, today) && usage < total) {
            const reset = resetAdventureSessionForAttempt(state, today, usage + 1);
            if (reset && !await runtime.rawSaveAdventureState(reset)) {
              showStudentNotice('新的探险次数暂时无法保存，请检查网络后重试。');
              runtime.adventurePlayerActive = false;
              return;
            }
          }
          return runtime.rawOpenAdventure.apply(this, arguments);
        };
        wrappedOpenAdventure.__activityAware = true;
        root.openVocabularyAdventure = wrappedOpenAdventure;
      }

      if (typeof root.closeVocabularyAdventure === 'function' && !root.closeVocabularyAdventure.__activityAware) {
        runtime.rawCloseAdventure = root.closeVocabularyAdventure;
        const wrappedCloseAdventure = function activityAwareCloseAdventure() {
          runtime.adventurePlayerActive = false;
          return runtime.rawCloseAdventure.apply(this, arguments);
        };
        wrappedCloseAdventure.__activityAware = true;
        root.closeVocabularyAdventure = wrappedCloseAdventure;
      }

      if (typeof root.openVocabularyAdventureChallenge === 'function'
          && !root.openVocabularyAdventureChallenge.__activityAware) {
        runtime.rawOpenWordChallenge = root.openVocabularyAdventureChallenge;
        const wrappedOpenWordChallenge = function activityAwareOpenWordChallenge() {
          runtime.adventurePlayerActive = false;
          runtime.wordChallengeVirtualActive = true;
          return runtime.rawOpenWordChallenge.apply(this, arguments);
        };
        wrappedOpenWordChallenge.__activityAware = true;
        root.openVocabularyAdventureChallenge = wrappedOpenWordChallenge;
      }

      if (typeof root.closeVocabularyAdventureChallenge === 'function'
          && !root.closeVocabularyAdventureChallenge.__activityAware) {
        runtime.rawCloseWordChallenge = root.closeVocabularyAdventureChallenge;
        const wrappedCloseWordChallenge = function activityAwareCloseWordChallenge() {
          runtime.wordChallengeVirtualActive = false;
          return runtime.rawCloseWordChallenge.apply(this, arguments);
        };
        wrappedCloseWordChallenge.__activityAware = true;
        root.closeVocabularyAdventureChallenge = wrappedCloseWordChallenge;
      }
    }

    function installGrammarCompletionWatcher() {
      const frame = document.getElementById('grammarChallengeFrame');
      if (!frame || runtime.grammarFrameLoadInstalled) return;
      runtime.grammarFrameLoadInstalled = true;
      frame.addEventListener('load', () => {
        const token = runtime.activeGrammarToken;
        if (!token) return;
        let doc;
        try { doc = frame.contentDocument; } catch (_) { return; }
        if (!doc) return;
        let handled = false;
        const complete = () => {
          if (handled || token !== runtime.activeGrammarToken || token === runtime.completedGrammarToken) return;
          const done = !!doc.querySelector('[data-complete="true"]')
            || !!(doc.getElementById('resultScreen') && !doc.getElementById('resultScreen').hidden);
          if (!done) return;
          handled = true;
          runtime.completedGrammarToken = token;
          incrementUsage(currentStudent(), 'grammarChallenge').then(refreshStudentAttemptIndicators);
        };
        const observer = typeof root.MutationObserver === 'function'
          ? new root.MutationObserver(complete)
          : null;
        if (observer) observer.observe(doc.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['data-complete', 'hidden', 'open']
        });
        complete();
      });
    }

    async function openGrammarWithAdjustedAttempts() {
      if (isTeacherMode()) return;
      showStudentNotice('');
      const route = typeof root.loadDailyLearningRoute === 'function'
        ? await root.loadDailyLearningRoute({ force: false, reason: 'action' })
        : root.getDailyLearningRoute?.();
      if (!route || !route.grammarChallenge) {
        showStudentNotice('今日语法挑战暂时无法读取，请检查网络后再点一次。');
        return;
      }
      await root.loadFeatureGroup?.('grammarChallenge');
      const user = currentStudent();
      const records = typeof root.sbGet === 'function'
        ? await root.sbGet(`grammar_challenge_daily_v1_${user}`)
        : null;
      const record = isPlainObject(records) ? records[dateKey()] : null;
      const inferred = record && record.status === 'completed' ? 1 : 0;
      const usage = await getAttemptUsage(user, 'grammarChallenge', inferred);
      const total = await getAttemptTotal(user, 'grammarChallenge', PROJECTS.grammarChallenge.baseAttempts);
      if (usage >= total) {
        showStudentNotice('今天的语法挑战次数已经用完。');
        return;
      }
      runtime.activeGrammarToken = `${Date.now()}:${Math.random()}`;
      runtime.completedGrammarToken = '';
      root.installDailyGrammarFrameWatcher?.();
      installGrammarCompletionWatcher();
      if (typeof root.openGrammarChallenge !== 'function') {
        showStudentNotice('语法挑战加载失败，请检查网络后重试。');
        return;
      }
      root.openGrammarChallenge(route.grammarChallenge.id);
    }

    async function installCoursewareCompletionHook() {
      if (runtime.coursewareHookInstalled || typeof root.markStudentCoursewareCompleted !== 'function') return;
      runtime.rawMarkCoursewareCompleted = root.markStudentCoursewareCompleted;
      const wrapped = async function activityAwareCoursewareCompletion() {
        const token = runtime.activeCoursewareToken;
        const result = await runtime.rawMarkCoursewareCompleted.apply(this, arguments);
        if (token && token === runtime.activeCoursewareToken) {
          runtime.activeCoursewareToken = '';
          await incrementUsage(currentStudent(), 'classroomPractice');
          refreshStudentAttemptIndicators();
        }
        return result;
      };
      wrapped.__activityAware = true;
      root.markStudentCoursewareCompleted = wrapped;
      runtime.coursewareHookInstalled = true;
    }

    async function openClassroomWithAdjustedAttempts() {
      if (isTeacherMode()) return;
      showStudentNotice('');
      const route = typeof root.loadDailyLearningRoute === 'function'
        ? await root.loadDailyLearningRoute({ force: false, reason: 'action' })
        : root.getDailyLearningRoute?.();
      if (!route || !route.classroomPractice) {
        showStudentNotice('今日随堂练习暂时无法读取，请检查网络后再点一次。');
        return;
      }
      await root.loadFeatureGroup?.('courseware');
      await installCoursewareCompletionHook();
      const user = currentStudent();
      const record = typeof root.loadStudentClassroomPracticeRecord === 'function'
        ? await root.loadStudentClassroomPracticeRecord(user, dateKey())
        : null;
      const inferred = record && record.status === 'completed' ? 1 : 0;
      const usage = await getAttemptUsage(user, 'classroomPractice', inferred);
      const total = await getAttemptTotal(user, 'classroomPractice', PROJECTS.classroomPractice.baseAttempts);
      if (usage >= total) {
        showStudentNotice('今天的随堂练习次数已经用完。');
        return;
      }
      if (record && record.status === 'completed' && typeof root.saveStudentClassroomPracticeRecord === 'function') {
        const history = Array.isArray(record.attemptHistory) ? record.attemptHistory.slice(-19) : [];
        history.push({
          attempt: Math.max(1, usage),
          status: 'completed',
          completedAt: record.completedAt || '',
          title: record.title || ''
        });
        const reopened = {
          ...record,
          status: 'started',
          attemptIndex: usage + 1,
          attemptHistory: history,
          startedAt: new Date().toISOString(),
          completedAt: ''
        };
        if (!await root.saveStudentClassroomPracticeRecord(reopened)) {
          showStudentNotice('新的随堂练习次数暂时无法保存，请检查网络后重试。');
          return;
        }
      }
      runtime.activeCoursewareToken = `${Date.now()}:${Math.random()}`;
      if (typeof root.openCourseware !== 'function') {
        showStudentNotice('随堂练习加载失败，请检查网络后重试。');
        return;
      }
      await root.openCourseware(route.classroomPractice.id);
    }

    function installStudentEntryHandlers() {
      if (isTeacherMode()) return;
      const grammar = document.getElementById('grammarChallengeHomeEntry');
      if (grammar) {
        grammar.removeAttribute('onclick');
        grammar.onclick = openGrammarWithAdjustedAttempts;
      }
      const classroom = document.getElementById('studentClassroomPracticeEntry');
      if (classroom) {
        classroom.removeAttribute('onclick');
        classroom.onclick = openClassroomWithAdjustedAttempts;
      }
    }

    async function refreshStudentAttemptIndicators() {
      if (isTeacherMode()) return;
      installStudentEntryHandlers();
      const user = currentStudent();
      const today = dateKey();
      const control = await loadControl(user);

      const grammarRecords = typeof root.sbGet === 'function'
        ? await root.sbGet(`grammar_challenge_daily_v1_${user}`).catch?.(() => null) || null
        : null;
      const grammarRecord = isPlainObject(grammarRecords) ? grammarRecords[today] : null;
      const grammarInferred = grammarRecord && grammarRecord.status === 'completed' ? 1 : 0;
      const grammarUsage = Math.max(projectAttemptUsage(control, today, 'grammarChallenge'), grammarInferred);
      const grammarTotal = projectAttemptTotal(control, today, 'grammarChallenge');
      const grammarStatus = document.getElementById('grammarChallengeHomeStatus');
      if (grammarStatus && grammarUsage > 0) {
        grammarStatus.textContent = grammarUsage < grammarTotal
          ? `还可挑战 ${grammarTotal - grammarUsage} 次`
          : '今日已完成';
      }

      const classroomRecord = typeof root.loadStudentClassroomPracticeRecord === 'function'
        ? await root.loadStudentClassroomPracticeRecord(user, today).catch?.(() => null) || null
        : null;
      const classroomInferred = classroomRecord && classroomRecord.status === 'completed' ? 1 : 0;
      const classroomUsage = Math.max(projectAttemptUsage(control, today, 'classroomPractice'), classroomInferred);
      const classroomTotal = projectAttemptTotal(control, today, 'classroomPractice');
      const classroomStatus = document.getElementById('studentClassroomPracticeStatus');
      if (classroomStatus && classroomUsage > 0) {
        classroomStatus.textContent = classroomUsage < classroomTotal
          ? `还可练习 ${classroomTotal - classroomUsage} 次`
          : '今日已完成';
      }

      if (runtime.rawLoadAdventureState) {
        const state = await runtime.rawLoadAdventureState(user).catch(() => null);
        const adventureInferred = adventureCompletedToday(state, today) ? 1 : 0;
        const adventureUsage = Math.max(projectAttemptUsage(control, today, 'adventure'), adventureInferred);
        const adventureTotal = projectAttemptTotal(control, today, 'adventure');
        const adventureStatus = document.getElementById('vocabularyAdventureHomeStatus');
        if (adventureStatus && state && adventureCompletedToday(state, today)) {
          adventureStatus.textContent = adventureUsage < adventureTotal
            ? `还可探险 ${adventureTotal - adventureUsage} 次`
            : '今日已完成';
        }
      }
    }

    function installFeatureHooks(group) {
      if (group === 'adventure' || group === 'teacherTools') {
        installAdventureHooks().then(refreshStudentAttemptIndicators);
      }
      if (group === 'courseware') installCoursewareCompletionHook();
      installStudentEntryHandlers();
    }

    function wrapFeatureLoader() {
      const original = root.loadFeatureGroup;
      if (typeof original !== 'function' || original.__studentActivityControlsWrapped) return;
      const wrapped = async function activityAwareFeatureLoader(group) {
        const result = await original.apply(this, arguments);
        installFeatureHooks(group);
        return result;
      };
      wrapped.__studentActivityControlsWrapped = true;
      root.loadFeatureGroup = wrapped;
    }

    function wrapHome() {
      const original = root.loadHome;
      if (typeof original !== 'function' || original.__studentActivityControlsWrapped) return;
      const wrapped = async function activityAwareHome() {
        const result = await original.apply(this, arguments);
        if (isTeacherMode()) installTeacherPanel();
        else {
          installStudentEntryHandlers();
          refreshStudentAttemptIndicators();
          root.setTimeout?.(() => {
            installStudentEntryHandlers();
            refreshStudentAttemptIndicators();
          }, 0);
        }
        return result;
      };
      wrapped.__studentActivityControlsWrapped = true;
      root.loadHome = wrapped;
    }

    function reassertStudentEntrypoints() {
      root.openStudentGrammarChallenge = openGrammarWithAdjustedAttempts;
      root.openStudentClassroomPractice = openClassroomWithAdjustedAttempts;
      installStudentEntryHandlers();
    }

    installStyles();
    wrapFeatureLoader();
    wrapHome();
    reassertStudentEntrypoints();
    installAdventureHooks();
    [0, 120, 400, 1000, 2200].forEach(delay => {
      root.setTimeout?.(() => {
        reassertStudentEntrypoints();
        installAdventureHooks();
      }, delay);
    });

    root.getStudentActivityAttemptTotal = getAttemptTotal;
    root.getStudentActivityAttemptUsage = getAttemptUsage;
    root.refreshTeacherActivityPanel = refreshTeacherPanel;
    root.refreshStudentActivityAttempts = refreshStudentAttemptIndicators;
  }

  return Object.freeze({
    CONTROL_KEY_PREFIX,
    REWARD_KEY_PREFIX,
    CONTROL_VERSION,
    MAX_ATTEMPT_TOTAL,
    PROJECTS,
    ACTIVITY_PROJECT_KEYS,
    dateKey,
    normalizeControlDay,
    normalizeControlRecord,
    projectAttemptTotal,
    projectAttemptUsage,
    applyAttemptIncrease,
    applyUsageMinimum,
    applyUsageIncrement,
    calculateCoinAdjustment,
    virtualizeWordChallengeUsage,
    resetAdventureSessionForAttempt,
    install
  });
});
