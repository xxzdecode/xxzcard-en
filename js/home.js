// CHECK-IN STARS (daily streak badge)
// ══════════════════════════════════════
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
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
async function loadHome() {
  updateUserBar();
  if (currentUser === 'teacher') document.body.classList.add('is-teacher');
  else document.body.classList.remove('is-teacher');
  if (!isTeacher()) renderCheckInStrip();

  const list = document.getElementById('batchList');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-light);font-size:13px">加载中…</div>';
  const batches = getVisibleBatchesNewestFirst();
  // load all user recs in parallel
  const urecMap = {};
  await Promise.all(batches.map(async b => { urecMap[b.id] = await loadUserBatch(b.id); }));

  list.innerHTML = '';
  if (batches.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-emoji">${isTeacher()?'📭':'🔒'}</div><p>${isTeacher()?'还没有单词本<br>点上方按钮新建一个吧':'暂无推送的单词卡<br>等老师推送后就可以学习啦'}</p></div>`;
  } else {
    batches.forEach(batch => {
      const urec = urecMap[batch.id] || {known:[],unknown:[]};
      const item = document.createElement('div');
      item.className = 'batch-item';
      const delBtn = isTeacher() ? `<button class="batch-delete" onclick="event.stopPropagation();deleteBatch('${batch.id}')">🗑</button>` : '';
      let pushTagsHTML = '';
      if (isTeacher() && batch.sharedWith && batch.sharedWith.length > 0) {
        pushTagsHTML = '<div class="push-tags">'
          + (batch.sharedWith.includes('sister') ? '<span class="push-tag sister">👧姐姐</span>' : '')
          + (batch.sharedWith.includes('brother') ? '<span class="push-tag brother">👦弟弟</span>' : '')
          + '</div>';
      }
      item.innerHTML = `
        <span class="batch-icon">📚</span>
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
  mergeEntryBtn.style.display = (isTeacher() && appData.batches.length >= 1) ? 'flex' : 'none';

  if (!isTeacher()) await updateHomeTaskButtons(batches);
}

async function deleteBatch(id) {
  if (!canWriteCloudData()) return;
  if (!confirm('确定删除这个单词本吗？')) return;
  appData.batches = appData.batches.filter(b => String(b.id) !== String(id));
  if (!await saveData(appData)) return;
  loadHome();
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
  studyIsGlobal = false; resultContext = 'global-daily';
  const allCards = batches.flatMap(b => b.cards);
  dqQuestions = pool.map(card => makeDailyQuestion(card, allCards.length > 4 ? allCards : pool));
  dqIndex = 0; dqCorrect = 0; dqWrongList = []; dqSelectedOpt = null;
  showScreen('screenDailyQuiz'); renderDQQuestion();
}
