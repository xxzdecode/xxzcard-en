(function vocabularyAdventureModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const rewardSettlement = typeof module === 'object' && module.exports
    ? require('./studentVocabularyRewardSettlement.js')
    : root.StudentVocabularyRewardSettlement;
  const exported = factory(core, rewardSettlement, root);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && typeof module !== 'object') Object.assign(root, exported.createVocabularyAdventureAdapter());
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureModule(core, initialRewardSettlement, root) {
  'use strict';

  const ALLOWED_USERS = new Set(['sister', 'brother']);

  function rewardSettlementApi() {
    return initialRewardSettlement || (root && root.StudentVocabularyRewardSettlement) || null;
  }

  async function ensureRewardSettlementApi() {
    let api = rewardSettlementApi();
    if (api) return api;
    if (root && typeof root.loadFeatureScript === 'function') {
      try {
        await root.loadFeatureScript('js/studentVocabularyRewardSettlement.js');
      } catch (error) {
        console.warn('Vocabulary reward settlement module unavailable', error);
      }
    }
    api = rewardSettlementApi();
    return api;
  }

  function defaultDependencies() {
    return {
      getCurrentUser: () => typeof currentUser === 'undefined' ? '' : currentUser,
      isTeacherUser: () => typeof isTeacher === 'function' && isTeacher(),
      visibleBatchesForCurrentUser: () => typeof visibleBatches === 'function' ? visibleBatches() : [],
      commonBatchesOnly: batches => typeof filterBatchesByBookPurpose === 'function'
        ? filterBatchesByBookPurpose(batches, true, false)
        : [],
      getValue: key => sbGet(key),
      getRemoteValue: key => typeof sbGetRemote === 'function' ? sbGetRemote(key) : sbGet(key),
      setValue: (key, value) => sbSet(key, value),
      rewardApi: () => typeof StudentRewards === 'undefined' ? null : StudentRewards,
      reportStorageError: error => {
        if (typeof showStorageError === 'function') showStorageError(error);
      },
      warn: (...args) => console.warn(...args)
    };
  }

  function createVocabularyAdventureAdapter(overrides) {
    const dependencies = { ...defaultDependencies(), ...(overrides || {}) };
    if (overrides && typeof overrides.getValue === 'function'
        && typeof overrides.getRemoteValue !== 'function') {
      dependencies.getRemoteValue = overrides.getValue;
    }
    const rewardMarkerCache = new Map();

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

    function cacheRewardMarker(user, value) {
      const settlement = rewardSettlementApi();
      if (!settlement || typeof settlement.markerFromState !== 'function') return;
      rewardMarkerCache.set(user, settlement.markerFromState(value));
    }

    function previousRewardState(user) {
      const marker = rewardMarkerCache.get(user);
      return marker ? { challengeDaily: { rewardSettlement: marker } } : null;
    }

    async function loadVocabularyAdventureState(user, options) {
      const key = adventureStateKeyForUser(user);
      if (!key) return core.defaultVocabularyAdventureState();
      const requireRemote = options && options.requireRemote === true;
      const prefetched = root && root.__vocabularyAdventurePrefetchedState;
      if (prefetched && Date.now() - Number(prefetched.loadedAt || 0) >= 1500) {
        delete root.__vocabularyAdventurePrefetchedState;
      } else if (!requireRemote && prefetched && prefetched.user === user) {
        delete root.__vocabularyAdventurePrefetchedState;
        cacheRewardMarker(user, prefetched.state);
        return core.normalizeVocabularyAdventureState(prefetched.state);
      }
      const getter = requireRemote
        ? dependencies.getRemoteValue
        : dependencies.getValue;
      const raw = await getter(key);
      cacheRewardMarker(user, raw);
      return core.normalizeVocabularyAdventureState(raw);
    }

    async function saveVocabularyAdventureState(user, value) {
      const key = adventureStateKeyForUser(user);
      if (!key) return false;
      try {
        let normalized = core.normalizeVocabularyAdventureState(value);
        const settlement = await ensureRewardSettlementApi();
        if (settlement
          && typeof settlement.prepareAdventureStateForVocabularyChallengeSave === 'function') {
          normalized = settlement.prepareAdventureStateForVocabularyChallengeSave(
            normalized,
            previousRewardState(user),
            { user }
          );
          cacheRewardMarker(user, normalized);
        }

        const saved = await dependencies.setValue(key, normalized) !== false;
        if (!saved) return false;

        if (settlement
          && typeof settlement.shouldSettleVocabularyChallengeReward === 'function'
          && settlement.shouldSettleVocabularyChallengeReward(normalized)
          && typeof settlement.settleVocabularyChallengeReward === 'function') {
          const result = await settlement.settleVocabularyChallengeReward({
            user,
            adventureState: normalized,
            rewardApi: typeof dependencies.rewardApi === 'function'
              ? dependencies.rewardApi()
              : dependencies.rewardApi,
            getValue: dependencies.getValue,
            setValue: dependencies.setValue,
            reportError: dependencies.reportStorageError
          });
          if (result && result.adventureState) cacheRewardMarker(user, result.adventureState);
          if (result && result.ok === false) {
            dependencies.warn('Vocabulary challenge reward pending retry', result.code || result.error || result);
          }
        }
        return true;
      } catch (error) {
        dependencies.warn('Vocabulary adventure state save failed', error);
        dependencies.reportStorageError(error);
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
