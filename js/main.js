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
      .then(() => root.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup(group, originalLoadFeatureGroup));
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

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
(async () => {
  let dailyRouteStartup = Promise.resolve(null);
  let teacherToolsWarmup = Promise.resolve(null);

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
      try {
        await loadFeatureScript('js/storageResilience.js');
      } catch (error) {
        console.warn('storage resilience unavailable', error && (error.message || error));
      }
      try {
        await loadFeatureScript('js/vocabularyFeedbackSaveCoordinator.js');
      } catch (error) {
        console.warn('vocabulary feedback save coordinator unavailable', error && (error.message || error));
      }

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

      // Warm the word-card scripts while the main Supabase data is loading.
      // Viewing stays cache-first, while the final helper restores remote-fresh
      // records for study modes that can write known/unknown progress.
      if (typeof loadFeatureGroup === 'function') {
        teacherToolsWarmup = loadFeatureGroup('teacherTools')
          .then(() => loadFeatureScript('js/wordCardPerformance.js'))
          .then(() => loadFeatureScript('js/wordCardStudySafety.js'))
          .catch(error => {
            console.warn('word-card warmup unavailable', error && (error.message || error));
            return null;
          });
      }

      await loadFeatureScript('js/masterVocabularyLibrary.js');
      await loadFeatureScript('js/studentRewards.js');
      await loadFeatureScript('js/studentRewardLayoutGuard.js');
      await loadFeatureScript('js/studentRewardReconcile.js');
      await loadFeatureScript('js/studentActivityControls.js');
      await loadFeatureScript('js/studentActivityControlsCompactUI.js');
      await loadFeatureScript('js/grammarChallengeRecords.js');
    }
  } catch (error) {
    console.warn('startup enhancements unavailable', error && (error.message || error));
  }
  if (currentUser === 'teacher') { document.body.classList.add('is-teacher'); }
  appData = await initData();
  window.appData = appData;
  await loadHome();
  dailyRouteStartup.catch(() => {});
  teacherToolsWarmup.catch(() => {});
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }, { once: true });
}
