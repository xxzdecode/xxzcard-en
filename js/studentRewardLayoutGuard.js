(function installStudentRewardLayoutGuard(root) {
  if (!root || typeof document === 'undefined' || root.__studentRewardLayoutGuardInstalled) return;
  root.__studentRewardLayoutGuardInstalled = true;

  function stabilizeTodayRewardMarkup() {
    const copy = document.querySelector('span.student-today-value__copy');
    if (!copy) return;
    const replacement = document.createElement('div');
    replacement.className = copy.className;
    while (copy.firstChild) replacement.appendChild(copy.firstChild);
    copy.replaceWith(replacement);
  }

  stabilizeTodayRewardMarkup();
  const previousLoadHome = root.loadHome;
  if (typeof previousLoadHome === 'function') {
    root.loadHome = async function guardedRewardLayoutHome(...args) {
      stabilizeTodayRewardMarkup();
      const result = await previousLoadHome.apply(this, args);
      stabilizeTodayRewardMarkup();
      return result;
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);