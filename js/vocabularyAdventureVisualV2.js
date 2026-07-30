(function disableVocabularyAdventureVisualV2() {
  'use strict';

  // Emergency stability rollback.
  // The previous visual enhancer installed a broad MutationObserver on the
  // adventure screen and could repeatedly react to its own DOM mutations,
  // monopolising the browser main thread and making the whole page appear
  // unclickable. Keep this file as a harmless compatibility stub so older
  // cached lazy loaders can still request it safely.
  window.__VOCABULARY_ADVENTURE_VISUAL_V2_DISABLED__ = true;

  const root = document.getElementById('screenVocabularyAdventure');
  if (root) {
    root.classList.remove('vocabulary-adventure-v2');
    root.querySelectorAll('.vav2-fox, .vav2-fox-bubble, .vav2-transition').forEach(node => node.remove());
  }

  document.querySelectorAll('link[data-vav2-styles]').forEach(link => link.remove());
})();
