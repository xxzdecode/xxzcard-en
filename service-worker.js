const APP_SHELL_CACHE = 'xxzcard-app-shell-v73';
const RUNTIME_CACHE = 'xxzcard-runtime-v73';
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
  './js/dailyLearningRouteOverride.js',
  './data/daily-learning-route.json',
  './grammar-challenge/data/catalog.js',
  './js/grammarChallenges.js',
  './grammar-challenge/index.html',
  './grammar-challenge/css/challenge.css',
  './grammar-challenge/css/page-practice.css',
  './grammar-challenge/js/challenge-shell.js',
  './grammar-challenge/js/page-practice-core.js',
  './grammar-challenge/js/page-practice-shell.js',
  './grammar-challenge/data/page-practices/2026-07-31.js',
  './grammar-challenge/data/page-practices/2026-08-01.js',
  './grammar-challenge/practices/2026-08-22.html',
  './grammar-challenge/practices/2026-08-21.html',
  './grammar-challenge/practices/2026-08-20.html',
  './grammar-challenge/practices/2026-08-19.html',
  './grammar-challenge/practices/2026-08-18.html',
  './grammar-challenge/practices/2026-08-06.html',
  './grammar-challenge/practices/2026-08-04.html',
  './grammar-challenge/practices/2026-08-03.html',
  './grammar-challenge/practices/2026-08-02.html',
  './grammar-challenge/practices/2026-08-01.html',
  './grammar-challenge/practices/2026-07-31.html',
  './grammar-challenge/practices/2026-07-30.html',
  './grammar-challenge/practices/2026-07-27.html',
  './grammar-challenge/practices/2026-07-26.html',
  './grammar-challenge/practices/2026-07-25.html',
  './grammar-challenge/practices/2026-07-24-frequency-review.html',
  './grammar-challenge/practices/2026-07-24.html',
  './grammar-challenge/practices/2026-07-23.html',
  './grammar-challenge/practices/2026-07-22-corrected.html',
  './grammar-challenge/practices/2026-07-17-articles.html',
  './grammar-challenge/practices/2026-07-17.html',
  './grammar-challenge/data/2026-07-16.js',
  './grammar-challenge/data/2026-07-15.js',
  './grammar-challenge/practices/courseware-daily.html',
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

async function installAppShellAtomically(urls) {
  await caches.delete(APP_SHELL_CACHE);
  await caches.delete(RUNTIME_CACHE);
  const resources = new Array(urls.length);
  let cursor = 0;
  async function fetchNext() {
    while (cursor < urls.length) {
      const index = cursor++;
      const url = urls[index];
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response || !response.ok) throw new Error(`app-shell HTTP ${response && response.status}: ${url}`);
      const body = await response.arrayBuffer();
      resources[index] = {
        url,
        body,
        init: {
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers.entries()]
        }
      };
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(6, urls.length) },
    () => fetchNext()
  ));
  const cache = await caches.open(APP_SHELL_CACHE);
  for (const resource of resources) {
    await cache.put(resource.url, new Response(resource.body, resource.init));
  }
  const verification = await Promise.all(urls.map(url => cache.match(url)));
  if (verification.some(response => !response)) {
    await caches.delete(APP_SHELL_CACHE);
    throw new Error('app-shell verification failed');
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    installAppShellAtomically(APP_SHELL)
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
  const cached = await matchCurrentGeneration(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function matchCurrentGeneration(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const runtimeMatch = await runtime.match(request, { ignoreSearch: true });
  if (runtimeMatch) return runtimeMatch;
  const shell = await caches.open(APP_SHELL_CACHE);
  return shell.match(request, { ignoreSearch: true });
}

async function refreshStaticAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const response = await fetch(request, { cache: 'no-cache' });
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function cachedNavigation(request) {
  const direct = await matchCurrentGeneration(request);
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

// Prefer the fresh route, but keep the route bundled with this exact app-shell
// generation as a bounded fallback. The page also refreshes its last valid
// route in the background, so entry never depends on this request finishing.
async function dailyRouteNetworkOnly(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (response && response.ok) return response;
    const cached = await matchCurrentGeneration(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'route_unavailable' }), {
      status: response ? response.status : 503,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const cached = await matchCurrentGeneration(request);
    if (cached) return cached;
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
      matchCurrentGeneration(event.request),
      event,
      () => new Response('', { status: 503 })
    ));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  }
});
