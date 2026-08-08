import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.ttf', 'font/ttf']
]);

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'index.html' : path.normalize(pathname).replace(/^[/\\]+/, '');
  const filePath = path.join(root, relative);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
  response.end(fs.readFileSync(filePath));
});

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!/Executable doesn't exist|spawn EPERM/.test(String(error?.message || error))) throw error;
    return chromium.launch({ channel: 'msedge' });
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const settleWithin = (promise, ms = 5000) => Promise.race([
  Promise.resolve(promise).catch(() => undefined),
  delay(ms)
]);
let browser = null;
let context = null;
let page = null;
let routedRequests = 0;
let persistedWrites = 0;
let stage = 'starting local server';
const testStartedAt = Date.now();
const elapsed = () => `${Date.now() - testStartedAt}ms`;
function setStage(value) {
  stage = value;
  console.log(`grammar records viewport [${elapsed()}]: ${value}`);
}
const watchdog = setTimeout(() => {
  console.error(`grammar records viewport timed out after ${elapsed()} during: ${stage}; routed=${routedRequests}; writes=${persistedWrites}`);
  server.closeAllConnections?.();
  context?.close().catch(() => {});
  browser?.close().catch(() => {});
  setTimeout(() => process.exit(1), 2000);
}, 90000);

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
setStage('launching browser');
browser = await launchBrowser();
setStage('creating browser context');
context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  screen: { width: 1180, height: 820 },
  serviceWorkers: 'block'
});

const store = new Map([
  ['main', {
    pin: null,
    batches: [],
    mixedAssignments: [],
    taskAssignments: []
  }]
]);
let failNextHistoryWrite = false;
let expectOfflineConsole = false;

function clone(value) {
  return value == null ? value : structuredClone(value);
}

async function waitFor(check, message, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(message);
}

function history(student) {
  return store.get(`grammar_challenge_history_v2_${student}`) || null;
}

function attempts(student) {
  const value = history(student);
  return value ? value.attemptOrder.map(id => value.attempts[id]) : [];
}

await context.addInitScript(() => {
  localStorage.setItem('wc_user', 'sister');
});

page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(15000);
const errors = [];
page.on('pageerror', error => {
  if (!/^offline$/i.test(error.message)) errors.push(error.message);
});
page.on('console', message => {
  const text = message.text();
  const expectedOffline = /^offline$/i.test(text)
    || /Failed to load resource:.*503/i.test(text);
  if (message.type() === 'error' && !expectedOffline && !/favicon|Service Worker/i.test(text)) {
    errors.push(text);
  }
});

await page.route('**/rest/v1/kv_store*', async route => {
  routedRequests += 1;
  const request = route.request();
  if (request.method() === 'POST') {
    persistedWrites += 1;
    const payload = request.postDataJSON();
    if (failNextHistoryWrite && String(payload.key || '').startsWith('grammar_challenge_history_v2_')) {
      failNextHistoryWrite = false;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"temporary"}' });
      return;
    }
    store.set(payload.key, clone(payload.value));
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    return;
  }
  const url = new URL(request.url());
  if (url.searchParams.get('select') === 'key,value') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([...store].map(([key, value]) => ({ key, value })))
    });
    return;
  }
  const key = (url.searchParams.get('key') || '').replace(/^eq\./, '');
  const value = store.get(key);
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(typeof value === 'undefined' ? [] : [{ value }])
  });
});

