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
    Object.keys(SOURCE_MAX).forEach(key => {
      sources[key] = clampInteger(sources[key], 0, SOURCE_MAX[key]);
    });
    const sourceTotal = Object.keys(SOURCE_MAX).reduce((sum, key) => sum + sources[key], 0);
    const legacyCoins = clampInteger(source.coins, 0, REGULAR_DAILY_MAX);
    const coins = Math.max(legacyCoins, Math.min(REGULAR_DAILY_MAX, sourceTotal));
    return {
      ...source,
      coins,
      sources,
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
    if (!delta) return { record, changed: false, delta: 0 };
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
      kind: 'breakthrough',
      source: 'teacher',
      delta,
      reason: String(settings.reason || '').trim(),
      at: now
    });
    record.transactions = record.transactions.slice(-100);
    return { record, changed: true, delta };
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
        .teacher-breakthrough-panel{width:min(760px,calc(100% - 28px));margin:16px auto 90px;padding:18px;border:1px solid #eadde6;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(80,55,75,.08)}
        .teacher-breakthrough-panel h2{margin:0 0 6px;color:#6b4e7a}
        .teacher-breakthrough-panel p{margin:4px 0;color:#847780}
        .teacher-breakthrough-controls{display:grid;grid-template-columns:minmax(120px,1fr) minmax(100px,.7fr) minmax(160px,1.4fr) auto auto;gap:10px;align-items:end;margin-top:14px}
        .teacher-breakthrough-controls label{display:grid;gap:5px;font-size:12px;color:#7f727b}
        .teacher-breakthrough-controls select,.teacher-breakthrough-controls input{min-height:44px;border:1px solid #dfd1da;border-radius:12px;padding:8px 10px;background:#fff;color:#594f56;font:inherit}
        .teacher-breakthrough-controls button{min-height:44px;border:0;border-radius:12px;padding:8px 14px;font-weight:800;cursor:pointer}
        .teacher-breakthrough-add{background:#a8d8c8;color:#244e42}.teacher-breakthrough-subtract{background:#f6d6dd;color:#7c3d50}
        #teacherBreakthroughStatus{min-height:22px;margin-top:10px;font-weight:700;color:#5f9f8c}
        @media(max-width:760px){.teacher-breakthrough-controls{grid-template-columns:1fr 1fr}.teacher-breakthrough-controls label:nth-child(3){grid-column:1/-1}}
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

    async function adjustBreakthrough(user, delta, reason) {
      const student = user === 'brother' ? 'brother' : 'sister';
      const current = await loadReward(student);
      const result = applyBreakthroughAdjustment(current, {
        date: dateKey(),
        delta,
        reason
      });
      if (result.changed && !await saveReward(student, result.record)) {
        return { ok: false, record: current, delta: 0 };
      }
      return { ok: true, record: result.record, delta: result.delta };
    }

    async function refreshTeacherPanel() {
      const panel = document.getElementById('teacherBreakthroughPanel');
      if (!panel) return;
      await ensureInitialBreakthrough();
      const user = document.getElementById('teacherBreakthroughStudent')?.value === 'brother' ? 'brother' : 'sister';
      const record = await loadReward(user);
      const day = normalizeDay(record.daily[dateKey()]);
      const current = document.getElementById('teacherBreakthroughCurrent');
      if (current) {
        current.textContent = `今日突破金币 ${day.breakthroughCoins} / ${BREAKTHROUGH_DAILY_MAX} · 累计金币 ${record.totalCoins}`;
      }
    }

    async function applyTeacherAdjustment(direction) {
      const studentSelect = document.getElementById('teacherBreakthroughStudent');
      const amountInput = document.getElementById('teacherBreakthroughAmount');
      const reasonInput = document.getElementById('teacherBreakthroughReason');
      const status = document.getElementById('teacherBreakthroughStatus');
      const user = studentSelect?.value === 'brother' ? 'brother' : 'sister';
      const amount = clampInteger(amountInput?.value, 1, BREAKTHROUGH_DAILY_MAX);
      const result = await adjustBreakthrough(user, direction * amount, reasonInput?.value || '老师手动调整');
      if (status) {
        status.textContent = result.ok
          ? (result.delta ? `已${result.delta > 0 ? '增加' : '扣除'} ${Math.abs(result.delta)} 个突破金币` : '已达到当天可调整范围')
          : '保存失败，请检查网络后重试';
      }
      if (amountInput) amountInput.value = '1';
      await refreshTeacherPanel();
    }

    function installTeacherPanel() {
      if (!(typeof root.isTeacher === 'function' && root.isTeacher())) return;
      if (document.getElementById('teacherBreakthroughPanel')) {
        refreshTeacherPanel();
        return;
      }
      const nav = document.querySelector('.teacher-home-nav');
      if (!nav) return;
      const panel = document.createElement('section');
      panel.id = 'teacherBreakthroughPanel';
      panel.className = 'teacher-breakthrough-panel teacher-only';
      panel.innerHTML = `
        <h2>突破金币</h2>
        <p id="teacherBreakthroughCurrent">正在读取今日金币…</p>
        <div class="teacher-breakthrough-controls">
          <label>学生<select id="teacherBreakthroughStudent"><option value="sister">姐姐</option><option value="brother">弟弟</option></select></label>
          <label>数量<input id="teacherBreakthroughAmount" type="number" min="1" max="10" value="1" inputmode="numeric"></label>
          <label>备注<input id="teacherBreakthroughReason" type="text" maxlength="40" placeholder="例如：课堂突破"></label>
          <button type="button" class="teacher-breakthrough-add" id="teacherBreakthroughAdd">增加</button>
          <button type="button" class="teacher-breakthrough-subtract" id="teacherBreakthroughSubtract">扣除</button>
        </div>
        <div id="teacherBreakthroughStatus" role="status" aria-live="polite"></div>`;
      nav.insertAdjacentElement('afterend', panel);
      document.getElementById('teacherBreakthroughStudent')?.addEventListener('change', refreshTeacherPanel);
      document.getElementById('teacherBreakthroughAdd')?.addEventListener('click', () => applyTeacherAdjustment(1));
      document.getElementById('teacherBreakthroughSubtract')?.addEventListener('click', () => applyTeacherAdjustment(-1));
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
    root.refreshTeacherBreakthroughPanel = refreshTeacherPanel;
    root.applyTeacherBreakthroughChange = applyTeacherAdjustment;
  }

  return Object.freeze({
    REWARD_KEY_PREFIX,
    REGULAR_DAILY_MAX,
    BREAKTHROUGH_DAILY_MAX,
    INITIAL_BREAKTHROUGH_DATE,
    SOURCE_MAX,
    dateKey,
    normalizeDay,
    normalizeRewardRecord,
    applySourceReward,
    applyBreakthroughAdjustment,
    seedInitialBreakthrough,
    install
  });
});