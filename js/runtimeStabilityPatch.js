(function loadRuntimeStabilityModules(root, documentRef) {
  'use strict';
  if (!documentRef || root.__runtimeStabilityModulesRequested) return;
  root.__runtimeStabilityModulesRequested = true;
  const sources = [
    'js/runtimeFeatureLoading.js',
    'js/runtimeHomeStability.js',
    'js/runtimeVocabularyUx.js'
  ];
  if (documentRef.readyState === 'loading' && typeof documentRef.write === 'function') {
    documentRef.write(sources.map(source => `<script src="${source}" data-runtime-module><\/script>`).join(''));
    return;
  }
  sources.reduce((chain, source) => chain.then(() => new Promise((resolve, reject) => {
    const script = documentRef.createElement('script');
    script.src = source;
    script.async = false;
    script.dataset.runtimeModule = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    documentRef.head.appendChild(script);
  })), Promise.resolve()).catch(error => console.warn('runtime stability modules unavailable', error));
})(typeof globalThis !== 'undefined' ? globalThis : this, typeof document !== 'undefined' ? document : null);

// The question-type bootstrap keeps its base Promise in a module closure. Before
// this guard, one transient script failure permanently poisoned that Promise, so
// every later click (including the visible retry button) returned the same
// rejection until the whole page was refreshed. Recover by loading a fresh
// bootstrap instance and treating presentation-only helpers as optional.
(function exposeAdventureLoaderRecovery(root) {
  'use strict';
  if (!root || !root.document || root.__adventureLoaderRecoveryExposed) return;
  root.__adventureLoaderRecoveryExposed = true;

  const ADVENTURE_GROUPS = new Set(['adventurePlayer', 'adventureChallenge']);
  const OPTIONAL_SUPPORT = new Set([
    'data/vocabularyLessonAssets.js',
    'js/vocabularyPracticeUI.js',
    'js/vocabularyFeedbackErrorUI.js'
  ]);
  const wrappedLoaders = new WeakSet();
  const recoveryPromises = new Map();
  let recoveryAttempt = 0;

  function sourcePath(value) {
    return String(value || '').split(/[?#]/, 1)[0];
  }

  async function recoverAdventureGroup(group, originalError) {
    recoveryAttempt += 1;
    const bootstrapSource = `js/vocabularyQuestionTypesRepeatBootstrap.js?adventureLoaderRecovery=${recoveryAttempt}`;
    const baseScriptLoader = root.loadFeatureScript;
    if (typeof baseScriptLoader !== 'function') throw originalError;

    await baseScriptLoader.call(root, bootstrapSource);
    if (group === 'adventureChallenge') {
      await baseScriptLoader.call(root, 'js/vocabularyLessonGroups.js');
    }

    const patch = root.VocabularyQuestionTypesRepeatPatch;
    if (!patch || typeof patch.loadFeatureGroup !== 'function') throw originalError;

    const tolerantLoader = function tolerantAdventureSupportLoader(source) {
      const result = baseScriptLoader.call(this, source);
      if (!OPTIONAL_SUPPORT.has(sourcePath(source))) return result;
      return Promise.resolve(result).catch(error => {
        console.warn('optional adventure support unavailable', sourcePath(source), error && (error.message || error));
        return null;
      });
    };

    root.loadFeatureScript = tolerantLoader;
    try {
      await patch.loadFeatureGroup(group, fallbackGroup => {
        throw new Error(`Unexpected adventure fallback group: ${fallbackGroup}`);
      });
    } finally {
      if (root.loadFeatureScript === tolerantLoader) root.loadFeatureScript = baseScriptLoader;
    }

    if (group === 'adventureChallenge') {
      await baseScriptLoader.call(root, 'js/vocabularyAdventureLessonQueue.js');
    }
    root.installVocabularyAdventurePreviewLatestGuard?.();
  }

  function wrapLoadFeatureGroup() {
    const current = root.loadFeatureGroup;
    if (typeof current !== 'function'
        || current.__adventureLoaderRecoveryWrapped
        || wrappedLoaders.has(current)) {
      return false;
    }

    const wrapped = function adventureLoaderRecoveryWrapper(group, ...args) {
      if (!ADVENTURE_GROUPS.has(group)) return current.call(this, group, ...args);
      if (recoveryPromises.has(group)) return recoveryPromises.get(group);

      const promise = Promise.resolve()
        .then(() => current.call(this, group, ...args))
        .catch(error => recoverAdventureGroup(group, error))
        .finally(() => {
          if (recoveryPromises.get(group) === promise) recoveryPromises.delete(group);
        });
      recoveryPromises.set(group, promise);
      return promise;
    };

    wrapped.__adventureLoaderRecoveryWrapped = true;
    wrappedLoaders.add(current);
    root.loadFeatureGroup = wrapped;
    try { loadFeatureGroup = wrapped; } catch (_) {}
    return true;
  }

  function installAdventureLoaderRecovery() {
    return wrapLoadFeatureGroup();
  }

  root.installAdventureLoaderRecovery = installAdventureLoaderRecovery;
  installAdventureLoaderRecovery();

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', installAdventureLoaderRecovery, { once: true });
  }

  if (typeof root.setInterval === 'function') {
    let attempts = 0;
    const timer = root.setInterval(() => {
      attempts += 1;
      installAdventureLoaderRecovery();
      if (attempts >= 120) root.clearInterval(timer);
    }, 250);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);