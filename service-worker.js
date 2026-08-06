const APP_SHELL_CACHE = 'xxzcard-app-shell-v66';
const RUNTIME_CACHE = 'xxzcard-runtime-v66';
const CACHE_PREFIXES = ['xxzcard-', 'vocabulary-review-'];
const APP_SHELL = [
  './index.html',
  './styles.css',
  './styles-vocabulary-adventure.css',
  './styles-vocabulary-adventure-v2.css',
  './styles-home-nav.css',
  './styles-student-home-dashboard.css',
  './styles-wrong-answer-organizer.css',
  './js/config.js',
  './js/runtimeStabilityPatch.js',
  './js/runtimeFeatureLoading.js',
  './js/runtimeHomeStability.js',
  './js/runtimeVocabularyUx.js',
  './js/state.js',
  './js/masterVocabularyLibrary.js',
  './js/repository.js',
  './js/utils.js',
  './js/auth.js',
  './js/home.js',
  './js/lazyFeatures.js',
  './js/teacherDashboardSummaries.js',
  './js/courseware-data.js',
  './js/wrongAnswerOrganizer.js',
  './js/main.js',
  './js/storageResilience.js',
  './js/vocabularyQuestionTypesRepeatBootstrap.js',
  './js/vocabularyAdventureCore.js',
  './js/vocabularyAdventure.js',
  './js/vocabularyAdventureReview.js',
  './js/vocabularyAdventurePlayer.js',
  './js/vocabularyAdventureChallenge.js',
  './js/vocabularyAdventureVisualV2.js',
  './js/vocabularyPracticeUI.js',
  './js/vocabularyFeedbackErrorUI.js',
  './js/vocabularyFeedbackSaveCoordinator.js',
  './js/vocabularyAdventureLessonQueue.js',
  './js/vocabularyLessonGroups.js',
  './data/vocabularyLessonAssets.js',
  './js/dailyLearningRoute.js',
  './js/dictionary.js',
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
  './js/wordCardPerformance.js',
  './js/wordCardStudySafety.js',
  './js/studentRewards.js',
  './js/studentActivityControls.js',
  './js/studentActivityControlsCompactUI.js',
  './js/grammarChallengeRecords.js',
  './js/studentRewardLayoutGuard.js',
  './js/studentRewardReconcile.js',
  './js/studentVocabularyRewardSettlement.js',
  './grammar-library/data/topics.json',
  './grammar-library/data/initial-progress.json',
  './assets/student-home/home-v4/scenes/home-background.webp',
  './assets/student-home/home-v4/scenes/vocabulary-adventure.webp',
  './assets/student-home/home-v4/scenes/word-challenge.webp',
  './assets/student-home/home-v4/scenes/grammar-challenge.webp',
  './assets/student-home/home-v4/scenes/classroom-practice.webp',
  './assets/student-home/home-v4/scenes/new-word-guide.webp',
  './assets/student-home/home-v4/ui/section-plaque.png',
  './assets/student-home/home-v4/ui/student-tag.png',
  './assets/student-home/home-v4/ui/coin-total.png',
  './assets/student-home/home-v4/ui/coin-challenge.png',
  './assets/student-home/home-v4/ui/cleared-stamp.png',
  './assets/student-home/home-v4/ui/chest-idle.png',
  './assets/student-home/home-v4/ui/chest-opening.png',
  './assets/student-home/home-v4/ui/chest-claimed.png',
  './assets/student-home/card6/ui/profile/sister-avatar.png',
  './assets/student-home/card6/ui/profile/brother-avatar.png',
  './assets/student-home/card6/ui/bottom-nav/word-card-icon.png',
  './assets/student-home/card6/ui/bottom-nav/phonetics-icon.png',
  './assets/student-home/card6/ui/bottom-nav/mini-games-icon.png'
];

async function cacheIndividually(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(urls.map(async url => {
    const response = await fetch(url, { cache: 'no-cache' });
    if (response.ok) await cache.put(url, response);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(
    cacheIndividually(APP_SHELL_CACHE, APP_SHELL)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => CACHE_PREFIXES.some(prefix => key.startsWith(prefix)))
        .filter(key => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function refreshStaticAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const response = await fetch(request, { cache: 'no-cache' });
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function cachedNavigation(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const direct = await runtime.match(request);
  if (direct) return direct;
  const appRoot = new URL('./', self.location.href);
  const indexUrl = new URL('./index.html', self.location.href);
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname !== appRoot.pathname && requestUrl.pathname !== indexUrl.pathname) return null;
  const shell = await caches.open(APP_SHELL_CACHE);
  return await shell.match(indexUrl.href) || await shell.match('./index.html') || null;
}

function offlineNavigationResponse() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>暂时无法打开</title><p>当前页面暂时无法离线打开，请联网后重试。</p>',
    { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
  );
}

function staleWhileRevalidate(request, cachedPromise, event, fallback) {
  const refresh = refreshStaticAsset(request);
  event.waitUntil(refresh.then(() => undefined).catch(() => undefined));
  return cachedPromise.then(cached => {
    if (cached) return cached;
    return refresh.catch(() => typeof fallback === 'function' ? fallback() : fallback);
  });
}

// The current lesson route must never fall back to an older cached course.
// It is tiny, so a short network-only request is cheaper and safer than
// rendering stale content. On failure the UI keeps both cards in retry mode.
async function dailyRouteNetworkOnly(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (response && response.ok) return response;
    return new Response(JSON.stringify({ error: 'route_unavailable' }), {
      status: response ? response.status : 503,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'route_unavailable' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const appRoot = new URL('./', self.location.href);
  const isNavigation = event.request.mode === 'navigate'
    && url.origin === appRoot.origin
    && url.pathname.startsWith(appRoot.pathname);
  const isDailyLearningRoute = url.origin === self.location.origin
    && url.pathname.endsWith('/data/daily-learning-route.json');
  const isCodeAsset = url.origin === self.location.origin
    && /\.(?:js|css|html)$/.test(url.pathname);

  if (isNavigation) {
    event.respondWith(staleWhileRevalidate(
      event.request,
      cachedNavigation(event.request),
      event,
      offlineNavigationResponse
    ));
    return;
  }
  if (isDailyLearningRoute) {
    event.respondWith(dailyRouteNetworkOnly(event.request));
    return;
  }
  if (isCodeAsset) {
    event.respondWith(staleWhileRevalidate(
      event.request,
      caches.match(event.request),
      event,
      () => new Response('', { status: 503 })
    ));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  }
});
