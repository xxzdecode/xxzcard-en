(function vocabularyAdventureLessonQueueModule(root, factory) {
  const lessonGroups = typeof module === 'object' && module.exports
    ? require('./vocabularyLessonGroups.js')
    : root.VocabularyLessonGroups;
  const api = factory(lessonGroups);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.VocabularyAdventureLessonQueue = api;
    api.installVocabularyAdventureLessonQueueBrowserPatch(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureLessonQueue(lessonGroups) {
  'use strict';

  const LESSON_PROGRESS_KEY_PREFIX = 'vocab_lesson_progress_v1_';

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
      challengeFlagAt: typeof source.challengeFlagAt === 'string' ? source.challengeFlagAt : ''
    };
  }

  function lessonProgressKey(user) {
    return `${LESSON_PROGRESS_KEY_PREFIX}${String(user || '')}`;
  }

  function decorateAdventureStateForLessonQueue(options) {
    const settings = plainObject(options) ? options : {};
    const today = String(settings.today || '');
    const state = clone(settings.state) || { version: 1, words: {}, session: null };
    if (!plainObject(state.words)) state.words = {};
    const visibleKeys = new Set(
      (Array.isArray(settings.visibleWordKeys) ? settings.visibleWordKeys : [])
        .map(lessonGroups.wordKey)
        .filter(Boolean)
    );
    const queuedItems = lessonGroups.collectEligibleQueuedWords(settings.progress, today)
      .filter(item => !visibleKeys.size || visibleKeys.has(lessonGroups.wordKey(item.wordKey)));
    const queuedKeys = new Set(queuedItems.map(item => lessonGroups.wordKey(item.wordKey)));
    const futureDate = lessonGroups.addLocalDays(today, 60) || today;

    visibleKeys.forEach(key => {
      if (queuedKeys.has(key)) {
        const previous = normalizeAdventureWordState(state.words[key]);
        state.words[key] = {
          ...previous,
          lastResult: 'F',
          intervalIndex: 0,
          nextReviewAt: today,
          reviewCount: Math.max(1, previous.reviewCount),
          challengeFlagAt: ''
        };
        return;
      }
      const previous = state.words[key];
      if (!plainObject(previous) || Math.max(0, Number(previous.reviewCount) || 0) === 0) return;
      state.words[key] = {
        ...normalizeAdventureWordState(previous),
        lastResult: 'D',
        intervalIndex: 0,
        nextReviewAt: futureDate
      };
    });

    return { state, queuedItems, queuedKeys: [...queuedKeys] };
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
    if (plainObject(challenge.words)) {
      Object.entries(challenge.words).forEach(([rawKey, value]) => {
        const key = lessonGroups.wordKey(rawKey);
        const flag = value && typeof value.challengeFlagAt === 'string' ? value.challengeFlagAt : '';
        if (!key || !flag) return;
        const previous = plainObject(original.words[key]) ? original.words[key] : {};
        original.words[key] = { ...previous, challengeFlagAt: flag };
      });
    }
    return original;
  }

  function consumeCompletedChallengeQueue(progressValue, challengeSession) {
    const progress = lessonGroups.normalizeVocabularyLessonProgress(progressValue);
    const session = plainObject(challengeSession) ? challengeSession : null;
    if (!session || session.status !== 'completed' || !Array.isArray(session.items) || !session.date) {
      return { progress, changed: false, consumedItems: [] };
    }

    const availableByWord = new Map();
    lessonGroups.collectEligibleQueuedWords(progress, session.date).forEach(item => {
      const key = lessonGroups.wordKey(item.wordKey);
      if (!availableByWord.has(key)) availableByWord.set(key, []);
      availableByWord.get(key).push(item);
    });

    const consumedItems = [];
    session.items.forEach(item => {
      const key = lessonGroups.wordKey(item && item.wordKey);
      const queue = availableByWord.get(key);
      if (!queue || !queue.length) return;
      consumedItems.push(queue.shift());
    });
    const result = lessonGroups.consumeQueuedWords(progress, consumedItems);
    return { ...result, consumedItems };
  }

  function installVocabularyAdventureLessonQueueBrowserPatch(target) {
    const root = target || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!root || !lessonGroups || root.__vocabularyAdventureLessonQueueInstalled) return false;
    if (typeof root.loadVocabularyAdventureState !== 'function'
      || typeof root.saveCurrentVocabularyAdventureState !== 'function') return false;

    root.__vocabularyAdventureLessonQueueInstalled = true;
    const originalLoad = root.loadVocabularyAdventureState;
    const originalSave = root.saveCurrentVocabularyAdventureState;
    const actualStates = new Map();
    const progressStates = new Map();

    function screenActive(id) {
      return !!root.document?.getElementById(id)?.classList?.contains('active');
    }

    function currentStudent() {
      const user = String(typeof currentUser !== 'undefined' ? currentUser : (root.currentUser || ''));
      return user === 'sister' || user === 'brother' ? user : '';
    }

    function visibleWordKeys() {
      if (typeof root.collectVisibleVocabularyAdventureCandidates !== 'function') return [];
      return root.collectVisibleVocabularyAdventureCandidates()
        .map(candidate => lessonGroups.wordKey(candidate && (candidate.key || candidate.word)))
        .filter(Boolean);
    }

    async function readProgress(user) {
      if (progressStates.has(user)) return progressStates.get(user);
      let value = null;
      try {
        value = typeof root.sbGet === 'function' ? await root.sbGet(lessonProgressKey(user)) : null;
      } catch (error) {
        console.warn('Vocabulary lesson queue progress load failed', error);
      }
      const normalized = lessonGroups.normalizeVocabularyLessonProgress(value);
      progressStates.set(user, normalized);
      return normalized;
    }

    async function writeProgress(user, progress) {
      const normalized = lessonGroups.normalizeVocabularyLessonProgress(progress);
      progressStates.set(user, normalized);
      if (typeof root.sbSet !== 'function') return false;
      try {
        await root.sbSet(lessonProgressKey(user), normalized);
        return true;
      } catch (error) {
        console.warn('Vocabulary lesson queue progress save failed; next load will repair it.', error);
        return false;
      }
    }

    async function repairCompletedQueue(user, adventureState, progress) {
      const result = consumeCompletedChallengeQueue(progress, adventureState && adventureState.challengeSession);
      if (!result.changed) return result.progress;
      await writeProgress(user, result.progress);
      return result.progress;
    }

    async function loadVocabularyAdventureStateWithLessonQueue(userValue, ...args) {
      const user = String(userValue || currentStudent());
      const actual = await originalLoad.call(root, userValue, ...args);
      if (!user || screenActive('screenVocabularyAdventure')) return actual;
      actualStates.set(user, clone(actual));
      let progress = await readProgress(user);
      progress = await repairCompletedQueue(user, actual, progress);
      progressStates.set(user, progress);
      const today = typeof root.VocabularyAdventureCore?.localDateKey === 'function'
        ? root.VocabularyAdventureCore.localDateKey(new Date())
        : lessonGroups.localDateKey(new Date());
      return decorateAdventureStateForLessonQueue({
        state: actual,
        progress,
        today,
        visibleWordKeys: visibleWordKeys()
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

      const session = merged && merged.challengeSession;
      if (session && session.status === 'completed') {
        const progress = await readProgress(user);
        const result = consumeCompletedChallengeQueue(progress, session);
        if (result.changed) await writeProgress(user, result.progress);
      }
      return true;
    }

    saveCurrentVocabularyAdventureStateWithLessonQueue.__vteCoordinatorWrapped =
      originalSave.__vteCoordinatorWrapped === true;

    root.loadVocabularyAdventureState = loadVocabularyAdventureStateWithLessonQueue;
    root.saveCurrentVocabularyAdventureState = saveCurrentVocabularyAdventureStateWithLessonQueue;
    try { loadVocabularyAdventureState = loadVocabularyAdventureStateWithLessonQueue; } catch (_) {}
    try { saveCurrentVocabularyAdventureState = saveCurrentVocabularyAdventureStateWithLessonQueue; } catch (_) {}
    return true;
  }

  return Object.freeze({
    LESSON_PROGRESS_KEY_PREFIX,
    lessonProgressKey,
    decorateAdventureStateForLessonQueue,
    mergeChallengeStateIntoOriginal,
    consumeCompletedChallengeQueue,
    installVocabularyAdventureLessonQueueBrowserPatch
  });
});
