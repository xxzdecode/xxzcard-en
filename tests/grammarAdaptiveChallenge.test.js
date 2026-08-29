const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const adaptive = require('../js/grammarAdaptiveChallenge.js');
const generatedBank = require('../grammar-challenge/data/question-bank.js');
const sharedCourseBank = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'grammar-challenge', 'data', 'course-question-banks.json'),
  'utf8'
));

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
  student: 'brother',
  date: '2026-08-21',
  currentLessonKey: 'recent-kp',
  startedAt: '2026-08-21T08:00:00.000Z'
};
const first = adaptive.buildSession(settings);
const repeated = adaptive.buildSession(settings);
assert.equal(first.ok, true);
assert.deepEqual(repeated, first, 'same student and date must receive the same frozen plan');
assert.equal(first.session.items.length, 15);
assert.equal(first.session.items.filter(item => item.reason === 'current').length, 8);
assert.equal(first.session.items.filter(item => item.reason === 'formal-weakness').length, 4);
assert.equal(first.session.items.filter(item => item.reason === 'history').length, 3);
assert.equal(new Set(first.session.items.map(item => item.bankItemId)).size, 15);
assert.equal(first.session.currentLessonKey, 'recent-kp');

const missingManualCourse = adaptive.buildSession({
  ...settings,
  currentLessonKey: ''
});
assert.equal(missingManualCourse.ok, false);
assert.equal(missingManualCourse.code, 'MANUAL_CURRENT_COURSE_REQUIRED');

