(function installStudentRewardReconciliation(root) {
  if (!root || typeof document === 'undefined' || root.__studentRewardReconciliationInstalled) return;
  root.__studentRewardReconciliationInstalled = true;

  function todayKey() {
    const date = new Date();
    return date.getFullYear() + '-'
      + String(date.getMonth() + 1).padStart(2, '0') + '-'
      + String(date.getDate()).padStart(2, '0');
  }

  function currentStudent() {
    if (root.currentUser === 'brother' || root.currentUser === 'sister') return root.currentUser;
    try {
      return typeof currentUser !== 'undefined' && currentUser === 'brother' ? 'brother' : 'sister';
    } catch (_) {
      return root.currentUser === 'brother' ? 'brother' : 'sister';
    }
  }

  async function reconcileVocabularyChallengeReward(student, adventure) {
    if (typeof root.settleVocabularyChallengeReward !== 'function'
      && typeof root.loadFeatureScript === 'function') {
      try {
        await root.loadFeatureScript('js/studentVocabularyRewardSettlement.js');
      } catch (error) {
        console.warn('Vocabulary challenge reward settlement module unavailable', error);
      }
    }
    if (typeof root.settleVocabularyChallengeReward !== 'function') return false;
    const result = await root.settleVocabularyChallengeReward({
      user: student,
      adventureState: adventure,
      silent: true
    });
    return result && result.ok !== false;
  }

  async function reconcileStudentRewards(user) {
    const getValue = typeof root.sbGetRemote === 'function'
      ? root.sbGetRemote.bind(root)
      : typeof root.sbGet === 'function' ? root.sbGet.bind(root) : null;
    if (!getValue || typeof root.recordStudentRewardSource !== 'function') return false;
    const student = user === 'brother' ? 'brother' : 'sister';
    const requestedStudent = root.isTeacher?.() ? '' : currentStudent();
    const today = todayKey();
    try {
      const [adventure, classroom] = await Promise.all([
        getValue(`vocab_adventure_v1_${student}`),
        getValue(`classroom_practice_daily_v1_${student}`)
      ]);
      if (requestedStudent && currentStudent() !== requestedStudent) return false;
      const session = adventure && adventure.session;
      const planLength = session && Array.isArray(session.plan) ? session.plan.length : 0;
      if (session && session.date === today && (session.completed === true || (planLength > 0 && Number(session.cursor) >= planLength))) {
        await root.recordStudentRewardSource(student, 'adventure', 5, 'set');
      }

      const challengeOk = await reconcileVocabularyChallengeReward(student, adventure);
      if (requestedStudent && currentStudent() !== requestedStudent) return false;

      const classroomToday = classroom && classroom[today];
      if (classroomToday && classroomToday.status === 'completed') {
        await root.recordStudentRewardSource(student, 'classroomPractice', 10, 'set');
      }
      return challengeOk;
    } catch (error) {
      console.warn('Unable to reconcile completed student rewards', error);
      return false;
    }
  }

  const originalLoadHome = root.loadHome;
  if (typeof originalLoadHome === 'function') {
    root.loadHome = async function reconciledHome(...args) {
      const result = await originalLoadHome.apply(this, args);
      if (root.isTeacher?.()) {
        await Promise.all(['sister', 'brother'].map(reconcileStudentRewards));
        await root.refreshTeacherRewardPanel?.();
      } else {
        await reconcileStudentRewards(currentStudent());
        await root.loadStudentRewardSummary?.();
      }
      return result;
    };
  }

  root.reconcileStudentRewards = reconcileStudentRewards;
})(typeof globalThis !== 'undefined' ? globalThis : this);
