function getVisibleBatchesNewestFirst() {
  return [...visibleBatches()].sort(compareBatchesNewestFirst);
}

function compareBatchesNewestFirst(a, b) {
  normalizeBatch(a);
  normalizeBatch(b);
  const dateCmp = String(getBatchSortDate(b) || '').localeCompare(String(getBatchSortDate(a) || ''));
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
  try {
    if (!canWriteCloudData()) return false;
    await sbSet('daily_task_' + currentUser, data);
    return true;
  } catch(e) {
    showStorageError(e);
    return false;
  }
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
  const hasToday = !!(today.todayChallenge && today.todayChallenge.checkedIn);
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
  return await saveDailyTaskData(data);
}

async function canStartChallenge(taskKey) {
  const { entry } = await getChallengeTaskEntry(taskKey);
  return (entry.attempts || 0) < 2;
}

function isLocalBatchChallenge(taskKey) {
  return String(taskKey || '').indexOf('batchChallenge_') === 0;
}

function localBatchChallengeKey(taskKey) {
  return ['wc_batch_challenge_v1', currentUser, isoDate(), taskKey].join('_');
}

async function getChallengeTaskEntry(taskKey) {
  if (!isLocalBatchChallenge(taskKey)) return await getTaskEntry(taskKey);
  const storageKey = localBatchChallengeKey(taskKey);
  let entry = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) entry = saved;
  } catch (e) {
    console.warn('Invalid local batch challenge record', e);
  }
  return { entry, storageKey };
}

async function saveChallengeTaskEntry(record) {
  if (!record.storageKey) return await saveDailyTaskData(record.data);
  try {
    localStorage.setItem(record.storageKey, JSON.stringify(record.entry));
    return true;
  } catch (e) {
    showStorageError(e);
    return false;
  }
}

async function completeActiveChallenge(correct, total) {
  if (!activeTask || activeTask.mode !== 'challenge') return false;
  if (activeChallengeRecorded) return true;
  if (challengeAttemptSaving) return false;
  challengeAttemptSaving = true;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  try {
    const record = await getChallengeTaskEntry(activeTask.key);
    record.entry.attempts = (record.entry.attempts || 0) + 1;
    record.entry.bestScore = Math.max(record.entry.bestScore || 0, score);
    record.entry.checkedIn = true;
    if (!await saveChallengeTaskEntry(record)) return false;
    activeChallengeRecorded = true;
    if (!record.storageKey) await renderCheckInStrip();
    return true;
  } finally {
    challengeAttemptSaving = false;
  }
}

async function confirmExitChallenge() {
  if (!activeTask || activeTask.mode !== 'challenge') {
    showScreen('screenHome');
    await loadHome();
    return;
  }
  if (challengeAttemptSaving) return;
  if (!confirm('确定要退出吗，退出默认此次挑战机会作废哦~')) return;
  const saved = await completeActiveChallenge(dqCorrect, dqQuestions.length || 10);
  if (!saved) return;
  resetStudentRuntimeView();
  showScreen('screenHome');
  await loadHome();
}

