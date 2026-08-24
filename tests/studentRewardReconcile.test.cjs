const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/studentRewardReconcile.js'), 'utf8');
const StudentRewards = require(path.join(root, 'js/studentRewards.js'));

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function runScenario(grammarToday) {
  const calls = [];
  const today = todayKey();
  const rows = {
    vocab_adventure_v1_sister: null,
    grammar_challenge_daily_v1_sister: grammarToday ? { [today]: grammarToday } : {},
    classroom_practice_daily_v1_sister: {}
  };
  const context = {
    console,
    currentUser: 'sister',
    document: {},
    StudentRewards,
    isTeacher: () => false,
    loadHome: async () => true,
    loadStudentRewardSummary: async () => {},
    recordStudentRewardSource: async (...args) => {
      calls.push(args);
      return { ok: true };
    },
    sbGetRemote: async key => rows[key] ?? null,
    settleVocabularyChallengeReward: async () => ({ ok: true })
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'studentRewardReconcile.js' });
  await context.reconcileStudentRewards('sister');
  return calls;
}

(async () => {
  const recovered = await runScenario({
    status: 'completed',
    rewardPending: true,
    score: null,
    correctCount: 10,
    totalCount: 10
  });
  assert.deepEqual(recovered, [['sister', 'grammarChallenge', 5, 'set']]);

  const incomplete = await runScenario({
    status: 'in_progress',
    rewardPending: false,
    correctCount: 9,
    totalCount: 10
  });
  assert.deepEqual(incomplete, []);

  const alreadySettled = await runScenario({
    status: 'completed',
    rewardPending: false,
    score: 100,
    correctCount: 10,
    totalCount: 10
  });
  assert.deepEqual(alreadySettled, []);

  console.log('student reward reconciliation tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
