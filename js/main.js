// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
(async () => {
  try {
    if (typeof loadFeatureScript === 'function') {
      await loadFeatureScript('js/studentRewards.js');
      await loadFeatureScript('js/studentRewardReconcile.js');
    }
  } catch (error) {
    console.warn('student reward enhancements unavailable', error && (error.message || error));
  }
  if (currentUser === 'teacher') { document.body.classList.add('is-teacher'); }
  appData = await initData();
  await loadHome();
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }, { once: true });
}
