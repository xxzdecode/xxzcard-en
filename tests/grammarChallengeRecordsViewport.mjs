import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, '.codex-backups', 'grammar-challenge-records-qa');
fs.mkdirSync(resultDir, { recursive: true });

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

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1194, height: 834 },
  screen: { width: 1194, height: 834 },
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

const page = await context.newPage();
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
  const request = route.request();
  if (request.method() === 'POST') {
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
  await page.waitForFunction(() => Boolean(window.GrammarChallengeRecords && window.loadFeatureGroup));
  await page.waitForFunction(() => document.getElementById('studentSummaryName')?.textContent === (localStorage.getItem('wc_user') === 'brother' ? '弟弟' : '姐姐'));
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
    document.getElementById('practice-data')
      || window.GRAMMAR_CHALLENGE_PRACTICE
      || document.getElementById('errorMessage')?.textContent
  ));
  return frame;
}

async function answerInlineChallengeCorrectly(frame, count = Infinity) {
  await frame.evaluate(() => {
    const raw = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => raw(callback, Math.min(Number(delay) || 0, 20), ...args);
  });
  let answered = 0;
  while (answered < count) {
    const state = await frame.evaluate(() => window.__LESSON_PREP_QA__?.state?.() || null);
    if (!state || state.complete) break;
    await frame.evaluate(() => {
      const config = JSON.parse(document.getElementById('practice-data').textContent);
      const state = window.__LESSON_PREP_QA__.state();
      const question = config.questions.find(item => item.id === state.id);
      if (!question || question.type !== 'single') throw new Error(`unsupported browser QA question: ${question && question.type}`);
      const answer = Array.isArray(question.answer) ? question.answer[0] : question.answer;
      const index = typeof answer === 'number' ? answer : question.options.indexOf(answer);
      const option = document.querySelector(`[data-option-index="${index}"]`);
      if (!option) throw new Error(`correct option missing for ${question.id}`);
      option.click();
    });
    await frame.waitForTimeout(5);
    answered += 1;
    if (answered >= count) break;
    await frame.locator('#nextButton').click();
    await frame.waitForTimeout(35);
  }
  return answered;
}

async function closeChallenge() {
  await page.evaluate(() => window.closeGrammarChallenge());
  await page.waitForFunction(() => document.getElementById('grammarChallengeFrame')?.getAttribute('src') === 'about:blank');
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForApp();

  let frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
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

  const layout = await frame.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    verticalOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    width: innerWidth,
    height: innerHeight
  }));
  assert.equal(layout.horizontalOverflow, false);
  assert.equal(layout.verticalOverflow, false);
  assert.ok(layout.width > layout.height);
  await page.screenshot({ path: path.join(resultDir, 'completed-sister-1194x834.png'), fullPage: true });

  await frame.evaluate(() => {
    const dialog = document.getElementById('completionDialog');
    dialog.dataset.complete = 'true';
    dialog.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(100);
  assert.equal(attempts('sister').length, 1);
  await closeChallenge();
  assert.equal(attempts('sister').length, 1);

  frame = await openChallenge('grammar-2026-07-31-parts-of-speech-review');
  await answerInlineChallengeCorrectly(frame, 1);
  await waitFor(() => attempts('sister').length === 2, 'second sister attempt did not start');
  await closeChallenge();
  await waitFor(() => attempts('sister').some(item => item.status === 'exited'), 'exit status was not saved');
  const exited = attempts('sister').find(item => item.status === 'exited');
  assert.equal(exited.answeredCount, 0, 'selecting without clicking 下一题 must not write a question result');
  assert.equal(exited.score, null);
  await waitFor(() => store.get('grammar_challenge_weak_summary_v2_sister'), 'sister weak summary missing');
  assert.equal(store.get('grammar_challenge_weak_summary_v2_sister').completedAttemptCount, 1);

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

  frame = await openChallenge('grammar-2026-07-16-pronouns-be');
  assert.equal(await frame.locator('#errorScreen').isHidden(), true);
  assert.equal(await frame.locator('#challengeScreen').isVisible(), true);
  assert.match(await frame.locator('#challengeTitle').textContent(), /代词与 be 动词/);
  await closeChallenge();
  const oldAttempt = attempts('brother').find(item => item.challengeId === 'grammar-2026-07-16-pronouns-be');
  assert.ok(oldAttempt);
  assert.deepEqual(oldAttempt.kpIds, ['subject-pronouns-be', 'be-positive-negative', 'be-questions-answers']);

  assert.deepEqual(errors, []);
  console.log(`grammar challenge records viewport tests passed: ${resultDir}`);
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
