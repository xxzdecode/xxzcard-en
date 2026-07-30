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

console.log('student reward tests passed');
