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

async function runScenario(grammarToday, classroomToday = null, user = 'sister') {
  const calls = [];
  const today = todayKey();
  const rows = {
    [`vocab_adventure_v1_${user}`]: null,
    [`grammar_challenge_daily_v1_${user}`]: grammarToday ? { [today]: grammarToday } : {},
    [`classroom_practice_daily_v1_${user}`]: classroomToday ? { [today]: classroomToday } : {}
  };
  const context = {
    console,
    currentUser: user,
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
  await context.reconcileStudentRewards(user);
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

  const sisterClassroom = await runScenario(null, {
    status: 'completed',
    score: 40,
    correctCount: 6,
    totalCount: 15
  });
  assert.deepEqual(sisterClassroom, [['sister', 'classroomPractice', 4, 'max']]);

  const brotherClassroom = await runScenario(null, {
    status: 'completed',
    score: 40,
    correctCount: 6,
    totalCount: 15
  }, 'brother');
  assert.deepEqual(brotherClassroom, [['brother', 'classroomPractice', 5, 'max']]);

  const legacyClassroom = await runScenario(null, { status: 'completed' });
  assert.deepEqual(legacyClassroom, [['sister', 'classroomPractice', 10, 'max']]);

  console.log('student reward reconciliation tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
