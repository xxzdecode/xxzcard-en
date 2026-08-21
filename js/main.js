// Install the vocabulary question-type compatibility layer before any lazy
// adventure module can load. Other feature groups keep their original loader.
(function installVocabularyQuestionTypesRepeatLoader(root) {
  if (!root || typeof root.loadFeatureGroup !== 'function' || typeof root.loadFeatureScript !== 'function') return;
  const originalLoadFeatureGroup = root.loadFeatureGroup;
  const patchedLoadFeatureGroup = function patchedLoadFeatureGroup(group) {
    if (!['adventurePlayer', 'adventureChallenge'].includes(group)) {
      return originalLoadFeatureGroup(group);
    }
    return root.loadFeatureScript('js/vocabularyQuestionTypesRepeatBootstrap.js')
      .then(() => group === 'adventureChallenge'
        ? root.loadFeatureScript('js/vocabularyLessonGroups.js')
        : null)
      .then(() => root.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup(group, originalLoadFeatureGroup))
      .then(result => group === 'adventureChallenge'
        ? root.loadFeatureScript('js/vocabularyAdventureLessonQueue.js').then(() => result)
        : result)
      .then(async result => {
        if (group !== 'adventureChallenge') return result;
        // Answer persistence is local-first, so there is no longer a slow cloud
        // write that accidentally gives the feedback coordinator time to load.
        // Make the two small feedback modules part of the challenge entry gate
        // so every first tap can advance automatically, even on a cold start.
        await Promise.all([
          root.loadFeatureScript('js/vocabularyFeedbackErrorUI.js'),
          root.loadFeatureScript('js/vocabularyFeedbackSaveCoordinator.js')
        ]);
        root.VocabularyFeedbackErrorUI?.afterFeatureGroup?.(group);
        root.VocabularyFeedbackSaveCoordinator?.afterFeatureGroup?.(group);
        return result;
      })
      .then(result => {
        root.installVocabularyAdventurePreviewLatestGuard?.();
        return result;
      });
  };
  root.loadFeatureGroup = patchedLoadFeatureGroup;
  try { loadFeatureGroup = patchedLoadFeatureGroup; } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);

// Record the latest selected choice before inline answer handlers run. The
// save-aware feedback layer uses this exact index for the teaching page.
(function installVocabularyChoiceCapture(root) {
  if (!root || !root.document || root.__vocabularyChoiceCaptureInstalled) return;
  root.__vocabularyChoiceCaptureInstalled = true;
  root.document.addEventListener('click', event => {
    const button = event.target?.closest?.(
      '#screenVocabularyAdventure .vocabulary-adventure-options button,'
      + '#screenVocabularyAdventureChallenge .vocabulary-adventure-options button'
    );
    if (!button || button.disabled) return;
    const options = [...button.closest('.vocabulary-adventure-options').querySelectorAll('button')];
    root.__vocabularyPracticeLastSelection = {
      mode: button.closest('#screenVocabularyAdventureChallenge') ? 'challenge' : 'adventure',
      index: options.indexOf(button),
      selectedAt: Date.now()
    };
  }, true);
})(typeof window !== 'undefined' ? window : globalThis);

// Give the word challenge the same soft purple, pink and mint atmosphere used
// by the formal grammar challenge. Answer option colors remain the adventure palette.
(function installVocabularyChallengeGrammarPalette(root) {
  if (!root || !root.document || root.document.getElementById('vocabularyChallengeGrammarPalette')) return;
  const style = root.document.createElement('style');
  style.id = 'vocabularyChallengeGrammarPalette';
  style.textContent = `
    #screenVocabularyAdventureChallenge{
      background:
        radial-gradient(circle at 8% 8%,rgba(255,233,241,.9),transparent 28rem),
        radial-gradient(circle at 95% 95%,rgba(232,250,239,.95),transparent 30rem),
        linear-gradient(150deg,#f4efff 0%,#f9fbff 52%,#effaf5 100%);
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-topbar,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-feedback{
      border-color:rgba(101,73,159,.14);
      background:rgba(255,255,255,.9);
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-exit{
      background:#f0ebff;
      color:#65499f;
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-progress-row,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-progress-row strong{
      color:#65499f;
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-progress-row.is-secondary{
      color:#6d7886;
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-progress-track{
      background:#eee9f8;
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-progress-track span{
      background:linear-gradient(90deg,#b092e8,#83c8aa);
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-question,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-result,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-terminal,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-loading,
    #screenVocabularyAdventureChallenge .vte-shell{
      border-color:rgba(101,73,159,.12);
      box-shadow:0 14px 42px rgba(101,73,159,.13);
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-question-label,
    #screenVocabularyAdventureChallenge .vocabulary-adventure-instruction{
      color:#65499f;
    }
    #screenVocabularyAdventureChallenge .vocabulary-adventure-feedback button{
      background:linear-gradient(135deg,#987bd7,#7658ba);
      box-shadow:0 8px 20px rgba(118,88,186,.24);
    }
  `;
  root.document.head.appendChild(style);
})(typeof window !== 'undefined' ? window : globalThis);

// Replace the challenge module's home preview with a latest-request-only
// renderer. It waits for all state reads before touching the DOM, so an older
// same-user request cannot restore an obsolete "continue" cursor.
(function exposeVocabularyAdventurePreviewLatestGuard(root) {
  if (!root || root.__vocabularyAdventurePreviewGuardExposed) return;
  root.__vocabularyAdventurePreviewGuardExposed = true;
  let previewRequestId = 0;

  function studentUser() {
    return typeof currentUser !== 'undefined' && ['sister', 'brother'].includes(currentUser)
      ? currentUser
      : '';
  }

  function setLegacyHomeHidden(hidden) {
    const node = root.document?.getElementById('homeQuickActions');
    if (!node) return;
    node.hidden = hidden;
    node.style.display = hidden ? 'none' : '';
  }

  function installVocabularyAdventurePreviewLatestGuard() {
    const challengeApi = root.VocabularyAdventureChallenge;
    const coreApi = root.VocabularyAdventureCore;
    if (!challengeApi
        || typeof challengeApi.challengeHomeStatus !== 'function'
        || !coreApi
        || typeof coreApi.localDateKey !== 'function'
        || typeof root.loadVocabularyAdventureState !== 'function'
        || typeof root.collectVisibleVocabularyAdventureCandidates !== 'function') {
      return false;
    }
    if (root.updateVocabularyAdventurePreviewEntry?.__latestRequestGuarded) return true;

    const guarded = async function updateVocabularyAdventurePreviewEntryLatest() {
      const requestId = ++previewRequestId;
      const wrapper = root.document.getElementById('studentDashboard');
      const adventureButton = root.document.getElementById('vocabularyAdventurePreviewEntry');
      const user = studentUser();
      const enabled = !!user;
      if (wrapper) wrapper.hidden = !enabled;
      if (adventureButton) adventureButton.hidden = !enabled;
      setLegacyHomeHidden(enabled);
      if (!enabled) return;

      const [state, legacy] = await Promise.all([
        root.loadVocabularyAdventureState(user),
        typeof root.getVocabularyAdventureLegacyChallengeUsage === 'function'
          ? root.getVocabularyAdventureLegacyChallengeUsage()
          : Promise.resolve({ attempts: 0, bestScore: 0 })
      ]);
      if (requestId !== previewRequestId || user !== studentUser()) return;

      let candidates = [];
      root.__vocabularyChallengeCandidateExpansion = true;
      try {
        candidates = root.collectVisibleVocabularyAdventureCandidates();
      } finally {
        root.__vocabularyChallengeCandidateExpansion = false;
      }
      if (requestId !== previewRequestId || user !== studentUser()) return;

      const session = state && state.session;
      const adventureTitle = root.document.getElementById('vocabularyAdventureHomeTitle');
      const adventureSub = root.document.getElementById('vocabularyAdventureHomeSub');
      const adventureStatus = root.document.getElementById('vocabularyAdventureHomeStatus');
      if (adventureTitle) adventureTitle.textContent = '词汇探险';
      if (adventureSub) adventureSub.textContent = '完成今日路线';
      if (adventureStatus) {
        adventureStatus.textContent = session
          ? session.completed
            ? '今日已完成'
            : `继续探险 · ${session.cursor}/${session.plan.length}`
          : '未开始';
      }

      const status = challengeApi.challengeHomeStatus({
        state,
        candidates,
        today: coreApi.localDateKey(new Date()),
        legacyAttempts: legacy && legacy.attempts,
        legacyBestScore: legacy && legacy.bestScore
      });
      if (requestId !== previewRequestId || user !== studentUser()) return;

      const challengeButton = root.document.getElementById('vocabularyAdventureChallengeEntry');
      const challengeTitle = root.document.getElementById('vocabularyAdventureChallengeHomeTitle');
      const challengeSub = root.document.getElementById('vocabularyAdventureChallengeHomeSub');
      if (challengeButton) {
        challengeButton.disabled = status.state === 'locked' || status.state === 'insufficient';
        challengeButton.dataset.state = status.state;
        challengeButton.setAttribute('aria-label', `单词挑战，${status.text}，最高10金币`);
      }
      if (challengeTitle) challengeTitle.textContent = '单词挑战';
      if (challengeSub) challengeSub.textContent = status.text;
    };
    guarded.__latestRequestGuarded = true;
    root.updateVocabularyAdventurePreviewEntry = guarded;
    try { updateVocabularyAdventurePreviewEntry = guarded; } catch (_) {}
    return true;
  }

  root.installVocabularyAdventurePreviewLatestGuard = installVocabularyAdventurePreviewLatestGuard;
  installVocabularyAdventurePreviewLatestGuard();
})(typeof window !== 'undefined' ? window : globalThis);

// Render the mirrored home state immediately. Remote reward/classroom refreshes
// run together in the background and are guarded by user + request id, so an
// older response cannot replace the newest state after exits or user switches.
(function installHomeRefreshCoordinator(root) {
  if (!root || root.__homeRefreshCoordinatorInstalled || typeof root.loadHome !== 'function') return;
  root.__homeRefreshCoordinatorInstalled = true;

  const renderReward = root.applyStudentRewardRecord;
  const renderClassroom = root.applyStudentClassroomPracticeHomeRecord;
  let requestId = 0;
  let rerunRequested = false;
  let activePromise = null;

  function studentUser() {
    return typeof currentUser !== 'undefined' && ['sister', 'brother'].includes(currentUser)
      ? currentUser
      : '';
  }

  function isCurrent(user, id) {
    return id === requestId
      && user === studentUser()
      && !(typeof isTeacher === 'function' && isTeacher());
  }

  function renderCachedReward(user, id) {
    if (!isCurrent(user, id) || typeof renderReward !== 'function') return;
    const key = studentRewardKey(user);
    renderReward(getMirrorValue(key));
  }

  async function refreshRewardFromCloud(user, id) {
    if (!isCurrent(user, id) || typeof renderReward !== 'function') return;
    const key = studentRewardKey(user);
    try {
      const remote = await sbGetRemote(key);
      if (isCurrent(user, id) && remote && typeof remote === 'object') {
        renderReward(remote);
      }
    } catch (_) {
      // The mirrored value remains visible when the remote refresh fails.
    }
  }

  function renderCachedClassroom(user, id) {
    if (!isCurrent(user, id) || typeof renderClassroom !== 'function') return;
    const key = STUDENT_CLASSROOM_PRACTICE_HOME_KEY_PREFIX + user;
    const local = getMirrorValue(key);
    renderClassroom(local && typeof local === 'object' ? local[todayISO()] : null);
  }

  async function refreshClassroomFromCloud(user, id) {
    if (!isCurrent(user, id) || typeof renderClassroom !== 'function') return;
    const key = STUDENT_CLASSROOM_PRACTICE_HOME_KEY_PREFIX + user;
    try {
      const remote = await sbGetRemote(key);
      if (!isCurrent(user, id)) return;
      const record = remote && typeof remote === 'object' ? remote[todayISO()] : null;
      renderClassroom(record);
    } catch (_) {
      // The mirrored daily state remains visible when the remote refresh fails.
    }
  }

  function refreshHomeFromCloud(user, id) {
    const jobs = [
      refreshRewardFromCloud(user, id),
      refreshClassroomFromCloud(user, id)
    ];
    if (typeof root.updateVocabularyAdventurePreviewEntry === 'function') {
      jobs.push(root.updateVocabularyAdventurePreviewEntry());
    }
    return Promise.allSettled(jobs);
  }

  function performHomeLoad(user, id) {
    updateUserBar();
    if (currentUser === 'teacher') document.body.classList.add('is-teacher');
    else document.body.classList.remove('is-teacher');
    if (!user) {
      root.refreshTeacherDashboardSummaries?.();
      return Promise.resolve();
    }

    renderCachedReward(user, id);
    renderCachedClassroom(user, id);

    const notice = document.getElementById('studentHomeNotice');
    if (notice) {
      notice.hidden = true;
      notice.textContent = '';
    }

    Promise.resolve()
      .then(() => refreshHomeFromCloud(user, id))
      .catch(error => console.warn('home background refresh unavailable', error && (error.message || error)));
    return Promise.resolve();
  }

  const coordinatedLoadHome = function coordinatedLoadHome() {
    requestId += 1;
    rerunRequested = true;
    if (activePromise) return activePromise;

    activePromise = (async () => {
      while (rerunRequested) {
        rerunRequested = false;
        const id = requestId;
        const user = studentUser();
        await performHomeLoad(user, id);
      }
    })().finally(() => {
      activePromise = null;
      if (rerunRequested) coordinatedLoadHome();
    });
    return activePromise;
  };

  root.loadHome = coordinatedLoadHome;
  try { loadHome = coordinatedLoadHome; } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
(async () => {
  let dailyRouteStartup = Promise.resolve(null);
  let studentActivityStartup = Promise.resolve(null);
  let startupEnhancements = Promise.resolve(null);

  function showDailyRouteStartupLoading() {
    if (currentUser === 'teacher' || typeof document.getElementById !== 'function') return;
    const grammar = document.getElementById('grammarChallengeHomeEntry');
    const classroom = document.getElementById('studentClassroomPracticeEntry');
    const setLoading = (entry, copy) => {
      if (!entry) return;
      entry.disabled = true;
      entry.dataset.routeState = 'loading';
      entry.setAttribute('aria-busy', 'true');
      const subtitle = entry.querySelector?.('.student-home-card__copy small');
      if (subtitle) subtitle.textContent = copy;
    };
    setLoading(grammar, '正在读取上一节课内容…');
    setLoading(classroom, '正在读取今天的新课…');
    const classroomStatus = document.getElementById('studentClassroomPracticeStatus');
    if (classroomStatus) classroomStatus.textContent = '正在读取';
  }

  showDailyRouteStartupLoading();
  try {
    if (typeof loadFeatureScript === 'function') {
      // The teacher coin/attempt panel is a primary home control. Start it
      // independently so an unrelated optional enhancement cannot delay or
      // suppress the panel on a cold or weak-network load.
      studentActivityStartup = loadFeatureScript('js/studentActivityControls.js')
        .then(() => {
          window.ensureTeacherActivityPanel?.();
          return loadFeatureScript('js/studentActivityControlsCompactUI.js');
        })
        .catch(error => {
          console.warn('student activity controls unavailable', error && (error.message || error));
          return null;
        });

      // Install the teacher-selected route authority before the first route
      // request. A cold start must not race ahead with the static fallback.
      await loadFeatureScript('js/dailyLearningRouteOverride.js').catch(error => {
        console.warn('manual learning selection unavailable', error && (error.message || error));
      });

      // Start the tiny current-route request before loading any optional
      // startup script. The helper consumes this promise when it becomes ready,
      // so the route request and script loading happen in parallel.
      if (currentUser !== 'teacher' && typeof fetch === 'function') {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = window.setTimeout(() => controller && controller.abort(), 2800);
        window.__dailyLearningRoutePrefetchPromise = fetch(
          `data/daily-learning-route.json?fresh=${Date.now()}`,
          {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined,
            headers: { Accept: 'application/json' }
          }
        ).then(response => {
          if (!response.ok) throw new Error(`route HTTP ${response.status}`);
          return response.json();
        }).finally(() => window.clearTimeout(timer));
        window.__dailyLearningRoutePrefetchPromise.catch(() => {});
      }

      dailyRouteStartup = loadFeatureScript('js/dailyLearningRoute.js')
        .then(() => window.startDailyLearningRoute?.())
        .catch(error => {
          console.warn('daily learning route unavailable', error && (error.message || error));
          return null;
        });

      // Only storage and master-card normalization are required before the
      // first home render. Load them together; reward/history enhancements
      // must never hold a cached home screen behind slow optional requests.
      await Promise.all([
        loadFeatureScript('js/storageResilience.js'),
        loadFeatureScript('js/masterVocabularyLibrary.js')
      ]);
    }
  } catch (error) {
    console.warn('critical startup helper unavailable', error && (error.message || error));
  }
  if (currentUser === 'teacher') { document.body.classList.add('is-teacher'); }
  appData = await initData();
  window.appData = appData;
  await loadHome();

  if (typeof loadFeatureScript === 'function') {
    const rewardEnhancements = loadFeatureScript('js/studentRewards.js')
      .then(() => loadFeatureScript('js/studentRewardLayoutGuard.js'))
      .then(() => loadFeatureScript('js/studentRewardReconcile.js'));
    startupEnhancements = Promise.allSettled([
      rewardEnhancements,
      loadFeatureScript('js/grammarChallengeRecords.js'),
      loadFeatureScript('js/vocabularyFeedbackSaveCoordinator.js')
    ]).then(async results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.warn('startup enhancement unavailable', result.reason && (result.reason.message || result.reason));
        }
      });
      const home = document.getElementById('screenHome');
      if (home && home.classList.contains('active')) {
        await loadHome({ background: true, reason: 'startup-enhancements-ready' });
      }
    });
  }
  dailyRouteStartup.catch(() => {});
  studentActivityStartup.catch(() => {});
  startupEnhancements.catch(() => {});
})();

if ('serviceWorker' in navigator) {
  const registerServiceWorkerWhenReady = () => {
    const register = () => navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
      .then(registration => registration.update().catch(() => {}))
      .catch(() => {});
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(register, { timeout: 1500 });
    } else {
      window.setTimeout(register, 0);
    }
  };
  if (document.readyState === 'complete') registerServiceWorkerWhenReady();
  else window.addEventListener('load', registerServiceWorkerWhenReady, { once: true });
}
