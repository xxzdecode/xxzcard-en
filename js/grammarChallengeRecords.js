(function grammarChallengeRecordsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.GrammarChallengeRecords = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGrammarChallengeRecords() {
  'use strict';

  const VERSION = 2;
  const HISTORY_KEY_PREFIX = 'grammar_challenge_history_v2_';
  const SUMMARY_KEY_PREFIX = 'grammar_challenge_weak_summary_v2_';
  const PENDING_KEY_PREFIX = 'grammar_challenge_pending_v2_';
  const SUMMARY_PENDING_KEY_PREFIX = 'grammar_challenge_summary_pending_v2_';
  const ACTIVE_KEY_PREFIX = 'grammar_challenge_active_v2_';
  const STATUS = Object.freeze({
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    EXITED: 'exited',
    INTERRUPTED: 'interrupted'
  });
  const DEFAULT_RULES = Object.freeze({
    weakThreshold: 80,
    recentCompletedAttempts: 3,
    recentWrongQuestionLimit: 5
  });

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function integer(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : Math.round(Number(fallback) || 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const result = [];
    (Array.isArray(values) ? values : []).forEach(value => {
      const text = String(value || '').trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      result.push(text);
    });
    return result;
  }

  function studentKey(value) {
    return value === 'brother' ? 'brother' : 'sister';
  }

  function historyKey(student) {
    return HISTORY_KEY_PREFIX + studentKey(student);
  }

  function summaryKey(student) {
    return SUMMARY_KEY_PREFIX + studentKey(student);
  }

  function pendingKey(student) {
    return PENDING_KEY_PREFIX + studentKey(student);
  }

  function summaryPendingKey(student) {
    return SUMMARY_PENDING_KEY_PREFIX + studentKey(student);
  }

  function activeKey(student) {
    return ACTIVE_KEY_PREFIX + studentKey(student);
  }

  function isoNow(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  function dateKey(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (!Number.isFinite(date.getTime())) return '';
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function statusRank(value) {
    if (value === STATUS.COMPLETED) return 3;
    if (value === STATUS.EXITED || value === STATUS.INTERRUPTED) return 2;
    return 1;
  }

  function normalizeQuestionResult(value, fallbackKpIds) {
    const source = isPlainObject(value) ? value : {};
    const questionId = String(source.questionId || source.id || '').trim();
    if (!questionId) return null;
    const hasCorrect = typeof source.correct === 'boolean';
    const hasFirst = typeof source.firstTryCorrect === 'boolean';
    const weaknessIds = uniqueStrings(source.weaknessIds || source.weakness_ids);
    const explicitPrimary = String(source.primaryWeaknessId || source.primary_weakness_id || '').trim();
    return {
      questionId,
      kpIds: uniqueStrings(source.kpIds || source.kp_ids || fallbackKpIds),
      weaknessIds,
      primaryWeaknessId: explicitPrimary || (weaknessIds.length === 1 ? weaknessIds[0] : ''),
      diagnosticTargets: uniqueStrings(source.diagnosticTargets || source.diagnostic_targets),
      contentHash: String(source.contentHash || source.content_hash || '').trim(),
      weaknessOrigin: String(source.weaknessOrigin || source.weakness_origin || '').trim(),
      weaknessKpId: String(source.weaknessKpId || source.weakness_kp_id || '').trim(),
      weaknessSkillKey: String(source.weaknessSkillKey || source.weakness_skill_key || '').trim(),
      weaknessTitle: String(source.weaknessTitle || source.weakness_title || '').trim(),
      answered: source.answered === true || hasCorrect || hasFirst,
      correct: hasCorrect ? source.correct : false,
      firstTryCorrect: hasFirst ? source.firstTryCorrect : false,
      viewedAnswer: source.viewedAnswer === true || source.answerShown === true,
      answeredAt: typeof source.answeredAt === 'string' ? source.answeredAt : '',
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
    };
  }

  function normalizeAttempt(value, fallbackStudent) {
    const source = isPlainObject(value) ? value : {};
    const attemptId = String(source.attemptId || source.id || '').trim();
    if (!attemptId) return null;
    const kpIds = uniqueStrings(source.kpIds || source.kp_ids);
    const questions = [];
    const seen = new Set();
    (Array.isArray(source.questions) ? source.questions : []).forEach(item => {
      const normalized = normalizeQuestionResult(item, kpIds);
      if (!normalized || seen.has(normalized.questionId)) return;
      seen.add(normalized.questionId);
      questions.push(normalized);
    });
    const answeredQuestions = questions.filter(item => item.answered);
    const correctQuestions = answeredQuestions.filter(item => item.correct).length;
    const totalQuestions = Math.max(0, integer(source.totalQuestions, questions.length));
    const status = Object.values(STATUS).includes(source.status) ? source.status : STATUS.IN_PROGRESS;
    const computedScore = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : null;
    const hasStoredScore = source.score !== null && source.score !== '' && Number.isFinite(Number(source.score));
    const score = hasStoredScore
      ? clamp(integer(source.score), 0, 100)
      : status === STATUS.COMPLETED
        ? computedScore
        : null;
    const derivedWrongQuestionIds = questions
      .filter(item => !item.correct && (status === STATUS.COMPLETED || item.answered))
      .map(item => item.questionId);
    const wrongQuestionIds = uniqueStrings(questions.length
      ? derivedWrongQuestionIds
      : source.wrongQuestionIds || source.wrong_question_ids);
    const derivedReviewKpIds = questions
      .filter(item => !item.correct && (status === STATUS.COMPLETED || item.answered))
      .flatMap(item => item.kpIds);
    const reviewKpIds = uniqueStrings(questions.length
      ? derivedReviewKpIds
      : source.reviewKpIds || source.review_kp_ids);
    return {
      version: VERSION,
      student: studentKey(source.student || fallbackStudent),
      attemptId,
      challengeId: String(source.challengeId || '').trim(),
      challengeTitle: String(source.challengeTitle || source.title || '').trim(),
      challengeDate: String(source.challengeDate || source.attemptDate || '').trim(),
      challengeContentDate: String(source.challengeContentDate || source.contentDate || source.date || '').trim(),
      lessonKey: String(source.lessonKey || source.lesson_key || '').trim(),
      kpIds,
      startedAt: typeof source.startedAt === 'string' ? source.startedAt : '',
      endedAt: typeof source.endedAt === 'string' ? source.endedAt : '',
      status,
      attemptOfDay: Math.max(1, integer(source.attemptOfDay, 1)),
      totalQuestions,
      correctQuestions,
      score,
      questions,
      wrongQuestionIds,
      reviewKpIds,
      currentQuestionId: String(source.currentQuestionId || '').trim(),
      currentQuestionIndex: Math.max(0, integer(source.currentQuestionIndex, 0)),
      answeredCount: answeredQuestions.length,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : (source.startedAt || ''),
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : (source.endedAt || source.startedAt || '')
    };
  }

  function normalizeHistory(value, fallbackStudent) {
    const student = studentKey(fallbackStudent || (value && value.student));
    const source = isPlainObject(value) ? value : {};
    const attempts = {};
    const rawAttempts = isPlainObject(source.attempts) ? source.attempts : {};
    Object.entries(rawAttempts).forEach(([id, item]) => {
      const normalized = normalizeAttempt({ ...item, attemptId: item && item.attemptId || id }, student);
      if (normalized) attempts[normalized.attemptId] = normalized;
    });
    const attemptOrder = uniqueStrings(source.attemptOrder)
      .filter(id => attempts[id]);
    Object.keys(attempts).forEach(id => {
      if (!attemptOrder.includes(id)) attemptOrder.push(id);
    });
    attemptOrder.sort((a, b) => {
      const left = attempts[a] && attempts[a].startedAt || '';
      const right = attempts[b] && attempts[b].startedAt || '';
      return left.localeCompare(right);
    });
    return {
      version: VERSION,
      student,
      attempts,
      attemptOrder,
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
    };
  }

  function mergeQuestionResults(existingValue, nextValue, fallbackKpIds) {
    const existing = normalizeQuestionResult(existingValue, fallbackKpIds);
    const next = normalizeQuestionResult(nextValue, fallbackKpIds);
    if (!existing) return next;
    if (!next) return existing;
    const nextIsNewer = String(next.updatedAt || next.answeredAt || '') >= String(existing.updatedAt || existing.answeredAt || '');
    return {
      questionId: existing.questionId,
      kpIds: uniqueStrings([...(existing.kpIds || []), ...(next.kpIds || [])]),
      weaknessIds: uniqueStrings([...(existing.weaknessIds || []), ...(next.weaknessIds || [])]),
      primaryWeaknessId: next.primaryWeaknessId || existing.primaryWeaknessId,
      diagnosticTargets: uniqueStrings([...(existing.diagnosticTargets || []), ...(next.diagnosticTargets || [])]),
      contentHash: next.contentHash || existing.contentHash,
      weaknessOrigin: next.weaknessOrigin || existing.weaknessOrigin,
      weaknessKpId: next.weaknessKpId || existing.weaknessKpId,
      weaknessSkillKey: next.weaknessSkillKey || existing.weaknessSkillKey,
      weaknessTitle: next.weaknessTitle || existing.weaknessTitle,
      answered: existing.answered || next.answered,
      correct: nextIsNewer ? next.correct : existing.correct,
      firstTryCorrect: existing.answered ? existing.firstTryCorrect : next.firstTryCorrect,
      viewedAnswer: existing.viewedAnswer || next.viewedAnswer,
      answeredAt: existing.answeredAt || next.answeredAt,
      updatedAt: nextIsNewer ? (next.updatedAt || next.answeredAt) : (existing.updatedAt || existing.answeredAt)
    };
  }

  function mergeAttempts(existingValue, nextValue) {
    const existing = normalizeAttempt(existingValue, nextValue && nextValue.student);
    const next = normalizeAttempt(nextValue, existing && existing.student);
    if (!existing) return next;
    if (!next) return existing;
    const kpIds = uniqueStrings([...(existing.kpIds || []), ...(next.kpIds || [])]);
    const byId = new Map(existing.questions.map(item => [item.questionId, item]));
    next.questions.forEach(item => {
      byId.set(item.questionId, mergeQuestionResults(byId.get(item.questionId), item, kpIds));
    });
    const questions = [...byId.values()];
    const newer = String(next.updatedAt || '') >= String(existing.updatedAt || '');
    const resumedInterrupted = existing.status === STATUS.INTERRUPTED
      && next.status === STATUS.IN_PROGRESS
      && newer;
    const status = resumedInterrupted
      ? STATUS.IN_PROGRESS
      : statusRank(next.status) >= statusRank(existing.status) ? next.status : existing.status;
    return normalizeAttempt({
      ...existing,
      ...(newer ? next : {}),
      attemptId: existing.attemptId,
      student: existing.student,
      challengeId: next.challengeId || existing.challengeId,
      challengeTitle: next.challengeTitle || existing.challengeTitle,
      challengeDate: next.challengeDate || existing.challengeDate,
      challengeContentDate: next.challengeContentDate || existing.challengeContentDate,
      lessonKey: next.lessonKey || existing.lessonKey,
      kpIds,
      startedAt: existing.startedAt || next.startedAt,
      endedAt: status === STATUS.COMPLETED || status === STATUS.EXITED || status === STATUS.INTERRUPTED
        ? (next.endedAt || existing.endedAt)
        : '',
      status,
      attemptOfDay: existing.attemptOfDay || next.attemptOfDay,
      questions,
      createdAt: existing.createdAt || next.createdAt,
      updatedAt: newer ? next.updatedAt : existing.updatedAt
    }, existing.student);
  }

  function upsertAttempt(historyValue, attemptValue) {
    const attempt = normalizeAttempt(attemptValue, attemptValue && attemptValue.student);
    const history = normalizeHistory(historyValue, attempt && attempt.student);
    if (!attempt) return { history, attempt: null, inserted: false };
    const existing = history.attempts[attempt.attemptId];
    const merged = mergeAttempts(existing, attempt);
    history.attempts[attempt.attemptId] = merged;
    if (!history.attemptOrder.includes(attempt.attemptId)) history.attemptOrder.push(attempt.attemptId);
    history.attemptOrder.sort((a, b) => {
      const left = history.attempts[a] && history.attempts[a].startedAt || '';
      const right = history.attempts[b] && history.attempts[b].startedAt || '';
      return left.localeCompare(right);
    });
    history.updatedAt = merged.updatedAt || isoNow();
    return { history, attempt: merged, inserted: !existing };
  }

  function createAttempt(metaValue, options) {
    const meta = isPlainObject(metaValue) ? metaValue : {};
    const settings = isPlainObject(options) ? options : {};
    const now = isoNow(settings.now);
    const student = studentKey(settings.student || meta.student);
    const randomId = typeof settings.attemptId === 'string' && settings.attemptId
      ? settings.attemptId
      : `${student}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
    return normalizeAttempt({
      student,
      attemptId: randomId,
      challengeId: meta.challengeId,
      challengeTitle: meta.challengeTitle,
      challengeDate: dateKey(now),
      challengeContentDate: meta.challengeContentDate || meta.challengeDate || '',
      lessonKey: meta.lessonKey,
      kpIds: meta.kpIds,
      startedAt: now,
      endedAt: '',
      status: STATUS.IN_PROGRESS,
      attemptOfDay: Math.max(1, integer(settings.attemptOfDay, 1)),
      totalQuestions: Math.max(0, integer(meta.totalQuestions, 0)),
      correctQuestions: 0,
      score: null,
      questions: [],
      wrongQuestionIds: [],
      reviewKpIds: [],
      currentQuestionId: '',
      currentQuestionIndex: 0,
      answeredCount: 0,
      createdAt: now,
      updatedAt: now
    }, student);
  }

  function updateAttemptProgress(attemptValue, progressValue, atValue) {
    const attempt = normalizeAttempt(attemptValue, attemptValue && attemptValue.student);
    if (!attempt) return null;
    const progress = isPlainObject(progressValue) ? progressValue : {};
    const now = isoNow(atValue);
    const byId = new Map(attempt.questions.map(item => [item.questionId, item]));
    (Array.isArray(progress.questions) ? progress.questions : []).forEach(item => {
      const normalized = normalizeQuestionResult({ ...item, updatedAt: item && item.updatedAt || now }, attempt.kpIds);
      if (!normalized) return;
      byId.set(normalized.questionId, mergeQuestionResults(byId.get(normalized.questionId), normalized, attempt.kpIds));
    });
    return normalizeAttempt({
      ...attempt,
      totalQuestions: Math.max(attempt.totalQuestions, integer(progress.totalQuestions, attempt.totalQuestions)),
      questions: [...byId.values()],
      currentQuestionId: progress.currentQuestionId || attempt.currentQuestionId,
      currentQuestionIndex: Number.isFinite(Number(progress.currentQuestionIndex))
        ? Math.max(0, integer(progress.currentQuestionIndex))
        : attempt.currentQuestionIndex,
      updatedAt: now
    }, attempt.student);
  }

  function finalizeAttempt(attemptValue, statusValue, atValue, scoreValue) {
    const attempt = normalizeAttempt(attemptValue, attemptValue && attemptValue.student);
    if (!attempt) return null;
    if (attempt.status === STATUS.COMPLETED && statusValue !== STATUS.COMPLETED) return attempt;
    const status = Object.values(STATUS).includes(statusValue) && statusValue !== STATUS.IN_PROGRESS
      ? statusValue
      : STATUS.INTERRUPTED;
    const now = isoNow(atValue);
    const answered = attempt.questions.filter(item => item.answered);
    const correct = answered.filter(item => item.correct).length;
    const total = Math.max(attempt.totalQuestions, attempt.questions.length);
    const hasScoreValue = scoreValue !== null && scoreValue !== '' && Number.isFinite(Number(scoreValue));
    const score = hasScoreValue
      ? clamp(integer(scoreValue), 0, 100)
      : status === STATUS.COMPLETED && total > 0
        ? Math.round((correct / total) * 100)
        : null;
    return normalizeAttempt({
      ...attempt,
      status,
      endedAt: now,
      totalQuestions: total,
      correctQuestions: correct,
      score,
      wrongQuestionIds: attempt.questions
        .filter(item => !item.correct && (status === STATUS.COMPLETED || item.answered))
        .map(item => item.questionId),
      reviewKpIds: attempt.questions
        .filter(item => !item.correct && (status === STATUS.COMPLETED || item.answered))
        .flatMap(item => item.kpIds),
      updatedAt: now
    }, attempt.student);
  }

  function completedAttempts(historyValue) {
    const history = normalizeHistory(historyValue, historyValue && historyValue.student);
    return history.attemptOrder
      .map(id => history.attempts[id])
      .filter(item => item && item.status === STATUS.COMPLETED)
      .sort((a, b) => String(a.endedAt || a.startedAt).localeCompare(String(b.endedAt || b.startedAt)));
  }

  function buildWeaknessEvidence(historyValue) {
    const history = normalizeHistory(historyValue, historyValue && historyValue.student);
    return completedAttempts(history).flatMap(attempt => attempt.questions.flatMap(question => {
      if (!question.answered || !question.primaryWeaknessId) return [];
      if (!question.weaknessIds.includes(question.primaryWeaknessId)) return [];
      const validPass = Boolean(
        question.correct
        && question.firstTryCorrect
        && !question.viewedAnswer
        && question.contentHash
      );
      const outcome = validPass
        ? 'pass'
        : !question.firstTryCorrect || !question.correct
          ? 'fail'
          : 'practice';
      return [{
        evidenceId: `grammar:${history.student}:${attempt.attemptId}:${question.questionId}`,
        sourceType: 'grammar_challenge',
        studentId: history.student,
        attemptId: attempt.attemptId,
        questionId: question.questionId,
        challengeId: attempt.challengeId,
        evidenceDate: attempt.challengeDate || dateKey(attempt.endedAt || attempt.startedAt),
        weaknessId: question.primaryWeaknessId,
        weaknessIds: [...question.weaknessIds],
        diagnosticTargets: [...question.diagnosticTargets],
        contentHash: question.contentHash,
        weaknessOrigin: question.weaknessOrigin,
        weaknessKpId: question.weaknessKpId,
        weaknessSkillKey: question.weaknessSkillKey,
        weaknessTitle: question.weaknessTitle,
        firstTryCorrect: question.firstTryCorrect,
        viewedAnswer: question.viewedAnswer,
        outcome,
        validForMastery: validPass
      }];
    }));
  }

  function attemptKpResult(attempt, kpId) {
    const questions = attempt.questions.filter(item => item.kpIds.includes(kpId));
    if (!questions.length) return null;
    const correct = questions.filter(item => item.correct).length;
    const wrongIds = questions.filter(item => !item.correct).map(item => item.questionId);
    return {
      attemptId: attempt.attemptId,
      lessonKey: attempt.lessonKey,
      date: attempt.endedAt || attempt.startedAt,
      total: questions.length,
      correct,
      accuracy: Math.round((correct / questions.length) * 100),
      wrongIds
    };
  }

  function daysAgo(value, nowValue) {
    const date = new Date(value);
    const now = new Date(nowValue || Date.now());
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(now.getTime())) return Infinity;
    return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
  }

  function normalizeRules(rulesValue) {
    const source = isPlainObject(rulesValue) ? rulesValue : {};
    return {
      weakThreshold: clamp(integer(source.weakThreshold, DEFAULT_RULES.weakThreshold), 1, 100),
      recentCompletedAttempts: Math.max(1, integer(source.recentCompletedAttempts, DEFAULT_RULES.recentCompletedAttempts)),
      recentWrongQuestionLimit: Math.max(1, integer(source.recentWrongQuestionLimit, DEFAULT_RULES.recentWrongQuestionLimit))
    };
  }

  function calculateKpStats(historyValue, rulesValue, nowValue) {
    const rules = normalizeRules(rulesValue);
    const threshold = clamp(integer(rules.weakThreshold, DEFAULT_RULES.weakThreshold), 1, 100);
    const recentLimit = Math.max(1, integer(rules.recentCompletedAttempts, DEFAULT_RULES.recentCompletedAttempts));
    const attempts = completedAttempts(historyValue);
    const kpIds = uniqueStrings(attempts.flatMap(attempt => attempt.questions.flatMap(question => question.kpIds)));
    return kpIds.map(kpId => {
      const results = attempts.map(attempt => attemptKpResult(attempt, kpId)).filter(Boolean);
      const total = results.reduce((sum, item) => sum + item.total, 0);
      const correct = results.reduce((sum, item) => sum + item.correct, 0);
      const recent = results.slice(-recentLimit);
      const recentAverageAccuracy = recent.length
        ? Math.round(recent.reduce((sum, item) => sum + item.accuracy, 0) / recent.length)
        : 0;
      let latestWrongAt = '';
      const recentWrongQuestionIds = [];
      [...results].reverse().forEach(result => {
        if (!result.wrongIds.length) return;
        if (!latestWrongAt) latestWrongAt = result.date;
        result.wrongIds.forEach(id => {
          if (recentWrongQuestionIds.length < Math.max(1, integer(rules.recentWrongQuestionLimit, 5))
              && !recentWrongQuestionIds.includes(id)) recentWrongQuestionIds.push(id);
        });
      });
      let consecutiveLowScore = 0;
      for (let index = results.length - 1; index >= 0; index -= 1) {
        if (results[index].accuracy >= threshold) break;
        consecutiveLowScore += 1;
      }
      let consecutiveHighScore = 0;
      for (let index = results.length - 1; index >= 0; index -= 1) {
        if (results[index].accuracy < threshold) break;
        consecutiveHighScore += 1;
      }
      const latest = results[results.length - 1] || null;
      const weak = recentAverageAccuracy < threshold;
      const wrongRecency = latestWrongAt ? daysAgo(latestWrongAt, nowValue) : Infinity;
      const recencyBoost = wrongRecency <= 7 ? 15 : wrongRecency <= 30 ? 8 : latestWrongAt ? 3 : 0;
      const priority = weak
        ? clamp(Math.round((threshold - recentAverageAccuracy) * 2 + consecutiveLowScore * 8 + recencyBoost - consecutiveHighScore * 10), 1, 100)
        : 0;
      return {
        kpId,
        attempts: total,
        correct,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        latestScore: latest ? latest.accuracy : null,
        recentAverageAccuracy,
        latestWrongAt,
        recentWrongQuestionIds,
        consecutiveLowScore,
        consecutiveHighScore,
        lessonKey: latest ? latest.lessonKey : '',
        weak,
        priority
      };
    });
  }

  function buildWeakSummary(historyValue, studentValue, rulesValue, nowValue) {
    const student = studentKey(studentValue || (historyValue && historyValue.student));
    const rules = normalizeRules(rulesValue);
    const stats = calculateKpStats(historyValue, rules, nowValue);
    const items = stats
      .filter(item => item.weak)
      .sort((a, b) => b.priority - a.priority
        || String(b.latestWrongAt || '').localeCompare(String(a.latestWrongAt || ''))
        || a.kpId.localeCompare(b.kpId));
    return {
      version: VERSION,
      student,
      threshold: clamp(integer(rules.weakThreshold, DEFAULT_RULES.weakThreshold), 1, 100),
      recentCompletedAttempts: Math.max(1, integer(rules.recentCompletedAttempts, DEFAULT_RULES.recentCompletedAttempts)),
      generatedAt: isoNow(nowValue),
      historyKey: historyKey(student),
      completedAttemptCount: completedAttempts(historyValue).length,
      weakKpIds: items.map(item => item.kpId),
      items: items.map(item => ({
        kpId: item.kpId,
        lessonKey: item.lessonKey,
        recentAverageAccuracy: item.recentAverageAccuracy,
        recentWrongQuestionIds: item.recentWrongQuestionIds,
        priority: item.priority,
        attempts: item.attempts,
        correct: item.correct,
        accuracy: item.accuracy,
        latestScore: item.latestScore,
        latestWrongAt: item.latestWrongAt,
        consecutiveLowScore: item.consecutiveLowScore,
        consecutiveHighScore: item.consecutiveHighScore
      }))
    };
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('en')
      .replace(/[’‘]/g, "'")
      .replace(/[\p{P}\p{S}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function canonicalJson(value) {
    if (Array.isArray(value)) return value.map(canonicalJson);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJson(value[key])]));
  }

  function sha256Hex(value) {
    const input = String(value == null ? '' : value);
    const bytes = typeof TextEncoder === 'function'
      ? new TextEncoder().encode(input)
      : Uint8Array.from(unescape(encodeURIComponent(input)), character => character.charCodeAt(0));
    const bitLength = bytes.length * 8;
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const lengthView = new DataView(padded.buffer);
    lengthView.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    lengthView.setUint32(paddedLength - 4, bitLength >>> 0, false);

    const constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const state = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const words = new Uint32Array(64);
    const rotateRight = (word, amount) => (word >>> amount) | (word << (32 - amount));
    for (let offset = 0; offset < padded.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) words[index] = lengthView.getUint32(offset + index * 4, false);
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
        const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
        words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = state;
      for (let index = 0; index < 64; index += 1) {
        const sum1 = (rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)) >>> 0;
        const choice = ((e & f) ^ (~e & g)) >>> 0;
        const temporary1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
        const sum0 = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) >>> 0;
        const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const temporary2 = (sum0 + majority) >>> 0;
        h = g; g = f; f = e; e = (d + temporary1) >>> 0;
        d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;
      }
      state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0;
      state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
      state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0;
      state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
    }
    return state.map(word => word.toString(16).padStart(8, '0')).join('');
  }

  function questionContentHash(questionValue) {
    const question = isPlainObject(questionValue) ? questionValue : {};
    const prompt = [question.source, question.prompt || question.question || question.title]
      .map(value => String(value || '').trim()).filter(Boolean).join('\n');
    const answer = question.answerDisplay ?? question.answer ?? question.correctAnswer
      ?? question.correct_answer ?? question.answerMap ?? question.answer_map ?? '';
    if (!prompt || answer === '' || answer == null) return '';
    return `sha256:${sha256Hex(JSON.stringify(canonicalJson({ prompt, answer })))}`;
  }

  function automaticWeaknessMetadata(questionValue, kpIdsValue, studentValue, metaValue) {
    const question = isPlainObject(questionValue) ? questionValue : {};
    const kpIds = uniqueStrings(kpIdsValue);
    const student = studentKey(studentValue);
    const category = String(question.category || question.skillKey || question.skill_key || '').trim();
    const skillSlug = category.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (kpIds.length !== 1 || !skillSlug) return null;
    const kpId = kpIds[0];
    const challengeTitle = String(metaValue && metaValue.challengeTitle || '').trim() || kpId;
    const categoryTitle = String(question.categoryLabel || question.category_label || category).split(/[｜|]/, 1)[0].trim();
    const skillKey = `grammar-${skillSlug}`;
    const weaknessId = `${student}.${kpId}.${skillKey}`;
    return {
      weaknessIds: [weaknessId],
      primaryWeaknessId: weaknessId,
      diagnosticTargets: [category],
      contentHash: questionContentHash(question),
      weaknessOrigin: 'automatic_grammar_challenge',
      weaknessKpId: kpId,
      weaknessSkillKey: skillKey,
      weaknessTitle: `语法挑战：${challengeTitle}－${categoryTitle || category}`
    };
  }

  function equalStringArrays(first, second, ignoreOrder) {
    if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return false;
    const left = first.map(normalizeText);
    const right = second.map(normalizeText);
    if (ignoreOrder) {
      left.sort();
      right.sort();
    }
    return left.every((value, index) => value === right[index]);
  }

  function inlineAnswerIndices(question) {
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
    const used = new Set();
    return answers.map(value => {
      if (typeof value === 'number') return value;
      const index = (question.options || []).findIndex((option, optionIndex) => option === value && !used.has(optionIndex));
      used.add(index);
      return index;
    });
  }

  function inlineQuestionCorrect(question, response) {
    if (!question || !response) return false;
    if (question.type === 'classify') {
      const expected = question.answerMap || {};
      return (question.options || []).every(option => response.assignments && response.assignments[option] === expected[option]);
    }
    const selected = Array.isArray(response.selectedIndices) ? response.selectedIndices : [];
    const expected = inlineAnswerIndices(question);
    if (question.type === 'order') return selected.length === expected.length && selected.every((value, index) => value === expected[index]);
    if (question.type === 'multi') {
      return selected.length === expected.length && selected.every(value => expected.includes(value));
    }
    return selected.length === 1 && selected[0] === expected[0];
  }

  function shellQuestionCorrect(question, response) {
    if (!question || !response) return false;
    const answer = response.answer;
    if (question.type === 'choice') return equalStringArrays(answer, question.correctAnswer, question.mode === 'multiple');
    if (question.type === 'order') return equalStringArrays(answer, question.correctAnswer, false);
    if (question.type === 'text') {
      return (question.fields || []).every((field, index) => {
        const normalized = normalizeText(answer && answer[index]);
        return (field.acceptedAnswers || []).some(accepted => normalizeText(accepted) === normalized);
      });
    }
    return false;
  }

  function install(root) {
    if (!root || root.__grammarChallengeRecordsInstalled) return;
    root.__grammarChallengeRecordsInstalled = true;

    const runtime = {
      activeAttempt: null,
      activeMeta: null,
      activeStudent: '',
      rawOpen: null,
      rawClose: null,
      frameLoadInstalled: false,
      frameCleanup: null,
      loaderWrapped: false,
      saveChains: new Map(),
      installedAt: Date.now(),
      rules: normalizeRules(root.GRAMMAR_CHALLENGE_WEAK_RULES)
    };

    function currentStudent() {
      try {
        return typeof currentUser !== 'undefined' && currentUser === 'brother' ? 'brother' : 'sister';
      } catch (_) {
        return root.currentUser === 'brother' ? 'brother' : 'sister';
      }
    }

    function teacherMode() {
      try {
        return typeof root.isTeacher === 'function' ? root.isTeacher() : currentUser === 'teacher';
      } catch (_) {
        return root.currentUser === 'teacher';
      }
    }

    function storage() {
      try { return root.localStorage || null; } catch (_) { return null; }
    }

    function readJsonLocal(key, fallback) {
      try {
        const local = storage();
        if (!local) return clone(fallback);
        const raw = local.getItem(key);
        return raw ? JSON.parse(raw) : clone(fallback);
      } catch (_) {
        return clone(fallback);
      }
    }

    function writeJsonLocal(key, value) {
      try {
        const local = storage();
        if (!local) return false;
        local.setItem(key, JSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    }

    function removeLocal(key) {
      try { storage()?.removeItem(key); } catch (_) {}
    }

    function readActive(student) {
      return normalizeAttempt(readJsonLocal(activeKey(student), null), student);
    }

    function writeActive(attempt) {
      if (!attempt) return false;
      return writeJsonLocal(activeKey(attempt.student), attempt);
    }

    function clearActive(student, attemptId) {
      const active = readActive(student);
      if (!attemptId || !active || active.attemptId === attemptId) removeLocal(activeKey(student));
    }

    function readPending(student) {
      const source = readJsonLocal(pendingKey(student), { version: VERSION, attempts: {} });
      return {
        version: VERSION,
        attempts: isPlainObject(source && source.attempts) ? source.attempts : {}
      };
    }

    function queuePending(attemptValue, needsSummary) {
      const attempt = normalizeAttempt(attemptValue, attemptValue && attemptValue.student);
      if (!attempt) return;
      const pending = readPending(attempt.student);
      const existing = pending.attempts[attempt.attemptId];
      pending.attempts[attempt.attemptId] = mergeAttempts(existing, attempt);
      writeJsonLocal(pendingKey(attempt.student), pending);
      if (needsSummary || attempt.status === STATUS.COMPLETED) {
        writeJsonLocal(summaryPendingKey(attempt.student), { pending: true, updatedAt: attempt.updatedAt || isoNow() });
      }
    }

    async function loadHistory(student, preferRemote) {
      const key = historyKey(student);
      let value = null;
      if (preferRemote && typeof root.sbGetRemote === 'function') {
        try { value = await root.sbGetRemote(key); } catch (_) {}
      }
      if (value == null && typeof root.sbGet === 'function') {
        try { value = await root.sbGet(key); } catch (_) {}
      }
      if (value == null && typeof root.getMirrorValue === 'function') {
        try { value = root.getMirrorValue(key); } catch (_) {}
      }
      return normalizeHistory(value, student);
    }

    async function saveHistory(student, history) {
      if (typeof root.sbSet !== 'function') throw new Error('grammar history storage unavailable');
      await root.sbSet(historyKey(student), normalizeHistory(history, student));
    }

    async function saveSummary(student, history) {
      if (typeof root.sbSet !== 'function') throw new Error('grammar summary storage unavailable');
      const summary = buildWeakSummary(history, student, runtime.rules);
      await root.sbSet(summaryKey(student), summary);
      removeLocal(summaryPendingKey(student));
      return summary;
    }

    function runSerialized(student, task) {
      const key = studentKey(student);
      const previous = runtime.saveChains.get(key) || Promise.resolve();
      const next = previous.catch(() => {}).then(task);
      let tracked;
      tracked = next.finally(() => {
        if (runtime.saveChains.get(key) === tracked) runtime.saveChains.delete(key);
      });
      runtime.saveChains.set(key, tracked);
      return next;
    }

    function flushPending(studentValue) {
      const student = studentKey(studentValue);
      return runSerialized(student, async () => {
        const pendingSnapshot = readPending(student);
        const records = Object.values(pendingSnapshot.attempts || {}).map(item => normalizeAttempt(item, student)).filter(Boolean);
        const summaryFlag = readJsonLocal(summaryPendingKey(student), null);
        if (!records.length && !summaryFlag) return null;
        let history = await loadHistory(student, true);
        records.forEach(record => { history = upsertAttempt(history, record).history; });
        if (records.length) await saveHistory(student, history);

        const currentPending = readPending(student);
        records.forEach(record => {
          const current = currentPending.attempts[record.attemptId];
          if (!current || String(current.updatedAt || '') <= String(record.updatedAt || '')) {
            delete currentPending.attempts[record.attemptId];
          }
        });
        if (Object.keys(currentPending.attempts).length) writeJsonLocal(pendingKey(student), currentPending);
        else removeLocal(pendingKey(student));

        if (summaryFlag || records.some(record => record.status === STATUS.COMPLETED)) {
          await saveSummary(student, history);
        }
        return history;
      });
    }

    function persistAttempt(attemptValue, needsSummary) {
      const attempt = normalizeAttempt(attemptValue, attemptValue && attemptValue.student);
      if (!attempt) return Promise.resolve(null);
      queuePending(attempt, needsSummary);
      return flushPending(attempt.student).catch(error => {
        console.warn('Unable to save grammar challenge history; queued for retry', error && (error.message || error));
        return null;
      });
    }

    function catalogEntry(challengeId) {
      const catalog = Array.isArray(root.GRAMMAR_CHALLENGE_CATALOG) ? root.GRAMMAR_CHALLENGE_CATALOG : [];
      return catalog.find(item => item && item.id === challengeId) || null;
    }

    function challengeMeta(challengeId) {
      const entry = catalogEntry(challengeId) || {};
      const route = typeof root.getDailyLearningRoute === 'function' ? root.getDailyLearningRoute() : null;
      const routeChallenge = route && route.grammarChallenge && route.grammarChallenge.id === challengeId
        ? route.grammarChallenge
        : null;
      return {
        challengeId: String(challengeId || entry.id || '').trim(),
        challengeTitle: String(entry.title || routeChallenge && routeChallenge.title || '').trim(),
        challengeContentDate: String(entry.date || '').trim(),
        lessonKey: String(entry.lessonKey || routeChallenge && (routeChallenge.reviewLessonKey || routeChallenge.lessonKey) || '').trim(),
        kpIds: uniqueStrings(entry.kpIds || entry.kp_ids),
        questionKpIds: isPlainObject(entry.questionKpIds || entry.question_kp_ids)
          ? clone(entry.questionKpIds || entry.question_kp_ids)
          : {},
        questionWeaknessIds: isPlainObject(entry.questionWeaknessIds || entry.question_weakness_ids)
          ? clone(entry.questionWeaknessIds || entry.question_weakness_ids)
          : {},
        questionPrimaryWeaknessIds: isPlainObject(entry.questionPrimaryWeaknessIds || entry.question_primary_weakness_ids)
          ? clone(entry.questionPrimaryWeaknessIds || entry.question_primary_weakness_ids)
          : {},
        questionDiagnosticTargets: isPlainObject(entry.questionDiagnosticTargets || entry.question_diagnostic_targets)
          ? clone(entry.questionDiagnosticTargets || entry.question_diagnostic_targets)
          : {},
        questionContentHashes: isPlainObject(entry.questionContentHashes || entry.question_content_hashes)
          ? clone(entry.questionContentHashes || entry.question_content_hashes)
          : {}
      };
    }

    function localHistoryEstimate(student) {
      let value = null;
      try { value = root.getMirrorValue?.(historyKey(student)); } catch (_) {}
      let history = normalizeHistory(value, student);
      const pending = readPending(student);
      Object.values(pending.attempts || {}).forEach(record => { history = upsertAttempt(history, record).history; });
      return history;
    }

    async function nextAttemptOfDay(student, day) {
      let history;
      try {
        history = await loadHistory(student, true);
      } catch (_) {
        history = localHistoryEstimate(student);
      }
      const pending = readPending(student);
      Object.values(pending.attempts || {}).forEach(record => { history = upsertAttempt(history, record).history; });
      const count = history.attemptOrder
        .map(id => history.attempts[id])
        .filter(item => item && dateKey(item.startedAt) === day)
        .length;
      return count + 1;
    }

    async function beginAttempt(challengeId) {
      const student = currentStudent();
      const meta = challengeMeta(challengeId);
      const now = new Date();
      if (runtime.activeAttempt && runtime.activeAttempt.status === STATUS.IN_PROGRESS) {
        const interrupted = finalizeAttempt(runtime.activeAttempt, STATUS.INTERRUPTED, now);
        queuePending(interrupted, false);
        writeActive(interrupted);
      }
      const resumable = readActive(student);
      const sameChallenge = resumable
        && resumable.challengeId === meta.challengeId
        && [STATUS.IN_PROGRESS, STATUS.INTERRUPTED].includes(resumable.status)
        && dateKey(resumable.startedAt) === dateKey(now);
      const attempt = sameChallenge
        ? normalizeAttempt({ ...resumable, status: STATUS.IN_PROGRESS, endedAt: '', updatedAt: isoNow(now) }, student)
        : createAttempt(meta, {
          student,
          attemptOfDay: await nextAttemptOfDay(student, dateKey(now)),
          now
        });
      runtime.activeAttempt = attempt;
      runtime.activeMeta = meta;
      runtime.activeStudent = student;
      writeActive(attempt);
      queuePending(attempt, false);
      flushPending(student).catch(() => {});
      return attempt;
    }

    function questionKpIds(question, questionId) {
      const own = uniqueStrings(question && (question.kpIds || question.kp_ids || question.knowledgePointIds));
      if (own.length) return own;
      const mapped = runtime.activeMeta && runtime.activeMeta.questionKpIds
        ? runtime.activeMeta.questionKpIds[questionId]
        : null;
      const mappedIds = uniqueStrings(mapped);
      return mappedIds.length ? mappedIds : uniqueStrings(runtime.activeMeta && runtime.activeMeta.kpIds);
    }

    function questionWeaknessMetadata(question, questionId, kpIds) {
      const mappedWeaknessIds = runtime.activeMeta && runtime.activeMeta.questionWeaknessIds
        ? runtime.activeMeta.questionWeaknessIds[questionId]
        : null;
      const weaknessIds = uniqueStrings(
        question && (question.weaknessIds || question.weakness_ids) || mappedWeaknessIds
      );
      const mappedPrimary = runtime.activeMeta && runtime.activeMeta.questionPrimaryWeaknessIds
        ? runtime.activeMeta.questionPrimaryWeaknessIds[questionId]
        : '';
      const explicitPrimary = String(
        question && (question.primaryWeaknessId || question.primary_weakness_id) || mappedPrimary || ''
      ).trim();
      const mappedTargets = runtime.activeMeta && runtime.activeMeta.questionDiagnosticTargets
        ? runtime.activeMeta.questionDiagnosticTargets[questionId]
        : null;
      const diagnosticTargets = uniqueStrings(
        question && (question.diagnosticTargets || question.diagnostic_targets) || mappedTargets
      );
      const mappedHash = runtime.activeMeta && runtime.activeMeta.questionContentHashes
        ? runtime.activeMeta.questionContentHashes[questionId]
        : '';
      const contentHash = String(question && (question.contentHash || question.content_hash) || mappedHash || '').trim();
      const primaryWeaknessId = explicitPrimary || (weaknessIds.length === 1 ? weaknessIds[0] : '');
      if (!primaryWeaknessId && weaknessIds.length === 0) {
        const automatic = automaticWeaknessMetadata(
          question,
          kpIds,
          runtime.activeAttempt && runtime.activeAttempt.student,
          runtime.activeMeta
        );
        if (automatic && automatic.contentHash) return automatic;
      }
      const primaryParts = primaryWeaknessId.split('.');
      return {
        weaknessIds,
        primaryWeaknessId,
        diagnosticTargets,
        contentHash,
        weaknessOrigin: primaryWeaknessId ? 'explicit' : '',
        weaknessKpId: kpIds.length === 1 ? kpIds[0] : '',
        weaknessSkillKey: primaryParts.length >= 3 ? primaryParts.slice(2).join('.') : '',
        weaknessTitle: String(question && (question.weaknessTitle || question.weakness_title) || '').trim()
      };
    }

    function updateActive(progress) {
      if (!runtime.activeAttempt || runtime.activeAttempt.status !== STATUS.IN_PROGRESS) return null;
      runtime.activeAttempt = updateAttemptProgress(runtime.activeAttempt, progress);
      writeActive(runtime.activeAttempt);
      persistAttempt(runtime.activeAttempt, false);
      return runtime.activeAttempt;
    }

    function finalizeActive(status, score) {
      if (!runtime.activeAttempt) return null;
      const finalized = finalizeAttempt(runtime.activeAttempt, status, undefined, score);
      runtime.activeAttempt = finalized;
      if (status === STATUS.INTERRUPTED) writeActive(finalized);
      else clearActive(finalized.student, finalized.attemptId);
      persistAttempt(finalized, status === STATUS.COMPLETED);
      root.dispatchEvent?.(new CustomEvent('grammar-challenge-history-updated', {
        detail: { student: finalized.student, attemptId: finalized.attemptId, status: finalized.status }
      }));
      return finalized;
    }

    function parseInlineConfig(doc) {
      const node = doc && doc.getElementById('practice-data');
      if (!node) return null;
      try { return JSON.parse(node.textContent || 'null'); } catch (_) { return null; }
    }

    function modelForFrame(win, doc) {
      const inline = parseInlineConfig(doc);
      if (inline && Array.isArray(inline.questions)) {
        let qaState = null;
        try { qaState = win.__LESSON_PREP_QA__?.state?.() || null; } catch (_) {}
        const order = uniqueStrings(qaState && qaState.order).length
          ? uniqueStrings(qaState.order)
          : inline.questions.map(item => String(item.id || '')).filter(Boolean);
        const byId = new Map(inline.questions.map((question, index) => [String(question.id || `q${index + 1}`), question]));
        return { kind: 'inline', questions: inline.questions, order, byId };
      }
      const shell = win && win.GRAMMAR_CHALLENGE_PRACTICE;
      if (shell && Array.isArray(shell.questions)) {
        const order = shell.questions.map((question, index) => String(question.id || `q${index + 1}`));
        return { kind: 'shell', questions: shell.questions, order, byId: new Map(order.map((id, index) => [id, shell.questions[index]])) };
      }
      return null;
    }

    function currentIndex(win, doc, model) {
      try {
        const state = win.__LESSON_PREP_QA__?.state?.();
        if (Number.isFinite(Number(state && state.index))) return Math.max(0, integer(state.index));
      } catch (_) {}
      const candidates = [
        doc.getElementById('questionPosition')?.textContent,
        doc.getElementById('progressText')?.textContent,
        doc.getElementById('questionCount')?.textContent
      ];
      for (const text of candidates) {
        const match = String(text || '').match(/(?:第\s*)?(\d+)\s*(?:\/|题)/);
        if (match) return Math.max(0, Number(match[1]) - 1);
      }
      return 0;
    }

    function currentQuestionId(win, doc, model) {
      try {
        const state = win.__LESSON_PREP_QA__?.state?.();
        if (state && state.id) return String(state.id);
      } catch (_) {}
      const index = currentIndex(win, doc, model);
      return model.order[index] || model.questions[index] && String(model.questions[index].id || '') || `${runtime.activeAttempt.challengeId}:q${index + 1}`;
    }

    function readClassifyAssignments(doc, question) {
      const result = {};
      doc.querySelectorAll('.classify-target[data-target]').forEach(target => {
        const label = String(target.dataset.target || target.firstChild && target.firstChild.textContent || '').trim();
        const values = String(target.querySelector('span')?.textContent || '')
          .split(/\s*[·；,]\s*/)
          .map(item => item.trim())
          .filter(item => item && item !== '点击放入');
        values.forEach(value => { result[value] = label; });
      });
      if (!Object.keys(result).length && question && Array.isArray(question.options)) {
        question.options.forEach(option => {
          const target = [...doc.querySelectorAll('.classify-target')]
            .find(node => String(node.textContent || '').includes(option));
          if (target) result[option] = String(target.dataset.target || '').trim();
        });
      }
      return result;
    }

    function readInlineResponse(win, doc, question) {
      let selectedIndices = [];
      try {
        const state = win.__LESSON_PREP_QA__?.state?.();
        if (Array.isArray(state && state.selected)) selectedIndices = state.selected.map(Number).filter(Number.isFinite);
      } catch (_) {}
      if (!selectedIndices.length) {
        selectedIndices = [...doc.querySelectorAll('.option[aria-pressed="true"], .option.selected')]
          .map(node => Number(node.dataset.optionIndex))
          .filter(Number.isFinite);
      }
      const assignments = question && question.type === 'classify'
        ? readClassifyAssignments(doc, question)
        : {};
      const answered = question && question.type === 'classify'
        ? (question.options || []).every(option => assignments[option])
        : selectedIndices.length > 0;
      return { answered, selectedIndices, assignments };
    }

    function readShellResponse(doc, question) {
      if (!question) return { answered: false, answer: [] };
      if (question.type === 'choice') {
        const answer = [...doc.querySelectorAll('.option.selected')].map(node => {
          const spans = node.querySelectorAll('span');
          return String(spans.length ? spans[spans.length - 1].textContent : node.textContent || '').trim();
        });
        return { answered: answer.length > 0, answer };
      }
      if (question.type === 'order') {
        const answer = [...doc.querySelectorAll('.answer-lane .word-token')].map(node => String(node.textContent || '').trim());
        return { answered: answer.length > 0, answer };
      }
      if (question.type === 'text') {
        const answer = [...doc.querySelectorAll('.answer-input')].map(node => String(node.value || ''));
        const answered = (question.fields || []).every((field, index) => normalizeText(answer[index]));
        return { answered, answer };
      }
      return { answered: false, answer: [] };
    }

    function answerIsVisible(doc) {
      if (!doc) return false;
      if (doc.querySelector('.wrong-option') && doc.querySelector('.correct-option')) return true;
      return /正确答案|答案：/.test(String(doc.getElementById('feedback')?.textContent || ''));
    }

    function completionScore(doc) {
      const score = Number.parseInt(String(doc.getElementById('scoreText')?.textContent || ''), 10);
      if (Number.isFinite(score)) return clamp(score, 0, 100);
      const text = [
        doc.getElementById('completionText')?.textContent,
        doc.getElementById('correctMeta')?.textContent,
        doc.getElementById('accuracyMeta')?.textContent
      ].join(' ');
      const percent = text.match(/(\d+)\s*%/);
      if (percent) return clamp(Number(percent[1]), 0, 100);
      const count = text.match(/(?:正确|答对|首次正确)\s*(\d+)\s*\/\s*(\d+)/);
      if (count && Number(count[2]) > 0) return Math.round((Number(count[1]) / Number(count[2])) * 100);
      return null;
    }

    function documentComplete(doc) {
      if (!doc) return false;
      if (doc.querySelector('[data-complete="true"]')) return true;
      const result = doc.getElementById('resultScreen');
      return Boolean(result && !result.hidden);
    }

    function attachFrame(frame) {
      runtime.frameCleanup?.();
      runtime.frameCleanup = null;
      if (!runtime.activeAttempt || !frame) return;
      let win;
      let doc;
      try {
        win = frame.contentWindow;
        doc = frame.contentDocument;
      } catch (_) {
        return;
      }
      if (!win || !doc || !doc.documentElement) return;
      const model = modelForFrame(win, doc);
      if (!model) return;
      runtime.activeAttempt = updateAttemptProgress(runtime.activeAttempt, {
        totalQuestions: model.order.length || model.questions.length
      });
      persistAttempt(runtime.activeAttempt, false);

      const firstResponses = new Map(runtime.activeAttempt.questions.map(item => [item.questionId, item.firstTryCorrect]));
      const viewedAnswers = new Set(runtime.activeAttempt.questions.filter(item => item.viewedAnswer).map(item => item.questionId));
      let completedHandled = runtime.activeAttempt.status === STATUS.COMPLETED;
      let timer = null;

      function captureCurrent() {
        if (!runtime.activeAttempt || runtime.activeAttempt.status !== STATUS.IN_PROGRESS) return;
        const id = currentQuestionId(win, doc, model);
        const index = Math.max(0, model.order.indexOf(id) >= 0 ? model.order.indexOf(id) : currentIndex(win, doc, model));
        const question = model.byId.get(id) || model.questions[index] || {};
        const response = model.kind === 'inline'
          ? readInlineResponse(win, doc, question)
          : readShellResponse(doc, question);
        if (!response.answered) return;
        const correct = model.kind === 'inline'
          ? inlineQuestionCorrect(question, response)
          : shellQuestionCorrect(question, response);
        if (!firstResponses.has(id)) firstResponses.set(id, correct);
        const kpIds = questionKpIds(question, id);
        const weaknessMetadata = questionWeaknessMetadata(question, id, kpIds);
        updateActive({
          totalQuestions: model.order.length,
          currentQuestionId: id,
          currentQuestionIndex: index,
          questions: [{
            questionId: id,
            kpIds,
            ...weaknessMetadata,
            answered: true,
            correct,
            firstTryCorrect: firstResponses.get(id),
            viewedAnswer: viewedAnswers.has(id) || (!correct && answerIsVisible(doc)),
            answeredAt: isoNow(),
            updatedAt: isoNow()
          }]
        });
      }

      function scheduleCapture() {
        root.clearTimeout?.(timer);
        timer = root.setTimeout?.(() => {
          captureCurrent();
          checkComplete();
        }, 0);
      }

      function ensureAllQuestions() {
        if (!runtime.activeAttempt) return;
        const existing = new Map(runtime.activeAttempt.questions.map(item => [item.questionId, item]));
        const additions = model.order.map((id, index) => {
          const current = existing.get(id);
          if (current) {
            return {
              ...current,
              viewedAnswer: current.viewedAnswer || viewedAnswers.has(id) || (current.answered && !current.correct),
              updatedAt: isoNow()
            };
          }
          const question = model.byId.get(id) || model.questions[index] || {};
          const kpIds = questionKpIds(question, id);
          return {
            questionId: id,
            kpIds,
            ...questionWeaknessMetadata(question, id, kpIds),
            answered: false,
            correct: false,
            firstTryCorrect: false,
            viewedAnswer: viewedAnswers.has(id),
            answeredAt: '',
            updatedAt: isoNow()
          };
        });
        runtime.activeAttempt = updateAttemptProgress(runtime.activeAttempt, {
          totalQuestions: model.order.length,
          questions: additions
        });
      }

      function checkComplete() {
        if (completedHandled || !documentComplete(doc)) return;
        completedHandled = true;
        // Completion is terminal for this frame. Stop the completion
        // observer before persisting the final record so modal mutations cannot
        // keep scheduling redundant captures and writes after the result exists.
        observer?.disconnect();
        root.clearTimeout?.(timer);
        timer = null;
        captureCurrent();
        ensureAllQuestions();
        finalizeActive(STATUS.COMPLETED, completionScore(doc));
      }

      function clickHandler(event) {
        const target = event.target && event.target.closest ? event.target.closest('button, [role="button"]') : null;
        if (!target) return;
        const id = currentQuestionId(win, doc, model);
        if (target.id === 'showAnswerButton' || /显示答案|查看答案/.test(String(target.textContent || ''))) {
          viewedAnswers.add(id);
        }
        if (['nextButton', 'submitButton', 'continueButton', 'previousButton', 'backToQuestionButton'].includes(target.id)) {
          captureCurrent();
        }
        scheduleCapture();
      }

      function inputHandler() {
        scheduleCapture();
      }

      doc.addEventListener('click', clickHandler, true);
      doc.addEventListener('input', inputHandler, true);
      doc.addEventListener('change', inputHandler, true);
      const observer = typeof root.MutationObserver === 'function'
        ? new root.MutationObserver(() => {
          scheduleCapture();
          checkComplete();
        })
        : null;
      const completionState = doc.querySelector('[data-complete]');
      const resultScreen = doc.getElementById('resultScreen');
      if (observer && completionState) observer.observe(completionState, {
        attributes: true,
        attributeFilter: ['data-complete', 'open']
      });
      if (observer && resultScreen) observer.observe(resultScreen, {
        attributes: true,
        attributeFilter: ['hidden']
      });
      scheduleCapture();
      checkComplete();

      runtime.frameCleanup = () => {
        root.clearTimeout?.(timer);
        observer?.disconnect();
        doc.removeEventListener('click', clickHandler, true);
        doc.removeEventListener('input', inputHandler, true);
        doc.removeEventListener('change', inputHandler, true);
      };
    }

    function installFrameWatcher() {
      const frame = document.getElementById('grammarChallengeFrame');
      if (!frame || runtime.frameLoadInstalled) return;
      runtime.frameLoadInstalled = true;
      frame.addEventListener('load', () => {
        root.setTimeout?.(() => attachFrame(frame), 0);
        root.setTimeout?.(() => attachFrame(frame), 120);
      });
    }

    function installFeatureHooks() {
      installFrameWatcher();
      if (typeof root.openGrammarChallenge === 'function' && !root.openGrammarChallenge.__grammarRecordsWrapped) {
        runtime.rawOpen = root.openGrammarChallenge;
        const wrappedOpen = async function grammarRecordsOpen(challengeId) {
          if (teacherMode()) return runtime.rawOpen.apply(this, arguments);
          await flushPending('sister').catch(() => {});
          await flushPending('brother').catch(() => {});
          await beginAttempt(challengeId);
          installFrameWatcher();
          return runtime.rawOpen.apply(this, arguments);
        };
        wrappedOpen.__grammarRecordsWrapped = true;
        root.openGrammarChallenge = wrappedOpen;
      }
      if (typeof root.closeGrammarChallenge === 'function' && !root.closeGrammarChallenge.__grammarRecordsWrapped) {
        runtime.rawClose = root.closeGrammarChallenge;
        const wrappedClose = function grammarRecordsClose() {
          if (runtime.activeAttempt && runtime.activeAttempt.status === STATUS.IN_PROGRESS) {
            finalizeActive(STATUS.EXITED, null);
          }
          runtime.frameCleanup?.();
          runtime.frameCleanup = null;
          return runtime.rawClose.apply(this, arguments);
        };
        wrappedClose.__grammarRecordsWrapped = true;
        root.closeGrammarChallenge = wrappedClose;
      }
    }

    function wrapFeatureLoader() {
      const original = root.loadFeatureGroup;
      if (typeof original !== 'function' || original.__grammarRecordsWrapped) return;
      const wrapped = async function grammarRecordsFeatureLoader(group) {
        const result = await original.apply(this, arguments);
        if (group === 'grammarChallenge') installFeatureHooks();
        return result;
      };
      wrapped.__grammarRecordsWrapped = true;
      root.loadFeatureGroup = wrapped;
    }

    root.addEventListener?.('pagehide', () => {
      if (runtime.activeAttempt && runtime.activeAttempt.status === STATUS.IN_PROGRESS) {
        const interrupted = finalizeAttempt(runtime.activeAttempt, STATUS.INTERRUPTED);
        runtime.activeAttempt = interrupted;
        writeActive(interrupted);
        queuePending(interrupted, false);
      }
    });
    root.addEventListener?.('online', () => {
      flushPending('sister').catch(() => {});
      flushPending('brother').catch(() => {});
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      flushPending('sister').catch(() => {});
      flushPending('brother').catch(() => {});
    });

    wrapFeatureLoader();
    installFeatureHooks();
    [0, 100, 400, 1000, 2200].forEach(delay => root.setTimeout?.(() => {
      wrapFeatureLoader();
      installFeatureHooks();
    }, delay));
    flushPending('sister').catch(() => {});
    flushPending('brother').catch(() => {});

    root.getGrammarChallengeHistoryKey = historyKey;
    root.getGrammarChallengeWeakSummaryKey = summaryKey;
    root.loadGrammarChallengeHistory = student => loadHistory(studentKey(student), true);
    root.loadGrammarChallengeWeakSummary = async student => {
      const key = summaryKey(student);
      if (typeof root.sbGetRemote === 'function') {
        try {
          const value = await root.sbGetRemote(key);
          if (value) return value;
        } catch (_) {}
      }
      if (typeof root.sbGet === 'function') return root.sbGet(key);
      return null;
    };
    root.getGrammarChallengeWeakRules = () => ({ ...runtime.rules });
    root.setGrammarChallengeWeakRules = async rules => {
      runtime.rules = normalizeRules(rules);
      root.GRAMMAR_CHALLENGE_WEAK_RULES = { ...runtime.rules };
      const students = ['sister', 'brother'];
      return Promise.all(students.map(async student => {
        const history = await loadHistory(student, true);
        return saveSummary(student, history);
      }));
    };
    root.rebuildGrammarChallengeWeakSummary = async student => {
      const key = studentKey(student);
      const history = await loadHistory(key, true);
      return saveSummary(key, history);
    };
    root.flushGrammarChallengeHistory = student => student
      ? flushPending(studentKey(student))
      : Promise.all([flushPending('sister'), flushPending('brother')]);
  }

  return Object.freeze({
    VERSION,
    HISTORY_KEY_PREFIX,
    SUMMARY_KEY_PREFIX,
    PENDING_KEY_PREFIX,
    SUMMARY_PENDING_KEY_PREFIX,
    ACTIVE_KEY_PREFIX,
    STATUS,
    DEFAULT_RULES,
    studentKey,
    historyKey,
    summaryKey,
    pendingKey,
    summaryPendingKey,
    activeKey,
    dateKey,
    normalizeQuestionResult,
    normalizeAttempt,
    normalizeHistory,
    mergeQuestionResults,
    mergeAttempts,
    upsertAttempt,
    createAttempt,
    updateAttemptProgress,
    finalizeAttempt,
    completedAttempts,
    buildWeaknessEvidence,
    normalizeRules,
    calculateKpStats,
    buildWeakSummary,
    sha256Hex,
    questionContentHash,
    automaticWeaknessMetadata,
    inlineQuestionCorrect,
    shellQuestionCorrect,
    install
  });
});
