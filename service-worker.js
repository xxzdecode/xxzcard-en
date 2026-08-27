const APP_SHELL_CACHE = 'xxzcard-app-shell-v98';
const RUNTIME_CACHE = 'xxzcard-runtime-v98';
const CACHE_PREFIXES = ['xxzcard-', 'vocabulary-review-'];
const APP_SHELL_FETCH_CONCURRENCY = 3;
const APP_SHELL = [
  './index.html',
  './styles.css',
  './styles-vocabulary-adventure.css',
  './styles-home-nav.css',
  './styles-student-home-dashboard.css',
  './styles-vocabulary-lesson.css',
  './js/config.js',
  './js/state.js',
  './js/masterVocabularyLibrary.js',
  './js/repository.js',
  './js/utils.js',
  './js/auth.js',
  './js/home.js',
  './js/lazyFeatures.js',
  './js/main.js',
  './js/storageResilience.js',
  './js/vocabularyReviewData.js',
  './js/vocabularyReview.js',
  './js/vocabularyLessonGroups.js',
  './js/vocabularyLessonTaught.js',
  './js/vocabularyLesson016.js',
  './js/vocabularyLessonCategories.js',
  './js/dailyLearningRouteOverride.js',
  './js/dailyLearningRoute.js'
];

async function installAppShellAtomically(urls) {
  await caches.delete(APP_SHELL_CACHE);
  await caches.delete(RUNTIME_CACHE);
  const cache = await caches.open(APP_SHELL_CACHE);
  let cursor = 0;
  async function fetchNext() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response || !response.ok) throw new Error(`app-shell HTTP ${response && response.status}: ${url}`);
      await cache.put(url, response);
    }
  }
  try {
    await Promise.all(Array.from(
      { length: Math.min(APP_SHELL_FETCH_CONCURRENCY, urls.length) },
      () => fetchNext()
    ));
  } catch (error) {
    await caches.delete(APP_SHELL_CACHE);
    throw error;
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

// Prefer the fresh static fallback. The authoritative manual selection and the
// last merged route are stored separately, so the Apple-safe install shell does
// not need another dated route file just to restore an offline restart.
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
    event.respondWith(cacheFirst(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  }
});
