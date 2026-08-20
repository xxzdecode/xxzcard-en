const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const records = require('../js/grammarChallengeRecords.js');

const {
  STATUS,
  DEFAULT_RULES,
  historyKey,
  summaryKey,
  activeKey,
  createAttempt,
  updateAttemptProgress,
  finalizeAttempt,
  normalizeHistory,
  upsertAttempt,
  calculateKpStats,
  buildWeakSummary,
  buildWeaknessEvidence,
  normalizeRules,
  inlineQuestionCorrect,
  shellQuestionCorrect
} = records;

assert.equal(historyKey('sister'), 'grammar_challenge_history_v2_sister');
assert.equal(historyKey('brother'), 'grammar_challenge_history_v2_brother');
assert.notEqual(historyKey('sister'), historyKey('brother'));
assert.equal(summaryKey('sister'), 'grammar_challenge_weak_summary_v2_sister');
assert.equal(activeKey('brother'), 'grammar_challenge_active_v2_brother');
assert.deepEqual(normalizeRules({ weakThreshold: 75 }), {
  weakThreshold: 75,
  recentCompletedAttempts: 3,
  recentWrongQuestionLimit: 5
});
assert.equal(DEFAULT_RULES.weakThreshold, 80);

function makeCompleted({
  student = 'sister',
  id,
  at,
  lessonKey = 'simple-present',
  kp = 'third-person-singular',
  answers
}) {
  let attempt = createAttempt({
    challengeId: 'grammar-test',
    challengeTitle: '测试挑战',
    challengeDate: at.slice(0, 10),
    lessonKey,
    kpIds: [kp],
    totalQuestions: answers.length
  }, {
    student,
    attemptId: id,
    attemptOfDay: 1,
    now: at
  });
  attempt = updateAttemptProgress(attempt, {
    totalQuestions: answers.length,
    questions: answers.map((correct, index) => ({
      questionId: `q${index + 1}`,
      kpIds: [kp],
      answered: true,
      correct,
      firstTryCorrect: correct,
      viewedAnswer: !correct,
      answeredAt: at,
      updatedAt: at
    }))
  }, at);
  return finalizeAttempt(attempt, STATUS.COMPLETED, at);
}

let sisterHistory = normalizeHistory(null, 'sister');
const first = makeCompleted({
  id: 'sister-a1',
  at: '2026-07-01T10:00:00.000Z',
  answers: [true, false, true, false, true]
});
let result = upsertAttempt(sisterHistory, first);
sisterHistory = result.history;
assert.equal(result.inserted, true);
assert.equal(sisterHistory.attemptOrder.length, 1);
assert.equal(sisterHistory.attempts['sister-a1'].totalQuestions, 5);
assert.equal(sisterHistory.attempts['sister-a1'].correctQuestions, 3);
assert.equal(sisterHistory.attempts['sister-a1'].score, 60);
assert.deepEqual(sisterHistory.attempts['sister-a1'].wrongQuestionIds, ['q2', 'q4']);
assert.deepEqual(sisterHistory.attempts['sister-a1'].reviewKpIds, ['third-person-singular']);
assert.ok(sisterHistory.attempts['sister-a1'].questions.every(question => question.questionId && question.kpIds.length));

// Same attempt ID is an idempotent upsert, not a second history row.
result = upsertAttempt(sisterHistory, first);
sisterHistory = result.history;
assert.equal(result.inserted, false);
assert.equal(sisterHistory.attemptOrder.length, 1);

// A newer update of the same attempt keeps first-try truth and updates the final result.
const corrected = updateAttemptProgress(first, {
  questions: [{
    questionId: 'q2',
    kpIds: ['third-person-singular'],
    answered: true,
    correct: true,
    firstTryCorrect: false,
    viewedAnswer: true,
    answeredAt: '2026-07-01T10:01:00.000Z',
    updatedAt: '2026-07-01T10:01:00.000Z'
  }]
}, '2026-07-01T10:01:00.000Z');
const mergedCorrected = upsertAttempt(sisterHistory, corrected).history.attempts['sister-a1'];
const q2 = mergedCorrected.questions.find(question => question.questionId === 'q2');
assert.equal(q2.correct, true);
assert.equal(q2.firstTryCorrect, false);
assert.equal(q2.viewedAnswer, true);

