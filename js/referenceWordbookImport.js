(function attachReferenceWordbookImport(root, factory) {
  const masterLibrary = typeof module !== 'undefined' && module.exports
    ? require('./masterVocabularyLibrary.js')
    : root && root.MasterVocabularyLibrary;
  const api = factory(masterLibrary);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ReferenceWordbookImport = api;
})(typeof window !== 'undefined' ? window : null, function createReferenceWordbookImport(masterLibrary) {
  'use strict';

  const CARD_FIELDS = Object.freeze((masterLibrary && masterLibrary.CARD_FIELDS) || [
    'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
    'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
  ]);
  const ARRAY_FIELDS = new Set(['morphology', 'collocations', 'irregularForms', 'synonyms', 'wordFamily']);
  const STRING_FIELDS = new Set(['word', 'meaning', 'pos', 'phonetic', 'emoji', 'tip']);
  const SCHOOL_NAME_PATTERN = /^\s*校内(?:词汇)?\s*[｜|]\s*(四年级|4年级|七年级|7年级)\s*[｜|]\s*(\d{4}-\d{2}-\d{2})\s*$/;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeWordKey(value) {
    if (masterLibrary && typeof masterLibrary.normalizeWordKey === 'function') {
      return masterLibrary.normalizeWordKey(value);
    }
    return String(value || '').trim().toLocaleLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
  }

  function normalizeSchoolGrade(value) {
    const grade = String(value || '').trim().toLocaleLowerCase();
    if (grade === '4' || grade === '4年级' || grade === '四年级' || grade === 'grade 4') return '4';
    if (grade === '7' || grade === '7年级' || grade === '七年级' || grade === 'grade 7') return '7';
    return '';
  }

  function normalizeISODate(value) {
    const text = String(value || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return '';
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1])
      && date.getMonth() === Number(match[2]) - 1
      && date.getDate() === Number(match[3]) ? text : '';
  }

  function inferGuideSectionFromName(name) {
    const match = SCHOOL_NAME_PATTERN.exec(String(name || '').trim());
    if (!match) return null;
    const grade = normalizeSchoolGrade(match[1]);
    const date = normalizeISODate(match[2]);
    return grade && date ? { kind: 'school', grade, date } : null;
  }

  function normalizeGuideSection(value, name) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const kind = String(source.kind || source.type || '').trim().toLocaleLowerCase();
    const grade = normalizeSchoolGrade(source.grade);
    const date = normalizeISODate(source.date);
    if (kind === 'school' && grade && date) return { kind: 'school', grade, date };
    return inferGuideSectionFromName(name);
  }

  function normalizeCardShape(card) {
    if (masterLibrary && typeof masterLibrary.normalizeCardShape === 'function') {
      return masterLibrary.normalizeCardShape(card);
    }
    const source = card && typeof card === 'object' ? card : {};
    const result = {};
    CARD_FIELDS.forEach(field => {
      result[field] = ARRAY_FIELDS.has(field)
        ? clone(Array.isArray(source[field]) ? source[field] : [])
        : String(source[field] || '').trim();
    });
    return result;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  function valuesEqual(left, right) {
    return stableStringify(left) === stableStringify(right);
  }

  function emptyValue(field, value) {
    if (ARRAY_FIELDS.has(field)) return !Array.isArray(value) || value.length === 0;
    return !String(value || '').trim();
  }

  function normalizeFieldValue(field, value) {
    if (ARRAY_FIELDS.has(field)) return clone(Array.isArray(value) ? value : []);
    return String(value || '').trim();
  }

  function normalizeRef(ref) {
    const wordKey = normalizeWordKey(typeof ref === 'string' ? ref : ref && (ref.wordKey || ref.word));
    if (!wordKey) return null;
    const result = { wordKey };
    if (ref && typeof ref === 'object' && ref.overrides && typeof ref.overrides === 'object') {
      const overrides = {};
      CARD_FIELDS.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(ref.overrides, field)) {
          overrides[field] = clone(ref.overrides[field]);
        }
      });
      if (Object.keys(overrides).length) result.overrides = overrides;
    }
    return result;
  }

  function normalizePatchOperations(operations) {
    return (Array.isArray(operations) ? operations : []).map(operation => ({
      wordKey: normalizeWordKey(operation && operation.wordKey),
      fields: clone(operation && operation.fields && typeof operation.fields === 'object' ? operation.fields : {})
    })).filter(operation => operation.wordKey);
  }

  function normalizeCategoryAssignment(value) {
    const source = value && typeof value === 'object' ? value : {};
    const categoryId = String(source.categoryId || source.id || '').trim();
    if (!categoryId) return null;
    const words = [];
    const seen = new Set();
    (Array.isArray(source.words) ? source.words : []).forEach(word => {
      const wordKey = normalizeWordKey(word);
      if (!wordKey || seen.has(wordKey)) return;
      seen.add(wordKey);
      words.push(wordKey);
    });
    if (!words.length) return null;
    return {
      categoryId,
      categoryName: String(source.categoryName || source.name || categoryId).trim() || categoryId,
      groupId: String(source.groupId || 'generated').trim() || 'generated',
      groupName: String(source.groupName || '自动分类').trim() || '自动分类',
      groupDescription: String(source.groupDescription || '').trim(),
      icon: String(source.icon || '📚').trim() || '📚',
      words
    };
  }

  function normalizeCategoryAssignments(values) {
    const byCategory = new Map();
    (Array.isArray(values) ? values : []).forEach(value => {
      const normalized = normalizeCategoryAssignment(value);
      if (!normalized) return;
      const existing = byCategory.get(normalized.categoryId);
      if (!existing) {
        byCategory.set(normalized.categoryId, normalized);
        return;
      }
      const seen = new Set(existing.words);
      normalized.words.forEach(word => {
        if (seen.has(word)) return;
        seen.add(word);
        existing.words.push(word);
      });
      if ((!existing.categoryName || existing.categoryName === existing.categoryId) && normalized.categoryName) {
        existing.categoryName = normalized.categoryName;
      }
      if ((!existing.groupName || existing.groupName === '自动分类') && normalized.groupName) {
        existing.groupName = normalized.groupName;
      }
      if (!existing.groupDescription && normalized.groupDescription) existing.groupDescription = normalized.groupDescription;
      if ((!existing.icon || existing.icon === '📚') && normalized.icon) existing.icon = normalized.icon;
    });
    return Array.from(byCategory.values());
  }

  function normalizePackage(input) {
    const source = input && typeof input === 'object' ? input : {};
    const wordbook = source.wordbook && typeof source.wordbook === 'object' ? source.wordbook : {};
    const patch = source.masterPatch && typeof source.masterPatch === 'object' ? source.masterPatch : {};
    const seenRefs = new Set();
    const cardRefs = [];
    (Array.isArray(wordbook.cardRefs) ? wordbook.cardRefs : []).forEach(ref => {
      const normalized = normalizeRef(ref);
      if (!normalized || seenRefs.has(normalized.wordKey)) return;
      seenRefs.add(normalized.wordKey);
      cardRefs.push(normalized);
    });
    const normalizedWordbook = {
      id: String(wordbook.id || '').trim(),
      name: String(wordbook.name || '').trim(),
      bookPurpose: wordbook.bookPurpose === 'support' ? 'support' : 'common',
      description: String(wordbook.description || '').trim(),
      cardRefs
    };
    const guideSection = normalizeGuideSection(wordbook.guideSection, normalizedWordbook.name);
    if (guideSection) normalizedWordbook.guideSection = guideSection;
    if (Object.prototype.hasOwnProperty.call(wordbook, 'categoryAssignments')) {
      normalizedWordbook.categoryAssignments = normalizeCategoryAssignments(wordbook.categoryAssignments);
    }
    return {
      schemaVersion: 2,
      wordbook: normalizedWordbook,
      masterPatch: {
        create: (Array.isArray(patch.create) ? patch.create : []).map(normalizeCardShape),
        setIfEmpty: normalizePatchOperations(patch.setIfEmpty),
        appendUnique: normalizePatchOperations(patch.appendUnique)
      }
    };
  }

  function ensureMasterShape(data) {
    if (!data || typeof data !== 'object') throw new Error('应用数据不可用');
    if (masterLibrary && typeof masterLibrary.normalizeAppData === 'function') {
      masterLibrary.normalizeAppData(data);
    } else {
      if (!Array.isArray(data.batches)) data.batches = [];
      if (!data.masterCards || typeof data.masterCards !== 'object') data.masterCards = {};
    }
    return data;
  }

  function makeConflict(wordKey, operation, field, existing, incoming, reason) {
    return {
      wordKey,
      operation,
      field,
      existing: clone(existing),
      incoming: clone(incoming),
      reason
    };
  }

  function auditReferenceImport(data, inputPackage, options) {
    const opts = options || {};
    const sourceData = ensureMasterShape(clone(data || {}));
    const importPackage = normalizePackage(inputPackage);
    const previewMaster = clone(sourceData.masterCards || {});
    const originalMaster = sourceData.masterCards || {};
    const errors = [];
    const conflicts = [];
    const create = [];
    const setIfEmpty = [];
    const appendUnique = [];
    const touchedKeys = new Set();
    const redundantCreates = [];

    importPackage.masterPatch.create.forEach(card => {
      const wordKey = normalizeWordKey(card.word);
      if (!wordKey || !card.word || !card.meaning) {
        errors.push('masterPatch.create 中存在缺少 word 或 meaning 的卡片');
        return;
      }
      const existing = previewMaster[wordKey];
      if (!existing) {
        const normalized = normalizeCardShape(card);
        previewMaster[wordKey] = normalized;
        create.push({ wordKey, card: normalized });
        touchedKeys.add(wordKey);
        return;
      }
      if (valuesEqual(normalizeCardShape(existing), normalizeCardShape(card))) {
        redundantCreates.push(wordKey);
        return;
      }
      conflicts.push(makeConflict(wordKey, 'create', 'card', normalizeCardShape(existing), normalizeCardShape(card), 'word-exists'));
    });

    importPackage.masterPatch.setIfEmpty.forEach(operation => {
      const target = previewMaster[operation.wordKey];
      if (!target) {
        errors.push(`setIfEmpty 引用了总库不存在的词：${operation.wordKey}`);
        return;
      }
      Object.entries(operation.fields || {}).forEach(([field, rawIncoming]) => {
        if (!CARD_FIELDS.includes(field) || field === 'word') {
          errors.push(`setIfEmpty 不支持字段：${operation.wordKey}.${field}`);
          return;
        }
        const incoming = normalizeFieldValue(field, rawIncoming);
        if (emptyValue(field, incoming)) return;
        const existing = normalizeFieldValue(field, target[field]);
        if (emptyValue(field, existing)) {
          target[field] = clone(incoming);
          setIfEmpty.push({ wordKey: operation.wordKey, field, value: clone(incoming) });
          touchedKeys.add(operation.wordKey);
          return;
        }
        if (!valuesEqual(existing, incoming)) {
          conflicts.push(makeConflict(operation.wordKey, 'setIfEmpty', field, existing, incoming, 'non-empty-field'));
        }
      });
    });

    importPackage.masterPatch.appendUnique.forEach(operation => {
      const target = previewMaster[operation.wordKey];
      if (!target) {
        errors.push(`appendUnique 引用了总库不存在的词：${operation.wordKey}`);
        return;
      }
      Object.entries(operation.fields || {}).forEach(([field, rawIncoming]) => {
        if (!ARRAY_FIELDS.has(field)) {
          errors.push(`appendUnique 只支持数组字段：${operation.wordKey}.${field}`);
          return;
        }
        const current = Array.isArray(target[field]) ? target[field] : [];
        const incoming = Array.isArray(rawIncoming) ? rawIncoming : [];
        const seen = new Set(current.map(stableStringify));
        const additions = incoming.filter(item => {
          const signature = stableStringify(item);
          if (seen.has(signature)) return false;
          seen.add(signature);
          return true;
        }).map(clone);
        if (!additions.length) return;
        target[field] = current.concat(additions);
        appendUnique.push({ wordKey: operation.wordKey, field, values: additions });
        touchedKeys.add(operation.wordKey);
      });
    });

    const refs = [];
    const seenRefs = new Set();
    importPackage.wordbook.cardRefs.forEach(ref => {
      if (seenRefs.has(ref.wordKey)) return;
      seenRefs.add(ref.wordKey);
      if (!previewMaster[ref.wordKey]) {
        errors.push(`单词本引用了总库不存在且本次未创建的词：${ref.wordKey}`);
        return;
      }
      refs.push(clone(ref));
    });
    if (!refs.length) errors.push('单词本至少需要一个有效 cardRefs 引用');

    const targetBatchId = String(opts.targetBatchId || importPackage.wordbook.id || opts.generatedBatchId || '').trim();
    if (!targetBatchId) errors.push('引用式单词本缺少稳定 id');
    const existingBatch = (sourceData.batches || []).find(batch => String(batch.id) === targetBatchId) || null;
    const directReuse = refs
      .map(ref => ref.wordKey)
      .filter(wordKey => Object.prototype.hasOwnProperty.call(originalMaster, wordKey) && !touchedKeys.has(wordKey));

    return {
      importPackage,
      targetBatchId,
      targetAction: existingBatch ? 'update' : 'create',
      targetBatchName: importPackage.wordbook.name,
      refs,
      create,
      setIfEmpty,
      appendUnique,
      conflicts,
      errors,
      directReuse,
      redundantCreates,
      summary: {
        references: refs.length,
        directReuse: directReuse.length,
        create: create.length,
        setIfEmpty: setIfEmpty.length,
        appendUnique: appendUnique.reduce((count, item) => count + item.values.length, 0),
        conflicts: conflicts.length,
        errors: errors.length
      }
    };
  }

  function applyReferenceImport(data, audit, options) {
    const opts = options || {};
    if (!audit || !audit.importPackage) throw new Error('导入计划不可用');
    if (audit.errors && audit.errors.length) {
      const error = new Error(audit.errors.join('\n'));
      error.code = 'REFERENCE_IMPORT_INVALID';
      throw error;
    }
    if (audit.conflicts && audit.conflicts.length && !opts.confirmConflicts) {
      const error = new Error('存在非空字段冲突，需要人工确认后才能继续');
      error.code = 'REFERENCE_IMPORT_CONFLICT_CONFIRMATION_REQUIRED';
      throw error;
    }

    ensureMasterShape(data);
    audit.create.forEach(item => {
      const existing = data.masterCards[item.wordKey];
      if (!existing) data.masterCards[item.wordKey] = clone(item.card);
      else if (!valuesEqual(normalizeCardShape(existing), normalizeCardShape(item.card))) {
        const error = new Error(`总库词条在预览后发生变化：${item.wordKey}`);
        error.code = 'REFERENCE_IMPORT_STALE';
        throw error;
      }
    });

    audit.setIfEmpty.forEach(item => {
      const card = data.masterCards[item.wordKey];
      if (!card) throw new Error(`总库词条不存在：${item.wordKey}`);
      const existing = normalizeFieldValue(item.field, card[item.field]);
      if (emptyValue(item.field, existing)) card[item.field] = clone(item.value);
      else if (!valuesEqual(existing, item.value)) {
        const error = new Error(`总库字段在预览后发生变化：${item.wordKey}.${item.field}`);
        error.code = 'REFERENCE_IMPORT_STALE';
        throw error;
      }
    });

    audit.appendUnique.forEach(item => {
      const card = data.masterCards[item.wordKey];
      if (!card) throw new Error(`总库词条不存在：${item.wordKey}`);
      const current = Array.isArray(card[item.field]) ? card[item.field] : [];
      const seen = new Set(current.map(stableStringify));
      item.values.forEach(value => {
        const signature = stableStringify(value);
        if (seen.has(signature)) return;
        seen.add(signature);
        current.push(clone(value));
      });
      card[item.field] = current;
    });

    const wordbook = audit.importPackage.wordbook;
    let batch = (data.batches || []).find(item => String(item.id) === String(audit.targetBatchId));
    if (!batch) {
      batch = {
        id: audit.targetBatchId,
        date: String(opts.date || '').trim(),
        name: wordbook.name,
        sharedWith: [],
        bookPurpose: wordbook.bookPurpose,
        bookType: 'reference',
        cardRefs: []
      };
      data.batches.push(batch);
    }

    if (wordbook.name) batch.name = wordbook.name;
    batch.bookPurpose = wordbook.bookPurpose;
    batch.bookType = 'reference';
    if (!Array.isArray(batch.sharedWith)) batch.sharedWith = [];
    if (wordbook.description) batch.description = wordbook.description;
    const guideSection = normalizeGuideSection(wordbook.guideSection, batch.name);
    if (guideSection) batch.guideSection = clone(guideSection);
    if (Object.prototype.hasOwnProperty.call(wordbook, 'categoryAssignments')) {
      batch.categoryAssignments = clone(wordbook.categoryAssignments);
    }

    const nextRefs = opts.mergeRefs
      ? (Array.isArray(batch.cardRefs) ? batch.cardRefs : []).concat(audit.refs)
      : audit.refs;
    const seen = new Set();
    batch.cardRefs = nextRefs.map(normalizeRef).filter(ref => {
      if (!ref || seen.has(ref.wordKey)) return false;
      seen.add(ref.wordKey);
      return true;
    });
    try { delete batch.cards; } catch (_) {}

    ensureMasterShape(data);
    return {
      batch,
      createdCards: audit.create.length,
      filledFields: audit.setIfEmpty.length,
      appendedItems: audit.summary.appendUnique,
      skippedConflicts: audit.conflicts.length,
      references: batch.cardRefs.length,
      categoryAssignments: Array.isArray(batch.categoryAssignments) ? batch.categoryAssignments.length : 0
    };
  }

  function buildPackageFromCards(data, cards, wordbook) {
    const sourceData = ensureMasterShape(clone(data || {}));
    const create = [];
    const setIfEmpty = [];
    const appendUnique = [];
    const refs = [];
    const seen = new Set();

    (Array.isArray(cards) ? cards : []).forEach(rawCard => {
      const card = normalizeCardShape(rawCard);
      const wordKey = normalizeWordKey(card.word);
      if (!wordKey || !card.word || !card.meaning || seen.has(wordKey)) return;
      seen.add(wordKey);
      refs.push({ wordKey });
      const existing = sourceData.masterCards[wordKey];
      if (!existing) {
        create.push(card);
        return;
      }
      const emptyFields = {};
      const arrayFields = {};
      STRING_FIELDS.forEach(field => {
        if (field === 'word') return;
        const value = normalizeFieldValue(field, card[field]);
        if (emptyValue(field, value)) return;
        emptyFields[field] = value;
      });
      ARRAY_FIELDS.forEach(field => {
        const value = normalizeFieldValue(field, card[field]);
        if (!emptyValue(field, value)) arrayFields[field] = value;
      });
      if (Object.keys(emptyFields).length) setIfEmpty.push({ wordKey, fields: emptyFields });
      if (Object.keys(arrayFields).length) appendUnique.push({ wordKey, fields: arrayFields });
    });

    const wordbookInput = {
      id: wordbook && wordbook.id,
      name: wordbook && wordbook.name,
      bookPurpose: wordbook && wordbook.bookPurpose,
      description: wordbook && wordbook.description,
      guideSection: wordbook && wordbook.guideSection,
      cardRefs: refs
    };
    if (wordbook && Object.prototype.hasOwnProperty.call(wordbook, 'categoryAssignments')) {
      wordbookInput.categoryAssignments = wordbook.categoryAssignments;
    }

    return normalizePackage({
      schemaVersion: 2,
      wordbook: wordbookInput,
      masterPatch: { create, setIfEmpty, appendUnique }
    });
  }

  return {
    CARD_FIELDS,
    ARRAY_FIELDS,
    normalizePackage,
    inferGuideSectionFromName,
    normalizeGuideSection,
    normalizeCategoryAssignments,
    auditReferenceImport,
    applyReferenceImport,
    buildPackageFromCards,
    stableStringify
  };
});
