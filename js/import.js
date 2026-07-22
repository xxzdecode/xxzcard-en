// NEW BATCH
// ══════════════════════════════════════
let importMode = 'new';
let pendingCards = [];
let importInProgress = false;

function setConfirmImportBusy(isBusy) {
  const btn = document.getElementById('confirmImportBtn');
  importInProgress = isBusy;
  if (!btn) return;
  if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent;
  btn.disabled = isBusy;
  btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  btn.textContent = isBusy ? '\u5bfc\u5165\u4e2d...' : btn.dataset.defaultText;
}

function showNewBatch() {
  if (!canWriteCloudData()) return;
  setConfirmImportBusy(false);
  importMode = 'new';
  document.getElementById('newBatchName').value = todayStr();
  document.getElementById('newBatchPurpose').value = 'common';
  document.getElementById('newBatchPurposeGroup').hidden = false;
  document.getElementById('newBatchText').value = '';
  document.getElementById('parsePreview').style.display = 'none';
  document.getElementById('parsePreview').innerHTML = '';
  document.getElementById('confirmImportBtn').style.display = 'none';
  pendingCards = [];
  showScreen('screenNewBatch');
}
function showImportMore() {
  if (!canWriteCloudData()) return;
  setConfirmImportBusy(false);
  importMode = 'add';
  document.getElementById('newBatchName').value = getCurrentBatch().name;
  document.getElementById('newBatchPurposeGroup').hidden = true;
  document.getElementById('newBatchText').value = '';
  document.getElementById('parsePreview').style.display = 'none';
  document.getElementById('confirmImportBtn').style.display = 'none';
  pendingCards = [];
  showScreen('screenNewBatch');
}

// ══════════════════════════════════════
// PARSE
// ══════════════════════════════════════
const IMPORT_CARD_FIELDS = [
  'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
  'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
];
const IMPORT_ARRAY_FIELDS = new Set(['morphology', 'collocations', 'irregularForms', 'synonyms', 'wordFamily']);
const LEGACY_IMPORT_FIELD_HELP = {
  en: 'en → word',
  zh: 'zh → meaning',
  ex: 'ex 没有一对一替代字段，请按当前 collocations 结构重新整理',
  note: 'note 没有一对一替代字段，请按内容重新判断所属字段'
};

