(function vocabularyAdventureCoreModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VocabularyAdventureCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureCore() {
  'use strict';

  const VERSION = 1;
  const INTERVAL_DAYS = Object.freeze([1, 3, 7, 14, 30, 60]);
  const RESULTS = new Set(['D', 'H', 'F']);
  const REVIEW_PRIORITY = Object.freeze({
    challenge: 1,
    failed: 2,
    hinted: 3,
    severeOverdue: 4,
    due: 5,
    stable: 6
  });
  const SCREENING_TASK_TYPES = Object.freeze([
    'wordToMeaning',
    'audioToWord',
    'meaningToWord'
  ]);

  function normalizeAdventureWord(value) {
    return String(value == null ? '' : value).trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  function adventureWordKey(value) {
    return normalizeAdventureWord(value);
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function isLocalDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1])
      && date.getMonth() === Number(match[2]) - 1
      && date.getDate() === Number(match[3]);
  }

  function isDateTime(value) {
    return typeof value === 'string' && value.trim() !== '' && Number.isFinite(new Date(value).getTime());
  }

  function localDateKey(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addLocalDays(localDate, days) {
    if (!isLocalDate(localDate)) return '';
    const [year, month, day] = localDate.split('-').map(Number);
    return localDateKey(new Date(year, month - 1, day + Number(days || 0)));
  }

  function daysBetweenLocalDates(earlier, later) {
    if (!isLocalDate(earlier) || !isLocalDate(later)) return 0;
    const [ey, em, ed] = earlier.split('-').map(Number);
    const [ly, lm, ld] = later.split('-').map(Number);
    return Math.floor((Date.UTC(ly, lm - 1, ld) - Date.UTC(ey, em - 1, ed)) / 86400000);
  }

  function safeIntervalIndex(value) {
    const index = Number.isInteger(value) ? value : Number.parseInt(value, 10);
    if (!Number.isFinite(index) || index < 0 || index >= INTERVAL_DAYS.length) return 0;
    return index;
  }

  function safeCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }

  function normalizeWordState(value) {
    const source = isPlainObject(value) ? value : {};
    return {
      lastResult: RESULTS.has(source.lastResult) ? source.lastResult : '',
      intervalIndex: safeIntervalIndex(source.intervalIndex),
      lastReviewedAt: isDateTime(source.lastReviewedAt) ? source.lastReviewedAt : '',
      nextReviewAt: isLocalDate(source.nextReviewAt) ? source.nextReviewAt : '',
      reviewCount: safeCount(source.reviewCount),
      lastTaskType: typeof source.lastTaskType === 'string' ? source.lastTaskType : '',
      challengeFlagAt: isDateTime(source.challengeFlagAt) ? source.challengeFlagAt : ''
    };
  }

  function normalizePlanItem(value) {
    if (!isPlainObject(value)) return null;
    const wordKey = adventureWordKey(value.wordKey || value.word);
    if (!wordKey) return null;
    const phase = value.phase === 'review' ? 'review' : 'screening';
    return {
      wordKey,
      word: String(value.word || wordKey).trim(),
      batchId: value.batchId == null ? '' : String(value.batchId),
      batchName: typeof value.batchName === 'string' ? value.batchName : '',
      cardIndex: Number.isInteger(value.cardIndex) && value.cardIndex >= 0 ? value.cardIndex : 0,
      phase,
      reviewReason: typeof value.reviewReason === 'string' ? value.reviewReason : '',
      taskType: typeof value.taskType === 'string' ? value.taskType : '',
      confirmationTaskType: typeof value.confirmationTaskType === 'string' ? value.confirmationTaskType : '',
      outcomeDetail: typeof value.outcomeDetail === 'string' ? value.outcomeDetail : '',
      status: value.status === 'completed' ? 'completed' : 'pending',
      result: RESULTS.has(value.result) ? value.result : ''
    };
  }

  function normalizeSession(value) {
    if (!isPlainObject(value) || !isLocalDate(value.date)) return null;
    const plan = Array.isArray(value.plan) ? value.plan.map(normalizePlanItem).filter(Boolean) : [];
    let cursor = Number.isFinite(Number(value.cursor)) ? Math.floor(Number(value.cursor)) : 0;
    cursor = Math.max(0, Math.min(plan.length, cursor));
    const completed = value.completed === true || cursor >= plan.length;
    if (completed) cursor = plan.length;
    return {
      date: value.date,
      plan,
      cursor,
      phase: completed ? 'completed' : (plan[cursor] && plan[cursor].phase) || 'screening',
      completed,
      rewardGranted: value.rewardGranted === true
    };
  }

  function defaultVocabularyAdventureState() {
    return { version: VERSION, words: {}, session: null };
  }

  function normalizeVocabularyAdventureState(value) {
    const source = isPlainObject(value) ? value : {};
    const words = {};
    if (isPlainObject(source.words)) {
      Object.entries(source.words).forEach(([rawKey, rawState]) => {
        const key = adventureWordKey(rawKey);
        if (key && !Object.prototype.hasOwnProperty.call(words, key)) words[key] = normalizeWordState(rawState);
      });
    }
    const normalized = { version: VERSION, words, session: normalizeSession(source.session) };
    ['challengeSession', 'challengeDaily'].forEach(field => {
      if (!isPlainObject(source[field])) return;
      try {
        normalized[field] = JSON.parse(JSON.stringify(source[field]));
      } catch (_) {}
    });
    return normalized;
  }

  function collectVocabularyAdventureCandidates(batches) {
    const result = [];
    const seen = new Set();
    (Array.isArray(batches) ? batches : []).forEach((batch, batchIndex) => {
      const cards = Array.isArray(batch && batch.cards) ? batch.cards : [];
      cards.forEach((card, cardIndex) => {
        const key = adventureWordKey(card && card.word);
        const meaning = String(card && card.meaning || '').trim();
        if (!key || !meaning || seen.has(key)) return;
        seen.add(key);
        result.push({
          key,
          word: String(card.word).trim(),
          batchId: batch && batch.id != null ? String(batch.id) : '',
          batchName: String(batch && batch.name || ''),
          batchIndex,
          cardIndex,
          sourceIndex: result.length,
          card
        });
      });
    });
    return result;
  }

  function reviewClassification(wordState, today) {
    if (wordState.challengeFlagAt) return { reason: 'challenge', priority: REVIEW_PRIORITY.challenge };
    if (wordState.lastResult === 'F') return { reason: 'failed', priority: REVIEW_PRIORITY.failed };
    if (wordState.lastResult === 'H') return { reason: 'hinted', priority: REVIEW_PRIORITY.hinted };
    const overdueDays = wordState.nextReviewAt ? daysBetweenLocalDates(wordState.nextReviewAt, today) : 0;
    if (wordState.nextReviewAt && overdueDays >= 2) {
      return { reason: 'severeOverdue', priority: REVIEW_PRIORITY.severeOverdue };
    }
    if (wordState.nextReviewAt && wordState.nextReviewAt <= today) {
      return { reason: 'due', priority: REVIEW_PRIORITY.due };
    }
    const intervalDays = INTERVAL_DAYS[safeIntervalIndex(wordState.intervalIndex)];
    if (wordState.lastResult === 'D' && intervalDays >= 30 && wordState.nextReviewAt > today) {
      return { reason: 'stable', priority: REVIEW_PRIORITY.stable };
    }
    return null;
  }

  function compareReviewEntries(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const nextA = a.wordState.nextReviewAt || '9999-12-31';
    const nextB = b.wordState.nextReviewAt || '9999-12-31';
    if (nextA !== nextB) return nextA.localeCompare(nextB);
    const lastA = a.wordState.lastReviewedAt ? new Date(a.wordState.lastReviewedAt).getTime() : Number.NEGATIVE_INFINITY;
    const lastB = b.wordState.lastReviewedAt ? new Date(b.wordState.lastReviewedAt).getTime() : Number.NEGATIVE_INFINITY;
    if (lastA !== lastB) return lastA - lastB;
    return a.candidate.sourceIndex - b.candidate.sourceIndex;
  }

  function classifyVocabularyAdventureCandidates(candidates, state, today) {
    const normalizedState = normalizeVocabularyAdventureState(state);
    const date = isLocalDate(today) ? today : localDateKey(new Date());
    const screening = [];
    const review = [];
    const seen = new Set();
    (Array.isArray(candidates) ? candidates : []).forEach((candidate, sourceIndex) => {
      const key = adventureWordKey(candidate && (candidate.key || candidate.word));
      if (!key || seen.has(key)) return;
      seen.add(key);
      const normalizedCandidate = {
        ...candidate,
        key,
        sourceIndex: Number.isInteger(candidate.sourceIndex) ? candidate.sourceIndex : sourceIndex
      };
      const wordState = normalizedState.words[key];
      if (!wordState || wordState.reviewCount === 0) {
        screening.push(normalizedCandidate);
        return;
      }
      const classification = reviewClassification(wordState, date);
      if (classification) review.push({ candidate: normalizedCandidate, wordState, ...classification });
    });
    review.sort(compareReviewEntries);
    const urgentReview = review.filter(entry => entry.reason !== 'stable');
    const stableReview = review.filter(entry => entry.reason === 'stable');
    return { screening, urgentReview, stableReview, review };
  }

  function planItem(candidate, phase, reviewReason) {
    return {
      wordKey: candidate.key,
      word: candidate.word,
      batchId: candidate.batchId,
      batchName: candidate.batchName || '',
      cardIndex: candidate.cardIndex,
      phase,
      reviewReason: phase === 'review' ? String(reviewReason || '') : '',
      taskType: '',
      confirmationTaskType: '',
      outcomeDetail: '',
      status: 'pending',
      result: ''
    };
  }

  function positiveTarget(value, fallback) {
    const target = Number(value);
    return Number.isFinite(target) && target >= 0 ? Math.floor(target) : fallback;
  }

  function rotateAdventurePlan(values, offset) {
    const list = Array.isArray(values) ? values.slice() : [];
    if (list.length < 2) return list;
    const distance = Math.max(0, Number(offset) || 0) % list.length;
    return distance ? [...list.slice(distance), ...list.slice(0, distance)] : list;
  }

  function orderVocabularyAdventurePlanForUser(planValue, today, userKey) {
    const plan = Array.isArray(planValue) ? planValue.slice() : [];
    const user = userKey === 'brother' ? 'brother' : userKey === 'sister' ? 'sister' : '';
    if (!user) return plan;

    const orderPhase = phase => {
      const phaseItems = plan.filter(item => item.phase === phase);
      const dailyOrder = deterministicAdventureShuffle(
        phaseItems,
        `${today}|adventure-plan|${phase}`,
        item => item.wordKey
      );
      if (user !== 'brother' || dailyOrder.length < 2) return dailyOrder;
      const offset = 1 + (stableAdventureHash(`${today}|brother|${phase}`) % (dailyOrder.length - 1));
      return rotateAdventurePlan(dailyOrder, offset);
    };

    const screening = orderPhase('screening');
    const review = orderPhase('review');
    const known = new Set([...screening, ...review]);
    return [...screening, ...review, ...plan.filter(item => !known.has(item))];
  }

  function buildVocabularyAdventurePlan(options) {
    const settings = isPlainObject(options) ? options : {};
    const candidates = Array.isArray(settings.candidates) ? settings.candidates : [];
    const state = normalizeVocabularyAdventureState(settings.state);
    const today = isLocalDate(settings.today) ? settings.today : localDateKey(new Date());
    const screeningTarget = positiveTarget(settings.screeningTarget, 20);
    const reviewTarget = positiveTarget(settings.reviewTarget, 10);
    const firstSessionTarget = positiveTarget(settings.firstSessionTarget, 30);
    const pools = classifyVocabularyAdventureCandidates(candidates, state, today);
    const firstSession = !Object.values(state.words).some(wordState => wordState.reviewCount > 0);

    if (firstSession) {
      const selected = pools.screening.slice(0, firstSessionTarget).map(candidate => planItem(candidate, 'screening'));
      return orderVocabularyAdventurePlanForUser(selected, today, settings.userKey);
    }

    const totalTarget = screeningTarget + reviewTarget;
    let screeningCount = Math.min(screeningTarget, pools.screening.length);
    let urgentReviewCount = Math.min(reviewTarget, pools.urgentReview.length);
    let remaining = Math.max(0, totalTarget - screeningCount - urgentReviewCount);
    const extraScreening = Math.min(remaining, pools.screening.length - screeningCount);
    screeningCount += extraScreening;
    remaining -= extraScreening;
    const extraUrgentReview = Math.min(remaining, pools.urgentReview.length - urgentReviewCount);
    urgentReviewCount += extraUrgentReview;
    remaining -= extraUrgentReview;
    const stableReviewCount = Math.min(remaining, pools.stableReview.length);

    const selected = [
      ...pools.screening.slice(0, screeningCount).map(candidate => planItem(candidate, 'screening')),
      ...pools.urgentReview.slice(0, urgentReviewCount).map(entry => planItem(entry.candidate, 'review', entry.reason)),
      ...pools.stableReview.slice(0, stableReviewCount).map(entry => planItem(entry.candidate, 'review', entry.reason))
    ];
    return orderVocabularyAdventurePlanForUser(selected, today, settings.userKey);
  }

  function stableAdventureHash(value) {
    const text = String(value == null ? '' : value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicAdventureShuffle(values, seed, identity) {
    const getIdentity = typeof identity === 'function' ? identity : value => String(value);
    return (Array.isArray(values) ? values : [])
      .map((value, index) => ({
        value,
        index,
        rank: stableAdventureHash(`${seed}|${getIdentity(value)}|${index}`)
      }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(entry => entry.value);
  }

  function assignVocabularyAdventureTaskType(options) {
    const settings = isPlainObject(options) ? options : {};
    const seed = `${settings.sessionDate || ''}|${adventureWordKey(settings.wordKey)}|${Number(settings.planIndex) || 0}`;
    let index = (stableAdventureHash(seed) + Math.max(0, Number(settings.planIndex) || 0)) % SCREENING_TASK_TYPES.length;
    if (SCREENING_TASK_TYPES[index] === settings.lastTaskType) {
      index = (index + 1) % SCREENING_TASK_TYPES.length;
    }
    return SCREENING_TASK_TYPES[index];
  }

  function uniqueQuestionCandidates(candidates) {
    const result = [];
    const seen = new Set();
    (Array.isArray(candidates) ? candidates : []).forEach(candidate => {
      const key = adventureWordKey(candidate && (candidate.key || candidate.word));
      const meaning = String(candidate && candidate.card && candidate.card.meaning || '').trim();
      if (!key || !meaning || seen.has(key)) return;
      seen.add(key);
      result.push({ ...candidate, key });
    });
    return result;
  }

  function buildVocabularyAdventureQuestion(options) {
    const settings = isPlainObject(options) ? options : {};
    const candidates = uniqueQuestionCandidates(settings.candidates);
    const wordKey = adventureWordKey(settings.wordKey);
    const target = candidates.find(candidate => candidate.key === wordKey);
    const taskType = SCREENING_TASK_TYPES.includes(settings.taskType)
      ? settings.taskType
      : assignVocabularyAdventureTaskType(settings);
    if (!target) return { ok: false, code: 'WORD_NOT_VISIBLE', wordKey };

    const seed = `${settings.sessionDate || ''}|${wordKey}|${Number(settings.planIndex) || 0}|${taskType}`;
    const correctMeaning = String(target.card.meaning || '').trim();
    const answer = taskType === 'wordToMeaning'
      ? { key: correctMeaning, label: correctMeaning, correct: true }
      : { key: wordKey, label: String(target.word || target.card.word || '').trim(), correct: true };
    const distractors = [];
    const seenAnswers = new Set([taskType === 'wordToMeaning' ? correctMeaning : wordKey]);

    deterministicAdventureShuffle(candidates, `${seed}|distractors`, candidate => candidate.key)
      .forEach(candidate => {
        if (candidate.key === wordKey || distractors.length >= 3) return;
        const meaning = String(candidate.card.meaning || '').trim();
        const optionKey = taskType === 'wordToMeaning' ? meaning : candidate.key;
        const label = taskType === 'wordToMeaning'
          ? meaning
          : String(candidate.word || candidate.card.word || '').trim();
        if (!optionKey || !label || seenAnswers.has(optionKey)) return;
        seenAnswers.add(optionKey);
        distractors.push({ key: optionKey, label, correct: false });
      });

    const optionsList = deterministicAdventureShuffle(
      [answer, ...distractors],
      `${seed}|options`,
      option => `${option.key}|${option.correct ? 'answer' : 'distractor'}`
    );
    if (optionsList.length < 2) {
      return { ok: false, code: 'INSUFFICIENT_OPTIONS', wordKey, taskType };
    }
    const correctIndex = optionsList.findIndex(option => option.correct);
    return {
      ok: true,
      taskType,
      wordKey,
      seed,
      correctIndex,
      options: optionsList,
      prompt: taskType === 'wordToMeaning'
        ? String(target.word || target.card.word || '').trim()
        : taskType === 'meaningToWord'
          ? correctMeaning
          : '',
      card: target.card
    };
  }

  function updateVocabularyAdventureSessionCursor(sessionValue, requestedCursor, forceCompleted) {
    const session = normalizeSession(sessionValue);
    if (!session) return null;
    let cursor = Number.isFinite(Number(requestedCursor)) ? Math.floor(Number(requestedCursor)) : session.cursor;
    cursor = Math.max(0, Math.min(session.plan.length, cursor));
    const completed = session.completed || forceCompleted === true || cursor >= session.plan.length;
    if (completed) cursor = session.plan.length;
    return {
      ...session,
      cursor,
      completed,
      phase: completed ? 'completed' : session.plan[cursor].phase
    };
  }

  function resolveVocabularyAdventureSession(options) {
    const settings = isPlainObject(options) ? options : {};
    const today = isLocalDate(settings.today) ? settings.today : localDateKey(new Date());
    const state = normalizeVocabularyAdventureState(settings.state);
    if (state.session) {
      if (state.session.date === today) {
        return {
          action: state.session.completed ? 'completed' : 'resume_today',
          state,
          session: state.session
        };
      }
      if (!state.session.completed) return { action: 'resume_previous', state, session: state.session };
    }

    const plan = buildVocabularyAdventurePlan({ ...settings, state, today });
    const session = normalizeSession({
      date: today,
      plan,
      cursor: 0,
      completed: plan.length === 0,
      rewardGranted: false
    });
    const nextState = { ...state, session };
    return { action: 'created', state: nextState, session };
  }

  function applyAdventureResult(previousWordState, result, reviewedAt) {
    if (!RESULTS.has(result)) throw new Error('Adventure result must be D, H, or F');
    const previous = normalizeWordState(previousWordState);
    const firstReview = previous.reviewCount === 0;
    let intervalIndex = safeIntervalIndex(previous.intervalIndex);
    if (result === 'D') intervalIndex = firstReview ? 1 : Math.min(INTERVAL_DAYS.length - 1, intervalIndex + 1);
    if (result === 'F' || (result === 'H' && firstReview)) intervalIndex = 0;

    const date = reviewedAt instanceof Date ? new Date(reviewedAt.getTime()) : new Date(reviewedAt);
    if (!Number.isFinite(date.getTime())) throw new Error('reviewedAt must be a valid date');
    return {
      lastResult: result,
      intervalIndex,
      lastReviewedAt: date.toISOString(),
      nextReviewAt: addLocalDays(localDateKey(date), INTERVAL_DAYS[intervalIndex]),
      reviewCount: previous.reviewCount + 1,
      lastTaskType: previous.lastTaskType,
      challengeFlagAt: ''
    };
  }

  function adventureResultError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function prepareVocabularyAdventureResult(stateValue, submission) {
    const state = normalizeVocabularyAdventureState(stateValue);
    const input = isPlainObject(submission) ? submission : {};
    const expectedCursor = Number(input.expectedCursor);
    const wordKey = adventureWordKey(input.wordKey);
    if (!state.session || state.session.completed) {
      throw adventureResultError('SESSION_UNAVAILABLE', 'Adventure session is missing or completed');
    }
    if (!Number.isInteger(expectedCursor) || state.session.cursor !== expectedCursor) {
      throw adventureResultError('CURSOR_MISMATCH', 'Adventure cursor changed before result submission');
    }
    const item = state.session.plan[state.session.cursor];
    if (!item || item.phase !== 'screening') {
      throw adventureResultError('NOT_SCREENING', 'Current adventure item is not a screening item');
    }
    if (item.status !== 'pending') {
      throw adventureResultError('ALREADY_COMPLETED', 'Current adventure item is already completed');
    }
    if (!wordKey || item.wordKey !== wordKey) {
      throw adventureResultError('WORD_MISMATCH', 'Adventure word does not match the current plan item');
    }
    if (!SCREENING_TASK_TYPES.includes(input.taskType)) {
      throw adventureResultError('INVALID_TASK_TYPE', 'Adventure task type is not supported');
    }
    if (!RESULTS.has(input.result)) {
      throw adventureResultError('INVALID_RESULT', 'Adventure result must be D, H, or F');
    }

    const nextWordState = applyAdventureResult(state.words[wordKey], input.result, input.reviewedAt);
    nextWordState.lastTaskType = input.taskType;
    const nextPlan = state.session.plan.map((planEntry, index) => index === state.session.cursor
      ? {
          ...planEntry,
          taskType: input.taskType,
          status: 'completed',
          result: input.result
        }
      : { ...planEntry });
    const nextSession = updateVocabularyAdventureSessionCursor(
      { ...state.session, plan: nextPlan },
      state.session.cursor + 1
    );
    return normalizeVocabularyAdventureState({
      ...state,
      words: { ...state.words, [wordKey]: nextWordState },
      session: nextSession
    });
  }

  function prepareVocabularyAdventureReviewResult(stateValue, submission) {
    const state = normalizeVocabularyAdventureState(stateValue);
    const input = isPlainObject(submission) ? submission : {};
    const expectedCursor = Number(input.expectedCursor);
    const wordKey = adventureWordKey(input.wordKey);
    if (!state.session || state.session.completed) {
      throw adventureResultError('SESSION_UNAVAILABLE', 'Adventure session is missing or completed');
    }
    if (!Number.isInteger(expectedCursor) || state.session.cursor !== expectedCursor) {
      throw adventureResultError('CURSOR_MISMATCH', 'Adventure cursor changed before review submission');
    }
    const item = state.session.plan[state.session.cursor];
    if (!item || item.phase !== 'review') {
      throw adventureResultError('NOT_REVIEW', 'Current adventure item is not a review item');
    }
    if (state.session.plan.some(planEntry => planEntry.phase === 'screening' && planEntry.status !== 'completed')) {
      throw adventureResultError('SCREENING_INCOMPLETE', 'Review cannot complete before all screening items');
    }
    if (item.status !== 'pending') {
      throw adventureResultError('ALREADY_COMPLETED', 'Current adventure review item is already completed');
    }
    if (!wordKey || item.wordKey !== wordKey) {
      throw adventureResultError('WORD_MISMATCH', 'Adventure word does not match the current review item');
    }
    if (typeof input.taskType !== 'string' || !input.taskType.trim()) {
      throw adventureResultError('INVALID_TASK_TYPE', 'Adventure review task type is required');
    }
    if (!RESULTS.has(input.result)) {
      throw adventureResultError('INVALID_RESULT', 'Adventure result must be D, H, or F');
    }

    const nextWordState = applyAdventureResult(state.words[wordKey], input.result, input.reviewedAt);
    nextWordState.lastTaskType = input.taskType;
    const nextPlan = state.session.plan.map((planEntry, index) => index === state.session.cursor
      ? {
          ...planEntry,
          taskType: input.taskType,
          confirmationTaskType: typeof input.confirmationTaskType === 'string'
            ? input.confirmationTaskType
            : '',
          outcomeDetail: typeof input.outcomeDetail === 'string' ? input.outcomeDetail : '',
          status: 'completed',
          result: input.result
        }
      : { ...planEntry });
    if (
      state.session.cursor + 1 >= nextPlan.length
      && nextPlan.some(planEntry => planEntry.status !== 'completed')
    ) {
      throw adventureResultError('PLAN_INCOMPLETE', 'Adventure session still contains incomplete plan items');
    }
    const nextSession = updateVocabularyAdventureSessionCursor(
      { ...state.session, plan: nextPlan },
      state.session.cursor + 1
    );
    return normalizeVocabularyAdventureState({
      ...state,
      words: { ...state.words, [wordKey]: nextWordState },
      session: nextSession
    });
  }

  function summarizeVocabularyAdventureSession(stateValue) {
    const state = normalizeVocabularyAdventureState(stateValue);
    const plan = state.session ? state.session.plan : [];
    const completed = plan.filter(item => item.status === 'completed');
    const resultCount = result => completed.filter(item => item.result === result).length;
    return {
      total: plan.length,
      screeningCompleted: completed.filter(item => item.phase === 'screening').length,
      reviewCompleted: completed.filter(item => item.phase === 'review').length,
      reviewTotal: plan.filter(item => item.phase === 'review').length,
      direct: resultCount('D'),
      hinted: resultCount('H'),
      failed: resultCount('F'),
      usageWeak: completed.filter(item => item.outcomeDetail === 'usageWeak').length,
      severeOverdueCompleted: completed.some(item => item.reviewReason === 'severeOverdue'),
      completed: !!(state.session && state.session.completed)
    };
  }

  return Object.freeze({
    VERSION,
    INTERVAL_DAYS,
    REVIEW_PRIORITY,
    SCREENING_TASK_TYPES,
    normalizeAdventureWord,
    adventureWordKey,
    localDateKey,
    addLocalDays,
    defaultVocabularyAdventureState,
    normalizeVocabularyAdventureState,
    collectVocabularyAdventureCandidates,
    classifyVocabularyAdventureCandidates,
    buildVocabularyAdventurePlan,
    orderVocabularyAdventurePlanForUser,
    stableAdventureHash,
    deterministicAdventureShuffle,
    assignVocabularyAdventureTaskType,
    buildVocabularyAdventureQuestion,
    resolveVocabularyAdventureSession,
    updateVocabularyAdventureSessionCursor,
    applyAdventureResult,
    prepareVocabularyAdventureResult,
    prepareVocabularyAdventureReviewResult,
    summarizeVocabularyAdventureSession
  });
});
