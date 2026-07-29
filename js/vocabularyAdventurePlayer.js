(function vocabularyAdventurePlayerModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const review = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureReview.js')
    : root.VocabularyAdventureReview;
  const exported = factory(core, review);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && typeof module !== 'object') Object.assign(root, exported.createVocabularyAdventureBrowserApi());
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventurePlayerModule(core, review) {
  'use strict';

  const PREVIEW_STORAGE_KEY = 'wc_vocab_adventure_preview';

  function isVocabularyAdventurePreviewEnabled(search, storage) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    if (params.get('previewVocabularyAdventure') === '1') return true;
    try {
      return !!storage && storage.getItem(PREVIEW_STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function createVocabularyAdventureAttemptTracker() {
    let attemptCount = 0;
    let hintUsed = false;
    let locked = false;
    return {
      answer(correct) {
        if (locked) return { kind: 'locked', attemptCount, hintUsed };
        attemptCount += 1;
        if (attemptCount === 1 && correct) {
          locked = true;
          return { kind: 'result', result: 'D', attemptCount, hintUsed };
        }
        if (attemptCount === 1) {
          hintUsed = true;
          return { kind: 'hint', attemptCount, hintUsed };
        }
        locked = true;
        return {
          kind: 'result',
          result: correct ? 'H' : 'F',
          attemptCount,
          hintUsed
        };
      },
      snapshot() {
        return { attemptCount, hintUsed, locked };
      }
    };
  }

  function createVocabularyAdventureSaveCoordinator(saveState) {
    let prepared = null;
    return {
      prepare(nextState, metadata) {
        if (!prepared) prepared = { nextState, metadata };
        return prepared;
      },
      async retry() {
        if (!prepared) return { ok: false, code: 'NOT_PREPARED' };
        const current = prepared;
        const ok = await saveState(current.nextState);
        if (!ok) return { ok: false, prepared: current };
        prepared = null;
        return { ok: true, prepared: current };
      },
      discard() {
        prepared = null;
      },
      getPrepared() {
        return prepared;
      }
    };
  }

  function escapeAdventureHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cardItemText(item) {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    return [
      item.label || item.type || '',
      item.form || item.word || item.phrase || '',
      item.meaning || '',
      item.example || ''
    ].filter(Boolean).join(' · ');
  }

  function renderAdventureFullCardHtml(card) {
    const safeCard = card && typeof card === 'object' ? card : {};
    const word = String(safeCard.word || '').trim();
    const meaning = String(safeCard.meaning || '').trim();
    const meta = [safeCard.pos, safeCard.phonetic].filter(Boolean).map(escapeAdventureHtml).join(' · ');
    const sections = [
      ['固定搭配', safeCard.collocations],
      ['词形变化', safeCard.irregularForms],
      ['近义词', safeCard.synonyms],
      ['词族', safeCard.wordFamily]
    ].map(([title, values]) => {
      const entries = (Array.isArray(values) ? values : []).map(cardItemText).filter(Boolean);
      return entries.length
        ? `<section><h4>${title}</h4>${entries.map(value => `<p>${escapeAdventureHtml(value)}</p>`).join('')}</section>`
        : '';
    }).join('');
    return `
      <div class="vocabulary-adventure-full-card">
        <div class="vocabulary-adventure-card-heading">
          <span class="vocabulary-adventure-card-emoji">${escapeAdventureHtml(safeCard.emoji || '📝')}</span>
          <div>
            <h2>${escapeAdventureHtml(word)}</h2>
            <p>${escapeAdventureHtml(meaning)}</p>
            ${meta ? `<small>${meta}</small>` : ''}
          </div>
          <button type="button" class="vocabulary-adventure-speak" onclick="speakVocabularyAdventureCurrent()" aria-label="播放单词发音">🔊</button>
        </div>
        ${sections}
        ${safeCard.tip ? `<section class="vocabulary-adventure-tip"><h4>提示</h4><p>${escapeAdventureHtml(safeCard.tip)}</p></section>` : ''}
      </div>`;
  }

  function createVocabularyAdventureBrowserApi() {
    const runtime = {
      user: '',
      state: null,
      candidates: [],
      action: '',
      question: null,
      reviewQuestion: null,
      reviewOriginalQuestion: null,
      reviewStage: '',
      reviewAttemptTracker: null,
      reviewOrder: [],
      reviewMatch: null,
      card: null,
      attemptTracker: null,
      disabledOptions: new Set(),
      preparedState: null,
      preparedMeta: null,
      savedFeedback: null,
      saving: false,
      initialSavePending: false,
      error: ''
    };

    function element(id) {
      return document.getElementById(id);
    }

    function currentUserValue() {
      return typeof currentUser === 'undefined' ? '' : currentUser;
    }

    function previewEnabled() {
      return isVocabularyAdventurePreviewEnabled(window.location.search, window.localStorage);
    }

    function updateVocabularyAdventurePreviewEntry() {
      const entry = element('vocabularyAdventurePreviewEntry');
      if (!entry) return;
      entry.hidden = !['sister', 'brother'].includes(currentUserValue());
    }

    function resetVocabularyAdventurePlayerRuntime() {
      runtime.user = '';
      runtime.state = null;
      runtime.candidates = [];
      runtime.action = '';
      runtime.question = null;
      runtime.reviewQuestion = null;
      runtime.reviewOriginalQuestion = null;
      runtime.reviewStage = '';
      runtime.reviewAttemptTracker = null;
      runtime.reviewOrder = [];
      runtime.reviewMatch = null;
      runtime.card = null;
      runtime.attemptTracker = null;
      runtime.disabledOptions = new Set();
      runtime.preparedState = null;
      runtime.preparedMeta = null;
      runtime.savedFeedback = null;
      runtime.saving = false;
      runtime.initialSavePending = false;
      runtime.error = '';
    }

    function cancelAdventureSpeech() {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch (_) {}
    }

    function setFeedback(message, tone, actionLabel, actionName) {
      const feedback = element('vocabularyAdventureFeedbackText');
      const action = element('vocabularyAdventureAction');
      if (feedback) {
        feedback.textContent = message || '';
        feedback.dataset.tone = tone || '';
      }
      if (action) {
        action.hidden = !actionLabel;
        action.textContent = actionLabel || '';
        action.onclick = actionName && typeof window[actionName] === 'function' ? window[actionName] : null;
      }
    }

    function setPlayerBody(html, mode) {
      const body = element('vocabularyAdventureBody');
      if (!body) return;
      body.dataset.mode = mode || '';
      body.innerHTML = html;
    }

    function renderProgress() {
      const session = runtime.state && runtime.state.session;
      if (!session) return;
      const screening = session.plan.filter(item => item.phase === 'screening');
      const reviewItems = session.plan.filter(item => item.phase === 'review');
      const screeningDone = screening.filter(item => item.status === 'completed').length;
      const reviewDone = reviewItems.filter(item => item.status === 'completed').length;
      const totalDone = session.plan.filter(item => item.status === 'completed').length;
      const screeningText = element('vocabularyAdventureScreeningProgress');
      const totalText = element('vocabularyAdventureTotalProgress');
      const fill = element('vocabularyAdventureProgressFill');
      const date = element('vocabularyAdventureSessionDate');
      const stageTitle = element('vocabularyAdventureStageTitle');
      const current = session.plan[session.cursor];
      const inReview = !!(current && current.phase === 'review');
      if (stageTitle) stageTitle.textContent = inReview ? '第二站 · 抗遗忘' : session.completed ? '今日完成' : '第一站 · 摸底';
      if (screeningText) {
        screeningText.textContent = inReview || session.completed
          ? `抗遗忘 ${reviewDone} / ${reviewItems.length}`
          : `摸底 ${screeningDone} / ${screening.length}`;
      }
      if (totalText) totalText.textContent = `今日计划 ${totalDone} / ${session.plan.length}`;
      if (fill) fill.style.width = `${session.plan.length ? (totalDone / session.plan.length) * 100 : 100}%`;
      if (date) {
        const today = core.localDateKey(new Date());
        date.textContent = session.date === today ? '' : `继续 ${session.date} 未完成计划`;
        date.hidden = session.date === today;
      }
    }

    function currentPlanItem() {
      const session = runtime.state && runtime.state.session;
      return session && !session.completed ? session.plan[session.cursor] : null;
    }

    function renderTerminalState(title, message, mode) {
      setPlayerBody(`
        <div class="vocabulary-adventure-terminal">
          <div class="vocabulary-adventure-terminal-icon">${mode === 'completed' ? '✅' : mode === 'boundary' ? '🚉' : '⚠️'}</div>
          <h2>${escapeAdventureHtml(title)}</h2>
          <p>${escapeAdventureHtml(message)}</p>
        </div>`, mode);
      setFeedback('', '', '返回首页', 'closeVocabularyAdventure');
    }

    function renderQuestion() {
      const question = runtime.question;
      const item = currentPlanItem();
      if (!question || !item) return;
      const labels = {
        wordToMeaning: '看单词，选择正确意思',
        audioToWord: '听一听，选择正确单词',
        meaningToWord: '看意思，选择正确单词'
      };
      const prompt = question.taskType === 'audioToWord'
        ? '<button type="button" class="vocabulary-adventure-audio-prompt" onclick="speakVocabularyAdventureCurrent()"><span>🔊</span> 再听一次</button>'
        : `<div class="vocabulary-adventure-prompt-text">${escapeAdventureHtml(question.prompt)}</div>`;
      setPlayerBody(`
        <div class="vocabulary-adventure-question">
          <div class="vocabulary-adventure-question-label">${labels[question.taskType]}</div>
          ${prompt}
          <div class="vocabulary-adventure-hint" id="vocabularyAdventureHint" hidden></div>
          <div class="vocabulary-adventure-options" id="vocabularyAdventureOptions">
            ${question.options.map((option, index) => (
              `<button type="button" data-option-index="${index}" onclick="answerVocabularyAdventure(${index})">${escapeAdventureHtml(option.label)}</button>`
            )).join('')}
          </div>
        </div>`, 'question');
      setFeedback('请选择答案', '', '', '');
      if (question.taskType === 'audioToWord') {
        window.setTimeout(() => speakVocabularyAdventureCurrent(), 120);
      }
    }

    const REVIEW_LABELS = {
      visualMatch: '视觉与英文配对',
      wordToMeaning: '看单词，选择正确意思',
      meaningToWord: '看意思，选择正确单词',
      audioToWord: '听发音，选择正确单词',
      phoneticToWord: '看音标，选择正确单词',
      missingLetters: '补全缺少的字母',
      letterOrder: '按顺序拼出单词',
      audioSpelling: '听发音，拼写单词',
      collocationCloze: '完成固定搭配',
      exampleCloze: '完成例句',
      sentenceOrder: '排列完整句子'
    };

    function reviewContext(item) {
      return {
        session: runtime.state.session,
        planItem: item,
        planIndex: runtime.state.session.cursor,
        wordState: runtime.state.words[item.wordKey],
        card: runtime.card,
        allCards: runtime.candidates,
        userKey: runtime.user
      };
    }

    function renderReviewChoice(question) {
      const audio = question.questionType === 'audioToWord'
        ? '<button type="button" class="vocabulary-adventure-audio-prompt" onclick="speakVocabularyAdventureCurrent()"><span>🔊</span> 再听一次</button>'
        : `<div class="vocabulary-adventure-prompt-text">${escapeAdventureHtml(question.prompt)}</div>`;
      return `
        ${audio}
        <div class="vocabulary-adventure-hint" id="vocabularyAdventureReviewHint" hidden></div>
        <div class="vocabulary-adventure-options" id="vocabularyAdventureReviewOptions">
          ${question.options.map((option, index) => (
            `<button type="button" data-option-index="${index}" onclick="answerVocabularyAdventureReviewChoice(${index})">${escapeAdventureHtml(option.label)}</button>`
          )).join('')}
        </div>`;
    }

    function renderReviewInput(question) {
      const audio = question.questionType === 'audioSpelling'
        ? '<button type="button" class="vocabulary-adventure-audio-prompt" onclick="speakVocabularyAdventureCurrent()"><span>🔊</span> 听一听</button>'
        : `<div class="vocabulary-adventure-prompt-text is-masked">${escapeAdventureHtml(question.prompt)}</div>`;
      return `
        ${audio}
        <div class="vocabulary-adventure-hint" id="vocabularyAdventureReviewHint" hidden></div>
        <div class="vocabulary-adventure-input-row">
          <input id="vocabularyAdventureReviewInput" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="输入答案">
          <button type="button" onclick="submitVocabularyAdventureReviewInput()">确认</button>
        </div>`;
    }

    function renderReviewOrderBoard() {
      const question = runtime.reviewQuestion;
      if (!question) return '';
      const chosen = new Set(runtime.reviewOrder);
      const selected = runtime.reviewOrder
        .map(id => question.tokens.find(token => token.id === id))
        .filter(Boolean);
      return `
        <div class="vocabulary-adventure-order-answer" aria-label="当前排列">
          ${selected.length
            ? selected.map(token => `<span>${escapeAdventureHtml(token.label)}</span>`).join('')
            : '<small>依次点击下面的内容</small>'}
        </div>
        <div class="vocabulary-adventure-order-pool">
          ${question.tokens.map(token => (
            `<button type="button" ${chosen.has(token.id) ? 'disabled' : ''} onclick="selectVocabularyAdventureReviewToken('${escapeAdventureHtml(token.id)}')">${escapeAdventureHtml(token.label)}</button>`
          )).join('')}
        </div>
        <div class="vocabulary-adventure-order-actions">
          <button type="button" onclick="clearVocabularyAdventureReviewOrder()">重排</button>
          <button type="button" class="primary" onclick="submitVocabularyAdventureReviewOrder()">确认</button>
        </div>
        <div class="vocabulary-adventure-hint" id="vocabularyAdventureReviewHint" hidden></div>`;
    }

    function renderReviewMatchBoard() {
      const question = runtime.reviewQuestion;
      const match = runtime.reviewMatch;
      if (!question || !match) return '';
      return `
        <div class="vocabulary-adventure-match-status">已配对 ${match.matchedPairs.size} / ${question.pairs.length} · 错配 ${match.errors}</div>
        <div class="vocabulary-adventure-match-board">
          ${question.cards.map(card => {
            const matched = match.matchedCards.has(card.id);
            const selected = match.selectedId === card.id;
            return `<button type="button"
              class="${matched ? 'is-matched' : ''} ${selected ? 'is-selected' : ''}"
              ${matched ? 'disabled' : ''}
              aria-pressed="${selected}"
              onclick="selectVocabularyAdventureMatchCard('${escapeAdventureHtml(card.id)}')">
              <small>${card.side === 'word' ? '英文' : card.kind === 'meaning' ? '意思' : '视觉'}</small>
              <span>${escapeAdventureHtml(card.label)}</span>
            </button>`;
          }).join('')}
        </div>`;
    }

    function renderReviewQuestion() {
      const question = runtime.reviewQuestion;
      if (!question) return;
      const confirmation = runtime.reviewStage === 'confirmation';
      const usageConfirmation = confirmation
        && runtime.reviewOriginalQuestion
        && runtime.reviewOriginalQuestion.requiresUsageConfirmation;
      let body = '';
      if (question.interaction === 'choice') body = renderReviewChoice(question);
      if (question.interaction === 'input') body = renderReviewInput(question);
      if (question.interaction === 'order') body = renderReviewOrderBoard();
      if (question.interaction === 'match') body = renderReviewMatchBoard();
      setPlayerBody(`
        <div class="vocabulary-adventure-question is-review ${confirmation ? 'is-confirmation' : ''}">
          <div class="vocabulary-adventure-question-label">${confirmation ? `${usageConfirmation ? '使用题后' : '配对后'} · 基础意义确认` : REVIEW_LABELS[question.questionType] || '抗遗忘检索'}</div>
          ${confirmation ? `<p class="vocabulary-adventure-confirmation-note">${usageConfirmation ? '刚才的使用题较难' : '刚才的配对错误较多'}，再确认一次这个词的基本意思。</p>` : ''}
          ${question.interaction === 'order' ? `<div class="vocabulary-adventure-order-prompt">${escapeAdventureHtml(question.prompt)}</div>` : ''}
          ${body}
        </div>`, question.interaction === 'match' ? 'match' : 'review');
      setFeedback(
        confirmation ? '本题答对记为 H；答错记为 F' : question.interaction === 'match' ? '找出视觉卡和英文卡的配对' : '完成本次抗遗忘检索',
        confirmation ? 'hinted' : '',
        '',
        ''
      );
      if (question.questionType === 'audioToWord' || question.questionType === 'audioSpelling') {
        window.setTimeout(() => speakVocabularyAdventureCurrent(), 120);
      }
      const input = element('vocabularyAdventureReviewInput');
      if (input) input.focus();
    }

    function renderVocabularyAdventureSummary() {
      const summary = core.summarizeVocabularyAdventureSession(runtime.state);
      const noReview = summary.reviewTotal === 0
        ? '<p class="vocabulary-adventure-summary-note">今日无抗遗忘目标。</p>'
        : '';
      setPlayerBody(`
        <div class="vocabulary-adventure-summary">
          <div class="vocabulary-adventure-terminal-icon">✅</div>
          <h2>今日完成</h2>
          ${noReview}
          <div class="vocabulary-adventure-summary-grid">
            <div><strong>${summary.total}</strong><span>总目标</span></div>
            <div><strong>${summary.screeningCompleted}</strong><span>摸底完成</span></div>
            <div><strong>${summary.reviewCompleted}</strong><span>抗遗忘完成</span></div>
            <div><strong>${summary.direct}</strong><span>D 直接答对</span></div>
            <div><strong>${summary.hinted}</strong><span>H 提示后</span></div>
            <div><strong>${summary.failed}</strong><span>F 待加强</span></div>
            <div><strong>${summary.usageWeak}</strong><span>使用较弱</span></div>
          </div>
          ${summary.severeOverdueCompleted ? '<p class="vocabulary-adventure-summary-note">严重逾期词已完成复查。</p>' : ''}
          <p>下次可以继续从首页进入探险。</p>
        </div>`, 'summary');
      setFeedback('今日计划已保存完成', 'direct', '返回首页', 'closeVocabularyAdventure');
    }

    function prepareReviewQuestion(item) {
      const candidate = runtime.candidates.find(entry => entry.key === item.wordKey);
      if (!candidate) {
        runtime.error = `当前抗遗忘单词 ${item.wordKey} 已不存在或不再可见`;
        renderTerminalState('无法读取当前单词', runtime.error, 'error');
        return false;
      }
      runtime.card = candidate.card;
      runtime.reviewQuestion = review.buildVocabularyAdventureReviewQuestion(reviewContext(item));
      if (!runtime.reviewQuestion.ok) {
        runtime.error = `单词 ${item.wordKey} 暂时不能安全出题`;
        console.warn('Vocabulary adventure review question unavailable', {
          wordKey: item.wordKey,
          reason: runtime.reviewQuestion.reason,
          attemptedTypes: runtime.reviewQuestion.attemptedTypes
        });
        renderTerminalState('这张卡暂时不能出题', '请返回首页，检查卡片字段后再试。', 'error');
        return false;
      }
      runtime.reviewOriginalQuestion = runtime.reviewQuestion;
      runtime.reviewStage = 'question';
      runtime.reviewAttemptTracker = createVocabularyAdventureAttemptTracker();
      runtime.reviewOrder = [];
      runtime.reviewMatch = runtime.reviewQuestion.interaction === 'match'
        ? { selectedId: '', matchedCards: new Set(), matchedPairs: new Set(), errors: 0 }
        : null;
      renderReviewQuestion();
      return true;
    }

    function renderReviewHint() {
      const hint = element('vocabularyAdventureReviewHint');
      if (!hint || !runtime.reviewQuestion || !runtime.card) return;
      const firstLetter = String(runtime.card.word || '').trim().charAt(0).toUpperCase();
      hint.innerHTML = `
        ${runtime.card.emoji ? `<span>${escapeAdventureHtml(runtime.card.emoji)}</span>` : ''}
        <strong>首字母：${escapeAdventureHtml(firstLetter)}…</strong>
        <button type="button" onclick="speakVocabularyAdventureCurrent()">🔊 再听一次</button>`;
      hint.hidden = false;
      setFeedback('再试一次：这次答完会得到正式结果', 'hinted', '', '');
      const input = element('vocabularyAdventureReviewInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    }

    function startVocabularyAdventureMeaningConfirmation() {
      const item = currentPlanItem();
      runtime.reviewOriginalQuestion = runtime.reviewOriginalQuestion || runtime.reviewQuestion;
      runtime.reviewQuestion = review.buildVocabularyAdventureMeaningConfirmation(reviewContext(item));
      if (!runtime.reviewQuestion.ok) {
        runtime.error = `单词 ${item.wordKey} 无法生成基础意义确认`;
        console.warn('Vocabulary adventure confirmation unavailable', runtime.reviewQuestion);
        renderTerminalState('这张卡暂时不能确认', '当前结果没有保存，修正卡片后可继续。', 'error');
        return;
      }
      runtime.reviewStage = 'confirmation';
      runtime.reviewAttemptTracker = null;
      runtime.reviewOrder = [];
      renderReviewQuestion();
    }

    async function prepareAndSaveVocabularyAdventureReview(result, outcomeDetail, confirmationTaskType) {
      const session = runtime.state.session;
      const item = session.plan[session.cursor];
      const original = runtime.reviewOriginalQuestion || runtime.reviewQuestion;
      try {
        runtime.preparedState = core.prepareVocabularyAdventureReviewResult(runtime.state, {
          expectedCursor: session.cursor,
          wordKey: item.wordKey,
          taskType: original.questionType,
          confirmationTaskType: confirmationTaskType || '',
          outcomeDetail: outcomeDetail || '',
          result,
          reviewedAt: new Date()
        });
        runtime.preparedMeta = {
          phase: 'review',
          result,
          taskType: original.questionType,
          confirmationTaskType: confirmationTaskType || '',
          outcomeDetail: outcomeDetail || ''
        };
      } catch (error) {
        runtime.error = error.message || '无法准备抗遗忘结果';
        setFeedback(runtime.error, 'failed', '返回首页', 'closeVocabularyAdventure');
        return;
      }
      await savePreparedVocabularyAdventureResult();
    }

    async function finishVocabularyAdventureReviewAnswer(correct) {
      const question = runtime.reviewQuestion;
      if (!question || runtime.preparedState || runtime.saving) return;
      if (runtime.reviewStage === 'confirmation') {
        const usageWeak = !!(
          runtime.reviewOriginalQuestion
          && runtime.reviewOriginalQuestion.requiresUsageConfirmation
          && correct
        );
        await prepareAndSaveVocabularyAdventureReview(
          correct ? 'H' : 'F',
          usageWeak ? 'usageWeak' : '',
          question.questionType
        );
        return;
      }
      if (question.requiresUsageConfirmation) {
        if (correct) await prepareAndSaveVocabularyAdventureReview('D', '', '');
        else startVocabularyAdventureMeaningConfirmation();
        return;
      }
      const outcome = runtime.reviewAttemptTracker.answer(correct);
      if (outcome.kind === 'hint') {
        renderReviewHint();
        return;
      }
      if (outcome.kind === 'result') {
        await prepareAndSaveVocabularyAdventureReview(outcome.result, '', '');
      }
    }

    async function answerVocabularyAdventureReviewChoice(optionIndex) {
      if (!runtime.reviewQuestion || runtime.reviewQuestion.interaction !== 'choice') return;
      const index = Number(optionIndex);
      const buttons = [...document.querySelectorAll('#vocabularyAdventureReviewOptions button')];
      if (!runtime.reviewQuestion.options[index] || buttons[index] && buttons[index].disabled) return;
      const correct = review.gradeVocabularyAdventureReviewQuestion(runtime.reviewQuestion, index);
      if (
        !correct
        && runtime.reviewStage !== 'confirmation'
        && !runtime.reviewQuestion.requiresUsageConfirmation
        && runtime.reviewAttemptTracker
        && runtime.reviewAttemptTracker.snapshot().attemptCount === 0
      ) {
        if (buttons[index]) {
          buttons[index].disabled = true;
          buttons[index].classList.add('is-wrong');
        }
      }
      await finishVocabularyAdventureReviewAnswer(correct);
    }

    async function submitVocabularyAdventureReviewInput() {
      const input = element('vocabularyAdventureReviewInput');
      if (!input || !runtime.reviewQuestion || runtime.reviewQuestion.interaction !== 'input') return;
      await finishVocabularyAdventureReviewAnswer(
        review.gradeVocabularyAdventureReviewQuestion(runtime.reviewQuestion, input.value)
      );
    }

    function selectVocabularyAdventureReviewToken(tokenId) {
      if (!runtime.reviewQuestion || runtime.reviewQuestion.interaction !== 'order') return;
      if (!runtime.reviewQuestion.tokens.some(token => token.id === tokenId)) return;
      if (!runtime.reviewOrder.includes(tokenId)) runtime.reviewOrder.push(tokenId);
      renderReviewQuestion();
    }

    function clearVocabularyAdventureReviewOrder() {
      runtime.reviewOrder = [];
      renderReviewQuestion();
    }

    async function submitVocabularyAdventureReviewOrder() {
      if (!runtime.reviewQuestion || runtime.reviewQuestion.interaction !== 'order') return;
      await finishVocabularyAdventureReviewAnswer(
        review.gradeVocabularyAdventureReviewQuestion(runtime.reviewQuestion, runtime.reviewOrder)
      );
    }

    async function selectVocabularyAdventureMatchCard(cardId) {
      const question = runtime.reviewQuestion;
      const match = runtime.reviewMatch;
      if (!question || question.interaction !== 'match' || !match || match.matchedCards.has(cardId)) return;
      const card = question.cards.find(entry => entry.id === cardId);
      if (!card) return;
      if (!match.selectedId) {
        match.selectedId = cardId;
        renderReviewQuestion();
        return;
      }
      if (match.selectedId === cardId) {
        match.selectedId = '';
        renderReviewQuestion();
        return;
      }
      const first = question.cards.find(entry => entry.id === match.selectedId);
      const paired = first && first.pairKey === card.pairKey && first.side !== card.side;
      if (paired) {
        match.matchedCards.add(first.id);
        match.matchedCards.add(card.id);
        match.matchedPairs.add(card.pairKey);
      } else {
        match.errors += 1;
      }
      match.selectedId = '';
      renderReviewQuestion();
      if (match.matchedPairs.size === question.pairs.length) {
        const outcome = review.visualMatchOutcome(match.errors);
        if (outcome.requiresConfirmation) startVocabularyAdventureMeaningConfirmation();
        else await prepareAndSaveVocabularyAdventureReview(outcome.result, '', '');
      } else if (!paired) {
        setFeedback('这两张不匹配，继续找一找', 'failed', '', '');
      } else {
        setFeedback('配对成功', 'direct', '', '');
      }
    }

    function renderCurrentVocabularyAdventure() {
      renderProgress();
      const session = runtime.state && runtime.state.session;
      if (!session) {
        renderTerminalState('暂时无法开始', '没有可用的探险计划。', 'error');
        return;
      }
      if (runtime.savedFeedback) {
        const feedback = runtime.savedFeedback;
        if (feedback.result === 'F') {
          setPlayerBody(`
            <div class="vocabulary-adventure-result is-failed">
              <div class="vocabulary-adventure-result-title">再认识一次这个词</div>
              ${renderAdventureFullCardHtml(feedback.card)}
            </div>`, 'result');
          setFeedback('这次先记为 F，明天会更快再见到它。', 'failed', '继续', 'nextVocabularyAdventure');
        } else {
          const hinted = feedback.result === 'H';
          const usageWeak = feedback.outcomeDetail === 'usageWeak';
          setPlayerBody(`
            <div class="vocabulary-adventure-result ${hinted ? 'is-hinted' : 'is-direct'}">
              <div class="vocabulary-adventure-result-icon">${hinted ? '💡' : '✨'}</div>
              <h2>${usageWeak ? '基本意思记得，使用还要加强' : hinted ? '提示后答对' : '第一次就答对'}</h2>
              <p>${escapeAdventureHtml(feedback.card.word)} · ${escapeAdventureHtml(feedback.card.meaning)}</p>
            </div>`, 'result');
          setFeedback(
            usageWeak ? '已记录为 H，当前间隔保持不变' : hinted ? '已记录为 H' : '已记录为 D',
            hinted ? 'hinted' : 'direct',
            '继续',
            'nextVocabularyAdventure'
          );
        }
        return;
      }
      if (session.completed) {
        renderVocabularyAdventureSummary();
        return;
      }
      const item = currentPlanItem();
      if (!item) {
        renderTerminalState('计划状态异常', '找不到当前计划项，请返回首页后重试。', 'error');
        return;
      }
      if (item.status !== 'pending') {
        renderTerminalState('计划状态异常', '当前计划项已经完成，但游标尚未更新。', 'error');
        return;
      }
      if (item.phase === 'review') {
        if (!runtime.reviewQuestion) prepareReviewQuestion(item);
        return;
      }

      const candidate = runtime.candidates.find(entry => entry.key === item.wordKey);
      if (!candidate) {
        runtime.error = `当前单词 ${item.wordKey} 已不存在或不再可见`;
        renderTerminalState('无法读取当前单词', runtime.error, 'error');
        return;
      }
      runtime.card = candidate.card;
      const previous = runtime.state.words[item.wordKey];
      runtime.question = core.buildVocabularyAdventureQuestion({
        candidates: runtime.candidates,
        sessionDate: session.date,
        wordKey: item.wordKey,
        planIndex: session.cursor,
        lastTaskType: previous && previous.lastTaskType
      });
      if (!runtime.question.ok) {
        runtime.error = runtime.question.code === 'INSUFFICIENT_OPTIONS'
          ? `单词 ${item.wordKey} 缺少至少 2 个有效选项`
          : `单词 ${item.wordKey} 已不存在或不再可见`;
        renderTerminalState('无法生成题目', runtime.error, 'error');
        return;
      }
      runtime.attemptTracker = createVocabularyAdventureAttemptTracker();
      runtime.disabledOptions = new Set();
      renderQuestion();
    }

    function renderHint() {
      const hint = element('vocabularyAdventureHint');
      if (!hint || !runtime.question || !runtime.card) return;
      const firstLetter = String(runtime.card.word || '').trim().charAt(0).toUpperCase();
      if (runtime.question.taskType === 'wordToMeaning') {
        hint.innerHTML = `${runtime.card.emoji ? `<span>${escapeAdventureHtml(runtime.card.emoji)}</span>` : ''}<button type="button" onclick="speakVocabularyAdventureCurrent()">🔊 再听一次</button>`;
      } else {
        hint.innerHTML = `<strong>首字母：${escapeAdventureHtml(firstLetter)}…</strong><button type="button" onclick="speakVocabularyAdventureCurrent()">🔊 再听一次</button>`;
      }
      hint.hidden = false;
      const buttons = [...document.querySelectorAll('#vocabularyAdventureOptions button')];
      buttons.forEach((button, index) => {
        if (runtime.disabledOptions.has(index)) {
          button.disabled = true;
          button.classList.add('is-wrong');
        }
      });
      setFeedback('再试一次：这次答完会得到正式结果', 'hinted', '', '');
    }

    async function savePreparedVocabularyAdventureResult() {
      if (!runtime.preparedState || runtime.saving) return;
      runtime.saving = true;
      setFeedback('正在保存本词结果…', '', '', '');
      const preparedState = runtime.preparedState;
      const saved = await saveCurrentVocabularyAdventureState(preparedState);
      runtime.saving = false;
      if (!saved) {
        setFeedback('保存失败，请重新保存；进度尚未前进。', 'failed', '重新保存', 'retryVocabularyAdventureResultSave');
        return;
      }
      runtime.state = preparedState;
      runtime.savedFeedback = {
        result: runtime.preparedMeta.result,
        card: runtime.card,
        taskType: runtime.preparedMeta.taskType,
        phase: runtime.preparedMeta.phase || 'screening',
        outcomeDetail: runtime.preparedMeta.outcomeDetail || ''
      };
      runtime.preparedState = null;
      runtime.preparedMeta = null;
      renderCurrentVocabularyAdventure();
    }

    async function answerVocabularyAdventure(optionIndex) {
      if (runtime.saving || runtime.preparedState || runtime.savedFeedback || !runtime.question || !runtime.attemptTracker) return;
      const index = Number(optionIndex);
      const option = runtime.question.options[index];
      if (!option || runtime.disabledOptions.has(index)) return;
      const outcome = runtime.attemptTracker.answer(index === runtime.question.correctIndex);
      const buttons = [...document.querySelectorAll('#vocabularyAdventureOptions button')];
      if (outcome.kind === 'hint') {
        runtime.disabledOptions.add(index);
        renderHint();
        return;
      }
      if (outcome.kind !== 'result') return;
      buttons.forEach((button, buttonIndex) => {
        button.disabled = true;
        if (buttonIndex === runtime.question.correctIndex) button.classList.add('is-correct');
        else if (buttonIndex === index) button.classList.add('is-wrong');
      });
      const session = runtime.state.session;
      const item = session.plan[session.cursor];
      try {
        runtime.preparedState = core.prepareVocabularyAdventureResult(runtime.state, {
          expectedCursor: session.cursor,
          wordKey: item.wordKey,
          taskType: runtime.question.taskType,
          result: outcome.result,
          reviewedAt: new Date()
        });
        runtime.preparedMeta = { result: outcome.result, taskType: runtime.question.taskType };
      } catch (error) {
        runtime.error = error.message || '无法准备本词结果';
        setFeedback(runtime.error, 'failed', '返回首页', 'closeVocabularyAdventure');
        return;
      }
      await savePreparedVocabularyAdventureResult();
    }

    async function retryVocabularyAdventureResultSave() {
      await savePreparedVocabularyAdventureResult();
    }

    async function retryVocabularyAdventureInitialSave() {
      if (!runtime.initialSavePending || !runtime.state || runtime.saving) return;
      runtime.saving = true;
      setFeedback('正在重新保存今日计划…', '', '', '');
      const saved = await saveCurrentVocabularyAdventureState(runtime.state);
      runtime.saving = false;
      if (!saved) {
        setFeedback('今日计划仍未保存，不能开始答题。', 'failed', '重新保存', 'retryVocabularyAdventureInitialSave');
        return;
      }
      runtime.initialSavePending = false;
      renderCurrentVocabularyAdventure();
    }

    function nextVocabularyAdventure() {
      if (runtime.preparedState || runtime.saving) return;
      runtime.savedFeedback = null;
      runtime.question = null;
      runtime.reviewQuestion = null;
      runtime.reviewOriginalQuestion = null;
      runtime.reviewStage = '';
      runtime.reviewAttemptTracker = null;
      runtime.reviewOrder = [];
      runtime.reviewMatch = null;
      runtime.card = null;
      runtime.attemptTracker = null;
      runtime.disabledOptions = new Set();
      renderCurrentVocabularyAdventure();
    }

    function speakVocabularyAdventureCurrent() {
      if (!runtime.card || !runtime.card.word) return;
      if (typeof speakEnglish === 'function') speakEnglish(runtime.card.word);
    }

    async function openVocabularyAdventure() {
      if (!['sister', 'brother'].includes(currentUserValue())) return;
      resetVocabularyAdventurePlayerRuntime();
      showScreen('screenVocabularyAdventure');
      setPlayerBody('<div class="vocabulary-adventure-loading">正在准备今日探险…</div>', 'loading');
      setFeedback('', '', '', '');
      try {
        const context = await loadVocabularyAdventurePlayerContext(core.localDateKey(new Date()));
        runtime.user = context.user;
        runtime.state = context.state;
        runtime.candidates = context.candidates;
        runtime.action = context.action;
        if (context.action === 'unavailable') {
          renderTerminalState('当前用户不可用', '探险预览仅供姐姐和弟弟使用。', 'error');
          return;
        }
        if (context.action === 'created' && context.saved === false) {
          runtime.initialSavePending = true;
          renderProgress();
          setPlayerBody(`
            <div class="vocabulary-adventure-terminal">
              <div class="vocabulary-adventure-terminal-icon">☁️</div>
              <h2>今日计划尚未保存</h2>
              <p>保存成功后才能开始答题。</p>
            </div>`, 'error');
          setFeedback('保存失败，当前还没有开始答题。', 'failed', '重新保存', 'retryVocabularyAdventureInitialSave');
          return;
        }
        renderCurrentVocabularyAdventure();
      } catch (error) {
        runtime.error = error.message || '读取探险状态失败';
        renderTerminalState('无法开始探险', runtime.error, 'error');
      }
    }

    function closeVocabularyAdventure() {
      if (runtime.preparedState || runtime.initialSavePending) {
        const discard = window.confirm('还有未保存内容。确定取消本次未保存结果并返回首页吗？');
        if (!discard) return;
      }
      cancelAdventureSpeech();
      resetVocabularyAdventurePlayerRuntime();
      showScreen('screenHome');
      if (typeof loadHome === 'function') loadHome();
    }

    return {
      updateVocabularyAdventurePreviewEntry,
      resetVocabularyAdventurePlayerRuntime,
      openVocabularyAdventure,
      closeVocabularyAdventure,
      answerVocabularyAdventure,
      answerVocabularyAdventureReviewChoice,
      submitVocabularyAdventureReviewInput,
      selectVocabularyAdventureReviewToken,
      clearVocabularyAdventureReviewOrder,
      submitVocabularyAdventureReviewOrder,
      selectVocabularyAdventureMatchCard,
      retryVocabularyAdventureResultSave,
      retryVocabularyAdventureInitialSave,
      nextVocabularyAdventure,
      speakVocabularyAdventureCurrent
    };
  }

  return {
    PREVIEW_STORAGE_KEY,
    isVocabularyAdventurePreviewEnabled,
    createVocabularyAdventureAttemptTracker,
    createVocabularyAdventureSaveCoordinator,
    renderAdventureFullCardHtml,
    createVocabularyAdventureBrowserApi
  };
});
