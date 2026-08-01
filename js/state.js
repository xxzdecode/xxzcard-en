// APP STATE
// ══════════════════════════════════════
let appData = { batches: [], pin: null };
let currentUser = localStorage.getItem('wc_user') || 'sister';
let currentBatchId = null;
let currentUserRec = null;
let studyDeck = [];
let studyIsGlobal = false;
let studyMode = '';
let globalUserRecs = {};
let studyCurrent = 0;
let studyFlipped = false;
let touchStartX = 0, dragging = false, dragX = 0;
// old quiz (spelling)
let currentSlots = [], currentChoices = [], usedChoiceIndices = [], slotAnswers = [], choiceMap = {};
// daily quiz
let dqQuestions = [], dqIndex = 0, dqCorrect = 0, dqWrongList = [];
let dqSelectedOpt = null;
// merge
let mergeSelected = new Set();
let mergeSourceBatches = [];
let taskAssignmentDay = '';
let taskAssignmentType = '';
// result context (to know what to retry)
let resultContext = ''; // 'quiz' | 'daily' | 'merge-daily'
let resultMergeMode = '';
// daily task system
let activeTask = null;
let activeTaskDeck = [];
let activeTaskAllCards = [];
let activeTaskReturn = 'home';
let activeChallengeRecorded = false;
let challengeAttemptSaving = false;
let reviewSteps = [], reviewIndex = 0, reviewWrongCards = [], reviewRound = 1;
let reviewMatchSelection = null, reviewMatchPairsDone = 0;
let reviewMatchLocked = false;
let reviewWrongIndex = 0;
let wordListExpanded = true;
let studentWordCards = [], studentWordIndex = 0;
// PIN
let pinBuffer = '';
let pinMode = '';
let pinTemp = '';

// FIRST-PAINT BOOT GUARD
// The HTML contains safe fallback student content. Keep it hidden until the
// startup pipeline has resolved the actual user and installed local app data,
// so an old/default home screen is never painted before the real home screen.
(function installInitialAppBootGuard(root) {
  if (!root || !root.document) return;
  const document = root.document;
  const html = document.documentElement;
  const body = document.body;
  if (!html || !body) return;

  const student = currentUser === 'brother' ? 'brother' : 'sister';
  html.classList.add('app-booting');
  html.classList.remove('app-ready');
  html.dataset.initialUser = currentUser;
  body.classList.toggle('is-teacher', currentUser === 'teacher');

  if (currentUser !== 'teacher') {
    const name = document.getElementById('studentSummaryName');
    const avatar = document.getElementById('studentSummaryAvatarImage');
    if (name) name.textContent = student === 'brother' ? '弟弟' : '姐姐';
    if (avatar) avatar.src = `assets/student-home/card6/ui/profile/${student}-avatar.png`;
  }

  let finished = false;
  let pollTimer = 0;
  const fallbackTimer = root.setTimeout(finishInitialAppBoot, 8000);

  function finishInitialAppBoot() {
    if (finished) return;
    finished = true;
    if (pollTimer) root.clearTimeout(pollTimer);
    root.clearTimeout(fallbackTimer);
    html.classList.remove('app-booting');
    html.classList.add('app-ready');
  }

  function revealAfterPaint() {
    const schedule = typeof root.requestAnimationFrame === 'function'
      ? root.requestAnimationFrame.bind(root)
      : callback => root.setTimeout(callback, 0);
    schedule(() => schedule(finishInitialAppBoot));
  }

  function waitForInitialData() {
    if (root.appData && typeof root.appData === 'object') {
      revealAfterPaint();
      return;
    }
    pollTimer = root.setTimeout(waitForInitialData, 40);
  }

  root.finishInitialAppBoot = finishInitialAppBoot;
  root.addEventListener?.('pageshow', event => {
    if (event.persisted) finishInitialAppBoot();
  });
  waitForInitialData();
})(typeof window !== 'undefined' ? window : globalThis);
