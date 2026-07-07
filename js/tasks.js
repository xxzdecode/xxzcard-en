function getVisibleBatchesNewestFirst() {
  return [...visibleBatches()].sort(compareBatchesNewestFirst);
}

function compareBatchesNewestFirst(a, b) {
  normalizeBatch(a);
  normalizeBatch(b);
  const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
  if (dateCmp !== 0) return dateCmp;
  return Number(b.id) - Number(a.id);
}

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

async function loadDailyTaskData() {
  const data = await sbGet('daily_task_' + currentUser);
  return data && typeof data === 'object' ? data : {};
}

async function saveDailyTaskData(data) {
  await sbSet('daily_task_' + currentUser, data);
}

function ensureTodayTask(data) {
  const today = isoDate();
  if (!data[today]) data[today] = {};
  return data[today];
}

async function getTodayCheckInCount() {
  if (isTeacher()) return 0;
  const data = await loadDailyTaskData();
  const today = data[isoDate()] || {};
  const hasToday = !!(today.todayChallenge && today.todayChallenge.checkedIn)
    || Object.keys(today).some(k => k.indexOf('batchChallenge_') === 0 && today[k] && today[k].checkedIn);
  const hasMixed = !!(today.mixedChallenge && today.mixedChallenge.checkedIn);
  return Math.min(2, (hasToday ? 1 : 0) + (hasMixed ? 1 : 0));
}

async function getTaskEntry(taskKey) {
  const data = await loadDailyTaskData();
  const today = ensureTodayTask(data);
  if (!today[taskKey]) today[taskKey] = {};
  return { data, today, entry: today[taskKey] };
}

async function saveReviewComplete(taskKey) {
  const { data, entry } = await getTaskEntry(taskKey);
  entry.completed = true;
  await saveDailyTaskData(data);
}

async function canStartChallenge(taskKey) {
  const { entry } = await getTaskEntry(taskKey);
  return (entry.attempts || 0) < 2;
}

async function completeActiveChallenge(correct, total) {
  if (!activeTask || activeTask.mode !== 'challenge') return;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const { data, entry } = await getTaskEntry(activeTask.key);
  entry.attempts = (entry.attempts || 0) + 1;
  entry.bestScore = Math.max(entry.bestScore || 0, score);
  entry.checkedIn = true;
  await saveDailyTaskData(data);
  await renderCheckInStrip();
}

async function updateHomeTaskButtons(batches) {
  const latest = batches[0];
  const mixed = await getMixedTaskBatches();
  const mixedDateText = mixed.length > 0 ? mixedBatchDateSummary(mixed) : '';
  const todayReview = latest ? await reviewStatus('todayReview', latest.name) : { text: '暂无单词卡', state: '' };
  const todayChallenge = latest ? await challengeStatus('todayChallenge') : { text: '暂无单词卡', state: '' };
  const mixedReview = mixed.length > 0 ? await reviewStatus('mixedReview', mixedDateText) : { text: '暂无混合词库', state: '' };
  const mixedChallenge = mixed.length > 0 ? await challengeStatus('mixedChallenge') : { text: '暂无混合词库', state: '' };
  if (mixed.length > 0) mixedReview.text = mixedDateText;
  if (mixed.length > 0) mixedChallenge.text = mixedDateText;
  setTaskButton('todayReviewBtn', !!latest, todayReview.text, todayReview.state);
  setTaskButton('todayChallengeBtn', !!latest && todayChallenge.state !== 'locked', todayChallenge.text, todayChallenge.state);
  setTaskButton('mixedReviewBtn', mixed.length > 0, mixedReview.text, mixedReview.state);
  setTaskButton('mixedChallengeBtn', mixed.length > 0 && mixedChallenge.state !== 'locked', mixedChallenge.text, mixedChallenge.state);
}

