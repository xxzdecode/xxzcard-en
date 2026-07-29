import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { devices, webkit } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, '.codex-backups', 'card6-visual-qa');
fs.mkdirSync(resultDir, { recursive: true });

const cards = Array.from({ length: 12 }, (_, index) => ({
  word: `home${index}`,
  meaning: `首页词${index}`,
  phonetic: `/həʊm${index}/`,
  pos: 'n.',
  emoji: '🌱'
}));
const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [{
    id: 'student-home-card-6',
    name: '首页视口测试',
    date: '2026-07-29',
    bookPurpose: 'common',
    sharedWith: ['sister', 'brother'],
    cards
  }]
};
const adventureState = {
  version: 1,
  words: Object.fromEntries(cards.map(card => [card.word, {
    lastResult: 'H',
    intervalIndex: 1,
    lastReviewedAt: '2026-07-28T02:00:00.000Z',
    nextReviewAt: '2026-07-29',
    reviewCount: 1,
    lastTaskType: 'wordToMeaning',
    challengeFlagAt: ''
  }])),
  session: null
};

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
const browser = await webkit.launch();

async function openHome(user, contextOptions) {
  const context = await browser.newContext({ ...contextOptions, serviceWorkers: 'block' });
  await context.addInitScript(selectedUser => localStorage.setItem('wc_user', selectedUser), user);
  const state = new Map([
    ['main', structuredClone(mainData)],
    [`vocab_adventure_v1_${user}`, structuredClone(adventureState)],
    [`daily_task_${user}`, {}]
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Service Worker')) errors.push(message.text());
  });
  await page.route('**/rest/v1/kv_store*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      state.set(payload.key, structuredClone(payload.value));
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
      return;
    }
    const url = new URL(request.url());
    if (url.searchParams.get('select') === 'key,value') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([...state].map(([key, value]) => ({ key, value })))
      });
      return;
    }
    const key = (url.searchParams.get('key') || '').replace(/^eq\./, '');
    const value = state.get(key);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(typeof value === 'undefined' ? [] : [{ value }])
    });
  });
  await page.goto(baseUrl, { waitUntil: 'commit' });
  await page.waitForFunction(expected => (
    document.getElementById('studentSummaryName')?.textContent === expected
      || (expected === '老师' && document.body.classList.contains('is-teacher'))
  ), user === 'brother' ? '弟弟' : user === 'teacher' ? '老师' : '姐姐');
  return { context, page, errors };
}

async function assertStudentHome(page, expectedName) {
  await page.waitForSelector('#studentDashboard:visible');
  assert.equal(await page.locator('#studentSummaryName').textContent(), expectedName);
  assert.equal(await page.locator('#studentRewardUnavailable').textContent(), '金币统计准备中');
  assert.equal(await page.locator('#homeQuickActions').count(), 0);
  assert.equal(await page.locator('#todayWordBtn').count(), 0);
  assert.equal(await page.locator('#mixedWordBtn').count(), 0);
  assert.deepEqual(
    await page.locator('.student-home-section > h2').allTextContents(),
    ['今日复习', '挑战测验', '今日新课']
  );
  const layout = await page.evaluate(() => {
    const adventure = document.getElementById('vocabularyAdventurePreviewEntry').getBoundingClientRect();
    const word = document.getElementById('vocabularyAdventureChallengeEntry').getBoundingClientRect();
    const grammar = document.getElementById('grammarChallengeHomeEntry').getBoundingClientRect();
    const classroom = document.getElementById('studentClassroomPracticeEntry').getBoundingClientRect();
    const tour = document.getElementById('vocabularyTourHomeEntry').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      adventureHeight: adventure.height,
      compactHeight: word.height,
      challengeSameRow: Math.abs(word.top - grammar.top) < 2,
      lessonSameRow: Math.abs(classroom.top - tour.top) < 2,
      minTouch: Math.min(...[...document.querySelectorAll('#studentDashboard button, #studentFeatureNav button')]
        .map(button => button.getBoundingClientRect().height))
    };
  });
  assert.equal(layout.overflow, false);
  assert.ok(layout.adventureHeight > layout.compactHeight);
  assert.equal(layout.challengeSameRow, true);
  assert.equal(layout.lessonSameRow, true);
  assert.ok(layout.minTouch >= 44);
}

try {
  const sister = await openHome('sister', { ...devices['iPhone 13'] });
  await assertStudentHome(sister.page, '姐姐');
  await sister.page.screenshot({ path: path.join(resultDir, '01-sister-home-iphone.png'), fullPage: true });
  await sister.page.locator('#studentClassroomPracticeEntry').click();
  await sister.page.waitForSelector('#studentHomeNotice:visible');
  assert.equal(await sister.page.locator('#studentHomeNotice').textContent(), '今天的随堂练习还没有发布');
  await sister.page.screenshot({ path: path.join(resultDir, '05-classroom-practice-unpublished.png'), fullPage: true });
  assert.deepEqual(sister.errors, []);
  await sister.context.close();

  const brother = await openHome('brother', { ...devices['iPhone 13'] });
  await assertStudentHome(brother.page, '弟弟');
  await brother.page.screenshot({ path: path.join(resultDir, '02-brother-home-iphone.png'), fullPage: true });
  assert.deepEqual(brother.errors, []);
  await brother.context.close();

  const teacher = await openHome('teacher', { ...devices['iPhone 13'] });
  assert.equal(await teacher.page.locator('#studentDashboard').isHidden(), true);
  assert.equal(await teacher.page.locator('#studentFeatureNav').isHidden(), true);
  assert.equal(await teacher.page.locator('.teacher-home-nav').isVisible(), true);
  assert.deepEqual(
    await teacher.page.locator('.teacher-home-nav .bottom-feature-nav__item span').allTextContents(),
    ['单词卡', '随堂练习', '知识点库']
  );
  await teacher.page.screenshot({ path: path.join(resultDir, '03-teacher-home-iphone.png'), fullPage: true });
  assert.deepEqual(teacher.errors, []);
  await teacher.context.close();

  const ipad = await openHome('sister', { ...devices['iPad (gen 11)'] });
  await assertStudentHome(ipad.page, '姐姐');
  const dashboardWidth = await ipad.page.locator('#studentDashboard').evaluate(node => node.getBoundingClientRect().width);
  assert.ok(dashboardWidth <= 820);
  await ipad.page.screenshot({ path: path.join(resultDir, '04-sister-home-ipad.png'), fullPage: true });
  assert.deepEqual(ipad.errors, []);
  await ipad.context.close();

  console.log(`student home dashboard viewport tests passed: ${resultDir}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
