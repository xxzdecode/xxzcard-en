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
  document.getElementById('ef-en').value = getCardWord(card);
  document.getElementById('ef-zh').value = getCardMeaning(card);
  document.getElementById('ef-pos').value = card.pos || '';
  document.getElementById('ef-phonetic').value = card.phonetic || '';
  document.getElementById('ef-emoji').value = card.emoji || '';
  document.getElementById('ef-ex').value = card.ex || '';
  document.getElementById('ef-note').value = card.note || '';
  document.getElementById('ef-tip').value = card.tip || '';
  document.getElementById('ef-morphology').value = (card.morphology && card.morphology.length) ? JSON.stringify(card.morphology, null, 2) : '';
  document.getElementById('ef-synonyms').value = (card.synonyms || []).some(x => typeof x === 'object')
    ? JSON.stringify(card.synonyms, null, 2)
    : (card.synonyms || []).join('; ');
  document.getElementById('ef-collocations').value = (card.collocations || []).map(c => `${c.phrase || ''}${c.example ? '|' + c.example : ''}`).join('\n');
  document.getElementById('ef-examples').value = (card.examples || []).join('\n');
  document.getElementById('ef-irregularForms').value = (card.irregularForms && card.irregularForms.length) ? JSON.stringify(card.irregularForms, null, 2) : '';
  document.getElementById('ef-wordFamily').value = (card.wordFamily && card.wordFamily.length) ? JSON.stringify(card.wordFamily, null, 2) : '';
  document.getElementById('ef-phonemes').value = (card.phonemes || []).join('; ');
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
  const duplicate = batch.cards.some((card, idx) => idx !== editingIdx && getCardKey(card) === normalizeWord(en));
  if (duplicate && !silent && !confirm(`「${en}」已经在这个单词本里了。仍然保存吗？`)) return;
  const updated = {
    en, zh,
    word: en,
    meaning: zh,
    pos: document.getElementById('ef-pos').value.trim(),
    phonetic: document.getElementById('ef-phonetic').value.trim(),
    emoji: document.getElementById('ef-emoji').value.trim(),
    ex: document.getElementById('ef-ex').value.trim(),
    note: document.getElementById('ef-note').value.trim(),
    tip: document.getElementById('ef-tip').value.trim(),
    morphology: parseJsonField(document.getElementById('ef-morphology').value.trim(), []),
    synonyms: parseListField(document.getElementById('ef-synonyms').value.trim()),
    collocations: parsePairsField(document.getElementById('ef-collocations').value.trim()),
    examples: parseListField(document.getElementById('ef-examples').value.trim()),
    irregularForms: parseJsonField(document.getElementById('ef-irregularForms').value.trim(), []),
    wordFamily: parseWordFamilyField(document.getElementById('ef-wordFamily').value.trim()),
    phonemes: parsePhonemeField(document.getElementById('ef-phonemes').value.trim()),
  };
  Object.keys(updated).forEach(k => {
    if (Array.isArray(updated[k]) && updated[k].length === 0) delete updated[k];
    else if (!updated[k]) delete updated[k];
  });
  batch.cards[editingIdx] = updated;
  await saveData(appData);
  if (!silent) { closeAllModals(); await loadDetail(); }
}
async function deleteCard() {
  const batch = getCurrentBatch(); if (!batch || editingIdx < 0) return;
  const card = batch.cards[editingIdx];
  if (!confirm(`确定删除单词「${getCardWord(card)}」吗？`)) return;
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