async function updateDetailChallengeStatus(batchId) {
  const reviewBtn = document.getElementById('btnBatchReview');
  const reviewSub = document.getElementById('batchReviewSub');
  const sub = document.getElementById('dailyQuizSub');
  const challengeBtn = document.getElementById('btnDailyQuiz');
  if (!batchId || isTeacher()) return;
  const r = await reviewStatus('batchReview_' + batchId, '不计分');
  if (reviewSub) reviewSub.textContent = r.text;
  if (reviewBtn) {
    reviewBtn.classList.toggle('task-done', r.state === 'done');
    reviewBtn.classList.remove('task-locked');
  }
  const c = await challengeStatus('batchChallenge_' + batchId);
  if (sub) sub.textContent = c.text;
  if (challengeBtn) {
    challengeBtn.disabled = c.state === 'locked';
    challengeBtn.classList.toggle('task-done', c.state === 'done' || c.state === 'locked');
    challengeBtn.classList.toggle('task-locked', c.state === 'locked');
  }
}

async function reviewStatus(taskKey, defaultText) {
  const { entry } = await getTaskEntry(taskKey);
  return entry.completed ? { text: '今日已温习', state: 'done' } : { text: defaultText, state: '' };
}

async function challengeStatus(taskKey) {
  const { entry } = await getTaskEntry(taskKey);
  const attempts = entry.attempts || 0;
  if (attempts >= 2) return { text: `今日最高 ${entry.bestScore || 0} 分`, state: 'locked' };
  if (attempts > 0) return { text: `最高 ${entry.bestScore || 0} 分 · 还可再来 ${2 - attempts} 次`, state: 'done' };
  return { text: '今日可挑战', state: '' };
}

function setTaskButton(id, enabled, subText, state) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = !enabled;
  btn.classList.remove('task-done', 'task-locked');
  if (state === 'done') btn.classList.add('task-done');
  if (state === 'locked') btn.classList.add('task-done', 'task-locked');
  const sub = btn.querySelector('.task-sub');
  if (sub) sub.textContent = subText;
}

function latestVisibleBatch() {
  return getVisibleBatchesNewestFirst()[0] || null;
}

function formatBatchDateLabel(batch) {
  const date = String(batch && batch.date ? batch.date : '').trim();
  let match = date.match(/^\d{4}[-./](\d{1,2})[-./](\d{1,2})$/);
  if (match) return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}`;
  match = date.match(/^(\d{1,2})[-./](\d{1,2})$/);
  if (match) return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}`;

  const name = String(batch && batch.name ? batch.name : '');
  match = name.match(/\b\d{2,4}[./-](\d{1,2})[./-](\d{1,2})\b/);
  if (match) return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}`;
  match = name.match(/\b(\d{1,2})[./-](\d{1,2})\b/);
  if (match) return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}`;
  return '';
}

function mixedBatchDateSummary(batches) {
  const labels = [];
  batches.forEach(batch => {
    const label = formatBatchDateLabel(batch);
    if (label && !labels.includes(label)) labels.push(label);
  });
  return labels.length > 0 ? labels.join('、') : `${batches.length} 组单词卡`;
}

async function getMixedTaskBatches() {
  const visible = getVisibleBatchesNewestFirst();
  const visibleIds = new Set(visible.map(b => String(b.id)));
  const assignments = Array.isArray(appData.mixedAssignments) ? appData.mixedAssignments : [];
  const today = isoDate();
  const picked = [...assignments].reverse().find(a => a.date === today && Array.isArray(a.batchIds));
  if (picked) {
    const selected = picked.batchIds
      .map(id => appData.batches.find(b => String(b.id) === String(id)))
      .filter(b => b && visibleIds.has(String(b.id)));
    if (selected.length > 0) return selected;
  }
  return visible.slice(0, 3);
}

function cardsFromBatches(batches) {
  return batches.flatMap(b => b.cards.map(c => ({...c, _batchId: b.id})));
}

