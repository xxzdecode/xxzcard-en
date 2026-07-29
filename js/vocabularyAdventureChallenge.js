(function vocabularyAdventureChallengeModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const review = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureReview.js')
    : root.VocabularyAdventureReview;
  const exported = factory(core, review);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && typeof module !== 'object') {
    root.VocabularyAdventureChallenge = exported;
    Object.assign(root, exported.createVocabularyAdventureChallengeBrowserApi());
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureChallengeModule(core, review) {
  'use strict';

  const CHALLENGE_LIMIT = 10;
  const DAILY_LIMIT = 2;
  const CHALLENGE_TYPES = Object.freeze([
    'exampleCloze',
    'meaningToWord',
    'wordToMeaning',
    'audioToWord',
    'missingLetters',
    'letterOrder',
    'audioSpelling',
    'phoneticToWord',
    'collocationCloze',
    'sentenceOrder'
  ]);

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function count(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function clone(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function localDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1])
      && date.getMonth() === Number(match[2]) - 1
      && date.getDate() === Number(match[3]);
  }

  function normalizeChallengeDaily(value, today) {
    const source = plainObject(value) && value.date === today ? value : {};
    return {
      date: today,
      attempts: Math.min(DAILY_LIMIT, count(source.attempts)),
      bestScore: Math.max(0, Math.min(100, count(source.bestScore)))
    };
  }

  function normalizeChallengeItem(value) {
    if (!plainObject(value)) return null;
    const wordKey = core.adventureWordKey(value.wordKey);
    const question = plainObject(value.question) ? clone(value.question) : null;
    if (!wordKey || !question || !question.ok) return null;
    const answered = value.status === 'answered';
    return {
      wordKey,
      taskType: typeof value.taskType === 'string'
        ? value.taskType
        : String(question.questionType || question.taskType || ''),
      question,
      status: answered ? 'answered' : 'pending',
      userAnswer: answered ? clone(value.userAnswer) : null,
      correct: answered ? value.correct === true : null,
      answeredAt: answered && typeof value.answeredAt === 'string' ? value.answeredAt : ''
    };
  }

  function correctAnswerText(question) {
    if (!plainObject(question)) return '';
    if (question.interaction === 'choice') {
      const option = (Array.isArray(question.options) ? question.options : [])[Number(question.correctIndex)];
      return String(option && option.label || '');
    }
    if (question.interaction === 'input') return String(question.fullAnswer || question.answer || '');
    if (question.interaction === 'order') {
      const byId = new Map((Array.isArray(question.tokens) ? question.tokens : []).map(token => [token.id, token.label]));
      const labels = (Array.isArray(question.answer) ? question.answer : []).map(id => byId.get(id) || '');
      return question.questionType === 'letterOrder' ? labels.join('') : labels.join(' ');
    }
    return '';
  }

  function userAnswerText(question, answer) {
    if (!plainObject(question)) return '';
    if (question.interaction === 'choice') {
      const option = (Array.isArray(question.options) ? question.options : [])[Number(answer)];
      return String(option && option.label || '');
    }
    if (question.interaction === 'input') return String(answer == null ? '' : answer);
    if (question.interaction === 'order') {
      const byId = new Map((Array.isArray(question.tokens) ? question.tokens : []).map(token => [token.id, token.label]));
      const labels = (Array.isArray(answer) ? answer : []).map(id => byId.get(id) || '');
      return question.questionType === 'letterOrder' ? labels.join('') : labels.join(' ');
    }
    return '';
  }

  function normalizeChallengeSession(value) {
    if (!plainObject(value) || !localDate(value.date)) return null;
    const items = Array.isArray(value.items) ? value.items.map(normalizeChallengeItem).filter(Boolean) : [];
    if (items.length !== CHALLENGE_LIMIT) return null;

    let cursor = Math.max(0, Math.min(items.length, count(value.cursor)));
    const answeredCount = items.filter(item => item.status === 'answered').length;
    cursor = Math.max(cursor, answeredCount);
    const status = value.status === 'completed'
      ? 'completed'
      : value.status === 'abandoned'
        ? 'abandoned'
        : 'active';

    return {
      date: value.date,
      attemptIndex: Math.max(1, count(value.attemptIndex) || 1),
      seed: String(value.seed || ''),
      status,
      items,
      cursor: status === 'completed' ? items.length : cursor,
      correctCount: items.filter(item => item.correct === true).length,
      wrongCount: items.filter(item => item.correct === false).length,
      wrongItems: items.filter(item => item.correct === false).map(item => ({
        wordKey: item.wordKey,
        taskType: item.taskType,
        userAnswer: userAnswerText(item.question, item.userAnswer),
        correctAnswer: correctAnswerText(item.question)
      })),
      startedAt: typeof value.startedAt === 'string' ? value.startedAt : '',
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
      completedAt: typeof value.completedAt === 'string' ? value.completedAt : ''
    };
  }

  function normalizeChallengeState(value, today) {
    const state = core.normalizeVocabularyAdventureState(value);
    state.challengeDaily = normalizeChallengeDaily(state.challengeDaily, today);
    state.challengeSession = normalizeChallengeSession(state.challengeSession);
    return state;
  }

  function challengeCandidatePriority(wordState, today) {
    if (wordState.lastResult === 'F') return 0;
    if (wordState.lastResult === 'H') return 1;
    if (wordState.nextReviewAt && wordState.nextReviewAt <= today) return 2;
    if (wordState.intervalIndex >= 4) return 4;
    return 3;
  }

  function collectChallengeCandidates(candidates, stateValue, today) {
    const state = core.normalizeVocabularyAdventureState(stateValue);
    return (Array.isArray(candidates) ? candidates : [])
      .filter(candidate => {
        const key = core.adventureWordKey(candidate && candidate.key);
        const wordState = state.words[key];
        return candidate
          && candidate.card
          && wordState
          && wordState.reviewCount > 0
          && !wordState.challengeFlagAt;
      })
      .map(candidate => ({
        ...candidate,
        challengePriority: challengeCandidatePriority(state.words[core.adventureWordKey(candidate.key)], today)
      }));
  }

  function serializeQuestion(value) {
    const question = clone(value);
    delete question.card;
    delete question.attemptedTypes;
    question.questionType = question.questionType || question.taskType;
    delete question.taskType;
    return question;
  }

  function buildQuestionForCandidate(context, desiredType) {
    const registry = review.VocabularyAdventureReviewTypes;
    const start = Math.max(0, CHALLENGE_TYPES.indexOf(desiredType));
    const ordered = [...CHALLENGE_TYPES.slice(start), ...CHALLENGE_TYPES.slice(0, start)];
    for (const taskType of ordered) {
      const builder = registry[taskType];
      if (!builder) continue;
      const question = builder.build({ ...context, taskType });
      if (question && question.ok && question.interaction !== 'match') {
        return serializeQuestion({
          ...question,
          questionType: taskType,
          requiresUsageConfirmation: false
        });
      }
    }
    return null;
  }

  function buildChallengeSession(options) {
    const settings = plainObject(options) ? options : {};
    const today = String(settings.today || '');
    const userKey = String(settings.userKey || '');
    const attemptIndex = Math.max(1, count(settings.attemptIndex) || 1);
    const candidates = collectChallengeCandidates(settings.candidates, settings.state, today);
    if (candidates.length < CHALLENGE_LIMIT) {
      return { ok: false, code: 'INSUFFICIENT_CHALLENGE_WORDS', available: candidates.length };
    }

    const seed = `${today}|${userKey}|challenge|${attemptIndex}`;
    const ordered = [];
    [...new Set(candidates.map(candidate => candidate.challengePriority))]
      .sort((a, b) => a - b)
      .forEach(priority => {
        ordered.push(...core.deterministicAdventureShuffle(
          candidates.filter(candidate => candidate.challengePriority === priority),
          `${seed}|priority:${priority}`,
          candidate => candidate.key
        ));
      });

    const targets = ordered.slice(0, CHALLENGE_LIMIT);
    const items = [];
    const normalizedState = core.normalizeVocabularyAdventureState(settings.state);
    for (let index = 0; index < targets.length; index += 1) {
      const candidate = targets[index];
      const desiredOffset = (core.stableAdventureHash(`${seed}|types`) + index) % CHALLENGE_TYPES.length;
      const desiredType = CHALLENGE_TYPES[desiredOffset];
      const question = buildQuestionForCandidate({
        session: { date: today },
        planItem: { wordKey: candidate.key, taskType: desiredType },
        planIndex: index,
        wordState: normalizedState.words[candidate.key],
        allCards: candidates,
        userKey: `${userKey}|attempt:${attemptIndex}`,
        reason: 'due'
      }, desiredType);
      if (!question) {
        return { ok: false, code: 'NO_SAFE_CHALLENGE_QUESTION', wordKey: candidate.key };
      }
      items.push({
        wordKey: candidate.key,
        taskType: question.questionType,
        question,
        status: 'pending',
        userAnswer: null,
        correct: null,
        answeredAt: ''
      });
    }

    const startedAt = String(settings.startedAt || new Date().toISOString());
    return {
      ok: true,
      session: {
        date: today,
        attemptIndex,
        seed,
        status: 'active',
        items,
        cursor: 0,
        correctCount: 0,
        wrongCount: 0,
        wrongItems: [],
        startedAt,
        updatedAt: startedAt,
        completedAt: ''
      }
    };
  }

  function prepareChallengeAnswer(stateValue, submission) {
    const input = plainObject(submission) ? submission : {};
    const today = String(input.today || '');
    const state = normalizeChallengeState(stateValue, today);
    const session = state.challengeSession;
    if (!session || session.status !== 'active') throw new Error('CHALLENGE_NOT_ACTIVE');
    if (session.cursor !== Number(input.expectedCursor)) throw new Error('CHALLENGE_CURSOR_MISMATCH');

    const item = session.items[session.cursor];
    if (!item || item.status !== 'pending') throw new Error('CHALLENGE_ITEM_NOT_PENDING');
    if (item.wordKey !== core.adventureWordKey(input.wordKey)) throw new Error('CHALLENGE_WORD_MISMATCH');

    const correct = review.gradeVocabularyAdventureReviewQuestion(item.question, input.answer);
    const next = clone(state);
    const nextSession = next.challengeSession;
    const nextItem = nextSession.items[nextSession.cursor];
    nextItem.status = 'answered';
    nextItem.userAnswer = clone(input.answer);
    nextItem.correct = correct;
    nextItem.answeredAt = String(input.answeredAt || new Date().toISOString());
    nextSession.cursor += 1;
    nextSession.updatedAt = nextItem.answeredAt;
    nextSession.correctCount += correct ? 1 : 0;
    nextSession.wrongCount += correct ? 0 : 1;

    if (!correct) {
      const previousWordState = next.words[nextItem.wordKey] || {};
      next.words[nextItem.wordKey] = {
        ...previousWordState,
        challengeFlagAt: nextItem.answeredAt
      };
      nextSession.wrongItems.push({
        wordKey: nextItem.wordKey,
        taskType: nextItem.taskType,
        userAnswer: userAnswerText(nextItem.question, input.answer),
        correctAnswer: correctAnswerText(nextItem.question)
      });
    }

    const completed = nextSession.cursor >= nextSession.items.length;
    if (completed) {
      nextSession.status = 'completed';
      nextSession.completedAt = nextItem.answeredAt;
      next.challengeDaily.attempts = Math.min(DAILY_LIMIT, next.challengeDaily.attempts + 1);
      const score = Math.round((nextSession.correctCount / CHALLENGE_LIMIT) * 100);
      next.challengeDaily.bestScore = Math.max(next.challengeDaily.bestScore, score);
    }

    return {
      state: normalizeChallengeState(next, today),
      correct,
      completed,
      correctAnswer: correctAnswerText(nextItem.question),
      userAnswer: userAnswerText(nextItem.question, input.answer)
    };
  }

  function prepareChallengeExit(stateValue, options) {
    const input = plainObject(options) ? options : {};
    const today = String(input.today || '');
    const state = normalizeChallengeState(stateValue, today);
    if (!state.challengeSession || state.challengeSession.status !== 'active') {
      throw new Error('CHALLENGE_NOT_ACTIVE');
    }

    const next = clone(state);
    const exitedAt = String(input.exitedAt || new Date().toISOString());
    next.challengeSession.status = 'abandoned';
    next.challengeSession.updatedAt = exitedAt;
    next.challengeSession.completedAt = exitedAt;
    next.challengeDaily.attempts = Math.min(DAILY_LIMIT, next.challengeDaily.attempts + 1);

    // Keep the existing challenge rule: exiting consumes one attempt and records
    // the score achieved so far against the fixed ten-question denominator.
    const score = Math.round((next.challengeSession.correctCount / CHALLENGE_LIMIT) * 100);
    next.challengeDaily.bestScore = Math.max(next.challengeDaily.bestScore, score);
    return normalizeChallengeState(next, today);
  }

  function challengeHomeStatus(options) {
    const settings = plainObject(options) ? options : {};
    const today = String(settings.today || '');
    const state = normalizeChallengeState(settings.state, today);
    const legacyAttempts = count(settings.legacyAttempts);
    const attempts = Math.min(DAILY_LIMIT, legacyAttempts + state.challengeDaily.attempts);
    const bestScore = Math.max(count(settings.legacyBestScore), state.challengeDaily.bestScore);
    const active = state.challengeSession
      && state.challengeSession.date === today
      && state.challengeSession.status === 'active';

    if (active) {
      return {
        state: 'continue',
        attempts,
        bestScore,
        text: `继续挑战 · ${state.challengeSession.cursor}/${CHALLENGE_LIMIT}`
      };
    }
    if (attempts >= DAILY_LIMIT) {
      return { state: 'locked', attempts, bestScore, text: `今日最高 ${bestScore} 分` };
    }

    const available = collectChallengeCandidates(settings.candidates, state, today).length;
    if (available < CHALLENGE_LIMIT) {
      return {
        state: 'insufficient',
        attempts,
        bestScore,
        available,
        text: `已摸底且无待复查 ${available}/10 个词`
      };
    }
    if (attempts > 0) {
      return {
        state: 'ready',
        attempts,
        bestScore,
        text: `最高 ${bestScore} 分 · 还可 ${DAILY_LIMIT - attempts} 次`
      };
    }
    return { state: 'ready', attempts, bestScore, text: '10 题综合挑战 · 今日可挑战' };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createVocabularyAdventureChallengeBrowserApi() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return {};

    const runtime = {
      user: '',
      state: null,
      candidates: [],
      legacy: { attempts: 0, bestScore: 0 },
      order: [],
      prepared: null,
      preparedMeta: null,
      saving: false
    };

    function element(id) {
      return document.getElementById(id);
    }

    function previewEnabled() {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('previewVocabularyAdventure') === '1') return true;
      try {
        return window.localStorage.getItem('wc_vocab_adventure_preview') === '1';
      } catch (_) {
        return false;
      }
    }

    function studentUser() {
      return typeof currentUser !== 'undefined' && ['sister', 'brother'].includes(currentUser)
        ? currentUser
        : '';
    }

    function toggleLegacyHome(hidden) {
      // The preview replaces only the old vocabulary quick actions. Grammar,
      // vocabulary tour, check-in and the bottom feature navigation stay usable.
      const node = element('homeQuickActions');
      if (!node) return;
      node.hidden = hidden;
      node.style.display = hidden ? 'none' : '';
    }

    async function updateVocabularyAdventurePreviewEntry() {
      const wrapper = element('studentDashboard');
      const adventureButton = element('vocabularyAdventurePreviewEntry');
      const enabled = !!studentUser();
      if (wrapper) wrapper.hidden = !enabled;
      if (adventureButton) adventureButton.hidden = !enabled;
      toggleLegacyHome(enabled);
      if (!enabled) return;

      const user = studentUser();
      const [state, legacy] = await Promise.all([
        loadVocabularyAdventureState(user),
        typeof getVocabularyAdventureLegacyChallengeUsage === 'function'
          ? getVocabularyAdventureLegacyChallengeUsage()
          : Promise.resolve({ attempts: 0, bestScore: 0 })
      ]);
      if (user !== studentUser()) return;

      const candidates = collectVisibleVocabularyAdventureCandidates();
      const session = state.session;
      const adventureTitle = element('vocabularyAdventureHomeTitle');
      const adventureSub = element('vocabularyAdventureHomeSub');
      const adventureStatus = element('vocabularyAdventureHomeStatus');
      if (adventureTitle) {
        adventureTitle.textContent = '词汇探险';
      }
      if (adventureSub) {
        adventureSub.textContent = '完成今日路线';
      }
      if (adventureStatus) {
        adventureStatus.textContent = session
          ? session.completed
            ? '今日已完成'
            : `继续探险 · ${session.cursor}/${session.plan.length}`
          : '未开始';
      }

      const status = challengeHomeStatus({
        state,
        candidates,
        today: core.localDateKey(new Date()),
        legacyAttempts: legacy.attempts,
        legacyBestScore: legacy.bestScore
      });
      const challengeButton = element('vocabularyAdventureChallengeEntry');
      const challengeTitle = element('vocabularyAdventureChallengeHomeTitle');
      const challengeSub = element('vocabularyAdventureChallengeHomeSub');
      if (challengeButton) {
        challengeButton.disabled = status.state === 'locked' || status.state === 'insufficient';
        challengeButton.dataset.state = status.state;
        challengeButton.setAttribute('aria-label', `单词挑战，${status.text}，最高10金币`);
      }
      if (challengeTitle) challengeTitle.textContent = '单词挑战';
      if (challengeSub) challengeSub.textContent = status.text;
    }

    function resetRuntime() {
      runtime.user = '';
      runtime.state = null;
      runtime.candidates = [];
      runtime.legacy = { attempts: 0, bestScore: 0 };
      runtime.order = [];
      runtime.prepared = null;
      runtime.preparedMeta = null;
      runtime.saving = false;
    }

    function setFeedback(message, tone, label, handler) {
      const text = element('vocabularyAdventureChallengeFeedbackText');
      const button = element('vocabularyAdventureChallengeAction');
      if (text) {
        text.textContent = message || '';
        text.dataset.tone = tone || '';
      }
      if (button) {
        button.hidden = !label;
        button.textContent = label || '';
        button.onclick = handler && typeof window[handler] === 'function'
          ? window[handler]
          : null;
      }
    }

    function currentSession() {
      return runtime.state && normalizeChallengeSession(runtime.state.challengeSession);
    }

    function currentItem() {
      const session = currentSession();
      return session && session.status === 'active' ? session.items[session.cursor] : null;
    }

    function targetCard(wordKey) {
      const candidate = runtime.candidates.find(item => item.key === wordKey);
      return candidate && candidate.card;
    }

    function renderProgress() {
      const session = currentSession();
      const countNode = element('vocabularyAdventureChallengeCount');
      const fill = element('vocabularyAdventureChallengeFill');
      if (!session) return;
      if (countNode) {
        countNode.textContent = `${Math.min(session.cursor + 1, CHALLENGE_LIMIT)}/${CHALLENGE_LIMIT}`;
      }
      if (fill) fill.style.width = `${(session.cursor / CHALLENGE_LIMIT) * 100}%`;
    }

    function questionPrompt(question) {
      const labels = {
        exampleCloze: '根据例句选择单词',
        meaningToWord: '根据意思选择单词',
        wordToMeaning: '选择正确意思',
        audioToWord: '听音选择单词',
        missingLetters: '补全缺少的字母',
        letterOrder: '排列字母',
        audioSpelling: '听音拼写',
        phoneticToWord: '根据音标选择单词',
        collocationCloze: '补全固定搭配',
        sentenceOrder: '排列句子'
      };
      return labels[question.questionType] || '完成这道题';
    }

    function renderQuestion() {
      const item = currentItem();
      const body = element('vocabularyAdventureChallengeBody');
      if (!item || !body) return;

      const question = item.question;
      runtime.order = [];
      const audio = ['audioToWord', 'audioSpelling'].includes(question.questionType)
        ? '<button type="button" class="vocabulary-adventure-audio-prompt" onclick="speakVocabularyAdventureChallengeWord()">🔊 再听一次</button>'
        : '';
      let interaction = '';

      if (question.interaction === 'choice') {
        interaction = `<div class="vocabulary-adventure-options">${question.options.map((option, index) => `
          <button type="button" onclick="answerVocabularyAdventureChallengeChoice(${index})">${escapeHtml(option.label)}</button>
        `).join('')}</div>`;
      } else if (question.interaction === 'input') {
        interaction = `<div class="vocabulary-adventure-review-input">
          <input id="vocabularyAdventureChallengeInput" autocomplete="off" autocapitalize="none" aria-label="输入答案">
          <button type="button" onclick="submitVocabularyAdventureChallengeInput()">确认</button>
        </div>`;
      } else if (question.interaction === 'order') {
        interaction = `<div class="vocabulary-adventure-order">
          <div class="vocabulary-adventure-order-answer" id="vocabularyAdventureChallengeOrderAnswer">点击下方卡片完成排列</div>
          <div class="vocabulary-adventure-order-bank">${question.tokens.map(token => `
            <button type="button" data-token="${escapeHtml(token.id)}" onclick="selectVocabularyAdventureChallengeToken('${escapeHtml(token.id)}')">${escapeHtml(token.label)}</button>
          `).join('')}</div>
          <div class="vocabulary-adventure-order-actions">
            <button type="button" onclick="clearVocabularyAdventureChallengeOrder()">重排</button>
            <button type="button" class="primary" onclick="submitVocabularyAdventureChallengeOrder()">确认</button>
          </div>
        </div>`;
      }

      body.innerHTML = `<div class="vocabulary-adventure-question">
        <div class="vocabulary-adventure-instruction">挑战 · 无提示</div>
        <h2>${escapeHtml(questionPrompt(question))}</h2>
        ${audio}
        ${question.prompt ? `<div class="vocabulary-adventure-prompt-text">${escapeHtml(question.prompt)}</div>` : ''}
        ${interaction}
      </div>`;
      setFeedback('确认后会立即保存本题结果', '', '', '');
      renderProgress();
      if (audio) window.setTimeout(() => speakVocabularyAdventureChallengeWord(), 100);
    }

    function renderResult() {
      const session = currentSession();
      const body = element('vocabularyAdventureChallengeBody');
      if (!session || !body) return;

      const daily = normalizeChallengeDaily(runtime.state.challengeDaily, session.date);
      const totalAttempts = Math.min(DAILY_LIMIT, runtime.legacy.attempts + daily.attempts);
      const bestScore = Math.max(runtime.legacy.bestScore || 0, daily.bestScore);
      body.innerHTML = `<div class="vocabulary-adventure-challenge-result">
        <div class="vocabulary-adventure-terminal-icon">🏁</div>
        <h2>挑战完成</h2>
        <p class="vocabulary-adventure-challenge-score">${session.correctCount * 10} 分</p>
        <div class="vocabulary-adventure-summary-grid">
          <div><strong>${session.correctCount}</strong><span>答对</span></div>
          <div><strong>${session.wrongCount}</strong><span>答错</span></div>
          <div><strong>${totalAttempts}</strong><span>今日已用</span></div>
          <div><strong>${bestScore}</strong><span>今日最高</span></div>
        </div>
        ${session.wrongItems.length ? `<div class="vocabulary-adventure-challenge-wrong">
          <h3>错题回顾</h3>
          ${session.wrongItems.map(wrong => {
            const card = targetCard(wrong.wordKey) || {};
            return `<article><strong>${escapeHtml(card.word || wrong.wordKey)}</strong>
              <span>${escapeHtml(card.meaning || '')}</span>
              <small>${escapeHtml(wrong.taskType)} · 你的答案：${escapeHtml(wrong.userAnswer || '未作答')} · 正确：${escapeHtml(wrong.correctAnswer)}</small></article>`;
          }).join('')}
        </div>` : '<p>全部答对，没有错题。</p>'}
        <div class="vocabulary-adventure-challenge-result-actions">
          <button type="button" onclick="closeVocabularyAdventureChallenge()">返回词汇首页</button>
          ${totalAttempts < DAILY_LIMIT
            ? '<button type="button" class="primary" onclick="startAnotherVocabularyAdventureChallenge()">再挑战一次</button>'
            : ''}
        </div>
      </div>`;
      const fill = element('vocabularyAdventureChallengeFill');
      if (fill) fill.style.width = '100%';
      setFeedback(`今日剩余 ${Math.max(0, DAILY_LIMIT - totalAttempts)} 次`, 'direct', '', '');
    }

    function renderCurrent() {
      const session = currentSession();
      if (!session) return;
      if (session.status === 'completed') renderResult();
      else if (session.status === 'active') renderQuestion();
      else renderUnavailable('这次挑战已退出，请返回首页重新开始。');
    }

    function renderUnavailable(message) {
      const body = element('vocabularyAdventureChallengeBody');
      if (body) {
        body.innerHTML = `<div class="vocabulary-adventure-terminal">
          <div class="vocabulary-adventure-terminal-icon">⚠️</div>
          <h2>暂时不能挑战</h2><p>${escapeHtml(message)}</p>
        </div>`;
      }
      setFeedback('', '', '返回首页', 'closeVocabularyAdventureChallenge');
    }

    async function openVocabularyAdventureChallenge(forceNew) {
      if (!studentUser()) return;
      resetRuntime();
      runtime.user = studentUser();
      showScreen('screenVocabularyAdventureChallenge');
      const today = core.localDateKey(new Date());

      try {
        const [loaded, legacy] = await Promise.all([
          loadVocabularyAdventureState(runtime.user),
          typeof getVocabularyAdventureLegacyChallengeUsage === 'function'
            ? getVocabularyAdventureLegacyChallengeUsage()
            : Promise.resolve({ attempts: 0, bestScore: 0 })
        ]);
        runtime.state = normalizeChallengeState(loaded, today);
        runtime.legacy = legacy;
        runtime.candidates = collectVisibleVocabularyAdventureCandidates();

        const status = challengeHomeStatus({
          state: runtime.state,
          candidates: runtime.candidates,
          today,
          legacyAttempts: legacy.attempts,
          legacyBestScore: legacy.bestScore
        });
        if (!forceNew && status.state === 'continue') return renderCurrent();
        if (status.attempts >= DAILY_LIMIT) {
          return renderUnavailable('今天的 2 次挑战已经完成，明天再来。');
        }
        if (status.available < CHALLENGE_LIMIT) {
          return renderUnavailable('可挑战词不足 10 个，请先完成探险待复查。');
        }

        const built = buildChallengeSession({
          candidates: runtime.candidates,
          state: runtime.state,
          today,
          userKey: runtime.user,
          attemptIndex: status.attempts + 1,
          startedAt: new Date().toISOString()
        });
        if (!built.ok) {
          return renderUnavailable('当前词卡暂时无法生成完整的 10 题挑战。');
        }

        runtime.prepared = normalizeChallengeState({
          ...runtime.state,
          challengeSession: built.session
        }, today);
        runtime.preparedMeta = { kind: 'initial' };
        if (!await saveCurrentVocabularyAdventureState(runtime.prepared)) {
          setFeedback(
            '挑战计划保存失败，尚未开始。',
            'failed',
            '重新保存',
            'retryVocabularyAdventureChallengeSave'
          );
          return;
        }
        runtime.state = runtime.prepared;
        runtime.prepared = null;
        runtime.preparedMeta = null;
        renderCurrent();
      } catch (error) {
        console.error('Unable to open vocabulary adventure challenge', error);
        renderUnavailable('读取挑战状态失败，请稍后重试。');
      }
    }

    async function submitAnswer(answer) {
      if (runtime.saving || runtime.prepared) return;
      const session = currentSession();
      const item = currentItem();
      if (!session || !item) return;

      element('vocabularyAdventureChallengeBody')
        ?.querySelectorAll('button,input')
        .forEach(control => {
          control.disabled = true;
        });

      try {
        const prepared = prepareChallengeAnswer(runtime.state, {
          today: session.date,
          expectedCursor: session.cursor,
          wordKey: item.wordKey,
          answer,
          answeredAt: new Date().toISOString()
        });
        runtime.prepared = prepared.state;
        runtime.preparedMeta = prepared;
        runtime.saving = true;
        const saved = await saveCurrentVocabularyAdventureState(runtime.prepared);
        runtime.saving = false;
        if (!saved) {
          setFeedback(
            '保存失败，本题没有计入成绩。',
            'failed',
            '重新保存',
            'retryVocabularyAdventureChallengeSave'
          );
          return;
        }

        runtime.state = runtime.prepared;
        runtime.prepared = null;
        runtime.preparedMeta = null;
        const card = targetCard(item.wordKey) || {};
        const detail = prepared.correct
          ? '回答正确'
          : `回答错误。${card.word || item.wordKey}：${card.meaning || ''}；正确答案：${prepared.correctAnswer}`;
        setFeedback(
          detail,
          prepared.correct ? 'direct' : 'failed',
          prepared.completed ? '查看结果' : '下一题',
          'nextVocabularyAdventureChallenge'
        );
      } catch (error) {
        runtime.saving = false;
        console.error('Unable to prepare vocabulary challenge answer', error);
        setFeedback('当前题无法提交，请返回后重试。', 'failed', '', '');
      }
    }

    async function retryVocabularyAdventureChallengeSave() {
      if (!runtime.prepared || runtime.saving) return;
      runtime.saving = true;
      const saved = await saveCurrentVocabularyAdventureState(runtime.prepared);
      runtime.saving = false;
      if (!saved) {
        setFeedback(
          '仍然保存失败，请检查网络后重试。',
          'failed',
          '重新保存',
          'retryVocabularyAdventureChallengeSave'
        );
        return;
      }

      const meta = runtime.preparedMeta;
      runtime.state = runtime.prepared;
      runtime.prepared = null;
      runtime.preparedMeta = null;
      if (meta && meta.kind === 'initial') {
        renderCurrent();
        return;
      }
      setFeedback(
        meta && meta.correct ? '回答正确' : `回答错误。正确答案：${meta && meta.correctAnswer || ''}`,
        meta && meta.correct ? 'direct' : 'failed',
        meta && meta.completed ? '查看结果' : '下一题',
        'nextVocabularyAdventureChallenge'
      );
    }

    function answerVocabularyAdventureChallengeChoice(index) {
      submitAnswer(Number(index));
    }

    function submitVocabularyAdventureChallengeInput() {
      const input = element('vocabularyAdventureChallengeInput');
      if (input) submitAnswer(input.value);
    }

    function renderOrder() {
      const item = currentItem();
      const answer = element('vocabularyAdventureChallengeOrderAnswer');
      if (!item || !answer) return;
      const byId = new Map(item.question.tokens.map(token => [token.id, token.label]));
      answer.textContent = runtime.order.length
        ? runtime.order.map(id => byId.get(id)).join(item.taskType === 'letterOrder' ? '' : ' ')
        : '点击下方卡片完成排列';
      document.querySelectorAll('#vocabularyAdventureChallengeBody [data-token]').forEach(button => {
        button.disabled = runtime.order.includes(button.dataset.token);
      });
    }

    function selectVocabularyAdventureChallengeToken(tokenId) {
      if (!runtime.order.includes(tokenId)) runtime.order.push(tokenId);
      renderOrder();
    }

    function clearVocabularyAdventureChallengeOrder() {
      runtime.order = [];
      renderOrder();
    }

    function submitVocabularyAdventureChallengeOrder() {
      const item = currentItem();
      if (item && runtime.order.length === item.question.answer.length) {
        submitAnswer([...runtime.order]);
      }
    }

    function nextVocabularyAdventureChallenge() {
      renderCurrent();
    }

    function speakVocabularyAdventureChallengeWord() {
      const item = currentItem();
      const card = item && targetCard(item.wordKey);
      if (card && typeof speakWord === 'function') speakWord(card.word || item.wordKey);
    }

    async function closeVocabularyAdventureChallenge() {
      const session = currentSession();
      if (session && session.status === 'active') {
        if (!window.confirm('确定要退出吗，退出默认此次挑战机会作废哦~')) return;
        try {
          const prepared = prepareChallengeExit(runtime.state, {
            today: session.date,
            exitedAt: new Date().toISOString()
          });
          if (!await saveCurrentVocabularyAdventureState(prepared)) {
            setFeedback('退出状态保存失败，请重试。', 'failed', '', '');
            return;
          }
          runtime.state = prepared;
        } catch (error) {
          console.error('Unable to exit vocabulary challenge', error);
          return;
        }
      }
      resetRuntime();
      showScreen('screenHome');
      await loadHome();
    }

    function startAnotherVocabularyAdventureChallenge() {
      openVocabularyAdventureChallenge(true);
    }

    return {
      updateVocabularyAdventurePreviewEntry,
      openVocabularyAdventureChallenge,
      closeVocabularyAdventureChallenge,
      startAnotherVocabularyAdventureChallenge,
      answerVocabularyAdventureChallengeChoice,
      submitVocabularyAdventureChallengeInput,
      selectVocabularyAdventureChallengeToken,
      clearVocabularyAdventureChallengeOrder,
      submitVocabularyAdventureChallengeOrder,
      nextVocabularyAdventureChallenge,
      retryVocabularyAdventureChallengeSave,
      speakVocabularyAdventureChallengeWord
    };
  }

  return Object.freeze({
    CHALLENGE_LIMIT,
    DAILY_LIMIT,
    CHALLENGE_TYPES,
    normalizeChallengeDaily,
    normalizeChallengeSession,
    normalizeChallengeState,
    collectChallengeCandidates,
    buildChallengeSession,
    prepareChallengeAnswer,
    prepareChallengeExit,
    challengeHomeStatus,
    correctAnswerText,
    userAnswerText,
    createVocabularyAdventureChallengeBrowserApi
  });
});