async function updateHomeTaskButtons(batches) {
  const latest = getTodayTaskBatch();
  const mixed = await getMixedTaskBatches();
  const mixedNameText = mixed.length > 0 ? mixed.map(batch => batch.name).join('、') : '';
  const todayReview = latest ? await reviewStatus('todayReview', latest.name) : { text: '暂无单词卡', state: '' };
  const todayChallenge = latest ? await challengeStatus('todayChallenge') : { text: '暂无单词卡', state: '' };
  const mixedReview = mixed.length > 0 ? await reviewStatus('mixedReview', mixedNameText) : { text: '暂无混合词库', state: '' };
  const mixedChallenge = mixed.length > 0 ? await challengeStatus('mixedChallenge') : { text: '暂无混合词库', state: '' };
  if (latest) todayReview.text = latest.name;
  if (latest && !todayChallenge.state) todayChallenge.text = latest.name;
  if (mixed.length > 0) mixedReview.text = mixedNameText;
  if (mixed.length > 0 && !mixedChallenge.state) mixedChallenge.text = mixedNameText;
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
  const { entry } = await getChallengeTaskEntry(taskKey);
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

function getTaskAssignment(date) {
  const assignments = Array.isArray(appData.taskAssignments) ? appData.taskAssignments : [];
  return [...assignments].reverse().find(item => item && item.date === date) || null;
}

function getTodayTaskBatch() {
  const visible = getVisibleBatchesNewestFirst();
  const visibleIds = new Set(visible.map(batch => String(batch.id)));
  const assignment = getTaskAssignment(isoDate());
  if (assignment && assignment.todayBatchId != null) {
    const selected = appData.batches.find(batch => String(batch.id) === String(assignment.todayBatchId));
    if (selected && visibleIds.has(String(selected.id))) return selected;
  }
  return visible[0] || null;
}

async function getMixedTaskBatches() {
  const visible = getVisibleBatchesNewestFirst();
  const visibleIds = new Set(visible.map(b => String(b.id)));
  const taskAssignment = getTaskAssignment(isoDate());
  if (taskAssignment && Array.isArray(taskAssignment.mixedBatchIds)) {
    const selected = taskAssignment.mixedBatchIds
      .map(id => appData.batches.find(b => String(b.id) === String(id)))
      .filter(b => b && visibleIds.has(String(b.id)));
    if (selected.length > 0) return selected;
    return visible.slice(0, 3);
  }
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
    rec.unknown.forEach(word => unknownSet.add(word));
  } else {
    const ids = [...new Set(source.map(c => c._batchId).filter(Boolean).map(String))];
    await Promise.all(ids.map(async id => {
      const rec = await loadUserBatch(id);
      rec.unknown.forEach(word => unknownSet.add(word));
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
  const example = (card.collocations || []).map(item => item && item.example).find(Boolean) || '';
  const exampleHtml = example ? `<div class="student-word-ex">${escapeHtml(example)}</div>` : '';
  document.getElementById('studentWordCard').innerHTML = `
    <div class="student-word-emoji">${card.emoji || '📚'}</div>
    <div class="student-word-en">${escapeHtml(word)}</div>
    <div class="student-word-zh">${escapeHtml(meaning)}</div>
    <button class="student-word-speak" onclick="speakWord('${escapeJs(word)}')">🔊</button>
    ${exampleHtml}`;
  document.getElementById('studentWordPrevBtn').disabled = studentWordIndex <= 0;
  document.getElementById('studentWordNextBtn').disabled = studentWordIndex >= studentWordCards.length - 1;
}

async function showTeacherMixSelect() {
  if (!isTeacher()) return;
  if (!canWriteCloudData()) return;
  mergeSelected = new Set();
  taskAssignmentDay = '';
  taskAssignmentType = '';
  showScreen('screenMerge');
  const title = document.querySelector('#screenMerge .topbar-title');
  if (title) title.textContent = '📋 任务词库设置';
  const hint = document.querySelector('#screenMerge .topbar + div');
  if (hint) hint.textContent = '先选择单词本，再选择生效日期和任务类型';
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
  const controls = document.getElementById('taskAssignmentControls');
  if (bar) bar.style.display = '';
  if (controls) controls.style.display = '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '请选择单词本和应用位置';
    btn.onclick = saveTaskLibraryAssignment;
  }
  updateTaskAssignmentControls();
}

function selectTaskAssignmentOption(group, value) {
  if (!isTeacher()) return;
  if (group === 'day') taskAssignmentDay = value;
  if (group === 'type') taskAssignmentType = value;
  updateTaskAssignmentControls();
}

function updateTaskAssignmentControls() {
  const optionStates = {
    assignmentDayToday: taskAssignmentDay === 'today',
    assignmentDayTomorrow: taskAssignmentDay === 'tomorrow',
    assignmentTypeToday: taskAssignmentType === 'today',
    assignmentTypeMixed: taskAssignmentType === 'mixed'
  };
  Object.entries(optionStates).forEach(([id, selected]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('selected', selected);
  });
  const btn = document.getElementById('mergeStartBtn');
  if (!btn || !isTeacher()) return;
  const count = mergeSelected.size;
  const tooManyForToday = taskAssignmentType === 'today' && count > 1;
  const ready = count > 0 && !!taskAssignmentDay && !!taskAssignmentType && !tooManyForToday;
  btn.disabled = !ready;
  if (tooManyForToday) {
    btn.textContent = '今日任务只能选择 1 个单词本';
  } else if (!taskAssignmentDay || !taskAssignmentType) {
    btn.textContent = count > 0 ? '请选择应用位置' : '请选择单词本和应用位置';
  } else if (count < 1) {
    btn.textContent = '至少选择 1 个单词本';
  } else {
    const dayText = taskAssignmentDay === 'today' ? '今天' : '明天';
    const typeText = taskAssignmentType === 'today' ? '今日任务' : '混合任务';
    btn.textContent = `应用到${dayText}的${typeText}`;
  }
}

async function saveTaskLibraryAssignment() {
  const ids = Array.from(mergeSelected);
  if (ids.length < 1) return;
  if (!taskAssignmentDay || !taskAssignmentType) return;
  if (taskAssignmentType === 'today' && ids.length !== 1) return;
  if (!canWriteCloudData()) return;
  if (!Array.isArray(appData.taskAssignments)) appData.taskAssignments = [];
  const offset = taskAssignmentDay === 'today' ? 0 : 1;
  const date = isoDate(offset);
  let assignment = [...appData.taskAssignments].reverse().find(item => item && item.date === date);
  if (!assignment) {
    assignment = { date };
    appData.taskAssignments.push(assignment);
  }
  if (taskAssignmentType === 'today') assignment.todayBatchId = String(ids[0]);
  else assignment.mixedBatchIds = ids.map(String);
  assignment.updatedAt = Date.now();
  if (!await saveData(appData)) return;
  const dayText = taskAssignmentDay === 'today' ? '今天' : '明天';
  const typeText = taskAssignmentType === 'today' ? '今日任务' : '混合任务';
  alert(`已应用到${dayText}的${typeText}`);
  showScreen('screenHome');
  loadHome();
}
