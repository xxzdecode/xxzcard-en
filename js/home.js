// CHECK-IN STARS (daily streak badge)
// ══════════════════════════════════════
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

const STUDENT_REWARD_KEY_PREFIX = 'student_reward_v1_';
const STUDENT_CLASSROOM_PRACTICE_HOME_KEY_PREFIX = 'classroom_practice_daily_v1_';

function studentRewardKey(user) {
  return STUDENT_REWARD_KEY_PREFIX + (user === 'brother' ? 'brother' : 'sister');
}

function applyStudentRewardRecord(reward) {
  if (isTeacher()) return;
  const day = reward && reward.daily && typeof reward.daily === 'object'
    ? reward.daily[todayISO()]
    : null;
  renderStudentRewardSummary({
    available: Boolean(reward && Number.isFinite(Number(reward.totalCoins))),
    totalCoins: reward ? Number(reward.totalCoins) : 0,
    challengeCoins: reward && reward.daily && typeof reward.daily === 'object'
      ? Object.values(reward.daily).reduce((sum, item) => sum + Math.max(0, Number(item && item.breakthroughCoins) || 0), 0)
      : 0,
    todayCoins: day && Number.isFinite(Number(day.coins)) ? Number(day.coins) : 0,
    todayMaxCoins: 30
  });
}

function loadStudentRewardSummary() {
  if (isTeacher()) return;
  const key = studentRewardKey(currentUser);
  applyStudentRewardRecord(getMirrorValue(key));
  Promise.resolve().then(async () => {
    try {
      const remote = await sbGetRemote(key);
      if (remote && typeof remote === 'object') applyStudentRewardRecord(remote);
    } catch (error) {
      // The mirrored reward is already visible; refresh failures stay non-blocking.
    }
  });
}
async function markCheckIn(kind) { // kind: 'study' | 'quiz'
  if (isTeacher()) return;
  if (!canWriteCloudData()) return;
  const key = 'checkin_' + currentUser;
  try {
    let data = await sbGet(key);
    if (!data || typeof data !== 'object') data = {};
    const today = todayISO();
    if (!data[today]) data[today] = {};
    data[today][kind] = true;
    await sbSet(key, data);
  } catch(e) {
    showStorageError(e);
  }
}
async function renderCheckInStrip() {
  const strip = document.getElementById('checkinStrip');
  if (!strip) return;
  if (isTeacher()) { strip.innerHTML = ''; return; }
  const count = await getTodayCheckInCount();
  strip.innerHTML = `<span class="checkin-empty">今天成功打卡 ${count} 次，金币在向你招手！</span>`;
}

// ══════════════════════════════════════
// HOME
// ══════════════════════════════════════
function renderStudentRewardSummary(summary) {
  if (isTeacher()) return;
  const settings = summary && typeof summary === 'object' ? summary : {};
  const user = currentUser === 'brother' ? 'brother' : 'sister';
  const name = document.getElementById('studentSummaryName');
  const avatarImage = document.getElementById('studentSummaryAvatarImage');
  if (name) name.textContent = user === 'brother' ? '弟弟' : '姐姐';
  if (avatarImage) {
    avatarImage.src = `assets/student-home/card6/ui/profile/${user}-avatar.png`;
    avatarImage.hidden = false;
  }

  const available = settings.available === true
    && Number.isFinite(Number(settings.totalCoins))
    && Number.isFinite(Number(settings.todayCoins));
  const unavailable = document.getElementById('studentRewardUnavailable');
  const values = document.getElementById('studentRewardValues');
  if (unavailable) unavailable.hidden = available;
  if (values) values.hidden = !available;
  if (!available) return;

  const totalCoins = Math.max(0, Number(settings.totalCoins));
  const todayMaxCoins = Math.max(1, Number(settings.todayMaxCoins) || 30);
  const todayCoins = Math.max(0, Math.min(todayMaxCoins, Number(settings.todayCoins)));
  const total = document.getElementById('studentTotalCoins');
  const challenge = document.getElementById('studentChallengeCoins');
  const today = document.getElementById('studentTodayCoins');
  const max = document.getElementById('studentTodayMaxCoins');
  const progress = document.getElementById('studentTodayCoinsProgress');
  const progressbar = progress && progress.parentElement;
  if (total) total.textContent = String(totalCoins);
  if (challenge) challenge.textContent = String(Math.max(0, Number(settings.challengeCoins) || 0));
  if (today) today.textContent = String(todayCoins);
  if (max) max.textContent = String(todayMaxCoins);
  if (progress) progress.style.width = `${(todayCoins / todayMaxCoins) * 100}%`;
  if (progressbar) {
    progressbar.setAttribute('aria-valuemax', String(todayMaxCoins));
    progressbar.setAttribute('aria-valuenow', String(todayCoins));
  }
}

