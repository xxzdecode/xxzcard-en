(function vocabularyFeedbackSaveCoordinatorModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.VocabularyFeedbackSaveCoordinator = api;
    api.install();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyFeedbackSaveCoordinator(root) {
  'use strict';

  const state = {
    installed: false,
    handled: new Set(),
    adventureToken: 0,
    challengeToken: 0
  };

  function text(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function clone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function allCards() {
    const data = root.appData;
    const cards = [];
    const seen = new Set();
    const add = card => {
      if (!card || typeof card !== 'object') return;
      const key = text(card.word || card.term || card.english).toLocaleLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      cards.push(card);
    };
    const master = data && data.masterCards;
    if (Array.isArray(master)) master.forEach(add);
    else if (master && typeof master === 'object') Object.values(master).forEach(add);
    (Array.isArray(data && data.batches) ? data.batches : []).forEach(batch => {
      (Array.isArray(batch && batch.cards) ? batch.cards : []).forEach(add);
    });
    return cards;
  }

  function findCard(wordKey) {
    const key = text(wordKey).toLocaleLowerCase();
    return allCards().find(card => (
      text(card.word || card.term || card.english).toLocaleLowerCase() === key
    )) || { word: wordKey, meaning: '' };
  }

  function selectedAnswerForMode(isChallenge) {
    const selection = root.__vocabularyPracticeLastSelection;
    if (!selection) return null;
    const expected = isChallenge ? 'challenge' : 'adventure';
    return selection.mode === expected ? selection.index : null;
  }

  function feedbackElements(mode) {
    const challenge = mode === 'challenge';
    return {
      body: root.document.getElementById(
        challenge ? 'vocabularyAdventureChallengeBody' : 'vocabularyAdventureBody'
      ),
      text: root.document.getElementById(
        challenge ? 'vocabularyAdventureChallengeFeedbackText' : 'vocabularyAdventureFeedbackText'
      ),
      action: root.document.getElementById(
        challenge ? 'vocabularyAdventureChallengeAction' : 'vocabularyAdventureAction'
      )
    };
  }

  function setFeedback(mode, message, tone) {
    const elements = feedbackElements(mode);
    if (elements.text) {
      elements.text.textContent = message || '';
      elements.text.dataset.tone = tone || '';
    }
    if (elements.action) {
      elements.action.hidden = true;
      elements.action.onclick = null;
    }
  }

  function decorateQuestion(body, detail) {
    if (!body) return;
    const question = detail.question || {};
    const interaction = question.interaction || (Array.isArray(question.options) ? 'choice' : '');
    body.querySelectorAll('button,input').forEach(control => { control.disabled = true; });

    if (interaction === 'choice') {
      const buttons = [...body.querySelectorAll('.vocabulary-adventure-options button')];
      const selectedIndex = Number(detail.answer);
      buttons.forEach((button, index) => {
        button.classList.remove('is-selected', 'is-correct', 'is-wrong');
        if (index === Number(question.correctIndex)) button.classList.add('is-correct');
        if (!detail.correct && index === selectedIndex && index !== Number(question.correctIndex)) {
          button.classList.add('is-wrong');
        }
      });
    } else if (interaction === 'input') {
      body.querySelectorAll('input').forEach(input => {
        input.classList.add(detail.correct ? 'vte-answer-correct' : 'vte-answer-wrong');
      });
    } else if (interaction === 'order') {
      body.querySelectorAll('.vocabulary-adventure-order-answer').forEach(node => {
        node.classList.add(detail.correct ? 'vte-answer-correct' : 'vte-answer-wrong');
      });
    }

    body.dataset.mode = 'question-feedback';
    root.VocabularyPracticeUI?.syncOptionStates?.(body);
  }

  function restoreQuestion(detail) {
    const elements = feedbackElements(detail.mode);
    if (!elements.body || !detail.snapshot) return elements.body;
    elements.body.innerHTML = detail.snapshot;
    decorateQuestion(elements.body, detail);
    return elements.body;
  }

  function nextQuestion(mode) {
    if (mode === 'challenge') root.nextVocabularyAdventureChallenge?.();
    else root.nextVocabularyAdventure?.();
  }

  function applyCorrect(detail, feedbackApi) {
    restoreQuestion(detail);
    setFeedback(detail.mode, '✓ 回答正确', 'direct');
    const tokenName = detail.mode === 'challenge' ? 'challengeToken' : 'adventureToken';
    const token = ++state[tokenName];
    root.setTimeout(() => {
      if (token === state[tokenName]) nextQuestion(detail.mode);
    }, feedbackApi.AUTO_ADVANCE_MS || 720);
  }

  function applyWrong(detail, feedbackApi) {
    const body = restoreQuestion(detail);
    setFeedback(detail.mode, '× 回答错误，看看正确答案', 'failed');
    const tokenName = detail.mode === 'challenge' ? 'challengeToken' : 'adventureToken';
    const token = ++state[tokenName];
    root.setTimeout(() => {
      if (token !== state[tokenName] || !body || !body.isConnected) return;
      const card = findCard(detail.wordKey);
      feedbackApi.mount(body, card, {
        source: detail.mode,
        title: detail.mode === 'challenge'
          ? '这道题的正确答案'
          : '再认识一次这个词',
        correctAnswer: detail.correctAnswer || text(card.word),
        userAnswer: detail.userAnswer,
        onNext: () => nextQuestion(detail.mode)
      });
      setFeedback(detail.mode, '', '');
    }, feedbackApi.TEACHING_DELAY_MS || 520);
  }

  function applySavedResult(detail, feedbackApi) {
    if (!detail || state.handled.has(detail.fingerprint)) return;
    state.handled.add(detail.fingerprint);
    root.setTimeout(() => {
      if (detail.correct) applyCorrect(detail, feedbackApi);
      else applyWrong(detail, feedbackApi);
    }, 0);
  }

  function ensureSaveHook() {
    const feedbackApi = root.VocabularyFeedbackErrorUI;
    const current = root.saveCurrentVocabularyAdventureState;
    if (!feedbackApi || typeof feedbackApi.extractSavedResult !== 'function') return false;
    if (typeof current !== 'function') return false;
    if (current.__vteWrapped || current.__vteCoordinatorWrapped) return true;

    const wrapped = async function coordinatedVocabularySave(nextState, ...args) {
      const isChallenge = !!(
        nextState && nextState.challengeSession && Number(nextState.challengeSession.cursor) > 0
      );
      const body = root.document.getElementById(
        isChallenge ? 'vocabularyAdventureChallengeBody' : 'vocabularyAdventureBody'
      );
      const detail = feedbackApi.extractSavedResult(nextState, {
        snapshot: body ? body.innerHTML : '',
        selectedAnswer: selectedAnswerForMode(isChallenge),
        gradeContext: clone(root.__vocabularyFeedbackGradeContext),
        questionContext: clone(root.__vocabularyFeedbackQuestionContext)
      });
      const saved = await current.call(this, nextState, ...args);
      if (saved !== false && detail) applySavedResult(detail, feedbackApi);
      return saved;
    };

    wrapped.__vteCoordinatorWrapped = true;
    wrapped.__vteOriginal = current;
    root.saveCurrentVocabularyAdventureState = wrapped;
    try { saveCurrentVocabularyAdventureState = wrapped; } catch (_) {}
    return true;
  }

  function install() {
    if (!root.document) return;
    root.VocabularyFeedbackErrorUI?.install?.();
    ensureSaveHook();
    if (state.installed) return;
    state.installed = true;
    root.document.addEventListener('click', event => {
      const control = event.target?.closest?.(
        '#screenVocabularyAdventure button,#screenVocabularyAdventureChallenge button'
      );
      if (control) ensureSaveHook();
    }, true);
  }

  function afterFeatureGroup() {
    install();
    ensureSaveHook();
  }

  return Object.freeze({
    ensureSaveHook,
    install,
    afterFeatureGroup
  });
});
