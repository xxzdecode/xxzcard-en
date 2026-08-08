import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
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

function readFormalConfig(date) {
  const source = fs.readFileSync(path.join(root, `grammar-challenge/data/page-practices/${date}.js`), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: `${date}.js` });
  return sandbox.window.__GRAMMAR_PAGE_PRACTICE_CONFIG__;
}

function expectedForSelection(config, questionId, selectedIndex) {
  const question = config.questions.find(item => item.id === questionId);
  assert.ok(question, `formal question ${questionId} exists`);
  const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
  const values = answers.map(value => typeof value === 'number' ? question.options[value] : value);
  return values.includes(question.options[selectedIndex]);
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!/Executable doesn't exist|spawn EPERM/.test(String(error?.message || error))) throw error;
    return chromium.launch({ channel: 'msedge' });
  }
}

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  screen: { width: 1180, height: 820 },
  serviceWorkers: 'block'
});

const store = new Map([
  ['main', { pin: null, batches: [], mixedAssignments: [], taskAssignments: [] }]
]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function history(student) {
  return store.get(`grammar_challenge_history_v2_${student}`) || null;
}

function attempts(student) {
  const value = history(student);
  return value ? value.attemptOrder.map(id => value.attempts[id]) : [];
}

function latestAttempt(student, challengeId) {
  return [...attempts(student)].reverse().find(item => item.challengeId === challengeId) || null;
}

async function waitFor(check, message, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(message);
}

await context.addInitScript(() => {
  localStorage.setItem('wc_user', 'sister');
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  const text = message.text();
  if (message.type() === 'error' && !/favicon|Service Worker/i.test(text)) errors.push(text);
});

await page.route('**/rest/v1/kv_store*', async route => {
  const request = route.request();
  if (request.method() === 'POST') {
    const payload = request.postDataJSON();
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
  await page.waitForFunction(() => document.getElementById('studentSummaryName')?.textContent === '姐姐');
}

async function openDirectChallenge(challengeId, directPath) {
  await page.evaluate(async ({ id, href }) => {
    await window.loadFeatureGroup('grammarChallenge');
    await window.openGrammarChallenge(id);
    const frame = document.getElementById('grammarChallengeFrame');
    frame.src = `${href}?embedded=1`;
  }, { id: challengeId, href: directPath });

  const frame = await waitFor(
    () => page.frames().find(candidate => candidate !== page.mainFrame() && candidate.url().includes(directPath)),
    `direct challenge frame did not open: ${directPath}`
  );
  await frame.waitForLoadState('domcontentloaded');
  await frame.waitForFunction(() => Boolean(window.__LESSON_PREP_QA__?.state?.()));
  await waitFor(() => latestAttempt('sister', challengeId), `attempt did not start: ${challengeId}`);
  return frame;
}

async function closeChallenge() {
  await page.evaluate(() => window.closeGrammarChallenge());
  await page.waitForFunction(() => document.getElementById('grammarChallengeFrame')?.getAttribute('src') === 'about:blank');
}

async function verifyDirectPage({ date, challengeId }) {
  const directPath = `/grammar-challenge/practices/${date}.html`;
  const config = readFormalConfig(date);
  const frame = await openDirectChallenge(challengeId, directPath);

  const initial = await frame.evaluate(() => window.__LESSON_PREP_QA__.state());
  assert.equal(initial.type, 'single');
  assert.equal(initial.locked, false);
  assert.equal(initial.judging, false);

  const buttons = frame.locator('.option');
  await buttons.nth(0).click();
  await buttons.nth(1).click();

  const edited = await frame.evaluate(() => window.__LESSON_PREP_QA__.state());
  assert.deepEqual(edited.selected, [1], `${date} keeps only the final single-choice selection`);
  assert.equal(edited.locked, false, `${date} remains editable before Next`);
  assert.equal(edited.judging, false, `${date} has not judged before Next`);
  assert.equal(await frame.locator('.option').nth(0).getAttribute('aria-pressed'), 'false');
  assert.equal(await frame.locator('.option').nth(1).getAttribute('aria-pressed'), 'true');

  await frame.waitForTimeout(250);
  const beforeSubmit = latestAttempt('sister', challengeId);
  assert.ok(beforeSubmit);
  assert.equal(beforeSubmit.answeredCount, 0, `${date} does not write history before Next`);
  assert.equal(beforeSubmit.questions.length, 0, `${date} has no captured answer before Next`);

  await frame.evaluate(() => {
    const next = document.getElementById('nextButton');
    next.click();
    next.click();
  });

  const locked = await frame.evaluate(() => window.__LESSON_PREP_QA__.state());
  assert.equal(locked.locked, true, `${date} locks only after Next`);
  assert.equal(locked.judging, true, `${date} judges only after Next`);
  assert.deepEqual(locked.selected, [1]);
  assert.equal(await frame.locator('.option').nth(1).isDisabled(), true);

  const recorded = await waitFor(() => {
    const attempt = latestAttempt('sister', challengeId);
    return attempt && attempt.answeredCount === 1 ? attempt : null;
  }, `${date} final answer was not recorded`);

  assert.equal(recorded.questions.length, 1, `${date} records one question result`);
  assert.equal(recorded.questions[0].questionId, edited.id);
  assert.equal(recorded.questions[0].correct, expectedForSelection(config, edited.id, 1));

  await frame.waitForTimeout(Number(config.feedbackDelayMs || 1000) + 180);
  const nextState = await frame.evaluate(() => window.__LESSON_PREP_QA__.state());
  assert.equal(nextState.index, 1, `${date} advances exactly one question after a fast double click`);
  const afterTransition = latestAttempt('sister', challengeId);
  assert.equal(afterTransition.answeredCount, 1, `${date} does not duplicate history after transition`);
  assert.equal(afterTransition.questions.length, 1, `${date} keeps one final record`);

  await closeChallenge();
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForApp();

  await verifyDirectPage({
    date: '2026-07-31',
    challengeId: 'grammar-2026-07-31-parts-of-speech-review'
  });
  await verifyDirectPage({
    date: '2026-08-01',
    challengeId: 'grammar-2026-08-01-adjective-review'
  });

  assert.deepEqual(errors, []);
  console.log('grammar option direct-link viewport tests passed');
} finally {
  await context.close();
  await browser.close();
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
}
