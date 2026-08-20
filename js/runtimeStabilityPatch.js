(function loadRuntimeStabilityModules(root, documentRef) {
  'use strict';
  if (!documentRef || root.__runtimeStabilityModulesRequested) return;
  root.__runtimeStabilityModulesRequested = true;
  const sources = [
    'js/runtimeFeatureLoading.js',
    'js/runtimeHomeStability.js',
    'js/runtimeVocabularyUx.js'
  ];
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