async function prioritizedTaskDeck(cards, limit, batchId) {
  const source = cards.map(c => ({...c}));
  if (source.length === 0) return [];
  const unknownSet = new Set();
  if (batchId) {
    const rec = await loadUserBatch(String(batchId));
    rec.unknown.forEach(en => unknownSet.add(en));
  } else {
    const ids = [...new Set(source.map(c => c._batchId).filter(Boolean).map(String))];
    await Promise.all(ids.map(async id => {
      const rec = await loadUserBatch(id);
      rec.unknown.forEach(en => unknownSet.add(en));
    }));
  }
  const wrong = source.filter(c => unknownSet.has(getCardWord(c))).sort(() => Math.random() - 0.5);
  const rest = source.filter(c => !unknownSet.has(getCardWord(c))).sort(() => Math.random() - 0.5);
  const ordered = [...wrong, ...rest];
  const picked = ordered.slice(0, Math.min(limit, ordered.length));
  while (picked.length < limit) {
    const randomCard = ordered[Math.floor(Math.random() * ordered.length)];
    picked.push({...randomCard});
  }
  return picked;
}

async function startTodayReview() {
  const batch = latestVisibleBatch();
  if (!batch) { alert('还没有可用的单词卡'); return; }
  await startReviewTask({
    key: 'todayReview',
    title: '今日温习',
    deck: batch.cards,
    allCards: batch.cards,
    returnTo: 'home',
    batchId: batch.id
  });
}

async function startTodayChallenge() {
  const batch = latestVisibleBatch();
  if (!batch) { alert('还没有可用的单词卡'); return; }
  await startChallengeTask({
    key: 'todayChallenge',
    title: '今日挑战',
    deck: batch.cards,
    allCards: batch.cards,
    returnTo: 'home',
    batchId: batch.id
  });
}

async function startMixedReview() {
  const batches = await getMixedTaskBatches();
  if (batches.length === 0) { alert('还没有混合词库'); return; }
  const deck = cardsFromBatches(batches);
  await startReviewTask({
    key: 'mixedReview',
    title: '混合温习',
    deck,
    allCards: deck,
    returnTo: 'home'
  });
}

async function startMixedChallenge() {
  const batches = await getMixedTaskBatches();
  if (batches.length === 0) { alert('还没有混合词库'); return; }
  const deck = cardsFromBatches(batches);
  await startChallengeTask({
    key: 'mixedChallenge',
    title: '混合挑战',
    deck,
    allCards: deck,
    returnTo: 'home'
  });
}

async function startBatchReview(batchId) {
  const batch = appData.batches.find(b => String(b.id) === String(batchId));
  if (!batch) return;
  await startReviewTask({
    key: 'batchReview_' + batch.id,
    title: '今日温习',
    deck: batch.cards,
    allCards: batch.cards,
    returnTo: 'detail',
    batchId: batch.id
  });
}

async function startBatchChallenge(batchId) {
  const batch = appData.batches.find(b => String(b.id) === String(batchId));
  if (!batch) return;
  await startChallengeTask({
    key: 'batchChallenge_' + batch.id,
    title: '今日挑战',
    deck: batch.cards,
    allCards: batch.cards,
    returnTo: 'detail',
    batchId: batch.id
  });
}

async function startChallengeTask(task) {
  if (!await canStartChallenge(task.key)) {
    alert('今天这个挑战已经做满 2 次啦，明天再来！');
    return;
  }
  const deck = await prioritizedTaskDeck(task.deck, 10, task.batchId);
  if (deck.length === 0) { alert('还没有单词可以挑战'); return; }
  activeTask = {...task, mode: 'challenge'};
  activeTaskDeck = deck;
  activeTaskAllCards = task.allCards && task.allCards.length >= 4 ? task.allCards : deck;
  activeTaskReturn = task.returnTo || 'home';
  if (task.batchId) {
    currentBatchId = String(task.batchId);
    currentUserRec = await loadUserBatch(currentBatchId);
  }
  resultContext = 'task-challenge';
  dqQuestions = deck.map(card => makeDailyQuestion(card, activeTaskAllCards));
  dqIndex = 0; dqCorrect = 0; dqWrongList = []; dqSelectedOpt = null;
  const label = document.querySelector('#screenDailyQuiz .mode-label');
  if (label) label.textContent = '🏁 ' + task.title;
  showScreen('screenDailyQuiz');
  renderDQQuestion();
}

