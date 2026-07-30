(function attachMasterVocabularyLibrary(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.MasterVocabularyLibrary = api;
    api.installBrowserCompatibility(root);
  }
})(typeof window !== 'undefined' ? window : null, function createMasterVocabularyLibrary() {
  'use strict';

  const CARD_FIELDS = Object.freeze([
    'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
    'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
  ]);
  const ARRAY_FIELDS = new Set(['morphology', 'collocations', 'irregularForms', 'synonyms', 'wordFamily']);
  const STRING_FIELDS = new Set(['word', 'meaning', 'pos', 'phonetic', 'emoji', 'tip']);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeWordKey(value) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase()
      .replace(/[’]/g, "'")
      .replace(/\s+/g, ' ');
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

  function mergeArrayValues(base, incoming) {
    const result = [];
    const seen = new Set();
    [...(Array.isArray(base) ? base : []), ...(Array.isArray(incoming) ? incoming : [])].forEach(item => {
      const signature = stableStringify(item);
      if (seen.has(signature)) return;
      seen.add(signature);
      result.push(clone(item));
    });
    return result;
  }

  function mergeTextValues(base, incoming, separator) {
    const left = String(base || '').trim();
    const right = String(incoming || '').trim();
    if (!left) return right;
    if (!right || left === right) return left;
    if (left.includes(right)) return left;
    if (right.includes(left)) return right;
    return `${left}${separator || '；'}${right}`;
  }

  function normalizeCardShape(card) {
    const source = card && typeof card === 'object' ? card : {};
    const result = {};
    CARD_FIELDS.forEach(field => {
      if (ARRAY_FIELDS.has(field)) result[field] = clone(Array.isArray(source[field]) ? source[field] : []);
      else result[field] = String(source[field] || '').trim();
    });
    return result;
  }

  function mergeCards(base, incoming) {
    const left = normalizeCardShape(base);
    const right = normalizeCardShape(incoming);
    const merged = normalizeCardShape(left);
    merged.word = left.word || right.word;
    merged.meaning = mergeTextValues(left.meaning, right.meaning, '；');
    merged.pos = mergeTextValues(left.pos, right.pos, '/');
    merged.phonetic = left.phonetic || right.phonetic;
    merged.emoji = left.emoji || right.emoji;
    merged.tip = mergeTextValues(left.tip, right.tip, '\n');
    ARRAY_FIELDS.forEach(field => {
      merged[field] = mergeArrayValues(left[field], right[field]);
    });
    return merged;
  }

  function isBasicCurrentCard(card) {
    if (!card || typeof card !== 'object') return false;
    if (!String(card.word || '').trim() || !String(card.meaning || '').trim()) return false;
    if (!Object.keys(card).every(field => CARD_FIELDS.includes(field))) return false;
    for (const field of STRING_FIELDS) {
      if (card[field] != null && typeof card[field] !== 'string') return false;
    }
    for (const field of ARRAY_FIELDS) {
      if (card[field] != null && !Array.isArray(card[field])) return false;
    }
    return true;
  }

  function normalizeMasterCards(data) {
    const source = data && data.masterCards && typeof data.masterCards === 'object' && !Array.isArray(data.masterCards)
      ? data.masterCards
      : {};
    const normalized = {};
    Object.entries(source).forEach(([storedKey, card]) => {
      const shaped = normalizeCardShape(card);
      const key = normalizeWordKey(shaped.word || storedKey);
      if (!key || !shaped.word) return;
      normalized[key] = normalized[key] ? mergeCards(normalized[key], shaped) : shaped;
    });
    data.masterCards = normalized;
    return normalized;
  }

  function refKey(ref) {
    if (typeof ref === 'string') return normalizeWordKey(ref);
    return normalizeWordKey(ref && (ref.wordKey || ref.word));
  }

  function normalizeRef(ref) {
    const wordKey = refKey(ref);
    if (!wordKey) return null;
    const result = { wordKey };
    if (ref && typeof ref === 'object' && ref.overrides && typeof ref.overrides === 'object') {
      const overrides = {};
      CARD_FIELDS.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(ref.overrides, field)) return;
        overrides[field] = clone(ref.overrides[field]);
      });
      if (Object.keys(overrides).length) result.overrides = overrides;
    }
    return result;
  }

  function hydrateCard(masterCard, ref) {
    if (!masterCard) return null;
    if (!ref || !ref.overrides || typeof ref.overrides !== 'object') return masterCard;
    return normalizeCardShape({ ...clone(masterCard), ...clone(ref.overrides) });
  }

  function defineRuntimeCards(batch, cards) {
    try { delete batch.cards; } catch (_) {}
    Object.defineProperty(batch, 'cards', {
      value: cards,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }

  function syncBatch(data, batch) {
    if (!batch || typeof batch !== 'object') return;
    const masterCards = data.masterCards;
    const existingRefs = (Array.isArray(batch.cardRefs) ? batch.cardRefs : [])
      .map(normalizeRef)
      .filter(Boolean);
    const runtimeCards = Array.isArray(batch.cards) ? batch.cards : null;
    const refs = [];

    if (runtimeCards) {
      runtimeCards.forEach((rawCard, index) => {
        const shaped = normalizeCardShape(rawCard);
        const key = normalizeWordKey(shaped.word);
        if (!key || !shaped.word) return;
        masterCards[key] = masterCards[key] ? mergeCards(masterCards[key], shaped) : shaped;
        const previous = existingRefs[index];
        refs.push(previous && previous.wordKey === key ? previous : { wordKey: key });
      });
    } else {
      refs.push(...existingRefs);
    }

    batch.cardRefs = refs;
    batch.bookType = 'reference';
    const hydrated = refs
      .map(ref => hydrateCard(masterCards[ref.wordKey], ref))
      .filter(Boolean);
    defineRuntimeCards(batch, hydrated);
  }

  function normalizeAppData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.batches)) data.batches = [];
    normalizeMasterCards(data);
    data.batches.forEach(batch => syncBatch(data, batch));
    data.schemaVersion = Math.max(2, Number(data.schemaVersion) || 0);
    if (!data.masterLibrary || typeof data.masterLibrary !== 'object') {
      data.masterLibrary = {
        version: 1,
        createdAt: new Date().toISOString(),
        source: 'legacy-batches'
      };
    }
    data.masterLibrary.version = 1;
    return true;
  }

  function findInvalidData(data, externalValidator) {
    if (!data || typeof data !== 'object') return { type: 'appData', reason: 'not-object' };
    if (!data.masterCards || typeof data.masterCards !== 'object') return { type: 'masterCards', reason: 'missing' };
    const validate = typeof externalValidator === 'function' ? externalValidator : isBasicCurrentCard;
    for (const [wordKey, card] of Object.entries(data.masterCards)) {
      if (!validate(card)) return { type: 'masterCard', wordKey, card };
      if (normalizeWordKey(card.word) !== wordKey) return { type: 'masterKey', wordKey, card };
    }
    for (const batch of (data.batches || [])) {
      for (const ref of (batch.cardRefs || [])) {
        const normalized = normalizeRef(ref);
        if (!normalized || !data.masterCards[normalized.wordKey]) {
          return { type: 'cardRef', batch, ref };
        }
      }
    }
    return null;
  }

  function persistedCopy(data) {
    normalizeAppData(data);
    return JSON.parse(JSON.stringify(data));
  }

  function installBrowserCompatibility(windowObject) {
    if (!windowObject || windowObject.__masterVocabularyLibraryInstalled) return;
    windowObject.__masterVocabularyLibraryInstalled = true;

    const originalNormalizeAppData = typeof windowObject.normalizeAppData === 'function'
      ? windowObject.normalizeAppData
      : null;
    const originalFindInvalidEnglishCard = typeof windowObject.findInvalidEnglishCard === 'function'
      ? windowObject.findInvalidEnglishCard
      : null;
    const originalCloneForStorage = typeof windowObject.cloneForStorage === 'function'
      ? windowObject.cloneForStorage
      : clone;

    windowObject.normalizeAppData = function normalizeMasterLibraryAppData(data) {
      const changed = normalizeAppData(data);
      if (originalNormalizeAppData) originalNormalizeAppData(data);
      return changed;
    };

    windowObject.findInvalidEnglishCard = function findInvalidMasterLibraryCard(data) {
      const validator = typeof windowObject.isCurrentEnglishCard === 'function'
        ? windowObject.isCurrentEnglishCard
        : isBasicCurrentCard;
      return findInvalidData(data, validator)
        || (originalFindInvalidEnglishCard ? originalFindInvalidEnglishCard(data) : null);
    };

    windowObject.cloneForStorage = function cloneMasterLibraryForStorage(value) {
      const copy = originalCloneForStorage(value);
      if (copy && typeof copy === 'object' && Array.isArray(copy.batches)) normalizeAppData(copy);
      return copy;
    };
  }

  return {
    CARD_FIELDS,
    normalizeWordKey,
    normalizeCardShape,
    mergeCards,
    normalizeAppData,
    findInvalidData,
    persistedCopy,
    installBrowserCompatibility
  };
});
