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
  const STUDENT_TAG_KEY = 'student_home_tags_v1';
  const STUDENT_TAG_MAX_LENGTH = 12;
  const DEFAULT_STUDENT_TAGS = Object.freeze({
    sister: '学习小达人',
    brother: '学习小达人'
  });
  const REGULAR_DAILY_MAX = 30;
  const BREAKTHROUGH_DAILY_MAX = 10;
  const DAILY_TOTAL_MAX = 40;
  const INITIAL_BREAKTHROUGH_DATE = '2026-07-30';
  const SOURCE_MAX = Object.freeze({
    adventure: 5,
    vocabularyChallenge: 10,
    grammarChallenge: 5,
    classroomPractice: 10
  });
  const CHALLENGE_FULL_SCORE = Object.freeze({
    sister: 100,
    brother: 80
  });
  const REWARD_PROJECTS = Object.freeze({
    breakthrough: Object.freeze({ label: '挑战金币', max: BREAKTHROUGH_DAILY_MAX, regular: false }),
    adventure: Object.freeze({ label: '词汇探险', max: SOURCE_MAX.adventure, regular: true }),
    vocabularyChallenge: Object.freeze({ label: '单词挑战', max: SOURCE_MAX.vocabularyChallenge, regular: true }),
    grammarChallenge: Object.freeze({ label: '语法挑战', max: SOURCE_MAX.grammarChallenge, regular: true }),
    classroomPractice: Object.freeze({ label: '随堂练习', max: SOURCE_MAX.classroomPractice, regular: true })
  });
  const STUDENTS = Object.freeze([
    { key: 'sister', name: '姐姐' },
    { key: 'brother', name: '弟弟' }
  ]);
  const CLAIM_STATUSES = new Set(['idle', 'pending', 'claimed', 'completed']);

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

  function sourceTotal(sources) {
    return Object.keys(SOURCE_MAX).reduce(
      (sum, key) => sum + clampInteger(sources && sources[key], 0, SOURCE_MAX[key]),
      0
    );
  }

  function challengeRewardAmount(user, score, maxAmount) {
    const student = user === 'brother' ? 'brother' : 'sister';
    const fullScore = CHALLENGE_FULL_SCORE[student];
    const normalizedScore = clampInteger(score, 0, 100);
    const maximum = clampInteger(maxAmount, 0, 100);
    return clampInteger((normalizedScore / fullScore) * maximum, 0, maximum);
  }

  function normalizeStudentTag(value, user) {
    const fallback = DEFAULT_STUDENT_TAGS[user === 'brother' ? 'brother' : 'sister'];
    const text = String(value || '').trim();
    return text ? text.slice(0, STUDENT_TAG_MAX_LENGTH) : fallback;
  }

  function normalizeClaim(value, source, awardedValue) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const amount = clampInteger(raw.amount, 0, SOURCE_MAX[source]);
    let status = CLAIM_STATUSES.has(raw.status) ? raw.status : 'idle';
    const awarded = clampInteger(awardedValue, 0, SOURCE_MAX[source]);
    if (status === 'idle' && awarded > 0) status = 'claimed';
    if (status === 'pending' && amount === 0) status = 'completed';
    return {
      status,
      amount,
      mode: raw.mode === 'max' ? 'max' : 'set',
      completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : '',
      claimedAt: typeof raw.claimedAt === 'string' ? raw.claimedAt : '',
      transactionId: typeof raw.transactionId === 'string' ? raw.transactionId : ''
    };
  }

  function normalizeDay(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const rawSources = source.sources && typeof source.sources === 'object' && !Array.isArray(source.sources)
      ? source.sources
      : {};
    const rawOverrides = source.teacherSourceOverrides && typeof source.teacherSourceOverrides === 'object'
      && !Array.isArray(source.teacherSourceOverrides)
      ? source.teacherSourceOverrides
      : {};
    const rawClaims = source.claims && typeof source.claims === 'object' && !Array.isArray(source.claims)
      ? source.claims
      : {};
    const hadTrackedSource = Object.keys(SOURCE_MAX).some(key => Number.isFinite(Number(rawSources[key])));
    const sources = {};
    const claims = {};
    const teacherSourceOverrides = {};
    Object.keys(SOURCE_MAX).forEach(key => {
      sources[key] = clampInteger(rawSources[key], 0, SOURCE_MAX[key]);
      claims[key] = normalizeClaim(rawClaims[key], key, sources[key]);
      if (Object.prototype.hasOwnProperty.call(rawOverrides, key)) {
        teacherSourceOverrides[key] = clampInteger(rawOverrides[key], 0, SOURCE_MAX[key]);
      }
    });
    const legacyCoins = clampInteger(source.coins, 0, REGULAR_DAILY_MAX);
    const unallocatedCoins = hadTrackedSource
      ? clampInteger(source.unallocatedCoins, 0, REGULAR_DAILY_MAX)
      : legacyCoins;
    const coins = clampInteger(unallocatedCoins + sourceTotal(sources), 0, REGULAR_DAILY_MAX);
    return {
      ...source,
      coins,
      sources,
      claims,
      teacherSourceOverrides,
      unallocatedCoins,
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
    let totalDelta = 0;
    Object.keys(dailySource).forEach(key => {
      const previous = dailySource[key] && typeof dailySource[key] === 'object' ? dailySource[key] : {};
      const previousCoins = clampInteger(previous.coins, 0, REGULAR_DAILY_MAX);
      const previousBreakthrough = clampInteger(previous.breakthroughCoins, 0, BREAKTHROUGH_DAILY_MAX);
      daily[key] = normalizeDay(previous);
      totalDelta += (daily[key].coins + daily[key].breakthroughCoins) - (previousCoins + previousBreakthrough);
    });
    const calculatedTotal = Object.values(daily).reduce(
      (sum, day) => sum + day.coins + day.breakthroughCoins,
      0
    );
    const suppliedTotal = Number(source.totalCoins);
    return {
      ...source,
      version: 3,
      totalCoins: Number.isFinite(suppliedTotal)
        ? Math.max(0, Math.round(suppliedTotal + totalDelta))
        : calculatedTotal,
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
      return { record, changed: false, delta: 0, projectDelta: 0 };
    }
    const transactionId = String(settings.transactionId || '');
    if (transactionId && record.transactions.some(transaction => transaction && transaction.id === transactionId)) {
      return { record, changed: false, delta: 0, projectDelta: 0, duplicate: true };
    }
    const day = normalizeDay(record.daily[date]);
    if (Object.prototype.hasOwnProperty.call(day.teacherSourceOverrides, source)) {
      return { record, changed: false, delta: 0, projectDelta: 0, overridden: true };
    }
    const current = clampInteger(day.sources[source], 0, SOURCE_MAX[source]);
    const requested = clampInteger(settings.amount, 0, SOURCE_MAX[source]);
    const nextValue = settings.mode === 'max' ? Math.max(current, requested) : requested;
    const projectDelta = nextValue - current;
    if (!projectDelta) return { record, changed: false, delta: 0, projectDelta: 0 };
    const nextSources = { ...day.sources, [source]: nextValue };
    const nextCoins = clampInteger(day.unallocatedCoins + sourceTotal(nextSources), 0, REGULAR_DAILY_MAX);
    const delta = nextCoins - day.coins;
    const now = String(settings.at || new Date().toISOString());
    record.daily[date] = { ...day, coins: nextCoins, sources: nextSources, updatedAt: now };
    record.totalCoins = Math.max(0, record.totalCoins + delta);
    record.transactions.push({
      id: transactionId || `${date}:${source}:${now}`,
      date,
      kind: 'earned',
      source,
      delta,
      projectDelta,
      at: now
    });
    record.transactions = record.transactions.slice(-100);
    return { record, changed: true, delta, projectDelta };
  }

  function markSourceClaim(recordValue, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const record = normalizeRewardRecord(recordValue);
    const date = String(settings.date || dateKey());
    const source = String(settings.source || '');
    if (!Object.prototype.hasOwnProperty.call(SOURCE_MAX, source)) {
      return { record, changed: false, claim: null };
    }
    const day = normalizeDay(record.daily[date]);
    const current = normalizeClaim(day.claims[source], source, day.sources[source]);
    const requested = clampInteger(settings.amount, 0, SOURCE_MAX[source]);
    const amount = settings.mode === 'max' ? Math.max(current.amount, requested) : requested;
    if (current.status === 'claimed' && amount <= current.amount) {
      return { record, changed: false, claim: current };
    }
    if (current.status === 'completed' && amount <= 0) {
      return { record, changed: false, claim: current };
    }
    const reopening = current.status === 'claimed' || current.status === 'completed';
    const now = String(settings.at || new Date().toISOString());
    const claim = {
      ...current,
      status: amount > 0 ? 'pending' : 'completed',
      amount,
      mode: settings.mode === 'max' ? 'max' : 'set',
      completedAt: current.completedAt || now,
      claimedAt: reopening ? '' : current.claimedAt,
      transactionId: reopening ? '' : current.transactionId
    };
    const changed = JSON.stringify(claim) !== JSON.stringify(current);
    if (changed) {
      record.daily[date] = {
        ...day,
        claims: { ...day.claims, [source]: claim },
        updatedAt: now
      };
    }
    return { record, changed, claim };
  }

  function claimSourceReward(recordValue, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const record = normalizeRewardRecord(recordValue);
    const date = String(settings.date || dateKey());
    const source = String(settings.source || '');
    if (!Object.prototype.hasOwnProperty.call(SOURCE_MAX, source)) {
      return { record, changed: false, delta: 0, projectDelta: 0, code: 'INVALID_SOURCE' };
    }
    const day = normalizeDay(record.daily[date]);
    const claim = normalizeClaim(day.claims[source], source, day.sources[source]);
    if (claim.status !== 'pending' || claim.amount <= 0) {
      return { record, changed: false, delta: 0, projectDelta: 0, claim, code: 'NOT_CLAIMABLE' };
    }
    const transactionId = claim.transactionId || `${date}:${source}:claim:${claim.amount}`;
    const applied = applySourceReward(record, {
      date,
      source,
      amount: claim.amount,
      mode: claim.mode,
      at: settings.at,
      transactionId
    });
    const nextRecord = applied.record;
    const nextDay = normalizeDay(nextRecord.daily[date]);
    const now = String(settings.at || new Date().toISOString());
    const claimed = {
      ...claim,
      status: 'claimed',
      claimedAt: now,
      transactionId
    };
    nextRecord.daily[date] = {
      ...nextDay,
      claims: { ...nextDay.claims, [source]: claimed },
      updatedAt: now
    };
    return {
      ...applied,
      record: nextRecord,
      changed: true,
      claim: claimed,
      code: 'CLAIMED'
    };
  }

  function totalChallengeCoins(recordValue) {
    const record = normalizeRewardRecord(recordValue);
    return Object.values(record.daily).reduce(
      (sum, day) => sum + clampInteger(day && day.breakthroughCoins, 0, BREAKTHROUGH_DAILY_MAX),
      0
    );
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
    record.daily[date] = { ...day, breakthroughCoins: nextValue, updatedAt: now };
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
    const nextSources = { ...day.sources, [project]: nextValue };
    const nextCoins = clampInteger(day.unallocatedCoins + sourceTotal(nextSources), 0, REGULAR_DAILY_MAX);
    const delta = nextCoins - day.coins;
    const now = String(settings.at || new Date().toISOString());
    record.daily[date] = {
      ...day,
      coins: nextCoins,
      sources: nextSources,
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
    let coursewareHookTimer = null;
    let coursewareHookAttempts = 0;
    let studentTagsCache = null;

    function currentUserValue() {
      try { return typeof currentUser !== 'undefined' ? currentUser : root.currentUser; }
      catch (_) { return root.currentUser; }
    }

    function rewardKey(user) {
      return REWARD_KEY_PREFIX + (user === 'brother' ? 'brother' : 'sister');
    }

    async function loadReward(user) {
      if (typeof root.sbGet !== 'function') return normalizeRewardRecord(null);
      const raw = await root.sbGet(rewardKey(user));
      const record = normalizeRewardRecord(raw);
      if (typeof root.sbSet === 'function' && JSON.stringify(raw || null) !== JSON.stringify(record)) {
        try { await root.sbSet(rewardKey(user), record); }
        catch (error) { root.showStorageError?.(error); }
      }
      return record;
    }

    async function saveReward(user, record) {
      if (typeof root.sbSet !== 'function') return false;
      try {
        await root.sbSet(rewardKey(user), normalizeRewardRecord(record));
        return true;
      } catch (error) {
        root.showStorageError?.(error);
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
        .teacher-reward-panel{width:min(900px,calc(100% - 24px));margin:12px auto 28px;padding:12px 14px;border:1px solid #eadde6;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(80,55,75,.07)}
        .teacher-reward-panel__row{display:grid;grid-template-columns:minmax(190px,.75fr) minmax(0,1.7fr);gap:14px;align-items:end}
        .teacher-reward-panel__summary{min-width:0;align-self:center}.teacher-reward-panel h2{margin:0;color:#6b4e7a;font-size:18px}.teacher-reward-panel p{margin:5px 0 0;color:#847780;font-size:13px}
        .teacher-reward-controls{display:grid;grid-template-columns:minmax(112px,.85fr) minmax(138px,1.15fr) 78px 68px 68px;gap:8px;align-items:end}
        .teacher-reward-controls label{display:grid;gap:4px;min-width:0;font-size:11px;color:#7f727b}.teacher-reward-controls select,.teacher-reward-controls input{width:100%;height:40px;border:1px solid #dfd1da;border-radius:10px;padding:6px 9px;background:#fff;color:#594f56;font:inherit}
        .teacher-reward-controls button{height:40px;border:0;border-radius:10px;padding:6px 10px;font-weight:800;cursor:pointer}.teacher-reward-add{background:#a8d8c8;color:#244e42}.teacher-reward-subtract{background:#f6d6dd;color:#7c3d50}
        #teacherRewardStatus{min-height:18px;margin-top:7px;text-align:right;font-size:12px;font-weight:700;color:#5f9f8c}
        .teacher-student-tag-panel{width:min(900px,calc(100% - 24px));margin:-16px auto 28px;padding:12px 14px;border:1px solid #dce7ee;border-radius:16px;background:#fff;box-shadow:0 6px 18px rgba(55,85,105,.07)}
        .teacher-student-tag-panel h2{margin:0 0 10px;color:#315f80;font-size:18px}.teacher-student-tag-controls{display:grid;grid-template-columns:1fr 1fr 88px;gap:10px;align-items:end}
        .teacher-student-tag-controls label{display:grid;gap:4px;color:#657783;font-size:12px;font-weight:700}.teacher-student-tag-controls input{height:40px;border:1px solid #cfdee6;border-radius:10px;padding:6px 10px;font:inherit}
        .teacher-student-tag-controls button{height:40px;border:0;border-radius:10px;background:#5b96be;color:#fff;font-weight:850;cursor:pointer}.teacher-student-tag-status{min-height:18px;margin-top:7px;color:#4d8b70;font-size:12px;font-weight:700;text-align:right}
        .vocabulary-adventure-earned-coins{font-size:clamp(24px,4vw,42px);font-weight:900;color:#b77a1d;margin:12px 0}
        @media(max-width:760px){.teacher-reward-panel__row{grid-template-columns:1fr}.teacher-reward-controls{grid-template-columns:1fr 1.2fr 72px 62px 62px}.teacher-student-tag-controls{grid-template-columns:1fr}}
      `;
      document.head.appendChild(style);
    }

    function prepareSummaryMarkup() {
      const identity = document.querySelector('.student-summary-card__identity');
      if (!identity) return;
      const identityCopy = identity.lastElementChild;
      if (identityCopy) identityCopy.classList.add('student-summary-card__identity-copy');
    }

    function normalizedStudentTags(value) {
      const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      return {
        sister: normalizeStudentTag(source.sister, 'sister'),
        brother: normalizeStudentTag(source.brother, 'brother')
      };
    }

    async function loadStudentTags() {
      const local = root.getMirrorValue?.(STUDENT_TAG_KEY);
      if (local) studentTagsCache = normalizedStudentTags(local);
      if (typeof root.sbGet !== 'function') {
        return studentTagsCache || normalizedStudentTags(null);
      }
      try {
        studentTagsCache = normalizedStudentTags(await root.sbGet(STUDENT_TAG_KEY));
      } catch (_) {
        studentTagsCache ||= normalizedStudentTags(null);
      }
      return studentTagsCache;
    }

    function prepareHomeRewardCopy() {
      const adventure = document.querySelector('#vocabularyAdventurePreviewEntry .student-home-card__reward');
      if (adventure) adventure.textContent = '预计 5 金币';
      document.getElementById('vocabularyAdventurePreviewEntry')?.setAttribute('aria-label', '词汇探险，完成今日路线，完成可领取5金币');
      const grammarEntry = document.getElementById('grammarChallengeHomeEntry');
      const grammarCopy = grammarEntry?.querySelector('.student-home-card__copy');
      if (grammarCopy && !grammarCopy.querySelector('.student-home-card__reward')) {
        const reward = document.createElement('em');
        reward.id = 'grammarChallengeHomeReward';
        reward.className = 'student-home-card__reward';
        reward.textContent = '预计 5 金币';
        grammarCopy.appendChild(reward);
      }
      grammarEntry?.setAttribute('aria-label', '语法挑战，复习上一节课语法，完成可领取5金币');
    }

    function renderStudentIdentity(user) {
      const student = user === 'brother' ? 'brother' : 'sister';
      const tag = document.getElementById('studentSummaryTag');
      const configured = studentTagsCache ? studentTagsCache[student] : '';
      if (tag) {
        tag.textContent = normalizeStudentTag(configured, student);
        tag.title = tag.textContent;
      }
    }

    function homeClaimState(claim) {
      if (claim && claim.status === 'pending' && claim.amount > 0) return 'pending';
      if (claim && claim.status === 'claimed') return 'claimed';
      return 'idle';
    }

    function renderHomeClaimStates(recordValue) {
      const record = normalizeRewardRecord(recordValue);
      const day = normalizeDay(record.daily[dateKey()]);
      const completionStatusIds = {
        adventure: 'vocabularyAdventureHomeStatus',
        challenge: 'vocabularyAdventureChallengeHomeSub',
        classroom: 'studentClassroomPracticeStatus',
      };
      Object.keys(SOURCE_MAX).forEach(source => {
        const card = document.querySelector(`.student-home-card[data-reward-source="${source}"]`);
        if (!card) return;
        const claim = normalizeClaim(day.claims[source], source, day.sources[source]);
        const state = homeClaimState(claim);
        const completed = claim.status !== 'idle';
        card.dataset.rewardState = state;
        card.dataset.completed = completed ? 'true' : 'false';
        const completionStatus = document.getElementById(completionStatusIds[source]);
        if (completed && completionStatus) {
          completionStatus.textContent = state === 'pending' ? '已通关 · 待领取' : '今日已通关';
        }
        const stamp = card.querySelector('.student-home-card__stamp');
        if (stamp) stamp.hidden = !completed;
        const chest = card.querySelector('.student-reward-chest');
        const image = chest?.querySelector('img');
        if (!chest || !image) return;
        chest.dataset.state = state;
        chest.disabled = state !== 'pending';
        image.src = state === 'pending'
          ? 'assets/student-home/home-v4/ui/chest-opening.png'
          : state === 'claimed'
            ? 'assets/student-home/home-v4/ui/chest-claimed.png'
            : 'assets/student-home/home-v4/ui/chest-idle.png';
        const label = REWARD_PROJECTS[source].label;
        chest.setAttribute(
          'aria-label',
          state === 'pending'
            ? `${label}宝箱，待领取 ${claim.amount} 金币`
            : state === 'claimed'
              ? `${label}宝箱，奖励已领取`
              : completed
                ? `${label}宝箱，本次没有可领取金币`
                : `${label}宝箱，尚未完成`
        );
      });
      return record;
    }

    function showHomeNotice(message) {
      const notice = document.getElementById('studentHomeNotice');
      if (!notice) return;
      notice.textContent = message;
      notice.hidden = false;
      root.setTimeout(() => {
        if (notice.textContent === message) notice.hidden = true;
      }, 2400);
    }

    function animateClaim(button) {
      const image = button?.querySelector('img');
      if (!button || !image) return;
      button.dataset.state = 'opening';
      image.src = 'assets/student-home/home-v4/ui/chest-opening.png';
      if (root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const target = document.querySelector('.student-summary-card__metric--total img');
      if (!target) return;
      const from = button.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const coin = document.createElement('img');
      coin.className = 'student-reward-coin-flight';
      coin.src = 'assets/student-home/home-v4/ui/coin-total.png';
      coin.alt = '';
      coin.style.setProperty('--coin-from-x', `${from.left + from.width * .45}px`);
      coin.style.setProperty('--coin-from-y', `${from.top + from.height * .35}px`);
      coin.style.setProperty('--coin-to-x', `${to.left + to.width * .3}px`);
      coin.style.setProperty('--coin-to-y', `${to.top + to.height * .3}px`);
      document.body.appendChild(coin);
      coin.addEventListener('animationend', () => coin.remove(), { once: true });
    }

    async function claimHomeReward(source, button) {
      if (!Object.prototype.hasOwnProperty.call(SOURCE_MAX, source) || button?.dataset.claiming === 'true') return;
      const student = currentUserValue() === 'brother' ? 'brother' : 'sister';
      if (button) {
        button.dataset.claiming = 'true';
        button.disabled = true;
      }
      const current = await loadReward(student);
      const result = claimSourceReward(current, { date: dateKey(), source });
      if (!result.changed) {
        renderEnhancedReward(result.record);
        if (button) delete button.dataset.claiming;
        return;
      }
      animateClaim(button);
      if (!await saveReward(student, result.record)) {
        renderEnhancedReward(current);
        showHomeNotice('领取未完成，请检查网络后重试');
        if (button) delete button.dataset.claiming;
        return;
      }
      renderEnhancedReward(result.record);
      showHomeNotice(`已领取 ${result.claim.amount} 金币`);
      if (button) delete button.dataset.claiming;
    }

    function installChestHandlers() {
      document.querySelectorAll('.student-reward-chest').forEach(button => {
        if (button.dataset.handlerInstalled) return;
        button.dataset.handlerInstalled = 'true';
        button.addEventListener('click', event => {
          event.stopPropagation();
          claimHomeReward(button.dataset.rewardSource, button);
        });
      });
    }

    function renderEnhancedReward(recordValue) {
      prepareSummaryMarkup();
      prepareHomeRewardCopy();
      const record = normalizeRewardRecord(recordValue);
      const day = normalizeDay(record.daily[dateKey()]);
      root.renderStudentRewardSummary?.({
        available: true,
        totalCoins: record.totalCoins,
        challengeCoins: totalChallengeCoins(record),
        todayCoins: day.coins,
        todayMaxCoins: REGULAR_DAILY_MAX
      });
      renderStudentIdentity(currentUserValue());
      renderHomeClaimStates(record);
      return record;
    }

    async function loadEnhancedStudentRewardSummary() {
      if (root.isTeacher?.()) return;
      await ensureInitialBreakthrough();
      const user = currentUserValue() === 'brother' ? 'brother' : 'sister';
      const local = root.getMirrorValue?.(rewardKey(user));
      studentTagsCache = normalizedStudentTags(root.getMirrorValue?.(STUDENT_TAG_KEY));
      if (local) renderEnhancedReward(local);
      const [record] = await Promise.all([loadReward(user), loadStudentTags()]);
      renderEnhancedReward(record);
    }

    async function recordSource(user, source, amount, mode) {
      const student = user === 'brother' ? 'brother' : 'sister';
      const current = await loadReward(student);
      const result = markSourceClaim(current, { date: dateKey(), source, amount, mode: mode === 'max' ? 'max' : 'set' });
      if (result.changed && !await saveReward(student, result.record)) {
        return { ok: false, record: current, delta: 0, projectDelta: 0 };
      }
      if (currentUserValue() === student && !root.isTeacher?.()) renderEnhancedReward(result.record);
      return { ok: true, ...result };
    }

    async function adjustRewardProject(user, project, delta) {
      const student = user === 'brother' ? 'brother' : 'sister';
      const current = await loadReward(student);
      const result = applyRewardAdjustment(current, { date: dateKey(), project, delta });
      if (result.changed && !await saveReward(student, result.record)) {
        return { ok: false, record: current, delta: 0, projectDelta: 0 };
      }
      return { ok: true, ...result };
    }

    function selectedTeacherProject() {
      const value = String(document.getElementById('teacherRewardProject')?.value || 'breakthrough');
      return Object.prototype.hasOwnProperty.call(REWARD_PROJECTS, value) ? value : 'breakthrough';
    }

    function projectValue(day, project) {
      return project === 'breakthrough' ? day.breakthroughCoins : clampInteger(day.sources[project], 0, SOURCE_MAX[project]);
    }

    async function refreshTeacherPanel() {
      const panel = document.getElementById('teacherRewardPanel');
      if (!panel) return;
      const user = document.getElementById('teacherRewardStudent')?.value === 'brother' ? 'brother' : 'sister';
      const project = selectedTeacherProject();
      const record = await loadReward(user);
      const day = normalizeDay(record.daily[dateKey()]);
      const meta = REWARD_PROJECTS[project];
      const current = document.getElementById('teacherRewardCurrent');
      if (current) current.textContent = `${meta.label} ${projectValue(day, project)} / ${meta.max} · 今日常规 ${day.coins} / ${REGULAR_DAILY_MAX} · 今日总计 ${day.coins + day.breakthroughCoins} / ${DAILY_TOTAL_MAX} · 累计 ${record.totalCoins}`;
      const amount = document.getElementById('teacherRewardAmount');
      if (amount) amount.max = String(meta.max);
      const status = document.getElementById('teacherRewardStatus');
      if (status) status.textContent = '';
    }

    async function applyTeacherAdjustment(direction) {
      const user = document.getElementById('teacherRewardStudent')?.value === 'brother' ? 'brother' : 'sister';
      const project = selectedTeacherProject();
      const meta = REWARD_PROJECTS[project];
      const amountInput = document.getElementById('teacherRewardAmount');
      const amount = clampInteger(amountInput?.value, 1, meta.max);
      const buttons = ['teacherRewardAdd', 'teacherRewardSubtract'].map(id => document.getElementById(id)).filter(Boolean);
      buttons.forEach(button => { button.disabled = true; });
      try {
        const result = await adjustRewardProject(user, project, direction * amount);
        const status = document.getElementById('teacherRewardStatus');
        if (status) status.textContent = !result.ok
          ? '保存失败，请检查网络后重试'
          : result.projectDelta
            ? `已${result.projectDelta > 0 ? '增加' : '扣除'} ${Math.abs(result.projectDelta)} 个${meta.label}`
            : (direction > 0 ? '该项目已到今日上限' : '该项目已经是 0');
        if (amountInput) amountInput.value = '1';
        await refreshTeacherPanel();
      } finally {
        buttons.forEach(button => { button.disabled = false; });
      }
    }

    function installTeacherPanel() {
      if (!root.isTeacher?.()) return;
      if (typeof root.refreshTeacherActivityPanel === 'function' || document.getElementById('teacherActivityPanel')) {
        document.getElementById('teacherRewardPanel')?.remove();
        return;
      }
      document.getElementById('teacherBreakthroughPanel')?.remove();
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
          <div class="teacher-reward-panel__summary"><h2>金币调整</h2><p id="teacherRewardCurrent">正在读取今日金币…</p></div>
          <div class="teacher-reward-controls">
            <label><span>学生</span><select id="teacherRewardStudent"><option value="sister">姐姐</option><option value="brother">弟弟</option></select></label>
            <label><span>项目</span><select id="teacherRewardProject"><option value="breakthrough">挑战金币</option><option value="adventure">词汇探险</option><option value="vocabularyChallenge">单词挑战</option><option value="grammarChallenge">语法挑战</option><option value="classroomPractice">随堂练习</option></select></label>
            <label><span>数量</span><input id="teacherRewardAmount" type="number" min="1" max="10" value="1" inputmode="numeric"></label>
            <button type="button" class="teacher-reward-add" id="teacherRewardAdd">增加</button>
            <button type="button" class="teacher-reward-subtract" id="teacherRewardSubtract">扣除</button>
          </div>
        </div><div id="teacherRewardStatus" role="status" aria-live="polite"></div>`;
      nav.insertAdjacentElement('afterend', panel);
      document.getElementById('teacherRewardStudent')?.addEventListener('change', refreshTeacherPanel);
      document.getElementById('teacherRewardProject')?.addEventListener('change', refreshTeacherPanel);
      document.getElementById('teacherRewardAdd')?.addEventListener('click', () => applyTeacherAdjustment(1));
      document.getElementById('teacherRewardSubtract')?.addEventListener('click', () => applyTeacherAdjustment(-1));
      refreshTeacherPanel();
    }

    function configuredStudentTag(user) {
      return normalizeStudentTag(studentTagsCache && studentTagsCache[user], user);
    }

    async function saveStudentTags() {
      const status = document.getElementById('teacherStudentTagStatus');
      const button = document.getElementById('teacherStudentTagSave');
      const values = {};
      for (const student of STUDENTS) {
        const input = document.getElementById(`teacherStudentTag${student.key === 'brother' ? 'Brother' : 'Sister'}`);
        const value = String(input?.value || '').trim();
        if (value.length > STUDENT_TAG_MAX_LENGTH) {
          if (status) status.textContent = `${student.name}的小标签最多 ${STUDENT_TAG_MAX_LENGTH} 个字符`;
          input?.focus();
          return;
        }
        values[student.key] = normalizeStudentTag(value, student.key);
      }
      if (button) button.disabled = true;
      if (status) status.textContent = '正在保存…';
      try {
        if (typeof root.sbSet !== 'function') {
          if (status) status.textContent = '保存失败，请检查网络后重试';
          return;
        }
        await root.sbSet(STUDENT_TAG_KEY, values);
        studentTagsCache = normalizedStudentTags(values);
        STUDENTS.forEach(student => {
          const input = document.getElementById(`teacherStudentTag${student.key === 'brother' ? 'Brother' : 'Sister'}`);
          if (input) delete input.dataset.dirty;
        });
        if (status) status.textContent = '学生小标签已保存';
      } catch (error) {
        root.showStorageError?.(error);
        if (status) status.textContent = '保存失败，请检查网络后重试';
      } finally {
        if (button) button.disabled = false;
      }
    }

    function installStudentTagPanel() {
      if (!root.isTeacher?.()) return;
      const rewardPanel = document.getElementById('teacherRewardPanel');
      const grid = document.getElementById('teacherDashboardGrid');
      if (!rewardPanel && !grid) return;
      let panel = document.getElementById('teacherStudentTagPanel');
      if (!panel) {
        panel = document.createElement('section');
        panel.id = 'teacherStudentTagPanel';
        panel.className = 'teacher-student-tag-panel teacher-dashboard-card teacher-dashboard-card--tags teacher-only';
        panel.innerHTML = `
          <h2>学生首页小标签</h2>
          <div class="teacher-student-tag-controls">
            <label><span>姐姐</span><input id="teacherStudentTagSister" type="text" maxlength="${STUDENT_TAG_MAX_LENGTH}" autocomplete="off"></label>
            <label><span>弟弟</span><input id="teacherStudentTagBrother" type="text" maxlength="${STUDENT_TAG_MAX_LENGTH}" autocomplete="off"></label>
            <button id="teacherStudentTagSave" type="button">保存</button>
          </div>
          <div class="teacher-student-tag-status" id="teacherStudentTagStatus" role="status" aria-live="polite"></div>`;
        if (grid) grid.appendChild(panel);
        else rewardPanel.insertAdjacentElement('afterend', panel);
        document.getElementById('teacherStudentTagSave')?.addEventListener('click', saveStudentTags);
        ['teacherStudentTagSister', 'teacherStudentTagBrother'].forEach(id => {
          document.getElementById(id)?.addEventListener('input', event => {
            event.currentTarget.dataset.dirty = 'true';
          });
        });
      }
      const sister = document.getElementById('teacherStudentTagSister');
      const brother = document.getElementById('teacherStudentTagBrother');
      if (sister && sister.dataset.dirty !== 'true') sister.value = configuredStudentTag('sister');
      if (brother && brother.dataset.dirty !== 'true') brother.value = configuredStudentTag('brother');
      loadStudentTags().then(tags => {
        if (sister && sister.dataset.dirty !== 'true') sister.value = tags.sister;
        if (brother && brother.dataset.dirty !== 'true') brother.value = tags.brother;
      });
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
      }
    }

    async function handleAdventureSummary(summary) {
      if (summary.dataset.rewardHandled) return;
      summary.dataset.rewardHandled = 'pending';
      const result = await recordSource(currentUserValue(), 'adventure', SOURCE_MAX.adventure, 'set');
      summary.dataset.rewardHandled = result.ok ? 'done' : 'failed';
      summary.innerHTML = `<div class="vocabulary-adventure-terminal-icon">🪙</div><h2>今天的词汇探险完成了</h2><p class="vocabulary-adventure-earned-coins">${result.ok ? '预计可获得 5 金币' : '完成状态正在保存'}</p><p>返回首页后，点击词汇探险宝箱领取。</p>`;
      const feedback = document.getElementById('vocabularyAdventureFeedbackText');
      if (feedback) feedback.textContent = result.ok ? '今日探险已保存完成，奖励等待领取' : '学习进度已保存，奖励状态稍后同步';
    }

    async function handleChallengeSummary(summary) {
      if (summary.dataset.rewardHandled) return;
      summary.dataset.rewardHandled = 'pending';
      const correctNode = summary.querySelector('.vocabulary-adventure-summary-grid div:first-child strong');
      const correct = clampInteger(correctNode?.textContent, 0, SOURCE_MAX.vocabularyChallenge);
      const user = currentUserValue();
      const rewardAmount = challengeRewardAmount(
        user,
        correct * 10,
        SOURCE_MAX.vocabularyChallenge
      );
      const result = await recordSource(user, 'vocabularyChallenge', rewardAmount, 'max');
      summary.dataset.rewardHandled = result.ok ? 'done' : 'failed';
      let reward = summary.querySelector('.vocabulary-adventure-earned-coins');
      if (!reward) {
        reward = document.createElement('p');
        reward.className = 'vocabulary-adventure-earned-coins';
        summary.querySelector('h2')?.insertAdjacentElement('afterend', reward);
      }
      reward.textContent = result.ok
        ? `预计可获得 ${rewardAmount} 金币，返回首页点击宝箱领取`
        : '挑战成绩已保存，奖励状态稍后同步';
    }

    function scanAdventureUi() {
      replaceInternalStudentCopy();
      document.querySelectorAll('#vocabularyAdventureBody .vocabulary-adventure-summary').forEach(handleAdventureSummary);
      document.querySelectorAll('#vocabularyAdventureChallengeBody .vocabulary-adventure-challenge-result').forEach(handleChallengeSummary);
    }

    function installScopedAdventureObservers() {
      ['vocabularyAdventureBody', 'vocabularyAdventureChallengeBody'].forEach(id => {
        const host = document.getElementById(id);
        if (!host || host.dataset.rewardObserverInstalled || typeof root.MutationObserver !== 'function') return;
        host.dataset.rewardObserverInstalled = 'true';
        const observer = new root.MutationObserver(scanAdventureUi);
        observer.observe(host, { subtree: true, childList: true });
      });
      scanAdventureUi();
    }

    function installCoursewareHook() {
      const original = root.markStudentCoursewareCompleted;
      if (typeof original !== 'function' || original.__studentRewardWrapped) return false;
      const wrapped = async function wrappedStudentCoursewareCompleted(...args) {
        const result = await original.apply(this, args);
        const user = currentUserValue();
        if (['sister', 'brother'].includes(user)) await recordSource(user, 'classroomPractice', SOURCE_MAX.classroomPractice, 'set');
        return result;
      };
      wrapped.__studentRewardWrapped = true;
      root.markStudentCoursewareCompleted = wrapped;
      return true;
    }

    function installGrammarRewardHook() {
      const frame = document.getElementById('grammarChallengeFrame');
      if (!frame || frame.dataset.rewardWatcherInstalled) return;
      frame.dataset.rewardWatcherInstalled = 'true';
      frame.addEventListener('load', () => {
        let documentRef;
        try { documentRef = frame.contentDocument; } catch (_) { return; }
        if (!documentRef) return;
        let granted = false;
        const observers = [];
        const grant = async () => {
          if (granted) return;
          const dialog = documentRef.querySelector('[data-complete="true"]');
          const resultScreen = documentRef.getElementById('resultScreen');
          if (!dialog && !(resultScreen && !resultScreen.hidden)) return;
          granted = true;
          observers.forEach(observer => observer.disconnect());
          const user = currentUserValue();
          const rawScore = Number.parseInt(String(documentRef.getElementById('scoreText')?.textContent || ''), 10);
          const rewardAmount = Number.isFinite(rawScore)
            ? challengeRewardAmount(user, rawScore, SOURCE_MAX.grammarChallenge)
            : SOURCE_MAX.grammarChallenge;
          await recordSource(user, 'grammarChallenge', rewardAmount, 'set');
        };
        const dialogState = documentRef.querySelector('[data-complete]');
        const resultScreen = documentRef.getElementById('resultScreen');
        if (typeof root.MutationObserver === 'function' && dialogState) {
          const observer = new root.MutationObserver(grant);
          observer.observe(dialogState, { attributes: true, attributeFilter: ['data-complete'] });
          observers.push(observer);
        }
        if (typeof root.MutationObserver === 'function' && resultScreen) {
          const observer = new root.MutationObserver(grant);
          observer.observe(resultScreen, { attributes: true, attributeFilter: ['hidden'] });
          observers.push(observer);
        }
        grant();
      });
    }

    installStyles();
    prepareSummaryMarkup();
    prepareHomeRewardCopy();
    installChestHandlers();
    installScopedAdventureObservers();
    installGrammarRewardHook();

    const originalLoadFeatureGroup = root.loadFeatureGroup;
    if (typeof originalLoadFeatureGroup === 'function') {
      root.loadFeatureGroup = async function rewardAwareFeatureLoader(...args) {
        const result = await originalLoadFeatureGroup.apply(this, args);
        installCoursewareHook();
        installScopedAdventureObservers();
        installGrammarRewardHook();
        return result;
      };
    }
    coursewareHookTimer = root.setInterval(() => {
      coursewareHookAttempts += 1;
      if (installCoursewareHook() || coursewareHookAttempts >= 120) root.clearInterval(coursewareHookTimer);
    }, 500);

    root.loadStudentRewardSummary = loadEnhancedStudentRewardSummary;
    const originalLoadHome = root.loadHome;
    if (typeof originalLoadHome === 'function') {
      root.loadHome = async function enhancedLoadHome(...args) {
        prepareSummaryMarkup();
        prepareHomeRewardCopy();
        installChestHandlers();
        const result = await originalLoadHome.apply(this, args);
        if (root.isTeacher?.()) {
          installTeacherPanel();
          installStudentTagPanel();
        }
        else {
          prepareSummaryMarkup();
          prepareHomeRewardCopy();
          installChestHandlers();
        }
        return result;
      };
    }

    root.ensureTeacherStudentTagPanel = installStudentTagPanel;
    if (root.isTeacher?.()) installStudentTagPanel();

    root.recordStudentRewardSource = recordSource;
    root.recordStudentBreakthroughAdjustment = (user, delta) => adjustRewardProject(user, 'breakthrough', delta);
    root.recordStudentRewardAdjustment = adjustRewardProject;
    root.refreshTeacherBreakthroughPanel = refreshTeacherPanel;
    root.refreshTeacherRewardPanel = refreshTeacherPanel;
    root.applyTeacherBreakthroughChange = applyTeacherAdjustment;
    root.applyTeacherRewardChange = applyTeacherAdjustment;
  }

  return Object.freeze({
    REWARD_KEY_PREFIX,
    STUDENT_TAG_KEY,
    REGULAR_DAILY_MAX,
    BREAKTHROUGH_DAILY_MAX,
    DAILY_TOTAL_MAX,
    INITIAL_BREAKTHROUGH_DATE,
    SOURCE_MAX,
    CHALLENGE_FULL_SCORE,
    REWARD_PROJECTS,
    STUDENT_TAG_MAX_LENGTH,
    DEFAULT_STUDENT_TAGS,
    dateKey,
    clampInteger,
    challengeRewardAmount,
    normalizeStudentTag,
    normalizeClaim,
    normalizeDay,
    normalizeRewardRecord,
    applySourceReward,
    markSourceClaim,
    claimSourceReward,
    totalChallengeCoins,
    applyBreakthroughAdjustment,
    applyRewardAdjustment,
    seedInitialBreakthrough,
    install
  });
});
