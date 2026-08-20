import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium, webkit } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const edgeExecutable = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputDir = path.join(root, '.codex-backups', 'vocabulary-lesson-route-qa');
fs.mkdirSync(outputDir, { recursive: true });

const cards = [
  ['bus', '公共汽车'], ['car', '汽车'], ['bike', '自行车'], ['train', '火车'],
  ['plane', '飞机'], ['ship', '轮船'], ['red', '红色'], ['mother', '母亲'],
  ['sunny', '晴朗的'], ['book', '书'], ['apple', '苹果'], ['teacher', '老师']
].map(([word, meaning]) => ({ word, meaning, phonetic: `/${word}/`, pos: 'n.', emoji: '📘' }));

const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [
    {
      id: 'older-book', name: '较早单词本', createdAt: '2026-08-01', date: '2026-08-01',
      bookPurpose: 'common', sharedWith: ['sister', 'brother'], cards: [cards[6]]
    },
    {
      id: 'today-book', name: '今日新词', createdAt: '2026-08-05', date: '2026-08-05',
      bookPurpose: 'common', sharedWith: ['sister', 'brother'], cards
    }
  ]
};

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'], ['.png', 'image/png'], ['.ttf', 'font/ttf']
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
const useWebKit = process.env.PW_BROWSER === 'webkit';
const browser = useWebKit
  ? await webkit.launch()
  : await chromium.launch({ executablePath: edgeExecutable });

async function openApp(viewport, user = 'sister', options = {}) {
  const context = await browser.newContext({ viewport, screen: viewport, serviceWorkers: 'block' });
  await context.addInitScript(({ selectedUser, mirror }) => {
    localStorage.setItem('wc_user', selectedUser);
    localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
  }, { selectedUser: user, mirror: mainData });
  const state = new Map([
    ['main', structuredClone(mainData)],
    [`vocab_lesson_progress_v1_${user}`, { version: 1, groups: {}, migrations: {} }]
  ]);
  const writes = [];
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Service Worker')) errors.push(message.text());
  });
  await page.route('**/rest/v1/kv_store*', async route => {
    if (options.kvDelayMs) {
      await new Promise(resolve => setTimeout(resolve, options.kvDelayMs));
    }
    const request = route.request();
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      writes.push(structuredClone(payload));
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
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#vocabularyTourHomeEntry:visible');
  return { context, page, errors, state, writes };
}

async function openGuide(page) {
  await page.locator('#vocabularyTourHomeEntry').click();
  await page.waitForSelector('#screenVocabularyReviewList.active #vocabularyLessonBookList');
  await page.waitForFunction(() => Boolean(window.__vocabularyLessonLowPressureGroupsInstalled));
  assert.equal(await page.locator('#screenVocabularyReviewList .topbar-title').textContent(), '新词导览');
  assert.equal(await page.locator('#vocabularyLessonSelectionTitle').textContent(), '选择今天要讲的单词本');
  assert.match(await page.locator('#vocabularyLessonBookList').first().textContent(), /今日新词/);
  assert.equal(await page.locator('#vocabularyLessonCategoryEntry').count(), 1);
}

async function assertLayout(page, viewport) {
  const layout = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#screenVocabularyReviewList.active button')]
      .filter(button => button.getClientRects().length > 0);
    return {
      width: innerWidth,
      height: innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      minimumTouchHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
      titleVisible: document.getElementById('vocabularyLessonSelectionTitle').getBoundingClientRect().bottom > 0
    };
  });
  assert.deepEqual([layout.width, layout.height], [viewport.width, viewport.height]);
  assert.equal(layout.horizontalOverflow, false);
  assert.ok(layout.minimumTouchHeight >= 44, `touch target was ${layout.minimumTouchHeight}px`);
  assert.equal(layout.titleVisible, true);
}

async function clickVocabularyLessonListBack(page) {
  const button = page.locator('#screenVocabularyReviewList .back-btn');
  try {
    await button.click({ timeout: 5000 });
  } catch (error) {
    const state = await page.evaluate(() => {
      const screen = document.getElementById('screenVocabularyReviewList');
      const backButton = screen?.querySelector('.back-btn');
      const style = backButton ? getComputedStyle(backButton) : null;
      const rect = backButton?.getBoundingClientRect();
      const center = rect ? [rect.left + rect.width / 2, rect.top + rect.height / 2] : null;
      return {
        screenClassName: screen?.className || '',
        buttonHidden: backButton?.hidden ?? null,
        display: style?.display || '',
        visibility: style?.visibility || '',
        pointerEvents: style?.pointerEvents || '',
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        centerStack: center ? document.elementsFromPoint(...center).map(node => `${node.tagName.toLowerCase()}#${node.id}.${node.className}`) : [],
        selectionRoute: typeof vocabularyLessonState === 'object' ? vocabularyLessonState.selectionRoute : '',
        bodyClassName: document.body.className
      };
    });
    throw new Error(`new-word guide list back button was not clickable: ${JSON.stringify(state)}`, { cause: error });
  }
}

