(function installVocabularyJsonImport(global) {
  'use strict';

  const CARD_FIELDS = Object.freeze([
    'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
    'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
  ]);
  const ARRAY_FIELDS = new Set(['morphology', 'collocations', 'irregularForms', 'synonyms', 'wordFamily']);
  const META_KEYS = new Set(['schemaVersion', 'name', 'wordbookName', 'bookPurpose', 'purpose', 'categoryId', 'categoryName', 'description', 'cards', 'wordbook']);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function extractJsonPayload(payload) {
    if (Array.isArray(payload)) return { cards: payload, meta: {} };
    if (!payload || typeof payload !== 'object') {
      throw new Error('JSON 顶层必须是卡片数组或包含 cards 的对象');
    }
    if (Array.isArray(payload.cards)) {
      return {
        cards: payload.cards,
        meta: {
          name: String(payload.name || payload.wordbookName || payload.categoryName || ''),
          bookPurpose: String(payload.bookPurpose || payload.purpose || ''),
          categoryId: String(payload.categoryId || '')
        }
      };
    }
    if (payload.wordbook && typeof payload.wordbook === 'object' && Array.isArray(payload.wordbook.cards)) {
      return {
        cards: payload.wordbook.cards,
        meta: {
          name: String(payload.wordbook.name || payload.name || payload.categoryName || ''),
          bookPurpose: String(payload.wordbook.bookPurpose || payload.bookPurpose || payload.purpose || ''),
          categoryId: String(payload.categoryId || '')
        }
      };
    }
    throw new Error('JSON 中没有找到 cards 数组');
  }

  function normalizeJsonCard(rawCard, index) {
    const label = `第 ${index + 1} 张卡`;
    if (!rawCard || typeof rawCard !== 'object' || Array.isArray(rawCard)) {
      throw new Error(`${label}必须是 JSON 对象`);
    }
    const unknownFields = Object.keys(rawCard).filter(key => !CARD_FIELDS.includes(key));
    if (unknownFields.length) {
      throw new Error(`${label}包含不支持的字段：${unknownFields.join('、')}`);
    }
    const card = {};
    CARD_FIELDS.forEach(field => {
      const value = rawCard[field];
      if (ARRAY_FIELDS.has(field)) {
        if (value == null || value === '') card[field] = [];
        else if (Array.isArray(value)) card[field] = clone(value);
        else throw new Error(`${label}的 ${field} 必须是 JSON 数组`);
      } else {
        card[field] = value == null ? '' : String(value).trim();
      }
    });
    if (!card.word || !card.meaning) throw new Error(`${label}的 word 和 meaning 为必填字段`);
    return card;
  }

  function parseVocabularyJson(text) {
    const trimmed = String(text || '').trim();
    let payload;
    try {
      payload = JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`JSON 解析失败：${error.message}`);
    }
    const extracted = extractJsonPayload(payload);
    const cards = extracted.cards.map(normalizeJsonCard);
    if (!cards.length) throw new Error('JSON 中没有可导入的单词卡');
    return { cards, meta: extracted.meta };
  }

  function applyImportMeta(meta) {
    if (!meta || typeof document === 'undefined') return;
    if (typeof importMode !== 'undefined' && importMode !== 'new') return;
    const nameInput = document.getElementById('newBatchName');
    const purposeInput = document.getElementById('newBatchPurpose');
    if (nameInput && meta.name) nameInput.value = meta.name;
    if (purposeInput && ['common', 'support'].includes(meta.bookPurpose)) {
      purposeInput.value = meta.bookPurpose;
    }
  }

  const baseParseCards = typeof parseCards === 'function' ? parseCards : null;
  if (baseParseCards) {
    const enhancedParseCards = function parseCardsWithJson(text) {
      const trimmed = String(text || '').trim();
      if (!trimmed || !/^[\[{]/.test(trimmed)) return baseParseCards(text);
      try {
        const parsed = parseVocabularyJson(trimmed);
        applyImportMeta(parsed.meta);
        const cards = typeof normalizeEnglishCard === 'function'
          ? parsed.cards.map(card => normalizeEnglishCard(card))
          : parsed.cards;
        return { cards, errors: [], meta: parsed.meta };
      } catch (error) {
        return { cards: [], errors: [error.message || 'JSON 导入失败'] };
      }
    };
    global.parseCards = enhancedParseCards;
    try { parseCards = enhancedParseCards; } catch (_) {}
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CARD_FIELDS, extractJsonPayload, normalizeJsonCard, parseVocabularyJson };
  }
})(typeof window !== 'undefined' ? window : globalThis);
