const VOCABULARY_REVIEW_CACHE = 'vocabulary-review-v10';
const VOCABULARY_REVIEW_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/config.js',
  './js/state.js',
  './js/repository.js',
  './js/utils.js',
  './js/dictionary.js',
  './js/auth.js',
  './js/home.js',
  './js/themeQuizzes.js',
  './js/courseware-data.js',
  './js/courseware.js',
  './js/batch.js',
  './js/import.js',
  './js/tasks.js',
  './js/review.js',
  './js/study.js',
  './js/quiz.js',
  './js/questionTypes.js',
  './js/taskEngine.js',
  './js/merge.js',
  './js/wordDedupe.js',
  './js/vocabularyReviewData.js',
  './js/vocabularyReview.js',
  './js/vocabularyScreeningData.js',
  './js/vocabularyScreening.js',
  './js/main.js',
  './assets/vocabulary-review/line.webp',
  './assets/vocabulary-review/cucumber.webp',
  './assets/vocabulary-review/bonnet.webp',
  './assets/vocabulary-review/messy.webp',
  './assets/vocabulary-review/polish.webp',
  './assets/vocabulary-review/puddle.webp',
  './assets/vocabulary-review/soapy.webp',
  './assets/vocabulary-review/sponge.webp',
  './assets/vocabulary-review/naughty.webp',
  './assets/vocabulary-review/handsome.webp',
  './assets/vocabulary-review/mirror.webp',
  './assets/vocabulary-review/lab.webp',
  './assets/vocabulary-review/poor.webp',
  './assets/vocabulary-review/ship.webp',
  './assets/vocabulary-review/tidy.webp',
  './assets/vocabulary-review/mess.webp',
  './assets/vocabulary-review/weak.webp',
  './assets/vocabulary-review/culture.webp',
  './assets/vocabulary-review/divide.webp',
  './assets/vocabulary-review/foreign.webp',
  './assets/vocabulary-review/collect.webp',
  './assets/vocabulary-review/information.webp',
  './assets/vocabulary-review/tradition.webp',
  './assets/vocabulary-review/festival.webp',
  './assets/vocabulary-review/celebration.webp',
  './assets/vocabulary-review/origami.webp',
  './assets/vocabulary-review/challenging.webp',
  './assets/vocabulary-review/practice.webp',
  './assets/vocabulary-review/nervous.webp',
  './assets/vocabulary-review/power.webp',
  './assets/vocabulary-review/go.webp',
  './assets/vocabulary-review/despite.webp',
  './assets/vocabulary-review/difficulty.webp',
  './assets/vocabulary-review/insist.webp',
  './assets/vocabulary-review/task.webp',
  './assets/vocabulary-review/hold.webp',
  './assets/vocabulary-review/speech.webp',
  './assets/vocabulary-review/contest.webp',
  './assets/vocabulary-review/exhibit.webp',
  './assets/vocabulary-review/numerous.webp',
  './assets/vocabulary-review/valuable.webp'
];
const VOCABULARY_REVIEW_URLS = new Set(
  VOCABULARY_REVIEW_ASSETS.map(path => new URL(path, self.location.href).href)
);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VOCABULARY_REVIEW_CACHE)
      .then(cache => cache.addAll(VOCABULARY_REVIEW_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('vocabulary-review-') && key !== VOCABULARY_REVIEW_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isCachedAsset = VOCABULARY_REVIEW_URLS.has(requestUrl.href);
  const isAppNavigation = event.request.mode === 'navigate'
    && requestUrl.origin === self.location.origin
    && requestUrl.pathname.startsWith(new URL('./', self.location.href).pathname);
  if (!isCachedAsset && !isAppNavigation) return;

  const cacheKey = isAppNavigation
    ? new URL('./index.html', self.location.href).href
    : event.request;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(VOCABULARY_REVIEW_CACHE)
            .then(cache => cache.put(cacheKey, copy));
        }
        return response;
      })
      .catch(() => caches.match(cacheKey))
  );
});
