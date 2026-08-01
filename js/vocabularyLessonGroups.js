(function vocabularyLessonGroupsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VocabularyLessonGroups = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyLessonGroups() {
  'use strict';

  const VERSION = 1;
  const GROUP_SIZE = 20;
  const LEGACY_BATCH_SIZE = 10;

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function wordKey(value) {
    return String(value == null ? '' : value).trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  function bookId(value) {
    return String(value && value.id || '').trim();
  }

  function cardWord(card) {
    return String(card && (card.word || card.en) || '').trim();
  }

  function collectBookWordKeys(batch) {
    const seen = new Set();
    return (Array.isArray(batch && batch.cards) ? batch.cards : [])
      .map(cardWord)
      .map(wordKey)
      .filter(key => key && !seen.has(key) && seen.add(key));
  }

  function groupIdFor(book, order) {
    return `${String(book || 'book')}:g${String(order).padStart(2, '0')}`;
  }

  function normalizeGroup(value, fallbackBookId, fallbackOrder) {
    const source = plainObject(value) ? value : {};
    const order = Math.max(1, Math.trunc(Number(source.order)) || fallbackOrder || 1);
    const seen = new Set();
    const wordKeys = (Array.isArray(source.wordKeys) ? source.wordKeys : [])
      .map(wordKey)
      .filter(key => key && !seen.has(key) && seen.add(key));
    return {
      id: String(source.id || groupIdFor(fallbackBookId, order)),
      order,
      wordKeys,
      sealed: source.sealed === true
    };
  }

  function normalizeGroupConfig(value, fallbackBookId, size = GROUP_SIZE) {
    const source = plainObject(value) ? value : {};
    const id = String(source.bookId || fallbackBookId || '');
    const groupSize = Math.max(1, Math.trunc(Number(source.groupSize)) || size || GROUP_SIZE);
    const groups = (Array.isArray(source.groups) ? source.groups : [])
      .map((group, index) => normalizeGroup(group, id, index + 1))
      .sort((a, b) => a.order - b.order)
      .map((group, index) => ({ ...group, order: index + 1 }));
    return { version: VERSION, bookId: id, groupSize, groups };
  }

  function reconcileVocabularyLessonGroups(batch, storedConfig, size = GROUP_SIZE) {
    const id = bookId(batch);
    const available = collectBookWordKeys(batch);
    const availableSet = new Set(available);
    const config = normalizeGroupConfig(storedConfig, id, size);
    const assigned = new Set();

    config.groups = config.groups.map((group, index) => {
      const keys = group.wordKeys.filter(key => availableSet.has(key) && !assigned.has(key));
      keys.forEach(key => assigned.add(key));
      return {
        id: group.id || groupIdFor(id, index + 1),
        order: index + 1,
        wordKeys: keys,
        sealed: group.sealed === true
      };
    }).filter(group => group.wordKeys.length || group.sealed);

    const unassigned = available.filter(key => !assigned.has(key));
    unassigned.forEach(key => {
      let target = config.groups[config.groups.length - 1];
      if (!target || target.sealed || target.wordKeys.length >= config.groupSize) {
        const order = config.groups.length + 1;
        target = { id: groupIdFor(id, order), order, wordKeys: [], sealed: false };
        config.groups.push(target);
      }
      target.wordKeys.push(key);
    });

    config.groups = config.groups.map((group, index) => ({
      ...group,
      id: group.id || groupIdFor(id, index + 1),
      order: index + 1
    }));
    return config;
  }

  function sealVocabularyLessonGroup(configValue, targetGroupId) {
    const config = normalizeGroupConfig(configValue, configValue && configValue.bookId, configValue && configValue.groupSize);
    let changed = false;
    config.groups = config.groups.map(group => {
      if (group.id !== targetGroupId || group.sealed) return group;
      changed = true;
      return { ...group, sealed: true };
    });
    return { config, changed };
  }

  function materializeVocabularyLessonGroups(items, configValue) {
    const byKey = new Map((Array.isArray(items) ? items : []).map(item => [wordKey(item && item.word), item]));
    const config = normalizeGroupConfig(configValue, configValue && configValue.bookId, configValue && configValue.groupSize);
    return config.groups.map(group => group.wordKeys.map(key => byKey.get(key)).filter(Boolean));
  }

  function defaultVocabularyLessonProgress() {
    return { version: VERSION, groups: {}, challengeQueue: {}, migrations: {} };
  }

  function normalizeGroupProgress(value) {
    const source = plainObject(value) ? value : {};
    const completed = source.status === 'completed';
    return {
      status: completed ? 'completed' : 'active',
      wordIndex: Math.max(0, Math.trunc(Number(source.wordIndex)) || 0),
      completedAt: completed && typeof source.completedAt === 'string' ? source.completedAt : '',
      wordKeysSnapshot: completed && Array.isArray(source.wordKeysSnapshot)
        ? source.wordKeysSnapshot.map(wordKey).filter(Boolean)
        : [],
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
    };
  }

  function normalizeQueueEntry(value) {
    const source = plainObject(value) ? value : {};
    const seenWords = new Set();
    const seenConsumed = new Set();
    return {
      eligibleDate: typeof source.eligibleDate === 'string' ? source.eligibleDate : '',
      wordKeys: (Array.isArray(source.wordKeys) ? source.wordKeys : [])
        .map(wordKey).filter(key => key && !seenWords.has(key) && seenWords.add(key)),
      consumedWordKeys: (Array.isArray(source.consumedWordKeys) ? source.consumedWordKeys : [])
        .map(wordKey).filter(key => key && !seenConsumed.has(key) && seenConsumed.add(key)),
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : ''
    };
  }

  function normalizeVocabularyLessonProgress(value) {
    const source = plainObject(value) ? value : {};
    const result = defaultVocabularyLessonProgress();
    if (plainObject(source.groups)) {
      Object.entries(source.groups).forEach(([id, group]) => {
        if (id) result.groups[id] = normalizeGroupProgress(group);
      });
    }
    if (plainObject(source.challengeQueue)) {
      Object.entries(source.challengeQueue).forEach(([id, entry]) => {
        if (id) result.challengeQueue[id] = normalizeQueueEntry(entry);
      });
    }
    if (plainObject(source.migrations)) result.migrations = clone(source.migrations);
    return result;
  }

  function updateVocabularyLessonGroupPosition(progressValue, options) {
    const input = plainObject(options) ? options : {};
    const groupId = String(input.groupId || '');
    const progress = normalizeVocabularyLessonProgress(progressValue);
    if (!groupId) return progress;
    const previous = normalizeGroupProgress(progress.groups[groupId]);
    if (previous.status === 'completed') return progress;
    progress.groups[groupId] = {
      ...previous,
      status: 'active',
      wordIndex: Math.max(0, Math.trunc(Number(input.wordIndex)) || 0),
      updatedAt: String(input.updatedAt || new Date().toISOString())
    };
    return progress;
  }

  function markVocabularyLessonGroupCompleted(progressValue, options) {
    const input = plainObject(options) ? options : {};
    const groupId = String(input.groupId || '');
    const progress = normalizeVocabularyLessonProgress(progressValue);
    if (!groupId) return { progress, changed: false };
    const existing = normalizeGroupProgress(progress.groups[groupId]);
    if (existing.status === 'completed') return { progress, changed: false };
    const completedAt = String(input.completedAt || new Date().toISOString());
    const wordKeys = (Array.isArray(input.wordKeys) ? input.wordKeys : []).map(wordKey).filter(Boolean);
    progress.groups[groupId] = {
      status: 'completed',
      wordIndex: Math.max(0, wordKeys.length - 1),
      completedAt,
      wordKeysSnapshot: wordKeys,
      updatedAt: completedAt
    };
    progress.challengeQueue[groupId] = normalizeQueueEntry({
      eligibleDate: String(input.eligibleDate || ''),
      wordKeys,
      consumedWordKeys: [],
      createdAt: completedAt
    });
    return { progress, changed: true };
  }

  function isVocabularyLessonGroupCompleted(progressValue, groupId) {
    const progress = normalizeVocabularyLessonProgress(progressValue);
    return !!(progress.groups[groupId] && progress.groups[groupId].status === 'completed');
  }

  function migrateLegacyVocabularyLessonProgress(raw, groupLengths, legacySize = LEGACY_BATCH_SIZE) {
    if (!plainObject(raw) || raw.version !== 1) return null;
    const lengths = (Array.isArray(groupLengths) ? groupLengths : []).map(value => Math.max(0, Math.trunc(Number(value)) || 0));
    if (!lengths.length) return null;
    const oldBatchIndex = Math.max(0, Math.trunc(Number(raw.lastTeachingBatchIndex ?? raw.batchIndex)) || 0);
    const positions = Array.isArray(raw.batchPositions) ? raw.batchPositions : [];
    const oldWordIndex = Math.max(0, Math.trunc(Number(positions[oldBatchIndex] ?? raw.wordIndex)) || 0);
    let absoluteIndex = oldBatchIndex * Math.max(1, Math.trunc(Number(legacySize)) || LEGACY_BATCH_SIZE) + oldWordIndex;
    const total = lengths.reduce((sum, value) => sum + value, 0);
    absoluteIndex = Math.max(0, Math.min(absoluteIndex, Math.max(0, total - 1)));
    let offset = 0;
    for (let groupIndex = 0; groupIndex < lengths.length; groupIndex += 1) {
      if (absoluteIndex < offset + lengths[groupIndex]) {
        return { groupIndex, wordIndex: absoluteIndex - offset, absoluteIndex };
      }
      offset += lengths[groupIndex];
    }
    return { groupIndex: lengths.length - 1, wordIndex: Math.max(0, lengths[lengths.length - 1] - 1), absoluteIndex };
  }

  function localDateKey(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function addLocalDays(dateValue, days) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ''));
    if (!match) return '';
    return localDateKey(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(days || 0)));
  }

  function collectEligibleQueuedWords(progressValue, today) {
    const progress = normalizeVocabularyLessonProgress(progressValue);
    const result = [];
    Object.entries(progress.challengeQueue).forEach(([groupId, entry]) => {
      if (!entry.eligibleDate || entry.eligibleDate > today) return;
      const consumed = new Set(entry.consumedWordKeys);
      entry.wordKeys.forEach(key => {
        if (!consumed.has(key)) result.push({ wordKey: key, sourceGroupId: groupId, sourceType: 'lessonQueue' });
      });
    });
    return result;
  }

  function consumeQueuedWords(progressValue, consumedItems) {
    const progress = normalizeVocabularyLessonProgress(progressValue);
    let changed = false;
    (Array.isArray(consumedItems) ? consumedItems : []).forEach(item => {
      const groupId = String(item && item.sourceGroupId || '');
      const key = wordKey(item && item.wordKey);
      const entry = progress.challengeQueue[groupId];
      if (!groupId || !key || !entry || !entry.wordKeys.includes(key) || entry.consumedWordKeys.includes(key)) return;
      entry.consumedWordKeys.push(key);
      changed = true;
    });
    return { progress, changed };
  }

  return {
    VERSION,
    GROUP_SIZE,
    LEGACY_BATCH_SIZE,
    wordKey,
    collectBookWordKeys,
    groupIdFor,
    normalizeGroupConfig,
    reconcileVocabularyLessonGroups,
    sealVocabularyLessonGroup,
    materializeVocabularyLessonGroups,
    defaultVocabularyLessonProgress,
    normalizeVocabularyLessonProgress,
    updateVocabularyLessonGroupPosition,
    markVocabularyLessonGroupCompleted,
    isVocabularyLessonGroupCompleted,
    migrateLegacyVocabularyLessonProgress,
    localDateKey,
    addLocalDays,
    collectEligibleQueuedWords,
    consumeQueuedWords
  };
});
