import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const currentWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const oldWorker = `
const CACHE = 'xxzcard-app-shell-v97';
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.add('./index.html')).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
`;
let serveCurrentWorker = false;
let originAvailable = true;
const currentRequests = [];
const expectedShellPaths = [...currentWorker.matchAll(/'\.\/([^']+)'/g)].map(match => `/${match[1]}`);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.ttf', 'font/ttf']
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const pathname = decodeURIComponent(url.pathname);
  if (!originAvailable) {
    request.socket.destroy();
    return;
  }
  if (serveCurrentWorker) currentRequests.push(pathname);
  if (pathname === '/service-worker.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(serveCurrentWorker ? currentWorker : oldWorker);
    return;
  }
  if (pathname === '/sw-harness.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><meta charset="utf-8"><title>SW harness</title>');
    return;
  }
  const relative = pathname === '/' ? 'index.html' : path.normalize(pathname).replace(/^[/\\]+/, '');
  const filePath = path.join(root, relative);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  response.end(fs.readFileSync(filePath));
});

async function launchBrowser() {
  if (process.env.PW_BROWSER === 'webkit') return webkit.launch();
  try {
    return await chromium.launch();
  } catch (error) {
    if (!/Executable doesn't exist|spawn EPERM/.test(String(error && error.message || error))) throw error;
    return chromium.launch({ channel: 'msedge' });
  }
}

async function waitForActiveVersion(page, cacheName) {
  const started = Date.now();
  let latest = null;
  while (Date.now() - started < 30000) {
    latest = await page.evaluate(async expected => {
      const registration = await navigator.serviceWorker.getRegistration();
      const keys = await caches.keys();
      return {
        active: registration?.active?.state || '',
        installing: registration?.installing?.state || '',
        waiting: registration?.waiting?.state || '',
        keys,
        ready: registration?.active?.state === 'activated'
          && !registration.installing
          && !registration.waiting
          && keys.includes(expected)
          && (!/v101$/.test(expected) || !keys.some(key => /v97$|v98$|v99$|v100$/.test(key)))
      };
    }, cacheName);
    if (latest.ready) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const requested = new Set(currentRequests);
  const missing = expectedShellPaths.filter(item => !requested.has(item));
  throw new Error(`service worker ${cacheName} did not activate: ${JSON.stringify({ latest, requestCount: currentRequests.length, uniqueRequests: requested.size, missing })}`);
}

async function openOfflineVocabularyGuide(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(async () => {
    currentUser = 'teacher';
    localStorage.setItem('wc_user', 'teacher');
    document.body.classList.add('is-teacher');
    updateUserBar();
    showScreen('screenHome');
    await loadHome();
  });
  await page.waitForSelector('#teacherVocabularyGuideEntry:visible');
  await page.locator('#teacherVocabularyGuideEntry').click();
  await page.waitForSelector('#screenVocabularyReviewList.active #vocabularyLessonBookList');
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
  assert.equal(layout.width, viewport.width);
  assert.equal(layout.height, viewport.height);
  assert.equal(layout.horizontalOverflow, false);
  await page.locator('#screenVocabularyReviewList .back-btn').click();
  await page.waitForSelector('#screenHome.active');
}

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  screen: { width: 1180, height: 820 },
  serviceWorkers: 'allow'
});
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/sw-harness.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => navigator.serviceWorker.register('./service-worker.js'));
  await waitForActiveVersion(page, 'xxzcard-app-shell-v97');

  serveCurrentWorker = true;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  await waitForActiveVersion(page, 'xxzcard-app-shell-v101');

  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys();
    const shell = await caches.open('xxzcard-app-shell-v101');
    const urls = (await shell.keys()).map(request => decodeURIComponent(new URL(request.url).pathname));
    return { keys, urls };
  });
  assert.ok(
    !cacheState.keys.some(key => /v97$|v98$|v99$|v100$/.test(key)),
    `v97/v98/v99/v100 caches removed after activation: ${JSON.stringify(cacheState.keys)}`
  );
  assert.equal(cacheState.urls.length, 24, 'v101 Apple-safe app shell must contain exactly 24 resources');
  assert.ok(cacheState.urls.some(url => /index\.html$/.test(url)));
  assert.ok(!cacheState.urls.some(url => /daily-learning-route\.json$/.test(url)));
  assert.ok(cacheState.urls.some(url => /dailyLearningRouteOverride\.js$/.test(url)));
  assert.ok(cacheState.urls.some(url => /vocabularyReview\.js$/.test(url)));
  assert.ok(cacheState.urls.some(url => /vocabularyLessonTaught\.js$/.test(url)));
  assert.ok(cacheState.urls.some(url => /styles-vocabulary-lesson\.css$/.test(url)));
  assert.ok(!cacheState.urls.some(url => /grammar-challenge\//.test(url)));
  assert.ok(!cacheState.urls.some(url => /assets\/student-home\//.test(url)));
  assert.ok(!cacheState.urls.some(url => /studentActivityControls\.js$/.test(url)));

  const onlineContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 },
    serviceWorkers: 'block'
  });
  const onlinePage = await onlineContext.newPage();
  const mainRequests = [];
  const summaryMain = {
    pin: '0716',
    mixedAssignments: [],
    taskAssignments: [],
    vocabularyReviewState: { version: 1, rememberedWords: [] },
    schemaVersion: 2,
    masterLibrary: { version: 1 }
  };
  const fullMain = {
    ...summaryMain,
    masterCards: { go: { word: 'go', meaning: '去' } },
    batches: [{
      id: 'book-1',
      date: '2026-08-27',
      name: '按需词库',
      cardRefs: [{ wordKey: 'go' }],
      sharedWith: ['sister'],
      bookPurpose: 'common'
    }]
  };
  await onlineContext.addInitScript(() => {
    localStorage.setItem('wc_user', 'sister');
    localStorage.removeItem('wc_sb_main');
    localStorage.removeItem('wc_sb_main_summary_v1');
  });
  await onlinePage.route('https://**/*', async routeHandler => {
    const requestUrl = new URL(routeHandler.request().url());
    if (!/\.supabase\.co$/.test(requestUrl.hostname)) return routeHandler.abort();
    const keyFilter = requestUrl.searchParams.get('key') || '';
    const select = requestUrl.searchParams.get('select') || '';
    if (keyFilter === 'eq.main') {
      mainRequests.push(select);
      const body = select === 'value' ? [{ value: fullMain }] : [summaryMain];
      return routeHandler.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      });
    }
    return routeHandler.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await onlinePage.goto(`${baseUrl}/?lazy-main=v101`, { waitUntil: 'domcontentloaded' });
  await onlinePage.waitForFunction(() => document.documentElement.classList.contains('app-ready'));
  await onlinePage.waitForTimeout(250);
  assert.ok(mainRequests.some(select => select.includes('pin:value->pin')), 'startup must request the projected main summary');
  assert.equal(mainRequests.filter(select => select === 'value').length, 0, 'startup must not request the full main record');
  await onlinePage.locator('[onclick="openWordCards()"]:visible').click();
  await onlinePage.waitForSelector('#screenWordCards.active');
  assert.equal(mainRequests.filter(select => select === 'value').length, 1, 'word-card entry should request full main exactly once');
  await onlineContext.close();

  const route = JSON.parse(fs.readFileSync(path.join(root, 'data', 'daily-learning-route.json'), 'utf8'));
  const offlineSelection = {
    schemaVersion: 2,
    current: {
      grammarChallenge: {
        id: 'grammar-offline-manual',
        title: '最后保存的语法内容',
        lessonKey: 'offline-manual-grammar'
      },
      classroomPractice: {
        practiceId: 'classroom-offline-manual',
        title: '最后保存的随堂内容',
        path: 'courseware/offline-manual.html'
      },
      updatedAt: '2026-08-21T00:00:00.000Z'
    }
  };
  await page.evaluate(({ value, selection }) => {
    localStorage.setItem('wc_user', 'sister');
    localStorage.setItem('wc_sb_main', JSON.stringify({ pin: null, batches: [], mixedAssignments: [], taskAssignments: [] }));
    localStorage.setItem('wc_supabase_mirror', JSON.stringify({
      source: 'supabase',
      syncedAt: new Date().toISOString(),
      rows: {
        main: { pin: null, batches: [], mixedAssignments: [], taskAssignments: [] },
        student_activity_control_v1_sister: { version: 1, daily: {} },
        student_activity_control_v1_brother: { version: 1, daily: {} },
        grammar_challenge_daily_v1_sister: {},
        grammar_challenge_daily_v1_brother: {}
      }
    }));
    localStorage.setItem('daily_learning_route_cache_v1', JSON.stringify({ version: 1, route: value }));
    localStorage.setItem('daily_learning_route_override_cache_v1', JSON.stringify(selection));
  }, { value: route, selection: offlineSelection });

  originAvailable = false;
  await context.route('https://**/*', route => route.abort());
  await page.goto(`${baseUrl}/?cold=v101`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const current = window.getDailyLearningRoute?.();
    return current?.grammarChallenge?.id === 'grammar-offline-manual'
      && current?.classroomPractice?.id === 'classroom-offline-manual';
  });
  await openOfflineVocabularyGuide(page, { width: 1180, height: 820 });
  await openOfflineVocabularyGuide(page, { width: 393, height: 852 });

  const finalCaches = await page.evaluate(() => caches.keys());
  assert.deepEqual(finalCaches.sort(), ['xxzcard-app-shell-v101', 'xxzcard-runtime-v101']);
  console.log(`student runtime v97-to-v101 cold-start viewport tests passed (${process.env.PW_BROWSER === 'webkit' ? 'WebKit' : 'Chromium'})`);
} finally {
  originAvailable = true;
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
