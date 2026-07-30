const APP_SHELL_CACHE = 'xxzcard-app-shell-v45';
const RUNTIME_CACHE = 'xxzcard-runtime-v45';
const CACHE_PREFIXES = ['xxzcard-', 'vocabulary-review-'];
const APP_SHELL = [
  './index.html',
  './styles.css',
  './styles-vocabulary-adventure.css',
  './styles-vocabulary-adventure-v2.css',
  './styles-home-nav.css',
  './styles-student-home-dashboard.css',
  './assets/student-home/card6/docs/student-home-tokens.css',
  './js/config.js',
  './js/state.js',
  './js/masterVocabularyLibrary.js',
  './js/repository.js',
  './js/utils.js',
  './js/auth.js',
  './js/home.js',
  './js/lazyFeatures.js',
  './js/main.js',
  './js/dailyLearningRoute.js',
  './js/studentRewards.js',
  './js/studentRewardLayoutGuard.js',
  './js/studentRewardReconcile.js',
  './js/vocabularyAdventureCore.js',
  './js/vocabularyAdventure.js',
  './js/vocabularyAdventureReview.js',
  './js/vocabularyAdventurePlayer.js',
  './js/vocabularyAdventureChallenge.js',
  './js/vocabularyAdventureVisualV2.js',
  './assets/student-home/card6/scenes/vocabulary-adventure-scene.webp',
  './assets/student-home/card6/scenes/word-challenge-scene.webp',
  './assets/student-home/card6/scenes/grammar-challenge-scene.webp',
  './assets/student-home/card6/scenes/classroom-practice-scene.webp',
  './assets/student-home/card6/scenes/new-word-guide-scene.webp',
  './assets/student-home/card6/ui/section-titles/wood-plaque-blank.png',
  './assets/student-home/card6/ui/coins-rewards/coin-large.png',
  './assets/student-home/card6/ui/profile/learning-badge.png',
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

async function staticNetworkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request) || await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function navigationNetworkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    const requestUrl = new URL(request.url);
    const appRoot = new URL('./', self.location.href);
    const indexUrl = new URL('./index.html', self.location.href);
    const isAppEntry = requestUrl.pathname === appRoot.pathname
      || requestUrl.pathname === indexUrl.pathname;
    if (isAppEntry) {
      const shell = await caches.open(APP_SHELL_CACHE);
      const fallback = await shell.match(indexUrl.href) || await shell.match('./index.html');
      if (fallback) return fallback;
    }

    return new Response(
      '<!doctype html><meta charset="utf-8"><title>暂时无法打开</title><p>当前页面暂时无法离线打开，请联网后重试。</p>',
      { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
    );
  }
}

async function apiNetworkFirst(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
  const isSupabaseApi = url.hostname.endsWith('.supabase.co');
  const isDailyLearningRoute = url.origin === self.location.origin
    && url.pathname.endsWith('/data/daily-learning-route.json');
  const isCodeAsset = url.origin === self.location.origin
    && /\.(?:js|css|html)$/.test(url.pathname);

  if (isNavigation) {
    event.respondWith(navigationNetworkFirst(event.request));
    return;
  }
  if (isDailyLearningRoute) {
    event.respondWith(dailyRouteNetworkOnly(event.request));
    return;
  }
  if (isSupabaseApi) {
    event.respondWith(apiNetworkFirst(event.request));
    return;
  }
  if (isCodeAsset) {
    event.respondWith(staticNetworkFirst(event.request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  }
});
