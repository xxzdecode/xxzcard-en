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

function card(word, meaning = word) {
  return {
    word,
    meaning,
    phonetic: `/${word}/`,
    pos: 'n.',
    emoji: '📘',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: ''
  };
}

const formalCards = [
  card('bike', '自行车'), card('bus', '公共汽车'), card('train', '火车'),
  card('ship', '轮船'), card('car', '汽车'), card('plane', '飞机'), card('truck', '卡车'),
  card('sunny', '晴朗的'), card('one', '一'),
  ...[
    'cat', 'dog', 'pig', 'duck', 'rabbit', 'horse', 'elephant', 'ant', 'fish', 'bird',
    'snake', 'mouse', 'kangaroo', 'monkey', 'panda', 'bear', 'lion', 'tiger', 'fox', 'zebra', 'deer'
  ].map(word => card(word))
];
const uncategorizedCards = Array.from({ length: 25 }, (_, index) => (
  card(`zzword${String(index + 1).padStart(2, '0')}`, `校内词${index + 1}`)
));
const allCards = [...formalCards, ...uncategorizedCards, card('legacyword', '旧词')];
const masterCards = Object.fromEntries(allCards.map(item => [item.word.toLowerCase(), item]));
const refs = words => words.map(word => ({ wordKey: word.toLowerCase() }));

const mainData = {
  schemaVersion: 2,
  pin: '1234',
  masterCards,
  mixedAssignments: [],
  taskAssignments: [],
  batches: [
    {
      id: 'ordinary-old-book',
      name: '以前的普通单词本',
      date: '2026-08-20',
      bookPurpose: 'common',
      bookType: 'reference',
      sharedWith: ['sister', 'brother'],
      cardRefs: refs(['legacyword', 'truck']),
      categoryAssignments: [{
        categoryId: 'vehicles',
        categoryName: '交通工具',
        groupId: 'themes',
        groupName: '主题词汇',
        icon: '🚌',
        words: ['truck']
      }]
    },
    {
      id: 'school-grade-4-2026-09-01',
      name: '校内｜四年级｜2026-09-01',
      date: '2026-09-01',
      bookPurpose: 'common',
      bookType: 'reference',
      sharedWith: ['sister', 'brother'],
      cardRefs: refs(uncategorizedCards.slice(0, 8).map(item => item.word))
    },
    {
      id: 'school-grade-7-2026-09-02',
      name: '校内｜七年级｜2026-09-02',
      date: '2026-09-02',
      guideSection: { kind: 'school', grade: '7', date: '2026-09-02' },
      bookPurpose: 'common',
      bookType: 'reference',
      sharedWith: ['sister', 'brother'],
      cardRefs: refs(uncategorizedCards.slice(8, 18).map(item => item.word))
    }
  ]
};