// Exact weakness metadata produces auditable pass/fail/practice evidence.
let targeted = createAttempt({
  challengeId: 'grammar-targeted', challengeTitle: '薄弱项复测', challengeDate: '2026-07-08',
  lessonKey: 'sentence-parts', kpIds: ['sentence-parts'], totalQuestions: 4
}, { student: 'brother', attemptId: 'targeted-a1', now: '2026-07-08T08:00:00.000Z' });
targeted = updateAttemptProgress(targeted, {
  totalQuestions: 4,
  questions: [
    {
      questionId: 'pass-1', kpIds: ['sentence-parts'],
      weaknessIds: ['brother.sentence-parts.time-adjunct'],
      primaryWeaknessId: 'brother.sentence-parts.time-adjunct',
      diagnosticTargets: ['time-adjunct'], contentHash: 'sha256:pass-1',
      answered: true, correct: true, firstTryCorrect: true, viewedAnswer: false
    },
    {
      questionId: 'fail-1', kpIds: ['sentence-parts'],
      weaknessIds: ['brother.sentence-parts.time-adjunct'],
      primaryWeaknessId: 'brother.sentence-parts.time-adjunct',
      diagnosticTargets: ['time-adjunct'], contentHash: 'sha256:fail-1',
      answered: true, correct: true, firstTryCorrect: false, viewedAnswer: true
    },
    {
      questionId: 'practice-1', kpIds: ['sentence-parts'],
      weaknessIds: ['brother.sentence-parts.time-adjunct'],
      primaryWeaknessId: 'brother.sentence-parts.time-adjunct',
      diagnosticTargets: ['time-adjunct'], contentHash: 'sha256:practice-1',
      answered: true, correct: true, firstTryCorrect: true, viewedAnswer: true
    },
    {
      questionId: 'untagged', kpIds: ['sentence-parts'],
      answered: true, correct: true, firstTryCorrect: true, viewedAnswer: false
    }
  ]
}, '2026-07-08T08:03:00.000Z');
targeted = finalizeAttempt(targeted, STATUS.COMPLETED, '2026-07-08T08:04:00.000Z');
const targetedEvidence = buildWeaknessEvidence(upsertAttempt(normalizeHistory(null, 'brother'), targeted).history);
assert.equal(targetedEvidence.length, 3);
assert.deepEqual(targetedEvidence.map(item => item.outcome), ['pass', 'fail', 'practice']);
assert.equal(targetedEvidence[0].validForMastery, true);
assert.equal(targetedEvidence[0].weaknessId, 'brother.sentence-parts.time-adjunct');
assert.equal(targetedEvidence[1].validForMastery, false);
assert.equal(targetedEvidence[2].validForMastery, false);
assert.equal(targetedEvidence[0].evidenceId, 'grammar:brother:targeted-a1:pass-1');

// Interrupted attempts can resume with the same attempt ID after a refresh.
const inProgress = createAttempt({
  challengeId: 'grammar-refresh', challengeTitle: '刷新测试', challengeDate: '2026-07-02',
  lessonKey: 'articles', kpIds: ['articles']
}, { student: 'sister', attemptId: 'refresh-one', now: '2026-07-02T08:00:00.000Z' });
const interrupted = finalizeAttempt(inProgress, STATUS.INTERRUPTED, '2026-07-02T08:01:00.000Z');
const resumed = { ...interrupted, status: STATUS.IN_PROGRESS, endedAt: '', updatedAt: '2026-07-02T08:02:00.000Z' };
const resumedMerged = upsertAttempt(upsertAttempt(null, interrupted).history, resumed).attempt;
assert.equal(resumedMerged.status, STATUS.IN_PROGRESS);
assert.equal(resumedMerged.attemptId, 'refresh-one');

// Explicit exit remains available for process review, but is excluded from weak analysis.
let exited = createAttempt({
  challengeId: 'grammar-exit', challengeTitle: '退出测试', challengeDate: '2026-07-03',
  lessonKey: 'articles', kpIds: ['articles'], totalQuestions: 10
}, { student: 'sister', attemptId: 'exit-one', now: '2026-07-03T08:00:00.000Z' });
exited = updateAttemptProgress(exited, {
  totalQuestions: 10,
  questions: [{ questionId: 'e1', kpIds: ['articles'], answered: true, correct: false, firstTryCorrect: false }]
}, '2026-07-03T08:01:00.000Z');
exited = finalizeAttempt(exited, STATUS.EXITED, '2026-07-03T08:02:00.000Z');
sisterHistory = upsertAttempt(sisterHistory, exited).history;
assert.equal(sisterHistory.attempts['exit-one'].status, STATUS.EXITED);

// Multiple completed attempts are retained independently.
[
  ['sister-a2', '2026-07-04T10:00:00.000Z', [true, true, false, true, false]],
  ['sister-a3', '2026-07-05T10:00:00.000Z', [true, true, true, false, true]],
  ['sister-a4', '2026-07-06T10:00:00.000Z', [false, true, true, false, true]]
].forEach(([id, at, answers]) => {
  sisterHistory = upsertAttempt(sisterHistory, makeCompleted({ id, at, answers })).history;
});
assert.equal(sisterHistory.attemptOrder.length, 5);

const stats = calculateKpStats(sisterHistory, { weakThreshold: 80, recentCompletedAttempts: 3 }, '2026-07-07T00:00:00.000Z');
assert.equal(stats.length, 1);
assert.equal(stats[0].kpId, 'third-person-singular');
assert.equal(stats[0].attempts, 20);
assert.equal(stats[0].recentAverageAccuracy, 67);
assert.equal(stats[0].latestScore, 60);
assert.equal(stats[0].consecutiveLowScore, 1);
assert.equal(stats[0].latestWrongAt, '2026-07-06T10:00:00.000Z');
assert.ok(stats[0].recentWrongQuestionIds.length > 0);

