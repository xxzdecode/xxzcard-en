import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
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
const browser = await webkit.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${address.port}/tests/fixtures/vocabularyLessonHarness.html`, {
    waitUntil: 'networkidle'
  });
  await page.waitForSelector('#vocabularyLessonCard');

  await page.evaluate(() => renderVocabularyLessonBookSelection());
  const books = await page.locator('.vocabulary-lesson-book-button').evaluateAll(buttons => buttons.map(button => ({
    text: button.innerText.replace(/\s+/g, ' ').trim(),
    latest: button.classList.contains('is-latest')
  })));
  assert.deepEqual(books.map(book => book.text), ['📚 较早单词本 ›', '📚 今日生词最新 ›']);
  assert.deepEqual(books.map(book => book.latest), [false, true]);

  const navigation = page.locator('.vocabulary-lesson-mode-button');
  assert.deepEqual(await navigation.allTextContents(), ['①', '②', '③', '④', '★ 难词', '↻ 随机']);
  assert.equal(await navigation.nth(0).getAttribute('aria-pressed'), 'true');
  assert.equal(await navigation.nth(4).isDisabled(), true);
  assert.equal(await page.locator('.vocabulary-lesson-batch-dot').count(), 10);

  await navigation.nth(1).click();
  await page.evaluate(() => {
    changeVocabularyReviewWord(1);
    changeVocabularyReviewWord(1);
  });
  assert.deepEqual(
    await page.evaluate(() => ({ batchIndex: vocabularyLessonState.batchIndex, wordIndex: vocabularyLessonState.wordIndex })),
    { batchIndex: 1, wordIndex: 2 }
  );

  await page.evaluate(() => closeVocabularyReviewPlayer());
  await page.evaluate(() => selectVocabularyLessonBook('today'));
  assert.deepEqual(
    await page.evaluate(() => ({ batchIndex: vocabularyLessonState.batchIndex, wordIndex: vocabularyLessonState.wordIndex })),
    { batchIndex: 1, wordIndex: 2 }
  );
  const teacherProgress = await page.evaluate(() => ({
    key: getVocabularyLessonProgressStorageKey(),
    value: JSON.parse(localStorage.getItem(getVocabularyLessonProgressStorageKey()))
  }));
  assert.match(teacherProgress.key, /teacher:today$/);
  assert.equal(teacherProgress.value.lastBatchIndex, 1);
  assert.equal(teacherProgress.value.wordIndices[1], 2);

  await navigation.nth(0).click();
  await page.evaluate(() => {
    vocabularyLessonState.wordIndex = 0;
    rememberVocabularyLessonPosition();
    renderVocabularyLesson();
    toggleVocabularyLessonHardWord();
  });
  assert.equal(await navigation.nth(4).isDisabled(), false);
  await navigation.nth(5).click();
  assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '随机过词');
  await navigation.nth(4).click();
  assert.equal(await page.locator('#vocabularyLessonModeTitle').textContent(), '难词巩固');
  await navigation.nth(1).click();
  assert.deepEqual(
    await page.evaluate(() => ({
      batchIndex: vocabularyLessonState.batchIndex,
      wordIndex: vocabularyLessonState.wordIndex,
      hardWordKept: vocabularyLessonState.hardWords.has('breath')
    })),
    { batchIndex: 1, wordIndex: 2, hardWordKept: true }
  );

  const separated = await page.evaluate(() => {
    const teacherKey = getVocabularyLessonProgressStorageKey();
    currentUser = 'sister';
    const sisterKey = getVocabularyLessonProgressStorageKey();
    localStorage.setItem(sisterKey, '{broken json');
    selectVocabularyLessonBook('today');
    return {
      teacherKey,
      sisterKey,
      batchIndex: vocabularyLessonState.batchIndex,
      wordIndex: vocabularyLessonState.wordIndex
    };
  });
  assert.notEqual(separated.teacherKey, separated.sisterKey);
  assert.deepEqual(
    { batchIndex: separated.batchIndex, wordIndex: separated.wordIndex },
    { batchIndex: 0, wordIndex: 0 }
  );

  const clamped = await page.evaluate(() => {
    const key = getVocabularyLessonProgressStorageKey();
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      lastBatchIndex: 99,
      wordIndices: [99, 99, 99, 99]
    }));
    selectVocabularyLessonBook('today');
    return {
      batchIndex: vocabularyLessonState.batchIndex,
      wordIndex: vocabularyLessonState.wordIndex
    };
  });
  assert.deepEqual(clamped, { batchIndex: 3, wordIndex: 9 });
  assert.deepEqual(errors, []);
  console.log('vocabulary lesson functionality tests passed');
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
