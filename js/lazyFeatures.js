const FEATURE_GROUPS = {
  adventure: [
    'js/vocabularyAdventureCore.js',
    'js/vocabularyAdventure.js',
    'js/vocabularyAdventureReview.js',
    'js/vocabularyAdventurePlayer.js',
    'js/vocabularyAdventureChallenge.js'
  ],
  grammarChallenge: ['grammar-challenge/data/catalog.js', 'js/grammarChallenges.js'],
  themeQuiz: ['js/themeQuizzes.js'],
  courseware: ['js/courseware-data.js', 'js/courseware.js'],
  grammarLibrary: ['js/grammarLibrary.js'],
  teacherTools: [
    'js/dictionary.js',
    'js/batch.js',
    'js/import.js',
    'js/tasks.js',
    'js/review.js',
    'js/study.js',
    'js/quiz.js',
    'js/questionTypes.js',
    'js/taskEngine.js',
    'js/merge.js',
    'js/wordDedupe.js'
  ],
  vocabularyReview: [
    'js/vocabularyReviewData.js',
    'js/vocabularyReview.js',
    'js/vocabularyLesson016.js'
  ],
  vocabularyScreening: ['js/vocabularyScreeningData.js', 'js/vocabularyScreening.js']
};

const loadedFeatureScripts = new Set();
const featureGroupPromises = new Map();

function loadFeatureScript(src) {
  if (loadedFeatureScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => {
      loadedFeatureScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`功能资源加载失败：${src}`));
    document.head.appendChild(script);
  });
}

function loadFeatureGroup(group) {
  if (featureGroupPromises.has(group)) return featureGroupPromises.get(group);
  const sources = FEATURE_GROUPS[group] || [];
  const promise = sources.reduce(
    (chain, src) => chain.then(() => loadFeatureScript(src)),
    Promise.resolve()
  );
  featureGroupPromises.set(group, promise);
  return promise;
}

function installLazyFeatureHandler(name, group) {
  const lazyHandler = async (...args) => {
    try {
      await loadFeatureGroup(group);
      const handler = window[name];
      if (typeof handler !== 'function' || handler === lazyHandler) {
        throw new Error(`功能入口未就绪：${name}`);
      }
      return await handler(...args);
    } catch (error) {
      console.error(error);
      alert('功能加载失败，请检查网络后重试。');
    }
  };
  window[name] = lazyHandler;
}

[
  ['openVocabularyAdventure', 'adventure'],
  ['openVocabularyAdventureChallenge', 'adventure'],
  ['openGrammarChallengeList', 'grammarChallenge'],
  ['openThemeQuizList', 'themeQuiz'],
  ['openCoursewareList', 'courseware'],
  ['openGrammarLibrary', 'grammarLibrary'],
  ['openWordCards', 'teacherTools'],
  ['openPhonemeTraining', 'teacherTools'],
  ['openVocabularyReviewList', 'vocabularyReview'],
  ['openVocabularyScreening', 'vocabularyScreening']
].forEach(([name, group]) => installLazyFeatureHandler(name, group));

const warmAdventure = () => loadFeatureGroup('adventure')
  .then(() => loadHome())
  .catch(error => console.warn('adventure preload skipped', error.message || error));

if (typeof requestIdleCallback === 'function') requestIdleCallback(warmAdventure, { timeout: 1800 });
else setTimeout(warmAdventure, 900);