function parseCards(text) {
  const trimmed = text.trim();
  if (!trimmed) return { cards: [], errors: ['请输入单词卡内容'] };
  if (/^[\[{]/.test(trimmed)) {
    return { cards: [], errors: ['不支持外层 JSON 数组、JSON 对象或 JSONL；请使用逐行 key: value 格式'] };
  }
  const blocks = trimmed.split(/\n\s*\n/);
  const cards = [];
  const errors = [];
  blocks.forEach((block, blockIndex) => {
    const lines = block.trim().split('\n');
    const rawCard = {};
    const keys = [];
    const cardLabel = `第 ${blockIndex + 1} 张卡`;
    lines.forEach((line, lineIndex) => {
      const m = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*:\s*(.*)$/);
      if (!m) {
        errors.push(`${cardLabel}第 ${lineIndex + 1} 行格式错误，应为 key: value`);
        return;
      }
      const key = m[1];
      if (Object.prototype.hasOwnProperty.call(rawCard, key)) {
        errors.push(`${cardLabel}字段 ${key} 重复`);
        return;
      }
      keys.push(key);
      rawCard[key] = m[2].trim();
    });

    const legacyFields = keys.filter(key => Object.prototype.hasOwnProperty.call(LEGACY_IMPORT_FIELD_HELP, key));
    if (legacyFields.length) {
      errors.push(`${cardLabel}包含不支持的旧字段：${legacyFields.join('、')}。${legacyFields.map(key => LEGACY_IMPORT_FIELD_HELP[key]).join('；')}`);
      return;
    }

    const unknownFields = keys.filter(key => !IMPORT_CARD_FIELDS.includes(key));
    if (unknownFields.length) {
      errors.push(`${cardLabel}包含不支持的字段：${unknownFields.join('、')}`);
      return;
    }

    if (keys.length !== IMPORT_CARD_FIELDS.length || keys.some((key, index) => key !== IMPORT_CARD_FIELDS[index])) {
      errors.push(`${cardLabel}字段必须完整并按固定顺序排列：${IMPORT_CARD_FIELDS.join(' → ')}`);
      return;
    }
    if (!rawCard.word || !rawCard.meaning) {
      errors.push(`${cardLabel}的 word 和 meaning 为必填字段`);
      return;
    }

    const card = {};
    let arrayError = false;
    IMPORT_CARD_FIELDS.forEach(field => {
      if (!IMPORT_ARRAY_FIELDS.has(field)) {
        card[field] = rawCard[field];
        return;
      }
      try {
        const value = JSON.parse(rawCard[field]);
        if (!Array.isArray(value)) throw new Error('not array');
        card[field] = value;
      } catch (e) {
        errors.push(`${cardLabel}的 ${field} 必须是单行合法 JSON 数组`);
        arrayError = true;
      }
    });
    if (!arrayError) cards.push(normalizeEnglishCard(card));
  });
  return errors.length ? { cards: [], errors } : { cards, errors: [] };
}
function previewParse() {
  const text = document.getElementById('newBatchText').value;
  const result = parseCards(text);
  const cards = result.cards;
  const preview = document.getElementById('parsePreview');
  const confirmBtn = document.getElementById('confirmImportBtn');
  pendingCards = [];
  if (result.errors.length || cards.length === 0) {
    preview.style.display = 'block';
    preview.innerHTML = `<p style="color:#F06060">❌ 导入格式不符合要求<br><span style="font-size:12px">${result.errors.map(escapeHtml).join('<br>')}</span></p>`;
    confirmBtn.style.display = 'none'; return;
  }
  const duplicates = findDuplicateCards(cards);
  pendingCards = cards;
  preview.style.display = 'block';
  preview.innerHTML = `<p>✅ 解析到 ${cards.length} 个单词：<br><span style="color:#5A6A7A;font-size:12px">${cards.map(c=>escapeHtml(getCardWord(c))).join('、')}</span>${duplicates.length ? `<br><span style="color:#F06060;font-size:12px">重复：${duplicates.map(escapeHtml).join('、')}</span>` : ''}</p>`;
  confirmBtn.style.display = 'block';
}
async function confirmImport() {
  if (importInProgress) return;
  if (pendingCards.length === 0) return;
  if (!canWriteCloudData()) return;
  if (importMode === 'new') {
    setConfirmImportBusy(true);
    const name = document.getElementById('newBatchName').value.trim() || todayStr();
    const purpose = document.getElementById('newBatchPurpose').value;
    const batch = makeBatch(name, pendingCards, purpose);
    appData.batches.push(batch);
    if (!await saveData(appData)) {
      appData.batches = appData.batches.filter(item => item.id !== batch.id);
      setConfirmImportBusy(false);
      return;
    }
    currentBatchId = batch.id; await loadDetail(); showScreen('screenDetail');
  } else {
    const batch = getCurrentBatch();
    const existing = new Set((batch.cards || []).map(c => getCardKey(c)));
    const duplicates = pendingCards.filter(c => existing.has(getCardKey(c))).map(c => getCardWord(c));
    if (duplicates.length && !confirm(`检测到重复单词：${duplicates.join('、')}。仍然导入吗？`)) return;
    setConfirmImportBusy(true);
    const addedCards = pendingCards.map(normalizeEnglishCard);
    batch.cards.push(...addedCards);
    if (!await saveData(appData)) {
      batch.cards.splice(batch.cards.length - addedCards.length, addedCards.length);
      setConfirmImportBusy(false);
      return;
    }
    await loadDetail(); showScreen('screenDetail');
  }
}

// ══════════════════════════════════════
