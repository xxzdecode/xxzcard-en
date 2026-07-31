// ══════════════════════════════════════
// VOCABULARY PRACTICE UI
// ══════════════════════════════════════
const VOCABULARY_PRACTICE_UI_STYLE_ID = 'vocabularyPracticeUiStyles';
const VOCABULARY_PRACTICE_EDITABLE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[data-allow-text-selection="true"]'
].join(',');
const VOCABULARY_PRACTICE_PROTECTED_SELECTOR = [
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
  '#screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button'
].join(',');

let vocabularyChallengeSelectedOption = null;
let vocabularyChallengeFeedbackScheduled = false;

function installVocabularyPracticeStyles() {
  if (typeof document === 'undefined' || document.getElementById(VOCABULARY_PRACTICE_UI_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = VOCABULARY_PRACTICE_UI_STYLE_ID;
  style.textContent = `
    #screenVocabularyAdventureChallenge .vocabulary-adventure-options {
      gap: 12px;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button {
      position: relative;
      min-height: 58px;
      padding: 10px 52px 10px 14px;
      border: 2px solid #d8e8f3;
      border-radius: 18px;
      background: #f8fcff;
      color: #2d526f;
      display: flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-size: clamp(15px, 2vw, 18px);
      font-weight: 800;
      line-height: 1.3;
      text-align: center;
      cursor: pointer;
      touch-action: manipulation;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button:active:not(:disabled) {
      transform: scale(0.98);
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button:focus-visible {
      outline: 3px solid rgba(106, 169, 221, 0.42);
      outline-offset: 2px;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button::after {
      content: '';
      position: absolute;
      right: 14px;
      top: 50%;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      transform: translateY(-50%) scale(0.8);
      opacity: 0;
      font-size: 22px;
      font-weight: 950;
      line-height: 1;
      transition: opacity 120ms ease, transform 120ms ease;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-selected {
      border-color: #6aa9dd;
      background: #e5f3ff;
      color: #285c87;
      box-shadow: 0 0 0 3px rgba(106, 169, 221, 0.14);
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-correct {
      border-color: #69b98f;
      background: #e1f6ea;
      color: #286548;
      box-shadow: 0 0 0 3px rgba(105, 185, 143, 0.12);
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-correct::after {
      content: '✓';
      opacity: 1;
      transform: translateY(-50%) scale(1);
      background: #d0f0dd;
      color: #26734d;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-wrong {
      border-color: #e69a9a;
      background: #fff0f0;
      color: #9a4848;
      box-shadow: 0 0 0 3px rgba(230, 154, 154, 0.12);
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-wrong::after {
      content: '×';
      opacity: 1;
      transform: translateY(-50%) scale(1);
      background: #ffe0e0;
      color: #a63f3f;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button:disabled {
      cursor: default;
      opacity: 0.62;
      transform: none;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-selected:disabled,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-correct:disabled,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-options button.is-wrong:disabled {
      opacity: 1;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-order-answer,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button {
      border-radius: 16px;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank {
      gap: 10px;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button {
      min-height: 48px;
      padding: 9px 14px;
      border: 2px solid #d8e8f3;
      background: #f8fcff;
      color: #2d526f;
      touch-action: manipulation;
    }

    #screenVocabularyAdventureChallenge .vocabulary-adventure-order-bank button:disabled {
      border-color: #b8d4e8;
      background: #e5f3ff;
      color: #315d7f;
      opacity: 0.72;
    }

    ${VOCABULARY_PRACTICE_PROTECTED_SELECTOR} {
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }

    #screenVocabularyAdventure input,
    #screenVocabularyAdventure textarea,
    #screenVocabularyAdventure select,
    #screenVocabularyAdventure [contenteditable="true"],
    #screenVocabularyAdventure [contenteditable="plaintext-only"],
    #screenVocabularyAdventure [data-allow-text-selection="true"],
    #screenVocabularyAdventureChallenge input,
    #screenVocabularyAdventureChallenge textarea,
    #screenVocabularyAdventureChallenge select,
    #screenVocabularyAdventureChallenge [contenteditable="true"],
    #screenVocabularyAdventureChallenge [contenteditable="plaintext-only"],
    #screenVocabularyAdventureChallenge [data-allow-text-selection="true"] {
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }

    @media (orientation: landscape) and (min-width: 768px) {
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (orientation: landscape) and (max-height: 720px) {
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button {
        min-height: 48px;
        padding-block: 8px;
      }
    }

    @media (max-width: 620px) {
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options {
        grid-template-columns: 1fr;
        gap: 9px;
      }

      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button {
        min-height: 50px;
        font-size: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button,
      #screenVocabularyAdventureChallenge .vocabulary-adventure-options button::after {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function isVocabularyPracticeProtectedTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  if (target.closest(VOCABULARY_PRACTICE_EDITABLE_SELECTOR)) return false;
  return !!target.closest(VOCABULARY_PRACTICE_PROTECTED_SELECTOR);
}

function preventVocabularyPracticeSelection(event) {
  if (isVocabularyPracticeProtectedTarget(event.target)) event.preventDefault();
}

function normalizeVocabularyChallengeAnswer(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function extractVocabularyChallengeCorrectAnswer(message) {
  const value = String(message || '');
  const marker = '正确答案：';
  const index = value.lastIndexOf(marker);
  return index < 0 ? '' : normalizeVocabularyChallengeAnswer(value.slice(index + marker.length));
}

function setVocabularyChallengeOptionState(button, state) {
  if (!button) return;
  const label = button.dataset.vocabularyOptionLabel
    || normalizeVocabularyChallengeAnswer(button.textContent);
  if (!button.dataset.vocabularyOptionLabel) button.dataset.vocabularyOptionLabel = label;
  button.classList.remove('is-selected', 'is-correct', 'is-wrong');
  button.removeAttribute('data-answer-state');

  let stateLabel = '';
  if (state) {
    button.classList.add(state);
    button.dataset.answerState = state;
    stateLabel = state === 'is-selected'
      ? '已选择'
      : state === 'is-correct'
        ? '正确答案'
        : '错误答案';
  }
  button.setAttribute('aria-label', stateLabel ? `${label}，${stateLabel}` : label);
}

function resetVocabularyChallengeOptionStates(container) {
  if (!container) return;
  container.querySelectorAll('button').forEach(button => {
    setVocabularyChallengeOptionState(button, '');
  });
}

function handleVocabularyChallengeOptionClick(event) {
  const button = event.target?.closest?.(
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-options button'
  );
  if (!button || button.disabled) return;
  const container = button.closest('.vocabulary-adventure-options');
  resetVocabularyChallengeOptionStates(container);
  setVocabularyChallengeOptionState(button, 'is-selected');
  vocabularyChallengeSelectedOption = button;
}

function applyVocabularyChallengeAnswerFeedback() {
  const feedback = document.getElementById('vocabularyAdventureChallengeFeedbackText');
  const container = document.querySelector(
    '#screenVocabularyAdventureChallenge .vocabulary-adventure-options'
  );
  if (!feedback || !container) return;

  const message = normalizeVocabularyChallengeAnswer(feedback.textContent);
  const correctFeedback = message.startsWith('回答正确');
  const wrongFeedback = message.startsWith('回答错误');
  if (!correctFeedback && !wrongFeedback) return;

  const selected = vocabularyChallengeSelectedOption?.isConnected
    ? vocabularyChallengeSelectedOption
    : container.querySelector('.is-selected');
  if (!selected) return;

  if (correctFeedback) {
    setVocabularyChallengeOptionState(selected, 'is-correct');
    return;
  }

  setVocabularyChallengeOptionState(selected, 'is-wrong');
  const correctAnswer = extractVocabularyChallengeCorrectAnswer(message);
  if (!correctAnswer) return;
  const correctButton = [...container.querySelectorAll('button')].find(button => {
    const label = button.dataset.vocabularyOptionLabel
      || normalizeVocabularyChallengeAnswer(button.textContent);
    return normalizeVocabularyChallengeAnswer(label) === correctAnswer;
  });
  if (correctButton) setVocabularyChallengeOptionState(correctButton, 'is-correct');
}

function scheduleVocabularyChallengeAnswerFeedback() {
  if (vocabularyChallengeFeedbackScheduled) return;
  vocabularyChallengeFeedbackScheduled = true;
  Promise.resolve().then(() => {
    vocabularyChallengeFeedbackScheduled = false;
    applyVocabularyChallengeAnswerFeedback();
  });
}

function installVocabularyPracticeUi() {
  if (typeof document === 'undefined' || window.__vocabularyPracticeUiInstalled) return;
  window.__vocabularyPracticeUiInstalled = true;
  installVocabularyPracticeStyles();

  document.addEventListener('click', handleVocabularyChallengeOptionClick, true);
  document.addEventListener('selectstart', preventVocabularyPracticeSelection, true);
  document.addEventListener('contextmenu', preventVocabularyPracticeSelection, true);
  document.addEventListener('dragstart', preventVocabularyPracticeSelection, true);

  const feedback = document.getElementById('vocabularyAdventureChallengeFeedbackText');
  if (feedback && typeof MutationObserver === 'function') {
    new MutationObserver(scheduleVocabularyChallengeAnswerFeedback).observe(feedback, {
      attributes: true,
      attributeFilter: ['data-tone'],
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  const challengeBody = document.getElementById('vocabularyAdventureChallengeBody');
  if (challengeBody && typeof MutationObserver === 'function') {
    new MutationObserver(() => {
      if (vocabularyChallengeSelectedOption && !vocabularyChallengeSelectedOption.isConnected) {
        vocabularyChallengeSelectedOption = null;
      }
      challengeBody.querySelectorAll('.vocabulary-adventure-options button').forEach(button => {
        if (!button.dataset.vocabularyOptionLabel) {
          button.dataset.vocabularyOptionLabel = normalizeVocabularyChallengeAnswer(button.textContent);
          button.setAttribute('aria-label', button.dataset.vocabularyOptionLabel);
        }
      });
    }).observe(challengeBody, { childList: true, subtree: true });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installVocabularyPracticeUi, { once: true });
  } else {
    installVocabularyPracticeUi();
  }
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
(async () => {
  let dailyRouteStartup = Promise.resolve(null);
  let teacherToolsWarmup = Promise.resolve(null);

  function showDailyRouteStartupLoading() {
    if (currentUser === 'teacher' || typeof document.getElementById !== 'function') return;
    const grammar = document.getElementById('grammarChallengeHomeEntry');
    const classroom = document.getElementById('studentClassroomPracticeEntry');
    const setLoading = (entry, copy) => {
      if (!entry) return;
      entry.disabled = true;
      entry.dataset.routeState = 'loading';
      entry.setAttribute('aria-busy', 'true');
      const subtitle = entry.querySelector?.('.student-home-card__copy small');
      if (subtitle) subtitle.textContent = copy;
    };
    setLoading(grammar, '正在读取上一节课内容…');
    setLoading(classroom, '正在读取今天的新课…');
    const classroomStatus = document.getElementById('studentClassroomPracticeStatus');
    if (classroomStatus) classroomStatus.textContent = '正在读取';
  }

  showDailyRouteStartupLoading();
  try {
    if (typeof loadFeatureScript === 'function') {
      // Start the tiny current-route request before loading any optional
      // startup script. The helper consumes this promise when it becomes ready,
      // so the route request and script loading happen in parallel.
      if (currentUser !== 'teacher' && typeof fetch === 'function') {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = window.setTimeout(() => controller && controller.abort(), 2800);
        window.__dailyLearningRoutePrefetchPromise = fetch(
          `data/daily-learning-route.json?fresh=${Date.now()}`,
          {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined,
            headers: { Accept: 'application/json' }
          }
        ).then(response => {
          if (!response.ok) throw new Error(`route HTTP ${response.status}`);
          return response.json();
        }).finally(() => window.clearTimeout(timer));
        window.__dailyLearningRoutePrefetchPromise.catch(() => {});
      }

      dailyRouteStartup = loadFeatureScript('js/dailyLearningRoute.js')
        .then(() => window.startDailyLearningRoute?.())
        .catch(error => {
          console.warn('daily learning route unavailable', error && (error.message || error));
          return null;
        });

      // Warm the word-card scripts while the main Supabase data is loading.
      // Viewing stays cache-first, while the final helper restores remote-fresh
      // records for study modes that can write known/unknown progress.
      if (typeof loadFeatureGroup === 'function') {
        teacherToolsWarmup = loadFeatureGroup('teacherTools')
          .then(() => loadFeatureScript('js/wordCardPerformance.js'))
          .then(() => loadFeatureScript('js/wordCardStudySafety.js'))
          .catch(error => {
            console.warn('word-card warmup unavailable', error && (error.message || error));
            return null;
          });
      }

      await loadFeatureScript('js/masterVocabularyLibrary.js');
      await loadFeatureScript('js/studentRewards.js');
      await loadFeatureScript('js/studentRewardLayoutGuard.js');
      await loadFeatureScript('js/studentRewardReconcile.js');
      await loadFeatureScript('js/studentActivityControls.js');
      await loadFeatureScript('js/studentActivityControlsCompactUI.js');
      await loadFeatureScript('js/grammarChallengeRecords.js');
    }
  } catch (error) {
    console.warn('startup enhancements unavailable', error && (error.message || error));
  }
  if (currentUser === 'teacher') { document.body.classList.add('is-teacher'); }
  appData = await initData();
  await loadHome();
  dailyRouteStartup.catch(() => {});
  teacherToolsWarmup.catch(() => {});
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }, { once: true });
}
