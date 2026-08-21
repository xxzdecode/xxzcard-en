(function installRuntimeFeatureLoading(root) {
  'use strict';
  if (!root || !root.document || root.__runtimeFeatureLoadingInstalled) return;
  root.__runtimeFeatureLoadingInstalled = true;

  const entries = Object.freeze({
    openVocabularyAdventure: ['#vocabularyAdventurePreviewEntry', '词汇探险'],
    openVocabularyAdventureChallenge: ['#vocabularyAdventureChallengeEntry', '单词挑战'],
    openGrammarChallengeList: ['#grammarChallengeHomeEntry', '语法挑战'],
    openCoursewareList: ['#studentClassroomPracticeEntry', '随堂练习'],
    openVocabularyReviewList: ['#teacherVocabularyGuideEntry', '新词导览'],
    openThemeQuizList: ['[onclick*="openThemeQuizList"]', '专项小游戏'],
    openWordCards: ['[onclick*="openWordCards"]', '单词卡'],
    openPhonemeTraining: ['[onclick*="openPhonemeTraining"]', '音标训练']
  });
  const wrappedFunctions = new WeakSet();
  const WRAPPER_MARKERS = Object.freeze([
    '__activityAware',
    '__questionRepeatWrapped'
  ]);

  function installStyles() {
    if (root.document.getElementById('runtimeFeatureLoadingStyles')) return;
    const style = root.document.createElement('style');
    style.id = 'runtimeFeatureLoadingStyles';
    style.textContent = `
      [data-runtime-feature-loading="true"]{position:relative}
      [data-runtime-feature-loading="true"]>*:not(.runtime-feature-loading-badge){opacity:.62}
      .runtime-feature-loading-badge{position:absolute;inset:auto 10px 10px 10px;z-index:20;min-height:34px;padding:7px 12px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:7px;background:rgba(255,255,255,.95);box-shadow:0 7px 20px rgba(48,79,99,.16);color:#365f7b;font-size:13px;font-weight:900;pointer-events:none}
      .runtime-feature-loading-badge::before{content:'';width:13px;height:13px;border:2px solid rgba(54,95,123,.22);border-top-color:#365f7b;border-radius:50%;animation:runtime-feature-spin .75s linear infinite}
      @keyframes runtime-feature-spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){.runtime-feature-loading-badge::before{animation:none}}
    `;
    root.document.head.appendChild(style);
  }

  function directChild(entry, className) {
    return Array.from(entry?.children || []).find(child => child.classList?.contains(className)) || null;
  }

  function setLoading(name, loading) {
    const config = entries[name];
    if (!config) return;
    const entry = root.document.querySelector(config[0]);
    if (!entry) return;
    let badge = directChild(entry, 'runtime-feature-loading-badge');
    if (loading) {
      entry.dataset.runtimeFeatureLoading = 'true';
      entry.setAttribute('aria-busy', 'true');
      if (!badge) {
        badge = root.document.createElement('span');
        badge.className = 'runtime-feature-loading-badge';
        badge.setAttribute('role', 'status');
        badge.textContent = `正在加载${config[1]}…`;
        entry.appendChild(badge);
      }
      return;
    }
    delete entry.dataset.runtimeFeatureLoading;
    entry.removeAttribute('aria-busy');
    badge?.remove();
  }

  function wrap(name) {
    const current = root[name];
    if (typeof current !== 'function' || current.__runtimeFeatureLoadingWrapped || wrappedFunctions.has(current)) return;
    const wrapped = async function runtimeFeatureLoadingWrapper(...args) {
      const timer = root.setTimeout(() => setLoading(name, true), 160);
      const safetyTimer = root.setTimeout(() => setLoading(name, false), 15000);
      try {
        return await current.apply(this, args);
      } finally {
        root.clearTimeout(timer);
        root.clearTimeout(safetyTimer);
        setLoading(name, false);
        root.setTimeout(() => root.RuntimeVocabularyUx?.scan?.(), 0);
      }
    };
    wrapped.__runtimeFeatureLoadingWrapped = true;
    wrapped.__runtimeFeatureLoadingInner = current;
    WRAPPER_MARKERS.forEach(marker => {
      if (current[marker] === true) wrapped[marker] = true;
    });
    wrappedFunctions.add(current);
    root[name] = wrapped;
  }

  installStyles();
  Object.keys(entries).forEach(wrap);
  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', () => {
      Object.keys(entries).forEach(wrap);
    }, { once: true });
  }
  let attempts = 0;
  const timer = root.setInterval(() => {
    attempts += 1;
    Object.keys(entries).forEach(wrap);
    if (attempts >= 120) root.clearInterval(timer);
  }, 250);
})(typeof globalThis !== 'undefined' ? globalThis : this);
