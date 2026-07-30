(function studentRewardsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.StudentRewards = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStudentRewardsModule() {
  'use strict';

  const REWARD_KEY_PREFIX = 'student_reward_v1_';
  const REGULAR_DAILY_MAX = 30;
  const BREAKTHROUGH_DAILY_MAX = 10;
  const INITIAL_BREAKTHROUGH_DATE = '2026-07-30';
  const SOURCE_MAX = Object.freeze({
    adventure: 10,
    vocabularyChallenge: 10,
    classroomPractice: 10
  });
  const REWARD_PROJECTS = Object.freeze({
    breakthrough: Object.freeze({ label: '突破金币', max: BREAKTHROUGH_DAILY_MAX, regular: false }),
    adventure: Object.freeze({ label: '词汇探险', max: SOURCE_MAX.adventure, regular: true }),
    vocabularyChallenge: Object.freeze({ label: '单词挑战', max: SOURCE_MAX.vocabularyChallenge, regular: true }),
    classroomPractice: Object.freeze({ label: '随堂练习', max: SOURCE_MAX.classroomPractice, regular: true })
  });
  const STUDENTS = Object.freeze([
    { key: 'sister', name: '姐姐' },
    { key: 'brother', name: '弟弟' }
  ]);

  function dateKey(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (!Number.isFinite(date.getTime())) return '';
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function clampInteger(value, min, max) {
    const number = Math.round(Number(value) || 0);
    return Math.max(min, Math.min(max, number));
  }

  function normalizeDay(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const sources = source.sources && typeof source.sources === 'object' && !Array.isArray(source.sources)
      ? { ...source.sources }
      : {};
    const rawOverrides = source.teacherSourceOverrides && typeof source.teacherSourceOverrides === 'object'
      && !Array.isArray(source.teacherSourceOverrides)
      ? source.teacherSourceOverrides
      : {};
    const teacherSourceOverrides = {};
    Object.keys(SOURCE_MAX).forEach(key => {
      sources[key] = clampInteger(sources[key], 0, SOURCE_MAX[key]);
      if (Object.prototype.hasOwnProperty.call(rawOverrides, key)) {
        teacherSourceOverrides[key] = clampInteger(rawOverrides[key], 0, SOURCE_MAX[key]);
      }
    });
    const sourceTotal = Object.keys(SOURCE_MAX).reduce((sum, key) => sum + sources[key], 0);
    const legacyCoins = clampInteger(source.coins, 0, REGULAR_DAILY_MAX);
    const coins = Math.max(legacyCoins, Math.min(REGULAR_DAILY_MAX, sourceTotal));
    return {
      ...source,
      coins,
      sources,
      teacherSourceOverrides,
      breakthroughCoins: clampInteger(source.breakthroughCoins, 0, BREAKTHROUGH_DAILY_MAX),
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
    };
  }

  function normalizeRewardRecord(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const dailySource = source.daily && typeof source.daily === 'object' && !Array.isArray(source.daily)
      ? source.daily
      : {};
    const daily = {};
    Object.keys(dailySource).forEach(key => {
      daily[key] = normalizeDay(dailySource[key]);
    });
    const calculatedTotal = Object.values(daily).reduce(
      (sum, day) => sum + day.coins + day.breakthroughCoins,
      0
    );
    const suppliedTotal = Number(source.totalCoins);
    return {
      ...source,
      version: 2,
      totalCoins: Number.isFinite(suppliedTotal) ? Math.max(0, Math.round(suppliedTotal)) : calculatedTotal,
      daily,
      transactions: Array.isArray(source.transactions) ? source.transactions.slice(-100) : []
    };
  }

  function applySourceReward(recordValue, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const record = normalizeRewardRecord(recordValue);
    const date = String(settings.date || dateKey());
    const source = String(settings.source || '');
    if (!Object.prototype.hasOwnProperty.call(SOURCE_MAX, source)) {
      return { record, changed: false, delta: 0 };
    }
    const day = normalizeDay(record.daily[date]);
    if (Object.prototype.hasOwnProperty.call(day.teacherSourceOverrides, source)) {
      return { record, changed: false, delta: 0, overridden: true };
    }
    const current = clampInteger(day.sources[source], 0, SOURCE_MAX[source]);
    const requested = clampInteger(settings.amount, 0, SOURCE_MAX[source]);
    const nextValue = settings.mode === 'max' ? Math.max(current, requested) : requested;
    const nextSources = { ...day.sources, [source]: nextValue };
    const sourceTotal = Object.keys(SOURCE_MAX).reduce(
      (sum, key) => sum + clampInteger(nextSources[key], 0, SOURCE_MAX[key]),
      0
    );
    const nextCoins = Math.max(day.coins, Math.min(REGULAR_DAILY_MAX, sourceTotal));
    const delta = nextCoins - day.coins;
    if (delta === 0 && current === nextValue) return { record, changed: false, delta: 0 };
    const now = String(settings.at || new Date().toISOString());
    record.daily[date] = {
      ...day,
      coins: clampInteger(nextCoins, 0, REGULAR_DAILY_MAX),
      sources: nextSources,
      updatedAt: now
    };
    record.totalCoins = Math.max(0, record.totalCoins + delta);
    record.transactions.push({
      id: `${date}:${source}:${now}`,
      date,
      kind: 'earned',
      source,
      delta,
      at: now
    });
    record.transactions = record.transactions.slice(-100);
    return { record, changed: true, delta };
  }

  function applyBreakthroughAdjustment(recordValue, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const record = normalizeRewardRecord(recordValue);
    const date = String(settings.date || dateKey());
    const day = normalizeDay(record.daily[date]);
    const requestedDelta = Math.round(Number(settings.delta) || 0);
    const nextValue = clampInteger(day.breakthroughCoins + requestedDelta, 0, BREAKTHROUGH_DAILY_MAX);
    const delta = nextValue - day.breakthroughCoins;
    if (!delta) return { record, changed: false, delta: 0, projectDelta: 0 };
    const now = String(settings.at || new Date().toISOString());
    record.daily[date] = {
      ...day,
      breakthroughCoins: nextValue,
      updatedAt: now
    };
    record.totalCoins = Math.max(0, record.totalCoins + delta);
    record.transactions.push({
      id: `${date}:breakthrough:${now}`,
      date,
      kind: settings.kind || 'breakthrough',
      source: settings.source || 'teacher',
      delta,
      projectDelta: delta,
      reason: String(settings.reason || '').trim(),
      at: now
    });
    record.transactions = record.transactions.slice(-100);
    return { record, changed: true, delta, projectDelta: delta };
  }

  function applyRewardAdjustment(recordValue, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const project = String(settings.project || settings.source || '');
    if (project === 'breakthrough') {
      return applyBreakthroughAdjustment(recordValue, {
        ...settings,
        source: 'teacher',
        kind: 'teacher-adjustment'
      });
    }

    const record = normalizeRewardRecord(recordValue);
    if (!Object.prototype.hasOwnProperty.call(SOURCE_MAX, project)) {
      return { record, changed: false, delta: 0, projectDelta: 0 };
    }

    const date = String(settings.date || dateKey());
    const day = normalizeDay(record.daily[date]);
    const current = clampInteger(day.sources[project], 0, SOURCE_MAX[project]);
    const requestedDelta = Math.round(Number(settings.delta) || 0);
    const nextValue = clampInteger(current + requestedDelta, 0, SOURCE_MAX[project]);
    const projectDelta = nextValue - current;
    if (!projectDelta) return { record, changed: false, delta: 0, projectDelta: 0 };

    const nextCoins = clampInteger(day.coins + projectDelta, 0, REGULAR_DAILY_MAX);
    const delta = nextCoins - day.coins;
    const now = String(settings.at || new Date().toISOString());
    record.daily[date] = {
      ...day,
      coins: nextCoins,
      sources: { ...day.sources, [project]: nextValue },
      teacherSourceOverrides: { ...day.teacherSourceOverrides, [project]: nextValue },
      updatedAt: now
    };
    record.totalCoins = Math.max(0, record.totalCoins + delta);
    record.transactions.push({
      id: `${date}:${project}:teacher:${now}`,
      date,
      kind: 'teacher-adjustment',
      source: project,
      delta,
      projectDelta,
      at: now
    });
    record.transactions = record.transactions.slice(-100);
    return { record, changed: true, delta, projectDelta };
  }

  function seedInitialBreakthrough(recordValue, date, at) {
    const record = normalizeRewardRecord(recordValue);
    if (date !== INITIAL_BREAKTHROUGH_DATE) return { record, changed: false, delta: 0 };
    const day = normalizeDay(record.daily[date]);
    if (day.initialBreakthroughSeed === INITIAL_BREAKTHROUGH_DATE) {
      return { record, changed: false, delta: 0 };
    }
    const delta = BREAKTHROUGH_DAILY_MAX - day.breakthroughCoins;
    const now = String(at || new Date().toISOString());
    record.daily[date] = {
      ...day,
      breakthroughCoins: BREAKTHROUGH_DAILY_MAX,
      initialBreakthroughSeed: INITIAL_BREAKTHROUGH_DATE,
      updatedAt: now
    };
    record.totalCoins = Math.max(0, record.totalCoins + delta);
    if (delta) {
      record.transactions.push({
        id: `${date}:breakthrough:initial`,
        date,
        kind: 'breakthrough',
        source: 'initial',
        delta,
        reason: '2026-07-30 初始突破金币',
        at: now
      });
      record.transactions = record.transactions.slice(-100);
    }
    return { record, changed: true, delta };
  }

  function install(root) {
    if (!root || root.__studentRewardsInstalled) return;
    root.__studentRewardsInstalled = true;
    let seedPromise = null;
    let voiceCache = null;
    let scanQueued = false;
    let coursewareHookTimer = null;
    let coursewareHookAttempts = 0;

    function currentUserValue() {
      try {
        return typeof currentUser !== 'undefined' ? currentUser : root.currentUser;
      } catch (_) {
        return root.currentUser;
      }
    }

    function rewardKey(user) {
      return REWARD_KEY_PREFIX + (user === 'brother' ? 'brother' : 'sister');
    }

    async function loadReward(user) {
      if (typeof root.sbGet !== 'function') return normalizeRewardRecord(null);
      return normalizeRewardRecord(await root.sbGet(rewardKey(user)));
    }

    async function saveReward(user, record) {
      if (typeof root.sbSet !== 'function') return false;
      try {
        await root.sbSet(rewardKey(user), normalizeRewardRecord(record));
        return true;
      } catch (error) {
        if (typeof root.showStorageError === 'function') root.showStorageError(error);
        return false;
      }
    }

    async function ensureInitialBreakthrough() {
      const today = dateKey();
      if (today !== INITIAL_BREAKTHROUGH_DATE) return;
      if (seedPromise) return seedPromise;
      seedPromise = Promise.all(STUDENTS.map(async student => {
        const result = seedInitialBreakthrough(await loadReward(student.key), today);
        if (result.changed && !await saveReward(student.key, result.record)) {
          throw new Error(`Unable to seed ${student.key}`);
        }
        return result.record;
      })).catch(error => {
        seedPromise = null;
        console.warn('Unable to seed breakthrough coins', error);
      });
      return seedPromise;
    }

    function installStyles() {
      if (document.getElementById('studentRewardEnhancementStyles')) return;
      const style = document.createElement('style');
      style.id = 'studentRewardEnhancementStyles';
      style.textContent = `
        .student-summary-card__values .student-breakthrough-value strong{display:flex;align-items:baseline;gap:4px}
        .student-breakthrough-value b{font-size:1.05em}
        .teacher-reward-panel{width:min(900px,calc(100% - 24px));margin:12px auto 28px;padding:12px 14px;border:1px solid #eadde6;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(80,55,75,.07)}
        .teacher-reward-panel__row{display:grid;grid-template-columns:minmax(190px,.75fr) minmax(0,1.7fr);gap:14px;align-items:end}
        .teacher-reward-panel__summary{min-width:0;align-self:center}
        .teacher-reward-panel h2{margin:0;color:#6b4e7a;font-size:18px;line-height:1.2;white-space:nowrap}
        .teacher-reward-panel p{margin:5px 0 0;color:#847780;font-size:13px;line-height:1.35}
        .teacher-reward-controls{display:grid;grid-template-columns:minmax(112px,.85fr) minmax(138px,1.15fr) 78px 68px 68px;gap:8px;align-items:end}
        .teacher-reward-controls label{display:grid;gap:4px;min-width:0;font-size:11px;color:#7f727b}
        .teacher-reward-controls select,.teacher-reward-controls input{width:100%;height:40px;border:1px solid #dfd1da;border-radius:10px;padding:6px 9px;background:#fff;color:#594f56;font:inherit;outline:none}
        .teacher-reward-controls select:focus,.teacher-reward-controls input:focus{border-color:#a8d8c8;box-shadow:0 0 0 3px rgba(168,216,200,.2)}
        .teacher-reward-controls button{height:40px;border:0;border-radius:10px;padding:6px 10px;font-weight:800;cursor:pointer;white-space:nowrap}
        .teacher-reward-controls button:disabled{opacity:.55;cursor:wait}
        .teacher-reward-add{background:#a8d8c8;color:#244e42}.teacher-reward-subtract{background:#f6d6dd;color:#7c3d50}
        #teacherRewardStatus{min-height:18px;margin-top:7px;text-align:right;font-size:12px;font-weight:700;color:#5f9f8c}
        @media(max-width:760px){
          .teacher-reward-panel{padding:11px 12px}
          .teacher-reward-panel__row{grid-template-columns:1fr;gap:9px}
          .teacher-reward-panel__summary{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
          .teacher-reward-panel__summary p{margin:0;text-align:right}
          .teacher-reward-controls{grid-template-columns:1fr 1.25fr 72px 62px 62px;gap:6px}
        }
        @media(max-width:540px){
          .teacher-reward-controls{grid-template-columns:1fr 1fr 70px}
          .teacher-reward-controls button{grid-row:2}
          .teacher-reward-add{grid-column:2}.teacher-reward-subtract{grid-column:3}
          #teacherRewardStatus{text-align:left}
        }
        .vocabulary-adventure-earned-coins{font-size:clamp(24px,4vw,42px);font-weight:900;color:#b77a1d;margin:12px 0}
      `;
      document.head.appendChild(style);
    }

    function ensureBreakthroughStudentRow() {
      const values = document.getElementById('studentRewardValues');
      if (!values || document.getElementById('studentBreakthroughCoins')) return;
      const row = document.createElement('span');
      row.className = 'student-breakthrough-value';
      row.innerHTML = '<small>突破金币</small><strong><b id="studentBreakthroughCoins">0</b> / <b>10</b></strong>';
      const progress = values.querySelector('.student-summary-card__progress');
      values.insertBefore(row, progress || null);
    }

    function renderEnhancedReward(recordValue) {
      const record = normalizeRewardRecord(recordValue);
      const day = normalizeDay(record.daily[dateKey()]);
      if (typeof root.renderStudentRewardSummary === 'function') {
        root.renderStudentRewardSummary({
          available: true,
          totalCoins: record.totalCoins,
          todayCoins: day.coins,
          todayMaxCoins: REGULAR_DAILY_MAX
        });
      }
      ensureBreakthroughStudentRow();
      const breakthrough = document.getElementById('studentBreakthroughCoins');
      if (breakthrough) breakthrough.textContent = String(day.breakthroughCoins);
      return record;
    }

    async function loadEnhancedStudentRewardSummary() {
      if (typeof root.isTeacher === 'function' && root.isTeacher()) return;
      await ensureInitialBreakthrough();
      const user = currentUserValue() === 'brother' ? 'brother' : 'sister';
      const local = typeof root.getMirrorValue === 'function' ? root.getMirrorValue(rewardKey(user)) : null;
      if (local) renderEnhancedReward(local);
      const remote = await loadReward(user);
      renderEnhancedReward(remote);
    }

    async function recordSource(user, source, amount, mode) {
      const student = user === 'brother' ? 'brother' : 'sister';
      const current = await loadReward(student);
      const result = applySourceReward(current, {
        date: dateKey(),
        source,
        amount,
        mode: mode === 'max' ? 'max' : 'set'
      });
      if (result.changed && !await saveReward(student, result.record)) {
        return { ok: false, record: current, delta: 0 };
      }
      if (currentUserValue() === student && !(typeof root.isTeacher === 'function' && root.isTeacher())) {
        renderEnhancedReward(result.record);
      }
      return { ok: true, record: result.record, delta: result.delta };
    }

    async function adjustRewardProject(user, project, delta) {
      const student = user === 'brother' ? 'brother' : 'sister';
      const current = await loadReward(student);
      const result = applyRewardAdjustment(current, {
        date: dateKey(),
        project,
        delta
      });
      if (result.changed && !await saveReward(student, result.record)) {
        return { ok: false, record: current, delta: 0, projectDelta: 0 };
      }
      return { ok: true, record: result.record, delta: result.delta, projectDelta: result.projectDelta };
    }

    async function adjustBreakthrough(user, delta) {
      return adjustRewardProject(user, 'breakthrough', delta);
    }

    function selectedTeacherProject() {
      const value = String(document.getElementById('teacherRewardProject')?.value || 'breakthrough');
      return Object.prototype.hasOwnProperty.call(REWARD_PROJECTS, value) ? value : 'breakthrough';
    }

    function projectValue(day, project) {
      return project === 'breakthrough'
        ? day.breakthroughCoins
        : clampInteger(day.sources[project], 0, SOURCE_MAX[project]);
    }

    async function refreshTeacherPanel() {
      const panel = document.getElementById('teacherRewardPanel');
      if (!panel) return;
      await ensureInitialBreakthrough();
      const user = document.getElementById('teacherRewardStudent')?.value === 'brother' ? 'brother' : 'sister';
      const project = selectedTeacherProject();
      const record = await loadReward(user);
      const day = normalizeDay(record.daily[dateKey()]);
      const meta = REWARD_PROJECTS[project];
      const current = document.getElementById('teacherRewardCurrent');
      const status = document.getElementById('teacherRewardStatus');
      if (current) {
        current.textContent = `${meta.label} ${projectValue(day, project)} / ${meta.max} · 今日常规 ${day.coins} / ${REGULAR_DAILY_MAX} · 累计 ${record.totalCoins}`;
      }
      if (status) status.textContent = '';
    }

    function setTeacherButtonsDisabled(disabled) {
      ['teacherRewardAdd', 'teacherRewardSubtract'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = Boolean(disabled);
      });
    }

    async function applyTeacherAdjustment(direction) {
      const studentSelect = document.getElementById('teacherRewardStudent');
      const amountInput = document.getElementById('teacherRewardAmount');
      const status = document.getElementById('teacherRewardStatus');
      const user = studentSelect?.value === 'brother' ? 'brother' : 'sister';
      const project = selectedTeacherProject();
      const meta = REWARD_PROJECTS[project];
      const amount = clampInteger(amountInput?.value, 1, meta.max);
      setTeacherButtonsDisabled(true);
      try {
        const result = await adjustRewardProject(user, project, direction * amount);
        if (status) {
          if (!result.ok) status.textContent = '保存失败，请检查网络后重试';
          else if (result.projectDelta) {
            status.textContent = `已${result.projectDelta > 0 ? '增加' : '扣除'} ${Math.abs(result.projectDelta)} 个${meta.label}`;
          } else {
            status.textContent = direction > 0 ? '该项目已到今日上限' : '该项目已经是 0';
          }
        }
        if (amountInput) amountInput.value = '1';
        const record = result.record || await loadReward(user);
        const day = normalizeDay(record.daily[dateKey()]);
        const current = document.getElementById('teacherRewardCurrent');
        if (current) {
          current.textContent = `${meta.label} ${projectValue(day, project)} / ${meta.max} · 今日常规 ${day.coins} / ${REGULAR_DAILY_MAX} · 累计 ${record.totalCoins}`;
        }
      } finally {
        setTeacherButtonsDisabled(false);
      }
    }

    function installTeacherPanel() {
      if (!(typeof root.isTeacher === 'function' && root.isTeacher())) return;
      const legacyPanel = document.getElementById('teacherBreakthroughPanel');
      if (legacyPanel) legacyPanel.remove();
      if (document.getElementById('teacherRewardPanel')) {
        refreshTeacherPanel();
        return;
      }
      const nav = document.querySelector('.teacher-home-nav');
      if (!nav) return;
      const panel = document.createElement('section');
      panel.id = 'teacherRewardPanel';
      panel.className = 'teacher-reward-panel teacher-only';
      panel.innerHTML = `
        <div class="teacher-reward-panel__row">
          <div class="teacher-reward-panel__summary">
            <h2>金币调整</h2>
            <p id="teacherRewardCurrent">正在读取今日金币…</p>
          </div>
          <div class="teacher-reward-controls">
            <label><span>学生</span><select id="teacherRewardStudent"><option value="sister">姐姐</option><option value="brother">弟弟</option></select></label>
            <label><span>项目</span><select id="teacherRewardProject"><option value="breakthrough">突破金币</option><option value="adventure">词汇探险</option><option value="vocabularyChallenge">单词挑战</option><option value="classroomPractice">随堂练习</option></select></label>
            <label><span>数量</span><input id="teacherRewardAmount" type="number" min="1" max="10" value="1" inputmode="numeric"></label>
            <button type="button" class="teacher-reward-add" id="teacherRewardAdd">增加</button>
            <button type="button" class="teacher-reward-subtract" id="teacherRewardSubtract">扣除</button>
          </div>
        </div>
        <div id="teacherRewardStatus" role="status" aria-live="polite"></div>`;
      nav.insertAdjacentElement('afterend', panel);
      document.getElementById('teacherRewardStudent')?.addEventListener('change', refreshTeacherPanel);
      document.getElementById('teacherRewardProject')?.addEventListener('change', refreshTeacherPanel);
      document.getElementById('teacherRewardAdd')?.addEventListener('click', () => applyTeacherAdjustment(1));
      document.getElementById('teacherRewardSubtract')?.addEventListener('click', () => applyTeacherAdjustment(-1));
      refreshTeacherPanel();
    }

    function refreshVoiceCache() {
      if (!('speechSynthesis' in root)) return;
      const voices = root.speechSynthesis.getVoices();
      voiceCache = voices.find(voice => String(voice.lang || '').toLowerCase().startsWith('en-gb'))
        || voices.find(voice => String(voice.lang || '').toLowerCase().startsWith('en'))
        || null;
    }

    function speakBritish(text) {
      const word = String(text || '').trim();
      if (!word || !('speechSynthesis' in root) || typeof root.SpeechSynthesisUtterance !== 'function') return false;
      root.speechSynthesis.cancel();
      refreshVoiceCache();
      const utterance = new root.SpeechSynthesisUtterance(word);
      utterance.lang = 'en-GB';
      utterance.rate = 0.88;
      if (voiceCache) utterance.voice = voiceCache;
      root.speechSynthesis.speak(utterance);
      return true;
    }

    if (typeof root.speakEnglish !== 'function') root.speakEnglish = speakBritish;
    if (typeof root.speakWord !== 'function') root.speakWord = speakBritish;
    if ('speechSynthesis' in root) {
      refreshVoiceCache();
      root.speechSynthesis.addEventListener?.('voiceschanged', refreshVoiceCache);
    }

    function replaceInternalStudentCopy() {
      document.querySelectorAll('.vocabulary-adventure-hint strong').forEach(node => {
        if (node.textContent.includes('首字母')) node.textContent = '再听一次，想想单词的声音和意思';
      });
      const feedback = document.getElementById('vocabularyAdventureFeedbackText');
      if (feedback) {
        const text = feedback.textContent || '';
        if (text.includes('记为 F')) feedback.textContent = '这个词还需要多见几次，我们继续。';
        else if (text.includes('记录为 H')) feedback.textContent = '提示帮你想起来了。';
        else if (text.includes('记录为 D')) feedback.textContent = '找到了！';
        else if (text.includes('答对记为 H') || text.includes('答错记为 F')) {
          feedback.textContent = '再确认一次这个词的基本意思。';
        }
      }
      document.querySelectorAll('.vocabulary-adventure-result h2').forEach(node => {
        if (node.textContent === '提示后答对') node.textContent = '提示帮你想起来了';
        else if (node.textContent === '第一次就答对') node.textContent = '找到了！';
        else if (node.textContent.includes('使用还要加强')) node.textContent = '基本意思记住了，再练练怎么使用';
      });
    }

    async function handleAdventureSummary(summary) {
      if (summary.dataset.rewardHandled) return;
      summary.dataset.rewardHandled = 'pending';
      const result = await recordSource(currentUserValue(), 'adventure', 10, 'set');
      summary.dataset.rewardHandled = result.ok ? 'done' : 'failed';
      summary.innerHTML = `
        <div class="vocabulary-adventure-terminal-icon">🪙</div>
        <h2>今天的词汇探险完成了</h2>
        <p class="vocabulary-adventure-earned-coins">${result.ok ? '获得 10 金币' : '奖励正在补发'}</p>
        <p>可以返回首页查看最新金币。</p>`;
      const feedback = document.getElementById('vocabularyAdventureFeedbackText');
      if (feedback) feedback.textContent = result.ok ? '今日探险已保存完成' : '学习进度已保存，金币稍后补发';
    }

    async function handleChallengeSummary(summary) {
      if (summary.dataset.rewardHandled) return;
      summary.dataset.rewardHandled = 'pending';
      const correctNode = summary.querySelector('.vocabulary-adventure-summary-grid div:first-child strong');
      const correct = clampInteger(correctNode?.textContent, 0, 10);
      const result = await recordSource(currentUserValue(), 'vocabularyChallenge', correct, 'max');
      summary.dataset.rewardHandled = result.ok ? 'done' : 'failed';
      let reward = summary.querySelector('.vocabulary-adventure-earned-coins');
      if (!reward) {
        reward = document.createElement('p');
        reward.className = 'vocabulary-adventure-earned-coins';
        summary.querySelector('h2')?.insertAdjacentElement('afterend', reward);
      }
      reward.textContent = result.ok
        ? `今日挑战金币 ${normalizeDay(result.record.daily[dateKey()]).sources.vocabularyChallenge} / 10`
        : '挑战成绩已保存，金币稍后补发';
    }

    function scanAdventureUi() {
      replaceInternalStudentCopy();
      document.querySelectorAll('#vocabularyAdventureBody .vocabulary-adventure-summary').forEach(handleAdventureSummary);
      document.querySelectorAll('#vocabularyAdventureChallengeBody .vocabulary-adventure-challenge-result').forEach(handleChallengeSummary);
    }

    function queueScan() {
      if (scanQueued) return;
      scanQueued = true;
      Promise.resolve().then(() => {
        scanQueued = false;
        scanAdventureUi();
      });
    }

    function installCoursewareHook() {
      const original = root.markStudentCoursewareCompleted;
      if (typeof original !== 'function' || original.__studentRewardWrapped) return false;
      const wrapped = async function wrappedStudentCoursewareCompleted(...args) {
        const result = await original.apply(this, args);
        const user = currentUserValue();
        if (['sister', 'brother'].includes(user)) {
          await recordSource(user, 'classroomPractice', 10, 'set');
        }
        return result;
      };
      wrapped.__studentRewardWrapped = true;
      root.markStudentCoursewareCompleted = wrapped;
      return true;
    }

    installStyles();
    if (typeof root.MutationObserver === 'function') {
      const observer = new root.MutationObserver(queueScan);
      observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    }
    queueScan();

    const originalLoadFeatureGroup = root.loadFeatureGroup;
    if (typeof originalLoadFeatureGroup === 'function') {
      root.loadFeatureGroup = async function rewardAwareFeatureLoader(...args) {
        const result = await originalLoadFeatureGroup.apply(this, args);
        installCoursewareHook();
        return result;
      };
    }
    coursewareHookTimer = root.setInterval(() => {
      coursewareHookAttempts += 1;
      if (installCoursewareHook() || coursewareHookAttempts >= 180) {
        root.clearInterval(coursewareHookTimer);
      }
    }, 500);

    const originalLoadStudentRewardSummary = root.loadStudentRewardSummary;
    root.loadStudentRewardSummary = loadEnhancedStudentRewardSummary;
    const originalLoadHome = root.loadHome;
    if (typeof originalLoadHome === 'function') {
      root.loadHome = async function enhancedLoadHome(...args) {
        await ensureInitialBreakthrough();
        const result = await originalLoadHome.apply(this, args);
        if (typeof root.isTeacher === 'function' && root.isTeacher()) installTeacherPanel();
        else await loadEnhancedStudentRewardSummary();
        return result;
      };
    } else if (typeof originalLoadStudentRewardSummary === 'function') {
      root.loadStudentRewardSummary = originalLoadStudentRewardSummary;
    }

    root.recordStudentRewardSource = recordSource;
    root.recordStudentBreakthroughAdjustment = adjustBreakthrough;
    root.recordStudentRewardAdjustment = adjustRewardProject;
    root.refreshTeacherBreakthroughPanel = refreshTeacherPanel;
    root.refreshTeacherRewardPanel = refreshTeacherPanel;
    root.applyTeacherBreakthroughChange = applyTeacherAdjustment;
    root.applyTeacherRewardChange = applyTeacherAdjustment;
  }

  return Object.freeze({
    REWARD_KEY_PREFIX,
    REGULAR_DAILY_MAX,
    BREAKTHROUGH_DAILY_MAX,
    INITIAL_BREAKTHROUGH_DATE,
    SOURCE_MAX,
    REWARD_PROJECTS,
    dateKey,
    normalizeDay,
    normalizeRewardRecord,
    applySourceReward,
    applyBreakthroughAdjustment,
    applyRewardAdjustment,
    seedInitialBreakthrough,
    install
  });
});