async function openStudentClassroomPractice() {
  if (isTeacher()) return;
  const notice = document.getElementById('studentHomeNotice');
  if (notice) {
    notice.textContent = '';
    notice.hidden = true;
  }
  if (typeof openCoursewareList === 'function') await openCoursewareList();
}

function applyStudentClassroomPracticeHomeRecord(record) {
  if (isTeacher()) return;
  const status = document.getElementById('studentClassroomPracticeStatus');
  const entry = document.getElementById('studentClassroomPracticeEntry');
  const statusText = record && record.status === 'completed'
    ? '今日已完成'
    : record
      ? '继续今日练习'
      : '今天可选 1 项';
  if (status) status.textContent = statusText;
  if (entry) {
    entry.setAttribute('aria-label', `随堂练习，${statusText}，一天一次`);
    entry.dataset.dailyStatus = record ? record.status : 'available';
  }
}

function refreshStudentClassroomPracticeHome() {
  if (isTeacher()) return;
  const key = STUDENT_CLASSROOM_PRACTICE_HOME_KEY_PREFIX + currentUser;
  const local = getMirrorValue(key);
  applyStudentClassroomPracticeHomeRecord(
    local && typeof local === 'object' ? local[todayISO()] : null
  );
  Promise.resolve().then(async () => {
    try {
      const remote = await sbGetRemote(key);
      const record = remote && typeof remote === 'object' ? remote[todayISO()] : null;
      applyStudentClassroomPracticeHomeRecord(record);
    } catch (error) {
      // The mirrored daily status is already visible; refresh failures stay non-blocking.
    }
  });
}

function teacherPracticeDateParts(item) {
  const value = String(item && (item.id || item.title) || '');
  let match = value.match(/(?:^|[^\d])(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:[^\d]|$)/);
  if (!match) {
    match = String(item && item.title || '').match(/(?:^|[^\d])(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[^\d]|$)/);
    if (match) match = [match[0], `20${match[1]}`, match[2], match[3]];
  }
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(timestamp) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day, timestamp };
}

