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
  const ALGORITHM_VERSION = 1;
  const QUESTION_LIMIT = 15;
  const RECENT_LIMIT = 8;
  const HISTORY_LIMIT = 7;
  const PRIORITY_HISTORY_LIMIT = 6;
  const RECHECK_GAP = 3;
  const PROGRESS_KEY = 'grammar_progress';
  const WEAKNESS_VIEW_KEY = 'assessment_weakness_view_v1';
  const GRAMMAR_WEAK_SUMMARY_PREFIX = 'grammar_challenge_weak_summary_v2_';

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
    const items = (Array.isArray(source.items) ? source.items : [])
      .filter(item => plainObject(item) && text(item.bankItemId || item.id))
      .map(item => ({
        ...clone(item),
        id: text(item.bankItemId || item.id),
        bankItemId: text(item.bankItemId || item.id),
        sourceLessonKey: text(item.sourceLessonKey),
        sourceLessonKpIds: unique(item.sourceLessonKpIds),
        kpIds: unique(item.kpIds),
        primaryKpId: text(item.primaryKpId) || unique(item.kpIds)[0] || text(item.sourceLessonKey),
        weaknessIds: unique(item.weaknessIds),
        primaryWeaknessId: text(item.primaryWeaknessId),
        contentHash: text(item.contentHash),
        variantGroupId: text(item.variantGroupId)
      }));
    return {
      schemaVersion: Number(source.schemaVersion) || 1,
      version: text(source.version),
      items
    };
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

  function normalizeGrammarWeakKpIds(value) {
    const source = plainObject(value) ? value : {};
    return unique(source.weakKpIds || source.weak_kp_ids);
  }

  function weaknessIdForStudent(value, studentValue) {
    const student = studentValue === 'brother' ? 'brother' : 'sister';
    return text(value).replace(/^(?:brother|sister)\./, `${student}.`);
  }

  function lessonDateForItem(item, progress) {
    const direct = progress[item.sourceLessonKey];
    if (direct) return direct.lastLessonDate;
    const candidates = unique([...(item.sourceLessonKpIds || []), ...(item.kpIds || [])])
      .map(kpId => progress[kpId] && progress[kpId].lastLessonDate)
      .filter(Boolean)
      .sort();
    return candidates[candidates.length - 1] || '';
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

  function interleave(recent, history, seed) {
    const recentQueue = deterministicShuffle(recent, `${seed}|recent-order`, item => item.bankItemId);
    const historyQueue = deterministicShuffle(history, `${seed}|history-order`, item => item.bankItemId);
    const result = [];
    for (let index = 0; index < Math.max(recentQueue.length, historyQueue.length); index += 1) {
      const historyFirst = stableHash(`${seed}|pair|${index}`) % 2 === 1;
      const pair = historyFirst
        ? [historyQueue[index], recentQueue[index]]
        : [recentQueue[index], historyQueue[index]];
      pair.filter(Boolean).forEach(item => result.push(item));
    }
    return result;
  }

  function buildSession(options) {
    const settings = plainObject(options) ? options : {};
    const bank = normalizeBank(settings.bank);
    const progress = normalizeProgress(settings.progress);
    const student = settings.student === 'brother' ? 'brother' : 'sister';
    const date = text(settings.date);
    const requestedRecentLessonKey = text(settings.recentLessonKey);
    const formalWeaknesses = normalizeFormalWeaknesses(settings.weaknessView, student);
    const grammarWeakKpIds = new Set(normalizeGrammarWeakKpIds(settings.grammarWeakSummary));
    const eligible = uniqueByContentHash(bank.items.map(item => ({
      ...item,
      learnedAt: lessonDateForItem(item, progress)
    })).filter(item => item.learnedAt || (requestedRecentLessonKey && item.sourceLessonKey === requestedRecentLessonKey)));
    const recentLessonKey = requestedRecentLessonKey || '';
    const recentLessonDate = recentLessonKey
      ? progress[recentLessonKey]?.lastLessonDate || text(settings.recentLessonDate) || date
      : eligible.map(item => item.learnedAt).sort().at(-1) || '';
    const recentCandidates = recentLessonKey
      ? eligible.filter(item => item.sourceLessonKey === recentLessonKey)
      : eligible.filter(item => item.learnedAt === recentLessonDate);
    const effectiveRecentLessonKey = recentLessonKey || recentCandidates[0]?.sourceLessonKey || '';
    const historyCandidates = eligible.filter(item => (
      item.sourceLessonKey !== effectiveRecentLessonKey
      && item.learnedAt
    ));

    if (recentCandidates.length < RECENT_LIMIT) {
      return { ok: false, code: 'INSUFFICIENT_RECENT_QUESTIONS', available: recentCandidates.length, recentLessonDate };
    }
    if (historyCandidates.length < HISTORY_LIMIT) {
      return { ok: false, code: 'INSUFFICIENT_HISTORY_QUESTIONS', available: historyCandidates.length, recentLessonDate };
    }

    const seed = `${date}|${student}|grammar-adaptive|${ALGORITHM_VERSION}|${bank.version}`;
    const recentOrdered = deterministicShuffle(recentCandidates, `${seed}|recent`, item => item.bankItemId);
    const recentSelected = recentOrdered.slice(0, RECENT_LIMIT);
    const historyOrdered = deterministicShuffle(historyCandidates, `${seed}|history`, item => item.bankItemId);
    const formalPriority = historyOrdered
      .filter(item => {
        const weaknessId = weaknessIdForStudent(item.primaryWeaknessId, student);
        return weaknessId && formalWeaknesses.has(weaknessId);
      })
      .sort((left, right) => {
        const leftId = weaknessIdForStudent(left.primaryWeaknessId, student);
        const rightId = weaknessIdForStudent(right.primaryWeaknessId, student);
        const leftRank = formalWeaknesses.get(leftId) === 'active' ? 0 : 1;
        const rightRank = formalWeaknesses.get(rightId) === 'active' ? 0 : 1;
        return leftRank - rightRank;
      });
    const grammarPriority = historyOrdered.filter(item => grammarWeakKpIds.has(item.primaryKpId));
    const priority = uniqueByContentHash([...formalPriority, ...grammarPriority]).slice(0, PRIORITY_HISTORY_LIMIT);
    const priorityIds = new Set(priority.map(item => item.bankItemId));
    const remaining = takeDiverse(
      historyOrdered.filter(item => !priorityIds.has(item.bankItemId)),
      HISTORY_LIMIT - priority.length
    );
    const historySelected = [...priority, ...remaining].slice(0, HISTORY_LIMIT);
    const selected = interleave(
      recentSelected.map(item => ({ item, bucket: 'recent', reason: 'recent' })),
      historySelected.map(item => ({
        item,
        bucket: 'history',
        reason: priorityIds.has(item.bankItemId) ? 'priority' : 'history'
      })),
      seed
    );
    const items = selected.map((entry, index) => planItem(entry.item, index, entry.bucket, entry.reason));
    const now = text(settings.startedAt) || new Date().toISOString();
    return {
      ok: true,
      session: {
        schemaVersion: 1,
        algorithmVersion: ALGORITHM_VERSION,
        bankVersion: bank.version,
        date,
        student,
        seed,
        recentLessonKey: effectiveRecentLessonKey,
        recentLessonDate,
        status: 'active',
        cursor: 0,
        items,
        candidateIds: {
          recent: recentCandidates.map(item => item.bankItemId),
          history: historyCandidates.map(item => item.bankItemId)
        },
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
      bucket: item.bucket === 'history' ? 'history' : 'recent',
      reason: text(item.reason) || 'history',
      recheckOf: text(item.recheckOf),
      status: item.status === 'answered' ? 'answered' : 'pending',
      firstTryCorrect: typeof item.firstTryCorrect === 'boolean' ? item.firstTryCorrect : null,
      answeredAt: text(item.answeredAt)
    }));
    const answered = items.filter(item => item.status === 'answered').length;
    return {
      ...source,
      schemaVersion: 1,
      algorithmVersion: Number(source.algorithmVersion) || ALGORITHM_VERSION,
      bankVersion: text(source.bankVersion),
      student: source.student === 'brother' ? 'brother' : 'sister',
      status: answered >= QUESTION_LIMIT || source.status === 'completed' ? 'completed' : 'active',
      cursor: Math.max(answered, Math.min(QUESTION_LIMIT, Number(source.cursor) || 0)),
      items,
      candidateIds: {
        recent: unique(source.candidateIds && source.candidateIds.recent).filter(id => bankIds.has(id)),
        history: unique(source.candidateIds && source.candidateIds.history).filter(id => bankIds.has(id))
      }
    };
  }

  function replacementCandidates(session, current, bankById) {
    const used = new Set(session.items.map(item => item.bankItemId));
    return (session.candidateIds[current.bucket] || [])
      .map(id => bankById.get(id))
      .filter(item => item && !used.has(item.bankItemId));
  }

  function sameRecheckTarget(candidate, currentQuestion, student) {
    if (candidate.contentHash && candidate.contentHash === currentQuestion.contentHash) return false;
    const currentWeaknessId = weaknessIdForStudent(currentQuestion.primaryWeaknessId, student);
    const candidateWeaknessId = weaknessIdForStudent(candidate.primaryWeaknessId, student);
    if (currentWeaknessId && candidateWeaknessId === currentWeaknessId) return true;
    if (currentQuestion.variantGroupId && candidate.variantGroupId === currentQuestion.variantGroupId) return true;
    return Boolean(currentQuestion.primaryKpId && candidate.primaryKpId === currentQuestion.primaryKpId);
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

    let replacement = null;
    if (!correct) {
      const futureSlot = session.items.findIndex((item, index) => (
        index >= currentIndex + RECHECK_GAP
        && item.status === 'pending'
        && item.bucket === current.bucket
        && item.reason !== 'recheck'
      ));
      if (futureSlot >= 0) {
        const candidates = deterministicShuffle(
          replacementCandidates(session, current, bankById).filter(item => sameRecheckTarget(item, currentQuestion, session.student)),
          `${session.seed}|recheck|${current.bankItemId}|${currentIndex}`,
          item => item.bankItemId
        );
        if (candidates[0]) {
          const previous = session.items[futureSlot];
          session.items[futureSlot] = {
            ...planItem(candidates[0], futureSlot, current.bucket, 'recheck'),
            recheckOf: current.bankItemId,
            replacedBankItemId: previous.bankItemId
          };
          replacement = { slot: futureSlot, bankItemId: candidates[0].bankItemId };
        }
      }
    }

    session.cursor += 1;
    session.updatedAt = answeredAt;
    if (session.cursor >= QUESTION_LIMIT) {
      session.status = 'completed';
      session.completedAt = answeredAt;
    }
    return { session, replacement };
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

    function bank() {
      return normalizeBank(root.GRAMMAR_QUESTION_BANK);
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
      const currentBank = bank();
      const selectedGrammar = plainObject(settings.route && settings.route.grammarChallenge)
        ? settings.route.grammarChallenge
        : {};
      const selectedLessonKey = text(selectedGrammar.lessonKey || selectedGrammar.reviewLessonKey)
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
        const [progress, weaknessView, grammarWeakSummary] = await Promise.all([
          readValue(PROGRESS_KEY),
          readValue(WEAKNESS_VIEW_KEY),
          readValue(`${GRAMMAR_WEAK_SUMMARY_PREFIX}${user}`)
        ]);
        const built = buildSession({
          bank: currentBank,
          progress,
          weaknessView,
          grammarWeakSummary,
          student: user,
          date: settings.date,
          recentLessonKey: selectedLessonKey,
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
        reviewLessonKey: `adaptive:${session.recentLessonKey || session.recentLessonDate}`,
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
        knowledge: ['最近课程 8 题', '历史知识 7 题', '错题稍后再练'],
        round: { size: QUESTION_LIMIT, shuffle: false },
        adaptiveSession: {
          enabled: true,
          cursor: runtime.session.cursor,
          results: runtime.session.items.map(item => item.firstTryCorrect)
        },
        questions: questionsForSession(runtime.session, bank())
      };
    }

    async function recordAnswer(options) {
      if (!runtime.session || !runtime.record) throw new Error('ADAPTIVE_RUNTIME_NOT_READY');
      const result = applyAnswer(runtime.session, { ...options, bank: bank() });
      const nextRecord = { ...runtime.record, adaptiveSession: result.session };
      await saveRecord(runtime.user, nextRecord);
      runtime.session = result.session;
      runtime.record = nextRecord;
      return {
        session: clone(result.session),
        replacement: clone(result.replacement),
        questions: questionsForSession(result.session, bank())
      };
    }

    root.prepareAdaptiveGrammarChallenge = prepareDaily;
    root.getAdaptiveGrammarFrameConfig = getFrameConfig;
    root.recordAdaptiveGrammarAnswer = recordAnswer;
    root.getAdaptiveGrammarChallengeMeta = challengeId => challengeId === CHALLENGE_ID && runtime.session
      ? {
          challengeId: CHALLENGE_ID,
          challengeTitle: '15题综合语法挑战',
          challengeContentDate: runtime.session.date,
          lessonKey: `adaptive:${runtime.session.recentLessonKey || runtime.session.recentLessonDate}`,
          kpIds: unique(getFrameConfig()?.questions.flatMap(item => item.kpIds || []))
        }
      : null;
  }

  return Object.freeze({
    CHALLENGE_ID,
    ALGORITHM_VERSION,
    QUESTION_LIMIT,
    RECENT_LIMIT,
    HISTORY_LIMIT,
    PRIORITY_HISTORY_LIMIT,
    RECHECK_GAP,
    stableHash,
    deterministicShuffle,
    normalizeBank,
    normalizeProgress,
    normalizeFormalWeaknesses,
    weaknessIdForStudent,
    buildSession,
    normalizeSession,
    applyAnswer,
    questionsForSession,
    install
  });
});
