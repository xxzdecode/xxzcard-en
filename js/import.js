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
  const blocks = text.trim().split(/\n\s*\n/);
  const cards = [];
  blocks.forEach(block => {
    const lines = block.trim().split('\n');
    const card = {};
    lines.forEach(line => {
      const m = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (m) card[m[1].trim().toLowerCase()] = m[2].trim();
    });
    if (card.en && card.zh) cards.push(card);
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
  pendingCards = cards;
  preview.style.display = 'block';
  preview.innerHTML = `<p>✅ 解析到 ${cards.length} 个单词：<br><span style="color:#5A6A7A;font-size:12px">${cards.map(c=>c.en).join('、')}</span></p>`;
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
    batch.cards.push(...pendingCards); await saveData(appData);
    await loadDetail(); showScreen('screenDetail');
  }
}

// ══════════════════════════════════════
