const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const settlement = require('../js/studentVocabularyRewardSettlement.js');

const DATE = '2026-08-01';
const SOURCE = 'vocabularyChallenge';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

const rewardApi = {
  challengeRewardAmount(user, score, maxAmount) {
    const fullScore = user === 'brother' ? 80 : 100;
    return clamp((clamp(score, 0, 100) / fullScore) * maxAmount, 0, maxAmount);
  },
  normalizeDay(value) {
    const raw = value && typeof value === 'object' ? value : {};
    const sources = { vocabularyChallenge: clamp(raw.sources?.vocabularyChallenge, 0, 10) };
    const claims = raw.claims && typeof raw.claims === 'object'
      ? clone(raw.claims)
      : {};
    const teacherSourceOverrides = raw.teacherSourceOverrides && typeof raw.teacherSourceOverrides === 'object'
      ? { ...raw.teacherSourceOverrides }
      : {};
    return {
      ...raw,
      coins: clamp(raw.coins, 0, 30),
      sources,
      claims,
      teacherSourceOverrides
    };
  },
  normalizeRewardRecord(value) {
    const raw = value && typeof value === 'object' ? clone(value) : {};
    const daily = {};
    Object.entries(raw.daily || {}).forEach(([date, day]) => {
      daily[date] = this.normalizeDay(day);
    });
    return {
      ...raw,
      version: 3,
      totalCoins: Math.max(0, Math.round(Number(raw.totalCoins) || 0)),
      daily,
      transactions: Array.isArray(raw.transactions) ? raw.transactions.slice() : []
    };
  },
  markSourceClaim(recordValue, options) {
    const record = this.normalizeRewardRecord(recordValue);
    const day = this.normalizeDay(record.daily[options.date]);
    if (Object.prototype.hasOwnProperty.call(day.teacherSourceOverrides, options.source)) {
      return { record, changed: false, claim: null, overridden: true };
    }
    const currentClaim = day.claims[options.source] || {};
    if (currentClaim.status === 'claimed') return { record, changed: false, claim: currentClaim };
    const current = clamp(currentClaim.amount, 0, 10);
    const requested = clamp(options.amount, 0, 10);
    const next = options.mode === 'max' ? Math.max(current, requested) : requested;
    const changed = next !== current || currentClaim.status !== (next > 0 ? 'pending' : 'completed');
    if (!changed) return { record, changed: false, claim: currentClaim };
    const claim = {
      status: next > 0 ? 'pending' : 'completed',
      amount: next,
      mode: options.mode === 'max' ? 'max' : 'set',
      completedAt: options.at || '',
      claimedAt: '',
      transactionId: ''
    };
    record.daily[options.date] = {
      ...day,
      claims: { ...day.claims, [options.source]: claim },
      updatedAt: options.at
    };
    return { record, changed: true, claim };
  }
};

function challengeState(correctCount, status = 'completed') {
  return {
    version: 1,
    words: {},
    session: null,
    challengeDaily: { date: DATE, attempts: 1, bestScore: correctCount * 10 },
    challengeSession: {
      date: DATE,
      status,
      correctCount,
      completedAt: status === 'completed' ? `${DATE}T10:00:00.000Z` : ''
    }
  };
}

function rewardRecord(user, amount = 0, override) {
  const teacherSourceOverrides = override == null ? {} : { [SOURCE]: override };
  return {
    user,
    version: 3,
    totalCoins: amount,
    daily: {
      [DATE]: {
        coins: amount,
        sources: { [SOURCE]: amount },
        claims: amount > 0 ? { [SOURCE]: { status: 'claimed', amount } } : {},
        teacherSourceOverrides
      }
    },
    transactions: []
  };
}

function createStorage(initial, failures = {}) {
  const rows = new Map(Object.entries(clone(initial)));
  const calls = [];
  const remainingFailures = { ...failures };
  return {
    rows,
    calls,
    async getValue(key) {
      return clone(rows.get(key));
    },
    async setValue(key, value) {
      calls.push({ key, value: clone(value) });
      if ((remainingFailures[key] || 0) > 0) {
        remainingFailures[key] -= 1;
        throw new Error(`injected failure for ${key}`);
      }
      rows.set(key, clone(value));
      return true;
    }
  };
}

async function saveCompletedAndSettle(storage, user, state, previous) {
  const prepared = settlement.prepareAdventureStateForVocabularyChallengeSave(
    state,
    previous,
    { at: `${DATE}T10:00:00.000Z` }
  );
  await storage.setValue(settlement.adventureKey(user), prepared);
  return settlement.settleVocabularyChallengeReward({
    user,
    adventureState: prepared,
    rewardApi,
    getValue: storage.getValue,
    setValue: storage.setValue,
    at: `${DATE}T10:00:01.000Z`
  });
}

