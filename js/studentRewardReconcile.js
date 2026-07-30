(function installStudentRewardReconciliation(root) {
  if (!root || typeof document === 'undefined' || root.__studentRewardReconciliationInstalled) return;
  root.__studentRewardReconciliationInstalled = true;
  const reconciled = new Set();

  function todayKey() {
    const date = new Date();
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function currentStudent() {
    try {
      return typeof currentUser !== 'undefined' && currentUser === 'brother' ? 'brother' : 'sister';
    } catch (_) {
      return root.currentUser === 'brother' ? 'brother' : 'sister';
    }
  }

  async function reconcileStudentRewards(user) {
    if (typeof root.sbGet !== 'function' || typeof root.recordStudentRewardSource !== 'function') return false;
    const student = user === 'brother' ? 'brother' : 'sister';
    const today = todayKey();
    const marker = `${student}:${today}`;
    if (reconciled.has(marker)) return true;
    try {
      const [adventure, classroom] = await Promise.all([
        root.sbGet(`vocab_adventure_v1_${student}`),
        root.sbGet(`classroom_practice_daily_v1_${student}`)
      ]);
      const session = adventure && adventure.session;
      const planLength = session && Array.isArray(session.plan) ? session.plan.length : 0;
      if (session && session.date === today && (session.completed === true || (planLength > 0 && Number(session.cursor) >= planLength))) {
        await root.recordStudentRewardSource(student, 'adventure', 10, 'set');
      }
      const challenge = adventure && adventure.challengeSession;
      if (challenge && challenge.date === today && challenge.status === 'completed') {
        const scoreCoins = Math.max(0, Math.min(10, Math.round(Number(challenge.correctCount) || 0)));
        await root.recordStudentRewardSource(student, 'vocabularyChallenge', scoreCoins, 'max');
      }
      const classroomToday = classroom && classroom[today];
      if (classroomToday && classroomToday.status === 'completed') {
        await root.recordStudentRewardSource(student, 'classroomPractice', 10, 'set');
      }
      reconciled.add(marker);
      return true;
    } catch (error) {
      console.warn('Unable to reconcile completed student rewards', error);
      return false;
    }
  }

  const originalLoadHome = root.loadHome;
  if (typeof originalLoadHome === 'function') {
    root.loadHome = async function reconciledHome(...args) {
      const result = await originalLoadHome.apply(this, args);
      if (typeof root.isTeacher === 'function' && root.isTeacher()) {
        await Promise.all(['sister', 'brother'].map(reconcileStudentRewards));
        if (typeof root.refreshTeacherBreakthroughPanel === 'function') {
          await root.refreshTeacherBreakthroughPanel();
        }
      } else {
        await reconcileStudentRewards(currentStudent());
        if (typeof root.loadStudentRewardSummary === 'function') {
          await root.loadStudentRewardSummary();
        }
      }
      return result;
    };
  }

  root.reconcileStudentRewards = reconcileStudentRewards;
})(typeof globalThis !== 'undefined' ? globalThis : this);
