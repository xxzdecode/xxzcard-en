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
// result context (to know what to retry)
let resultContext = ''; // 'quiz' | 'daily' | 'merge-daily'
let resultMergeMode = '';
// daily task system
let activeTask = null;
let activeTaskDeck = [];
let activeTaskAllCards = [];
let activeTaskReturn = 'home';
let reviewSteps = [], reviewIndex = 0, reviewWrongCards = [], reviewRound = 1;
let reviewMatchSelection = null, reviewMatchPairsDone = 0;
let reviewMatchLocked = false;
let reviewSortPicked = [];
let reviewWrongIndex = 0;
let wordListExpanded = true;
let studentWordCards = [], studentWordIndex = 0;
// PIN
let pinBuffer = '';
let pinMode = '';
let pinTemp = '';