(async () => {
  // Sister 10/10: completion creates a claim ticket without awarding coins.
  {
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0)
    });
    const result = await saveCompletedAndSettle(storage, 'sister', challengeState(10));
    assert.equal(result.ok, true);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].sources[SOURCE], 0);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].claims[SOURCE].amount, 10);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].claims[SOURCE].status, 'pending');
    assert.equal(storage.rows.get(settlement.adventureKey('sister')).challengeDaily.rewardSettlement.status, 'settled');
  }

  // First reward save fails: completed score and pending marker remain, then retry succeeds.
  {
    const rewardKey = settlement.rewardKey('sister');
    const adventureKey = settlement.adventureKey('sister');
    const storage = createStorage({ [rewardKey]: rewardRecord('sister', 0) }, { [rewardKey]: 1 });
    const prepared = settlement.prepareAdventureStateForVocabularyChallengeSave(challengeState(10), null);
    await storage.setValue(adventureKey, prepared);
    const failed = await settlement.settleVocabularyChallengeReward({
      user: 'sister', adventureState: prepared, rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.code, 'CLAIM_SAVE_FAILED');
    assert.equal(storage.rows.get(adventureKey).challengeSession.status, 'completed');
    assert.equal(storage.rows.get(adventureKey).challengeDaily.rewardSettlement.status, 'pending');
    assert.equal(storage.rows.get(rewardKey).daily[DATE].sources[SOURCE], 0);

    const retried = await settlement.settleVocabularyChallengeReward({
      user: 'sister', adventureState: await storage.getValue(adventureKey), rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    assert.equal(retried.ok, true);
    assert.equal(storage.rows.get(rewardKey).daily[DATE].sources[SOURCE], 0);
    assert.equal(storage.rows.get(rewardKey).daily[DATE].claims[SOURCE].amount, 10);
    assert.equal(storage.rows.get(adventureKey).challengeDaily.rewardSettlement.status, 'settled');
  }

  // Result DOM may disappear immediately: settlement requires no DOM and still completes.
  {
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0)
    });
    const result = await saveCompletedAndSettle(storage, 'sister', challengeState(8));
    assert.equal(result.audit.currentSource, 0);
    assert.equal(result.audit.claimAmount, 8);
  }

  // Refresh, startup and reconciliation retries are idempotent.
  {
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0)
    });
    const first = await saveCompletedAndSettle(storage, 'sister', challengeState(10));
    const state = await storage.getValue(settlement.adventureKey('sister'));
    const second = await settlement.settleVocabularyChallengeReward({
      user: 'sister', adventureState: state, rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    const third = await settlement.settleVocabularyChallengeReward({
      user: 'sister', adventureState: state, rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.equal(third.changed, false);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).transactions.length, 0);
  }

  // 7/10 then 10/10 updates the one pending claim to the best score.
  {
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0)
    });
    const seven = await saveCompletedAndSettle(storage, 'sister', challengeState(7));
    const previous = await storage.getValue(settlement.adventureKey('sister'));
    const ten = await saveCompletedAndSettle(storage, 'sister', challengeState(10), previous);
    assert.equal(seven.claim.amount, 7);
    assert.equal(ten.claim.amount, 10);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].sources[SOURCE], 0);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].claims[SOURCE].amount, 10);
  }

  // 10/10 then 8/10 keeps the daily maximum at 10.
  {
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0)
    });
    await saveCompletedAndSettle(storage, 'sister', challengeState(10));
    const previous = await storage.getValue(settlement.adventureKey('sister'));
    const lower = await saveCompletedAndSettle(storage, 'sister', challengeState(8), previous);
    assert.equal(lower.changed, false);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].claims[SOURCE].amount, 10);
  }

  // Sister settlement never reads or mutates brother reward data.
  {
    const brotherBefore = rewardRecord('brother', 4);
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0),
      [settlement.rewardKey('brother')]: brotherBefore
    });
    await saveCompletedAndSettle(storage, 'sister', challengeState(10));
    assert.deepEqual(storage.rows.get(settlement.rewardKey('brother')), brotherBefore);
    assert.equal(storage.calls.some(call => call.key === settlement.rewardKey('brother')), false);
  }

  // Brother reaches the full vocabulary reward at 80, while lower scores scale proportionally.
  {
    const storage = createStorage({
      [settlement.rewardKey('brother')]: rewardRecord('brother', 0)
    });
    const full = await saveCompletedAndSettle(storage, 'brother', challengeState(8));
    assert.equal(full.audit.target, 10);
    assert.equal(full.claim.amount, 10);

    const secondDateState = challengeState(7);
    secondDateState.challengeSession.date = DATE;
    const scaledAudit = settlement.auditVocabularyChallengeReward({
      user: 'brother',
      adventureState: secondDateState,
      rewardRecord: rewardRecord('brother', 0),
      rewardApi
    });
    assert.equal(scaledAudit.target, 9);
  }

  // Teacher override blocks automatic settlement and remains unchanged.
  {
    const storage = createStorage({
      [settlement.rewardKey('sister')]: rewardRecord('sister', 6, 6)
    });
    const result = await saveCompletedAndSettle(storage, 'sister', challengeState(10));
    assert.equal(result.overridden, true);
    assert.equal(storage.rows.get(settlement.rewardKey('sister')).daily[DATE].sources[SOURCE], 6);
    assert.equal(storage.rows.get(settlement.adventureKey('sister')).challengeDaily.rewardSettlement.status, 'blocked');
  }

  // DOM-like input is ignored; reward is derived only from challengeSession.correctCount.
  {
    const audit = settlement.auditVocabularyChallengeReward({
      user: 'sister',
      adventureState: challengeState(7),
      rewardRecord: rewardRecord('sister', 0),
      rewardApi,
      domCorrectCount: 999
    });
    assert.equal(audit.target, 7);
  }

  // Historical perfect completed state can be audited and repaired exactly once.
  {
    const adventureKey = settlement.adventureKey('sister');
    const rewardKey = settlement.rewardKey('sister');
    const storage = createStorage({
      [adventureKey]: challengeState(10),
      [rewardKey]: rewardRecord('sister', 0)
    });
    const diagnosis = await settlement.diagnoseVocabularyChallengeReward({
      user: 'sister', rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    assert.equal(diagnosis.readOnly, true);
    assert.equal(diagnosis.audit.perfectRepairEligible, true);
    assert.equal(storage.calls.length, 0, 'audit must be read-only');

    const repaired = await settlement.repairPerfectVocabularyChallengeReward({
      user: 'sister', repairToken: diagnosis.audit.repairToken, rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    assert.equal(repaired.ok, true);
    assert.equal(storage.rows.get(rewardKey).daily[DATE].sources[SOURCE], 0);
    assert.equal(storage.rows.get(rewardKey).daily[DATE].claims[SOURCE].amount, 10);
    const transactionCount = storage.rows.get(rewardKey).transactions.length;

    const secondDiagnosis = await settlement.diagnoseVocabularyChallengeReward({
      user: 'sister', rewardApi, getValue: storage.getValue
    });
    assert.equal(secondDiagnosis.audit.perfectRepairEligible, false);
    assert.equal(storage.rows.get(rewardKey).transactions.length, transactionCount);
  }

  // Best score alone is not enough for repair when the current session is abandoned.
  {
    const abandoned = challengeState(0, 'abandoned');
    abandoned.challengeDaily.bestScore = 100;
    const storage = createStorage({
      [settlement.adventureKey('sister')]: abandoned,
      [settlement.rewardKey('sister')]: rewardRecord('sister', 0)
    });
    const diagnosis = await settlement.diagnoseVocabularyChallengeReward({
      user: 'sister', rewardApi, getValue: storage.getValue
    });
    assert.equal(diagnosis.audit.historyMismatch, true);
    assert.equal(diagnosis.audit.perfectRepairEligible, false);
    const repair = await settlement.repairPerfectVocabularyChallengeReward({
      user: 'sister', repairToken: diagnosis.audit.repairToken, rewardApi,
      getValue: storage.getValue, setValue: storage.setValue
    });
    assert.equal(repair.ok, false);
    assert.equal(storage.calls.length, 0);
  }

  // A pending completed reward survives a newly active session that overwrites challengeSession.
  {
    const completed = settlement.prepareAdventureStateForVocabularyChallengeSave(challengeState(10), null);
    const active = challengeState(0, 'active');
    active.challengeDaily.bestScore = 100;
    const preserved = settlement.prepareAdventureStateForVocabularyChallengeSave(active, completed);
    assert.equal(preserved.challengeDaily.rewardSettlement.status, 'pending');
    assert.equal(preserved.challengeDaily.rewardSettlement.target, 10);
  }

  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'studentVocabularyRewardSettlement.js'), 'utf8');
  const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'vocabularyAdventure.js'), 'utf8');
  const reconcileSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'studentRewardReconcile.js'), 'utf8');
  assert.match(source, /markSourceClaim/);
  assert.match(source, /mode:\s*'max'/);
  assert.doesNotMatch(source, /totalCoins\s*\+=\s*10/);
  assert.doesNotMatch(source, /querySelector\([^)]*summary-grid[^)]*\)/);
  assert.match(adapterSource, /prepareAdventureStateForVocabularyChallengeSave/);
  assert.match(adapterSource, /const saved = await dependencies\.setValue/);
  assert.match(adapterSource, /settleVocabularyChallengeReward/);
  assert.doesNotMatch(reconcileSource, /correctCount\)\s*\|\|\s*0/);
  assert.doesNotMatch(reconcileSource, /scoreCoins/);

  console.log('vocabulary reward settlement tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
