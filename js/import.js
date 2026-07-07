// NEW BATCH
// ══════════════════════════════════════
let importMode = 'new';
let pendingCards = [];

function showNewBatch() {
  importMode = 'new';
  document.getElementById('newBatchName').value = todayStr();
  document.getElementById('newBatchText').value = '';
  document.getElementById('parsePreview').style.display = 'none';
  document.getElementById('parsePreview').innerHTML = '';
  document.getElementById('confirmImportBtn').style.display = 'none';
  pendingCards = [];
  showScreen('screenNewBatch');
}
function showImportMore() {
  importMode = 'add';
  document.getElementById('newBatchName').value = getCurrentBatch().name;
  document.getElementById('newBatchText').value = '';
  document.getElementById('parsePreview').style.display = 'none';
  document.getElementById('confirmImportBtn').style.display = 'none';
  pendingCards = [];
  showScreen('screenNewBatch');
}

// ══════════════════════════════════════
// PARSE
// ══════════════════════════════════════
function parseCards(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parsed = parseJsonField(trimmed, null);
  if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) {
    const rawCards = Array.isArray(parsed) ? parsed : [parsed];
    return rawCards
      .filter(card => card && typeof card === 'object')
      .map(card => normalizeEnglishCard(card))
      .filter(card => getCardWord(card) && getCardMeaning(card));
  }
  const blocks = trimmed.split(/\n\s*\n/);
  const cards = [];
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    const card = {};
    lines.forEach(line => {
      const m = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (m) card[m[1].trim().toLowerCase()] = m[2].trim();
    });
    const normalized = normalizeEnglishCard(card);
    if (getCardWord(normalized) && getCardMeaning(normalized)) cards.push(normalized);
  });
  return cards;
}
function previewParse() {
  const text = document.getElementById('newBatchText').value;
  const cards = parseCards(text);
  const preview = document.getElementById('parsePreview');
  const confirmBtn = document.getElementById('confirmImportBtn');
  if (cards.length === 0) {
    preview.style.display = 'block';
    preview.innerHTML = '<p style="color:#F06060">❌ 没有解析到单词，请检查格式</p>';
    confirmBtn.style.display = 'none'; return;
  }
  const duplicates = findDuplicateCards(cards);
  pendingCards = cards;
  preview.style.display = 'block';
  preview.innerHTML = `<p>✅ 解析到 ${cards.length} 个单词：<br><span style="color:#5A6A7A;font-size:12px">${cards.map(c=>escapeHtml(getCardWord(c))).join('、')}</span>${duplicates.length ? `<br><span style="color:#F06060;font-size:12px">重复：${duplicates.map(escapeHtml).join('、')}</span>` : ''}</p>`;
  confirmBtn.style.display = 'block';
}
async function confirmImport() {
  if (pendingCards.length === 0) return;
  if (importMode === 'new') {
    const name = document.getElementById('newBatchName').value.trim() || todayStr();
    const batch = makeBatch(name, pendingCards);
    appData.batches.push(batch); await saveData(appData);
    currentBatchId = batch.id; await loadDetail(); showScreen('screenDetail');
  } else {
    const batch = getCurrentBatch();
    const existing = new Set((batch.cards || []).map(c => getCardKey(c)));
    const duplicates = pendingCards.filter(c => existing.has(getCardKey(c))).map(c => getCardWord(c));
    if (duplicates.length && !confirm(`检测到重复单词：${duplicates.join('、')}。仍然导入吗？`)) return;
    batch.cards.push(...pendingCards.map(normalizeEnglishCard)); await saveData(appData);
    await loadDetail(); showScreen('screenDetail');
  }
}

// ══════════════════════════════════════