try {
  const ipad = await openApp({ width: 1180, height: 820 });
  await openGuide(ipad.page);
  const mainWritesBeforeWorkbookOpen = ipad.writes.filter(write => write.key === 'main').length;
  await ipad.page.locator('#vocabularyLessonBookList .vocabulary-lesson-book-button').first().click();
  await ipad.page.waitForSelector('#screenVocabularyReviewPlayer.active');
  await ipad.page.waitForTimeout(550);
  assert.equal(
    ipad.writes.filter(write => write.key === 'main').length,
    mainWritesBeforeWorkbookOpen,
    'opening a workbook guide must not write global main data'
  );
  await ipad.page.locator('#screenVocabularyReviewPlayer .vocabulary-lesson-icon-button').click();
  await ipad.page.waitForSelector('#screenVocabularyReviewList.active');
  await assertLayout(ipad.page, { width: 1180, height: 820 });
  assert.equal(
    await ipad.page.locator('script[data-feature-source="js/vocabularyLesson016.js"]').count(),
    1,
    'task 016 should load once through the lazy feature group'
  );

  await clickVocabularyLessonListBack(ipad.page);
  await ipad.page.waitForSelector('#screenHome.active');
  await openGuide(ipad.page);

  await ipad.page.locator('#vocabularyLessonCategoryEntry').click();
  await ipad.page.waitForFunction(() => document.getElementById('vocabularyLessonSelectionTitle')?.textContent === '选择词汇类别');
  await ipad.page.evaluate(() => refreshVocabularyReviewSharedStateFromAppData());
  assert.equal(
    await ipad.page.locator('#vocabularyLessonSelectionTitle').textContent(),
    '选择词汇类别',
    'background main-data refresh must preserve the category route'
  );
  await ipad.page.getByRole('button', { name: /交通工具/ }).click();
  await ipad.page.waitForSelector('.vocabulary-lesson-category-group-picker');
  await ipad.page.evaluate(() => refreshVocabularyReviewSharedStateFromAppData());
  await ipad.page.waitForSelector('.vocabulary-lesson-category-group-picker');
  assert.equal(
    await ipad.page.evaluate(() => vocabularyLessonState.selectionRoute),
    'category-groups',
    'background main-data refresh must preserve the category-group route'
  );
  assert.deepEqual(await ipad.page.evaluate(() => ({
    virtualInAppData: appData.batches.some(batch => String(batch.id).startsWith('vocabulary-category:')),
    batchId: vocabularyLessonState.batch?.id || '',
    currentBatchId
  })), {
    virtualInAppData: false,
    batchId: 'vocabulary-category:vehicles',
    currentBatchId: null
  });
  await ipad.page.locator('.vocabulary-lesson-category-group-row').first().click();
  await ipad.page.waitForSelector('#screenVocabularyReviewPlayer.active');
  await ipad.page.locator('#screenVocabularyReviewPlayer .vocabulary-lesson-icon-button').click();
  await ipad.page.waitForSelector('.vocabulary-lesson-category-group-picker');
  await ipad.page.locator('#screenVocabularyReviewList .back-btn').click();
  await ipad.page.waitForFunction(() => document.getElementById('vocabularyLessonSelectionTitle')?.textContent === '选择词汇类别');
  await ipad.page.locator('#screenVocabularyReviewList .back-btn').click();
  await ipad.page.waitForFunction(() => document.getElementById('vocabularyLessonSelectionTitle')?.textContent === '选择今天要讲的单词本');
  await ipad.page.locator('#screenVocabularyReviewList .back-btn').click();
  await ipad.page.waitForSelector('#screenHome.active');
  await openGuide(ipad.page);
  assert.equal(await ipad.page.locator('.vocabulary-lesson-category-list').count(), 0, 're-entry must restore the workbook route');

  await ipad.page.locator('#vocabularyLessonCategoryEntry').click();
  await ipad.page.getByRole('button', { name: /交通工具/ }).click();
  await ipad.page.waitForSelector('.vocabulary-lesson-category-group-picker');
  await ipad.page.evaluate(() => switchUser('brother'));
  await ipad.page.waitForSelector('#screenHome.active');
  assert.deepEqual(await ipad.page.evaluate(() => ({
    user: currentUser,
    virtualInAppData: appData.batches.some(batch => String(batch.id).startsWith('vocabulary-category:')),
    batch: vocabularyLessonState.batch,
    categoryId: vocabularyLessonState.categoryId || ''
  })), { user: 'brother', virtualInAppData: false, batch: null, categoryId: '' });
  await openGuide(ipad.page);
  assert.match(await ipad.page.locator('#vocabularyLessonBookList').first().textContent(), /今日新词/);

  await ipad.page.evaluate(async () => {
    const unsafe = JSON.parse(JSON.stringify(appData));
    unsafe.batches.push({
      id: 'vocabulary-category:injected',
      vocabularyLessonTransient: true,
      cards: [{ word: 'ghost', meaning: '不应保存' }]
    });
    unsafe.vocabularyLessonGroups = { 'vocabulary-category:injected': { groups: [] } };
    await sbSet('main', unsafe);
  });
  const storedMain = ipad.state.get('main');
  assert.equal(storedMain.batches.some(batch => String(batch.id).startsWith('vocabulary-category:')), false);
  assert.equal(Object.keys(storedMain.vocabularyLessonGroups || {}).some(id => id.startsWith('vocabulary-category:')), false);
  await ipad.page.screenshot({ path: path.join(outputDir, 'new-word-guide-ipad-air11-1180x820.png'), fullPage: true });
  assert.deepEqual(ipad.errors, []);
  await ipad.context.close();

  const iphone = await openApp({ width: 393, height: 852 });
  await openGuide(iphone.page);
  await assertLayout(iphone.page, { width: 393, height: 852 });
  await iphone.page.screenshot({ path: path.join(outputDir, 'new-word-guide-iphone16-393x852.png'), fullPage: true });
  assert.deepEqual(iphone.errors, []);
  await iphone.context.close();

  const slowCloud = await openApp({ width: 393, height: 852 }, 'sister', { kvDelayMs: 2500 });
  const slowCloudStarted = Date.now();
  await openGuide(slowCloud.page);
  assert.ok(
    Date.now() - slowCloudStarted < 1800,
    'new-word guide must render from local data without waiting for slow cloud progress reads'
  );
  await slowCloud.context.close();

  console.log(`vocabulary lesson route and viewport tests passed (${useWebKit ? 'WebKit' : 'Chromium'}): ${outputDir}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
