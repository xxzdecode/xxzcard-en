const assert = require('node:assert/strict');
const path = require('node:path');

const rewards = require(path.resolve(__dirname, '..', 'js', 'studentRewards.js'));
const date = '2026-07-30';

const legacy = rewards.normalizeRewardRecord({
  totalCoins: 6,
  daily: { [date]: { coins: 6 } }
});
const adventure = rewards.applySourceReward(legacy, {
  date,
  source: 'adventure',
  amount: 10,
  mode: 'set',
  at: '2026-07-30T10:00:00.000Z'
});
assert.equal(adventure.record.daily[date].coins, 10);
assert.equal(adventure.record.totalCoins, 10);
assert.equal(adventure.delta, 4, 'legacy regular coins must not be discarded');

const repeatedAdventure = rewards.applySourceReward(adventure.record, {
  date,
  source: 'adventure',
  amount: 10,
  mode: 'set'
});
assert.equal(repeatedAdventure.changed, false, 'adventure reward must be idempotent');

const challenge = rewards.applySourceReward(adventure.record, {
  date,
  source: 'vocabularyChallenge',
  amount: 7,
  mode: 'max'
});
assert.equal(challenge.record.daily[date].coins, 17);
assert.equal(challenge.record.totalCoins, 17);
const lowerRetry = rewards.applySourceReward(challenge.record, {
  date,
  source: 'vocabularyChallenge',
  amount: 5,
  mode: 'max'
});
assert.equal(lowerRetry.changed, false, 'a lower retry must not reduce challenge coins');

const seeded = rewards.seedInitialBreakthrough(challenge.record, date, '2026-07-30T10:10:00.000Z');
assert.equal(seeded.record.daily[date].breakthroughCoins, 10);
assert.equal(seeded.record.totalCoins, 27);
assert.equal(rewards.seedInitialBreakthrough(seeded.record, date).changed, false, 'initial seed must only run once');

const deducted = rewards.applyBreakthroughAdjustment(seeded.record, {
  date,
  delta: -3,
  reason: '课堂调整'
});
assert.equal(deducted.record.daily[date].breakthroughCoins, 7);
assert.equal(deducted.record.totalCoins, 24);
const capped = rewards.applyBreakthroughAdjustment(deducted.record, { date, delta: 20 });
assert.equal(capped.record.daily[date].breakthroughCoins, 10, 'breakthrough coins are capped at ten per day');

const challengeCorrection = rewards.applyRewardAdjustment(capped.record, {
  date,
  project: 'vocabularyChallenge',
  delta: -4,
  at: '2026-07-30T10:20:00.000Z'
});
assert.equal(challengeCorrection.record.daily[date].sources.vocabularyChallenge, 3);
assert.equal(challengeCorrection.record.daily[date].coins, 13);
assert.equal(challengeCorrection.record.totalCoins, 23);
assert.equal(challengeCorrection.projectDelta, -4);
assert.equal(challengeCorrection.delta, -4);

const reconciliationAfterCorrection = rewards.applySourceReward(challengeCorrection.record, {
  date,
  source: 'vocabularyChallenge',
  amount: 10,
  mode: 'set'
});
assert.equal(reconciliationAfterCorrection.changed, false, 'automatic reconciliation must not overwrite a teacher correction');
assert.equal(reconciliationAfterCorrection.overridden, true);
assert.equal(reconciliationAfterCorrection.record.daily[date].sources.vocabularyChallenge, 3);

const classroomAdded = rewards.applyRewardAdjustment(challengeCorrection.record, {
  date,
  project: 'classroomPractice',
  delta: 6
});
assert.equal(classroomAdded.record.daily[date].sources.classroomPractice, 6);
assert.equal(classroomAdded.record.daily[date].coins, 19);
assert.equal(classroomAdded.record.totalCoins, 29);

const breakthroughGeneric = rewards.applyRewardAdjustment(classroomAdded.record, {
  date,
  project: 'breakthrough',
  delta: -2
});
assert.equal(breakthroughGeneric.record.daily[date].breakthroughCoins, 8);
assert.equal(breakthroughGeneric.record.totalCoins, 27);
assert.equal(breakthroughGeneric.projectDelta, -2);

const floor = rewards.applyRewardAdjustment(breakthroughGeneric.record, {
  date,
  project: 'adventure',
  delta: -99
});
assert.equal(floor.record.daily[date].sources.adventure, 0);
assert.equal(floor.projectDelta, -10);
assert.equal(floor.record.daily[date].coins, 9);

const unchangedFloor = rewards.applyRewardAdjustment(floor.record, {
  date,
  project: 'adventure',
  delta: -1
});
assert.equal(unchangedFloor.changed, false, 'teacher deduction must stop at zero');

const invalid = rewards.applyRewardAdjustment(floor.record, {
  date,
  project: 'unknown',
  delta: 1
});
assert.equal(invalid.changed, false, 'unknown reward projects must be ignored');

console.log('student reward tests passed');