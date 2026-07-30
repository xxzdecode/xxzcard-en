(function vocabularyAdventureVisualV2() {
  'use strict';

  const SCREEN_ID = 'screenVocabularyAdventure';
  const EXPECTED_COINS = 10;
  const state = {
    observer: null,
    originalNext: null,
    lastTransitionAt: -1,
    autoAdvanceTimer: 0,
    summaryRendered: false
  };

  function ensureStylesheet() {
    const href = 'styles-vocabulary-adventure-v2.css';
    if (document.querySelector(`link[data-vav2-styles][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.vav2Styles = '1';
    document.head.appendChild(link);
  }

  function screen() { return document.getElementById(SCREEN_ID); }
  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureDecorations() {
    const root = screen();
    if (!root) return;
    root.classList.add('vocabulary-adventure-v2');

    if (!root.querySelector('.vav2-fox')) {
      const fox = document.createElement('div');
      fox.className = 'vav2-fox';
      fox.textContent = '🦊';
      fox.setAttribute('aria-hidden', 'true');
      root.appendChild(fox);
    }

    if (!root.querySelector('.vav2-fox-bubble')) {
      const bubble = document.createElement('div');
      bubble.className = 'vav2-fox-bubble';
      bubble.hidden = true;
      bubble.setAttribute('role', 'status');
      bubble.setAttribute('aria-live', 'polite');
      root.appendChild(bubble);
    }
  }

  function sanitizeProgress() {
    const title = byId('vocabularyAdventureStageTitle');
    if (title && title.textContent !== '词汇探险') title.textContent = '词汇探险';
  }

  function progressNumbers() {
    const text = (byId('vocabularyAdventureTotalProgress') || {}).textContent || '';
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match ? { done: Number(match[1]), total: Number(match[2]) } : { done: 0, total: 0 };
  }

  function questionLabel() {
    const node = screen() && screen().querySelector('.vocabulary-adventure-question-label');
    return node ? node.textContent.trim() : '';
  }

  function hintCopy() {
    const label = questionLabel();
    if (/听/.test(label)) return '再听一次，注意单词开头和结尾的声音。';
    if (/看意思/.test(label)) return '先在心里读一读这个意思，再找你熟悉的单词。';
    if (/看单词/.test(label)) return '听一听这个词，再想想它通常会在哪种情境里出现。';
    if (/音标/.test(label)) return '慢一点看音标，把声音分成两小段来想。';
    if (/拼|字母/.test(label)) return '先想一想这个词的读音，再检查每一段声音对应的字母。';
    return '别着急，再听一听、看一看，然后重新试一次。';
  }

  function showFoxHint() {
    ensureDecorations();
    const root = screen();
    const bubble = root && root.querySelector('.vav2-fox-bubble');
    if (!bubble) return;
    const canSpeak = typeof window.speakVocabularyAdventureCurrent === 'function';
    bubble.innerHTML = `${escapeHtml(hintCopy())}${canSpeak ? '<button type="button" data-vav2-speak>🔊 再听一次</button>' : ''}`;
    bubble.hidden = false;
    const speak = bubble.querySelector('[data-vav2-speak]');
    if (speak) speak.addEventListener('click', () => window.speakVocabularyAdventureCurrent());
  }

  function hideFoxHint() {
    const bubble = screen() && screen().querySelector('.vav2-fox-bubble');
    if (bubble) bubble.hidden = true;
  }

  function sanitizeHints() {
    const root = screen();
    if (!root) return;
    const hints = [...root.querySelectorAll(
      '.vocabulary-adventure-hint:not([hidden]), .vocabulary-adventure-review-hint:not([hidden])'
    )];
    if (!hints.length) return;
    const freshHints = hints.filter((hint) => hint.dataset.vav2Processed !== '1');
    hints.forEach((hint) => hint.classList.add('vav2-hint-source'));
    freshHints.forEach((hint) => { hint.dataset.vav2Processed = '1'; });
    if (freshHints.length) showFoxHint();

    const feedback = byId('vocabularyAdventureFeedbackText');
    if (feedback && feedback.dataset.tone === 'hinted') {
      feedback.textContent = '';
    }
  }

  function ensureSingleSpeaker() {
    const root = screen();
    if (!root) return;
    const question = root.querySelector('.vocabulary-adventure-question');
    const prompt = question && question.querySelector('.vocabulary-adventure-prompt-text');
    const label = questionLabel();
    if (!question || !prompt || !/看单词/.test(label) || question.querySelector('.vav2-speaker')) return;

    const wrap = document.createElement('div');
    wrap.className = 'vav2-prompt-wrap';
    prompt.parentNode.insertBefore(wrap, prompt);
    wrap.appendChild(prompt);

    const speaker = document.createElement('button');
    speaker.type = 'button';
    speaker.className = 'vav2-speaker';
    speaker.setAttribute('aria-label', '播放单词发音');
    speaker.textContent = '播放';
    speaker.addEventListener('click', () => {
      if (typeof window.speakVocabularyAdventureCurrent === 'function') {
        window.speakVocabularyAdventureCurrent();
      }
    });
    wrap.appendChild(speaker);
  }

  function clearQuestionFooter() {
    const body = byId('vocabularyAdventureBody');
    const feedback = byId('vocabularyAdventureFeedbackText');
    if (!body || !feedback) return;
    if (body.dataset.mode === 'question' && !feedback.dataset.tone && feedback.textContent) {
      feedback.textContent = '';
    }
  }

  function showTransition(done, callback) {
    const root = screen();
    if (!root || done <= 0 || state.lastTransitionAt === done) {
      callback();
      return;
    }
    state.lastTransitionAt = done;
    const overlay = document.createElement('div');
    overlay.className = 'vav2-transition';
    overlay.setAttribute('aria-hidden', 'true');
    root.appendChild(overlay);
    window.setTimeout(() => {
      overlay.remove();
      callback();
    }, 900);
  }

  function shouldTransition() {
    const { done, total } = progressNumbers();
    return done > 0 && done < total && done % 10 === 0 ? done : 0;
  }

  function callOriginalNext() {
    if (typeof state.originalNext === 'function') state.originalNext();
  }

  function nextWithOptionalTransition() {
    hideFoxHint();
    const boundary = shouldTransition();
    if (boundary) showTransition(boundary, callOriginalNext);
    else callOriginalNext();
  }

  function wrapNextFunction() {
    if (state.originalNext || typeof window.nextVocabularyAdventure !== 'function') return;
    state.originalNext = window.nextVocabularyAdventure;
    window.nextVocabularyAdventure = nextWithOptionalTransition;
  }

  function sanitizeFailedResult(result) {
    if (!result || result.dataset.vav2Ready === '1') return;
    result.dataset.vav2Ready = '1';
    const title = result.querySelector('.vocabulary-adventure-result-title');
    if (title) title.textContent = '再认识一次这个词';
    const feedback = byId('vocabularyAdventureFeedbackText');
    const action = byId('vocabularyAdventureAction');
    if (feedback) {
      feedback.textContent = '看一看完整单词卡，准备好后继续。';
      feedback.dataset.tone = '';
    }
    if (action) action.textContent = '继续';
  }

  function autoAdvanceSuccess(result) {
    if (!result || result.dataset.vav2Ready === '1') return;
    result.dataset.vav2Ready = '1';
    hideFoxHint();
    const body = byId('vocabularyAdventureBody');
    const feedback = byId('vocabularyAdventureFeedbackText');
    const action = byId('vocabularyAdventureAction');
    if (body) body.innerHTML = '<div class="vav2-success-flash">找到啦！</div>';
    if (feedback) {
      feedback.textContent = '';
      feedback.dataset.tone = '';
    }
    if (action) action.hidden = true;
    window.clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = window.setTimeout(() => {
      if (typeof window.nextVocabularyAdventure === 'function') window.nextVocabularyAdventure();
    }, 520);
  }

  function summaryValue(labelPattern) {
    const root = screen();
    if (!root) return 0;
    const rows = [...root.querySelectorAll('.vocabulary-adventure-summary-grid > div')];
    for (const row of rows) {
      const label = row.querySelector('span');
      const value = row.querySelector('strong');
      if (label && value && labelPattern.test(label.textContent || '')) {
        const parsed = Number(String(value.textContent || '').replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
      }
    }
    return 0;
  }

  function renderFriendlySummary() {
    const body = byId('vocabularyAdventureBody');
    if (!body || state.summaryRendered) return;
    const text = body.textContent || '';
    const looksLikeSummary = /D\s*直接答对|H\s*提示后|F\s*待加强|今日探险完成|探险完成/.test(text);
    if (!looksLikeSummary) return;

    const direct = summaryValue(/直接答对/);
    const hinted = summaryValue(/提示后/);
    const failed = summaryValue(/待加强/);
    const progress = progressNumbers();
    const total = summaryValue(/总目标/) || progress.total || direct + hinted + failed;
    const correct = direct + hinted;
    const wrong = Math.max(failed, total - correct);
    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    body.dataset.mode = 'completed';
    body.innerHTML = `
      <section class="vav2-final-panel" aria-label="词汇探险完成结果">
        <h2>今天的词汇探险完成了！</h2>
        <div class="vav2-final-stats">
          <div class="vav2-final-stat"><small>总题数</small><strong>${total}</strong></div>
          <div class="vav2-final-stat"><small>答对</small><strong>${correct}</strong></div>
          <div class="vav2-final-stat"><small>答错</small><strong>${wrong}</strong></div>
          <div class="vav2-final-stat"><small>正确率</small><strong>${accuracy}%</strong></div>
        </div>
        <div class="vav2-final-coins">预计今天可以获得 ${EXPECTED_COINS} 金币</div>
      </section>`;

    const feedback = byId('vocabularyAdventureFeedbackText');
    const action = byId('vocabularyAdventureAction');
    if (feedback) {
      feedback.textContent = '';
      feedback.dataset.tone = '';
    }
    if (action) {
      action.hidden = false;
      action.textContent = '返回首页';
      if (typeof window.closeVocabularyAdventure === 'function') {
        action.onclick = window.closeVocabularyAdventure;
      }
    }
    hideFoxHint();
    state.summaryRendered = true;
  }

  function sanitizeResult() {
    const root = screen();
    if (!root) return;
    const failed = root.querySelector('.vocabulary-adventure-result.is-failed');
    if (failed) {
      sanitizeFailedResult(failed);
      return;
    }
    const success = root.querySelector('.vocabulary-adventure-result.is-direct, .vocabulary-adventure-result.is-hinted');
    if (success) autoAdvanceSuccess(success);
  }

  function sanitizeQuestionCopy() {
    const root = screen();
    if (!root) return;
    const label = root.querySelector('.vocabulary-adventure-question-label');
    if (label) {
      const current = label.textContent.trim();
      if (/基础意义确认/.test(current)) label.textContent = '再确认一次这个词';
      else if (/抗遗忘检索/.test(current)) label.textContent = '想一想，完成这一题';
    }
    const feedback = byId('vocabularyAdventureFeedbackText');
    if (!feedback) return;
    const text = feedback.textContent.trim();
    if (/\b[DHＦF]\b|已记录为|当前间隔|抗遗忘|正式结果|答对记为|答错记为/.test(text)) {
      feedback.textContent = '';
      feedback.dataset.tone = '';
      return;
    }
    const body = byId('vocabularyAdventureBody');
    if (body && ['question', 'review'].includes(body.dataset.mode) && /请选择答案|完成本次/.test(text)) {
      feedback.textContent = '';
    }
  }

  function sanitizeAll() {
    if (!screen()) return;
    ensureDecorations();
    sanitizeProgress();
    sanitizeQuestionCopy();
    wrapNextFunction();
    ensureSingleSpeaker();
    sanitizeHints();
    sanitizeResult();
    renderFriendlySummary();
    clearQuestionFooter();
  }

  function resetForOpening() {
    state.summaryRendered = false;
    state.lastTransitionAt = -1;
    window.clearTimeout(state.autoAdvanceTimer);
    hideFoxHint();
  }

  function install() {
    ensureStylesheet();
    if (!screen()) return;
    ensureDecorations();
    sanitizeAll();
    state.observer = new MutationObserver(sanitizeAll);
    state.observer.observe(screen(), {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'data-mode', 'data-tone']
    });

    if (typeof window.openVocabularyAdventure === 'function' && !window.openVocabularyAdventure.vav2Wrapped) {
      const originalOpen = window.openVocabularyAdventure;
      const wrappedOpen = function wrappedVocabularyAdventureOpen() {
        resetForOpening();
        return originalOpen.apply(this, arguments);
      };
      wrappedOpen.vav2Wrapped = true;
      window.openVocabularyAdventure = wrappedOpen;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
