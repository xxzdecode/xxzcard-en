// EXPOSE TO WINDOW (required by inline event handlers)
// ══════════════════════════════════════
Object.assign(window, {
  switchUser, showScreen, showNewBatch, showImportMore, previewParse, confirmImport,
  startStudy, toggleFlip, judge,
  startGlobalPool, startGlobalRandom, startGlobalDailyQuiz,
  startDailyQuiz, selectDQOpt, confirmDQAnswer, nextDQ, speakWord, pickDQOrderLetter,
  showMergeSelect, startMergeStudy, startMergeMode, startMergeDailyQuiz,
  startTodayReview, startTodayChallenge, startMixedReview, startMixedChallenge,
  startBatchReview, startBatchChallenge, finishReviewToSource,
  startReviewMatchPlay, nextWrongReviewCard,
  openStudentWordCard, studentWordNav, showTeacherMixSelect, saveTomorrowMixedLibrary,
  openThemeQuizList, openThemeQuiz, closeThemeQuiz,
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
