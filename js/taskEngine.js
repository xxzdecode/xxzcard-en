const TASK_MODES = {
  review: {
    limit: 20,
    start: task => startReviewTask(task)
  },
  challenge: {
    limit: 10,
    start: task => startChallengeTask(task)
  }
};

const TASK_SOURCES = {
  today: {
    async resolve() {
      const batch = getTodayTaskBatch();
      if (!batch) {
        alert('还没有可用的单词卡');
        return null;
      }
      return {
        source: 'today',
        deck: batch.cards,
        allCards: batch.cards,
        returnTo: 'home',
        batchId: batch.id
      };
    }
  },
  mixed: {
    async resolve() {
      const batches = await getMixedTaskBatches();
      if (batches.length === 0) {
        alert('还没有混合词库');
        return null;
      }
      const deck = cardsFromBatches(batches);
      return {
        source: 'mixed',
        deck,
        allCards: deck,
        returnTo: 'home'
      };
    }
  },
  batch: {
    async resolve(options) {
      const batch = appData.batches.find(b => String(b.id) === String(options.batchId));
      if (!batch) return null;
      return {
        source: 'batch',
        deck: batch.cards,
        allCards: batch.cards,
        returnTo: 'detail',
        batchId: batch.id
      };
    }
  }
};

const TASK_TITLES = {
  review: {
    today: '今日温习',
    mixed: '混合温习',
    batch: '今日温习'
  },
  challenge: {
    today: '今日挑战',
    mixed: '混合挑战',
    batch: '今日挑战'
  }
};

function taskKeyFor(source, mode, batchId) {
  if (source === 'today') return mode === 'review' ? 'todayReview' : 'todayChallenge';
  if (source === 'mixed') return mode === 'review' ? 'mixedReview' : 'mixedChallenge';
  return (mode === 'review' ? 'batchReview_' : 'batchChallenge_') + batchId;
}

async function startTask(options) {
  const source = TASK_SOURCES[options.source];
  const mode = TASK_MODES[options.mode];
  if (!source || !mode) return;
  const resolved = await source.resolve(options);
  if (!resolved) return;
  const task = {
    key: taskKeyFor(options.source, options.mode, resolved.batchId),
    title: TASK_TITLES[options.mode][options.source],
    deck: resolved.deck,
    allCards: resolved.allCards,
    returnTo: resolved.returnTo,
    batchId: resolved.batchId
  };
  await mode.start(task);
}

function beginTaskRuntime(task, mode, deck) {
  activeTask = {...task, mode};
  activeTaskDeck = deck;
  activeTaskAllCards = task.allCards && task.allCards.length >= 4 ? task.allCards : deck;
  activeTaskReturn = task.returnTo || 'home';
  activeChallengeRecorded = false;
  challengeAttemptSaving = false;
  if (task.batchId) currentBatchId = String(task.batchId);
}

async function startReviewTask(task) {
  const deck = await prioritizedTaskDeck(task.deck, TASK_MODES.review.limit, task.batchId);
  if (deck.length === 0) {
    alert('还没有单词可以温习');
    return;
  }
  beginTaskRuntime(task, 'review', deck);
  reviewRound = 1;
  reviewWrongCards = [];
  buildReviewSteps(deck);
  showScreen('screenReview');
  renderReviewStep();
}

async function startChallengeTask(task) {
  if (!await canStartChallenge(task.key)) {
    alert('今天这个挑战已经做满 2 次啦，明天再来！');
    return;
  }
  const deck = await prioritizedTaskDeck(task.deck, TASK_MODES.challenge.limit, task.batchId);
  if (deck.length === 0) {
    alert('还没有单词可以挑战');
    return;
  }
  beginTaskRuntime(task, 'challenge', deck);
  if (task.batchId) currentUserRec = await loadUserBatch(currentBatchId);
  resultContext = 'task-challenge';
  dqQuestions = deck.map(card => makeTaskChallengeQuestion(card, activeTaskAllCards));
  dqIndex = 0;
  dqCorrect = 0;
  dqWrongList = [];
  dqSelectedOpt = null;
  const label = document.querySelector('#screenDailyQuiz .mode-label');
  if (label) label.textContent = '🏁 ' + task.title;
  showScreen('screenDailyQuiz');
  renderDQQuestion();
}

async function startTodayReview() {
  await startTask({ source: 'today', mode: 'review' });
}

async function startTodayChallenge() {
  await startTask({ source: 'today', mode: 'challenge' });
}

async function startMixedReview() {
  await startTask({ source: 'mixed', mode: 'review' });
}

async function startMixedChallenge() {
  await startTask({ source: 'mixed', mode: 'challenge' });
}

async function startBatchReview(batchId) {
  await startTask({ source: 'batch', mode: 'review', batchId });
}

async function startBatchChallenge(batchId) {
  await startTask({ source: 'batch', mode: 'challenge', batchId });
}
