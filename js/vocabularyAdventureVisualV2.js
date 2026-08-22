(function vocabularyAdventureVisualV2Incremental() {
  'use strict';

  window.__VOCABULARY_ADVENTURE_VISUAL_V2_INCREMENTAL__ = true;

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
    refreshQueued:false,
    transitionRunning:false,
    lastTransitionAt:-1,
    hintSignature:'',
    hintCollapsed:false
  };
  const scheduleMicrotask = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : callback => Promise.resolve().then(callback);

  function screen() { return document.getElementById(SCREEN_ID); }
  function byId(id) { return document.getElementById(id); }
  function visible(element) {
    if (!element || element.hidden) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    return !style || (style.display !== 'none' && style.visibility !== 'hidden');
  }
  function replaceChildrenCompat(node, ...children) {
    if (!node) return;
    if (typeof node.replaceChildren === 'function') {
      node.replaceChildren(...children);
      return;
    }
    while (node.firstChild) node.removeChild(node.firstChild);
    children.forEach(child => {
      if (child) node.appendChild(child);
    });
  }

  function ensureLayoutStylesheet() {
    let link = document.querySelector(`link[href="${LAYOUT_STYLESHEET}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LAYOUT_STYLESHEET;
      link.dataset.vav2Layout = '1';
    }

    if (link.sheet || link.dataset.vav2Loaded === '1') return true;

    if (!link.dataset.vav2LoadBound) {
      link.dataset.vav2LoadBound = '1';
      link.addEventListener('load', () => {
        link.dataset.vav2Loaded = '1';
        queueRefresh();
      }, { once:true });
      link.addEventListener('error', () => {
        state.refreshQueued = false;
        console.warn('Vocabulary adventure visual stylesheet failed to load');
      }, { once:true });
    }

    if (!link.isConnected) document.head.appendChild(link);
    return false;
  }

  function ensureGuide() {
    const root = screen();
    if (!root) return null;
    root.classList.add('vocabulary-adventure-v2-incremental');
    root.querySelectorAll('.vav2-fox,.vav2-fox-bubble').forEach(node => node.remove());
    let panel = root.querySelector('.vav2-guide-panel');
    if (!panel) {
      panel = document.createElement('aside');
      panel.className = 'vav2-guide-panel';
      panel.setAttribute('aria-live','polite');
      panel.innerHTML = '<div class="vav2-guide-bubble" id="vav2GuideBubble" hidden></div><img class="vav2-guide-fox" src="assets/vocabulary-adventure/fox.webp" width="746" height="928" alt="小狐狸提示" role="button" tabindex="0" aria-controls="vav2GuideBubble" aria-expanded="false" aria-label="小狐狸提示，当前没有提示">';
      root.appendChild(panel);
    }
    bindGuideInteractions(panel);
    return panel;
  }

  function setGuideToggleState(panel, hasHint) {
    const fox = panel && panel.querySelector('.vav2-guide-fox');
    if (!fox) return;
    fox.dataset.hasHint = hasHint ? 'true' : 'false';
    fox.setAttribute('aria-expanded',hasHint && !state.hintCollapsed ? 'true' : 'false');
    fox.setAttribute('aria-label',!hasHint
      ? '小狐狸提示，当前没有提示'
      : state.hintCollapsed
        ? '小狐狸提示，点击展开提示'
        : '小狐狸提示，点击收起提示');
  }

  function toggleGuideHint(panel) {
    if (!state.hintSignature) return;
    state.hintCollapsed = !state.hintCollapsed;
    const bubble = panel && panel.querySelector('.vav2-guide-bubble');
    if (bubble) bubble.hidden = state.hintCollapsed;
    setGuideToggleState(panel,true);
    if (!state.hintCollapsed) queueRefresh();
  }

  function bindGuideInteractions(panel) {
    if (!panel || panel.dataset.hintToggleBound === 'true') return;
    panel.dataset.hintToggleBound = 'true';
    const fox = panel.querySelector('.vav2-guide-fox');
    fox?.addEventListener('click',() => toggleGuideHint(panel));
    fox?.addEventListener('keydown',event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleGuideHint(panel);
    });
  }

  function setBubble(panel, sourceHint, allowReplay) {
    if (!panel) return;
    const bubble = panel.querySelector('.vav2-guide-bubble');
    if (!bubble) return;
    if (!sourceHint) {
      bubble.hidden = true;
      replaceChildrenCompat(bubble);
      return;
    }

    const copy = sourceHint.cloneNode(true);
    copy.querySelectorAll('button').forEach(button => button.remove());
    replaceChildrenCompat(bubble, ...Array.from(copy.childNodes));
    if (allowReplay && typeof window.speakVocabularyAdventureCurrent === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vav2-bubble-audio';
      button.textContent = '🔊 再听一次';
      button.addEventListener('click', event => {
        event.stopPropagation();
        window.speakVocabularyAdventureCurrent();
      });
      bubble.appendChild(button);
    }
    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'vav2-bubble-collapse';
    collapse.textContent = '收起';
    collapse.setAttribute('aria-label','收起小狐狸提示');
    collapse.addEventListener('click',event => {
      event.stopPropagation();
      state.hintCollapsed = true;
      bubble.hidden = true;
      setGuideToggleState(panel,true);
    });
    bubble.appendChild(collapse);
    bubble.hidden = state.hintCollapsed;
  }

  function prepareTopbarContent() {
    const root = screen();
    if (!root) return;
    const title = byId('vocabularyAdventureStageTitle');
    if (title) title.textContent = '词汇探险';
    ['vocabularyAdventureScreeningProgress','vocabularyAdventureTotalProgress','vocabularyAdventureSessionDate'].forEach(id => {
      const node = byId(id);
      if (node) node.hidden = true;
    });
    const secondary = root.querySelector('.vocabulary-adventure-progress-row.is-secondary');
    if (secondary) secondary.hidden = true;
  }

  function preparePrimaryAudio() {
    const root = screen();
    if (!root) return false;
    const controls = [...root.querySelectorAll('.vocabulary-adventure-audio-prompt')].filter(control => !control.closest('[hidden]'));
    controls.forEach((control,index) => {
      control.hidden = index > 0;
      control.classList.toggle('vav2-primary-audio',index === 0);
      if (index === 0) {
        control.innerHTML = '<span aria-hidden="true">🔊</span><b>听读音</b>';
        control.setAttribute('aria-label','听读音');
      }
    });
    const question = root.querySelector('.vocabulary-adventure-question');
    if (question) question.classList.toggle('vav2-has-primary-audio',controls.length > 0);
    return controls.length > 0;
  }

  function prepareHint(panel, hasPrimaryAudio) {
    const root = screen();
    if (!root) return;
    const allHints = [...root.querySelectorAll('.vocabulary-adventure-hint,.vocabulary-adventure-review-hint')];
    const visibleHints = allHints.filter(visible);
    allHints.forEach(hint => hint.classList.toggle('vav2-hint-source',visibleHints.includes(hint)));
    const sourceHint = visibleHints[0] || null;
    const signature = sourceHint ? `${sourceHint.id}|${sourceHint.innerHTML}` : '';
    if (!signature) {
      state.hintSignature = '';
      state.hintCollapsed = false;
    } else if (signature !== state.hintSignature) {
      state.hintSignature = signature;
      state.hintCollapsed = false;
    }
    setBubble(panel,sourceHint,!hasPrimaryAudio && visibleHints.length > 0);
    setGuideToggleState(panel,!!sourceHint);
    const feedback = byId('vocabularyAdventureFeedbackText');
    if (visibleHints.length && feedback && feedback.dataset.tone === 'hinted') feedback.textContent = '';
  }

  function prepareResultAudio(panel) {
    const root = screen();
    if (!root) return;
    const controls = [...root.querySelectorAll('.vocabulary-adventure-speak')];
    controls.forEach((control,index) => { control.hidden = index > 0; });
    const resultVisible = !!root.querySelector(
      '.vocabulary-adventure-result,.vocabulary-adventure-summary,.vav2-final-panel,.vte-shell'
    );
    if (resultVisible) setBubble(panel,null,false);
    if (panel) panel.hidden = resultVisible;
  }

  function prepareActionPosition() {
    const root = screen();
    const action = byId('vocabularyAdventureAction');
    if (root && action) root.classList.toggle('vav2-action-visible',visible(action));
  }

  function refresh() {
    state.refreshQueued = false;
    const root = screen();
    if (!root || !ensureLayoutStylesheet()) return;
    prepareTopbarContent();
    const panel = ensureGuide();
    const hasPrimaryAudio = preparePrimaryAudio();
    prepareHint(panel,hasPrimaryAudio);
    prepareResultAudio(panel);
    prepareActionPosition();
  }

  function queueRefresh() {
    if (state.refreshQueued) return;
    state.refreshQueued = true;
    scheduleMicrotask(refresh);
  }

  function afterResult(result) {
    if (result && typeof result.finally === 'function') return result.finally(queueRefresh);
    queueRefresh();
    return result;
  }

  function wrapAfter(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.vav2IncrementalWrapped) return;
    const wrapped = function wrappedAdventureAction() {
      try { return afterResult(original.apply(this,arguments)); }
      catch (error) { queueRefresh(); throw error; }
    };
    wrapped.vav2IncrementalWrapped = true;
    wrapped.vav2IncrementalOriginal = original;
    window[name] = wrapped;
  }

  function progressNumbers() {
    const text = (byId('vocabularyAdventureTotalProgress') || {}).textContent || '';
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match ? { done:Number(match[1]),total:Number(match[2]) } : { done:0,total:0 };
  }

  function showTransition(callback) {
    const root = screen();
    if (!root) { callback(); return; }
    const overlay = document.createElement('div');
    overlay.className = 'vav2-transition';
    overlay.setAttribute('aria-hidden','true');
    root.appendChild(overlay);
    window.setTimeout(() => { overlay.remove(); callback(); },480);
  }

  function wrapNext() {
    const original = window.nextVocabularyAdventure;
    if (typeof original !== 'function' || original.vav2IncrementalWrapped) return;
    const wrapped = function wrappedNextAdventure() {
      const context = this;
      const args = arguments;
      const progress = progressNumbers();
      const boundary = progress.done > 0 && progress.done < progress.total && progress.done % 10 === 0 ? progress.done : 0;
      if (!boundary || state.lastTransitionAt === boundary || state.transitionRunning) return afterResult(original.apply(context,args));
      state.lastTransitionAt = boundary;
      state.transitionRunning = true;
      return new Promise((resolve,reject) => {
        showTransition(() => {
          let result;
          try { result = original.apply(context,args); }
          catch (error) { state.transitionRunning = false; queueRefresh(); reject(error); return; }
          Promise.resolve(result).then(resolve,reject).finally(() => { state.transitionRunning = false; queueRefresh(); });
        });
      });
    };
    wrapped.vav2IncrementalWrapped = true;
    wrapped.vav2IncrementalOriginal = original;
    window.nextVocabularyAdventure = wrapped;
  }

  WRAPPED_FUNCTIONS.forEach(wrapAfter);
  wrapNext();
  ensureLayoutStylesheet();
  refresh();
  window.refreshVocabularyAdventureVisualV2 = queueRefresh;
})();
