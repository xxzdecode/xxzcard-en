(function vocabularyAdventureChallengeModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const review = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureReview.js')
    : root.VocabularyAdventureReview;
  const rewards = typeof module === 'object' && module.exports
    ? require('./studentRewards.js')
    : root.StudentRewards;
  const exported = factory(core, review, rewards);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && typeof module !== 'object') {
    root.VocabularyAdventureChallenge = exported;
    Object.assign(root, exported.createVocabularyAdventureChallengeBrowserApi());
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureChallengeModule(core, review, rewards) {
  'use strict';

  const CHALLENGE_LIMIT = 10;
  const RAPID_FLIP_LIMIT = 4;
  const STANDARD_CHALLENGE_LIMIT = CHALLENGE_LIMIT - RAPID_FLIP_LIMIT;
  const RAPID_FLIP_RECENCY_DAYS = 7;
  const DAILY_LIMIT = 2;
  const REWARD_SOURCE = 'vocabularyChallenge';
  const REWARD_MARKER_VERSION = 2;
  const REWARD_MARKER_STATUSES = new Set(['pending', 'settled', 'blocked']);
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

  function normalizeChallengeRewardSettlement(value, today) {
    if (!plainObject(value) || value.date !== today || !localDate(value.date)) return null;
    return {
      version: REWARD_MARKER_VERSION,
      source: REWARD_SOURCE,
      date: today,
      target: Math.min(CHALLENGE_LIMIT, count(value.target)),
      status: REWARD_MARKER_STATUSES.has(value.status) ? value.status : 'pending',
      awarded: Math.min(CHALLENGE_LIMIT, count(value.awarded)),
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
      settledAt: typeof value.settledAt === 'string' ? value.settledAt : '',
      blockedReason: typeof value.blockedReason === 'string' ? value.blockedReason : ''
    };
  }

  function normalizeChallengeDaily(value, today) {
    const source = plainObject(value) && value.date === today ? value : {};
    const normalized = {
      date: today,
      attempts: Math.min(DAILY_LIMIT, count(source.attempts)),
      bestScore: Math.max(0, Math.min(100, count(source.bestScore)))
    };
    const marker = normalizeChallengeRewardSettlement(source.rewardSettlement, today);
    if (marker) normalized.rewardSettlement = marker;
    const completions = (Array.isArray(source.completions) ? source.completions : [])
      .filter(item => plainObject(item) && item.date === today && item.transactionId)
      .map(item => ({
        version: 1,
        user: item.user === 'brother' ? 'brother' : item.user === 'sister' ? 'sister' : '',
        date: today,
        attemptIndex: Math.max(0, count(item.attemptIndex)),
        correctCount: Math.min(CHALLENGE_LIMIT, count(item.correctCount)),
        score: Math.max(0, Math.min(100, count(item.score))),
        completedAt: typeof item.completedAt === 'string' ? item.completedAt : '',
        transactionId: String(item.transactionId),
        legacy: item.legacy === true
      }));
    if (completions.length) normalized.completions = completions.slice(-4);
    return normalized;
  }

  function createChallengeCompletion(session, userKey) {
    const user = userKey === 'brother' ? 'brother' : userKey === 'sister' ? 'sister' : '';
    const attemptIndex = Math.max(0, count(session && session.attemptIndex));
    const correctCount = Math.min(CHALLENGE_LIMIT, count(session && session.correctCount));
    const date = String(session && session.date || '');
    return {
      version: 1,
      user,
      date,
      attemptIndex,
      correctCount,
      score: correctCount * 10,
      completedAt: String(session && (session.scoringCompletedAt || session.completedAt) || ''),
      transactionId: `vocabularyChallenge:${user || 'student'}:${date}:${attemptIndex ? `attempt-${attemptIndex}` : 'completion'}`,
      legacy: false
    };
  }

  function createCompletedChallengeRewardMarker(dailyValue, session, completedAt, userKey) {
    const daily = normalizeChallengeDaily(dailyValue, session.date);
    const previous = daily.rewardSettlement || null;
    const score = Math.min(100, count(session.correctCount) * 10);
    const calculatedTarget = typeof rewards?.challengeRewardAmount === 'function'
      ? rewards.challengeRewardAmount(userKey, score, CHALLENGE_LIMIT)
      : Math.min(CHALLENGE_LIMIT, count(session.correctCount));
    const target = Math.max(previous ? previous.target : 0, calculatedTarget);
    const keepSettled = previous && previous.status === 'settled' && previous.awarded >= target;
    const keepBlocked = previous && previous.status === 'blocked' && previous.target >= target;
    return {
      version: REWARD_MARKER_VERSION,
      source: REWARD_SOURCE,
      date: session.date,
      target,
      status: keepSettled ? 'settled' : keepBlocked ? 'blocked' : 'pending',
      awarded: previous ? previous.awarded : 0,
      updatedAt: String(completedAt || new Date().toISOString()),
      settledAt: keepSettled ? previous.settledAt : '',
      blockedReason: keepBlocked ? previous.blockedReason : ''
    };
  }

  function normalizeChallengeItem(value) {
    if (!plainObject(value)) return null;
    const wordKey = core.adventureWordKey(value.wordKey);
    const question = plainObject(value.question) ? clone(value.question) : null;
    if (!wordKey || !question || !question.ok) return null;
    const answered = value.status === 'answered';
    const correctionQuestion = plainObject(value.correctionQuestion) && value.correctionQuestion.ok
      ? clone(value.correctionQuestion)
      : clone(question);
    const correctionMode = value.correctionMode === 'variant' ? 'variant' : 'retry';
    return {
      wordKey,
      kind: value.kind === 'rapidFlip' ? 'rapidFlip' : 'standard',
      taskType: typeof value.taskType === 'string'
        ? value.taskType
        : String(question.questionType || question.taskType || ''),
      question,
      correctionQuestion,
      correctionMode,
      correctionExplanation: typeof value.correctionExplanation === 'string'
        ? value.correctionExplanation
        : correctionMode === 'variant'
          ? '换一种问法，再确认一次这个词。'
          : '当前没有安全的变式，先看清正确答案，再重做原题。',
      status: answered ? 'answered' : 'pending',
      userAnswer: answered ? clone(value.userAnswer) : null,
      correct: answered ? value.correct === true : null,
      answeredAt: answered && typeof value.answeredAt === 'string' ? value.answeredAt : ''
    };
  }

  function daysBetweenLocalDates(earlier, later) {
    if (!localDate(earlier) || !localDate(later)) return -1;
    const [earlierYear, earlierMonth, earlierDay] = earlier.split('-').map(Number);
    const [laterYear, laterMonth, laterDay] = later.split('-').map(Number);
    return Math.floor((
      Date.UTC(laterYear, laterMonth - 1, laterDay)
      - Date.UTC(earlierYear, earlierMonth - 1, earlierDay)
    ) / 86400000);
  }

  function normalizeImmediateCorrection(value, items) {
    if (!plainObject(value)) return null;
    const originalIndex = Number(value.originalIndex);
    const original = Number.isInteger(originalIndex) ? items[originalIndex] : null;
    const wordKey = core.adventureWordKey(value.wordKey);
    const question = plainObject(value.question) && value.question.ok ? clone(value.question) : null;
    if (!original || !wordKey || wordKey !== original.wordKey || !question) return null;
    const answered = value.status === 'answered';
    return {
      originalIndex,
      wordKey,
      originalTaskType: String(value.originalTaskType || original.taskType || ''),
      taskType: String(value.taskType || question.questionType || ''),
      mode: value.mode === 'variant' ? 'variant' : 'retry',
      explanation: String(value.explanation || ''),
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
        : value.status === 'correction'
          ? 'correction'
        : 'active';
    const correction = normalizeImmediateCorrection(value.correction, items);

    return {
      date: value.date,
      attemptIndex: Math.max(1, count(value.attemptIndex) || 1),
      seed: String(value.seed || ''),
      status,
      items,
      cursor: ['completed', 'correction'].includes(status) ? items.length : cursor,
      correctCount: items.filter(item => item.correct === true).length,
      wrongCount: items.filter(item => item.correct === false).length,
      wrongItems: items.filter(item => item.correct === false).map(item => ({
        wordKey: item.wordKey,
        taskType: item.taskType,
        userAnswer: userAnswerText(item.question, item.userAnswer),
        correctAnswer: correctAnswerText(item.question)
      })),
      correction,
      startedAt: typeof value.startedAt === 'string' ? value.startedAt : '',
      scoringCompletedAt: typeof value.scoringCompletedAt === 'string' ? value.scoringCompletedAt : '',
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

  function challengeCandidatePriority(candidate, wordState, today) {
    if (candidate && candidate.lessonQueuePriority === true) return 0;
    if (wordState.lastResult === 'F') return 1;
    if (wordState.lastResult === 'H') return 2;
    if (wordState.nextReviewAt && wordState.nextReviewAt <= today) return 3;
    if (wordState.intervalIndex >= 4) return 5;
    return 4;
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
        challengePriority: challengeCandidatePriority(
          candidate,
          state.words[core.adventureWordKey(candidate.key)],
          today
        )
      }));
  }

  function isRecentDirectAdventureResult(wordState, today) {
    if (!wordState || wordState.lastResult !== 'D' || !wordState.lastReviewedAt) return false;
    const reviewedDate = core.localDateKey(wordState.lastReviewedAt);
    const age = daysBetweenLocalDates(reviewedDate, today);
    return age >= 0 && age < RAPID_FLIP_RECENCY_DAYS;
  }

  function collectRapidFlipCandidates(candidates, stateValue, today) {
    const state = core.normalizeVocabularyAdventureState(stateValue);
    return (Array.isArray(candidates) ? candidates : [])
      .filter(candidate => {
        const key = core.adventureWordKey(candidate && candidate.key);
        const wordState = state.words[key];
        return candidate
          && candidate.card
          && wordState
          && !wordState.challengeFlagAt
          && !wordState.rapidConfirmAt
          && isRecentDirectAdventureResult(wordState, today);
      })
      .map(candidate => ({ ...candidate, rapidFlipPriority: challengeCandidatePriority(
        candidate,
        state.words[core.adventureWordKey(candidate.key)],
        today
      ) }));
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

  function buildRapidFlipQuestion(context) {
    const question = buildQuestionForCandidate(context, 'meaningToWord');
    if (!question) return null;
    const target = (Array.isArray(context.allCards) ? context.allCards : [])
      .find(candidate => candidate && candidate.key === context.planItem.wordKey);
    const meaning = String(target?.card?.meaning || question.prompt || '').trim();
    if (!meaning) return null;
    return {
      ...question,
      questionType: 'rapidFlip',
      taskType: 'rapidFlip',
      rapidFlip: true,
      flipFront: '点击翻开中文提示',
      flipBack: meaning,
      prompt: '翻开后，选出对应的英文单词'
    };
  }

  function buildCorrectionQuestion(context, originalQuestion) {
    const originalType = String(originalQuestion && originalQuestion.questionType || '');
    const ordered = CHALLENGE_TYPES.filter(type => type !== originalType);
    for (const taskType of ordered) {
      const question = buildQuestionForCandidate({
        ...context,
        planIndex: Number(context.planIndex || 0) + CHALLENGE_LIMIT,
        userKey: `${context.userKey || ''}|correction`
      }, taskType);
      if (question) return { question, mode: 'variant' };
    }
    return { question: serializeQuestion(originalQuestion), mode: 'retry' };
  }

  function buildChallengeSession(options) {
    const settings = plainObject(options) ? options : {};
    const today = String(settings.today || '');
    const userKey = String(settings.userKey || '');
    const attemptIndex = Math.max(1, count(settings.attemptIndex) || 1);
    const candidates = collectChallengeCandidates(settings.candidates, settings.state, today);
    const rapidCandidates = collectRapidFlipCandidates(settings.candidates, settings.state, today);
    if (rapidCandidates.length < RAPID_FLIP_LIMIT || candidates.length < CHALLENGE_LIMIT) {
      return {
        ok: false,
        code: rapidCandidates.length < RAPID_FLIP_LIMIT
          ? 'INSUFFICIENT_RAPID_FLIP_WORDS'
          : 'INSUFFICIENT_CHALLENGE_WORDS',
        available: candidates.length,
        rapidAvailable: rapidCandidates.length
      };
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

    const rapidTargets = core.deterministicAdventureShuffle(
      rapidCandidates,
      `${seed}|rapid-flip`,
      candidate => candidate.key
    ).slice(0, RAPID_FLIP_LIMIT);
    const rapidKeys = new Set(rapidTargets.map(candidate => candidate.key));
    const standardTargets = ordered
      .filter(candidate => !rapidKeys.has(candidate.key))
      .slice(0, STANDARD_CHALLENGE_LIMIT);
    if (standardTargets.length < STANDARD_CHALLENGE_LIMIT) {
      return {
        ok: false,
        code: 'INSUFFICIENT_STANDARD_CHALLENGE_WORDS',
        available: candidates.length,
        rapidAvailable: rapidCandidates.length
      };
    }
    const targets = [
      ...rapidTargets.map(candidate => ({ candidate, kind: 'rapidFlip' })),
      ...standardTargets.map(candidate => ({ candidate, kind: 'standard' }))
    ];
    const items = [];
    const normalizedState = core.normalizeVocabularyAdventureState(settings.state);
    for (let index = 0; index < targets.length; index += 1) {
      const { candidate, kind } = targets[index];
      const desiredOffset = (core.stableAdventureHash(`${seed}|types`) + index) % CHALLENGE_TYPES.length;
      const desiredType = CHALLENGE_TYPES[desiredOffset];
      const context = {
        session: { date: today },
        planItem: { wordKey: candidate.key, taskType: desiredType },
        planIndex: index,
        wordState: normalizedState.words[candidate.key],
        allCards: candidates,
        userKey: `${userKey}|attempt:${attemptIndex}`,
        reason: 'due'
      };
      const question = kind === 'rapidFlip'
        ? buildRapidFlipQuestion(context)
        : buildQuestionForCandidate(context, desiredType);
      if (!question) {
        return { ok: false, code: 'NO_SAFE_CHALLENGE_QUESTION', wordKey: candidate.key };
      }
      const correction = buildCorrectionQuestion(context, question);
      items.push({
        wordKey: candidate.key,
        kind,
        taskType: question.questionType,
        question,
        correctionQuestion: correction.question,
        correctionMode: correction.mode,
        correctionExplanation: correction.mode === 'variant'
          ? '换一种问法，再确认一次这个词。'
          : '当前没有安全的变式，先看清正确答案，再重做原题。',
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
        correction: null,
        startedAt,
        updatedAt: startedAt,
        completedAt: ''
      }
    };
  }

  function finalizeFormalChallenge(next, completedAt, userKey) {
    const nextSession = next.challengeSession;
    nextSession.scoringCompletedAt = completedAt;
    next.challengeDaily.attempts = Math.min(DAILY_LIMIT, next.challengeDaily.attempts + 1);
    const score = Math.round((nextSession.correctCount / CHALLENGE_LIMIT) * 100);
    next.challengeDaily.bestScore = Math.max(next.challengeDaily.bestScore, score);
    next.challengeDaily.rewardSettlement = createCompletedChallengeRewardMarker(
      next.challengeDaily,
      nextSession,
      completedAt,
      userKey
    );
    const completion = createChallengeCompletion(nextSession, userKey);
    const completions = new Map(
      (Array.isArray(next.challengeDaily.completions) ? next.challengeDaily.completions : [])
        .map(item => [item.transactionId, item])
    );
    completions.set(completion.transactionId, completion);
    next.challengeDaily.completions = [...completions.values()].slice(-4);
  }

  function prepareChallengeAnswer(stateValue, submission) {
    const input = plainObject(submission) ? submission : {};
    const today = String(input.today || '');
    const state = normalizeChallengeState(stateValue, today);
    const session = state.challengeSession;
    if (!session || session.status !== 'active' || session.correction) throw new Error('CHALLENGE_NOT_ACTIVE');
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
      nextSession.correction = {
        originalIndex: nextSession.cursor - 1,
        wordKey: nextItem.wordKey,
        originalTaskType: nextItem.taskType,
        taskType: nextItem.correctionQuestion.questionType,
        mode: nextItem.correctionMode,
        explanation: nextItem.correctionExplanation,
        question: clone(nextItem.correctionQuestion),
        status: 'pending',
        userAnswer: null,
        correct: null,
        answeredAt: ''
      };
    } else if (nextItem.kind === 'rapidFlip') {
      const previousWordState = next.words[nextItem.wordKey] || {};
      next.words[nextItem.wordKey] = {
        ...previousWordState,
        rapidConfirmAt: nextItem.answeredAt
      };
    }

    const formalCompleted = nextSession.cursor >= nextSession.items.length;
    if (formalCompleted) {
      finalizeFormalChallenge(next, nextItem.answeredAt, input.userKey);
      nextSession.status = nextSession.correction ? 'correction' : 'completed';
      nextSession.completedAt = nextSession.correction ? '' : nextItem.answeredAt;
    }

    return {
      state: normalizeChallengeState(next, today),
      correct,
      completed: formalCompleted && !nextSession.correction,
      formalCompleted,
      needsImmediateCorrection: !correct,
      correctAnswer: correctAnswerText(nextItem.question),
      userAnswer: userAnswerText(nextItem.question, input.answer)
    };
  }

  function prepareChallengeCorrectionAnswer(stateValue, submission) {
    const input = plainObject(submission) ? submission : {};
    const today = String(input.today || '');
    const state = normalizeChallengeState(stateValue, today);
    const session = state.challengeSession;
    const correction = session && session.correction;
    if (!session || !correction || !['active', 'correction'].includes(session.status)) {
      throw new Error('CHALLENGE_CORRECTION_NOT_ACTIVE');
    }
    if (session.cursor !== Number(input.expectedCursor)) {
      throw new Error('CHALLENGE_CORRECTION_CURSOR_MISMATCH');
    }
    if (correction.wordKey !== core.adventureWordKey(input.wordKey)) {
      throw new Error('CHALLENGE_CORRECTION_WORD_MISMATCH');
    }

    const correct = review.gradeVocabularyAdventureReviewQuestion(correction.question, input.answer);
    const next = clone(state);
    const nextSession = next.challengeSession;
    const nextCorrection = nextSession.correction;
    nextCorrection.status = 'answered';
    nextCorrection.userAnswer = clone(input.answer);
    nextCorrection.correct = correct;
    nextCorrection.answeredAt = String(input.answeredAt || new Date().toISOString());
    nextSession.updatedAt = nextCorrection.answeredAt;
    nextSession.correction = null;
    const completed = nextSession.cursor >= nextSession.items.length;
    if (completed) {
      nextSession.status = 'completed';
      nextSession.completedAt = nextCorrection.answeredAt;
    }
    return {
      state: normalizeChallengeState(next, today),
      kind: 'correction',
      correct,
      completed,
      correctionMode: nextCorrection.mode,
      explanation: nextCorrection.explanation,
      correctAnswer: correctAnswerText(nextCorrection.question),
      userAnswer: userAnswerText(nextCorrection.question, input.answer)
    };
  }

  function prepareChallengeExit(stateValue, options) {
    const input = plainObject(options) ? options : {};
    const today = String(input.today || '');
    const state = normalizeChallengeState(stateValue, today);
    if (!state.challengeSession || !['active', 'correction'].includes(state.challengeSession.status)) {
      throw new Error('CHALLENGE_NOT_ACTIVE');
    }

    const next = clone(state);
    const exitedAt = String(input.exitedAt || new Date().toISOString());
    const scoringFinished = next.challengeSession.status === 'correction';
    next.challengeSession.status = scoringFinished ? 'completed' : 'abandoned';
    next.challengeSession.updatedAt = exitedAt;
    next.challengeSession.completedAt = exitedAt;
    if (!scoringFinished) {
      next.challengeDaily.attempts = Math.min(DAILY_LIMIT, next.challengeDaily.attempts + 1);
    }

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
      && ['active', 'correction'].includes(state.challengeSession.status);

    if (active) {
      return {
        state: 'continue',
        attempts,
        bestScore,
        text: state.challengeSession.correction
          ? `继续重刷 · ${state.challengeSession.cursor}/${CHALLENGE_LIMIT}`
          : `继续挑战 · ${state.challengeSession.cursor}/${CHALLENGE_LIMIT}`
      };
    }
    if (attempts >= DAILY_LIMIT) {
      return { state: 'locked', attempts, bestScore, text: `今日最高 ${bestScore} 分` };
    }

    const available = collectChallengeCandidates(settings.candidates, state, today).length;
    const rapidAvailable = collectRapidFlipCandidates(settings.candidates, state, today).length;
    if (available < CHALLENGE_LIMIT || rapidAvailable < RAPID_FLIP_LIMIT) {
      return {
        state: 'insufficient',
        attempts,
        bestScore,
        available,
        rapidAvailable,
        text: rapidAvailable < RAPID_FLIP_LIMIT
          ? `近7天速刷词 ${rapidAvailable}/${RAPID_FLIP_LIMIT} 个`
          : `已摸底且无待复查 ${available}/10 个词`
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
    return { state: 'ready', attempts, bestScore, text: '4题翻翻乐＋6题综合挑战 · 今日可挑战' };
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
      saving: false,
      retryForceNew: false
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

    function knownCloudWriteUnavailable() {
      if (window.navigator && window.navigator.onLine === false) return true;
      if (window.__sbConnectionOnline === false) return true;
      const connectionState = window.__storageResilience?.getConnectionState?.();
      if (connectionState === 'unavailable') return true;
      try {
        return typeof sbOnline !== 'undefined' && sbOnline === false;
      } catch (_) {
        return false;
      }
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
        loadVocabularyAdventureState(user, { mode: 'challenge' }),
        typeof getVocabularyAdventureLegacyChallengeUsage === 'function'
          ? getVocabularyAdventureLegacyChallengeUsage()
          : Promise.resolve({ attempts: 0, bestScore: 0 })
      ]);
      if (user !== studentUser()) return;

      const candidates = collectVisibleVocabularyAdventureCandidates({ mode: 'challenge', today: core.localDateKey(new Date()) });
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
        const storageUnavailable = !challengeButton.disabled && knownCloudWriteUnavailable();
        challengeButton.dataset.state = storageUnavailable ? 'storage-unavailable' : status.state;
        challengeButton.setAttribute(
          'aria-label',
          storageUnavailable
            ? '单词挑战，云端连接异常，点击重试连接后开始'
            : `单词挑战，${status.text}，最高10金币`
        );
      }
      if (challengeTitle) challengeTitle.textContent = '单词挑战';
      if (challengeSub) {
        challengeSub.textContent = !challengeButton?.disabled && knownCloudWriteUnavailable()
          ? '云端连接异常 · 点击重试'
          : status.text;
      }
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
      runtime.retryForceNew = false;
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
      if (!session || !['active', 'correction'].includes(session.status)) return null;
      if (session.correction) return session.correction;
      return session.status === 'active' ? session.items[session.cursor] || null : null;
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
      if (session.correction) {
        if (countNode) countNode.textContent = `重刷 ${Math.min(session.cursor, CHALLENGE_LIMIT)}/${CHALLENGE_LIMIT}`;
        if (fill) fill.style.width = `${(session.cursor / CHALLENGE_LIMIT) * 100}%`;
        return;
      }
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
        sentenceOrder: '排列句子',
        rapidFlip: '翻翻乐速刷'
      };
      return labels[question.questionType] || '完成这道题';
    }

    function renderQuestion() {
      const item = currentItem();
      const body = element('vocabularyAdventureChallengeBody');
      if (!item || !body) return;

      const question = item.question;
      const session = currentSession();
      const correction = !!session?.correction;
      runtime.order = [];
      const audio = ['audioToWord', 'audioSpelling'].includes(question.questionType)
        ? '<button type="button" class="vocabulary-adventure-audio-prompt" onclick="speakVocabularyAdventureChallengeWord()">🔊 再听一次</button>'
        : '';
      let interaction = '';

      if (question.interaction === 'choice') {
        const options = `<div class="vocabulary-adventure-options">${question.options.map((option, index) => `
          <button type="button" onclick="answerVocabularyAdventureChallengeChoice(${index})">${escapeHtml(option.label)}</button>
        `).join('')}</div>`;
        interaction = question.rapidFlip
          ? `<button type="button" class="vocabulary-adventure-rapid-flip" aria-expanded="false" onclick="toggleVocabularyAdventureChallengeFlip(this)">
              <span class="vocabulary-adventure-rapid-flip__front">${escapeHtml(question.flipFront || '点击翻开提示')}</span>
              <span class="vocabulary-adventure-rapid-flip__back" hidden>${escapeHtml(question.flipBack || '')}</span>
            </button><div class="vocabulary-adventure-rapid-flip__options" hidden>${options}</div>`
          : options;
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

      body.innerHTML = `<div class="vocabulary-adventure-question${correction ? ' is-correction' : ''}">
        <div class="vocabulary-adventure-instruction">${correction ? '错题即时重刷 · 不计分' : question.rapidFlip ? '翻翻乐速刷 · 正式计分' : '挑战 · 无提示'}</div>
        ${correction ? `<p class="vocabulary-adventure-confirmation-note">${escapeHtml(item.explanation || '换一种问法，再确认一次这个词。')}</p>` : ''}
        <h2>${escapeHtml(questionPrompt(question))}</h2>
        ${audio}
        ${question.prompt ? `<div class="vocabulary-adventure-prompt-text">${escapeHtml(question.prompt)}</div>` : ''}
        ${interaction}
      </div>`;
      setFeedback(
        correction
          ? '本次重刷只帮助巩固，不改变原始分数、金币或首次错题记录。'
          : question.rapidFlip
            ? '翻开提示后完成一次快速确认。'
            : '确认后会立即保存本题结果。',
        '', '', ''
      );
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
      const rewardMarker = daily.rewardSettlement;
      const rewardCopy = rewardMarker && rewardMarker.status === 'pending'
        ? `奖励资格已保存，正在同步 ${rewardMarker.target} 金币…`
        : rewardMarker && rewardMarker.status === 'settled'
          ? `预计可获得 ${rewardMarker.target} 金币，返回首页点击宝箱领取`
          : '挑战成绩已保存';
      body.innerHTML = `<div class="vocabulary-adventure-challenge-result">
        <div class="vocabulary-adventure-terminal-icon">🏁</div>
        <h2>挑战完成</h2>
        <p class="vocabulary-adventure-earned-coins">${escapeHtml(rewardCopy)}</p>
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
      else if (['active', 'correction'].includes(session.status)) renderQuestion();
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

    function renderStorageRetry(message, handler) {
      const body = element('vocabularyAdventureChallengeBody');
      if (body) {
        body.innerHTML = `<div class="vocabulary-adventure-terminal">
          <div class="vocabulary-adventure-terminal-icon">☁️</div>
          <h2>挑战尚未开始</h2><p>${escapeHtml(message)}</p>
        </div>`;
      }
      setFeedback(
        '挑战计划必须先可靠保存到云端，恢复连接后可直接重试。',
        'failed',
        handler === 'retryOpenVocabularyAdventureChallenge' ? '重试连接' : '重新保存',
        handler
      );
    }

    function retryOpenVocabularyAdventureChallenge() {
      return openVocabularyAdventureChallenge(runtime.retryForceNew);
    }

    async function openVocabularyAdventureChallenge(forceNew) {
      if (!studentUser()) return;
      const shouldForceNew = forceNew === true;
      resetRuntime();
      runtime.retryForceNew = shouldForceNew;
      runtime.user = studentUser();
      showScreen('screenVocabularyAdventureChallenge');
      const today = core.localDateKey(new Date());

      try {
        const [loaded, legacy] = await Promise.all([
          loadVocabularyAdventureState(runtime.user, { requireRemote: true, mode: 'challenge' }),
          typeof getVocabularyAdventureLegacyChallengeUsage === 'function'
            ? getVocabularyAdventureLegacyChallengeUsage()
            : Promise.resolve({ attempts: 0, bestScore: 0 })
        ]);
        runtime.state = normalizeChallengeState(loaded, today);
        runtime.legacy = legacy;
        runtime.candidates = collectVisibleVocabularyAdventureCandidates({ mode: 'challenge', today });

        const status = challengeHomeStatus({
          state: runtime.state,
          candidates: runtime.candidates,
          today,
          legacyAttempts: legacy.attempts,
          legacyBestScore: legacy.bestScore
        });
        if (!shouldForceNew && status.state === 'continue') return renderCurrent();
        if (status.attempts >= DAILY_LIMIT) {
          return renderUnavailable('今天的 2 次挑战已经完成，明天再来。');
        }
        if (status.available < CHALLENGE_LIMIT || status.rapidAvailable < RAPID_FLIP_LIMIT) {
          return renderUnavailable(status.rapidAvailable < RAPID_FLIP_LIMIT
            ? `近7天内可速刷的直接答对词不足 ${RAPID_FLIP_LIMIT} 个，请先完成探险。`
            : '可挑战词不足 10 个，请先完成探险待复查。');
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
        if (!await saveCurrentVocabularyAdventureState(runtime.prepared, { mode: 'challenge', queue: true })) {
          renderStorageRetry('挑战计划保存失败，尚未进入答题。', 'retryVocabularyAdventureChallengeSave');
          return;
        }
        runtime.state = runtime.prepared;
        runtime.prepared = null;
        runtime.preparedMeta = null;
        renderCurrent();
      } catch (error) {
        console.error('Unable to open vocabulary adventure challenge', error);
        renderStorageRetry('无法读取最新云端挑战状态，请检查网络后重试。', 'retryOpenVocabularyAdventureChallenge');
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
        const correction = !!session.correction;
        const prepared = correction
          ? prepareChallengeCorrectionAnswer(runtime.state, {
              today: session.date,
              expectedCursor: session.cursor,
              wordKey: item.wordKey,
              answer,
              answeredAt: new Date().toISOString()
            })
          : prepareChallengeAnswer(runtime.state, {
              today: session.date,
              userKey: runtime.user,
              expectedCursor: session.cursor,
              wordKey: item.wordKey,
              answer,
              answeredAt: new Date().toISOString()
            });
        runtime.prepared = prepared.state;
        runtime.preparedMeta = prepared;
        runtime.saving = true;
        const saved = await saveCurrentVocabularyAdventureState(runtime.prepared, { mode: 'challenge', queue: true });
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
        if (!correction && window.VocabularyFeedbackSaveCoordinator?.ownsFeedback?.()) return;
        const card = targetCard(item.wordKey) || {};
        const detail = prepared.correct
          ? correction ? '重刷完成，本题不计分。' : '回答正确'
          : `${correction ? '这次重刷仍需加强。' : '回答错误。'}${card.word || item.wordKey}：${card.meaning || ''}；正确答案：${prepared.correctAnswer}`;
        setFeedback(
          detail,
          prepared.correct ? 'direct' : 'failed',
          prepared.needsImmediateCorrection ? '马上重刷'
            : prepared.completed ? '查看结果'
              : correction ? '下一题' : '下一题',
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
      const saved = await saveCurrentVocabularyAdventureState(runtime.prepared, { mode: 'challenge', queue: true });
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
      const correction = meta && meta.kind === 'correction';
      setFeedback(
        meta && meta.correct
          ? correction ? '重刷完成，本题不计分。' : '回答正确'
          : `${correction ? '这次重刷仍需加强。' : '回答错误。'}正确答案：${meta && meta.correctAnswer || ''}`,
        meta && meta.correct ? 'direct' : 'failed',
        meta && meta.needsImmediateCorrection ? '马上重刷'
          : meta && meta.completed ? '查看结果' : '下一题',
        'nextVocabularyAdventureChallenge'
      );
    }

    function answerVocabularyAdventureChallengeChoice(index) {
      return submitAnswer(Number(index));
    }

    function submitVocabularyAdventureChallengeInput() {
      const input = element('vocabularyAdventureChallengeInput');
      if (input) return submitAnswer(input.value);
      return undefined;
    }

    function toggleVocabularyAdventureChallengeFlip(button) {
      if (!button || button.getAttribute('aria-expanded') === 'true') return;
      button.setAttribute('aria-expanded', 'true');
      button.classList.add('is-flipped');
      const front = button.querySelector('.vocabulary-adventure-rapid-flip__front');
      const back = button.querySelector('.vocabulary-adventure-rapid-flip__back');
      if (front) front.hidden = true;
      if (back) back.hidden = false;
      const options = button.parentElement?.querySelector('.vocabulary-adventure-rapid-flip__options');
      if (options) options.hidden = false;
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
        return submitAnswer([...runtime.order]);
      }
      return undefined;
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
      if (session && ['active', 'correction'].includes(session.status)) {
        const correction = !!session.correction;
        if (!window.confirm(correction
          ? '当前错题还没有重刷完，确定返回吗？原始作答记录会保留。'
          : '确定要退出吗，退出默认此次挑战机会作废哦~')) return;
        try {
          const prepared = prepareChallengeExit(runtime.state, {
            today: session.date,
            exitedAt: new Date().toISOString()
          });
          if (!await saveCurrentVocabularyAdventureState(prepared, { mode: 'challenge', queue: true })) {
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
      retryOpenVocabularyAdventureChallenge,
      answerVocabularyAdventureChallengeChoice,
      submitVocabularyAdventureChallengeInput,
      toggleVocabularyAdventureChallengeFlip,
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
    RAPID_FLIP_LIMIT,
    STANDARD_CHALLENGE_LIMIT,
    RAPID_FLIP_RECENCY_DAYS,
    DAILY_LIMIT,
    CHALLENGE_TYPES,
    normalizeChallengeDaily,
    createChallengeCompletion,
    normalizeChallengeRewardSettlement,
    createCompletedChallengeRewardMarker,
    normalizeChallengeSession,
    normalizeChallengeState,
    collectChallengeCandidates,
    collectRapidFlipCandidates,
    buildChallengeSession,
    prepareChallengeAnswer,
    prepareChallengeCorrectionAnswer,
    prepareChallengeExit,
    challengeHomeStatus,
    correctAnswerText,
    userAnswerText,
    createVocabularyAdventureChallengeBrowserApi
  });
});
