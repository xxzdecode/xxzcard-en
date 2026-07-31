(function vocabularyPracticeUIModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.VocabularyPracticeUI = api;
    api.install();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyPracticeUI(root) {
  'use strict';

  const STYLE_ID = 'vocabularyPracticeIntegrationStyles';
  const FEATURE_PROMPT_PREFIX = '__VOCAB_CUE__:';
  const MISSING_PROMPT_PREFIX = '__VOCAB_MISSING__:';
  const EDITABLE_SELECTOR = [
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    '[data-allow-text-selection="true"]'
  ].join(',');
  const OPTION_SELECTOR = [
    '#screenVocabularyAdventure .vocabulary-adventure-options button',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-options button'
  ].join(',');
  const PROTECTED_SELECTOR = [
    '#screenVocabularyAdventure .vocabulary-adventure-question-label',
    '#screenVocabularyAdventure .vocabulary-adventure-prompt-text',
    '#screenVocabularyAdventure .vocabulary-adventure-confirmation-note',
    '#screenVocabularyAdventure .vocabulary-adventure-order-prompt',
    '#screenVocabularyAdventure .vocabulary-adventure-order-answer',
    '#screenVocabularyAdventure .vocabulary-adventure-match-status',
    '#screenVocabularyAdventure .vocabulary-adventure-options button',
    '#screenVocabularyAdventure .vocabulary-adventure-order-pool button',
    '#screenVocabularyAdventure .vocabulary-adventure-match-board button',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-instruction',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-question h2',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-prompt-text',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-order-answer',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-options button',
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button',
    '#screenVocabularyAdventure .vte-shell',
    '#screenVocabularyAdventureChallenge .vte-shell'
  ].join(',');
  const state = {
    installed: false,
    observers: new Map()
  };

  function decodeCue(value) {
    const raw = String(value || '');
    const definitions = [
      ['missingLetters', MISSING_PROMPT_PREFIX],
      ['feature', FEATURE_PROMPT_PREFIX]
    ];
    for (const [kind, prefix] of definitions) {
      if (!raw.startsWith(prefix)) continue;
      try {
        return { kind, value: JSON.parse(decodeURIComponent(raw.slice(prefix.length))) };
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function isAnswerOption(node) {
    return !!node
      && typeof node.matches === 'function'
      && node.matches(OPTION_SELECTOR);
  }

  function optionStateLabel(button) {
    if (!button || !button.classList) return '';
    if (button.classList.contains('is-correct')) return '正确答案';
    if (button.classList.contains('is-wrong')) return '错误答案';
    if (button.classList.contains('is-selected')) return '已选择';
    return '';
  }

  function optionBaseLabel(button) {
    if (!button) return '';
    const saved = button.dataset && button.dataset.vocabularyOptionLabel;
    const label = saved || String(button.textContent || '').trim().replace(/\s+/g, ' ');
    if (button.dataset && !saved) button.dataset.vocabularyOptionLabel = label;
    return label;
  }

  function syncOptionState(button) {
    if (!isAnswerOption(button) || typeof button.setAttribute !== 'function') return;
    const label = optionBaseLabel(button);
    const stateLabel = optionStateLabel(button);
    button.setAttribute('aria-label', stateLabel ? `${label}，${stateLabel}` : label);
    if (stateLabel) button.dataset.answerState = stateLabel;
    else delete button.dataset.answerState;
  }

  function syncOptionStates(container) {
    const host = container && typeof container.querySelectorAll === 'function'
      ? container
      : root.document;
    if (!host) return;
    host.querySelectorAll('.vocabulary-adventure-options button').forEach(syncOptionState);
    if (isAnswerOption(host)) syncOptionState(host);
  }

  function clearSelected(container) {
    if (!container) return;
    container.querySelectorAll('button.is-selected').forEach(button => {
      if (!button.classList.contains('is-correct') && !button.classList.contains('is-wrong')) {
        button.classList.remove('is-selected');
      }
      syncOptionState(button);
    });
  }

  function handleOptionClick(event) {
    const button = event.target && event.target.closest
      ? event.target.closest(OPTION_SELECTOR)
      : null;
    if (!button || button.disabled) return;
    const container = button.closest('.vocabulary-adventure-options');
    clearSelected(container);
    button.classList.add('is-selected');
    syncOptionState(button);
  }

  function isProtectedTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    if (target.closest(EDITABLE_SELECTOR)) return false;
    return !!target.closest(PROTECTED_SELECTOR);
  }

  function preventProtectedInteraction(event) {
    if (isProtectedTarget(event.target)) event.preventDefault();
  }

  function makeAudioCue(node, cue) {
    const question = node.closest('.vocabulary-adventure-question');
    const label = question && question.querySelector(
      '.vocabulary-adventure-question-label, .vocabulary-adventure-instruction'
    );
    if (label) label.textContent = '听一听，选择中文意思';
    node.textContent = '';

    const button = root.document.createElement('button');
    button.type = 'button';
    button.className = 'vocabulary-adventure-audio-prompt';
    button.innerHTML = '<span aria-hidden="true">🔊</span> 再听一次';
    button.setAttribute('aria-label', '播放单词发音');
    button.addEventListener('click', () => {
      if (question && question.closest('#screenVocabularyAdventureChallenge')) {
        root.speakVocabularyAdventureChallengeWord?.();
      } else {
        root.speakVocabularyAdventureCurrent?.();
      }
    });
    node.appendChild(button);
    if (cue && cue.meaning) node.dataset.meaning = cue.meaning;
    root.setTimeout(() => button.click(), 80);
  }

  function makeMissingCue(node, cue) {
    const question = node.closest('.vocabulary-adventure-question');
    const label = question && question.querySelector(
      '.vocabulary-adventure-question-label, .vocabulary-adventure-instruction, h2'
    );
    if (label) label.textContent = '选择缺失字母';
    node.textContent = '';

    const wrap = root.document.createElement('div');
    wrap.className = 'vocabulary-adventure-missing-cue';
    const visualHolder = root.document.createElement('div');
    visualHolder.className = 'vocabulary-adventure-missing-visual';
    const fallbackText = cue.emoji || cue.placeholder || '📝';

    if (cue.image) {
      const image = root.document.createElement('img');
      image.src = cue.image;
      image.alt = cue.meaning || '单词图片';
      image.addEventListener('error', () => {
        visualHolder.textContent = fallbackText;
        visualHolder.classList.add('is-fallback');
      }, { once: true });
      visualHolder.appendChild(image);
    } else {
      visualHolder.textContent = fallbackText;
      visualHolder.classList.add('is-fallback');
    }

    const copy = root.document.createElement('div');
    copy.className = 'vocabulary-adventure-missing-copy';
    const meaning = root.document.createElement('p');
    meaning.textContent = cue.meaning || '根据图示选择缺失字母';
    const masked = root.document.createElement('strong');
    masked.textContent = cue.maskedWord || '';
    copy.append(meaning, masked);
    wrap.append(visualHolder, copy);
    node.appendChild(wrap);
  }

  function enhancePromptNode(node) {
    if (!node || node.dataset.vocabularyCueEnhanced === '1') return;
    const decoded = decodeCue(node.textContent);
    if (decoded) {
      node.dataset.vocabularyCueEnhanced = '1';
      if (decoded.kind === 'missingLetters') {
        makeMissingCue(node, decoded.value || {});
      } else if (decoded.value && decoded.value.taskType === 'audioToMeaning') {
        makeAudioCue(node, decoded.value);
      }
      return;
    }

    const question = node.closest
      ? node.closest('#screenVocabularyAdventure .vocabulary-adventure-question')
      : null;
    const label = question && question.querySelector('.vocabulary-adventure-question-label');
    const prompt = String(node.textContent || '').trim();
    if (label && label.textContent.trim() === '抗遗忘检索' && /^\/.+\/$/.test(prompt)) {
      label.textContent = '看音标，选择中文意思';
    }
  }

  function scan(rootNode) {
    if (!rootNode || rootNode.nodeType !== 1) return;
    if (rootNode.matches?.('.vocabulary-adventure-prompt-text')) enhancePromptNode(rootNode);
    rootNode.querySelectorAll?.('.vocabulary-adventure-prompt-text').forEach(enhancePromptNode);
    syncOptionStates(rootNode);
  }

  function observeBody(id) {
    const body = root.document.getElementById(id);
    if (!body || state.observers.has(id) || typeof root.MutationObserver !== 'function') return;
    const observer = new root.MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'attributes') syncOptionState(record.target);
        record.addedNodes.forEach(node => scan(node));
      });
      scan(body);
    });
    observer.observe(body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'disabled']
    });
    state.observers.set(id, observer);
    scan(body);
  }

  function installStyles() {
    if (!root.document || root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #screenVocabularyAdventure .vocabulary-adventure-options,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options{gap:12px}
      #screenVocabularyAdventure .vocabulary-adventure-options button,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button{position:relative;min-height:58px;padding:10px 52px 10px 14px;border:2px solid #d8e8f3;border-radius:18px;background:#f8fcff;color:#2d526f;display:flex;align-items:center;justify-content:center;font:inherit;font-size:clamp(15px,2vw,18px);font-weight:800;line-height:1.3;text-align:center;cursor:pointer;touch-action:manipulation;transition:transform 120ms ease,border-color 120ms ease,background 120ms ease,box-shadow 120ms ease}
      #screenVocabularyAdventure .vocabulary-adventure-options button:active:not(:disabled),
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button:active:not(:disabled){transform:scale(.98)}
      #screenVocabularyAdventure .vocabulary-adventure-options button:focus-visible,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button:focus-visible{outline:3px solid rgba(106,169,221,.42);outline-offset:2px}
      #screenVocabularyAdventure .vocabulary-adventure-options button::after,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button::after{content:'';position:absolute;right:14px;top:50%;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;transform:translateY(-50%) scale(.8);opacity:0;font-size:22px;font-weight:950;line-height:1;transition:opacity 120ms ease,transform 120ms ease}
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-selected,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-selected{border-color:#6aa9dd;background:#e5f3ff;color:#285c87;box-shadow:0 0 0 3px rgba(106,169,221,.14)}
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-correct,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-correct{border-color:#69b98f;background:#e1f6ea;color:#286548;box-shadow:0 0 0 3px rgba(105,185,143,.12)}
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-correct::after,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-correct::after{content:'✓';opacity:1;transform:translateY(-50%) scale(1);background:#d0f0dd;color:#26734d}
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-wrong,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-wrong{border-color:#e69a9a;background:#fff0f0;color:#9a4848;box-shadow:0 0 0 3px rgba(230,154,154,.12)}
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-wrong::after,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-wrong::after{content:'×';opacity:1;transform:translateY(-50%) scale(1);background:#ffe0e0;color:#a63f3f}
      #screenVocabularyAdventure .vocabulary-adventure-options button:disabled,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button:disabled{cursor:default;opacity:.62;transform:none}
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-selected:disabled,
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-correct:disabled,
      #screenVocabularyAdventure .vocabulary-adventure-options button.is-wrong:disabled,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-selected:disabled,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-correct:disabled,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-wrong:disabled{opacity:1}
      #screenVocabularyAdventureChallenge .vocabulary-adventure-order-answer,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button{border-radius:16px}
      #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank{gap:10px}
      #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button{min-height:48px;padding:9px 14px;border:2px solid #d8e8f3;background:#f8fcff;color:#2d526f;touch-action:manipulation}
      #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button:disabled{border-color:#b8d4e8;background:#e5f3ff;color:#315d7f;opacity:.72}
      .vocabulary-adventure-missing-cue{display:grid;grid-template-columns:minmax(72px,112px) minmax(0,1fr);align-items:center;gap:14px;width:min(560px,100%);margin:0 auto}
      .vocabulary-adventure-missing-visual{width:100%;min-height:90px;display:grid;place-items:center;border-radius:18px;background:#eef6ef;overflow:hidden}
      .vocabulary-adventure-missing-visual img{width:100%;height:112px;object-fit:contain}
      .vocabulary-adventure-missing-visual.is-fallback{font-size:56px}
      .vocabulary-adventure-missing-copy p{margin:0 0 8px;font-weight:700}
      .vocabulary-adventure-missing-copy strong{font-size:clamp(26px,5vw,44px);letter-spacing:.12em}
      ${PROTECTED_SELECTOR}{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
      #screenVocabularyAdventure input,#screenVocabularyAdventure textarea,#screenVocabularyAdventure select,#screenVocabularyAdventure [contenteditable="true"],#screenVocabularyAdventure [contenteditable="plaintext-only"],#screenVocabularyAdventure [data-allow-text-selection="true"],#screenVocabularyAdventureChallenge input,#screenVocabularyAdventureChallenge textarea,#screenVocabularyAdventureChallenge select,#screenVocabularyAdventureChallenge [contenteditable="true"],#screenVocabularyAdventureChallenge [contenteditable="plaintext-only"],#screenVocabularyAdventureChallenge [data-allow-text-selection="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}
      @media (orientation:landscape) and (min-width:768px){#screenVocabularyAdventureChallenge .vocabulary-adventure-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:620px){#screenVocabularyAdventureChallenge .vocabulary-adventure-options{grid-template-columns:1fr;gap:9px}#screenVocabularyAdventure .vocabulary-adventure-options button,#screenVocabularyAdventureChallenge .vocabulary-adventure-options button{min-height:50px;font-size:16px}.vocabulary-adventure-missing-cue{grid-template-columns:72px minmax(0,1fr);gap:10px}.vocabulary-adventure-missing-visual{min-height:72px}.vocabulary-adventure-missing-visual img{height:78px}}
      @media (prefers-reduced-motion:reduce){#screenVocabularyAdventure .vocabulary-adventure-options button,#screenVocabularyAdventure .vocabulary-adventure-options button::after,#screenVocabularyAdventureChallenge .vocabulary-adventure-options button,#screenVocabularyAdventureChallenge .vocabulary-adventure-options button::after{transition:none!important}}
    `;
    root.document.head.appendChild(style);
  }

  function install() {
    if (!root.document || state.installed) return;
    state.installed = true;
    installStyles();
    root.document.addEventListener('click', handleOptionClick, true);
    root.document.addEventListener('selectstart', preventProtectedInteraction, true);
    root.document.addEventListener('contextmenu', preventProtectedInteraction, true);
    root.document.addEventListener('dragstart', preventProtectedInteraction, true);
    observeBody('vocabularyAdventureBody');
    observeBody('vocabularyAdventureChallengeBody');
  }

  function afterFeatureGroup() {
    install();
    observeBody('vocabularyAdventureBody');
    observeBody('vocabularyAdventureChallengeBody');
    scan(root.document && root.document.body);
  }

  return Object.freeze({
    FEATURE_PROMPT_PREFIX,
    MISSING_PROMPT_PREFIX,
    decodeCue,
    isAnswerOption,
    optionStateLabel,
    syncOptionState,
    syncOptionStates,
    isProtectedTarget,
    install,
    afterFeatureGroup
  });
});
