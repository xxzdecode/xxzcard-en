// Rename
function showRename() {
  const batch = getCurrentBatch(); if (!batch) return;
  document.getElementById('renameInput').value = batch.name;
  document.getElementById('modalRename').classList.add('show');
  setTimeout(() => document.getElementById('renameInput').focus(), 100);
}
async function confirmRename() {
  const val = document.getElementById('renameInput').value.trim(); if (!val) return;
  const batch = getCurrentBatch(); batch.name = val; await saveData(appData);
  document.getElementById('detailTitle').textContent = val;
  closeAllModals(); loadHome();
}

// ══════════════════════════════════════
// EDIT WORDS (teacher)
// ══════════════════════════════════════
function toggleEditPanel() {
  const panel = document.getElementById('editPanel');
  const btn = document.getElementById('editPanelToggle');
  const isOpen = panel.classList.toggle('open');
  btn.classList.toggle('active', isOpen);
  document.getElementById('detailTitle').classList.toggle('tap-editable', isOpen);
}
// 点击标题：只有编辑模式打开时才触发改单词本名字
function onTitleTap() {
  const panel = document.getElementById('editPanel');
  if (panel && panel.classList.contains('open')) showRename();
}

function showWordSelector() {
  const batch = getCurrentBatch(); if (!batch) return;
  const list = document.getElementById('wsList');
  list.innerHTML = '';
  batch.cards.forEach((card, idx) => {
    const item = document.createElement('div');
    item.className = 'ws-item';
    item.innerHTML = `<span>${card.en}</span><span class="ws-zh">${card.zh || ''}</span>`;
    item.addEventListener('click', () => { closeAllModals(); openCardEditor(idx); });
    list.appendChild(item);
  });
  document.getElementById('modalWordSelector').classList.add('show');
}

let editingIdx = -1;
function updateEditNav() {
  const batch = getCurrentBatch();
  document.getElementById('editPrevBtn').disabled = editingIdx <= 0;
  document.getElementById('editNextBtn').disabled = editingIdx >= batch.cards.length - 1;
}
function fillEditorForm(card) {
  document.getElementById('ef-en').value = card.en || '';
  document.getElementById('ef-zh').value = card.zh || '';
  document.getElementById('ef-pos').value = card.pos || '';
  document.getElementById('ef-emoji').value = card.emoji || '';
  document.getElementById('ef-ex').value = card.ex || '';
  document.getElementById('ef-note').value = card.note || '';
  document.getElementById('ef-tip').value = card.tip || '';
}
function openCardEditor(idx) {
  const batch = getCurrentBatch(); if (!batch) return;
  editingIdx = idx;
  fillEditorForm(batch.cards[idx]);
  updateEditNav();
  document.getElementById('modalEdit').classList.add('show');
}
async function editNav(dir) {
  const batch = getCurrentBatch(); if (!batch) return;
  const newIdx = editingIdx + dir;
  if (newIdx < 0 || newIdx >= batch.cards.length) return;
  await saveCardEdit(true); // auto-save current before moving
  editingIdx = newIdx;
  fillEditorForm(batch.cards[editingIdx]);
  updateEditNav();
}
async function saveCardEdit(silent) {
  const batch = getCurrentBatch(); if (!batch || editingIdx < 0) return;
  const en = document.getElementById('ef-en').value.trim();
  const zh = document.getElementById('ef-zh').value.trim();
  if (!en || !zh) { if (!silent) alert('英文和中文为必填项'); return; }
  const updated = {
    en, zh,
    pos: document.getElementById('ef-pos').value.trim(),
    emoji: document.getElementById('ef-emoji').value.trim(),
    ex: document.getElementById('ef-ex').value.trim(),
    note: document.getElementById('ef-note').value.trim(),
    tip: document.getElementById('ef-tip').value.trim(),
  };
  Object.keys(updated).forEach(k => { if (!updated[k]) delete updated[k]; });
  batch.cards[editingIdx] = updated;
  await saveData(appData);
  if (!silent) { closeAllModals(); await loadDetail(); }
}
async function deleteCard() {
  const batch = getCurrentBatch(); if (!batch || editingIdx < 0) return;
  const card = batch.cards[editingIdx];
  if (!confirm(`确定删除单词「${card.en}」吗？`)) return;
  batch.cards.splice(editingIdx, 1);
  await saveData(appData);
  closeAllModals();
  await loadDetail();
}

