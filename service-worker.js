const APP_SHELL_CACHE = 'xxzcard-app-shell-v32';
const RUNTIME_CACHE = 'xxzcard-runtime-v32';
const CACHE_PREFIXES = ['xxzcard-', 'vocabulary-review-'];
const APP_SHELL = [
  './index.html',
  './styles.css',
  './styles-vocabulary-adventure.css',
  './styles-home-nav.css',
  './styles-student-home-dashboard.css',
  './assets/student-home/card6/docs/student-home-tokens.css',
  './js/config.js',
  './js/state.js',
  './js/repository.js',
  './js/utils.js',
  './js/auth.js',
  './js/home.js',
  './js/lazyFeatures.js',
  './js/main.js',
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

async function navigationStaleWhileRevalidate(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const shellUrl = new URL('./index.html', self.location.href).href;
  const cached = await cache.match(shellUrl);
  const update = fetch(request, { cache: 'no-cache' })
    .then(async response => {
      if (response && response.ok) await cache.put(shellUrl, response.clone());
      return response;
    });
  if (cached) {
    update.catch(() => {});
    return cached;
  }
  return await update;
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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const appRoot = new URL('./', self.location.href);
  const isNavigation = event.request.mode === 'navigate'
    && url.origin === appRoot.origin
    && url.pathname.startsWith(appRoot.pathname);
  const isSupabaseApi = url.hostname.endsWith('.supabase.co');

  if (isNavigation) {
    event.respondWith(navigationStaleWhileRevalidate(event.request));
    return;
  }
  if (isSupabaseApi) {
    event.respondWith(apiNetworkFirst(event.request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  }
});
