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
  const PENDING_STATE_PREFIX = 'wc_vocab_adventure_pending_v1_';

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
      setBackgroundValue: (key, value) => typeof root.sbSetBackground === 'function'
        ? root.sbSetBackground(key, value)
        : sbSet(key, value),
      readPending: key => {
        try { return root.localStorage ? root.localStorage.getItem(key) : null; } catch (_) { return null; }
      },
      writePending: (key, value) => {
        try {
          if (!root.localStorage) return false;
          root.localStorage.setItem(key, value);
          return true;
        } catch (error) {
          console.warn('Vocabulary adventure local pending save failed', error);
          return false;
        }
      },
      removePending: key => {
        try { root.localStorage?.removeItem(key); } catch (_) {}
      },
      schedule: (task, delay = 0) => root.setTimeout(task, delay),
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
    const rewardEvidenceCache = new Map();
    const pendingFlushes = new Map();

    function pendingStateKey(user) {
      return PENDING_STATE_PREFIX + user;
    }

    function stateFingerprint(value) {
      try { return JSON.stringify(value || null); } catch (_) { return ''; }
    }

    function readPendingEnvelope(user) {
      let value;
      try { value = JSON.parse(dependencies.readPending(pendingStateKey(user)) || 'null'); }
      catch (_) { return null; }
      if (!value || value.version !== 1 || value.user !== user || !value.state) return null;
      return {
        version: 1,
        user,
        queuedAt: String(value.queuedAt || ''),
        state: core.normalizeVocabularyAdventureState(value.state)
      };
    }

    function removePendingEnvelope(user) {
      dependencies.removePending(pendingStateKey(user));
    }

    function setSyncStatus(status) {
      const node = root && root.document
        ? root.document.getElementById('vocabularyAdventureChallengeSyncStatus')
        : null;
      if (!node) return;
      node.dataset.syncState = status || '';
      node.textContent = status === 'pending'
        ? '本机已保存 · 待同步'
        : status === 'synced'
          ? '云端已同步'
          : '无提示 · 正式计分';
    }

    function writePendingEnvelope(user, state) {
      const envelope = {
        version: 1,
        user,
        queuedAt: new Date().toISOString(),
        state: core.normalizeVocabularyAdventureState(state)
      };
      const written = dependencies.writePending(pendingStateKey(user), JSON.stringify(envelope));
      if (written) setSyncStatus('pending');
      return written ? envelope : null;
    }

    function sessionStatusRank(status) {
      return status === 'completed' ? 3 : status === 'abandoned' ? 2 : status === 'active' ? 1 : 0;
    }

    function pendingStateIsNewer(pendingValue, remoteValue) {
      const pending = core.normalizeVocabularyAdventureState(pendingValue);
      const remote = core.normalizeVocabularyAdventureState(remoteValue);
      const left = pending.challengeSession;
      const right = remote.challengeSession;
      if (!left) return false;
      if (!right) return true;
      if (String(left.date || '') !== String(right.date || '')) {
        return String(left.date || '') > String(right.date || '');
      }
      if (Number(left.attemptIndex || 0) !== Number(right.attemptIndex || 0)) {
        return Number(left.attemptIndex || 0) > Number(right.attemptIndex || 0);
      }
      if (String(left.startedAt || '') !== String(right.startedAt || '')) {
        return String(left.startedAt || '') > String(right.startedAt || '');
      }
      if (Number(left.cursor || 0) !== Number(right.cursor || 0)) {
        return Number(left.cursor || 0) > Number(right.cursor || 0);
      }
      if (sessionStatusRank(left.status) !== sessionStatusRank(right.status)) {
        return sessionStatusRank(left.status) > sessionStatusRank(right.status);
      }
      return String(left.updatedAt || '') > String(right.updatedAt || '');
    }

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

    function rewardEvidenceState(user, value) {
      const settlement = rewardSettlementApi();
      const daily = value && typeof value.challengeDaily === 'object' && value.challengeDaily
        ? value.challengeDaily
        : null;
      const date = daily && /^\d{4}-\d{2}-\d{2}$/.test(String(daily.date || ''))
        ? String(daily.date)
        : '';
      if (!settlement || !date || typeof settlement.markerFromState !== 'function') return null;
      const marker = settlement.markerFromState(value);
      const completions = typeof settlement.completionFacts === 'function'
        ? settlement.completionFacts(value, user).filter(item => item && item.date === date && item.legacy !== true)
        : [];
      return {
        challengeDaily: {
          date,
          ...(marker && marker.date === date ? { rewardSettlement: marker } : {}),
          ...(completions.length ? { completions: completions.slice(-4) } : {})
        }
      };
    }

    function cacheRewardEvidence(user, value) {
      const settlement = rewardSettlementApi();
      let evidence = rewardEvidenceState(user, value);
      if (!settlement || !evidence) return;
      const previous = rewardEvidenceCache.get(user);
      if (previous && previous.challengeDaily?.date === evidence.challengeDaily.date
          && typeof settlement.prepareAdventureStateForVocabularyChallengeSave === 'function') {
        evidence = rewardEvidenceState(user, settlement.prepareAdventureStateForVocabularyChallengeSave(
          evidence,
          previous,
          { user, rewardApi: typeof dependencies.rewardApi === 'function'
            ? dependencies.rewardApi()
            : dependencies.rewardApi }
        )) || evidence;
      }
      rewardEvidenceCache.set(user, evidence);
    }

    function previousRewardState(user, value) {
      const current = rewardEvidenceState(user, value);
      const previous = rewardEvidenceCache.get(user);
      if (!current || !previous || previous.challengeDaily?.date !== current.challengeDaily.date) return null;
      return JSON.parse(JSON.stringify(previous));
    }

    async function loadVocabularyAdventureState(user, options) {
      const key = adventureStateKeyForUser(user);
      if (!key) return core.defaultVocabularyAdventureState();
      const requireRemote = options && options.requireRemote === true;
      const pending = readPendingEnvelope(user);
      const prefetched = root && root.__vocabularyAdventurePrefetchedState;
      if (prefetched && Date.now() - Number(prefetched.loadedAt || 0) >= 1500) {
        delete root.__vocabularyAdventurePrefetchedState;
      } else if (!requireRemote && prefetched && prefetched.user === user) {
        delete root.__vocabularyAdventurePrefetchedState;
        cacheRewardEvidence(user, prefetched.state);
        return core.normalizeVocabularyAdventureState(prefetched.state);
      }
      const getter = requireRemote
        ? dependencies.getRemoteValue
        : dependencies.getValue;
      let raw;
      try {
        raw = await getter(key);
      } catch (error) {
        if (!pending) throw error;
        setSyncStatus('pending');
        flushPendingVocabularyAdventureState(user).catch(() => {});
        cacheRewardEvidence(user, pending.state);
        return pending.state;
      }
      const remote = core.normalizeVocabularyAdventureState(raw);
      if (pending && pendingStateIsNewer(pending.state, remote)) {
        setSyncStatus('pending');
        flushPendingVocabularyAdventureState(user).catch(() => {});
        cacheRewardEvidence(user, pending.state);
        return pending.state;
      }
      if (pending) removePendingEnvelope(user);
      setSyncStatus('');
      cacheRewardEvidence(user, remote);
      return remote;
    }

    async function saveVocabularyAdventureState(user, value, options) {
      const key = adventureStateKeyForUser(user);
      if (!key) return false;
      const settings = options && typeof options === 'object' ? options : {};
      try {
        let normalized = core.normalizeVocabularyAdventureState(value);
        const settlement = await ensureRewardSettlementApi();
        if (settlement
          && typeof settlement.prepareAdventureStateForVocabularyChallengeSave === 'function') {
          normalized = settlement.prepareAdventureStateForVocabularyChallengeSave(
            normalized,
            previousRewardState(user, normalized),
            { user }
          );
          cacheRewardEvidence(user, normalized);
        }

        const setter = settings.background ? dependencies.setBackgroundValue : dependencies.setValue;
        const saved = await setter(key, normalized) !== false;
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
            setValue: settings.background ? dependencies.setBackgroundValue : dependencies.setValue,
            reportError: settings.background ? dependencies.warn : dependencies.reportStorageError
          });
          if (result && result.adventureState) cacheRewardEvidence(user, result.adventureState);
          if (result && result.ok === false) {
            dependencies.warn('Vocabulary challenge reward pending retry', result.code || result.error || result);
          }
        }
        return true;
      } catch (error) {
        dependencies.warn('Vocabulary adventure state save failed', error);
        if (!settings.background) dependencies.reportStorageError(error);
        return false;
      }
    }

    function flushPendingVocabularyAdventureState(user) {
      if (!ALLOWED_USERS.has(user)) return Promise.resolve(false);
      if (pendingFlushes.has(user)) return pendingFlushes.get(user);
      const task = (async () => {
        const envelope = readPendingEnvelope(user);
        if (!envelope) return true;
        const fingerprint = stateFingerprint(envelope.state);
        const saved = await saveVocabularyAdventureState(user, envelope.state, { background: true });
        if (!saved) {
          setSyncStatus('pending');
          return false;
        }
        const latest = readPendingEnvelope(user);
        if (latest && stateFingerprint(latest.state) === fingerprint) {
          removePendingEnvelope(user);
          setSyncStatus('synced');
          dependencies.schedule(() => {
            if (!readPendingEnvelope(user)) setSyncStatus('');
          }, 1200);
        }
        return true;
      })();
      pendingFlushes.set(user, task);
      task.then(saved => {
        pendingFlushes.delete(user);
        if (saved && readPendingEnvelope(user)) {
          dependencies.schedule(() => flushPendingVocabularyAdventureState(user).catch(() => {}));
        }
      }, () => pendingFlushes.delete(user));
      return task;
    }

    async function queueVocabularyAdventureState(user, value) {
      const key = adventureStateKeyForUser(user);
      if (!key) return false;
      let normalized = core.normalizeVocabularyAdventureState(value);
      const settlement = rewardSettlementApi();
      if (settlement && typeof settlement.prepareAdventureStateForVocabularyChallengeSave === 'function') {
        normalized = settlement.prepareAdventureStateForVocabularyChallengeSave(
          normalized,
          previousRewardState(user, normalized),
          { user }
        );
      }
      cacheRewardEvidence(user, normalized);
      if (!writePendingEnvelope(user, normalized)) {
        return saveVocabularyAdventureState(user, normalized);
      }
      dependencies.schedule(() => flushPendingVocabularyAdventureState(user).catch(() => {}));
      return true;
    }

    async function previewVocabularyAdventurePlan(today) {
      const user = dependencies.getCurrentUser();
      if (!ALLOWED_USERS.has(user) || dependencies.isTeacherUser()) {
        return { action: 'unavailable', state: core.defaultVocabularyAdventureState(), session: null };
      }
      const state = await loadVocabularyAdventureState(user, { mode: 'adventure' });
      const candidates = collectVisibleVocabularyAdventureCandidates();
      return core.resolveVocabularyAdventureSession({ candidates, state, today, userKey: user });
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

    async function saveCurrentVocabularyAdventureState(state, options) {
      const user = currentVocabularyAdventureUser();
      if (!user) return false;
      return options && options.queue === true
        ? queueVocabularyAdventureState(user, state)
        : saveVocabularyAdventureState(user, state);
    }

    if (root && typeof root.addEventListener === 'function' && !root.__vocabularyAdventurePendingSyncInstalled) {
      root.__vocabularyAdventurePendingSyncInstalled = true;
      root.addEventListener('online', () => {
        ALLOWED_USERS.forEach(user => flushPendingVocabularyAdventureState(user).catch(() => {}));
      });
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
      saveCurrentVocabularyAdventureState,
      queueVocabularyAdventureState,
      flushPendingVocabularyAdventureState,
      pendingStateIsNewer
    };
  }

  return { createVocabularyAdventureAdapter };
});