async function waitForApp() {
  try {
    await page.waitForFunction(
      () => Boolean(window.GrammarChallengeRecords && window.loadFeatureGroup),
      undefined,
      { timeout: 10000 }
    );
    await page.waitForFunction(
      () => document.getElementById('studentSummaryName')?.textContent === (localStorage.getItem('wc_user') === 'brother' ? '弟弟' : '姐姐'),
      undefined,
      { timeout: 10000 }
    );
  } catch (error) {
    throw new Error(`app did not become ready: ${JSON.stringify(errors)}`, { cause: error });
  }
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function openChallenge(challengeId) {
  await page.evaluate(async id => {
    await window.loadFeatureGroup('grammarChallenge');
    await window.openGrammarChallenge(id);
  }, challengeId);
  const frame = await waitFor(
    () => page.frames().find(candidate => candidate !== page.mainFrame() && candidate.url() !== 'about:blank'),
    `challenge frame did not open for ${challengeId}`
  );
  await frame.waitForLoadState('domcontentloaded');
  await frame.waitForFunction(() => Boolean(
    window.__LESSON_PREP_QA__?.state?.()
      || document.getElementById('practice-data')
      || window.GRAMMAR_CHALLENGE_PRACTICE
      || document.getElementById('errorMessage')?.textContent
  ));
  return frame;
}

async function answerInlineChallengeCorrectly(frame, count = Infinity) {
  let answered = 0;
  while (answered < count) {
    const state = await frame.evaluate(() => window.__LESSON_PREP_QA__?.state?.() || null);
    if (!state || state.complete) break;
    await frame.evaluate(() => {
      const qa = window.__LESSON_PREP_QA__;
      if (!qa?.solveCurrent) throw new Error('formal QA helper is missing');
      qa.solveCurrent();
    });
    answered += 1;
    console.log(`grammar records viewport [${elapsed()}]: solved question ${answered}`);
    if (answered >= count) break;
    await frame.waitForFunction(previousIndex => {
      const qa = window.__LESSON_PREP_QA__;
      const next = document.getElementById('nextButton');
      const current = qa?.state?.();
      return current?.complete || (current?.index === previousIndex && next && !next.disabled);
    }, state.index);
    await frame.locator('#nextButton').click();
    await frame.waitForFunction(previousIndex => {
      const current = window.__LESSON_PREP_QA__?.state?.();
      return current?.complete || Number(current?.index) > Number(previousIndex);
    }, state.index);
  }
  return answered;
}

async function closeChallenge() {
  await page.evaluate(() => window.closeGrammarChallenge());
  await page.waitForFunction(() => document.getElementById('grammarChallengeFrame')?.getAttribute('src') === 'about:blank');
}

try {
  setStage('navigating');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  setStage('waiting for app');
  await waitForApp();
  setStage('app ready');

  let frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
  setStage('completing sister challenge');
  await answerInlineChallengeCorrectly(frame);
  await frame.waitForFunction(() => document.getElementById('completionDialog')?.dataset.complete === 'true');
  await waitFor(() => attempts('sister').find(item => item.status === 'completed'), 'completed sister attempt was not saved');
  const completed = attempts('sister')[0];
  assert.equal(completed.student, 'sister');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.totalQuestions, 10);
  assert.equal(completed.correctQuestions, 10);
  assert.equal(completed.score, 100);
  assert.equal(completed.questions.length, 10);
  assert.deepEqual(completed.questions.map(item => item.questionId).sort(), ['GC01','GC02','GC03','GC04','GC05','GC06','GC07','GC08','GC09','GC10']);
  assert.ok(completed.questions.every(item => item.kpIds.length >= 1));
  assert.deepEqual(completed.wrongQuestionIds, []);
  assert.deepEqual(completed.reviewKpIds, []);
  const rewardRecord = await waitFor(() => {
    const record = store.get('student_reward_v1_sister');
    return record?.daily?.[todayKey()]?.claims?.grammarChallenge?.status === 'pending' ? record : null;
  }, 'completed grammar reward was not saved');
  assert.equal(rewardRecord.daily[todayKey()].claims.grammarChallenge.amount, 5);

  setStage('reading completed layout');
  const layout = await page.evaluate(() => {
    const iframe = document.getElementById('grammarChallengeFrame');
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win) return null;
    return {
      horizontalOverflow: doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1,
      verticalOverflow: doc.documentElement.scrollHeight > doc.documentElement.clientHeight + 1,
      width: win.innerWidth,
      height: win.innerHeight
    };
  });
  assert.ok(layout);
  assert.equal(layout.horizontalOverflow, false);
  assert.equal(layout.verticalOverflow, false);
  assert.ok(layout.width > layout.height);
  await page.waitForTimeout(100);
  assert.equal(attempts('sister').length, 1);
  setStage('closing completed challenge');
  await closeChallenge();
  assert.equal(attempts('sister').length, 1);
  await page.waitForFunction(() => document.querySelector('[data-reward-source="grammarChallenge"]')?.dataset.rewardState === 'pending');
  await page.locator('.student-reward-chest[data-reward-source="grammarChallenge"]').click();
  await waitFor(() => store.get('student_reward_v1_sister')?.daily?.[todayKey()]?.claims?.grammarChallenge?.status === 'claimed', 'grammar reward chest claim was not saved');
  await page.waitForFunction(() => document.querySelector('[data-reward-source="grammarChallenge"]')?.dataset.rewardState === 'claimed');

  setStage('checking sister exit record');
  frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
  await answerInlineChallengeCorrectly(frame, 1);
  await waitFor(() => attempts('sister').length === 2, 'second sister attempt did not start');
  await closeChallenge();
  await waitFor(() => attempts('sister').some(item => item.status === 'exited'), 'exit status was not saved');
  const exited = attempts('sister').find(item => item.status === 'exited');
  assert.equal(exited.answeredCount, 0);
  assert.equal(exited.score, null);
  await waitFor(() => store.get('grammar_challenge_weak_summary_v2_sister'), 'sister weak summary missing');
  assert.equal(store.get('grammar_challenge_weak_summary_v2_sister').completedAttemptCount, 1);

  setStage('checking interrupted attempt recovery');
  expectOfflineConsole = true;
  failNextHistoryWrite = true;
  frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
  await answerInlineChallengeCorrectly(frame, 1);
  const activeBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('grammar_challenge_active_v2_sister')));
  const countBeforeReload = attempts('sister').length;
  assert.ok(activeBeforeReload?.attemptId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp();
  await waitFor(() => attempts('sister').some(item => item.attemptId === activeBeforeReload.attemptId), 'pending interrupted attempt did not auto-flush after reload');
  frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
  const activeAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('grammar_challenge_active_v2_sister')));
  assert.equal(activeAfterReload.attemptId, activeBeforeReload.attemptId, 'refresh must resume the same attempt ID');
  assert.equal(attempts('sister').length, countBeforeReload + 1, 'refresh must not create a duplicate attempt');
  await closeChallenge();
  expectOfflineConsole = false;

  setStage('checking student isolation');
  await page.evaluate(() => window.switchUser('brother'));
  await page.waitForFunction(() => document.getElementById('studentSummaryName')?.textContent === '弟弟');
  frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
  await answerInlineChallengeCorrectly(frame, 1);
  await closeChallenge();
  await waitFor(() => attempts('brother').some(item => item.status === 'exited'), 'brother exit status missing');
  assert.equal(attempts('brother')[0].student, 'brother');
  assert.equal(attempts('brother')[0].status, 'exited');
  assert.equal(history('sister').student, 'sister');
  assert.equal(history('brother').student, 'brother');

  setStage('checking legacy challenge');
  frame = await openChallenge('grammar-2026-07-16-pronouns-be');
  assert.equal(await frame.locator('#errorScreen').isHidden(), true);
  assert.equal(await frame.locator('#challengeScreen').isVisible(), true);
  assert.match(await frame.locator('#challengeTitle').textContent(), /代词与 be 动词/);
  await closeChallenge();
  const oldAttempt = attempts('brother').find(item => item.challengeId === 'grammar-2026-07-16-pronouns-be');
  assert.ok(oldAttempt);
  assert.deepEqual(oldAttempt.kpIds, ['subject-pronouns-be', 'be-positive-negative', 'be-questions-answers']);

  assert.deepEqual(errors, []);
  setStage('passed');
  console.log('grammar challenge records viewport tests passed');
} finally {
  clearTimeout(watchdog);
  server.closeAllConnections?.();
  await settleWithin(context?.close(), 5000);
  await settleWithin(browser?.close(), 5000);
  await settleWithin(new Promise(resolve => server.close(resolve)), 5000);
}
