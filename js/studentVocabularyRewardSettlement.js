(function studentVocabularyRewardSettlementModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.StudentVocabularyRewardSettlement = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStudentVocabularyRewardSettlementModule() {
  'use strict';

  const SOURCE = 'vocabularyChallenge';
  const MAX_REWARD = 10;
  const MARKER_VERSION = 2;
  const COMPLETION_VERSION = 1;
  const MARKER_STATUSES = new Set(['pending', 'settled', 'blocked']);

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function clampInteger(value, min, max) {
    const number = Math.round(Number(value) || 0);
    return Math.max(min, Math.min(max, number));
  }

  function normalizeUser(value) {
    return value === 'brother' ? 'brother' : value === 'sister' ? 'sister' : '';
  }

  function localDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1])
      && date.getMonth() === Number(match[2]) - 1
      && date.getDate() === Number(match[3]);
  }

  function rewardKey(user) {
    const student = normalizeUser(user);
    return student ? `student_reward_v1_${student}` : '';
  }

  function adventureKey(user) {
    const student = normalizeUser(user);
    return student ? `vocab_adventure_v1_${student}` : '';
  }

  function normalizeMarker(value) {
    if (!plainObject(value) || !localDate(value.date)) return null;
    const target = clampInteger(value.target, 0, MAX_REWARD);
    return {
      version: MARKER_VERSION,
      source: SOURCE,
      date: value.date,
      target,
      status: MARKER_STATUSES.has(value.status) ? value.status : 'pending',
      awarded: clampInteger(value.awarded, 0, MAX_REWARD),
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
      settledAt: typeof value.settledAt === 'string' ? value.settledAt : '',
      blockedReason: typeof value.blockedReason === 'string' ? value.blockedReason : ''
    };
  }

  function markerFromState(value) {
    const state = plainObject(value) ? value : {};
    const daily = plainObject(state.challengeDaily) ? state.challengeDaily : {};
    return normalizeMarker(daily.rewardSettlement);
  }

  function completionTransactionId(user, date, attemptIndex, suffix) {
    const student = normalizeUser(user) || 'student';
    const attempt = Math.max(0, Math.round(Number(attemptIndex) || 0));
    return `vocabularyChallenge:${student}:${date}:${attempt ? `attempt-${attempt}` : String(suffix || 'legacy-perfect')}`;
  }

  function normalizeCompletion(value, user, fallbackDate) {
    if (!plainObject(value)) return null;
    const date = localDate(value.date) ? value.date : fallbackDate;
    if (!localDate(date)) return null;
    const score = clampInteger(value.score, 0, 100);
    const correctCount = clampInteger(
      value.correctCount == null ? score / 10 : value.correctCount,
      0,
      MAX_REWARD
    );
    const attemptIndex = Math.max(0, Math.round(Number(value.attemptIndex) || 0));
    const student = normalizeUser(value.user) || normalizeUser(user);
    return {
      version: COMPLETION_VERSION,
      user: student,
      date,
      attemptIndex,
      correctCount,
      score: Math.max(score, correctCount * 10),
      completedAt: typeof value.completedAt === 'string' ? value.completedAt : '',
      transactionId: String(value.transactionId || completionTransactionId(
        student,
        date,
        attemptIndex,
        value.legacy === true ? 'legacy-perfect' : 'completion'
      )),
      legacy: value.legacy === true
    };
  }

  function completedChallengeFacts(value, user) {
    const state = plainObject(value) ? value : {};
    const session = plainObject(state.challengeSession) ? state.challengeSession : null;
    if (!session || session.status !== 'completed' || !localDate(session.date)) return null;
    return normalizeCompletion({
      date: session.date,
      user,
      attemptIndex: session.attemptIndex,
      correctCount: clampInteger(session.correctCount, 0, MAX_REWARD),
      score: clampInteger(session.correctCount, 0, MAX_REWARD) * 10,
      completedAt: typeof session.completedAt === 'string' ? session.completedAt : ''
    }, user, session.date);
  }

  function completionFacts(value, user) {
    const state = plainObject(value) ? value : {};
    const daily = plainObject(state.challengeDaily) ? state.challengeDaily : {};
    const date = localDate(daily.date) ? daily.date : '';
    const values = Array.isArray(daily.completions) ? daily.completions : [];
    const facts = values
      .map(item => normalizeCompletion(item, user, date))
      .filter(Boolean);
    const current = completedChallengeFacts(state, user);
    if (current) facts.push(current);
    if (!facts.length && date && clampInteger(daily.attempts, 0, 2) > 0
        && clampInteger(daily.bestScore, 0, 100) === 100) {
      facts.push(normalizeCompletion({
        user,
        date,
        attemptIndex: 0,
        correctCount: MAX_REWARD,
        score: 100,
        transactionId: completionTransactionId(user, date, 0, 'legacy-perfect'),
        legacy: true
      }, user, date));
    }
    const unique = new Map();
    facts.forEach(fact => {
      const existing = unique.get(fact.transactionId);
      if (!existing || fact.score > existing.score) unique.set(fact.transactionId, fact);
    });
    return [...unique.values()].sort((left, right) => (
      left.attemptIndex - right.attemptIndex
      || String(left.completedAt).localeCompare(String(right.completedAt))
    ));
  }

  function prepareAdventureStateForVocabularyChallengeSave(nextValue, previousValue, options) {
    const settings = plainObject(options) ? options : {};
    const next = clone(plainObject(nextValue) ? nextValue : {});
    const previousMarker = markerFromState(previousValue);
    const nextMarker = markerFromState(next);
    const nextDaily = plainObject(next.challengeDaily) ? next.challengeDaily : {};
    const nextDate = localDate(nextDaily.date) ? nextDaily.date : '';
    const user = normalizeUser(settings.user);
    const challenge = completedChallengeFacts(next, user);
    const previousCompletions = completionFacts(previousValue, user).filter(item => !item.legacy);
    const nextCompletions = completionFacts(next, user).filter(item => !item.legacy);
    const completions = new Map();
    [...previousCompletions, ...nextCompletions, ...(challenge ? [challenge] : [])].forEach(item => {
      completions.set(item.transactionId, item);
    });
    // A settled/blocked marker only describes its own reward day. Carrying it
    // into a new challenge day makes the new completion look settled already
    // and can send reconciliation back to yesterday. Same-day markers are
    // still preserved so a second attempt cannot duplicate or lose a reward.
    let marker = nextMarker
      || (previousMarker && previousMarker.date === nextDate ? previousMarker : null);

    if (challenge) {
      const rewardApi = rewardApiFrom(settings);
      const previousTarget = marker && marker.date === challenge.date ? marker.target : 0;
      const target = Math.max(
        previousTarget,
        challengeRewardTarget(normalizeUser(settings.user), challenge.correctCount, rewardApi)
      );
      const alreadySettled = marker
        && marker.date === challenge.date
        && marker.status === 'settled'
        && marker.awarded >= target;
      const stillBlocked = marker
        && marker.date === challenge.date
        && marker.status === 'blocked'
        && marker.target >= target;
      marker = {
        version: MARKER_VERSION,
        source: SOURCE,
        date: challenge.date,
        target,
        status: alreadySettled ? 'settled' : stillBlocked ? 'blocked' : 'pending',
        awarded: alreadySettled || stillBlocked ? marker.awarded : 0,
        updatedAt: String(settings.at || challenge.completedAt || new Date().toISOString()),
        settledAt: alreadySettled ? marker.settledAt : '',
        blockedReason: stillBlocked ? marker.blockedReason : ''
      };
    }

    if (marker) {
      next.challengeDaily = plainObject(next.challengeDaily) ? next.challengeDaily : {};
      next.challengeDaily.rewardSettlement = marker;
    }
    if (completions.size) {
      next.challengeDaily = plainObject(next.challengeDaily) ? next.challengeDaily : {};
      next.challengeDaily.completions = [...completions.values()].slice(-4);
    }
    return next;
  }

  function rewardApiFrom(settings) {
    return settings.rewardApi
      || (typeof globalThis !== 'undefined' ? globalThis.StudentRewards : null)
      || null;
  }

  function challengeRewardTarget(user, correctCount, rewardApi) {
    const score = clampInteger(correctCount, 0, MAX_REWARD) * 10;
    if (rewardApi && typeof rewardApi.challengeRewardAmount === 'function') {
      return rewardApi.challengeRewardAmount(user, score, MAX_REWARD);
    }
    const fullScore = user === 'brother' ? 80 : 100;
    return clampInteger((score / fullScore) * MAX_REWARD, 0, MAX_REWARD);
  }

  function dayForAudit(rewardApi, record, date) {
    if (rewardApi && typeof rewardApi.normalizeDay === 'function') {
      return rewardApi.normalizeDay(record && record.daily && record.daily[date]);
    }
    const raw = plainObject(record && record.daily && record.daily[date])
      ? record.daily[date]
      : {};
    const sources = plainObject(raw.sources) ? raw.sources : {};
    const overrides = plainObject(raw.teacherSourceOverrides) ? raw.teacherSourceOverrides : {};
    return {
      ...raw,
      sources: { ...sources, [SOURCE]: clampInteger(sources[SOURCE], 0, MAX_REWARD) },
      teacherSourceOverrides: { ...overrides }
    };
  }

  function challengeTarget(value, user, rewardApi) {
    const marker = markerFromState(value);
    const completions = completionFacts(value, user);
    const state = plainObject(value) ? value : {};
    const daily = plainObject(state.challengeDaily) ? state.challengeDaily : {};
    const dailyDate = localDate(daily.date) ? daily.date : '';
    const currentCompletions = dailyDate
      ? completions.filter(item => item.date === dailyDate)
      : [];
    const candidates = currentCompletions.length ? currentCompletions : completions;
    const completed = candidates.reduce((best, item) => {
      if (!best) return item;
      const itemTarget = challengeRewardTarget(user, item.correctCount, rewardApi);
      const bestTarget = challengeRewardTarget(user, best.correctCount, rewardApi);
      return itemTarget > bestTarget || (itemTarget === bestTarget && item.score > best.score) ? item : best;
    }, null);
    const completedTarget = completed ? challengeRewardTarget(user, completed.correctCount, rewardApi) : 0;
    if (completed && marker && marker.date !== completed.date) {
      return {
        date: completed.date,
        target: completedTarget,
        marker,
        completed,
        completions
      };
    }
    if (marker) {
      return {
        date: marker.date,
        target: completed && marker.date === completed.date
          ? Math.max(marker.target, completedTarget)
          : marker.target,
        marker,
        completed,
        completions
      };
    }
    if (completed) return { date: completed.date, target: completedTarget, marker: null, completed, completions };
    return { date: '', target: 0, marker: null, completed: null, completions: [] };
  }

  function auditVocabularyChallengeReward(options) {
    const settings = plainObject(options) ? options : {};
    const user = normalizeUser(settings.user);
    const rewardApi = rewardApiFrom(settings);
    const adventureState = plainObject(settings.adventureState) ? settings.adventureState : {};
    const rewardRecord = rewardApi && typeof rewardApi.normalizeRewardRecord === 'function'
      ? rewardApi.normalizeRewardRecord(settings.rewardRecord)
      : (plainObject(settings.rewardRecord) ? clone(settings.rewardRecord) : { daily: {}, transactions: [], totalCoins: 0 });
    const targetInfo = challengeTarget(adventureState, user, rewardApi);
    const daily = plainObject(adventureState.challengeDaily) ? adventureState.challengeDaily : {};
    const date = targetInfo.date || (localDate(daily.date) ? daily.date : '');
    const day = date ? dayForAudit(rewardApi, rewardRecord, date) : dayForAudit(rewardApi, rewardRecord, '');
    const currentSource = clampInteger(day.sources && day.sources[SOURCE], 0, MAX_REWARD);
    const claim = day.claims && plainObject(day.claims[SOURCE]) ? day.claims[SOURCE] : {};
    const claimStatus = typeof claim.status === 'string' ? claim.status : (currentSource > 0 ? 'claimed' : 'idle');
    const claimAmount = clampInteger(claim.amount, 0, MAX_REWARD);
    const hasOverride = Object.prototype.hasOwnProperty.call(day.teacherSourceOverrides || {}, SOURCE);
    const overrideValue = hasOverride ? clampInteger(day.teacherSourceOverrides[SOURCE], 0, MAX_REWARD) : null;
    const transactions = Array.isArray(rewardRecord.transactions)
      ? rewardRecord.transactions.filter(transaction => transaction && transaction.date === date && transaction.source === SOURCE)
      : [];
    const completed = targetInfo.completed;
    const perfectRepairEligible = !!(user && completed
      && targetInfo.target === MAX_REWARD
      && claimStatus !== 'claimed'
      && claimAmount < MAX_REWARD
      && !hasOverride);
    const repairToken = user && date
      ? [user, date, completed && completed.transactionId || '', completed && completed.correctCount || 0,
        targetInfo.target, currentSource, claimStatus, claimAmount,
        hasOverride ? `override:${overrideValue}` : 'no-override'].join('|')
      : '';

    return {
      user,
      date,
      source: SOURCE,
      target: targetInfo.target,
      formalTargetAvailable: !!(targetInfo.marker || completed),
      challengeCompleted: !!completed,
      challengeStatus: completed ? 'completed' : '',
      correctCount: completed && completed.correctCount || 0,
      completionTransactionId: completed && completed.transactionId || '',
      completions: clone(targetInfo.completions),
      dailyAttempts: clampInteger(daily.attempts, 0, 2),
      dailyBestScore: clampInteger(daily.bestScore, 0, 100),
      historyMismatch: !completed && clampInteger(daily.bestScore, 0, 100) > 0
        && currentSource < challengeRewardTarget(
          user,
          clampInteger(daily.bestScore, 0, 100) / 10,
          rewardApi
        ),
      marker: targetInfo.marker,
      currentSource,
      claimStatus,
      claimAmount,
      teacherOverride: hasOverride,
      teacherOverrideValue: overrideValue,
      totalCoins: Math.max(0, Math.round(Number(rewardRecord.totalCoins) || 0)),
      dayCoins: Math.max(0, Math.round(Number(day.coins) || 0)),
      transactions: clone(transactions),
      needsReward: !!(user && date && targetInfo.target > claimAmount && claimStatus !== 'claimed' && !hasOverride),
      perfectRepairEligible,
      repairToken,
      valid: !!(user && date && (targetInfo.marker || completed)
        && targetInfo.target >= 0 && targetInfo.target <= MAX_REWARD)
    };
  }

  function withMarker(value, marker) {
    const next = clone(plainObject(value) ? value : {});
    next.challengeDaily = plainObject(next.challengeDaily) ? next.challengeDaily : {};
    next.challengeDaily.rewardSettlement = normalizeMarker(marker);
    return next;
  }

  function dependency(settings, name, fallback) {
    if (typeof settings[name] === 'function') return settings[name];
    if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') return globalThis[name].bind(globalThis);
    return fallback;
  }

  async function persistMarker(settings, user, adventureState, marker) {
    const setValue = dependency(settings, 'setValue', null);
    if (!setValue) return { saved: false, state: withMarker(adventureState, marker) };
    const nextState = withMarker(adventureState, marker);
    try {
      await setValue(adventureKey(user), nextState);
      return { saved: true, state: nextState };
    } catch (error) {
      settings.reportError?.(error);
      return { saved: false, state: nextState, error };
    }
  }

  async function settleVocabularyChallengeReward(options) {
    const settings = plainObject(options) ? options : {};
    const user = normalizeUser(settings.user);
    const getValue = dependency(settings, 'getValue', null);
    const setValue = dependency(settings, 'setValue', null);
    const rewardApi = rewardApiFrom(settings);
    if (!user || !getValue || !setValue || !rewardApi
      || typeof rewardApi.markSourceClaim !== 'function'
      || typeof rewardApi.normalizeRewardRecord !== 'function') {
      return { ok: false, code: 'SETTLEMENT_DEPENDENCIES_UNAVAILABLE', user };
    }

    let adventureState = plainObject(settings.adventureState) ? clone(settings.adventureState) : await getValue(adventureKey(user));
    const rewardRecord = await getValue(rewardKey(user));
    const audit = auditVocabularyChallengeReward({ user, adventureState, rewardRecord, rewardApi });
    if (!audit.valid || !audit.date) return { ok: true, changed: false, skipped: true, code: 'NO_COMPLETED_CHALLENGE', audit };
    if (settings.requireDate && audit.date !== settings.requireDate) {
      return { ok: true, changed: false, skipped: true, code: 'DATE_MISMATCH', audit };
    }
    if (settings.perfectOnly && !audit.perfectRepairEligible) {
      return { ok: true, changed: false, skipped: true, code: 'PERFECT_REPAIR_NOT_ELIGIBLE', audit };
    }

    const at = String(settings.at || new Date().toISOString());
    if (audit.teacherOverride) {
      const blockedMarker = {
        version: MARKER_VERSION, source: SOURCE, date: audit.date, target: audit.target,
        status: 'blocked', awarded: audit.currentSource, updatedAt: at, settledAt: '', blockedReason: 'teacher-override'
      };
      const markerResult = await persistMarker(settings, user, adventureState, blockedMarker);
      return {
        ok: true, changed: false, overridden: true, markerSaved: markerResult.saved,
        marker: blockedMarker, adventureState: markerResult.state, audit
      };
    }

    const applied = rewardApi.markSourceClaim(rewardRecord, {
      date: audit.date,
      source: SOURCE,
      amount: audit.target,
      mode: 'max',
      at,
      transactionId: audit.completionTransactionId
    });
    if (applied.changed) {
      try {
        await setValue(rewardKey(user), applied.record);
      } catch (error) {
        settings.reportError?.(error);
        return {
          ok: false, changed: false, pending: true, code: 'CLAIM_SAVE_FAILED',
          marker: markerFromState(adventureState), adventureState, audit, error
        };
      }
    }

    const settledDay = dayForAudit(rewardApi, applied.record, audit.date);
    const settledClaim = settledDay.claims && settledDay.claims[SOURCE] || {};
    const awarded = clampInteger(settledDay.sources && settledDay.sources[SOURCE], 0, MAX_REWARD);
    const settledMarker = {
      version: MARKER_VERSION, source: SOURCE, date: audit.date, target: audit.target,
      status: 'settled', awarded, updatedAt: at, settledAt: at, blockedReason: ''
    };
    const markerResult = await persistMarker(settings, user, adventureState, settledMarker);
    adventureState = markerResult.state;
    return {
      ok: true,
      changed: applied.changed,
      delta: applied.delta || 0,
      projectDelta: applied.projectDelta || 0,
      markerSaved: markerResult.saved,
      marker: settledMarker,
      adventureState,
      record: applied.record,
      claim: clone(settledClaim),
      audit: auditVocabularyChallengeReward({ user, adventureState, rewardRecord: applied.record, rewardApi })
    };
  }

  function shouldSettleVocabularyChallengeReward(value) {
    const marker = markerFromState(value);
    return !!(marker && marker.status === 'pending') || completionFacts(value, '').length > 0;
  }

  async function diagnoseVocabularyChallengeReward(options) {
    const settings = plainObject(options) ? options : { user: options };
    const user = normalizeUser(settings.user);
    const getValue = dependency(settings, 'getValue', null);
    const rewardApi = rewardApiFrom(settings);
    if (!user || !getValue || !rewardApi) return { ok: false, code: 'DIAGNOSTIC_DEPENDENCIES_UNAVAILABLE', user };
    const [adventureState, rewardRecord] = await Promise.all([getValue(adventureKey(user)), getValue(rewardKey(user))]);
    return { ok: true, readOnly: true, audit: auditVocabularyChallengeReward({ user, adventureState, rewardRecord, rewardApi }) };
  }

  async function repairPerfectVocabularyChallengeReward(options) {
    const settings = plainObject(options) ? options : {};
    const diagnostic = await diagnoseVocabularyChallengeReward(settings);
    if (!diagnostic.ok) return diagnostic;
    if (!settings.repairToken || settings.repairToken !== diagnostic.audit.repairToken) {
      return { ok: false, code: 'AUDIT_TOKEN_REQUIRED', audit: diagnostic.audit };
    }
    if (!diagnostic.audit.perfectRepairEligible) {
      return { ok: false, code: 'PERFECT_REPAIR_NOT_ELIGIBLE', audit: diagnostic.audit };
    }
    return settleVocabularyChallengeReward({ ...settings, perfectOnly: true });
  }

  function install(root) {
    if (!root || root.__studentVocabularyRewardSettlementInstalled) return;
    root.__studentVocabularyRewardSettlementInstalled = true;
    const browserOptions = extra => ({
      ...(plainObject(extra) ? extra : {}),
      rewardApi: root.StudentRewards,
      getValue: key => typeof root.sbGetRemote === 'function' ? root.sbGetRemote(key) : root.sbGet(key),
      setValue: (key, value) => root.sbSet(key, value),
      reportError: plainObject(extra) && extra.silent === true
        ? error => console.warn('Background vocabulary reward settlement pending retry', error)
        : error => root.showStorageError?.(error)
    });
    root.settleVocabularyChallengeReward = options => settleVocabularyChallengeReward(browserOptions(options));
    root.diagnoseVocabularyChallengeReward = async user => {
      const result = await diagnoseVocabularyChallengeReward(browserOptions({ user }));
      console.info('Vocabulary challenge reward audit', result);
      return result;
    };
    root.repairPerfectVocabularyChallengeReward = async (user, repairToken) => {
      const result = await repairPerfectVocabularyChallengeReward(browserOptions({ user, repairToken }));
      console.info('Vocabulary challenge reward repair', result);
      return result;
    };

    const originalHost = root.document?.getElementById('vocabularyAdventureChallengeBody');
    const host = originalHost && !originalHost.dataset.formalRewardSettlementHost ? originalHost.cloneNode(true) : originalHost;
    if (originalHost && host !== originalHost) {
      host.dataset.formalRewardSettlementHost = 'true';
      originalHost.replaceWith(host);
    }

    async function renderSavedRewardState(summary) {
      if (!summary || summary.dataset.formalRewardRendering === 'true') return;
      summary.dataset.formalRewardRendering = 'true';
      summary.dataset.rewardHandled = 'formal-state';
      let reward = summary.querySelector('.vocabulary-adventure-earned-coins');
      if (!reward) {
        reward = root.document.createElement('p');
        reward.className = 'vocabulary-adventure-earned-coins';
        summary.querySelector('h2')?.insertAdjacentElement('afterend', reward);
      }
      reward.textContent = '正在保存可领取奖励…';
      try {
        const user = normalizeUser(root.currentUser || (typeof currentUser !== 'undefined' ? currentUser : ''));
        if (!user) { reward.textContent = '挑战成绩已保存'; return; }
        const diagnostic = await diagnoseVocabularyChallengeReward(browserOptions({ user }));
        if (!diagnostic.ok || !diagnostic.audit.valid) {
          reward.textContent = '挑战成绩已保存，奖励状态稍后同步';
          return;
        }
        if (diagnostic.audit.teacherOverride) {
          reward.textContent = `本次奖励以老师调整为准（${diagnostic.audit.currentSource} / 10）`;
          return;
        }
        if (diagnostic.audit.claimAmount >= diagnostic.audit.target
          && diagnostic.audit.claimStatus !== 'idle') {
          reward.textContent = `预计可获得 ${diagnostic.audit.target} 金币，返回首页点击宝箱领取`;
          return;
        }
        reward.textContent = '挑战成绩已保存，奖励状态稍后同步';
        const settled = await settleVocabularyChallengeReward(browserOptions({
          user,
          adventureState: await root.sbGet(adventureKey(user))
        }));
        if (settled.ok && settled.audit
          && settled.audit.claimAmount >= settled.audit.target
          && settled.audit.claimStatus !== 'idle') {
          reward.textContent = `预计可获得 ${settled.audit.target} 金币，返回首页点击宝箱领取`;
        }
      } catch (error) {
        console.warn('Unable to render vocabulary challenge reward state', error);
        reward.textContent = '挑战成绩已保存，奖励状态稍后同步';
      } finally {
        summary.dataset.formalRewardRendering = 'done';
      }
    }

    function scanChallengeResult() {
      host?.querySelectorAll('.vocabulary-adventure-challenge-result').forEach(renderSavedRewardState);
    }
    if (host && typeof root.MutationObserver === 'function') {
      const observer = new root.MutationObserver(scanChallengeResult);
      observer.observe(host, { subtree: true, childList: true });
    }
    scanChallengeResult();
  }

  return Object.freeze({
    SOURCE,
    MAX_REWARD,
    MARKER_VERSION,
    COMPLETION_VERSION,
    rewardKey,
    adventureKey,
    normalizeMarker,
    challengeRewardTarget,
    markerFromState,
    completionTransactionId,
    completionFacts,
    completedChallengeFacts,
    prepareAdventureStateForVocabularyChallengeSave,
    auditVocabularyChallengeReward,
    settleVocabularyChallengeReward,
    shouldSettleVocabularyChallengeReward,
    diagnoseVocabularyChallengeReward,
    repairPerfectVocabularyChallengeReward,
    install
  });
});
