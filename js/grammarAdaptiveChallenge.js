(function grammarAdaptiveChallengeModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.GrammarAdaptiveChallenge = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGrammarAdaptiveChallenge() {
  'use strict';

  const CHALLENGE_ID = 'grammar-adaptive-daily-v1';
  const ALGORITHM_VERSION = 2;
  const QUESTION_LIMIT = 15;
  const CURRENT_LIMIT = 8;
  const WEAKNESS_LIMIT = 4;
  const HISTORY_LIMIT = 3;
  const PROGRESS_KEY = 'grammar_progress';
  const WEAKNESS_VIEW_KEY = 'assessment_weakness_view_v1';
  const HISTORY_KEY_PREFIX = 'grammar_challenge_history_v2_';

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function unique(values) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(text).filter(Boolean))];
  }

  function stableHash(value) {
    const source = String(value == null ? '' : value);
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicShuffle(values, seed, identity) {
    const getIdentity = typeof identity === 'function' ? identity : value => String(value);
    return (Array.isArray(values) ? values : [])
      .map((value, index) => ({
        value,
        index,
        rank: stableHash(`${seed}|${getIdentity(value)}|${index}`)
      }))
      .sort((left, right) => left.rank - right.rank || left.index - right.index)
      .map(entry => entry.value);
  }

  function normalizeBank(value) {
    const source = plainObject(value) ? value : {};
    const rawCourses = (Array.isArray(source.courses) ? source.courses : [])
      .filter(course => plainObject(course) && text(course.lessonKey || course.courseKey || course.questionBankKey))
      .map(course => {
        const lessonKey = text(course.lessonKey || course.courseKey || course.questionBankKey);
        return {
          ...clone(course),
          lessonKey,
          courseKey: lessonKey,
          questionBankKey: lessonKey,
          lessonDate: text(course.lessonDate || course.date),
          displayName: text(course.displayTitle || course.displayName || course.title || lessonKey),
          displayTitle: text(course.displayTitle || course.displayName || course.title || lessonKey),
          classroomPracticeId: text(course.classroomPracticeId || course.source && course.source.classroomPracticeId),
          classroomPracticePath: text(course.classroomPracticePath || course.source && course.source.classroomPracticePath),
          knowledgePointIds: unique(course.knowledgePointIds || course.kpIds),
          selectable: course.selectable !== false,
          questions: Array.isArray(course.questions) ? course.questions : []
        };
      });
    const courseItems = rawCourses.flatMap(course => course.questions.map(item => ({
          ...item,
          sourceLessonKey: text(item && item.sourceLessonKey) || course.lessonKey,
          sourceLessonKpIds: unique(item && item.sourceLessonKpIds || course.knowledgePointIds),
          sourceChallengeDate: text(item && item.sourceChallengeDate) || course.lessonDate,
          sourceChallengeTitle: text(item && item.sourceChallengeTitle) || course.displayName
        })));
    const sourceItems = [
      ...courseItems,
      ...(Array.isArray(source.items) ? source.items : [])
    ];
    const items = sourceItems
      .filter(item => plainObject(item) && text(item.bankItemId || item.id))
      .map(item => {
        const kpIds = unique(item.kpIds);
        const explicitPrimaryKpId = text(item.primaryKpId);
        const primaryKpId = explicitPrimaryKpId || (kpIds.length === 1 ? kpIds[0] : '');
        const category = text(item.category);
        const explicitPrimaryWeaknessId = text(item.primaryWeaknessId);
        const formalWeaknessEligible = Boolean(
          kpIds.length === 1
          && primaryKpId
          && kpIds.includes(primaryKpId)
          && category
          && item.formalWeaknessEligible !== false
          && (item.formalWeaknessEligible === true || explicitPrimaryWeaknessId)
        );
        const primaryWeaknessId = formalWeaknessEligible
          ? explicitPrimaryWeaknessId || `sister.${primaryKpId}.${category}`
          : '';
        const weaknessIds = formalWeaknessEligible
          ? unique([...(item.weaknessIds || []), primaryWeaknessId])
          : [];
        const diagnosticTargets = formalWeaknessEligible
          ? unique(item.diagnosticTargets && item.diagnosticTargets.length ? item.diagnosticTargets : [category])
          : [];
        return {
          ...clone(item),
          id: text(item.bankItemId || item.id),
          bankItemId: text(item.bankItemId || item.id),
          sourceLessonKey: text(item.sourceLessonKey),
          sourceLessonKpIds: unique(item.sourceLessonKpIds),
          kpIds,
          primaryKpId,
          formalWeaknessEligible,
          category,
          weaknessIds,
          primaryWeaknessId,
          diagnosticTargets,
          contentHash: text(item.contentHash),
          variantGroupId: text(item.variantGroupId)
        };
      });
    const courses = rawCourses.length ? rawCourses : [...items.reduce((groups, item) => {
      if (!item.sourceLessonKey) return groups;
      if (!groups.has(item.sourceLessonKey)) {
        groups.set(item.sourceLessonKey, {
          lessonKey: item.sourceLessonKey,
          courseKey: item.sourceLessonKey,
          questionBankKey: item.sourceLessonKey,
          lessonDate: text(item.sourceChallengeDate),
          displayName: text(item.sourceChallengeTitle) || item.sourceLessonKey,
          displayTitle: text(item.sourceChallengeTitle) || item.sourceLessonKey,
          knowledgePointIds: unique(item.sourceLessonKpIds),
          selectable: true,
          questions: []
        });
      }
      groups.get(item.sourceLessonKey).questions.push(item);
      return groups;
    }, new Map()).values()];
    return {
      schemaVersion: Number(source.schemaVersion) || 1,
      version: text(source.version),
      courses,
      items
    };
  }

  function mergeBanks(primaryValue, fallbackValue) {
    const primary = normalizeBank(primaryValue);
    const fallback = normalizeBank(fallbackValue);
    if (!primary.courses.length || !primary.items.length) return fallback;
    const primaryIds = new Set(primary.items.map(item => item.bankItemId));
    const primaryHashes = new Set(primary.items.map(item => item.contentHash).filter(Boolean));
    const legacyItems = fallback.items.filter(item => (
      !primaryIds.has(item.bankItemId)
      && (!item.contentHash || !primaryHashes.has(item.contentHash))
    ));
    return normalizeBank({
      schemaVersion: Math.max(primary.schemaVersion, fallback.schemaVersion),
      version: `${primary.version}|legacy:${fallback.version}`,
      courses: primary.courses,
      items: legacyItems
    });
  }

  function normalizeProgress(value) {
    const source = plainObject(value) ? value : {};
    const rawTopics = Array.isArray(source.topics)
      ? source.topics.map(row => [text(row && (row.topicKey || row.topic_key)), row])
      : Object.entries(plainObject(source.topics) ? source.topics : {});
    const topics = {};
    rawTopics.forEach(([rawKey, rawValue]) => {
      const key = text(rawKey);
      const row = plainObject(rawValue) ? rawValue : {};
      if (!key || text(row.status) !== 'confirmed_complete') return;
      const lastLessonDate = text(row.lastLessonDate || row.last_lesson_date);
      if (!/^20\d{2}-\d{2}-\d{2}$/.test(lastLessonDate)) return;
      topics[key] = { status: 'confirmed_complete', lastLessonDate };
    });
    return topics;
  }

  function normalizeFormalWeaknesses(value, studentValue) {
    const student = studentValue === 'brother' ? 'brother' : 'sister';
    const source = plainObject(value) ? value : {};
    const groups = source.students && source.students[student] && Array.isArray(source.students[student].groups)
      ? source.students[student].groups
      : [];
    const result = new Map();
    groups.forEach(group => {
      (Array.isArray(group && group.items) ? group.items : []).forEach(item => {
        const weaknessId = text(item && (item.weaknessId || item.weakness_id));
        const status = text(item && item.status);
        if (weaknessId && ['active', 'improving'].includes(status)) result.set(weaknessId, status);
      });
    });
    return result;
  }

  function normalizePreviouslyDrawnIds(value) {
    const ids = [];
    const visit = node => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (!plainObject(node)) return;
      const direct = text(node.bankItemId || node.bank_item_id || node.questionId || node.question_id);
      if (direct && direct.includes('::')) ids.push(direct);
      if (Array.isArray(node.questions)) visit(node.questions);
      if (Array.isArray(node.items)) visit(node.items);
      if (plainObject(node.attempts)) visit(Object.values(node.attempts));
      if (plainObject(node.adaptiveSession)) visit(node.adaptiveSession);
    };
    visit(value);
    return unique(ids);
  }

  function weaknessIdForStudent(value, studentValue) {
    const student = studentValue === 'brother' ? 'brother' : 'sister';
    return text(value).replace(/^(?:brother|sister)\./, `${student}.`);
  }

  function lessonDateForItem(item, progress) {
    const direct = progress[item.sourceLessonKey];
    return direct ? direct.lastLessonDate : '';
  }

  function uniqueByContentHash(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).filter(item => {
      const key = item.contentHash || item.bankItemId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function takeDiverse(values, limit) {
    const selected = [];
    const counts = new Map();
    (Array.isArray(values) ? values : []).forEach(item => {
      if (selected.length >= limit) return;
      const kpId = item.primaryKpId || '';
      if ((counts.get(kpId) || 0) >= 2) return;
      selected.push(item);
      counts.set(kpId, (counts.get(kpId) || 0) + 1);
    });
    if (selected.length < limit) {
      const selectedIds = new Set(selected.map(item => item.bankItemId));
      values.forEach(item => {
        if (selected.length < limit && !selectedIds.has(item.bankItemId)) {
          selected.push(item);
          selectedIds.add(item.bankItemId);
        }
      });
    }
    return selected;
  }

  function planItem(item, slot, bucket, reason) {
    return {
      slot,
      bankItemId: item.bankItemId,
      bucket,
      reason,
      recheckOf: '',
      status: 'pending',
      firstTryCorrect: null,
      answeredAt: ''
    };
  }

  function courseCatalog(value) {
    return normalizeBank(value).courses
      .filter(course => course.selectable !== false)
      .map(course => ({
        lessonKey: course.lessonKey,
        courseKey: course.lessonKey,
        questionBankKey: course.lessonKey,
        lessonDate: course.lessonDate,
        displayName: course.displayName,
        displayTitle: course.displayTitle || course.displayName,
        questionCount: course.questions.length,
        classroomPracticeId: course.classroomPracticeId,
        classroomPracticePath: course.classroomPracticePath,
        source: clone(course.source || {})
      }));
  }

  function buildSession(options) {
    const settings = plainObject(options) ? options : {};
    const bank = normalizeBank(settings.bank);
    const progress = normalizeProgress(settings.progress);
    const student = settings.student === 'brother' ? 'brother' : 'sister';
    const date = text(settings.date);
    const requestedCurrentLessonKey = text(settings.currentLessonKey || settings.recentLessonKey);
    const formalWeaknesses = normalizeFormalWeaknesses(settings.weaknessView, student);
    const previouslyDrawnIds = new Set(unique([
      ...normalizePreviouslyDrawnIds(settings.history),
      ...normalizePreviouslyDrawnIds(settings.previouslyDrawnIds)
    ]));
    const enriched = uniqueByContentHash(bank.items.map(item => ({
      ...item,
      learnedAt: lessonDateForItem(item, progress)
    })));
    // 当前课程只能由老师的当日手动路线指定。不能在路线缺失时悄悄回退到题库第一课，
    // 否则会把非当日课程的题和随堂练习混在同一轮挑战中。
    const inferredCurrentLessonKey = requestedCurrentLessonKey;
    if (!inferredCurrentLessonKey) {
      return { ok: false, code: 'MANUAL_CURRENT_COURSE_REQUIRED', available: 0, currentLessonKey: '' };
    }
    const currentCandidates = enriched.filter(item => item.sourceLessonKey === inferredCurrentLessonKey);
    const eligible = enriched.filter(item => (
      item.sourceLessonKey === inferredCurrentLessonKey
      || Boolean(item.learnedAt)
      || previouslyDrawnIds.has(item.bankItemId)
    ));
    const historyCandidates = eligible.filter(item => item.sourceLessonKey !== inferredCurrentLessonKey);

    if (currentCandidates.length < CURRENT_LIMIT) {
      return { ok: false, code: 'INSUFFICIENT_CURRENT_QUESTIONS', available: currentCandidates.length, currentLessonKey: inferredCurrentLessonKey };
    }

    const seed = `${date}|${student}|grammar-adaptive|${ALGORITHM_VERSION}|${bank.version}`;
    const currentOrdered = deterministicShuffle(currentCandidates, `${seed}|current`, item => item.bankItemId);
    const currentSelected = currentOrdered.slice(0, CURRENT_LIMIT);
    const selectedIds = new Set(currentSelected.map(item => item.bankItemId));
    const historyOrdered = deterministicShuffle(historyCandidates, `${seed}|history`, item => item.bankItemId);
    const formalOrdered = deterministicShuffle(eligible, `${seed}|formal-weakness`, item => item.bankItemId)
      .filter(item => {
        const weaknessId = weaknessIdForStudent(item.primaryWeaknessId, student);
        return weaknessId && formalWeaknesses.has(weaknessId) && !selectedIds.has(item.bankItemId);
      })
      .sort((left, right) => {
        const leftId = weaknessIdForStudent(left.primaryWeaknessId, student);
        const rightId = weaknessIdForStudent(right.primaryWeaknessId, student);
        const leftRank = formalWeaknesses.get(leftId) === 'active' ? 0 : 1;
        const rightRank = formalWeaknesses.get(rightId) === 'active' ? 0 : 1;
        return leftRank - rightRank;
      });
    const weaknessSelected = uniqueByContentHash(formalOrdered).slice(0, WEAKNESS_LIMIT);
    weaknessSelected.forEach(item => selectedIds.add(item.bankItemId));
    const historySelected = takeDiverse(
      historyOrdered.filter(item => !selectedIds.has(item.bankItemId)),
      HISTORY_LIMIT
    );
    historySelected.forEach(item => selectedIds.add(item.bankItemId));
    const missing = QUESTION_LIMIT - currentSelected.length - weaknessSelected.length - historySelected.length;
    const currentFill = currentOrdered.filter(item => !selectedIds.has(item.bankItemId)).slice(0, missing);
    currentFill.forEach(item => selectedIds.add(item.bankItemId));
    const selected = deterministicShuffle([
      ...currentSelected.map(item => ({ item, bucket: 'current', reason: 'current' })),
      ...weaknessSelected.map(item => ({ item, bucket: 'weakness', reason: 'formal-weakness' })),
      ...historySelected.map(item => ({ item, bucket: 'history', reason: 'history' })),
      ...currentFill.map(item => ({ item, bucket: 'current', reason: 'current-fill' }))
    ], `${seed}|final-order`, entry => entry.item.bankItemId);
    if (selected.length < QUESTION_LIMIT) {
      return {
        ok: false,
        code: 'INSUFFICIENT_ELIGIBLE_QUESTIONS',
        available: selected.length,
        currentLessonKey: inferredCurrentLessonKey
      };
    }
    const items = selected.map((entry, index) => planItem(entry.item, index, entry.bucket, entry.reason));
    const now = text(settings.startedAt) || new Date().toISOString();
    return {
      ok: true,
      session: {
        schemaVersion: 2,
        algorithmVersion: ALGORITHM_VERSION,
        bankVersion: bank.version,
        date,
        student,
        seed,
        currentLessonKey: inferredCurrentLessonKey,
        recentLessonKey: inferredCurrentLessonKey,
        currentLessonDate: bank.courses.find(course => course.lessonKey === inferredCurrentLessonKey)?.lessonDate || '',
        recentLessonDate: bank.courses.find(course => course.lessonKey === inferredCurrentLessonKey)?.lessonDate || '',
        status: 'active',
        cursor: 0,
        items,
        candidateIds: {
          current: currentCandidates.map(item => item.bankItemId),
          recent: currentCandidates.map(item => item.bankItemId),
          history: historyCandidates.map(item => item.bankItemId),
          eligible: eligible.map(item => item.bankItemId)
        },
        correctionQueue: [],
        startedAt: now,
        updatedAt: now,
        completedAt: ''
      }
    };
  }

  function normalizeSession(value, bankValue) {
    const source = plainObject(value) ? clone(value) : null;
    const bank = normalizeBank(bankValue);
    if (!source || !Array.isArray(source.items) || source.items.length !== QUESTION_LIMIT) return null;
    const bankIds = new Set(bank.items.map(item => item.bankItemId));
    if (source.items.some(item => !bankIds.has(text(item && item.bankItemId)))) return null;
    const items = source.items.map((item, index) => ({
      slot: index,
      bankItemId: text(item.bankItemId),
      bucket: ['current', 'weakness', 'history'].includes(item.bucket)
        ? item.bucket
        : item.bucket === 'recent' ? 'current' : 'history',
      reason: text(item.reason) || 'history',
      recheckOf: text(item.recheckOf),
      status: item.status === 'answered' ? 'answered' : 'pending',
      firstTryCorrect: typeof item.firstTryCorrect === 'boolean' ? item.firstTryCorrect : null,
      answeredAt: text(item.answeredAt)
    }));
    const answered = items.filter(item => item.status === 'answered').length;
    const correctionQueue = (Array.isArray(source.correctionQueue) ? source.correctionQueue : [])
      .filter(item => plainObject(item) && text(item.correctionId) && bankIds.has(text(item.bankItemId)))
      .map(item => ({
        correctionId: text(item.correctionId),
        originalBankItemId: text(item.originalBankItemId),
        bankItemId: text(item.bankItemId),
        mode: item.mode === 'variant' ? 'variant' : 'repeat-original',
        status: item.status === 'answered' ? 'answered' : 'pending',
        correct: typeof item.correct === 'boolean' ? item.correct : null,
        answeredAt: text(item.answeredAt)
      }));
    const hasPendingCorrection = correctionQueue.some(item => item.status === 'pending');
    return {
      ...source,
      schemaVersion: Number(source.schemaVersion) || 1,
      algorithmVersion: Number(source.algorithmVersion) || ALGORITHM_VERSION,
      bankVersion: text(source.bankVersion),
      student: source.student === 'brother' ? 'brother' : 'sister',
      status: answered >= QUESTION_LIMIT && !hasPendingCorrection ? 'completed' : 'active',
      cursor: Math.max(answered, Math.min(QUESTION_LIMIT, Number(source.cursor) || 0)),
      items,
      candidateIds: {
        current: unique(source.candidateIds && (source.candidateIds.current || source.candidateIds.recent)).filter(id => bankIds.has(id)),
        recent: unique(source.candidateIds && source.candidateIds.recent).filter(id => bankIds.has(id)),
        history: unique(source.candidateIds && source.candidateIds.history).filter(id => bankIds.has(id)),
        eligible: unique(source.candidateIds && source.candidateIds.eligible).filter(id => bankIds.has(id))
      },
      correctionQueue
    };
  }

  function correctionCandidates(session, currentQuestion, bankById) {
    const used = new Set([
      ...session.items.map(item => item.bankItemId),
      ...session.correctionQueue.map(item => item.bankItemId)
    ]);
    const eligibleIds = session.candidateIds.eligible.length
      ? session.candidateIds.eligible
      : unique([
          ...session.candidateIds.current,
          ...session.candidateIds.recent,
          ...session.candidateIds.history
        ]);
    return eligibleIds
      .map(id => bankById.get(id))
      .filter(item => item
        && !used.has(item.bankItemId)
        && item.contentHash !== currentQuestion.contentHash
        && currentQuestion.variantGroupId
        && item.variantGroupId === currentQuestion.variantGroupId);
  }

  function applyAnswer(sessionValue, options) {
    const settings = plainObject(options) ? options : {};
    const bank = normalizeBank(settings.bank);
    const session = normalizeSession(sessionValue, bank);
    if (!session || session.status !== 'active') throw new Error('ADAPTIVE_SESSION_NOT_ACTIVE');
    const currentIndex = session.cursor;
    const current = session.items[currentIndex];
    if (!current || current.status !== 'pending') throw new Error('ADAPTIVE_QUESTION_NOT_PENDING');
    if (text(settings.questionId) !== current.bankItemId) throw new Error('ADAPTIVE_QUESTION_MISMATCH');
    const bankById = new Map(bank.items.map(item => [item.bankItemId, item]));
    const currentQuestion = bankById.get(current.bankItemId);
    if (!currentQuestion) throw new Error('ADAPTIVE_QUESTION_MISSING');
    const answeredAt = text(settings.answeredAt) || new Date().toISOString();
    const correct = settings.correct === true;
    current.status = 'answered';
    current.firstTryCorrect = correct;
    current.answeredAt = answeredAt;

    let correction = null;
    if (!correct) {
      const candidates = deterministicShuffle(
        correctionCandidates(session, currentQuestion, bankById),
        `${session.seed}|correction|${current.bankItemId}|${currentIndex}`,
        item => item.bankItemId
      );
      const correctionQuestion = candidates[0] || currentQuestion;
      correction = {
        correctionId: `correction:${currentIndex}:${current.bankItemId}`,
        originalBankItemId: current.bankItemId,
        bankItemId: correctionQuestion.bankItemId,
        mode: candidates[0] ? 'variant' : 'repeat-original',
        status: 'pending',
        correct: null,
        answeredAt: ''
      };
      session.correctionQueue.push(correction);
    }

    session.cursor += 1;
    session.updatedAt = answeredAt;
    if (session.cursor >= QUESTION_LIMIT && !session.correctionQueue.some(item => item.status === 'pending')) {
      session.status = 'completed';
      session.completedAt = answeredAt;
    }
    return { session, correction };
  }

  function applyCorrectionAnswer(sessionValue, options) {
    const settings = plainObject(options) ? options : {};
    const bank = normalizeBank(settings.bank);
    const session = normalizeSession(sessionValue, bank);
    if (!session || session.status !== 'active') throw new Error('ADAPTIVE_SESSION_NOT_ACTIVE');
    const correction = session.correctionQueue.find(item => item.status === 'pending');
    if (!correction) throw new Error('ADAPTIVE_CORRECTION_NOT_PENDING');
    if (text(settings.correctionId) !== correction.correctionId
      || text(settings.questionId) !== correction.bankItemId) {
      throw new Error('ADAPTIVE_CORRECTION_MISMATCH');
    }
    const answeredAt = text(settings.answeredAt) || new Date().toISOString();
    correction.status = 'answered';
    correction.correct = settings.correct === true;
    correction.answeredAt = answeredAt;
    session.updatedAt = answeredAt;
    if (session.cursor >= QUESTION_LIMIT && !session.correctionQueue.some(item => item.status === 'pending')) {
      session.status = 'completed';
      session.completedAt = answeredAt;
    }
    return { session, correction };
  }

  function nextCorrectionQuestion(sessionValue, bankValue) {
    const bank = normalizeBank(bankValue);
    const session = normalizeSession(sessionValue, bank);
    if (!session) return null;
    const correction = session.correctionQueue.find(item => item.status === 'pending');
    if (!correction) return null;
    const question = clone(bank.items.find(item => item.bankItemId === correction.bankItemId));
    if (!question) return null;
    const primaryWeaknessId = weaknessIdForStudent(question.primaryWeaknessId, session.student);
    const weaknessIds = unique((question.weaknessIds || []).map(id => weaknessIdForStudent(id, session.student)));
    if (primaryWeaknessId && !weaknessIds.includes(primaryWeaknessId)) weaknessIds.unshift(primaryWeaknessId);
    return {
      ...question,
      primaryWeaknessId,
      weaknessIds,
      correctionId: correction.correctionId,
      correctionMode: correction.mode,
      correctionOf: correction.originalBankItemId,
      isCorrection: true
    };
  }

  function questionsForSession(sessionValue, bankValue) {
    const bank = normalizeBank(bankValue);
    const session = normalizeSession(sessionValue, bank);
    if (!session) return [];
    const byId = new Map(bank.items.map(item => [item.bankItemId, item]));
    return session.items.map(item => {
      const question = clone(byId.get(item.bankItemId));
      const primaryWeaknessId = weaknessIdForStudent(question.primaryWeaknessId, session.student);
      const weaknessIds = unique((question.weaknessIds || []).map(id => weaknessIdForStudent(id, session.student)));
      if (primaryWeaknessId && !weaknessIds.includes(primaryWeaknessId)) weaknessIds.unshift(primaryWeaknessId);
      return {
        ...question,
        primaryWeaknessId,
        weaknessIds,
        variantGroupId: weaknessIdForStudent(question.variantGroupId, session.student),
        adaptiveBucket: item.bucket,
        adaptiveReason: item.reason,
        adaptiveRecheckOf: item.recheckOf
      };
    });
  }

  function install(root) {
    if (!root || root.__grammarAdaptiveChallengeInstalled) return;
    root.__grammarAdaptiveChallengeInstalled = true;
    const runtime = { user: '', record: null, session: null, writeQueue: Promise.resolve() };

    let loadedBank = null;
    let bankPromise = null;

    function bank() {
      return loadedBank || mergeBanks(root.GRAMMAR_COURSE_QUESTION_BANKS, root.GRAMMAR_QUESTION_BANK);
    }

    async function loadCourseBank() {
      if (loadedBank) return loadedBank;
      const embedded = normalizeBank(root.GRAMMAR_COURSE_QUESTION_BANKS);
      if (embedded.courses.length && embedded.items.length) {
        loadedBank = mergeBanks(root.GRAMMAR_COURSE_QUESTION_BANKS, root.GRAMMAR_QUESTION_BANK);
        return loadedBank;
      }
      if (!bankPromise) {
        bankPromise = (async () => {
          if (typeof root.fetch === 'function') {
            try {
              const response = await root.fetch('grammar-challenge/data/course-question-banks.json', {
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
              });
              if (response && response.ok) {
                const payload = await response.json();
                const shared = normalizeBank(payload);
                if (shared.courses.length && shared.items.length) {
                  root.GRAMMAR_COURSE_QUESTION_BANKS = clone(payload);
                  loadedBank = mergeBanks(payload, root.GRAMMAR_QUESTION_BANK);
                  return loadedBank;
                }
              }
            } catch (_) {}
          }
          loadedBank = normalizeBank(root.GRAMMAR_QUESTION_BANK);
          return loadedBank;
        })().finally(() => { bankPromise = null; });
      }
      return bankPromise;
    }

    async function readValue(key) {
      try {
        const mirrored = root.getMirrorValue?.(key);
        if (mirrored != null) return mirrored;
      } catch (_) {}
      if (typeof root.sbGetRemote === 'function') {
        try {
          const value = await root.sbGetRemote(key);
          if (value != null) return value;
        } catch (_) {}
      }
      if (typeof root.sbGet === 'function') {
        try {
          const value = await root.sbGet(key);
          if (value != null) return value;
        } catch (_) {}
      }
      return null;
    }

    function saveRecord(user, record) {
      if (typeof root.saveDailyGrammarRecord !== 'function') throw new Error('GRAMMAR_DAILY_STORAGE_UNAVAILABLE');
      const queued = runtime.writeQueue
        .catch(() => null)
        .then(() => root.saveDailyGrammarRecord(user, record));
      runtime.writeQueue = queued;
      return queued;
    }

    function chooseDailyRecord(localValue, remoteValue) {
      const local = plainObject(localValue) ? localValue : null;
      const remote = plainObject(remoteValue) ? remoteValue : null;
      if (!remote) return local || {};
      if (!local) return remote;
      const localAdaptive = plainObject(local.adaptiveSession);
      const remoteAdaptive = plainObject(remote.adaptiveSession);
      if (localAdaptive && !remoteAdaptive) return local;
      if (remoteAdaptive && !localAdaptive) return remote;
      const freshness = record => text(
        record.adaptiveSession && record.adaptiveSession.updatedAt
        || record.completedAt
        || record.startedAt
      );
      return freshness(remote) >= freshness(local) ? remote : local;
    }

    async function prepareDaily(options) {
      const settings = plainObject(options) ? options : {};
      const user = settings.user === 'brother' ? 'brother' : 'sister';
      const currentBank = await loadCourseBank();
      const selectedGrammar = plainObject(settings.route && settings.route.grammarChallenge)
        ? settings.route.grammarChallenge
        : {};
      const selectedCourse = plainObject(settings.route && settings.route.currentCourse)
        ? settings.route.currentCourse
        : {};
      const selectedLessonKey = text(
        selectedCourse.lessonKey || selectedCourse.courseKey || selectedCourse.questionBankKey
        || selectedGrammar.lessonKey || selectedGrammar.reviewLessonKey
      )
        .replace(/^manual-courseware:/, '');
      const routeRevision = text(settings.route && (
        settings.route.manualSelection && settings.route.manualSelection.updatedAt
        || settings.route.updatedAt
      ));
      let record = plainObject(settings.record) ? clone(settings.record) : {};
      if (typeof root.loadDailyGrammarRecord === 'function') {
        try {
          const remoteRecord = await root.loadDailyGrammarRecord(user);
          record = clone(chooseDailyRecord(record, remoteRecord));
        } catch (_) {}
      }
      if (record.status === 'completed') {
        return {
          challengeId: text(record.challengeId) || CHALLENGE_ID,
          record: clone(record),
          session: normalizeSession(record.adaptiveSession, currentBank),
          completed: true
        };
      }
      let session = normalizeSession(record.adaptiveSession, currentBank);
      if (session && session.cursor === 0 && routeRevision && text(record.routeUpdatedAt) !== routeRevision) {
        session = null;
      }
      if (!session) {
        const [progress, weaknessView, history] = await Promise.all([
          readValue(PROGRESS_KEY),
          readValue(WEAKNESS_VIEW_KEY),
          readValue(`${HISTORY_KEY_PREFIX}${user}`)
        ]);
        const built = buildSession({
          bank: currentBank,
          progress,
          weaknessView,
          history,
          student: user,
          date: settings.date,
          currentLessonKey: selectedLessonKey,
          startedAt: record.startedAt
        });
        if (!built.ok) {
          const error = new Error(built.code);
          error.detail = built;
          throw error;
        }
        session = built.session;
      }
      const now = new Date().toISOString();
      record = {
        ...record,
        challengeId: CHALLENGE_ID,
        routeUpdatedAt: routeRevision,
        reviewLessonKey: `adaptive:${session.currentLessonKey || session.recentLessonKey}`,
        title: '15题综合语法挑战',
        status: 'started',
        startedAt: text(record.startedAt) || now,
        completedAt: '',
        score: null,
        correctCount: null,
        totalCount: QUESTION_LIMIT,
        answersShown: false,
        rewarded: false,
        adaptiveSession: session
      };
      runtime.user = user;
      runtime.record = record;
      runtime.session = session;
      saveRecord(user, record).catch(error => {
        console.warn('Unable to sync adaptive grammar start record', error);
      });
      return { challengeId: CHALLENGE_ID, record: clone(record), session: clone(session) };
    }

    function getFrameConfig() {
      if (!runtime.session) return null;
      return {
        version: 1,
        title: '15题综合语法挑战',
        interactionMode: 'challenge-locked',
        completionTitle: '今日语法挑战完成',
        completion: '最近课程与已学知识点都完成了复习。',
        feedbackDelayMs: 900,
        knowledge: ['当前课程 8 题', '正式薄弱项 4 题', '历史复习 3 题', '答错立即重刷'],
        round: { size: QUESTION_LIMIT, shuffle: false },
        adaptiveSession: {
          enabled: true,
          cursor: runtime.session.cursor,
          results: runtime.session.items.map(item => item.firstTryCorrect),
          correction: nextCorrectionQuestion(runtime.session, bank())
        },
        questions: questionsForSession(runtime.session, bank())
      };
    }

    async function recordAnswer(options) {
      if (!runtime.session || !runtime.record) throw new Error('ADAPTIVE_RUNTIME_NOT_READY');
      const result = options && options.correction === true
        ? applyCorrectionAnswer(runtime.session, { ...options, bank: bank() })
        : applyAnswer(runtime.session, { ...options, bank: bank() });
      const nextRecord = { ...runtime.record, adaptiveSession: result.session };
      await saveRecord(runtime.user, nextRecord);
      runtime.session = result.session;
      runtime.record = nextRecord;
      return {
        session: clone(result.session),
        correction: clone(result.correction),
        nextCorrection: nextCorrectionQuestion(result.session, bank()),
        questions: questionsForSession(result.session, bank())
      };
    }

    root.prepareAdaptiveGrammarChallenge = prepareDaily;
    root.loadGrammarCourseQuestionBank = loadCourseBank;
    root.getAdaptiveGrammarFrameConfig = getFrameConfig;
    root.recordAdaptiveGrammarAnswer = recordAnswer;
    root.getAdaptiveGrammarChallengeMeta = challengeId => challengeId === CHALLENGE_ID && runtime.session
      ? {
          challengeId: CHALLENGE_ID,
          challengeTitle: '15题综合语法挑战',
          challengeContentDate: runtime.session.date,
          lessonKey: `adaptive:${runtime.session.currentLessonKey || runtime.session.recentLessonKey}`,
          kpIds: unique(getFrameConfig()?.questions.flatMap(item => item.kpIds || []))
        }
      : null;
  }

  return Object.freeze({
    CHALLENGE_ID,
    ALGORITHM_VERSION,
    QUESTION_LIMIT,
    CURRENT_LIMIT,
    WEAKNESS_LIMIT,
    HISTORY_LIMIT,
    stableHash,
    deterministicShuffle,
    normalizeBank,
    mergeBanks,
    courseCatalog,
    normalizeProgress,
    normalizeFormalWeaknesses,
    normalizePreviouslyDrawnIds,
    weaknessIdForStudent,
    buildSession,
    normalizeSession,
    applyAnswer,
    applyCorrectionAnswer,
    nextCorrectionQuestion,
    questionsForSession,
    install
  });
});