const sisterSummary = buildWeakSummary(sisterHistory, 'sister', { weakThreshold: 80 }, '2026-07-07T00:00:00.000Z');
assert.equal(sisterSummary.student, 'sister');
assert.equal(sisterSummary.completedAttemptCount, 4);
assert.deepEqual(sisterSummary.weakKpIds, ['third-person-singular']);
assert.equal(sisterSummary.items[0].lessonKey, 'simple-present');
assert.equal(sisterSummary.items[0].recentAverageAccuracy, 67);
assert.ok(sisterSummary.items[0].priority > 0);

// Brother data is fully independent even when challenge/question IDs match.
let brotherHistory = normalizeHistory(null, 'brother');
brotherHistory = upsertAttempt(brotherHistory, makeCompleted({
  student: 'brother', id: 'brother-a1', at: '2026-07-06T11:00:00.000Z', answers: [true, true, true, true, true]
})).history;
const brotherSummary = buildWeakSummary(brotherHistory, 'brother', { weakThreshold: 80 }, '2026-07-07T00:00:00.000Z');
assert.equal(brotherHistory.student, 'brother');
assert.equal(brotherHistory.attemptOrder.length, 1);
assert.deepEqual(brotherSummary.weakKpIds, []);
assert.equal(sisterHistory.attempts['brother-a1'], undefined);

// The threshold is centralized and adjustable.
assert.deepEqual(buildWeakSummary(sisterHistory, 'sister', { weakThreshold: 60 }).weakKpIds, []);
assert.deepEqual(buildWeakSummary(brotherHistory, 'brother', { weakThreshold: 101 }).threshold, 100);

// Old daily status objects are preserved elsewhere but cannot fabricate detailed results here.
const legacyDailyOnly = normalizeHistory({
  '2026-07-01': { status: 'completed', score: 50, challengeId: 'legacy' }
}, 'sister');
assert.equal(legacyDailyOnly.attemptOrder.length, 0);
assert.deepEqual(buildWeakSummary(legacyDailyOnly, 'sister').weakKpIds, []);

assert.equal(inlineQuestionCorrect({ type: 'single', options: ['a', 'b'], answer: 'b' }, { selectedIndices: [1] }), true);
assert.equal(inlineQuestionCorrect({ type: 'multi', options: ['a', 'b', 'c'], answer: ['a', 'c'] }, { selectedIndices: [0, 2] }), true);
assert.equal(shellQuestionCorrect({ type: 'choice', mode: 'single', correctAnswer: ['Yes'] }, { answer: ['Yes'] }), true);
assert.equal(shellQuestionCorrect({ type: 'order', correctAnswer: ['I', 'am', 'ready'] }, { answer: ['I', 'am', 'ready'] }), true);

const root = path.resolve(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(root, 'js', 'grammarChallengeRecords.js'), 'utf8');
const catalogSource = fs.readFileSync(path.join(root, 'grammar-challenge', 'data', 'catalog.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const controlsSource = fs.readFileSync(path.join(root, 'js', 'studentActivityControls.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(moduleSource, /grammar_challenge_history_v2_/);
assert.match(moduleSource, /grammar_challenge_weak_summary_v2_/);
assert.match(moduleSource, /grammar_challenge_pending_v2_/);
assert.match(moduleSource, /grammar_challenge_active_v2_/);
assert.match(moduleSource, /pagehide/);
assert.match(moduleSource, /STATUS\.EXITED/);
assert.match(moduleSource, /STATUS\.INTERRUPTED/);
assert.match(moduleSource, /attemptId/);
assert.match(moduleSource, /questionKpIds/);
assert.match(moduleSource, /questionWeaknessMetadata/);
assert.match(moduleSource, /buildWeaknessEvidence/);
assert.match(moduleSource, /root\.loadGrammarChallengeWeakSummary/);
assert.match(moduleSource, /root\.setGrammarChallengeWeakRules/);
assert.match(catalogSource, /lessonKey:/);
assert.match(catalogSource, /kpIds:/);
assert.match(catalogSource, /questionPrimaryWeaknessIds/);
for (const date of ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22']) {
  assert.match(catalogSource, new RegExp(`grammar-${date}-`));
  assert.match(catalogSource, new RegExp(`practices/${date}\\.html`));
  assert.doesNotMatch(serviceWorkerSource, new RegExp(`practices/${date}\\.html`));
}
assert.match(mainSource, /studentActivityControls\.js'[\s\S]*grammarChallengeRecords\.js'/);
assert.doesNotMatch(serviceWorkerSource, /\.\/js\/grammarChallengeRecords\.js/);

// Existing attempt controls and teacher adjustment code must remain present.
assert.match(controlsSource, /grammarChallenge: Object\.freeze\(\{ label: '语法挑战', baseAttempts: 1/);
assert.match(controlsSource, /data-attempt-delta="1"/);
assert.match(controlsSource, /data-attempt-delta="2"/);
assert.match(controlsSource, /openGrammarWithAdjustedAttempts/);

console.log('grammar challenge records tests passed');
