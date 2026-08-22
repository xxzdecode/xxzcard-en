const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const adaptive = require('../js/grammarAdaptiveChallenge.js');
const generatedBank = require('../grammar-challenge/data/question-bank.js');

function question(lesson, lessonDate, index, options = {}) {
  const group = Math.floor(index / 4);
  const id = `${lesson}::Q${String(index + 1).padStart(2, '0')}`;
  return {
    id,
    bankItemId: id,
    sourceLessonKey: lesson,
    sourceLessonKpIds: [lesson],
    sourceChallengeDate: lessonDate,
    kpIds: [options.kpId || lesson],
    primaryKpId: options.kpId || lesson,
    weaknessIds: options.weaknessId ? [options.weaknessId] : [],
    primaryWeaknessId: options.weaknessId || '',
    diagnosticTargets: [],
    contentHash: `sha256:${lesson}:${index}`,
    variantGroupId: options.weaknessId || `${lesson}::group-${group}`,
    category: `group-${group}`,
    type: 'single',
    prompt: `${lesson} question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answer: 'A'
  };
}

const recentItems = Array.from({ length: 24 }, (_, index) => question('recent-kp', '2026-08-20', index));
const historyItems = Array.from({ length: 48 }, (_, index) => question('history-kp', '2026-08-10', index, {
  kpId: index % 2 ? 'history-kp-a' : 'history-kp-b',
  weaknessId: index < 12 ? 'brother.history-kp.target' : ''
}));
const bank = {
  schemaVersion: 1,
  version: 'fixture-v1',
  items: [...recentItems, ...historyItems]
};
const progress = {
  topics: {
    'recent-kp': { status: 'confirmed_complete', last_lesson_date: '2026-08-20' },
    'history-kp': { status: 'confirmed_complete', last_lesson_date: '2026-08-10' },
    'history-kp-a': { status: 'confirmed_complete', last_lesson_date: '2026-08-10' },
    'history-kp-b': { status: 'confirmed_complete', last_lesson_date: '2026-08-10' },
    future: { status: 'materials_ready', last_lesson_date: '2026-08-21' }
  }
};
const weaknessView = {
  students: {
    brother: {
      groups: [{
        kpId: 'history-kp',
        items: [{ weaknessId: 'brother.history-kp.target', status: 'active' }]
      }]
    },
    sister: { groups: [] }
  }
};

const settings = {
  bank,
  progress,
  weaknessView,
  grammarWeakSummary: { weakKpIds: ['history-kp-b'] },
  student: 'brother',
  date: '2026-08-21',
  startedAt: '2026-08-21T08:00:00.000Z'
};
const first = adaptive.buildSession(settings);
const repeated = adaptive.buildSession(settings);
assert.equal(first.ok, true);
assert.deepEqual(repeated, first, 'same student and date must receive the same frozen plan');
assert.equal(first.session.items.length, 15);
assert.equal(first.session.items.filter(item => item.bucket === 'recent').length, 8);
assert.equal(first.session.items.filter(item => item.bucket === 'history').length, 7);
assert.equal(first.session.items.filter(item => item.reason === 'priority').length, 6);
assert.equal(new Set(first.session.items.map(item => item.bankItemId)).size, 15);
assert.equal(first.session.recentLessonDate, '2026-08-20');
assert.equal(first.session.recentLessonKey, 'recent-kp');

const manuallySelected = adaptive.buildSession({
  ...settings,
  recentLessonKey: 'history-kp'
});
assert.equal(manuallySelected.ok, true);
assert.equal(manuallySelected.session.recentLessonKey, 'history-kp');
assert.equal(manuallySelected.session.items.filter(item => item.bucket === 'recent').length, 8);
assert.ok(
  manuallySelected.session.items
    .filter(item => item.bucket === 'recent')
    .every(item => item.bankItemId.startsWith('history-kp::')),
  'the teacher-selected grammar lesson must be the recent half of the challenge'
);

const sister = adaptive.buildSession({ ...settings, student: 'sister' });
assert.equal(sister.ok, true);
assert.notEqual(sister.session.seed, first.session.seed);
assert.notDeepEqual(
  sister.session.items.map(item => item.bankItemId),
  first.session.items.map(item => item.bankItemId),
  'student identity must influence the deterministic order'
);

const sisterWeaknessView = {
  students: {
    sister: {
      groups: [{
        items: [{ weaknessId: 'sister.history-kp.target', status: 'active' }]
      }]
    }
  }
};
const sisterTargeted = adaptive.buildSession({
  ...settings,
  student: 'sister',
  weaknessView: sisterWeaknessView,
  grammarWeakSummary: null
});
assert.equal(sisterTargeted.ok, true);
const sisterQuestions = adaptive.questionsForSession(sisterTargeted.session, bank);
assert.ok(sisterQuestions.some(item => item.primaryWeaknessId === 'sister.history-kp.target'));
assert.ok(sisterQuestions.every(item => !item.primaryWeaknessId.startsWith('brother.')));

const current = first.session.items[0];
const beforeIds = first.session.items.map(item => item.bankItemId);
const wrong = adaptive.applyAnswer(first.session, {
  bank,
  questionId: current.bankItemId,
  correct: false,
  answeredAt: '2026-08-21T08:01:00.000Z'
});
assert.equal(wrong.session.items.length, 15);
assert.equal(wrong.session.cursor, 1);
assert.ok(wrong.replacement, 'an early wrong answer should schedule a parallel question');
assert.ok(wrong.replacement.slot >= adaptive.RECHECK_GAP);
assert.equal(wrong.session.items[wrong.replacement.slot].bucket, current.bucket);
assert.equal(wrong.session.items[wrong.replacement.slot].reason, 'recheck');
assert.equal(wrong.session.items[wrong.replacement.slot].recheckOf, current.bankItemId);
assert.notEqual(wrong.session.items[wrong.replacement.slot].bankItemId, beforeIds[wrong.replacement.slot]);

const late = adaptive.normalizeSession(first.session, bank);
late.items.forEach((item, index) => {
  if (index < 13) {
    item.status = 'answered';
    item.firstTryCorrect = true;
    item.answeredAt = '2026-08-21T08:00:00.000Z';
  }
});
late.cursor = 13;
const lateWrong = adaptive.applyAnswer(late, {
  bank,
  questionId: late.items[13].bankItemId,
  correct: false,
  answeredAt: '2026-08-21T08:19:00.000Z'
});
assert.equal(lateWrong.replacement, null, 'late errors must roll into later challenge history instead of exceeding 15 questions');
assert.equal(lateWrong.session.items.length, 15);

assert.ok(generatedBank.items.length >= 100, 'compiled bank should contain the existing reusable challenge questions');
assert.equal(new Set(generatedBank.items.map(item => item.bankItemId)).size, generatedBank.items.length);
assert.ok(generatedBank.items.every(item => item.id.includes('::') && item.contentHash && item.primaryKpId));

const root = path.join(__dirname, '..');
const lazySource = fs.readFileSync(path.join(root, 'js', 'lazyFeatures.js'), 'utf8');
const dailySource = fs.readFileSync(path.join(root, 'js', 'dailyLearningRoute.js'), 'utf8');
const shellSource = fs.readFileSync(path.join(root, 'grammar-challenge', 'js', 'page-practice-shell.js'), 'utf8');
assert.match(lazySource, /grammarChallenge:[\s\S]*grammarChallenges\.js/);
assert.match(lazySource, /grammarAdaptive:[\s\S]*question-bank\.js[\s\S]*grammarAdaptiveChallenge\.js/);
assert.match(dailySource, /prepareAdaptiveGrammarChallenge/);
assert.match(dailySource, /saveDailyGrammarRecord = saveGrammarRecord/);
assert.match(shellSource, /recordAdaptiveGrammarAnswer/);
assert.match(shellSource, /重试保存/);

(async () => {
  let saveCount = 0;
  const runtimeRoot = {
    GRAMMAR_QUESTION_BANK: bank,
    getMirrorValue(key) {
      if (key === 'grammar_progress') return progress;
      if (key === 'assessment_weakness_view_v1') return weaknessView;
      if (key === 'grammar_challenge_weak_summary_v2_brother') return { weakKpIds: [] };
      return null;
    },
    async loadDailyGrammarRecord() {
      return {
        challengeId: adaptive.CHALLENGE_ID,
        status: 'completed',
        score: 100,
        completedAt: '2026-08-21T09:00:00.000Z'
      };
    },
    async saveDailyGrammarRecord() { saveCount += 1; }
  };
  adaptive.install(runtimeRoot);
  const completed = await runtimeRoot.prepareAdaptiveGrammarChallenge({
    user: 'brother',
    date: '2026-08-21',
    record: null,
    route: {}
  });
  assert.equal(completed.completed, true, 'a completed record from another device must not be overwritten');
  assert.equal(completed.record.score, 100);
  assert.equal(saveCount, 0);
  console.log('grammarAdaptiveChallenge tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
