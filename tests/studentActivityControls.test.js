const assert = require('node:assert/strict');
const controls = require('../js/studentActivityControls.js');

const date = '2026-07-31';

assert.deepEqual(controls.ACTIVITY_PROJECT_KEYS, [
  'adventure',
  'vocabularyChallenge',
  'grammarChallenge',
  'classroomPractice'
]);

const empty = controls.normalizeControlRecord(null);
assert.equal(controls.projectAttemptTotal(empty, date, 'adventure'), 1);
assert.equal(controls.projectAttemptTotal(empty, date, 'vocabularyChallenge'), 2);
assert.equal(controls.projectAttemptTotal(empty, date, 'grammarChallenge'), 1);
assert.equal(controls.projectAttemptTotal(empty, date, 'classroomPractice'), 1);

const plusOne = controls.applyAttemptIncrease(empty, {
  date,
  project: 'vocabularyChallenge',
  delta: 1,
  at: '2026-07-31T00:00:00.000Z'
});
assert.equal(plusOne.changed, true);
assert.equal(plusOne.total, 3);
assert.equal(controls.projectAttemptTotal(plusOne.record, date, 'vocabularyChallenge'), 3);

const plusTwo = controls.applyAttemptIncrease(plusOne.record, {
  date,
  project: 'vocabularyChallenge',
  delta: 2
});
assert.equal(plusTwo.total, 5);
assert.equal(controls.projectAttemptUsage(plusTwo.record, date, 'vocabularyChallenge'), 0);

const used = controls.applyUsageIncrement(plusTwo.record, {
  date,
  project: 'vocabularyChallenge'
});
assert.equal(used.usage, 1);
assert.equal(controls.projectAttemptTotal(used.record, date, 'vocabularyChallenge'), 5);

const inferred = controls.applyUsageMinimum(used.record, {
  date,
  project: 'vocabularyChallenge',
  minimum: 3
});
assert.equal(inferred.usage, 3);
assert.equal(controls.projectAttemptUsage(inferred.record, date, 'vocabularyChallenge'), 3);

assert.deepEqual(
  controls.calculateCoinAdjustment(5, 40, 10),
  { current: 5, requestedDelta: 10, appliedDelta: 10, next: 15 }
);
assert.deepEqual(
  controls.calculateCoinAdjustment(3, 2, -10),
  { current: 3, requestedDelta: -10, appliedDelta: -2, next: 1 }
);
assert.deepEqual(
  controls.calculateCoinAdjustment(0, 20, -1),
  { current: 0, requestedDelta: -1, appliedDelta: 0, next: 0 }
);

const teacherRaisedChallenge = controls.syncTeacherAdjustedClaim({
  sources: { vocabularyChallenge: 10 },
  claims: {
    vocabularyChallenge: {
      status: 'claimed',
      amount: 9,
      mode: 'max',
      completedAt: '2026-08-21T08:00:00.000Z',
      claimedAt: '2026-08-21T08:01:00.000Z'
    }
  }
}, {
  project: 'vocabularyChallenge',
  amount: 10,
  at: '2026-08-21T08:02:00.000Z'
});
assert.equal(teacherRaisedChallenge.sources.vocabularyChallenge, 10);
assert.equal(teacherRaisedChallenge.claims.vocabularyChallenge.status, 'claimed');
assert.equal(teacherRaisedChallenge.claims.vocabularyChallenge.amount, 10);
assert.equal(teacherRaisedChallenge.claims.vocabularyChallenge.claimedAt, '2026-08-21T08:02:00.000Z');

const teacherClearedCompleted = controls.syncTeacherAdjustedClaim(teacherRaisedChallenge, {
  project: 'vocabularyChallenge', amount: 0
});
assert.equal(teacherClearedCompleted.claims.vocabularyChallenge.status, 'completed');
assert.equal(teacherClearedCompleted.claims.vocabularyChallenge.amount, 0);

const teacherKeptIdle = controls.syncTeacherAdjustedClaim({
  claims: { grammarChallenge: { status: 'idle', amount: 0 } }
}, { project: 'grammarChallenge', amount: 0 });
assert.equal(teacherKeptIdle.claims.grammarChallenge.status, 'idle');

assert.deepEqual(
  controls.virtualizeWordChallengeUsage(0, 2, 3),
  {
    base: 2,
    allowed: 3,
    bonus: 1,
    actualLegacy: 0,
    actualState: 2,
    virtualLegacy: 0,
    residualBonus: 1,
    virtualState: 1,
    virtualTotal: 1
  }
);
assert.equal(controls.virtualizeWordChallengeUsage(2, 0, 3).virtualTotal, 1);
assert.equal(controls.virtualizeWordChallengeUsage(1, 2, 4).virtualTotal, 1);
assert.equal(controls.virtualizeWordChallengeUsage(0, 5, 5).virtualTotal, 2);


