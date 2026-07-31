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
  await loadHome();
  dailyRouteStartup.catch(() => {});
  teacherToolsWarmup.catch(() => {});
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }, { once: true });
}
