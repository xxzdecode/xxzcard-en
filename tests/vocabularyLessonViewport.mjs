import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, 'test-results');
fs.mkdirSync(resultDir, { recursive: true });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(root, safePath === '/' ? 'index.html' : safePath.replace(/^\//, ''));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
  response.end(fs.readFileSync(filePath));
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await webkit.launch();

async function openHarness(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.goto(`${baseUrl}/tests/fixtures/vocabularyLessonHarness.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#vocabularyLessonCard');
  return { context, page, consoleErrors };
}

try {
  const ipad = await openHarness({ width: 1180, height: 820 });
  const { page } = ipad;
  assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '第1批');
  assert.equal(await page.locator('body').innerText().then(text => /\d+\s*\/\s*\d+|共\s*\d+|剩余\s*\d+/.test(text)), false);

  const layout = await page.evaluate(() => {
    const card = document.querySelector('#vocabularyLessonCard').getBoundingClientRect();
    const visual = document.querySelector('.vocabulary-lesson-visual-panel').getBoundingClientRect();
    const info = document.querySelector('.vocabulary-lesson-info-panel').getBoundingClientRect();
    const footer = document.querySelector('#vocabularyLessonFooter').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('#vocabularyLessonFooter button')].map(button => button.getBoundingClientRect().height);
    return {
      cardWidth: card.width,
      visualWidth: visual.width,
      infoWidth: info.width,
      footerBottom: footer.bottom,
      buttonHeights: buttons,
      viewportHeight: innerHeight,
      noOverflow: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight
    };
  });
  assert.ok(layout.visualWidth / layout.cardWidth >= 0.61, `visual ratio ${layout.visualWidth / layout.cardWidth}`);
  assert.ok(layout.infoWidth / layout.cardWidth <= 0.39, `info ratio ${layout.infoWidth / layout.cardWidth}`);
  assert.ok(layout.footerBottom <= layout.viewportHeight + 1);
  assert.ok(layout.buttonHeights.every(height => height >= 44));
  assert.equal(layout.noOverflow, true);
  await page.screenshot({ path: path.join(resultDir, 'task-015-ipad-teaching.png'), fullPage: true });

  await page.evaluate(() => {
    vocabularyLessonState.mode = 'batchReview';
    renderVocabularyLesson();
  });
  const wall = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.vocabulary-lesson-image-tile')];
    const boxes = tiles.map(tile => tile.getBoundingClientRect());
    return {
      count: tiles.length,
      columns: new Set(boxes.map(box => Math.round(box.x))).size,
      rows: new Set(boxes.map(box => Math.round(box.y))).size,
      labels: tiles.map(tile => tile.getAttribute('aria-label')),
      text: tiles.map(tile => tile.textContent.trim()),
      noOverflow: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight
    };
  });
  assert.equal(wall.count, 10);
  assert.equal(wall.columns, 5);
  assert.equal(wall.rows, 2);
  assert.ok(wall.labels.every(label => label === '查看这张图片'));
  assert.ok(wall.text.every(text => !/[A-Za-z\u3400-\u9fff]/.test(text)));
  assert.equal(wall.noOverflow, true);
  await page.screenshot({ path: path.join(resultDir, 'task-015-ipad-image-wall.png'), fullPage: true });

  await page.locator('.vocabulary-lesson-image-tile').nth(1).click();
  assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '图片回顾');
  assert.ok(await page.locator('.vocabulary-lesson-info-panel').innerText().then(text => text.includes('hilltop')));
  await page.getByRole('button', { name: '退出回顾' }).click();
  assert.equal(await page.locator('.vocabulary-lesson-image-tile').count(), 10);

  await page.evaluate(() => {
    vocabularyLessonState.mode = 'finalMenu';
    renderVocabularyLesson();
  });
  const finalActions = await page.locator('.vocabulary-lesson-final-actions strong').allTextContents();
  assert.deepEqual(finalActions, ['随机过词', '难词巩固']);

  await page.evaluate(() => startVocabularyLessonRandomReview(false));
  assert.equal(await page.locator('#vocabularyLessonInfoContent').getAttribute('hidden'), '');
  assert.equal(await page.locator('#vocabularyLessonInfoContent').getAttribute('aria-hidden'), 'true');
  await page.getByRole('button', { name: /点击显示/ }).click();
  assert.equal(await page.locator('#vocabularyLessonInfoContent').getAttribute('hidden'), null);

  await page.evaluate(() => {
    vocabularyLessonState.mode = 'teaching';
    vocabularyLessonState.batchIndex = 0;
    vocabularyLessonState.wordIndex = 0;
    renderVocabularyLesson();
    toggleVocabularyLessonHardWord();
    startVocabularyLessonHardWordReview();
  });
  assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '难词巩固');
  assert.equal(await page.locator('body').innerText().then(text => /\d+\s*\/\s*\d+|共\s*\d+|难词\s*\d+/.test(text)), false);
  assert.ok(await page.getByRole('button', { name: '退出巩固' }).isVisible());
  assert.deepEqual(ipad.consoleErrors, []);
  await ipad.context.close();

  const iphone = await openHarness({ width: 844, height: 390 });
  const phoneLayout = await iphone.page.evaluate(() => {
    const footer = document.querySelector('#vocabularyLessonFooter').getBoundingClientRect();
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
      footerVisible: footer.top < innerHeight && footer.bottom <= innerHeight + 1,
      buttons: [...document.querySelectorAll('#vocabularyLessonFooter button')].map(button => button.getBoundingClientRect().height)
    };
  });
  assert.equal(phoneLayout.noHorizontalOverflow, true);
  assert.equal(phoneLayout.footerVisible, true);
  assert.ok(phoneLayout.buttons.every(height => height >= 38));
  assert.deepEqual(iphone.consoleErrors, []);
  await iphone.page.screenshot({ path: path.join(resultDir, 'task-015-iphone-landscape.png'), fullPage: true });
  await iphone.context.close();

  console.log('vocabulary lesson WebKit viewport tests passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
