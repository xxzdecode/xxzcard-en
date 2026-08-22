(function attachVocabularyJsonImport(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VocabularyJsonImport = api;
})(typeof window !== 'undefined' ? window : null, function createVocabularyJsonImport() {
  'use strict';

  const CARD_FIELDS = Object.freeze([
    'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
    'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
  ]);
  const ARRAY_FIELDS = new Set(['morphology', 'collocations', 'irregularForms', 'synonyms', 'wordFamily']);
  const CATEGORY_KEYS = new Set(['category', 'categories', 'categoryId', 'categoryName']);
  const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'wordbook', 'masterPatch']);
  const WORDBOOK_KEYS = new Set(['id', 'name', 'bookType', 'bookPurpose', 'purpose', 'description', 'guideSection', 'cardRefs']);
  const GUIDE_SECTION_KEYS = new Set(['kind', 'grade', 'date']);
  const REF_KEYS = new Set(['wordKey', 'overrides']);
  const PATCH_KEYS = new Set(['create', 'setIfEmpty', 'appendUnique']);
  const OPERATION_KEYS = new Set(['wordKey', 'fields']);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function assertPlainObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label}必须是 JSON 对象`);
    }
  }

  function rejectUnknownKeys(value, allowed, label) {
    const unknown = Object.keys(value).filter(key => !allowed.has(key));
    if (!unknown.length) return;
    const categoryKeys = unknown.filter(key => CATEGORY_KEYS.has(key));
    if (categoryKeys.length) {
      throw new Error(`${label}不得包含分类字段：${categoryKeys.join('、')}。分类关系请在 data/vocabularyCategories.json 中独立维护`);
    }
    throw new Error(`${label}包含不支持的字段：${unknown.join('、')}`);
  }

  function normalizeString(value) {
    return value == null ? '' : String(value).trim();
  }

  function normalizeGuideSection(rawValue) {
    if (rawValue == null) return null;
    assertPlainObject(rawValue, 'wordbook.guideSection');
    rejectUnknownKeys(rawValue, GUIDE_SECTION_KEYS, 'wordbook.guideSection');
    const kind = normalizeString(rawValue.kind).toLocaleLowerCase();
    const grade = normalizeString(rawValue.grade);
    const date = normalizeString(rawValue.date);
    if (kind !== 'school') throw new Error('wordbook.guideSection.kind 只能是 school');
    if (!['4', '7'].includes(grade)) throw new Error('wordbook.guideSection.grade 只能是 4 或 7');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('wordbook.guideSection.date 必须是 YYYY-MM-DD');
    }
    return { kind, grade, date };
  }

  function normalizeCard(rawCard, label) {
    assertPlainObject(rawCard, label);
    rejectUnknownKeys(rawCard, new Set(CARD_FIELDS), label);
    const missing = CARD_FIELDS.filter(field => !Object.prototype.hasOwnProperty.call(rawCard, field));
    if (missing.length) throw new Error(`${label}缺少字段：${missing.join('、')}`);
    const card = {};
    CARD_FIELDS.forEach(field => {
      const value = rawCard[field];
      if (ARRAY_FIELDS.has(field)) {
        if (!Array.isArray(value)) throw new Error(`${label}.${field} 必须是 JSON 数组`);
        card[field] = clone(value);
      } else {
        card[field] = normalizeString(value);
      }
    });
    if (!card.word || !card.meaning) throw new Error(`${label}的 word 和 meaning 为必填字段`);
    return card;
  }

  function normalizeOverrides(rawOverrides, label) {
    assertPlainObject(rawOverrides, label);
    rejectUnknownKeys(rawOverrides, new Set(CARD_FIELDS), label);
    const overrides = {};
    Object.entries(rawOverrides).forEach(([field, value]) => {
      if (ARRAY_FIELDS.has(field)) {
        if (!Array.isArray(value)) throw new Error(`${label}.${field} 必须是 JSON 数组`);
        overrides[field] = clone(value);
      } else {
        overrides[field] = normalizeString(value);
      }
    });
    return overrides;
  }

  function normalizeRef(rawRef, index) {
    const label = `wordbook.cardRefs[${index}]`;
    if (typeof rawRef === 'string') {
      const wordKey = normalizeString(rawRef).toLocaleLowerCase();
      if (!wordKey) throw new Error(`${label}不能为空`);
      return { wordKey };
    }
    assertPlainObject(rawRef, label);
    rejectUnknownKeys(rawRef, REF_KEYS, label);
    const wordKey = normalizeString(rawRef.wordKey).toLocaleLowerCase();
    if (!wordKey) throw new Error(`${label}.wordKey 为必填字段`);
    const result = { wordKey };
    if (Object.prototype.hasOwnProperty.call(rawRef, 'overrides')) {
      result.overrides = normalizeOverrides(rawRef.overrides, `${label}.overrides`);
    }
    return result;
  }

  function normalizeSetIfEmptyFields(rawFields, label) {
    assertPlainObject(rawFields, label);
    rejectUnknownKeys(rawFields, new Set(CARD_FIELDS.filter(field => field !== 'word')), label);
    const fields = {};
    Object.entries(rawFields).forEach(([field, value]) => {
      if (ARRAY_FIELDS.has(field)) {
        if (!Array.isArray(value)) throw new Error(`${label}.${field} 必须是 JSON 数组`);
        fields[field] = clone(value);
      } else {
        fields[field] = normalizeString(value);
      }
    });
    if (!Object.keys(fields).length) throw new Error(`${label}至少需要一个字段`);
    return fields;
  }

  function normalizeAppendUniqueFields(rawFields, label) {
    assertPlainObject(rawFields, label);
    rejectUnknownKeys(rawFields, ARRAY_FIELDS, label);
    const fields = {};
    Object.entries(rawFields).forEach(([field, value]) => {
      if (!Array.isArray(value)) throw new Error(`${label}.${field} 必须是 JSON 数组`);
      fields[field] = clone(value);
    });
    if (!Object.keys(fields).length) throw new Error(`${label}至少需要一个数组字段`);
    return fields;
  }

  function normalizeOperation(rawOperation, index, operationName) {
    const label = `masterPatch.${operationName}[${index}]`;
    assertPlainObject(rawOperation, label);
    rejectUnknownKeys(rawOperation, OPERATION_KEYS, label);
    const wordKey = normalizeString(rawOperation.wordKey).toLocaleLowerCase();
    if (!wordKey) throw new Error(`${label}.wordKey 为必填字段`);
    const fields = operationName === 'appendUnique'
      ? normalizeAppendUniqueFields(rawOperation.fields, `${label}.fields`)
      : normalizeSetIfEmptyFields(rawOperation.fields, `${label}.fields`);
    return { wordKey, fields };
  }

  function parseReferenceImportPayload(payload) {
    if (Array.isArray(payload)) {
      throw new Error('旧完整卡片 JSON 数组已停用。请使用 schemaVersion: 2 的引用式单词本导入包');
    }
    assertPlainObject(payload, 'JSON 顶层');
    if (Object.prototype.hasOwnProperty.call(payload, 'cards')) {
      throw new Error('旧 cards 完整卡片 JSON 已停用。请重新生成引用式导入包，不要导入旧颜色 JSON');
    }
    rejectUnknownKeys(payload, TOP_LEVEL_KEYS, 'JSON 顶层');
    if (Number(payload.schemaVersion) !== 2) throw new Error('引用式导入包 schemaVersion 必须为 2');

    assertPlainObject(payload.wordbook, 'wordbook');
    rejectUnknownKeys(payload.wordbook, WORDBOOK_KEYS, 'wordbook');
    const id = normalizeString(payload.wordbook.id);
    const name = normalizeString(payload.wordbook.name);
    if (!id) throw new Error('wordbook.id 为必填字段，用于保证重复导入幂等');
    if (!name) throw new Error('wordbook.name 为必填字段');
    if (payload.wordbook.bookType && payload.wordbook.bookType !== 'reference') {
      throw new Error('wordbook.bookType 只能是 reference');
    }
    if (!Array.isArray(payload.wordbook.cardRefs)) throw new Error('wordbook.cardRefs 必须是 JSON 数组');
    const cardRefs = payload.wordbook.cardRefs.map(normalizeRef);
    if (!cardRefs.length) throw new Error('wordbook.cardRefs 至少需要一个引用');
    const purpose = payload.wordbook.bookPurpose || payload.wordbook.purpose || 'common';
    if (!['common', 'support'].includes(purpose)) throw new Error('wordbook.bookPurpose 只能是 common 或 support');

    const rawPatch = payload.masterPatch == null ? {} : payload.masterPatch;
    assertPlainObject(rawPatch, 'masterPatch');
    rejectUnknownKeys(rawPatch, PATCH_KEYS, 'masterPatch');
    ['create', 'setIfEmpty', 'appendUnique'].forEach(key => {
      if (rawPatch[key] != null && !Array.isArray(rawPatch[key])) {
        throw new Error(`masterPatch.${key} 必须是 JSON 数组`);
      }
    });

    const wordbook = {
      id,
      name,
      bookPurpose: purpose,
      description: normalizeString(payload.wordbook.description),
      cardRefs
    };
    const guideSection = normalizeGuideSection(payload.wordbook.guideSection);
    if (guideSection) wordbook.guideSection = guideSection;

    return {
      schemaVersion: 2,
      wordbook,
      masterPatch: {
        create: (rawPatch.create || []).map((card, index) => normalizeCard(card, `masterPatch.create[${index}]`)),
        setIfEmpty: (rawPatch.setIfEmpty || []).map((operation, index) => normalizeOperation(operation, index, 'setIfEmpty')),
        appendUnique: (rawPatch.appendUnique || []).map((operation, index) => normalizeOperation(operation, index, 'appendUnique'))
      }
    };
  }

  function parseReferenceImportJson(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) throw new Error('请输入引用式单词本 JSON');
    let payload;
    try {
      payload = JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`JSON 解析失败：${error.message}`);
    }
    return parseReferenceImportPayload(payload);
  }

  return {
    CARD_FIELDS,
    ARRAY_FIELDS,
    parseReferenceImportPayload,
    parseReferenceImportJson
  };
});
