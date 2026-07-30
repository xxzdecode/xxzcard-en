(function restoreSafeWordCardStudyStart() {
  'use strict';

  // Viewing a card is cache-first, but a study session can write known/unknown
  // progress. Keep that write path remote-fresh so an older mirror cannot
  // overwrite newer progress from another device.
  window.startStudy = async function startStudyWithFreshRecord(mode) {
    studyIsGlobal = false;
    resultContext = '';
    studyMode = mode;
    const batch = getCurrentBatch();
    if (!batch) return;

    currentUserRec = await loadUserBatch(currentBatchId);
    if (mode === 'all') {
      studyDeck = [...batch.cards];
      document.getElementById('modeLabel').textContent = '📖 全部学习';
    } else if (mode === 'shuffle') {
      studyDeck = [...batch.cards].sort(() => Math.random() - 0.5);
      document.getElementById('modeLabel').textContent = '🔀 随机模式';
    } else if (mode === 'pool') {
      studyDeck = batch.cards
        .filter(card => currentUserRec.unknown.includes(getCardWord(card)))
        .sort(() => Math.random() - 0.5);
      document.getElementById('modeLabel').textContent = '💪 生词池';
    }

    studyCurrent = 0;
    studyFlipped = false;
    showScreen('screenStudy');
    renderStudyCard();
  };
})();
