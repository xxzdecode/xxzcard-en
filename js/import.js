// NEW BATCH
// ══════════════════════════════════════
let importMode = 'new';
let pendingCards = [];
let pendingImportPlan = null;
let pendingImportPackage = null;
let pendingGeneratedBatchId = '';
let importInProgress = false;
let referenceImportModulesPromise = null;

function ensureReferenceImportModules() {
  if (window.ReferenceWordbookImport && window.VocabularyJsonImport) return Promise.resolve();
  if (referenceImportModulesPromise) return referenceImportModulesPromise;
  if (typeof loadFeatureScript !== 'function') {
    return Promise.reject(new Error('动态功能加载器不可用'));
  }
  referenceImportModulesPromise = loadFeatureScript('js/referenceWordbookImport.js')
    .then(() => loadFeatureScript('js/vocabularyJsonImport.js'));
  return referenceImportModulesPromise;
}

function setConfirmImportBusy(isBusy) {
  const btn = document.getElementById('confirmImportBtn');
  importInProgress = isBusy;
  if (!btn) return;
  if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent;
  btn.disabled = isBusy;
  btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  btn.textContent = isBusy ? '导入中...' : btn.dataset.defaultText;
}

function resetPendingImport() {
  pendingCards = [];
  pendingImportPlan = null;
  pendingImportPackage = null;
  pendingGeneratedBatchId = '';
}

function setImportScreenDefaults() {
  document.getElementById('newBatchText').value = '';
  document.getElementById('parsePreview').style.display = 'none';
  document.getElementById('parsePreview').innerHTML = '';
  document.getElementById('confirmImportBtn').style.display = 'none';
  resetPendingImport();
}

async function showNewBatch() {
  if (!canWriteCloudData()) return;
  try { await ensureReferenceImportModules(); }
  catch (error) { alert(error && error.message ? error.message : '引用式导入器加载失败'); return; }
  setConfirmImportBusy(false);
  importMode = 'new';
  document.getElementById('newBatchName').value = todayStr();
  document.getElementById('newBatchPurpose').value = 'common';
  document.getElementById('newBatchPurposeGroup').hidden = false;
  setImportScreenDefaults();
  showScreen('screenNewBatch');
}

async function showImportMore() {
  if (!canWriteCloudData()) return;
  try { await ensureReferenceImportModules(); }
  catch (error) { alert(error && error.message ? error.message : '引用式导入器加载失败'); return; }
  setConfirmImportBusy(false);
  importMode = 'add';
  document.getElementById('newBatchName').value = getCurrentBatch().name;
  document.getElementById('newBatchPurposeGroup').hidden = true;
  setImportScreenDefaults();
  showScreen('screenNewBatch');
}

// ══════════════════════════════════════
// KEY:VALUE PARSE (manual input remains supported)
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
  const trimmed = String(text || '').trim();
  if (!trimmed) return { cards: [], errors: ['请输入单词卡内容'] };
  if (/^[\[{]/.test(trimmed)) {
    return { cards: [], errors: ['JSON 请使用 schemaVersion: 2 的引用式单词本导入包'] };
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
      const match = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*:\s*(.*)$/);
      if (!match) {
        errors.push(`${cardLabel}第 ${lineIndex + 1} 行格式错误，应为 key: value`);
        return;
      }
      const key = match[1];
      if (Object.prototype.hasOwnProperty.call(rawCard, key)) {
        errors.push(`${cardLabel}字段 ${key} 重复`);
        return;
      }
      keys.push(key);
      rawCard[key] = match[2].trim();
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
      } catch (error) {
        errors.push(`${cardLabel}的 ${field} 必须是单行合法 JSON 数组`);
        arrayError = true;
      }
    });
    if (!arrayError) cards.push(normalizeEnglishCard(card));
  });
  return errors.length ? { cards: [], errors } : { cards, errors: [] };
}

