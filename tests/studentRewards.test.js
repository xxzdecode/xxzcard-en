const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rewards = require(path.join(root, 'js', 'studentRewards.js'));
const source = fs.readFileSync(path.join(root, 'js', 'studentRewards.js'), 'utf8');
const dailyLearningRouteSource = fs.readFileSync(path.join(root, 'js', 'dailyLearningRoute.js'), 'utf8');
const date = '2026-07-30';

const loadRewardSource = source.match(/async function loadReward\(user\) \{[\s\S]*?\n    \}/)?.[0] || '';
assert.match(loadRewardSource, /root\.sbGet\(rewardKey\(user\)\)/);
assert.doesNotMatch(loadRewardSource, /root\.sbSet\(|await saveReward\(/, 'opening the home screen must not write reward data');

assert.deepEqual(rewards.SOURCE_MAX, {
  adventure: 5,
  vocabularyChallenge: 10,
  grammarChallenge: 5,
  classroomPractice: 10
});
assert.equal(rewards.REGULAR_DAILY_MAX, 30);
assert.equal(rewards.BREAKTHROUGH_DAILY_MAX, 10);
assert.equal(rewards.DAILY_TOTAL_MAX, 40);
assert.deepEqual(rewards.CHALLENGE_FULL_SCORE, { sister: 100, brother: 80 });
assert.equal(rewards.challengeRewardAmount('sister', 80, 10), 8);
assert.equal(rewards.challengeRewardAmount('sister', 100, 10), 10);
assert.equal(rewards.challengeRewardAmount('brother', 80, 10), 10);
assert.equal(rewards.challengeRewardAmount('brother', 100, 10), 10);
assert.equal(rewards.challengeRewardAmount('brother', 70, 10), 9);
assert.equal(rewards.challengeRewardAmount('sister', 80, 5), 4);
assert.equal(rewards.challengeRewardAmount('brother', 80, 5), 5);
assert.equal(rewards.challengeRewardAmount('brother', 40, 5), 3);
assert.equal(rewards.challengeRewardAmount('brother', 0, 5), 0);

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

const claimDate = '2026-08-02';
const pendingAdventure = rewards.markSourceClaim(
  { totalCoins: 20, daily: { [claimDate]: { coins: 0 } } },
  {
    date: claimDate,
    source: 'adventure',
    amount: 5,
    mode: 'set',
    at: '2026-08-02T08:00:00.000Z'
  }
);
assert.equal(pendingAdventure.changed, true);
assert.equal(pendingAdventure.record.totalCoins, 20, 'completing a module must not award coins');
assert.equal(pendingAdventure.record.daily[claimDate].coins, 0);
assert.equal(pendingAdventure.record.daily[claimDate].claims.adventure.status, 'pending');

const claimedAdventure = rewards.claimSourceReward(pendingAdventure.record, {
  date: claimDate,
  source: 'adventure',
  at: '2026-08-02T08:01:00.000Z'
});
assert.equal(claimedAdventure.record.totalCoins, 25);
assert.equal(claimedAdventure.record.daily[claimDate].coins, 5);
assert.equal(claimedAdventure.record.daily[claimDate].claims.adventure.status, 'claimed');
assert.equal(claimedAdventure.record.transactions.at(-1).id, `${claimDate}:adventure:claim:5`);

const duplicateClaim = rewards.claimSourceReward(claimedAdventure.record, {
  date: claimDate,
  source: 'adventure'
});
assert.equal(duplicateClaim.changed, false, 'refreshes and repeated clicks must not award twice');
assert.equal(duplicateClaim.record.totalCoins, 25);
assert.equal(duplicateClaim.record.transactions.length, claimedAdventure.record.transactions.length);

const firstChallengeClaim = rewards.claimSourceReward(
  rewards.markSourceClaim(null, {
    date: claimDate,
    source: 'vocabularyChallenge',
    amount: 9,
    mode: 'max'
  }).record,
  { date: claimDate, source: 'vocabularyChallenge' }
);
const improvedChallenge = rewards.markSourceClaim(firstChallengeClaim.record, {
  date: claimDate,
  source: 'vocabularyChallenge',
  amount: 10,
  mode: 'max'
});
assert.equal(improvedChallenge.changed, true, 'a higher second score must reopen the claimed chest');
assert.equal(improvedChallenge.claim.status, 'pending');
assert.equal(improvedChallenge.claim.amount, 10);
const improvedChallengeClaim = rewards.claimSourceReward(improvedChallenge.record, {
  date: claimDate,
  source: 'vocabularyChallenge'
});
assert.equal(improvedChallengeClaim.delta, 1, 'the second claim awards only the improvement');
assert.equal(improvedChallengeClaim.record.totalCoins, 10);
assert.equal(improvedChallengeClaim.record.transactions.length, 2);

const completedWithoutCoins = rewards.markSourceClaim(null, {
  date: claimDate,
  source: 'vocabularyChallenge',
  amount: 0
});
assert.equal(completedWithoutCoins.record.daily[claimDate].claims.vocabularyChallenge.status, 'completed');
assert.equal(rewards.claimSourceReward(completedWithoutCoins.record, {
  date: claimDate,
  source: 'vocabularyChallenge'
}).changed, false);
assert.equal(rewards.normalizeStudentTag('', 'sister'), '学习小达人');
assert.equal(rewards.normalizeStudentTag('123456789012345', 'brother').length, rewards.STUDENT_TAG_MAX_LENGTH);

assert.doesNotMatch(source, /observe\(document\.documentElement/, 'reward code must not observe the entire page');
assert.doesNotMatch(source, /characterData\s*:\s*true/, 'reward observers must not react to their own text changes');
assert.match(source, /vocabularyAdventureBody/);
assert.match(source, /attributeFilter:\s*\['data-complete'\]/);
assert.match(source, /challengeRewardAmount\(user, rawScore, SOURCE_MAX\.grammarChallenge\)/);
assert.match(source, /grammarChallenge:\s*'grammarChallengeHomeStatus'/);
assert.match(source, /recordSource\(user, 'grammarChallenge', rewardAmount, 'set', \{ render: false \}\)/);
assert.match(dailyLearningRouteSource, /StudentRewards\.challengeRewardAmount\(user, result\.score, 5\)/);

console.log('student reward tests passed');