// Sync (clear records)
function showSync() { document.getElementById('modalSync').classList.add('show'); }
async function confirmSync(user) {
  if (!confirm('确定清空' + (user==='sister'?'姐姐':'弟弟') + '的学习记录吗？')) return;
  await clearUserBatch(user, currentBatchId); closeAllModals();
  alert('已清空，下次' + (user==='sister'?'姐姐':'弟弟') + '打开时将从头开始。');
}

// Push
function showPush() {
  const batch = getCurrentBatch(); if (!batch) return;
  const sw = batch.sharedWith || [];
  const si = document.getElementById('pushSisterInd');
  const bi = document.getElementById('pushBrotherInd');
  si.textContent = sw.includes('sister') ? '✅ 已推送' : '未推送';
  si.className = 'push-indicator ' + (sw.includes('sister') ? 'on' : 'off');
  bi.textContent = sw.includes('brother') ? '✅ 已推送' : '未推送';
  bi.className = 'push-indicator ' + (sw.includes('brother') ? 'on' : 'off');
  document.getElementById('modalPush').classList.add('show');
}
async function togglePush(user) {
  const batch = getCurrentBatch(); if (!batch) return;
  if (!batch.sharedWith) batch.sharedWith = [];
  if (batch.sharedWith.includes(user)) {
    batch.sharedWith = batch.sharedWith.filter(u => u !== user);
  } else {
    batch.sharedWith.push(user);
  }
  await saveData(appData);
  const ind = document.getElementById(user==='sister' ? 'pushSisterInd' : 'pushBrotherInd');
  const on = batch.sharedWith.includes(user);
  ind.textContent = on ? '✅ 已推送' : '未推送';
  ind.className = 'push-indicator ' + (on ? 'on' : 'off');
  updatePushSubLabel();
}
function updatePushSubLabel() {
  const batch = getCurrentBatch(); if (!batch) return;
  const sw = batch.sharedWith || [];
  let label = '推送后学生才可见';
  if (sw.length > 0) {
    const parts = [];
    if (sw.includes('sister')) parts.push('👧姐姐');
    if (sw.includes('brother')) parts.push('👦弟弟');
    label = '已推送给 ' + parts.join('、');
  }
  document.getElementById('pushSubLabel').textContent = label;
}

// ══════════════════════════════════════

// DETAIL
// ══════════════════════════════════════
async function loadDetail() {
  const batch = getCurrentBatch(); if (!batch) return;
  currentUserRec = await loadUserBatch(currentBatchId);
  document.getElementById('editPanel').classList.remove('open');
  document.getElementById('editPanelToggle').classList.remove('active');
  document.getElementById('editPanel').style.display = isTeacher() ? '' : 'none';
  document.getElementById('editPanelToggle').style.display = isTeacher() ? '' : 'none';
  document.getElementById('detailTitle').classList.remove('tap-editable');
  document.getElementById('detailTitle').textContent = batch.name;
  document.getElementById('dStatTotal').textContent = batch.cards.length;
  document.getElementById('dStatKnown').textContent = currentUserRec.known.length;
  document.getElementById('dStatUnknown').textContent = currentUserRec.unknown.length;

  const dailyBtn = document.getElementById('btnDailyQuiz');
  if (dailyBtn) dailyBtn.disabled = batch.cards.length === 0;
  await updateDetailChallengeStatus(batch.id);

  updatePushSubLabel();

  const chipList = document.getElementById('wordChipList');
  chipList.innerHTML = '';
  chipList.classList.remove('collapsed');
  studentWordCards = batch.cards;
  batch.cards.forEach((card, idx) => {
    const chip = document.createElement('div');
    const cls = currentUserRec.known.includes(card.en) ? 'word-chip known'
               : currentUserRec.unknown.includes(card.en) ? 'word-chip unknown'
               : 'word-chip';
    chip.className = cls; chip.textContent = card.en;
    chip.addEventListener('click', () => openStudentWordCard(idx));
    chipList.appendChild(chip);
  });
}
async function goDetail() {
  if (studyIsGlobal || resultContext === 'merge-daily' || resultContext === 'global-daily') {
    studyIsGlobal = false;
    showScreen('screenHome'); loadHome();
    return;
  }
  currentUserRec = await loadUserBatch(currentBatchId); await loadDetail(); showScreen('screenDetail');
}

// ══════════════════════════════════════
