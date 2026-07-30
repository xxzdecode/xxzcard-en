(function vocabularyAdventureVisualV2Incremental() {
  'use strict';

  const SCREEN_ID = 'screenVocabularyAdventure';
  const LAYOUT_STYLESHEET = 'styles-vocabulary-adventure-v2.css';
  const WRAPPED_FUNCTIONS = [
    'openVocabularyAdventure',
    'answerVocabularyAdventure',
    'answerVocabularyAdventureReviewChoice',
    'submitVocabularyAdventureReviewInput',
    'submitVocabularyAdventureReviewOrder',
    'selectVocabularyAdventureMatchCard',
    'selectVocabularyAdventureReviewToken',
    'clearVocabularyAdventureReviewOrder',
    'retryVocabularyAdventureResultSave'
  ];

  const state = {
    refreshTimer: 0,
    installAttempts: 0,
    autoAdvanceTimer: 0,
    transitionRunning: false,
    lastTransitionAt: -1
  };

  function screen() {
    return document.getElementById(SCREEN_ID);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureLayoutStylesheet() {
    // Remove every legacy V2 stylesheet/override. Those rules changed the original
    // topbar, progress bar, question card and option palette.
    document.querySelectorAll('link[data-vav2-styles]').forEach(link => link.remove());
    const oldOverride = document.getElementById('vav2SafeOverrides');
    if (oldOverride) oldOverride.remove();

    if (document.querySelector(`link[data-vav2-layout][href="${LAYOUT_STYLESHEET}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LAYOUT_STYLESHEET;
    link.dataset.vav2Layout = '1';
    document.head.appendChild(link);
  }

  function ensureGuide() {
    const root = screen();
    if (!root) return null;

    root.classList.add('vocabulary-adventure-v2-incremental');
    root.classList.remove('vocabulary-adventure-v2');
    root.querySelectorAll('.vav2-fox, .vav2-fox-bubble').forEach(node => node.remove());

    let panel = root.querySelector('.vav2-guide-panel');
    if (!panel) {
      panel = document.createElement('aside');
      panel.className = 'vav2-guide-panel';
      panel.setAttribute('aria-live', 'polite');
      panel.innerHTML = `
        <div class="vav2-guide-bubble" hidden></div>
        <div class="vav2-guide-fox" aria-hidden="true"></div>`;
      root.appendChild(panel);
    }
    return panel;
  }

  function visible(element) {
    if (!element || element.hidden) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    return !style || (style.display !== 'none' && style.visibility !== 'hidden');
  }

  function questionLabel() {
    const root = screen();
    const label = root && root.querySelector('.vocabulary-adventure-question-label');
    return label ? label.textContent.trim() : '';
  }

  function hintText() {
    const label = questionLabel();
    if (/听/.test(label)) return '注意单词开头和结尾的声音，再试一次。';
    if (/看意思/.test(label)) return '先想一想这个意思会出现在哪种情境里。';
    if (/看单词/.test(label)) return '先轻声读一遍，再想想它通常表达什么。';
    if (/音标/.test(label)) return '慢一点看音标，把声音分成两小段来想。';
    if (/拼|字母/.test(label)) return '先想读音，再检查每一段声音对应的字母。';
    return '再看一看、想一想，然后重新试一次。';
  }

  function setBubble(panel, text, allowReplay) {
    if (!panel) return;
    const bubble = panel.querySelector('.vav2-guide-bubble');
    if (!bubble) return;

    if (!text) {
      bubble.hidden = true;
      bubble.replaceChildren();
      return;
    }

    bubble.replaceChildren(document.createTextNode(text));
    if (allowReplay && typeof window.speakVocabularyAdventureCurrent === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vav2-bubble-audio';
      button.textContent = '🔊 再听一次';
      button.addEventListener('click', () => window.speakVocabularyAdventureCurrent());
      bubble.appendChild(document.createElement('br'));
      bubble.appendChild(button);
    }
    bubble.hidden = false;
  }

  function preparePrimaryAudio() {
    const root = screen();
    if (!root) return false;

    const controls = [...root.querySelectorAll('.vocabulary-adventure-audio-prompt')];
    controls.forEach((control, index) => {
      control.hidden = index > 0;
      control.classList.toggle('vav2-primary-audio', index === 0);
      if (index === 0) {
        control.innerHTML = '<span aria-hidden="true">🔊</span><b>听读音</b>';
        control.setAttribute('aria-label', '听读音');
      }
    });

    const question = root.querySelector('.vocabulary-adventure-question');
    if (question) question.classList.toggle('vav2-has-primary-audio', controls.length > 0);
    return controls.length > 0;
  }

  function prepareResultAudio() {
    const root = screen();
    if (!root) return;
    const controls = [...root.querySelectorAll('.vocabulary-adventure-speak')];
    controls.forEach((control, index) => {
      control.hidden = index > 0;
      control.classList.toggle('vav2-result-audio', index === 0);
      if (index === 0) control.setAttribute('aria-label', '听读音');
    });
  }

  function prepareHint(panel, hasPrimaryAudio) {
    const root = screen();
    if (!root) return;
    const hints = [...root.querySelectorAll(
      '.vocabulary-adventure-hint:not([hidden]), .vocabulary-adventure-review-hint:not([hidden])'
    )];

    root.querySelectorAll('.vocabulary-adventure-hint, .vocabulary-adventure-review-hint')
      .forEach(hint => hint.classList.toggle('vav2-hint-source', hints.includes(hint)));

    if (!hints.length) {
      setBubble(panel, '', false);
      return;
    }

    // Listening questions already have the fixed “听读音” button. Non-listening
    // questions get exactly one “再听一次” inside the fox bubble after a hint.
    setBubble(panel, hintText(), !hasPrimaryAudio);
  }

  function prepareMainTopbar() {
    const title = byId('vocabularyAdventureStageTitle');
    if (title) title.textContent = '词汇探险';
  }

  function prepareActionPosition() {
    const root = screen();
    const action = byId('vocabularyAdventureAction');
    if (!root || !action) return;
    root.classList.toggle('vav2-action-visible', visible(action));
  }

  function progressNumbers() {
    const text = (byId('vocabularyAdventureTotalProgress') || {}).textContent || '';
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match ? { done: Number(match[1]), total: Number(match[2]) } : { done: 0, total: 0 };
  }

  function prepareResults(panel) {
    const root = screen();
    if (!root) return;
    const result = root.querySelector('.vocabulary-adventure-result');
    const summary = root.querySelector('.vocabulary-adventure-summary, .vav2-final-panel');
    if (result || summary) setBubble(panel, '', false);
    prepareResultAudio();
  }

  function refresh() {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = 0;
    const root = screen();
    if (!root) return;

    ensureLayoutStylesheet();
    prepareMainTopbar();
    const panel = ensureGuide();
    const hasPrimaryAudio = preparePrimaryAudio();
    prepareHint(panel, hasPrimaryAudio);
    prepareResults(panel);
    prepareActionPosition();
  }

  function scheduleRefresh(delay) {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(refresh, Number(delay) || 0);
  }

  function afterResult(result) {
    if (result && typeof result.finally === 'function') {
      return result.finally(() => {
        scheduleRefresh(0);
        window.setTimeout(refresh, 90);
      });
    }
    scheduleRefresh(0);
    window.setTimeout(refresh, 90);
    return result;
  }

  function wrapAfter(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.vav2IncrementalWrapped) return false;
    const wrapped = function wrappedVocabularyAdventureAction() {
      let result;
      try {
        result = original.apply(this, arguments);
      } catch (error) {
        scheduleRefresh(0);
        throw error;
      }
      return afterResult(result);
    };
    wrapped.vav2IncrementalWrapped = true;
    wrapped.vav2IncrementalOriginal = original;
    window[name] = wrapped;
    return true;
  }

  function showTransition(callback) {
    const root = screen();
    if (!root) {
      callback();
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'vav2-transition';
    overlay.setAttribute('aria-hidden', 'true');
    root.appendChild(overlay);
    window.setTimeout(() => {
      overlay.remove();
      callback();
    }, 480);
  }

  function wrapNext() {
    const original = window.nextVocabularyAdventure;
    if (typeof original !== 'function' || original.vav2IncrementalWrapped) return false;
    const wrapped = function wrappedNextVocabularyAdventure() {
      const context = this;
      const args = arguments;
      const progress = progressNumbers();
      const boundary = progress.done > 0 && progress.done < progress.total && progress.done % 10 === 0
        ? progress.done
        : 0;

      if (!boundary || state.lastTransitionAt === boundary || state.transitionRunning) {
        return afterResult(original.apply(context, args));
      }

      state.lastTransitionAt = boundary;
      state.transitionRunning = true;
      return new Promise((resolve, reject) => {
        showTransition(() => {
          let result;
          try {
            result = original.apply(context, args);
          } catch (error) {
            state.transitionRunning = false;
            scheduleRefresh(0);
            reject(error);
            return;
          }
          Promise.resolve(result).then(resolve, reject).finally(() => {
            state.transitionRunning = false;
            scheduleRefresh(0);
          });
        });
      });
    };
    wrapped.vav2IncrementalWrapped = true;
    wrapped.vav2IncrementalOriginal = original;
    window.nextVocabularyAdventure = wrapped;
    return true;
  }

  function installWrappers() {
    WRAPPED_FUNCTIONS.forEach(wrapAfter);
    wrapNext();
    state.installAttempts += 1;
    if (state.installAttempts < 8) window.setTimeout(installWrappers, 250);
  }

  window.__VOCABULARY_ADVENTURE_VISUAL_V2_INCREMENTAL__ = true;
  ensureLayoutStylesheet();
  refresh();
  installWrappers();
  window.setTimeout(refresh, 120);
})();
