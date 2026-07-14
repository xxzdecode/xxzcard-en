// Rename
function showRename() {
  if (!canWriteCloudData()) return;
  const batch = getCurrentBatch(); if (!batch) return;
  document.getElementById('renameInput').value = batch.name;
  document.getElementById('modalRename').classList.add('show');
  setTimeout(() => document.getElementById('renameInput').focus(), 100);
}
async function confirmRename() {
  const val = document.getElementById('renameInput').value.trim(); if (!val) return;
  if (!canWriteCloudData()) return;
  const batch = getCurrentBatch(); batch.name = val;
  if (!await saveData(appData)) return;
  document.getElementById('detailTitle').textContent = val;
  closeAllModals();
  if (isTeacher()) refreshTeacherWordCards();
  else loadHome();
}

// ══════════════════════════════════════
// EDIT WORDS (teacher)
// ══════════════════════════════════════
function toggleEditPanel() {
  if (!canWriteCloudData()) return;
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
    normalizeCardDictionary(card);
    const item = document.createElement('div');
    item.className = 'ws-item';
    item.innerHTML = `<span>${getCardWord(card)}</span><span class="ws-zh">${getCardMeaning(card)}</span>`;
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
  normalizeCardDictionary(card);
  document.getElementById('ef-word').value = getCardWord(card);
  document.getElementById('ef-meaning').value = getCardMeaning(card);
  document.getElementById('ef-pos').value = card.pos || '';
  document.getElementById('ef-phonetic').value = card.phonetic || '';
  document.getElementById('ef-emoji').value = card.emoji || '';
  document.getElementById('ef-tip').value = card.tip || '';
  document.getElementById('ef-morphology').value = (card.morphology && card.morphology.length) ? JSON.stringify(card.morphology, null, 2) : '';
  document.getElementById('ef-synonyms').value = (card.synonyms && card.synonyms.length) ? JSON.stringify(card.synonyms, null, 2) : '';
  document.getElementById('ef-collocations').value = (card.collocations && card.collocations.length) ? JSON.stringify(card.collocations, null, 2) : '';
  document.getElementById('ef-irregularForms').value = (card.irregularForms && card.irregularForms.length) ? JSON.stringify(card.irregularForms, null, 2) : '';
  document.getElementById('ef-wordFamily').value = (card.wordFamily && card.wordFamily.length) ? JSON.stringify(card.wordFamily, null, 2) : '';
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
  if (!await saveCardEdit(true)) return; // auto-save current before moving
  editingIdx = newIdx;
  fillEditorForm(batch.cards[editingIdx]);
  updateEditNav();
}
async function saveCardEdit(silent) {
  const batch = getCurrentBatch(); if (!batch || editingIdx < 0) return;
  if (!canWriteCloudData()) return false;
  const word = document.getElementById('ef-word').value.trim();
  const meaning = document.getElementById('ef-meaning').value.trim();
  if (!word || !meaning) { if (!silent) alert('word 和 meaning 为必填项'); return; }
  const duplicate = batch.cards.some((card, idx) => idx !== editingIdx && getCardKey(card) === normalizeWord(word));
  if (duplicate && !silent && !confirm(`「${word}」已经在这个单词本里了。仍然保存吗？`)) return;
  let arrays;
  try {
    arrays = Object.fromEntries([
      ['morphology', '词根词缀'],
      ['collocations', '固定搭配'],
      ['irregularForms', '特殊形式'],
      ['synonyms', '同义词'],
      ['wordFamily', '词族']
    ].map(([field, label]) => {
      const raw = document.getElementById('ef-' + field).value.trim();
      const value = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(value)) throw new Error(label + '必须是 JSON 数组');
      return [field, value];
    }));
  } catch (e) {
    if (!silent) alert(e.message || '数组字段格式错误');
    return false;
  }
  const updated = {
    word,
    meaning,
    pos: document.getElementById('ef-pos').value.trim(),
    phonetic: document.getElementById('ef-phonetic').value.trim(),
    emoji: document.getElementById('ef-emoji').value.trim(),
    morphology: arrays.morphology,
    collocations: arrays.collocations,
    irregularForms: arrays.irregularForms,
    synonyms: arrays.synonyms,
    wordFamily: arrays.wordFamily,
    tip: document.getElementById('ef-tip').value.trim()
  };
  batch.cards[editingIdx] = updated;
  if (!await saveData(appData)) return false;
  if (!silent) { closeAllModals(); await loadDetail(); }
  return true;
}
async function deleteCard() {
  const batch = getCurrentBatch(); if (!batch || editingIdx < 0) return;
  if (!canWriteCloudData()) return;
  const card = batch.cards[editingIdx];
  if (!confirm(`确定删除单词「${getCardWord(card)}」吗？`)) return;
  batch.cards.splice(editingIdx, 1);
  if (!await saveData(appData)) return;
  closeAllModals();
  await loadDetail();
}

// Sync (clear records)
function showSync() { if (!canWriteCloudData()) return; document.getElementById('modalSync').classList.add('show'); }
async function confirmSync(user) {
  if (!canWriteCloudData()) return;
  if (!confirm('确定清空' + (user==='sister'?'姐姐':'弟弟') + '的学习记录吗？')) return;
  if (!await clearUserBatch(user, currentBatchId)) return;
  closeAllModals();
  alert('已清空，下次' + (user==='sister'?'姐姐':'弟弟') + '打开时将从头开始。');
}

// Push
function showPush() {
  if (!canWriteCloudData()) return;
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
  if (!canWriteCloudData()) return;
  if (!batch.sharedWith) batch.sharedWith = [];
  if (batch.sharedWith.includes(user)) {
    batch.sharedWith = batch.sharedWith.filter(u => u !== user);
  } else {
    batch.sharedWith.push(user);
  }
  if (!await saveData(appData)) return;
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
    normalizeCardDictionary(card);
    const word = getCardWord(card);
    const chip = document.createElement('div');
    const cls = currentUserRec.known.includes(word) ? 'word-chip known'
               : currentUserRec.unknown.includes(word) ? 'word-chip unknown'
               : 'word-chip';
    chip.className = cls; chip.textContent = word;
    chip.addEventListener('click', () => openBatchWordCard(idx));
    chipList.appendChild(chip);
  });
}
async function openBatchWordCard(idx) {
  const batch = getCurrentBatch(); if (!batch || !batch.cards[idx]) return;
  currentUserRec = await loadUserBatch(currentBatchId);
  studyIsGlobal = false;
  studyMode = 'dictionary';
  resultContext = '';
  studyDeck = [...batch.cards];
  studyCurrent = idx;
  studyFlipped = true;
  document.getElementById('modeLabel').textContent = '👀 查看单词';
  showScreen('screenStudy');
  renderStudyCard();
  setFlipped(true);
}
async function goDetail() {
  if (resultContext === 'word-card-page') {
    resultContext = '';
    openWordCards();
    return;
  }
  if (studyIsGlobal || resultContext === 'merge-daily' || resultContext === 'global-daily') {
    studyIsGlobal = false;
    showScreen('screenHome'); loadHome();
    return;
  }
  currentUserRec = await loadUserBatch(currentBatchId); await loadDetail(); showScreen('screenDetail');
}

// ══════════════════════════════════════
