(function vocabularyAdventureModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const exported = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && typeof module !== 'object') Object.assign(root, exported.createVocabularyAdventureAdapter());
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureModule(core) {
  'use strict';

  const ALLOWED_USERS = new Set(['sister', 'brother']);

  function defaultDependencies() {
    return {
      getCurrentUser: () => typeof currentUser === 'undefined' ? '' : currentUser,
      isTeacherUser: () => typeof isTeacher === 'function' && isTeacher(),
      visibleBatchesForCurrentUser: () => typeof visibleBatches === 'function' ? visibleBatches() : [],
      commonBatchesOnly: batches => typeof filterBatchesByBookPurpose === 'function'
        ? filterBatchesByBookPurpose(batches, true, false)
        : [],
      getValue: key => sbGet(key),
      setValue: (key, value) => sbSet(key, value),
      warn: (...args) => console.warn(...args)
    };
  }

  function createVocabularyAdventureAdapter(overrides) {
    const dependencies = { ...defaultDependencies(), ...(overrides || {}) };

    function adventureStateKeyForUser(user) {
      return ALLOWED_USERS.has(user) ? `vocab_adventure_v1_${user}` : '';
    }

    function collectVisibleVocabularyAdventureCandidates() {
      const user = dependencies.getCurrentUser();
      if (!ALLOWED_USERS.has(user) || dependencies.isTeacherUser()) return [];
      const visible = dependencies.visibleBatchesForCurrentUser();
      const common = dependencies.commonBatchesOnly(visible);
      return core.collectVocabularyAdventureCandidates(common);
    }

    function currentVocabularyAdventureUser() {
      const user = dependencies.getCurrentUser();
      return ALLOWED_USERS.has(user) && !dependencies.isTeacherUser() ? user : '';
    }

    function resolveVisibleVocabularyAdventureCandidate(wordKey, candidates) {
      const key = core.adventureWordKey(wordKey);
      const pool = Array.isArray(candidates) ? candidates : collectVisibleVocabularyAdventureCandidates();
      return pool.find(candidate => candidate.key === key) || null;
    }

    async function loadVocabularyAdventureState(user) {
      const key = adventureStateKeyForUser(user);
      if (!key) return core.defaultVocabularyAdventureState();
      return core.normalizeVocabularyAdventureState(await dependencies.getValue(key));
    }

    async function saveVocabularyAdventureState(user, value) {
      const key = adventureStateKeyForUser(user);
      if (!key) return false;
      try {
        return await dependencies.setValue(key, core.normalizeVocabularyAdventureState(value)) !== false;
      } catch (error) {
        dependencies.warn('Vocabulary adventure state save failed', error);
        return false;
      }
    }

    async function previewVocabularyAdventurePlan(today) {
      const user = dependencies.getCurrentUser();
      if (!ALLOWED_USERS.has(user) || dependencies.isTeacherUser()) {
        return { action: 'unavailable', state: core.defaultVocabularyAdventureState(), session: null };
      }
      const state = await loadVocabularyAdventureState(user);
      const candidates = collectVisibleVocabularyAdventureCandidates();
      return core.resolveVocabularyAdventureSession({ candidates, state, today });
    }

    async function loadOrCreateVocabularyAdventureSession(today) {
      const result = await previewVocabularyAdventurePlan(today);
      if (result.action !== 'created') return { ...result, saved: null };
      const saved = await saveVocabularyAdventureState(dependencies.getCurrentUser(), result.state);
      return { ...result, saved };
    }

    async function loadVocabularyAdventurePlayerContext(today) {
      const user = currentVocabularyAdventureUser();
      if (!user) {
        return {
          action: 'unavailable',
          saved: null,
          user: '',
          state: core.defaultVocabularyAdventureState(),
          session: null,
          candidates: []
        };
      }
      const result = await loadOrCreateVocabularyAdventureSession(today);
      return {
        ...result,
        user,
        candidates: collectVisibleVocabularyAdventureCandidates()
      };
    }

    async function saveCurrentVocabularyAdventureState(state) {
      const user = currentVocabularyAdventureUser();
      return user ? saveVocabularyAdventureState(user, state) : false;
    }

    return {
      adventureStateKeyForUser,
      currentVocabularyAdventureUser,
      collectVisibleVocabularyAdventureCandidates,
      resolveVisibleVocabularyAdventureCandidate,
      loadVocabularyAdventureState,
      saveVocabularyAdventureState,
      previewVocabularyAdventurePlan,
      loadOrCreateVocabularyAdventureSession,
      loadVocabularyAdventurePlayerContext,
      saveCurrentVocabularyAdventureState
    };
  }

  return { createVocabularyAdventureAdapter };
});
