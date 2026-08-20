'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const feedback = require('../js/vocabularyFeedbackErrorUI.js');
const settlement = require('../js/studentVocabularyRewardSettlement.js');

const choice = {
  ok: true,
  interaction: 'choice',
  wordKey: 'cup',
  options: [{ label: '杯子' }, { label: '帽子' }],
  correctIndex: 0
};

// A historical completed challenge must never steal feedback from the visible
// adventure operation. This is the brother-only production state that the old
// cursor-based inference misclassified.
const combinedState = {
  challengeSession: {
    date: '2026-08-08',
    attemptIndex: 1,
    cursor: 10,
    status: 'completed',
    items: Array.from({ length: 10 }, (_, index) => ({
      wordKey: `challenge-${index}`,
      status: 'answered',
      correct: true,
      userAnswer: 0,
      question: choice
    }))
  },
  words: { cup: { lastResult: 'D' } },
  session: {
    date: '2026-08-08',
    cursor: 1,
    completed: false,
    plan: [{ wordKey: 'cup', status: 'completed', result: 'D', taskType: 'wordToMeaning' }]
  }
};

const adventureResult = feedback.extractSavedResult(combinedState, {
  mode: 'adventure',
  snapshot: '<button class="is-correct">杯子</button>',
  selectedAnswer: 0,
  questionContext: { question: choice }
});
assert.equal(adventureResult.mode, 'adventure');
assert.equal(adventureResult.wordKey, 'cup');

const coordinatorSource = fs.readFileSync(path.join(root, 'js/vocabularyFeedbackSaveCoordinator.js'), 'utf8');
const playerSource = fs.readFileSync(path.join(root, 'js/vocabularyAdventurePlayer.js'), 'utf8');
const challengeSource = fs.readFileSync(path.join(root, 'js/vocabularyAdventureChallenge.js'), 'utf8');
const queueSource = fs.readFileSync(path.join(root, 'js/vocabularyAdventureLessonQueue.js'), 'utf8');
const activitySource = fs.readFileSync(path.join(root, 'js/studentActivityControls.js'), 'utf8');

assert.match(coordinatorSource, /saveContext\.mode/);
assert.doesNotMatch(coordinatorSource, /challengeSession\.cursor\)\s*>\s*0/);
assert.match(playerSource, /mode:\s*'adventure'/);
assert.match(challengeSource, /mode:\s*'challenge'/);
assert.match(queueSource, /saveContext\.mode\s*!==\s*'challenge'/);
assert.match(activitySource, /saveContext\.mode/);
assert.match(activitySource, /openStudentGrammarChallengeBase/);
assert.match(activitySource, /baseEntry\.apply\(this, arguments\)/);
assert.match(activitySource, /__dailyRouteAssignmentWrapped/);
assert.match(activitySource, /__dailyRouteAssignmentOriginal\s*=\s*openGrammarWithAdjustedAttempts/);
assert.match(activitySource, /__dailyRouteAssignmentOriginal\s*=\s*openClassroomWithAdjustedAttempts/);

// A historical 100-point daily best is conclusive completion evidence even if
// a later attempt has replaced challengeSession. It must be self-healable.
const legacyPerfect = {
  challengeDaily: { date: '2026-08-08', attempts: 2, bestScore: 100 },
  challengeSession: {
    date: '2026-08-08', attemptIndex: 2, status: 'active', cursor: 0,
    correctCount: 0, items: []
  }
};
const rewardApi = {
  challengeRewardAmount(_user, score, max) { return Math.round((score / 100) * max); },
  normalizeDay(value) {
    return {
      ...(value || {}),
      sources: { vocabularyChallenge: 0, ...value?.sources },
      claims: { ...value?.claims },
      teacherSourceOverrides: { ...value?.teacherSourceOverrides }
    };
  },
  normalizeRewardRecord(value) {
    return { totalCoins: 0, daily: {}, transactions: [], ...(value || {}) };
  }
};
const legacyAudit = settlement.auditVocabularyChallengeReward({
  user: 'sister', adventureState: legacyPerfect, rewardRecord: null, rewardApi
});
assert.equal(legacyAudit.valid, true);
assert.equal(legacyAudit.challengeCompleted, true);
assert.equal(legacyAudit.perfectRepairEligible, true);
assert.match(legacyAudit.completionTransactionId, /sister.*2026-08-08/);

