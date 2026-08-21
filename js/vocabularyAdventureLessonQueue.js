(function vocabularyAdventureLessonQueueModule(root, factory) {
  const lessonGroups = typeof module === 'object' && module.exports
    ? require('./vocabularyLessonGroups.js')
    : root.VocabularyLessonGroups;
  const taught = typeof module === 'object' && module.exports
    ? require('./vocabularyLessonTaught.js')
    : root;
  const api = factory(lessonGroups, taught);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.VocabularyAdventureLessonQueue = api;
    api.installVocabularyAdventureLessonQueueBrowserPatch(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureLessonQueue(lessonGroups, taught) {
  'use strict';

  function plainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeAdventureWordState(value) {
    const source = plainObject(value) ? value : {};
    return {
      lastResult: ['D', 'H', 'F'].includes(source.lastResult) ? source.lastResult : '',
      intervalIndex: Math.max(0, Math.trunc(Number(source.intervalIndex)) || 0),
      lastReviewedAt: typeof source.lastReviewedAt === 'string' ? source.lastReviewedAt : '',
      nextReviewAt: typeof source.nextReviewAt === 'string' ? source.nextReviewAt : '',
      reviewCount: Math.max(0, Math.trunc(Number(source.reviewCount)) || 0),
      lastTaskType: typeof source.lastTaskType === 'string' ? source.lastTaskType : '',
      challengeFlagAt: typeof source.challengeFlagAt === 'string' ? source.challengeFlagAt : '',
      lessonChallengeAt: typeof source.lessonChallengeAt === 'string' ? source.lessonChallengeAt : ''
    };
  }

  function entriesByWord(taughtState, challengeDate) {
    return new Map(taught.collectTaughtWordEntries(
      taughtState,
      challengeDate ? { challengeDate } : {}
    ).map(entry => [lessonGroups.wordKey(entry.wordKey), entry]));
  }

  function filterTaughtCandidates(candidates, taughtState, challengeDate) {
    const allowed = entriesByWord(taughtState, challengeDate);
    return (Array.isArray(candidates) ? candidates : []).filter(candidate => {
      const key = lessonGroups.wordKey(candidate && (candidate.key || candidate.word));
      return allowed.has(key);
    });
  }

  function decorateAdventureStateForLessonQueue(options) {
    const settings = plainObject(options) ? options : {};
    const today = String(settings.today || '');
    const state = clone(settings.state) || { version: 1, words: {}, session: null };
    if (!plainObject(state.words)) state.words = {};
    const eligible = entriesByWord(settings.taughtState, today);
    const visibleKeys = new Set(
      (Array.isArray(settings.visibleWordKeys) ? settings.visibleWordKeys : [])
        .map(lessonGroups.wordKey)
        .filter(Boolean)
    );

    visibleKeys.forEach(key => {
      const taughtEntry = eligible.get(key);
      if (!taughtEntry) return;
      const previous = normalizeAdventureWordState(state.words[key]);
      const challengedAfterLesson = previous.lessonChallengeAt
        && String(previous.lessonChallengeAt) >= String(taughtEntry.taughtAt || '');
      if (challengedAfterLesson) return;
      state.words[key] = {
        ...previous,
        lastResult: 'F',
        intervalIndex: 0,
        nextReviewAt: today,
        reviewCount: Math.max(1, previous.reviewCount),
        challengeFlagAt: ''
      };
    });

    return { state, eligibleEntries: [...eligible.values()] };
  }

  function mergeChallengeStateIntoOriginal(originalValue, challengeValue) {
    const original = clone(originalValue) || { version: 1, words: {}, session: null };
    const challenge = plainObject(challengeValue) ? challengeValue : {};
    if (!plainObject(original.words)) original.words = {};
    if (Object.prototype.hasOwnProperty.call(challenge, 'challengeSession')) {
      original.challengeSession = clone(challenge.challengeSession);
    }
    if (Object.prototype.hasOwnProperty.call(challenge, 'challengeDaily')) {
      original.challengeDaily = clone(challenge.challengeDaily);
    }
    const completed = challenge.challengeSession && challenge.challengeSession.status === 'completed';
    if (completed && plainObject(challenge.words)) {
      Object.entries(challenge.words).forEach(([rawKey, value]) => {
        const key = lessonGroups.wordKey(rawKey);
        const flag = value && typeof value.challengeFlagAt === 'string' ? value.challengeFlagAt : '';
        if (!key || !flag) return;
        const previous = plainObject(original.words[key]) ? original.words[key] : {};
        original.words[key] = { ...previous, challengeFlagAt: flag };
      });
      (Array.isArray(challenge.challengeSession.items) ? challenge.challengeSession.items : []).forEach(item => {
        const key = lessonGroups.wordKey(item && item.wordKey);
        const answeredAt = item && typeof item.answeredAt === 'string' ? item.answeredAt : '';
        if (!key || !answeredAt || item.status !== 'answered') return;
        const previous = plainObject(original.words[key]) ? original.words[key] : {};
        original.words[key] = { ...previous, lessonChallengeAt: answeredAt };
      });
    }
    return original;
  }

  function installVocabularyAdventureLessonQueueBrowserPatch(target) {
    const root = target || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!root || !lessonGroups || !taught || root.__vocabularyAdventureLessonQueueInstalled) return false;
    if (typeof root.loadVocabularyAdventureState !== 'function'
      || typeof root.saveCurrentVocabularyAdventureState !== 'function'
      || typeof root.collectVisibleVocabularyAdventureCandidates !== 'function') return false;

    root.__vocabularyAdventureLessonQueueInstalled = true;
    const originalLoad = root.loadVocabularyAdventureState;
    const originalSave = root.saveCurrentVocabularyAdventureState;
    const originalCollect = root.collectVisibleVocabularyAdventureCandidates;
    const actualStates = new Map();
    let taughtState = taught.normalizeVocabularyLessonTaughtState(null);
    let candidateMode = 'adventure';
    let candidateDate = '';

    function currentStudent() {
      const user = String(typeof currentUser !== 'undefined' ? currentUser : (root.currentUser || ''));
      return user === 'sister' || user === 'brother' ? user : '';
    }

    function originalVisibleWordKeys() {
      return originalCollect.call(root)
        .map(candidate => lessonGroups.wordKey(candidate && (candidate.key || candidate.word)))
        .filter(Boolean);
    }

    function collectVisibleVocabularyAdventureTaughtCandidates() {
      const challengeDate = candidateMode === 'challenge' ? candidateDate : '';
      return filterTaughtCandidates(originalCollect.apply(root, arguments), taughtState, challengeDate);
    }

    async function loadVocabularyAdventureStateWithLessonQueue(userValue, options) {
      const settings = plainObject(options) ? options : {};
      const user = String(userValue || currentStudent());
      candidateMode = settings.mode === 'challenge' ? 'challenge' : 'adventure';
      candidateDate = lessonGroups.localDateKey(new Date());
      const actual = await originalLoad.call(root, userValue, options);
      taughtState = await taught.loadVocabularyLessonTaughtState({ fresh: settings.requireRemote === true });
      if (!user) return actual;
      actualStates.set(user, clone(actual));
      if (candidateMode !== 'challenge') return actual;
      return decorateAdventureStateForLessonQueue({
        state: actual,
        taughtState,
        today: candidateDate,
        visibleWordKeys: originalVisibleWordKeys()
      }).state;
    }

    async function saveCurrentVocabularyAdventureStateWithLessonQueue(stateValue, ...saveArgs) {
      const user = currentStudent();
      const saveContext = saveArgs[0] && typeof saveArgs[0] === 'object' ? saveArgs[0] : {};
      if (!user || saveContext.mode !== 'challenge') {
        return originalSave.call(root, stateValue, ...saveArgs);
      }
      let actual = actualStates.get(user);
      if (!actual) actual = await originalLoad.call(root, user);
      const merged = mergeChallengeStateIntoOriginal(actual, stateValue);
      const saved = await originalSave.call(root, merged, ...saveArgs);
      if (!saved) return false;
      actualStates.set(user, clone(merged));
      return true;
    }

    saveCurrentVocabularyAdventureStateWithLessonQueue.__vteCoordinatorWrapped =
      originalSave.__vteCoordinatorWrapped === true;

    root.collectVisibleVocabularyAdventureCandidates = collectVisibleVocabularyAdventureTaughtCandidates;
    root.loadVocabularyAdventureState = loadVocabularyAdventureStateWithLessonQueue;
    root.saveCurrentVocabularyAdventureState = saveCurrentVocabularyAdventureStateWithLessonQueue;
    try { collectVisibleVocabularyAdventureCandidates = collectVisibleVocabularyAdventureTaughtCandidates; } catch (_) {}
    try { loadVocabularyAdventureState = loadVocabularyAdventureStateWithLessonQueue; } catch (_) {}
    try { saveCurrentVocabularyAdventureState = saveCurrentVocabularyAdventureStateWithLessonQueue; } catch (_) {}
    return true;
  }

  return Object.freeze({
    filterTaughtCandidates,
    decorateAdventureStateForLessonQueue,
    mergeChallengeStateIntoOriginal,
    installVocabularyAdventureLessonQueueBrowserPatch
  });
});