function applyImportPackageMeta(importPackage) {
  if (!importPackage || !importPackage.wordbook || importMode !== 'new') return;
  const nameInput = document.getElementById('newBatchName');
  const purposeInput = document.getElementById('newBatchPurpose');
  if (nameInput && importPackage.wordbook.name) nameInput.value = importPackage.wordbook.name;
  if (purposeInput && ['common', 'support'].includes(importPackage.wordbook.bookPurpose)) {
    purposeInput.value = importPackage.wordbook.bookPurpose;
  }
}

function parseImportInput(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { cards: [], errors: ['请输入单词卡内容'] };
  if (!/^[\[{]/.test(trimmed)) return parseCards(trimmed);
  if (!window.VocabularyJsonImport || typeof window.VocabularyJsonImport.parseReferenceImportJson !== 'function') {
    return { cards: [], errors: ['引用式 JSON 导入器尚未加载，请刷新页面后重试'] };
  }
  try {
    const importPackage = window.VocabularyJsonImport.parseReferenceImportJson(trimmed);
    applyImportPackageMeta(importPackage);
    return { cards: [], errors: [], importPackage };
  } catch (error) {
    return { cards: [], errors: [error && error.message ? error.message : 'JSON 导入失败'] };
  }
}

function generateImportBatchId() {
  return String(Date.now()) + String(Math.floor(Math.random() * 9999));
}

function currentImportWordbookMeta() {
  const current = importMode === 'add' ? getCurrentBatch() : null;
  return {
    id: current ? String(current.id) : (pendingGeneratedBatchId || generateImportBatchId()),
    name: document.getElementById('newBatchName').value.trim() || todayStr(),
    bookPurpose: importMode === 'add'
      ? getBookPurpose(current)
      : document.getElementById('newBatchPurpose').value
  };
}

function prepareImportPackage(parsedResult) {
  if (!window.ReferenceWordbookImport) throw new Error('引用式单词本导入核心尚未加载');
  if (parsedResult.importPackage) return parsedResult.importPackage;
  pendingGeneratedBatchId = pendingGeneratedBatchId || generateImportBatchId();
  return window.ReferenceWordbookImport.buildPackageFromCards(
    appData,
    parsedResult.cards,
    currentImportWordbookMeta()
  );
}

function auditPendingPackage(importPackage) {
  const targetBatchId = importMode === 'add' ? String(getCurrentBatch().id) : '';
  return window.ReferenceWordbookImport.auditReferenceImport(appData, importPackage, {
    targetBatchId,
    generatedBatchId: pendingGeneratedBatchId
  });
}

function previewWordList(items, getLabel) {
  if (!items.length) return '';
  return `<div style="margin-top:7px;font-size:12px;color:#5A6A7A">${items.map(item => escapeHtml(getLabel(item))).join('、')}</div>`;
}

function renderImportPlan(plan) {
  const sections = [];
  sections.push(`<p style="font-weight:800;color:#3F6F5F">✅ 引用式导入预览：${plan.summary.references} 个引用</p>`);
  sections.push(`<div style="font-size:12px;line-height:1.75;color:#5A6A7A">直接复用 ${plan.summary.directReuse} 个｜新建 ${plan.summary.create} 个｜补空 ${plan.summary.setIfEmpty} 项｜去重追加 ${plan.summary.appendUnique} 项｜冲突 ${plan.summary.conflicts} 项</div>`);

  if (plan.directReuse.length) {
    sections.push(`<div style="margin-top:10px;font-weight:700">直接复用</div>${previewWordList(plan.directReuse, item => item)}`);
  }
  if (plan.create.length) {
    sections.push(`<div style="margin-top:10px;font-weight:700">新建到总库</div>${previewWordList(plan.create, item => item.wordKey)}`);
  }
  if (plan.setIfEmpty.length) {
    sections.push(`<div style="margin-top:10px;font-weight:700">只补空字段</div>${previewWordList(plan.setIfEmpty, item => `${item.wordKey}.${item.field}`)}`);
  }
  if (plan.appendUnique.length) {
    sections.push(`<div style="margin-top:10px;font-weight:700">数组去重追加</div>${previewWordList(plan.appendUnique, item => `${item.wordKey}.${item.field}(+${item.values.length})`)}`);
  }
  if (plan.conflicts.length) {
    sections.push(`<div style="margin-top:10px;font-weight:800;color:#B05A43">⚠️ 非空字段冲突（不会自动覆盖）</div>${previewWordList(plan.conflicts, item => `${item.wordKey}.${item.field}`)}<div style="font-size:12px;color:#B05A43;margin-top:5px">确认导入时会再次要求人工确认；冲突字段将跳过，其余安全变更继续。</div>`);
  }
  if (plan.errors.length) {
    sections.push(`<div style="margin-top:10px;font-weight:800;color:#F06060">❌ 无法导入</div>${previewWordList(plan.errors, item => item)}`);
  }
  sections.push(`<div style="margin-top:10px;font-size:12px;color:#5A6A7A">单词本将只持久化 cardRefs，不保存完整卡片或分类字段。</div>`);
  return sections.join('');
}

function previewParse() {
  const text = document.getElementById('newBatchText').value;
  const result = parseImportInput(text);
  const preview = document.getElementById('parsePreview');
  const confirmBtn = document.getElementById('confirmImportBtn');
  resetPendingImport();
  preview.style.display = 'block';

  if (result.errors.length) {
    preview.innerHTML = `<p style="color:#F06060">❌ 导入格式不符合要求<br><span style="font-size:12px">${result.errors.map(escapeHtml).join('<br>')}</span></p>`;
    confirmBtn.style.display = 'none';
    return;
  }

  try {
    pendingCards = result.cards || [];
    pendingImportPackage = prepareImportPackage(result);
    pendingImportPlan = auditPendingPackage(pendingImportPackage);
    preview.innerHTML = renderImportPlan(pendingImportPlan);
    confirmBtn.style.display = pendingImportPlan.errors.length ? 'none' : 'block';
  } catch (error) {
    preview.innerHTML = `<p style="color:#F06060">❌ 无法生成导入计划<br><span style="font-size:12px">${escapeHtml(error && error.message ? error.message : '未知错误')}</span></p>`;
    confirmBtn.style.display = 'none';
  }
}

function refreshPackageMeta(importPackage) {
  const copy = cloneForStorage(importPackage);
  const meta = currentImportWordbookMeta();
  copy.wordbook.name = meta.name;
  copy.wordbook.bookPurpose = meta.bookPurpose;
  if (importMode === 'add') copy.wordbook.id = meta.id;
  return copy;
}

function importConflictMessage(conflicts) {
  const sample = conflicts.slice(0, 8).map(item => `${item.wordKey}.${item.field}`).join('、');
  const more = conflicts.length > 8 ? ` 等 ${conflicts.length} 项` : '';
  return `检测到非空字段冲突：${sample}${more}。\n\n这些字段不会被覆盖。是否确认跳过冲突，并继续导入其余安全内容？`;
}

async function confirmImport() {
  if (importInProgress || !pendingImportPackage || !canWriteCloudData()) return;

  const latestPackage = refreshPackageMeta(pendingImportPackage);
  const latestPlan = auditPendingPackage(latestPackage);
  if (latestPlan.errors.length) {
    alert(`导入条件已变化，请重新预览：\n${latestPlan.errors.join('\n')}`);
    return;
  }
  if (latestPlan.conflicts.length && !confirm(importConflictMessage(latestPlan.conflicts))) return;

  setConfirmImportBusy(true);
  try {
    const working = cloneForStorage(appData);
    const result = window.ReferenceWordbookImport.applyReferenceImport(working, latestPlan, {
      confirmConflicts: latestPlan.conflicts.length > 0,
      mergeRefs: importMode === 'add',
      date: batchTodayISO()
    });
    if (!await saveData(working)) return;
    appData = working;
    currentBatchId = result.batch.id;
    await loadDetail();
    showScreen('screenDetail');
  } catch (error) {
    console.error(error);
    alert(error && error.message ? error.message : '导入失败，请重新预览后再试。');
  } finally {
    setConfirmImportBusy(false);
  }
}

// ══════════════════════════════════════