// New completions remain durable after a second attempt replaces the session.
const completed = settlement.prepareAdventureStateForVocabularyChallengeSave({
  challengeDaily: { date: '2026-08-08', attempts: 1, bestScore: 100 },
  challengeSession: {
    date: '2026-08-08', attemptIndex: 1, status: 'completed', correctCount: 10,
    completedAt: '2026-08-08T10:00:00.000Z'
  }
}, null, { user: 'sister' });
const replaced = settlement.prepareAdventureStateForVocabularyChallengeSave(legacyPerfect, completed, { user: 'sister' });
assert.equal(replaced.challengeDaily.completions.length, 1);
assert.equal(replaced.challengeDaily.completions[0].score, 100);
assert.match(replaced.challengeDaily.completions[0].transactionId, /sister.*2026-08-08/);

const rewardsSource = fs.readFileSync(path.join(root, 'js/studentRewards.js'), 'utf8');
const claimFunction = rewardsSource.match(/async function claimHomeReward[\s\S]*?function installChestHandlers/);
assert.ok(claimFunction, 'claimHomeReward source must be locatable');
assert.match(claimFunction[0], /settleVocabularyChallengeReward/);
assert.match(claimFunction[0], /NOT_CLAIMABLE/);
assert.match(claimFunction[0], /showHomeNotice/);

const routeSource = fs.readFileSync(path.join(root, 'js/dailyLearningRoute.js'), 'utf8');
const overrideSource = fs.readFileSync(path.join(root, 'js/dailyLearningRouteOverride.js'), 'utf8');
assert.match(routeSource, /DAILY_ROUTE_CACHE_KEY/);
assert.match(routeSource, /readCachedRoute/);
assert.match(routeSource, /refresh.*background/i);
assert.match(routeSource, /getMirrorValue/);
assert.match(routeSource, /activeGrammarStudent/);
assert.match(routeSource, /state\.grammarRecordStudent === student/);
assert.match(routeSource, /currentStudent\(\) !== user/);
assert.match(routeSource, /openStudentGrammarChallengeBase/);
assert.match(overrideSource, /readCachedOverride/);
assert.match(overrideSource, /syncPinnedSlotInBackground/);
assert.match(overrideSource, /warmPracticeAssets/);
assert.match(overrideSource, /wrapped\.__dailyRouteAssignmentOriginal\.apply\(this, arguments\)/);

const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
assert.match(serviceWorker, /xxzcard-app-shell-v78/);
assert.match(serviceWorker, /xxzcard-runtime-v78/);
assert.doesNotMatch(serviceWorker, /Promise\.allSettled\(urls/);
assert.match(serviceWorker, /installAppShellAtomically/);
assert.match(serviceWorker, /match\(request, \{ ignoreSearch: true \}\)/);
assert.match(serviceWorker, /response\.arrayBuffer\(\)/);
assert.match(serviceWorker, /APP_SHELL_FETCH_CONCURRENCY = 2/);
assert.match(serviceWorker, /Math\.min\(APP_SHELL_FETCH_CONCURRENCY, urls\.length\)/);
assert.match(serviceWorker, /async function cachedNavigation\(request\)[\s\S]*?matchCurrentGeneration\(request\)/);
assert.match(serviceWorker, /'\.\/js\/grammarChallenges\.js'/);
assert.match(serviceWorker, /'\.\/grammar-challenge\/data\/page-practices\/2026-07-31\.js'/);
assert.match(serviceWorker, /'\.\/grammar-challenge\/data\/page-practices\/2026-08-01\.js'/);
assert.match(serviceWorker, /'\.\/grammar-challenge\/practices\/courseware-daily\.html'/);
assert.match(serviceWorker, /'\.\/grammar-challenge\/practices\/2026-08-06\.html'/);
assert.match(serviceWorker, /'\.\/grammar-challenge\/data\/2026-07-16\.js'/);
assert.doesNotMatch(serviceWorker, /caches\.match\(event\.request\)/);

console.log('student runtime root-fix regression tests passed');
