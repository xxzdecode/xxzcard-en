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
const CACHE = 'xxzcard-app-shell-v80';
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
          && (!/v81$/.test(expected) || !keys.some(key => /v80$/.test(key)))
      };
    }, cacheName);
    if (latest.ready) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const requested = new Set(currentRequests);
  const missing = expectedShellPaths.filter(item => !requested.has(item));
  throw new Error(`service worker ${cacheName} did not activate: ${JSON.stringify({ latest, requestCount: currentRequests.length, uniqueRequests: requested.size, missing })}`);
}

async function openOfflineGrammar(page, student, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(user => {
    if (localStorage.getItem('wc_user') !== user && typeof window.switchUser === 'function') window.switchUser(user);
  }, student);
  await page.waitForFunction(user => localStorage.getItem('wc_user') === user, student);
  const frameNavigation = page.waitForEvent('framenavigated', {
    predicate: candidate => candidate !== page.mainFrame() && /grammar-challenge\/(?:index|practices\/courseware-daily)\.html/.test(candidate.url()),
    timeout: 10000
  }).catch(() => null);
  await page.evaluate(() => window.openStudentGrammarChallenge());
  await page.waitForFunction(() => document.getElementById('screenGrammarChallengePlayer')?.classList.contains('active'));
  const frame = await frameNavigation || page.frames().find(candidate => (
    /grammar-challenge\/(?:index|practices\/courseware-daily)\.html/.test(candidate.url())
  ));
  assert.ok(frame, `${student} grammar frame opened: ${page.frames().map(candidate => candidate.url()).join(', ')}`);
  await frame.waitForFunction(() => Boolean(window.__LESSON_PREP_QA__?.state?.()), null, { timeout: 10000 });
  const layout = await frame.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
  assert.equal(layout.width, viewport.width);
  assert.ok(layout.height > 0 && layout.height <= viewport.height);
  assert.equal(layout.horizontalOverflow, false);
  await page.evaluate(() => window.closeGrammarChallenge());
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
  await waitForActiveVersion(page, 'xxzcard-app-shell-v80');

  serveCurrentWorker = true;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  await waitForActiveVersion(page, 'xxzcard-app-shell-v81');

  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys();
    const shell = await caches.open('xxzcard-app-shell-v81');
    const urls = (await shell.keys()).map(request => decodeURIComponent(new URL(request.url).pathname));
    return { keys, urls };
  });
  assert.ok(
    !cacheState.keys.some(key => /v80$/.test(key)),
    `v80 caches removed after activation: ${JSON.stringify(cacheState.keys)}`
  );
  assert.ok(cacheState.urls.some(url => /index\.html$/.test(url)));
  assert.ok(cacheState.urls.some(url => /daily-learning-route\.json$/.test(url)));
  assert.ok(cacheState.urls.some(url => /grammar-challenge\/practices\/courseware-daily\.html$/.test(url)));
  assert.ok(cacheState.urls.some(url => url.endsWith('/courseware/26.08.04｜时间介词 in-on-at 随堂练习.html')));
  assert.ok(cacheState.urls.some(url => url.endsWith('/courseware/26.08.06｜地点介词“上与下”随堂练习.html')));
  assert.ok(!cacheState.urls.some(url => /grammar-challenge\/practices\/2026-08-22\.html$/.test(url)));
  assert.ok(!cacheState.urls.some(url => /assets\/student-home\//.test(url)));
  assert.ok(cacheState.urls.some(url => /studentActivityControls\.js$/.test(url)));

  const route = JSON.parse(fs.readFileSync(path.join(root, 'data', 'daily-learning-route.json'), 'utf8'));
  await page.evaluate(value => {
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
  }, route);

  originAvailable = false;
  await context.route('https://**/*', route => route.abort());
  await page.goto(`${baseUrl}/?cold=v81`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.getDailyLearningRoute?.()?.grammarChallenge));
  await page.waitForFunction(() => (
    window.openStudentGrammarChallenge?.__dailyRouteAssignmentWrapped === true
      && window.openStudentGrammarChallenge.__dailyRouteAssignmentOriginal?.name === 'openGrammarWithAdjustedAttempts'
      && window.openStudentGrammarChallengeBase?.name === 'openStudentGrammarChallenge'
  ), null, { timeout: 10000 });
  const grammarEntryLayers = await page.evaluate(() => ({
    assignment: window.openStudentGrammarChallenge.__dailyRouteAssignmentWrapped === true,
    attemptGate: window.openStudentGrammarChallenge.__dailyRouteAssignmentOriginal?.name === 'openGrammarWithAdjustedAttempts',
    base: window.openStudentGrammarChallengeBase?.name === 'openStudentGrammarChallenge'
  }));
  assert.deepEqual(grammarEntryLayers, { assignment: true, attemptGate: true, base: true });
  await openOfflineGrammar(page, 'sister', { width: 1180, height: 820 });
  await openOfflineGrammar(page, 'brother', { width: 393, height: 852 });

  const finalCaches = await page.evaluate(() => caches.keys());
  assert.deepEqual(finalCaches.sort(), ['xxzcard-app-shell-v81', 'xxzcard-runtime-v81']);
  console.log(`student runtime v80-to-v81 cold-start viewport tests passed (${process.env.PW_BROWSER === 'webkit' ? 'WebKit' : 'Chromium'})`);
} finally {
  originAvailable = true;
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