for (let allowed = 2; allowed <= 8; allowed += 1) {
  for (let actual = 0; actual <= allowed; actual += 1) {
    for (let legacy = 0; legacy <= Math.min(2, actual); legacy += 1) {
      const stateAttempts = actual - legacy;
      const virtual = controls.virtualizeWordChallengeUsage(legacy, stateAttempts, allowed);
      assert.equal(
        virtual.virtualTotal < 2,
        actual < allowed,
        `word challenge gate mismatch: actual=${actual}, allowed=${allowed}, legacy=${legacy}`
      );
      if (actual < allowed) {
        const aggregateAfterCompletion = legacy
          + virtual.virtualState
          + 1
          + virtual.residualBonus;
        assert.equal(
          aggregateAfterCompletion,
          actual + 1,
          `word challenge persistence mismatch: actual=${actual}, allowed=${allowed}, legacy=${legacy}`
        );
      }
    }
  }
}


const completedState = {
  version: 1,
  words: { apple: { reviewCount: 1 } },
  session: {
    date,
    cursor: 2,
    completed: true,
    rewardGranted: true,
    plan: [
      { wordKey: 'apple', phase: 'screening', taskType: 'wordToMeaning', status: 'completed', result: 'D' },
      { wordKey: 'book', phase: 'review', taskType: 'audioToWord', confirmationTaskType: 'meaningToWord', outcomeDetail: 'usageWeak', status: 'completed', result: 'H' }
    ]
  }
};
const reset = controls.resetAdventureSessionForAttempt(completedState, date, 2);
assert.equal(reset.session.completed, false);
assert.equal(reset.session.cursor, 0);
assert.equal(reset.session.attemptIndex, 2);
assert.equal(reset.session.rewardGranted, false);
assert.deepEqual(reset.session.plan.map(item => item.status), ['pending', 'pending']);
assert.deepEqual(reset.session.plan.map(item => item.result), ['', '']);
assert.deepEqual(reset.session.plan.map(item => item.taskType), ['', '']);
assert.equal(completedState.session.completed, true, 'reset must not mutate source state');
assert.equal(controls.resetAdventureSessionForAttempt(completedState, '2026-08-01', 2), null);

console.log('student activity controls tests passed');

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'studentActivityControls.js'), 'utf8');
const rewardsSource = fs.readFileSync(path.join(root, 'js', 'studentRewards.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(source, /data-coin-delta="-1"/);
assert.match(source, /data-coin-delta="1"/);
assert.match(source, /data-coin-delta="10"/);
assert.match(source, />自定义调整<\/button>/);
assert.match(source, /data-attempt-delta="1"/);
assert.match(source, /data-attempt-delta="2"/);
assert.match(source, /金币总数：\$\{coinTotal\}　次数总数：\$\{attemptTotal\}/);
assert.doesNotMatch(source, /撤回|补发了|已补发/);
assert.match(source, /value="vocabularyChallenge">单词挑战/);
assert.match(source, /value="grammarChallenge">语法挑战/);
assert.match(source, /value="classroomPractice">随堂练习/);
assert.match(source, /value="adventure">词汇探险/);
assert.match(main, /studentActivityStartup = loadFeatureScript\('js\/studentActivityControls\.js'\)/);
assert.match(main, /window\.ensureTeacherActivityPanel\?\.\(\)/);
assert.ok(
  main.indexOf("loadFeatureScript('js/studentActivityControls.js')")
    < main.indexOf("loadFeatureScript('js/masterVocabularyLibrary.js')"),
  'teacher coin controls must start before unrelated optional startup enhancements'
);
assert.equal(
  (main.match(/loadFeatureScript\('js\/studentActivityControls\.js'\)/g) || []).length,
  1,
  'student activity controls must have one independent startup request'
);
assert.match(source, /root\.ensureTeacherActivityPanel = installTeacherPanel;\s*if \(isTeacherMode\(\)\) installTeacherPanel\(\);/);
assert.match(serviceWorker, /const APP_SHELL_CACHE = 'xxzcard-app-shell-v\d+'/);
assert.doesNotMatch(serviceWorker, /\.\/js\/studentActivityControls\.js/);
assert.match(source, /id="teacherActivityCustomWrap" hidden/);
assert.match(source, /id="teacherActivityCustomConfirm">确定/);
assert.doesNotMatch(source, /root\.prompt|window\.prompt/);
assert.match(source, /activityAwareLoadVocabularyAdventureState\(user, \.\.\.args\)/);
assert.match(source, /activityAwareSaveVocabularyAdventureState\(nextState, \.\.\.saveArgs\)/);
assert.match(source, /runtime\.rawSaveAdventureState\(prepared, \.\.\.saveArgs\)/);
assert.match(source, /wrappedSave\.__vteCoordinatorWrapped = runtime\.rawSaveAdventureState\.__vteCoordinatorWrapped === true/);
assert.match(source, /\['adventure', 'adventurePlayer', 'adventureChallenge', 'teacherTools'\]\.includes\(group\)/);
assert.match(
  rewardsSource,
  /typeof root\.refreshTeacherActivityPanel === 'function' \|\| document\.getElementById\('teacherActivityPanel'\)/,
  'the legacy reward panel must stay suppressed once the unified teacher activity controller is available'
);