const manuallySelected = adaptive.buildSession({
  ...settings,
  currentLessonKey: 'history-kp'
});
assert.equal(manuallySelected.ok, true);
assert.equal(manuallySelected.session.currentLessonKey, 'history-kp');
assert.equal(manuallySelected.session.items.filter(item => item.reason === 'current').length, 8);
assert.ok(
  manuallySelected.session.items
    .filter(item => item.reason === 'current')
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
  weaknessView: sisterWeaknessView
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
assert.deepEqual(wrong.session.items.map(item => item.bankItemId), beforeIds, 'correction must not replace scored slots');
assert.ok(wrong.correction, 'a wrong scored answer should enqueue immediate correction');
assert.equal(wrong.session.correctionQueue.length, 1);
const correctionQuestion = adaptive.nextCorrectionQuestion(wrong.session, bank);
assert.ok(correctionQuestion);
assert.equal(correctionQuestion.isCorrection, true);
assert.equal(correctionQuestion.correctionOf, current.bankItemId);
assert.equal(correctionQuestion.variantGroupId, adaptive.questionsForSession(first.session, bank)[0].variantGroupId);
const corrected = adaptive.applyCorrectionAnswer(wrong.session, {
  bank,
  correction: true,
  correctionId: correctionQuestion.correctionId,
  questionId: correctionQuestion.bankItemId,
  correct: true,
  answeredAt: '2026-08-21T08:02:00.000Z'
});
assert.equal(corrected.session.cursor, 1, 'correction must not advance scored-question cursor');
assert.equal(corrected.session.items[0].firstTryCorrect, false, 'correction must not alter first-try evidence');
assert.equal(adaptive.nextCorrectionQuestion(corrected.session, bank), null);

// An in-progress 15-question session from the earlier adaptive algorithm keeps
// its frozen slots and can resume with the new immediate-correction state.
const legacySession = {
  ...first.session,
  schemaVersion: 1,
  algorithmVersion: 1,
  currentLessonKey: undefined,
  recentLessonKey: 'recent-kp',
  items: first.session.items.map(item => ({
    ...item,
    bucket: item.bucket === 'current' ? 'recent' : item.bucket
  })),
  candidateIds: {
    recent: first.session.candidateIds.current,
    history: first.session.candidateIds.history
  }
};
const resumedLegacy = adaptive.normalizeSession(legacySession, bank);
assert.ok(resumedLegacy, 'an existing 15-question session must remain resumable');
assert.equal(resumedLegacy.items.length, 15);
assert.equal(resumedLegacy.items.filter(item => item.bucket === 'current').length, 8);
assert.deepEqual(
  resumedLegacy.items.map(item => item.bankItemId),
  first.session.items.map(item => item.bankItemId),
  'migration must not redraw an in-progress legacy session'
);

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
assert.ok(lateWrong.correction, 'the last scored questions still receive an unscored correction');
assert.equal(lateWrong.session.items.length, 15);
assert.equal(lateWrong.session.status, 'active');

const untaughtItems = Array.from({ length: 8 }, (_, index) => question('untaught-kp', '2026-08-21', index));
const eligibilityBank = { ...bank, items: [...bank.items, ...untaughtItems] };
const priorUntaughtId = untaughtItems[3].bankItemId;
const eligibility = adaptive.buildSession({
  ...settings,
  bank: eligibilityBank,
  history: { attempts: { old: { questions: [{ questionId: priorUntaughtId }] } } }
});
assert.equal(eligibility.ok, true);
assert.ok(eligibility.session.candidateIds.eligible.includes(priorUntaughtId));
assert.ok(
  untaughtItems.filter(item => item.bankItemId !== priorUntaughtId)
    .every(item => !eligibility.session.candidateIds.eligible.includes(item.bankItemId)),
  'selecting or teaching a later course must not unlock unrelated untaught questions'
);

const sharedKpUntaught = Array.from({ length: 8 }, (_, index) => question('untaught-shared-course', '2026-08-22', index, {
  kpId: 'history-kp-a'
}));
const sharedKpEligibility = adaptive.buildSession({
  ...settings,
  bank: { ...bank, items: [...bank.items, ...sharedKpUntaught] }
});
assert.equal(sharedKpEligibility.ok, true);
assert.ok(
  sharedKpUntaught.every(item => !sharedKpEligibility.session.candidateIds.eligible.includes(item.bankItemId)),
  'a completed knowledge point must not unlock a different untaught course that happens to share it'
);

const tooSmallCurrent = adaptive.buildSession({
  ...settings,
  bank: {
    schemaVersion: 1,
    version: 'small-current',
    items: [
      ...Array.from({ length: 10 }, (_, index) => question('small-current', '2026-08-21', index)),
      ...Array.from({ length: 20 }, (_, index) => question('eligible-history', '2026-08-01', index))
    ]
  },
  progress: {
    topics: {
      'eligible-history': { status: 'confirmed_complete', last_lesson_date: '2026-08-01' }
    }
  },
  weaknessView: null,
  currentLessonKey: 'small-current'
});
assert.equal(tooSmallCurrent.ok, false, 'history must not replace a missing current-course fill');
assert.equal(tooSmallCurrent.code, 'INSUFFICIENT_ELIGIBLE_QUESTIONS');

const sharedCatalog = adaptive.normalizeBank({
  schemaVersion: 1,
  version: 'shared-v1',
  courses: [{
    lessonKey: 'comparatives',
    displayTitle: '比较级',
    lessonDate: '2026-08-22',
    classroomPracticeId: 'courseware-comparatives',
    selectable: true,
    questions: Array.from({ length: 20 }, (_, index) => question('comparatives', '2026-08-22', index))
  }]
});
assert.equal(sharedCatalog.items.length, 20);
assert.deepEqual(adaptive.courseCatalog(sharedCatalog)[0], {
  lessonKey: 'comparatives',
  courseKey: 'comparatives',
  questionBankKey: 'comparatives',
  lessonDate: '2026-08-22',
  displayName: '比较级',
  displayTitle: '比较级',
  questionCount: 20,
  classroomPracticeId: 'courseware-comparatives',
  classroomPracticePath: '',
  source: {}
});

const mergedSharedBank = adaptive.mergeBanks(sharedCourseBank, generatedBank);
assert.equal(adaptive.courseCatalog(mergedSharedBank).length, 24);
assert.ok(mergedSharedBank.items.length > 480, 'legacy exact weakness questions remain available as compatibility items');
const generatedSingle = mergedSharedBank.items.find(item => item.bankItemId === 'comparatives::CP03');
assert.equal(generatedSingle.primaryWeaknessId, 'sister.comparatives.short_er');
assert.deepEqual(generatedSingle.diagnosticTargets, ['short_er']);
assert.equal(generatedSingle.formalWeaknessEligible, true);
const generatedComposite = mergedSharedBank.items.find(item => item.bankItemId === 'noun-possessive::CP19');
assert.equal(generatedComposite.primaryKpId, '');
assert.equal(generatedComposite.primaryWeaknessId, '');
assert.deepEqual(generatedComposite.weaknessIds, []);
assert.equal(generatedComposite.formalWeaknessEligible, false);

assert.ok(generatedBank.items.length >= 100, 'compiled bank should contain the existing reusable challenge questions');
assert.equal(new Set(generatedBank.items.map(item => item.bankItemId)).size, generatedBank.items.length);
assert.ok(generatedBank.items.every(item => item.id.includes('::') && item.contentHash && item.primaryKpId));

const root = path.join(__dirname, '..');
const lazySource = fs.readFileSync(path.join(root, 'js', 'lazyFeatures.js'), 'utf8');
const dailySource = fs.readFileSync(path.join(root, 'js', 'dailyLearningRoute.js'), 'utf8');
const shellSource = fs.readFileSync(path.join(root, 'grammar-challenge', 'js', 'page-practice-shell.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(lazySource, /grammarChallenge:[\s\S]*grammarChallenges\.js/);
assert.match(lazySource, /grammarAdaptive:[\s\S]*question-bank\.js[\s\S]*grammarAdaptiveChallenge\.js/);
assert.match(dailySource, /prepareAdaptiveGrammarChallenge/);
assert.match(dailySource, /saveDailyGrammarRecord = saveGrammarRecord/);
assert.match(shellSource, /recordAdaptiveGrammarAnswer/);
assert.match(shellSource, /重试保存/);
assert.match(indexSource, /当前课 8 \+ 薄弱 4 \+ 历史 3/);

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

  const sharedCourses = Array.from({ length: 24 }, (_, courseIndex) => ({
    lessonKey: `prepared-${courseIndex + 1}`,
    displayTitle: `已备课 ${courseIndex + 1}`,
    lessonDate: `2026-08-${String(courseIndex + 1).padStart(2, '0')}`,
    classroomPracticeId: `courseware-${courseIndex + 1}`,
    selectable: true,
    questions: Array.from({ length: 20 }, (_, questionIndex) => question(`prepared-${courseIndex + 1}`, '2026-08-01', questionIndex))
  }));
  let fetchedPath = '';
  const courseRoot = {
    async fetch(path) {
      fetchedPath = path;
      return new Response(JSON.stringify({ schemaVersion: 1, version: 'hub-v1', courses: sharedCourses }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
  adaptive.install(courseRoot);
  const loaded = await courseRoot.loadGrammarCourseQuestionBank();
  assert.equal(fetchedPath, 'grammar-challenge/data/course-question-banks.json');
  assert.equal(adaptive.courseCatalog(loaded).length, 24);
  console.log('grammarAdaptiveChallenge tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
