(function vocabularyLessonTaughtModule(root, factory) {
  const groups = typeof module === 'object' && module.exports
    ? require('./vocabularyLessonGroups.js')
    : root.VocabularyLessonGroups;
  const api = factory(groups, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyLessonTaught(groups, root) {
  'use strict';

  const TAUGHT_STATE_KEY = 'vocab_lesson_taught_v1';
  const LEGACY_PROGRESS_KEYS = Object.freeze([
    'vocab_lesson_progress_v1_sister',
    'vocab_lesson_progress_v1_brother'
  ]);
  const LEGACY_MIGRATION_ID = 'per-student-completed-union-v1';
  let cachedState = null;
  let loadPromise = null;

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeWordKeys(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map(value => groups.wordKey(value))
      .filter(key => key && !seen.has(key) && seen.add(key));
  }

  function normalizeTaughtEntry(value) {
    const source = plainObject(value) ? value : {};
    return {
      status: source.status === 'taught' ? 'taught' : 'active',
      taughtAt: typeof source.taughtAt === 'string' ? source.taughtAt : '',
      eligibleDate: typeof source.eligibleDate === 'string' ? source.eligibleDate : '',
      wordKeysSnapshot: normalizeWordKeys(source.wordKeysSnapshot)
    };
  }

  function normalizeVocabularyLessonTaughtState(value) {
    const source = plainObject(value) ? value : {};
    const result = { version: 1, groups: {}, migrations: {} };
    if (plainObject(source.groups)) {
      Object.entries(source.groups).forEach(([groupId, entry]) => {
        if (!groupId) return;
        const normalized = normalizeTaughtEntry(entry);
        if (normalized.status === 'taught') result.groups[groupId] = normalized;
      });
    }
    if (plainObject(source.migrations)) result.migrations = clone(source.migrations);
    return result;
  }

  function earlierTimestamp(a, b) {
    const values = [a, b].filter(Boolean).sort();
    return values[0] || '';
  }

  function taughtDate(timestamp) {
    return groups.localDateKey(timestamp) || groups.localDateKey(new Date());
  }

  function mergeTaughtEntry(currentValue, nextValue) {
    const current = normalizeTaughtEntry(currentValue);
    const next = normalizeTaughtEntry(nextValue);
    const taughtAt = earlierTimestamp(current.taughtAt, next.taughtAt) || next.taughtAt || current.taughtAt;
    return {
      status: 'taught',
      taughtAt,
      eligibleDate: earlierTimestamp(current.eligibleDate, next.eligibleDate)
        || groups.addLocalDays(taughtDate(taughtAt), 1),
      wordKeysSnapshot: normalizeWordKeys([
        ...current.wordKeysSnapshot,
        ...next.wordKeysSnapshot
      ])
    };
  }

  function migrateLegacyCompletedGroups(stateValue, legacyProgressValues, migratedAt) {
    const state = normalizeVocabularyLessonTaughtState(stateValue);
    if (state.migrations[LEGACY_MIGRATION_ID]) return { state, changed: false };
    (Array.isArray(legacyProgressValues) ? legacyProgressValues : []).forEach(progressValue => {
      const progress = groups.normalizeVocabularyLessonProgress(progressValue);
      Object.entries(progress.groups).forEach(([groupId, entry]) => {
        if (!entry || entry.status !== 'completed' || !entry.wordKeysSnapshot.length) return;
        const taughtAt = entry.completedAt || entry.updatedAt || String(migratedAt || new Date().toISOString());
        state.groups[groupId] = mergeTaughtEntry(state.groups[groupId], {
          status: 'taught',
          taughtAt,
          eligibleDate: groups.addLocalDays(taughtDate(taughtAt), 1),
          wordKeysSnapshot: entry.wordKeysSnapshot
        });
      });
    });
    state.migrations[LEGACY_MIGRATION_ID] = {
      migratedAt: String(migratedAt || new Date().toISOString()),
      sourceKeys: [...LEGACY_PROGRESS_KEYS]
    };
    return { state: normalizeVocabularyLessonTaughtState(state), changed: true };
  }

  function markVocabularyLessonGroupTaught(stateValue, options) {
    const input = plainObject(options) ? options : {};
    const groupId = String(input.groupId || '');
    const state = normalizeVocabularyLessonTaughtState(stateValue);
    if (!groupId) return { state, changed: false };
    const existing = state.groups[groupId];
    if (existing && existing.status === 'taught') return { state, changed: false };
    const taughtAt = String(input.taughtAt || new Date().toISOString());
    state.groups[groupId] = {
      status: 'taught',
      taughtAt,
      eligibleDate: String(input.eligibleDate || groups.addLocalDays(taughtDate(taughtAt), 1)),
      wordKeysSnapshot: normalizeWordKeys(input.wordKeys)
    };
    return { state, changed: true };
  }

  function isVocabularyLessonGroupTaught(stateValue, groupId, currentWordKeys) {
    const state = normalizeVocabularyLessonTaughtState(stateValue);
    const entry = state.groups[String(groupId || '')];
    if (entry && entry.status === 'taught' && !Array.isArray(currentWordKeys)) return true;
    if (!Array.isArray(currentWordKeys)) return false;
    const current = normalizeWordKeys(currentWordKeys);
    if (!current.length) return false;
    if (entry && entry.status === 'taught' && current.length === entry.wordKeysSnapshot.length) {
      const snapshot = new Set(entry.wordKeysSnapshot);
      if (current.every(wordKey => snapshot.has(wordKey))) return true;
    }
    const taughtWords = new Set();
    Object.values(state.groups).forEach(group => {
      if (!group || group.status !== 'taught') return;
      group.wordKeysSnapshot.forEach(wordKey => taughtWords.add(wordKey));
    });
    return current.every(wordKey => taughtWords.has(wordKey));
  }

  function collectTaughtWordEntries(stateValue, options) {
    const state = normalizeVocabularyLessonTaughtState(stateValue);
    const settings = plainObject(options) ? options : {};
    const challengeDate = String(settings.challengeDate || '');
    const byWord = new Map();
    Object.entries(state.groups).forEach(([groupId, entry]) => {
      if (entry.status !== 'taught') return;
      if (challengeDate && (!entry.eligibleDate || entry.eligibleDate > challengeDate)) return;
      entry.wordKeysSnapshot.forEach(wordKey => {
        const current = byWord.get(wordKey);
        const next = {
          wordKey,
          sourceGroupId: groupId,
          taughtAt: entry.taughtAt,
          eligibleDate: entry.eligibleDate
        };
        if (!current || String(next.taughtAt).localeCompare(String(current.taughtAt)) > 0) {
          byWord.set(wordKey, next);
        }
      });
    });
    return [...byWord.values()];
  }

  async function readStored(key, requireRemote) {
    if (requireRemote && typeof root.sbGetRemote === 'function') return root.sbGetRemote(key);
    if (typeof root.sbGet === 'function') return root.sbGet(key);
    if (typeof root.sbGetRemote === 'function') return root.sbGetRemote(key);
    throw new Error('Vocabulary lesson taught storage is unavailable');
  }

  async function writeRemote(value) {
    if (typeof root.sbSet !== 'function') throw new Error('Vocabulary lesson taught storage is unavailable');
    await root.sbSet(TAUGHT_STATE_KEY, value);
  }

  async function loadVocabularyLessonTaughtState(options) {
    const settings = plainObject(options) ? options : {};
    if (!settings.fresh && cachedState) return clone(cachedState);
    if (!settings.fresh && loadPromise) return loadPromise.then(clone);
    loadPromise = (async () => {
      const requireRemote = settings.fresh === true;
      const stored = await readStored(TAUGHT_STATE_KEY, requireRemote);
      const state = normalizeVocabularyLessonTaughtState(stored);
      if (!state.migrations[LEGACY_MIGRATION_ID]) {
        const legacy = await Promise.all(LEGACY_PROGRESS_KEYS.map(key => readStored(key, requireRemote)));
        const migrated = migrateLegacyCompletedGroups(state, legacy);
        cachedState = migrated.state;
        try {
          await writeRemote(cachedState);
        } catch (error) {
          console.warn('Vocabulary lesson taught migration save deferred', error);
        }
      } else {
        cachedState = state;
      }
      return clone(cachedState);
    })().finally(() => { loadPromise = null; });
    return loadPromise;
  }

  async function saveVocabularyLessonTaughtGroup(options) {
    const current = await loadVocabularyLessonTaughtState({ fresh: true });
    const result = markVocabularyLessonGroupTaught(current, options);
    if (!result.changed) return clone(result.state);
    await writeRemote(result.state);
    cachedState = result.state;
    if (typeof root.CustomEvent === 'function') {
      root.dispatchEvent?.(new root.CustomEvent('vocabulary-lesson-taught-updated', {
        detail: { state: clone(cachedState), groupId: String(options && options.groupId || '') }
      }));
    }
    return clone(cachedState);
  }

  function setVocabularyLessonTaughtStateCache(value) {
    cachedState = normalizeVocabularyLessonTaughtState(value);
    return clone(cachedState);
  }

  function getVocabularyLessonTaughtStateCache() {
    return clone(cachedState || normalizeVocabularyLessonTaughtState(null));
  }

  return Object.freeze({
    TAUGHT_STATE_KEY,
    LEGACY_PROGRESS_KEYS,
    LEGACY_MIGRATION_ID,
    normalizeVocabularyLessonTaughtState,
    migrateLegacyCompletedGroups,
    markVocabularyLessonGroupTaught,
    isVocabularyLessonGroupTaught,
    collectTaughtWordEntries,
    loadVocabularyLessonTaughtState,
    saveVocabularyLessonTaughtGroup,
    setVocabularyLessonTaughtStateCache,
    getVocabularyLessonTaughtStateCache
  });
});
