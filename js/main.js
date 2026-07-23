// Load the focused home-navigation override after the shared stylesheet.
const homeNavigationStylesheet = document.createElement('link');
homeNavigationStylesheet.rel = 'stylesheet';
homeNavigationStylesheet.href = 'styles-home-nav.css';
homeNavigationStylesheet.dataset.homeNavigationLayout = 'four-columns';
document.head.appendChild(homeNavigationStylesheet);

// EXPOSE TO WINDOW (required by inline event handlers)
// ══════════════════════════════════════
Object.assign(window, {
  switchUser, showScreen, showNewBatch, showImportMore, previewParse, confirmImport,
  startStudy, toggleFlip, judge,
  startGlobalPool, startGlobalRandom, startGlobalDailyQuiz,
  startDailyQuiz, selectDQOpt, confirmDQAnswer, nextDQ, speakWord,
  showMergeSelect, startMergeStudy, startMergeMode, startMergeDailyQuiz,
  startTodayReview, startTodayChallenge, startMixedReview, startMixedChallenge,
  openWordTaskMenu, closeWordTaskMenu, startWordTaskMenuReview, startWordTaskMenuChallenge,
  startBatchReview, startBatchChallenge, finishReviewToSource, confirmExitChallenge,
  startReviewMatchPlay, nextWrongReviewCard,
  openStudentWordCard, studentWordNav, showTeacherMixSelect, selectTaskAssignmentOption,
  openGrammarChallengeList, closeGrammarChallengeList, openGrammarChallenge, closeGrammarChallenge,
  openThemeQuizList, openThemeQuiz, closeThemeQuiz,
  openTeacherWordCards, returnToTeacherHome, closeBatchDetail, closeBatchImport, closeMergeSelect,
  openCoursewareList, openCourseware, closeCourseware,
  openGrammarLibrary, closeGrammarLibrary,
  openWordDedupe, closeWordDedupe,
  openVocabularyReviewList, closeVocabularyReviewList, startVocabularyReview, closeVocabularyReviewPlayer,
  setVocabularyReviewMode, changeVocabularyReviewWord, speakVocabularyReviewWord,
  shuffleVocabularyReviewCards, markVocabularyReviewWordRemembered, restoreVocabularyReviewWord,
  openVocabularyScreening, startVocabularyScreening, answerVocabularyScreening,
  retryVocabularyScreeningDerivation, closeVocabularyScreening,
  openWordCards, openPhonemeTraining, speakEnglish,
  showRename, confirmRename, onTitleTap, showSync, confirmSync, showPush, togglePush,
  toggleEditPanel, showWordSelector, openCardEditor, editNav, saveCardEdit, deleteCard,
  doDictionarySearch, openDictionaryResult, openBatchWordCard, jumpToWordLink,
  closeAllModals, deleteBatch, goDetail, retryResult,
  pinInput, pinDel, cancelPin,
});

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
(async () => {
  if (currentUser === 'teacher') { document.body.classList.add('is-teacher'); }
  appData = await initData();
  await loadHome();
})();