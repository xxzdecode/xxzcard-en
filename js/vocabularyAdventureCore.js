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
      taskType: typeof value.taskType === 'string' ? value.taskType : '',
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
    return { version: VERSION, words, session: normalizeSession(source.session) };
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
    return { screening, review };
  }

  function planItem(candidate, phase) {
    return {
      wordKey: candidate.key,
      word: candidate.word,
      batchId: candidate.batchId,
      batchName: candidate.batchName || '',
      cardIndex: candidate.cardIndex,
      phase,
      taskType: '',
      status: 'pending',
      result: ''
    };
  }

  function positiveTarget(value, fallback) {
    const target = Number(value);
    return Number.isFinite(target) && target >= 0 ? Math.floor(target) : fallback;
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
      return pools.screening.slice(0, firstSessionTarget).map(candidate => planItem(candidate, 'screening'));
    }

    const totalTarget = screeningTarget + reviewTarget;
    let screeningCount = Math.min(screeningTarget, pools.screening.length);
    let reviewCount = Math.min(reviewTarget, pools.review.length);
    let remaining = Math.max(0, totalTarget - screeningCount - reviewCount);
    const extraScreening = Math.min(remaining, pools.screening.length - screeningCount);
    screeningCount += extraScreening;
    remaining -= extraScreening;
    reviewCount += Math.min(remaining, pools.review.length - reviewCount);

    return [
      ...pools.screening.slice(0, screeningCount).map(candidate => planItem(candidate, 'screening')),
      ...pools.review.slice(0, reviewCount).map(entry => planItem(entry.candidate, 'review'))
    ];
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

  return Object.freeze({
    VERSION,
    INTERVAL_DAYS,
    REVIEW_PRIORITY,
    normalizeAdventureWord,
    adventureWordKey,
    localDateKey,
    addLocalDays,
    defaultVocabularyAdventureState,
    normalizeVocabularyAdventureState,
    collectVocabularyAdventureCandidates,
    classifyVocabularyAdventureCandidates,
    buildVocabularyAdventurePlan,
    resolveVocabularyAdventureSession,
    updateVocabularyAdventureSessionCursor,
    applyAdventureResult
  });
});
