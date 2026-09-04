(function vocabularyAdventureGuidePoolModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.VocabularyAdventureLessonQueue = api;
    api.installVocabularyAdventureGuidePoolBrowserPatch(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureGuidePool(core) {
  'use strict';

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function collectCurrentVocabularyGuideCandidates(options) {
    const settings = plainObject(options) ? options : {};
    return core.collectVocabularyGuideCandidates({
      groups: settings.groups,
      masterCards: settings.masterCards
    });
  }

  function installVocabularyAdventureGuidePoolBrowserPatch(target) {
    const browserRoot = target || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!browserRoot || !core || browserRoot.__vocabularyAdventureLessonQueueInstalled) return false;
    if (typeof browserRoot.collectVisibleVocabularyAdventureCandidates !== 'function'
      || typeof browserRoot.getVocabularyLessonAvailableCategoryGroups !== 'function') return false;

    browserRoot.__vocabularyAdventureLessonQueueInstalled = true;
    const collectCurrentGuide = function collectVisibleVocabularyAdventureGuideCandidates() {
      const data = plainObject(browserRoot.appData) ? browserRoot.appData : {};
      return collectCurrentVocabularyGuideCandidates({
        groups: browserRoot.getVocabularyLessonAvailableCategoryGroups(),
        masterCards: data.masterCards
      });
    };
    browserRoot.collectVisibleVocabularyAdventureCandidates = collectCurrentGuide;
    try { collectVisibleVocabularyAdventureCandidates = collectCurrentGuide; } catch (_) {}
    return true;
  }

  return Object.freeze({
    collectCurrentVocabularyGuideCandidates,
    installVocabularyAdventureGuidePoolBrowserPatch,
    installVocabularyAdventureLessonQueueBrowserPatch: installVocabularyAdventureGuidePoolBrowserPatch
  });
});