function finishTaskToSource() {
  if (activeTaskReturn === 'detail' && currentBatchId) goDetail();
  else { showScreen('screenHome'); loadHome(); }
}

function openStudentWordCard(idx) {
  studentWordIndex = idx;
  renderStudentWordCard();
  document.getElementById('modalStudentWordCard').classList.add('show');
}

function studentWordNav(dir) {
  if (!studentWordCards.length) return;
  studentWordIndex = Math.max(0, Math.min(studentWordCards.length - 1, studentWordIndex + dir));
  renderStudentWordCard();
}

function renderStudentWordCard() {
  const card = studentWordCards[studentWordIndex];
  if (!card) return;
  normalizeCardDictionary(card);
  const word = getCardWord(card);
  const meaning = getCardMeaning(card);
  const ex = card.ex ? `<div class="student-word-ex">${card.ex}</div>` : '';
  document.getElementById('studentWordCard').innerHTML = `
    <div class="student-word-emoji">${card.emoji || '📚'}</div>
    <div class="student-word-en">${escapeHtml(word)}</div>
    <div class="student-word-zh">${escapeHtml(meaning)}</div>
    <button class="student-word-speak" onclick="speakWord('${escapeJs(word)}')">🔊</button>
    ${ex}`;
  document.getElementById('studentWordPrevBtn').disabled = studentWordIndex <= 0;
  document.getElementById('studentWordNextBtn').disabled = studentWordIndex >= studentWordCards.length - 1;
}

async function showTeacherMixSelect() {
  if (!isTeacher()) return;
  mergeSelected = new Set();
  showScreen('screenMerge');
  const title = document.querySelector('#screenMerge .topbar-title');
  if (title) title.textContent = '🔀 设置混合词库';
  const hint = document.querySelector('#screenMerge .topbar + div');
  if (hint) hint.textContent = '选择多个单词本，应用到今天或明天的混合温习 / 混合挑战';
  const list = document.getElementById('mergeList');
  list.innerHTML = '';
  getVisibleBatchesNewestFirst().forEach(batch => {
    const item = document.createElement('div');
    item.className = 'merge-item';
    item.dataset.id = batch.id;
    item.innerHTML = `
      <div class="merge-check" id="mc_${batch.id}">✓</div>
      <div class="merge-info">
        <div class="merge-name">${batch.name}</div>
        <div class="merge-meta">${batch.cards.length} 词</div>
      </div>`;
    item.addEventListener('click', () => toggleMergeItem(batch.id));
    list.appendChild(item);
  });
  const bar = document.getElementById('mergeStartBar');
  const btn = document.getElementById('mergeStartBtn');
  const todayBtn = document.getElementById('mergeTodayBtn');
  if (bar) bar.style.display = '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '至少选择 2 个单词本';
    btn.onclick = () => saveMixedLibraryForDay(1);
  }
  if (todayBtn) {
    todayBtn.style.display = '';
    todayBtn.disabled = true;
    todayBtn.textContent = '应用到今天';
  }
}

async function saveMixedLibraryForDay(offsetDays) {
  const ids = Array.from(mergeSelected);
  if (ids.length < 2) return;
  if (!Array.isArray(appData.mixedAssignments)) appData.mixedAssignments = [];
  const offset = Number(offsetDays) === 0 ? 0 : 1;
  appData.mixedAssignments.push({ date: isoDate(offset), batchIds: ids.map(String), createdAt: Date.now() });
  await saveData(appData);
  alert(offset === 0 ? '已应用到今天的混合词库' : '已应用到明天的混合词库');
  showScreen('screenHome');
  loadHome();
}

async function saveTomorrowMixedLibrary() {
  await saveMixedLibraryForDay(1);
}