const taughtState = {
  version: 1,
  groups: {
    'book-vehicles:g01': {
      status: 'taught',
      taughtAt: '2026-08-22T08:00:00+08:00',
      eligibleDate: '2026-08-23',
      wordKeysSnapshot: ['bike', 'bus', 'train', 'ship', 'car', 'plane']
    }
  },
  migrations: { 'per-student-completed-union-v1': { migratedAt: '2026-08-21T08:00:00+08:00' } }
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
const browser = useWebKit ? await webkit.launch() : await chromium.launch({ executablePath: edgeExecutable });
const contexts = [];

async function openApp(viewport) {
  const context = await browser.newContext({ viewport, screen: viewport, serviceWorkers: 'block' });
  contexts.push(context);
  await context.addInitScript(({ mirror }) => {
    localStorage.setItem('wc_user', 'teacher');
    localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
  }, { mirror: mainData });
  const state = new Map([
    ['main', structuredClone(mainData)],
    ['vocab_lesson_progress_v1_sister', { version: 1, groups: {}, migrations: {} }],
    ['vocab_lesson_progress_v1_brother', { version: 1, groups: {}, migrations: {} }],
    ['vocab_lesson_taught_v1', structuredClone(taughtState)]
  ]);
  const writes = [];
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Service Worker')) errors.push(message.text());
  });
  page.on('dialog', dialog => dialog.dismiss());
  await page.route('**/rest/v1/kv_store*', async route => {
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
  await page.goto(baseUrl, { waitUntil: 'commit' });
  await page.waitForSelector('#teacherVocabularyGuideEntry:visible');
  return { context, page, errors, state, writes };
}

async function openGuide(page) {
  await page.locator('#teacherVocabularyGuideEntry').click();
  await page.waitForSelector('#screenVocabularyReviewList.active .vocabulary-lesson-category-list');
  await page.waitForFunction(() => Boolean(window.__vocabularyLessonLowPressureGroupsInstalled));
  assert.equal(await page.locator('#screenVocabularyReviewList .topbar-title').textContent(), '新词导览');
  assert.equal(await page.locator('#vocabularyLessonSelectionTitle').textContent(), '选择今天要讲的词汇');
}

async function assertLayout(page, viewport) {
  const layout = await page.evaluate(() => {
    const targets = [...document.querySelectorAll('.vocabulary-lesson-category-button, .vocabulary-lesson-inline-groups button')]
      .filter(button => button.getClientRects().length > 0);
    return {
      width: innerWidth,
      height: innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      minimumTouchHeight: Math.min(...targets.map(button => button.getBoundingClientRect().height)),
      unclassifiedLast: document.querySelector('.vocabulary-lesson-category-list > section:last-child')?.dataset.guideGroup
    };
  });
  assert.deepEqual([layout.width, layout.height], [viewport.width, viewport.height]);
  assert.equal(layout.horizontalOverflow, false);
  assert.ok(layout.minimumTouchHeight >= 44, `touch target was ${layout.minimumTouchHeight}px`);
  assert.equal(layout.unclassifiedLast, 'unclassified');
}

try {
  const ipad = await openApp({ width: 1180, height: 820 });
  await openGuide(ipad.page);
  const guideText = await ipad.page.locator('#vocabularyLessonBookList').innerText();
  assert.match(guideText, /主题词汇/);
  assert.match(guideText, /功能词汇/);
  assert.match(guideText, /校内词汇/);
  assert.match(guideText, /四年级[\s\S]*2026-09-01/);
  assert.match(guideText, /七年级[\s\S]*2026-09-02/);
  assert.match(guideText, /未分类/);
  assert.doesNotMatch(guideText, /以前的普通单词本/);
  assert.doesNotMatch(guideText, /校内｜/);
  assert.equal(await ipad.page.locator('#vocabularyLessonCategoryEntry').count(), 0);
  assert.equal(await ipad.page.locator('.vocabulary-lesson-category-group-picker').count(), 0);
  assert.equal(
    await ipad.page.locator('.vocabulary-lesson-category-card').count(),
    await ipad.page.locator('.vocabulary-lesson-category-count').count(),
    'every category must show its word count'
  );
  assert.equal(await ipad.page.locator('[data-category-id="vehicles"] .vocabulary-lesson-category-count').textContent(), '7 词');
  const vehicleGroups = ipad.page.locator('[data-category-id="vehicles"] [data-group-id]');
  assert.equal(await vehicleGroups.count(), 2);
  assert.deepEqual(await vehicleGroups.allTextContents(), ['第2组 · 1词✓', '第1组 · 6词✓']);
  assert.doesNotMatch(await vehicleGroups.nth(0).getAttribute('class') || '', /is-completed/);
  assert.match(await vehicleGroups.nth(1).getAttribute('class'), /is-completed/);
  assert.equal(await ipad.page.locator('[data-category-id="animals"] .vocabulary-lesson-category-count').textContent(), '21 词');
  assert.deepEqual(
    await ipad.page.locator('[data-category-id="animals"] .vocabulary-lesson-inline-groups button').allTextContents(),
    ['第1组 · 20词✓', '第2组 · 1词✓']
  );
  assert.equal(await ipad.page.locator('[data-category-id="unclassified"] .vocabulary-lesson-category-count').textContent(), '26 词');
  assert.equal(await ipad.page.locator('[data-category-id="unclassified"] [data-group-id]').count(), 1);
  assert.equal(await ipad.page.locator('[data-category-id="unclassified"] .vocabulary-lesson-inline-groups').count(), 0);
  assert.equal(await ipad.page.locator('[data-category-id="vehicles"]').getAttribute('class'), 'vocabulary-lesson-category-card');
  const taughtCard = vehicleGroups.nth(1);
  const untaughtCard = ipad.page.locator('[data-category-id="weather-seasons"] .vocabulary-lesson-category-button');
  const taughtBackground = await taughtCard.evaluate(element => getComputedStyle(element).backgroundColor);
  const untaughtBackground = await untaughtCard.evaluate(element => getComputedStyle(element).backgroundColor);
  assert.equal(taughtBackground, 'rgb(237, 247, 240)');
  assert.notEqual(untaughtBackground, taughtBackground);
  await untaughtCard.hover();
  assert.notEqual(await untaughtCard.evaluate(element => getComputedStyle(element).backgroundColor), taughtBackground);
  await taughtCard.hover();
  assert.equal(await taughtCard.evaluate(element => getComputedStyle(element).backgroundColor), taughtBackground);
  await assertLayout(ipad.page, { width: 1180, height: 820 });

  await ipad.page.locator('[data-category-id="unclassified"] [data-group-id]').click();
  await ipad.page.waitForSelector('#screenVocabularyReviewPlayer.active');
  assert.deepEqual(
    await ipad.page.evaluate(() => ({
      groups: vocabularyLessonState.batches.length,
      words: vocabularyLessonState.batches[0]?.length,
      quickGroups: document.querySelectorAll('#vocabularyLessonQuickNav .vocabulary-lesson-quick-button.batch').length
    })),
    { groups: 1, words: 26, quickGroups: 1 },
    'opening unclassified must preserve one large group'
  );
  await ipad.page.locator('#screenVocabularyReviewPlayer .vocabulary-lesson-icon-button').click();
  await ipad.page.waitForSelector('#screenVocabularyReviewList.active .vocabulary-lesson-category-list');

  const mainWritesBeforeOpen = ipad.writes.filter(write => write.key === 'main').length;
  await vehicleGroups.nth(1).click();
  await ipad.page.waitForSelector('#screenVocabularyReviewPlayer.active');
  assert.equal(await ipad.page.locator('#vocabularyLessonModeTitle').textContent(), '交通工具');
  assert.deepEqual(
    await ipad.page.evaluate(() => ({
      ids: vocabularyLessonState.groupConfig.groups.map(group => group.id),
      counts: vocabularyLessonState.batches.map(items => items.length)
    })),
    { ids: ['book-vehicles:g01', 'vocabulary-category:vehicles:g02'], counts: [6, 1] }
  );
  assert.equal(ipad.writes.filter(write => write.key === 'main').length, mainWritesBeforeOpen);
  await ipad.page.locator('#screenVocabularyReviewPlayer .vocabulary-lesson-icon-button').click();
  await ipad.page.waitForSelector('#screenVocabularyReviewList.active .vocabulary-lesson-category-list');
  assert.equal(await ipad.page.locator('.vocabulary-lesson-category-group-picker').count(), 0);

  await ipad.page.locator('[data-category-id="weather-seasons"] [data-group-id]').click();
  await ipad.page.waitForSelector('#screenVocabularyReviewPlayer.active');
  await ipad.page.getByRole('button', { name: '下一个词' }).click();
  const completeButton = ipad.page.locator('.vocabulary-lesson-next-batch');
  await completeButton.waitFor({ state: 'visible' });
  assert.equal(await completeButton.textContent(), '完成本组 →');
  await completeButton.click();
  await ipad.page.waitForSelector('#screenVocabularyReviewList.active .vocabulary-lesson-category-list');
  assert.equal(ipad.state.get('vocab_lesson_taught_v1').groups['vocabulary-category:weather-seasons:g01'].status, 'taught');
  assert.equal(await ipad.page.locator('[data-category-id="weather-seasons"]').getAttribute('class'), 'vocabulary-lesson-category-card is-completed');
  await ipad.page.screenshot({ path: path.join(outputDir, 'new-word-guide-ipad-air11-1180x820.png'), fullPage: true });
  assert.deepEqual(ipad.errors, []);
  await ipad.context.close();

  const iphone = await openApp({ width: 393, height: 852 });
  await openGuide(iphone.page);
  await assertLayout(iphone.page, { width: 393, height: 852 });
  assert.equal(await iphone.page.locator('[data-category-id="animals"] .vocabulary-lesson-category-count').textContent(), '21 词');
  assert.equal(await iphone.page.locator('[data-category-id="unclassified"] [data-group-id]').count(), 1);
  await iphone.page.screenshot({ path: path.join(outputDir, 'new-word-guide-iphone16-393x852.png'), fullPage: true });
  assert.deepEqual(iphone.errors, []);
  await iphone.context.close();

  console.log(`vocabulary lesson route and viewport tests passed (${useWebKit ? 'WebKit' : 'Chromium'}): ${outputDir}`);
} finally {
  for (const context of contexts) {
    try { await context.close(); } catch (_) {}
  }
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
