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
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png']
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
  await page.waitForFunction(() => typeof window.jumpVocabularyLessonBatch === 'function');
  await page.waitForSelector('#vocabularyLessonCard');
  return { context, page, consoleErrors };
}

async function assertSceneImageFullyVisible(page, index) {
  await page.evaluate(target => jumpVocabularyLessonBatch(0) && (() => {
    vocabularyLessonState.wordIndex = target;
    vocabularyLessonState.batchPositions[0] = target;
    renderVocabularyLesson();
  })(), index);
  await page.waitForFunction(() => {
    const image = document.querySelector('.vocabulary-lesson-visual.scene img');
    return image && image.complete && image.naturalWidth > 0;
  });
  const geometry = await page.evaluate(() => {
    const image = document.querySelector('.vocabulary-lesson-visual.scene img');
    const panel = document.querySelector('.vocabulary-lesson-visual-panel');
    const imageRect = image.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      image: { left: imageRect.left, top: imageRect.top, right: imageRect.right, bottom: imageRect.bottom, width: imageRect.width, height: imageRect.height },
      panel: { left: panelRect.left, top: panelRect.top, right: panelRect.right, bottom: panelRect.bottom },
      naturalRatio: image.naturalWidth / image.naturalHeight,
      renderedRatio: imageRect.width / imageRect.height
    };
  });
  assert.ok(geometry.image.left >= geometry.panel.left - 1);
  assert.ok(geometry.image.top >= geometry.panel.top - 1);
  assert.ok(geometry.image.right <= geometry.panel.right + 1);
  assert.ok(geometry.image.bottom <= geometry.panel.bottom + 1);
  assert.ok(Math.abs(geometry.naturalRatio - geometry.renderedRatio) < 0.03, JSON.stringify(geometry));
}

try {
  const ipadSizes = [
    { width: 1024, height: 768, name: '1024x768' },
    { width: 1180, height: 820, name: '1180x820' },
    { width: 1194, height: 834, name: '1194x834' }
  ];

  for (const viewport of ipadSizes) {
    const run = await openHarness(viewport);
    const { page } = run;
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '第1批');
    assert.equal(await page.locator('#vocabularyLessonQuickNav button').count(), 6);
    assert.deepEqual(await page.locator('#vocabularyLessonQuickNav button').allTextContents(), ['①', '②', '③', '④', '★ 难词', '↻ 随机']);
    assert.equal(await page.locator('#vocabularyLessonQuickNav .batch.is-active').count(), 1);
    assert.equal(await page.locator('#vocabularyLessonBatchDots .vocabulary-lesson-batch-dot').count(), 10);
    assert.equal(await page.getByRole('button', { name: '难词巩固' }).isDisabled(), true);

    const layout = await page.evaluate(() => {
      const card = document.querySelector('#vocabularyLessonCard').getBoundingClientRect();
      const visual = document.querySelector('.vocabulary-lesson-visual-panel').getBoundingClientRect();
      const info = document.querySelector('.vocabulary-lesson-info-panel').getBoundingClientRect();
      const footer = document.querySelector('#vocabularyLessonFooter').getBoundingClientRect();
      const nav = document.querySelector('#vocabularyLessonQuickNav').getBoundingClientRect();
      const buttons = [...document.querySelectorAll('#vocabularyLessonQuickNav button, #vocabularyLessonFooter button')].map(button => button.getBoundingClientRect().height);
      return {
        cardWidth: card.width,
        visualWidth: visual.width,
        infoWidth: info.width,
        footerBottom: footer.bottom,
        navTop: nav.top,
        navBottom: nav.bottom,
        buttonHeights: buttons,
        viewportHeight: innerHeight,
        noOverflow: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight
      };
    });
    assert.ok(layout.visualWidth / layout.cardWidth >= 0.60, `visual ratio ${layout.visualWidth / layout.cardWidth}`);
    assert.ok(layout.infoWidth / layout.cardWidth <= 0.40, `info ratio ${layout.infoWidth / layout.cardWidth}`);
    assert.ok(layout.footerBottom <= layout.viewportHeight + 1);
    assert.ok(layout.navTop >= 0 && layout.navBottom <= layout.viewportHeight);
    assert.ok(layout.buttonHeights.every(height => height >= 44));
    assert.equal(layout.noOverflow, true);
    assert.equal(await page.locator('body').innerText().then(text => /\d+\s*\/\s*\d+|共\s*\d+|剩余\s*\d+|\d+%/.test(text)), false);

    await assertSceneImageFullyVisible(page, 0);
    await assertSceneImageFullyVisible(page, 1);
    await assertSceneImageFullyVisible(page, 2);

    await page.evaluate(() => {
      jumpVocabularyLessonBatch(1);
      changeVocabularyReviewWord(1);
    });
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '第2批');
    assert.ok(await page.locator('.vocabulary-lesson-word-row h2').innerText().then(text => text.includes('word-12')));
    await page.evaluate(() => closeVocabularyReviewPlayer());
    await page.evaluate(() => selectVocabularyLessonBook('today'));
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '第2批');
    assert.ok(await page.locator('.vocabulary-lesson-word-row h2').innerText().then(text => text.includes('word-12')));

    await page.evaluate(() => {
      jumpVocabularyLessonBatch(0);
      toggleVocabularyLessonHardWord();
    });
    assert.equal(await page.getByRole('button', { name: '难词巩固' }).isDisabled(), false);
    await page.getByRole('button', { name: '难词巩固' }).click();
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '难词巩固');
    assert.equal(await page.locator('#vocabularyLessonBatchDots').isHidden(), true);
    await page.getByRole('button', { name: '第三批' }).click();
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '第3批');

    await page.getByRole('button', { name: '随机过词' }).click();
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '随机过词');
    assert.equal(await page.locator('#vocabularyLessonBatchDots').isHidden(), true);
    await page.getByRole('button', { name: '第四批' }).click();
    assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '第4批');
    assert.equal(await page.locator('#vocabularyLessonBatchDots .vocabulary-lesson-batch-dot').count(), 10);

    await page.screenshot({ path: path.join(resultDir, `task-016-ipad-${viewport.name}.png`), fullPage: true });
    assert.deepEqual(run.consoleErrors, []);
    await run.context.close();
  }

  const iphone = await openHarness({ width: 844, height: 390 });
  const phoneLayout = await iphone.page.evaluate(() => {
    const footer = document.querySelector('#vocabularyLessonFooter').getBoundingClientRect();
    const nav = document.querySelector('#vocabularyLessonQuickNav').getBoundingClientRect();
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
      footerVisible: footer.top < innerHeight && footer.bottom <= innerHeight + 1,
      navVisible: nav.top >= 0 && nav.bottom <= innerHeight,
      buttons: [...document.querySelectorAll('#vocabularyLessonQuickNav button, #vocabularyLessonFooter button')].map(button => button.getBoundingClientRect().height)
    };
  });
  assert.equal(phoneLayout.noHorizontalOverflow, true);
  assert.equal(phoneLayout.footerVisible, true);
  assert.equal(phoneLayout.navVisible, true);
  assert.ok(phoneLayout.buttons.every(height => height >= 38));
  assert.deepEqual(iphone.consoleErrors, []);
  await iphone.page.screenshot({ path: path.join(resultDir, 'task-016-iphone-landscape.png'), fullPage: true });
  await iphone.context.close();

  console.log('vocabulary lesson task 016 WebKit viewport tests passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
