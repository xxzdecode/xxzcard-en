const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rewards = require(path.join(root, 'js', 'studentRewards.js'));
const source = fs.readFileSync(path.join(root, 'js', 'studentRewards.js'), 'utf8');
const date = '2026-07-30';

assert.deepEqual(rewards.SOURCE_MAX, {
  adventure: 5,
  vocabularyChallenge: 10,
  grammarChallenge: 5,
  classroomPractice: 10
});
assert.equal(rewards.REGULAR_DAILY_MAX, 30);
assert.equal(rewards.BREAKTHROUGH_DAILY_MAX, 10);
assert.equal(rewards.DAILY_TOTAL_MAX, 40);

const migrated = rewards.normalizeRewardRecord({
  version: 2,
  totalCoins: 40,
  daily: {
    [date]: {
      coins: 30,
      breakthroughCoins: 10,
      sources: { adventure: 10, vocabularyChallenge: 10, classroomPractice: 10 }
    }
  }
});
assert.equal(migrated.version, 3);
assert.equal(migrated.daily[date].sources.adventure, 5);
assert.equal(migrated.daily[date].sources.grammarChallenge, 0);
assert.equal(migrated.daily[date].coins, 25);
assert.equal(migrated.totalCoins, 35, 'legacy ten-point adventure reward must rebalance to five');

const grammar = rewards.applySourceReward(migrated, {
  date,
  source: 'grammarChallenge',
  amount: 5,
  mode: 'set',
  at: '2026-07-30T10:00:00.000Z'
});
assert.equal(grammar.record.daily[date].coins, 30);
assert.equal(grammar.record.totalCoins, 40);
assert.equal(grammar.projectDelta, 5);

const repeatedGrammar = rewards.applySourceReward(grammar.record, {
  date,
  source: 'grammarChallenge',
  amount: 5,
  mode: 'set'
});
assert.equal(repeatedGrammar.changed, false, 'grammar reward must be idempotent');

const challengeCorrection = rewards.applyRewardAdjustment(grammar.record, {
  date,
  project: 'vocabularyChallenge',
  delta: -4,
  at: '2026-07-30T10:20:00.000Z'
});
assert.equal(challengeCorrection.record.daily[date].sources.vocabularyChallenge, 6);
assert.equal(challengeCorrection.record.daily[date].coins, 26);
assert.equal(challengeCorrection.record.totalCoins, 36);
assert.equal(challengeCorrection.projectDelta, -4);

const reconciliationAfterCorrection = rewards.applySourceReward(challengeCorrection.record, {
  date,
  source: 'vocabularyChallenge',
  amount: 10,
  mode: 'set'
});
assert.equal(reconciliationAfterCorrection.changed, false, 'automatic reconciliation must not overwrite a teacher correction');
assert.equal(reconciliationAfterCorrection.overridden, true);
assert.equal(reconciliationAfterCorrection.record.daily[date].sources.vocabularyChallenge, 6);

const adventureFloor = rewards.applyRewardAdjustment(challengeCorrection.record, {
  date,
  project: 'adventure',
  delta: -99
});
assert.equal(adventureFloor.record.daily[date].sources.adventure, 0);
assert.equal(adventureFloor.projectDelta, -5);
assert.equal(adventureFloor.record.daily[date].coins, 21);

const grammarCap = rewards.applyRewardAdjustment(adventureFloor.record, {
  date,
  project: 'grammarChallenge',
  delta: 99
});
assert.equal(grammarCap.record.daily[date].sources.grammarChallenge, 5);
assert.equal(grammarCap.projectDelta, 0, 'grammar challenge must stop at five');

const seeded = rewards.seedInitialBreakthrough(
  rewards.normalizeRewardRecord({ totalCoins: 0, daily: { [date]: { coins: 0 } } }),
  date,
  '2026-07-30T10:10:00.000Z'
);
assert.equal(seeded.record.daily[date].breakthroughCoins, 10);
assert.equal(seeded.record.totalCoins, 10);
assert.equal(rewards.seedInitialBreakthrough(seeded.record, date).changed, false);

const legacyUnallocated = rewards.normalizeRewardRecord({
  totalCoins: 6,
  daily: { [date]: { coins: 6 } }
});
const legacyAdventure = rewards.applySourceReward(legacyUnallocated, {
  date,
  source: 'adventure',
  amount: 5,
  mode: 'set'
});
assert.equal(legacyAdventure.record.daily[date].coins, 11, 'unclassified legacy coins must not be discarded');
assert.equal(legacyAdventure.record.totalCoins, 11);

assert.doesNotMatch(source, /observe\(document\.documentElement/, 'reward code must not observe the entire page');
assert.doesNotMatch(source, /characterData\s*:\s*true/, 'reward observers must not react to their own text changes');
assert.match(source, /vocabularyAdventureBody/);
assert.match(source, /attributeFilter:\s*\['data-complete'\]/);

console.log('student reward tests passed');