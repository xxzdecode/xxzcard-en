(function vocabularyAdventureVisualV2Safe() {
  'use strict';

  const SCREEN_ID = 'screenVocabularyAdventure';
  const EXPECTED_COINS = 10;
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
    autoAdvanceTimer: 0,
    lastTransitionAt: -1,
    transitionRunning: false,
    summaryRendered: false,
    installAttempts: 0
  };

  function screen() {
    return document.getElementById(SCREEN_ID);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureStylesheet() {
    const href = 'styles-vocabulary-adventure-v2.css';
    if (!document.querySelector(`link[data-vav2-styles][href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.vav2Styles = '1';
      document.head.appendChild(link);
    }

    if (document.getElementById('vav2SafeOverrides')) return;
    const style = document.createElement('style');
    style.id = 'vav2SafeOverrides';
    style.textContent = `
      #screenVocabularyAdventure .vocabulary-adventure-hint:not([hidden]),
      #screenVocabularyAdventure .vocabulary-adventure-review-hint:not([hidden]) {
        position: static !important;
        width: auto !important;
        height: auto !important;
        margin: 0 0 14px !important;
        padding: 10px 14px !important;
        overflow: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        border: 1px solid rgba(228, 183, 78, .58) !important;
        border-radius: 14px !important;
        background: rgba(255, 249, 219, .96) !important;
        color: #705b28 !important;
        font-weight: 800 !important;
        line-height: 1.45 !important;
      }
      #screenVocabularyAdventure .vocabulary-adventure-hint button,
      #screenVocabularyAdventure .vocabulary-adventure-review-hint button {
        min-height: 34px !important;
        margin-left: 8px !important;
        padding: 5px 11px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: #fff !important;
        color: #4778aa !important;
        box-shadow: none !important;
        font: inherit !important;
        font-size: 13px !important;
      }
      #screenVocabularyAdventure .vav2-fox-bubble { display: none !important; }
      #screenVocabularyAdventure .vav2-transition {
        position: absolute;
        inset: 0;
        z-index: 90;
        pointer-events: none;
        background: linear-gradient(115deg, transparent 22%, rgba(255,255,255,.78) 48%, transparent 74%);
        transform: translateX(-120%);
        animation: vav2-safe-sweep 480ms ease-out both;
      }
      @keyframes vav2-safe-sweep {
        to { transform: translateX(120%); }
      }
    `;
    document.head.appendChild(style);
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
    root.querySelectorAll('.vav2-fox-bubble').forEach(node => node.remove());
  }

  function progressNumbers() {
    const text = (byId('vocabularyAdventureTotalProgress') || {}).textContent || '';
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match
      ? { done: Number(match[1]), total: Number(match[2]) }
      : { done: 0, total: 0 };
  }

  function questionLabel() {
    const root = screen();
    const label = root && root.querySelector('.vocabulary-adventure-question-label');
    return label ? label.textContent.trim() : '';
  }

  function sanitizeProgressAndCopy() {
    const title = byId('vocabularyAdventureStageTitle');
    if (title) title.textContent = '词汇探险';

    const label = screen() && screen().querySelector('.vocabulary-adventure-question-label');
    if (label) {
      const text = label.textContent.trim();
      if (/基础意义确认/.test(text)) label.textContent = '再确认一次这个词';
      else if (/抗遗忘检索/.test(text)) label.textContent = '想一想，完成这一题';
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

  function ensureWordSpeaker() {
    const root = screen();
    if (!root || !/看单词/.test(questionLabel())) return;
    const question = root.querySelector('.vocabulary-adventure-question');
    const prompt = question && question.querySelector('.vocabulary-adventure-prompt-text');
    if (!question || !prompt || question.querySelector('.vav2-speaker')) return;

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

  function hintCopy() {
    const label = questionLabel();
    if (/听/.test(label)) return '再听一次，注意单词开头和结尾的声音。';
    if (/看意思/.test(label)) return '想一想它会出现在哪种情境里，再听一次。';
    if (/看单词/.test(label)) return '先读一读这个词，再想想它通常表达什么。';
    if (/音标/.test(label)) return '慢一点看音标，把声音分成两小段来想。';
    if (/拼|字母/.test(label)) return '先想读音，再检查每一段声音对应的字母。';
    return '再看一看、听一听，然后重新试一次。';
  }

  function sanitizeHints() {
    const root = screen();
    if (!root) return;
    const hints = root.querySelectorAll(
      '.vocabulary-adventure-hint:not([hidden]), .vocabulary-adventure-review-hint:not([hidden])'
    );
    hints.forEach(hint => {
      if (hint.dataset.vav2SafeHint === '1') return;
      hint.dataset.vav2SafeHint = '1';
      hint.innerHTML = `${hintCopy()}<button type="button" onclick="speakVocabularyAdventureCurrent()">🔊 再听一次</button>`;
    });
  }

  function setAction(label, handlerName, hidden) {
    const action = byId('vocabularyAdventureAction');
    if (!action) return;
    action.hidden = !!hidden;
    action.textContent = label || '';
    action.onclick = handlerName && typeof window[handlerName] === 'function'
      ? window[handlerName]
      : null;
  }

  function sanitizeFailedResult(result) {
    if (!result || result.dataset.vav2SafeReady === '1') return;
    result.dataset.vav2SafeReady = '1';
    const title = result.querySelector('.vocabulary-adventure-result-title');
    if (title) title.textContent = '再认识一次这个词';
    const feedback = byId('vocabularyAdventureFeedbackText');
    if (feedback) {
      feedback.textContent = '看一看完整单词卡，准备好后继续。';
      feedback.dataset.tone = '';
    }
    setAction('继续', 'nextVocabularyAdventure', false);
  }

  function autoAdvanceSuccess(result) {
    if (!result || result.dataset.vav2SafeReady === '1') return;
    result.dataset.vav2SafeReady = '1';
    const body = byId('vocabularyAdventureBody');
    const feedback = byId('vocabularyAdventureFeedbackText');
    if (body) body.innerHTML = '<div class="vav2-success-flash">找到啦！</div>';
    if (feedback) {
      feedback.textContent = '';
      feedback.dataset.tone = '';
    }
    setAction('', '', true);
    window.clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = window.setTimeout(() => {
      if (typeof window.nextVocabularyAdventure === 'function') {
        window.nextVocabularyAdventure();
      }
    }, 520);
  }

  function sanitizeResult() {
    const root = screen();
    if (!root) return;
    const failed = root.querySelector('.vocabulary-adventure-result.is-failed');
    if (failed) {
      sanitizeFailedResult(failed);
      return;
    }
    const success = root.querySelector(
      '.vocabulary-adventure-result.is-direct, .vocabulary-adventure-result.is-hinted'
    );
    if (success) autoAdvanceSuccess(success);
  }

  function summaryValue(labelPattern) {
    const root = screen();
    if (!root) return 0;
    const rows = root.querySelectorAll('.vocabulary-adventure-summary-grid > div');
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
    if (!/D\s*直接答对|H\s*提示后|F\s*待加强|今日完成|探险完成/.test(text)) return;

    const direct = summaryValue(/直接答对/);
    const hinted = summaryValue(/提示后/);
    const failed = summaryValue(/待加强/);
    const total = summaryValue(/总目标/) || direct + hinted + failed;
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
    if (feedback) {
      feedback.textContent = '';
      feedback.dataset.tone = '';
    }
    setAction('返回首页', 'closeVocabularyAdventure', false);
    state.summaryRendered = true;
  }

  function refresh() {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = 0;
    if (!screen()) return;
    ensureStylesheet();
    ensureDecorations();
    sanitizeProgressAndCopy();
    ensureWordSpeaker();
    sanitizeHints();
    sanitizeResult();
    renderFriendlySummary();
  }

  function scheduleRefresh(delay) {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(refresh, Number(delay) || 0);
  }

  function afterResult(result) {
    if (result && typeof result.finally === 'function') {
      return result.finally(() => {
        scheduleRefresh(0);
        window.setTimeout(refresh, 80);
      });
    }
    scheduleRefresh(0);
    return result;
  }

  function wrapAfter(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.vav2SafeWrapped) return false;
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
    wrapped.vav2SafeWrapped = true;
    wrapped.vav2SafeOriginal = original;
    window[name] = wrapped;
    return true;
  }

  function shouldTransition() {
    const progress = progressNumbers();
    return progress.done > 0 && progress.done < progress.total && progress.done % 10 === 0
      ? progress.done
      : 0;
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
    if (typeof original !== 'function' || original.vav2SafeWrapped) return false;
    const wrapped = function wrappedNextVocabularyAdventure() {
      const args = arguments;
      const context = this;
      const boundary = shouldTransition();
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
    wrapped.vav2SafeWrapped = true;
    wrapped.vav2SafeOriginal = original;
    window.nextVocabularyAdventure = wrapped;
    return true;
  }

  function installWrappers() {
    WRAPPED_FUNCTIONS.forEach(wrapAfter);
    wrapNext();
    state.installAttempts += 1;
    if (state.installAttempts < 8) {
      window.setTimeout(installWrappers, 250);
    }
  }

  function resetForOpening() {
    state.summaryRendered = false;
    state.lastTransitionAt = -1;
    state.transitionRunning = false;
    window.clearTimeout(state.autoAdvanceTimer);
  }

  function install() {
    ensureStylesheet();
    resetForOpening();
    installWrappers();
    refresh();
    window.setTimeout(refresh, 120);
    window.setTimeout(refresh, 420);
    window.__VOCABULARY_ADVENTURE_VISUAL_V2_SAFE__ = true;
    window.__VOCABULARY_ADVENTURE_VISUAL_V2_DISABLED__ = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
