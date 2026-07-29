import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, devices, webkit } = createRequire(import.meta.url)('playwright');

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
  await context.addInitScript(({ selectedUser, mirror }) => {
    localStorage.setItem('wc_user', selectedUser);
    localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
  }, { selectedUser: user, mirror: mainData });
  const state = new Map([
    ['main', structuredClone(mainData)],
    [`vocab_adventure_v1_${user}`, structuredClone(adventureState)],
    [`daily_task_${user}`, {}],
    [`student_reward_v1_${user}`, {
      version: 1,
      user,
      totalCoins: user === 'brother' ? 417 : 406,
      daily: {}
    }]
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
  try {
    await page.waitForFunction(expected => (
      document.getElementById('studentSummaryName')?.textContent === expected
        || (expected === '老师' && document.body.classList.contains('is-teacher'))
    ), user === 'brother' ? '弟弟' : user === 'teacher' ? '老师' : '姐姐');
  } catch (error) {
    const state = await page.evaluate(() => ({
      readyState: document.readyState,
      currentName: document.getElementById('studentSummaryName')?.textContent || '',
      bodyClass: document.body.className
    }));
    throw new Error(`student home init failed for ${user}: ${JSON.stringify({ state, errors })}`, { cause: error });
  }
  await page.waitForFunction(() => Boolean(document.querySelector('link[data-student-home-dashboard]')?.sheet));
  if (user !== 'teacher') {
    assert.equal(await page.locator('#fbLoading').isVisible().catch(() => false), false);
    const scenes = page.locator('.student-home-card__scene');
    for (let index = 0; index < await scenes.count(); index += 1) {
      await scenes.nth(index).scrollIntoViewIfNeeded();
      await scenes.nth(index).evaluate(image => image.decode());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  return { context, page, errors };
}

async function assertStudentHome(page, expectedName, {
  orientation,
  expectRotatePrompt = false,
  minimumDashboardWidth = 0
}) {
  await page.waitForSelector('#studentDashboard:visible');
  assert.equal(await page.locator('#studentSummaryName').textContent(), expectedName);
  await page.waitForSelector('#studentRewardValues:visible');
  assert.equal(await page.locator('#studentRewardUnavailable').isHidden(), true);
  assert.equal(
    await page.locator('#studentTotalCoins').textContent(),
    expectedName === '弟弟' ? '417' : '406'
  );
  assert.equal(await page.locator('#homeQuickActions').count(), 0);
  assert.equal(await page.locator('#todayWordBtn').count(), 0);
  assert.equal(await page.locator('#mixedWordBtn').count(), 0);
  assert.deepEqual(
    await page.locator('.student-home-section > h2').allTextContents(),
    ['今日复习', '挑战测验', '今日新课']
  );
  assert.deepEqual(
    await page.locator('.student-home-card__scene').evaluateAll(images => images.map(image => image.getAttribute('src'))),
    [
      'assets/student-home/card6/scenes/vocabulary-adventure-scene.webp',
      'assets/student-home/card6/scenes/word-challenge-scene.webp',
      'assets/student-home/card6/scenes/grammar-challenge-scene.webp',
      'assets/student-home/card6/scenes/classroom-practice-scene.webp',
      'assets/student-home/card6/scenes/new-word-guide-scene.webp'
    ]
  );
  const layout = await page.evaluate(() => {
    const adventure = document.getElementById('vocabularyAdventurePreviewEntry').getBoundingClientRect();
    const word = document.getElementById('vocabularyAdventureChallengeEntry').getBoundingClientRect();
    const grammar = document.getElementById('grammarChallengeHomeEntry').getBoundingClientRect();
    const classroom = document.getElementById('studentClassroomPracticeEntry').getBoundingClientRect();
    const tour = document.getElementById('vocabularyTourHomeEntry').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      verticalOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      adventureHeight: adventure.height,
      compactHeight: word.height,
      dashboardWidth: document.getElementById('studentDashboard').getBoundingClientRect().width,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      challengeSameColumn: Math.abs(word.left - grammar.left) < 2,
      lessonSameColumn: Math.abs(classroom.left - tour.left) < 2,
      challengeSameRow: Math.abs(word.top - grammar.top) < 2,
      lessonSameRow: Math.abs(classroom.top - tour.top) < 2,
      minTouch: Math.min(...[...document.querySelectorAll('#studentDashboard button, #studentFeatureNav button')]
        .map(button => button.getBoundingClientRect().height)),
      maxVisibleBottom: Math.max(
        ...[...document.querySelectorAll('#studentDashboard button, #studentFeatureNav button')]
          .map(button => button.getBoundingClientRect().bottom)
      )
    };
  });
  assert.equal(layout.overflow, false);
  if (orientation === 'landscape') {
    assert.equal(layout.verticalOverflow, false);
    assert.ok(layout.maxVisibleBottom <= layout.innerHeight);
  }
  assert.ok(layout.adventureHeight > layout.compactHeight);
  assert.equal(
    orientation === 'landscape' ? layout.challengeSameColumn : layout.challengeSameRow,
    true
  );
  assert.equal(
    orientation === 'landscape' ? layout.lessonSameColumn : layout.lessonSameRow,
    true
  );
  assert.ok(layout.minTouch >= 44);
  assert.equal(
    layout.innerWidth > layout.innerHeight,
    orientation === 'landscape',
    `expected explicit ${orientation} viewport, got ${layout.innerWidth}x${layout.innerHeight}`
  );
  assert.ok(layout.dashboardWidth >= minimumDashboardWidth);
  assert.equal(await page.locator('#studentHomeRotatePrompt').isVisible(), expectRotatePrompt);
}

const iphone16Portrait = {
  ...devices['iPhone 13'],
  viewport: { width: 393, height: 852 },
  screen: { width: 393, height: 852 }
};
const ipadBase = {
  userAgent: devices['iPad (gen 11)'].userAgent,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true
};
const ipadViewport = (width, height) => ({
  ...ipadBase,
  viewport: { width, height },
  screen: { width, height }
});

async function assertCachedHomeWorksOffline() {
  const offlineBrowser = await chromium.launch();
  const context = await offlineBrowser.newContext({
    ...ipadViewport(1180, 820),
    serviceWorkers: 'allow'
  });
  try {
    await context.addInitScript(mirror => {
      localStorage.setItem('wc_user', 'sister');
      localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
      localStorage.setItem('wc_sb_student_reward_v1_sister', JSON.stringify({
        version: 1,
        user: 'sister',
        totalCoins: 406,
        daily: {}
      }));
    }, mainData);
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      return true;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    const startedAt = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(() => document.getElementById('studentSummaryName')?.textContent === '姐姐');
    await page.waitForFunction(() => document.getElementById('studentTotalCoins')?.textContent === '406');
    assert.ok(Date.now() - startedAt < 5000);
    assert.equal(await page.locator('#studentDashboard').isVisible(), true);
    assert.equal(await page.locator('#studentTotalCoins').textContent(), '406');
    await context.setOffline(false);
  } finally {
    await context.close();
    await offlineBrowser.close();
  }
}

try {
  if (process.env.STUDENT_HOME_OFFLINE_ONLY === '1') {
    await assertCachedHomeWorksOffline();
    console.log('student home offline cache test passed');
  } else {
  const sister = await openHome('sister', iphone16Portrait);
  await assertStudentHome(sister.page, '姐姐', { orientation: 'portrait' });
  await sister.page.screenshot({ path: path.join(resultDir, 'sister-home-iphone16-portrait-393x852.png'), fullPage: true });
  await sister.page.locator('#studentClassroomPracticeEntry').click();
  await sister.page.waitForSelector('#screenCourseware.active');
  assert.equal(await sister.page.locator('#coursewareListTitle').textContent(), '选择随堂练习');
  assert.equal(await sister.page.locator('#coursewareList .game-entry').count(), 13);
  await sister.page.screenshot({ path: path.join(resultDir, 'classroom-practice-student-directory.png'), fullPage: true });
  assert.deepEqual(sister.errors, []);
  await sister.context.close();

  const brother = await openHome('brother', iphone16Portrait);
  await assertStudentHome(brother.page, '弟弟', { orientation: 'portrait' });
  assert.equal(await brother.page.locator('#studentSummaryAvatarImage').isVisible(), true);
  assert.match(await brother.page.locator('#studentSummaryAvatarImage').getAttribute('src'), /brother-avatar\.png$/);
  await brother.page.screenshot({ path: path.join(resultDir, 'brother-home-iphone16-portrait-393x852.png'), fullPage: true });
  assert.deepEqual(brother.errors, []);
  await brother.context.close();

  const teacher = await openHome('teacher', iphone16Portrait);
  assert.equal(await teacher.page.locator('#studentDashboard').isHidden(), true);
  assert.equal(await teacher.page.locator('#studentFeatureNav').isHidden(), true);
  assert.equal(await teacher.page.locator('.teacher-home-nav').isVisible(), true);
  assert.deepEqual(
    await teacher.page.locator('.teacher-home-nav .bottom-feature-nav__item span').allTextContents(),
    ['单词卡', '随堂练习', '知识点库']
  );
  await teacher.page.screenshot({ path: path.join(resultDir, 'teacher-home-iphone16-portrait-393x852.png'), fullPage: true });
  assert.deepEqual(teacher.errors, []);
  await teacher.context.close();

  const ipadAir = await openHome('sister', ipadViewport(1180, 820));
  await assertStudentHome(ipadAir.page, '姐姐', {
    orientation: 'landscape',
    minimumDashboardWidth: 1128
  });
  await ipadAir.page.screenshot({ path: path.join(resultDir, 'sister-home-ipad-air11-landscape-1180x820.png'), fullPage: true });
  assert.deepEqual(ipadAir.errors, []);
  await ipadAir.context.close();

  await assertCachedHomeWorksOffline();

  console.log(`student home dashboard viewport tests passed: ${resultDir}`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