function teacherPracticeDisplayTitle(value) {
  return String(value || '')
    .replace(/^\s*\d{2,4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*[｜|·—–-]?\s*/, '')
    .trim() || '未命名练习';
}

function latestTeacherPractice(items) {
  const list = Array.isArray(items) ? items : [];
  const ranked = list.map((item, index) => ({ item, index, date: teacherPracticeDateParts(item) }));
  ranked.sort((a, b) => {
    const aTime = a.date ? a.date.timestamp : Number.NEGATIVE_INFINITY;
    const bTime = b.date ? b.date.timestamp : Number.NEGATIVE_INFINITY;
    return bTime - aTime || a.index - b.index;
  });
  const latest = ranked[0];
  if (!latest || !latest.item) return null;
  return {
    title: teacherPracticeDisplayTitle(latest.item.title),
    date: latest.date
      ? `${latest.date.year}年${latest.date.month}月${latest.date.day}日`
      : '日期未标注'
  };
}

function teacherProgressDate(row) {
  const value = row && (row.last_lesson_date || row.lesson_date || row.updated_at);
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildTeacherKnowledgeSummary(topics, progressStore, initialProgress) {
  const catalog = Array.isArray(topics) ? topics : [];
  const catalogByKey = new Map(catalog.map(topic => [String(topic.topicKey || ''), topic]));
  const remoteTopics = progressStore && progressStore.topics && typeof progressStore.topics === 'object'
    ? progressStore.topics
    : null;
  const rows = remoteTopics
    ? Object.entries(remoteTopics).map(([topicKey, row]) => ({ topicKey, ...(row || {}) }))
    : (Array.isArray(initialProgress) ? initialProgress.map(row => ({ ...(row || {}) })) : []);
  const rowTitle = row => String(row && (row.title || catalogByKey.get(String(row.topicKey || ''))?.titleZh) || '').trim();
  const completed = rows.filter(row => row.status === 'confirmed_complete');
  const last = [...completed].sort((a, b) => teacherProgressDate(b) - teacherProgressDate(a))[0] || null;
  const statusPriority = { materials_ready: 0, to_teach: 1, needs_review: 2 };
  const queued = rows.filter(row => Object.prototype.hasOwnProperty.call(statusPriority, row.status));
  queued.sort((a, b) => {
    const statusDelta = statusPriority[a.status] - statusPriority[b.status];
    if (statusDelta) return statusDelta;
    const aDate = teacherProgressDate(a);
    const bDate = teacherProgressDate(b);
    if (aDate && bDate && aDate !== bDate) return aDate - bDate;
    return (Number(a.sequence) || Number(catalogByKey.get(String(a.topicKey || ''))?.sequenceOrder) || 9999)
      - (Number(b.sequence) || Number(catalogByKey.get(String(b.topicKey || ''))?.sequenceOrder) || 9999);
  });
  let next = queued[0] || null;
  if (!next) {
    const progressByKey = new Map(rows.map(row => [String(row.topicKey || ''), row]));
    const pendingTopic = [...catalog]
      .sort((a, b) => (Number(a.sequenceOrder) || 9999) - (Number(b.sequenceOrder) || 9999))
      .find(topic => progressByKey.get(String(topic.topicKey || ''))?.status !== 'confirmed_complete');
    if (pendingTopic) next = { topicKey: pendingTopic.topicKey, title: pendingTopic.titleZh };
  }
  return {
    completed: completed.length,
    total: catalog.length,
    lastTitle: rowTitle(last) || '暂无已教授记录',
    nextTitle: rowTitle(next) || '暂无待教授知识点',
    source: remoteTopics ? 'remote' : 'initial'
  };
}

function renderTeacherPracticeSummary(summary) {
  const panel = document.getElementById('teacherLatestPracticeSummary');
  const title = document.getElementById('teacherLatestPracticeTitle');
  const date = document.getElementById('teacherLatestPracticeDate');
  if (!panel || !title || !date) return;
  panel.setAttribute('aria-busy', 'false');
  panel.dataset.state = summary ? 'ready' : 'unavailable';
  title.textContent = summary ? summary.title : '还没有可显示的随堂练习';
  date.textContent = summary ? summary.date : '暂无日期';
}

function renderTeacherKnowledgeSummary(summary) {
  const panel = document.getElementById('teacherKnowledgeSummary');
  const progress = document.getElementById('teacherKnowledgeProgressCount');
  const last = document.getElementById('teacherKnowledgeLastTopic');
  const next = document.getElementById('teacherKnowledgeNextTopic');
  if (!panel || !progress || !last || !next) return;
  panel.setAttribute('aria-busy', 'false');
  panel.dataset.state = summary ? 'ready' : 'unavailable';
  progress.textContent = summary ? `${summary.completed} / ${summary.total}` : '— / —';
  last.textContent = summary ? summary.lastTitle : '暂时无法读取正式进度';
  next.textContent = summary ? summary.nextTitle : '进入知识点库后可查看';
  if (summary) {
    panel.setAttribute('aria-label', `已教授 ${summary.completed} / ${summary.total}；刚教过：${summary.lastTitle}；下一项：${summary.nextTitle}`);
  }
}

let teacherDashboardSummaryRefreshPromise = null;

function refreshTeacherDashboardSummaries() {
  if (!isTeacher()) return Promise.resolve();
  if (teacherDashboardSummaryRefreshPromise) return teacherDashboardSummaryRefreshPromise;
  teacherDashboardSummaryRefreshPromise = (async () => {
    const practicePromise = (async () => {
      if (typeof loadFeatureScript === 'function') await loadFeatureScript('js/courseware-data.js');
      renderTeacherPracticeSummary(latestTeacherPractice(window.CLASSROOM_PRACTICE_ITEMS));
    })().catch(error => {
      console.warn('Unable to load teacher practice summary', error && (error.message || error));
      renderTeacherPracticeSummary(null);
    });

    const knowledgePromise = (async () => {
      const [topicsResponse, initialResponse] = await Promise.all([
        fetch('grammar-library/data/topics.json'),
        fetch('grammar-library/data/initial-progress.json')
      ]);
      if (!topicsResponse.ok || !initialResponse.ok) throw new Error('知识点目录读取失败');
      const [topics, initialProgress] = await Promise.all([topicsResponse.json(), initialResponse.json()]);
      const mirrored = typeof getMirrorValue === 'function' ? getMirrorValue('grammar_progress') : null;
      renderTeacherKnowledgeSummary(buildTeacherKnowledgeSummary(topics, mirrored, initialProgress));
      Promise.resolve().then(async () => {
        try {
          const remote = await sbGetRemote('grammar_progress');
          renderTeacherKnowledgeSummary(buildTeacherKnowledgeSummary(topics, remote, initialProgress));
        } catch (error) {
          // The mirrored or initial summary is already visible; remote refresh failures stay non-blocking.
        }
      });
    })().catch(error => {
      console.warn('Unable to load teacher knowledge summary', error && (error.message || error));
      renderTeacherKnowledgeSummary(null);
    });

    await Promise.allSettled([practicePromise, knowledgePromise]);
  })().finally(() => {
    teacherDashboardSummaryRefreshPromise = null;
  });
  return teacherDashboardSummaryRefreshPromise;
}

async function loadHome() {
  updateUserBar();
  if (currentUser === 'teacher') document.body.classList.add('is-teacher');
  else document.body.classList.remove('is-teacher');
  if (isTeacher()) {
    refreshTeacherDashboardSummaries();
    return;
  }

  await loadStudentRewardSummary();
  const notice = document.getElementById('studentHomeNotice');
  if (notice) {
    notice.hidden = true;
    notice.textContent = '';
  }
  await refreshStudentClassroomPracticeHome();
  if (typeof window.updateVocabularyAdventurePreviewEntry === 'function') {
    await window.updateVocabularyAdventurePreviewEntry();
  }
}

async function refreshTeacherWordCards() {
  if (!isTeacher()) return;
  const list = document.getElementById('batchList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-light);font-size:13px">加载中…</div>';
  const filterState = getBookPurposeFilterState('teacherCommonBookFilter', 'teacherSupportBookFilter');
  const batches = filterBatchesByBookPurpose(getVisibleBatchesNewestFirst(), filterState.showCommon, filterState.showSupport);
  const urecMap = {};
  await Promise.all(batches.map(async b => { urecMap[b.id] = await loadUserBatch(b.id); }));

  list.innerHTML = '';
  if (batches.length === 0) {
    list.innerHTML = !filterState.showCommon && !filterState.showSupport
      ? '<div class="empty-state"><div class="empty-emoji">📚</div><p>当前没有选择要显示的单词本类型</p></div>'
      : '<div class="empty-state"><div class="empty-emoji">📭</div><p>当前类型下还没有单词本</p></div>';
  } else {
    batches.forEach(batch => {
      const bookPurpose = getBookPurpose(batch);
      const urec = urecMap[batch.id] || {known:[],unknown:[]};
      const item = document.createElement('div');
      item.className = 'batch-item';
      const delBtn = `<button class="batch-delete" onclick="event.stopPropagation();deleteBatch('${batch.id}')">🗑</button>`;
      let pushTagsHTML = '';
      if (batch.sharedWith && batch.sharedWith.length > 0) {
        pushTagsHTML = '<div class="push-tags">'
          + (batch.sharedWith.includes('sister') ? '<span class="push-tag sister">👧姐姐</span>' : '')
          + (batch.sharedWith.includes('brother') ? '<span class="push-tag brother">👦弟弟</span>' : '')
          + '</div>';
      }
      item.innerHTML = `
        <span class="batch-icon">${bookPurpose === 'support' ? '🧩' : '📚'}</span>
        <div class="batch-info">
          <div class="batch-name">${batch.name}</div>
          <div class="batch-meta">${batch.cards.length} 个单词 · ✅${urec.known.length} ❌${urec.unknown.length}</div>
          ${pushTagsHTML}
        </div>
        <span class="batch-arrow">›</span>
        ${delBtn}`;
      item.addEventListener('click', () => openBatch(batch.id));
      list.appendChild(item);
    });
  }
  const mergeEntryBtn = document.getElementById('mergeEntryBtn');
  if (mergeEntryBtn) mergeEntryBtn.style.display = appData.batches.length >= 1 ? 'flex' : 'none';
}

async function openTeacherWordCards() {
  if (!isTeacher()) return;
  if (typeof loadFeatureGroup === 'function') await loadFeatureGroup('teacherTools');
  showScreen('screenTeacherWordCards');
  await refreshTeacherWordCards();
}

async function openTeacherWordImport() {
  if (!isTeacher()) return;
  if (typeof loadFeatureGroup === 'function') await loadFeatureGroup('teacherTools');
  if (typeof showNewBatch !== 'function') {
    alert('导入功能暂时无法加载，请刷新后重试。');
    return;
  }
  showNewBatch();
}

function returnToTeacherHome() {
  if (!isTeacher()) return;
  showScreen('screenHome');
  loadHome();
}

function closeBatchDetail() {
  if (isTeacher()) {
    openTeacherWordCards();
    return;
  }
  showScreen('screenHome');
  loadHome();
}

async function closeBatchImport() {
  if (importMode === 'add' && currentBatchId) {
    await loadDetail();
    showScreen('screenDetail');
    return;
  }
  if (isTeacher()) {
    openTeacherWordCards();
    return;
  }
  showScreen('screenHome');
  loadHome();
}

function closeMergeSelect() {
  if (isTeacher()) {
    openTeacherWordCards();
    return;
  }
  showScreen('screenHome');
  loadHome();
}

async function deleteBatch(id) {
  if (!canWriteCloudData()) return;
  if (!confirm('确定删除这个单词本吗？')) return;
  const updated = await updateMainDataSafely(data => {
    const before = data.batches.length;
    data.batches = data.batches.filter(batch => String(batch.id) !== String(id));
    return data.batches.length !== before;
  });
  if (!updated) return;
  if (isTeacher()) refreshTeacherWordCards();
  else loadHome();
}

async function openBatch(id) {
  studyIsGlobal = false;
  resultContext = '';
  currentBatchId = String(id);
  currentUserRec = await loadUserBatch(currentBatchId);
  await loadDetail();
  showScreen('screenDetail');
}

// ══════════════════════════════════════
// HOME QUICK ACTIONS (across ALL visible batches for current student)
// ══════════════════════════════════════
async function loadAllVisibleRecs(batches) {
  const recs = {};
  await Promise.all(batches.map(async b => { recs[b.id] = await loadUserBatch(b.id); }));
  return recs;
}
function buildGlobalDailyPool(batches, recs) {
  let known = [], newW = [], unk = [];
  batches.forEach(b => {
    const rec = recs[b.id] || {known:[],unknown:[]};
    b.cards.forEach(c => {
      const word = getCardWord(c);
      if (rec.known.includes(word)) known.push(c);
      else if (rec.unknown.includes(word)) unk.push(c);
      else newW.push(c);
    });
  });
  known = known.sort(() => Math.random()-0.5);
  newW = newW.sort(() => Math.random()-0.5);
  unk = unk.sort(() => Math.random()-0.5);
  let pool = [...known];
  if (pool.length < 10) pool.push(...newW.slice(0, 10-pool.length));
  if (pool.length < 10) pool.push(...unk.slice(0, 10-pool.length));
  return pool.slice(0, 10);
}
function updateHomeQuickActions(batches, urecMap) {
  if (!document.getElementById('homePoolBtn')) return; // legacy student shortcuts are hidden in the task-first UI
  let totalCards = 0, totalUnknown = 0, totalSeen = 0;
  batches.forEach(b => {
    const rec = urecMap[b.id] || {known:[],unknown:[]};
    totalCards += b.cards.length;
    totalUnknown += rec.unknown.length;
    totalSeen += rec.known.length + rec.unknown.length;
  });
  const poolBtn = document.getElementById('homePoolBtn');
  const shuffleBtn = document.getElementById('homeShuffleBtn');
  const dailyBtn = document.getElementById('homeDailyBtn');
  poolBtn.disabled = totalUnknown === 0;
  document.getElementById('homePoolSub').textContent = totalUnknown > 0 ? `${totalUnknown} 个生词等你攻克` : '还没有生词';
  shuffleBtn.disabled = totalCards === 0;
  document.getElementById('homeShuffleSub').textContent = totalCards > 0 ? '每次随机抽 10 个' : '还没有单词';
  dailyBtn.disabled = totalSeen < 3;
  document.getElementById('homeDailySub').textContent = totalSeen >= 3 ? '混合题型·最多10题' : `背完后解锁（已看${totalSeen}个）`;
}
async function startGlobalPool() {
  const batches = visibleBatches();
  if (batches.length === 0) { alert('暂无推送的单词卡，等老师推送后就可以学习啦'); return; }
  const recs = await loadAllVisibleRecs(batches);
  let deck = [];
  batches.forEach(b => {
    const rec = recs[b.id] || {known:[],unknown:[]};
    b.cards.forEach(c => { if (rec.unknown.includes(getCardWord(c))) deck.push({...c, _batchId: b.id}); });
  });
  if (deck.length === 0) { alert('还没有生词，再接着学吧！'); return; }
  globalUserRecs = recs;
  studyIsGlobal = true; resultContext = ''; studyMode = 'pool';
  studyDeck = deck.sort(() => Math.random()-0.5);
  studyCurrent = 0; studyFlipped = false;
  document.getElementById('modeLabel').textContent = '💪 全部生词池';
  showScreen('screenStudy'); renderStudyCard();
}
async function startGlobalRandom() {
  const batches = visibleBatches();
  if (batches.length === 0) { alert('暂无推送的单词卡，等老师推送后就可以学习啦'); return; }
  const recs = await loadAllVisibleRecs(batches);
  let deck = [];
  batches.forEach(b => { b.cards.forEach(c => deck.push({...c, _batchId: b.id})); });
  if (deck.length === 0) { alert('还没有单词，等老师推送单词卡吧！'); return; }
  globalUserRecs = recs;
  studyIsGlobal = true; resultContext = ''; studyMode = 'shuffle';
  studyDeck = deck.sort(() => Math.random()-0.5).slice(0, 10);
  studyCurrent = 0; studyFlipped = false;
  document.getElementById('modeLabel').textContent = '🔀 全部随机学习';
  showScreen('screenStudy'); renderStudyCard();
}
async function startGlobalDailyQuiz() {
  const batches = visibleBatches();
  if (batches.length === 0) { alert('暂无推送的单词卡，等老师推送后就可以测验啦'); return; }
  const recs = await loadAllVisibleRecs(batches);
  const pool = buildGlobalDailyPool(batches, recs);
  if (pool.length === 0) { alert('还没有单词可以测验哦！'); return; }
  studyIsGlobal = false;
  const allCards = batches.flatMap(b => b.cards);
  startPlannedDailyQuiz(pool, allCards.length > 4 ? allCards : pool, 'global-daily');
}
