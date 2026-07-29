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

const cards = Array.from({ length: 12 }, (_, index) => {
  const word = `trail${index}`;
  return {
    word,
    meaning: `探险词${index}`,
    pos: 'n.',
    phonetic: `/treɪl${index}/`,
    emoji: '🌲',
    morphology: [],
    collocations: [{
      phrase: `${word} practice`,
      example: `We use ${word} in this example today`
    }],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: ''
  };
});

const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [{
    id: 'challenge-viewport',
    name: '挑战本地测试',
    date: '2026-07-29',
    bookPurpose: 'common',
    sharedWith: ['sister', 'brother'],
    cards
  }]
};

const initialAdventureState = {
  version: 1,
  words: Object.fromEntries(cards.map((card, index) => [card.word, {
    lastResult: index % 3 === 0 ? 'F' : index % 3 === 1 ? 'H' : 'D',
    intervalIndex: index % 5,
    lastReviewedAt: '2026-07-20T02:00:00.000Z',
    nextReviewAt: index < 8 ? '2026-07-25' : '2026-08-10',
    reviewCount: 1,
    lastTaskType: '',
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
  ['.png', 'image/png']
]);

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(root, urlPath === '/' ? 'index.html' : safePath.replace(/^[/\\]/, ''));
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

async function openPage(viewport, preview = true, failedAdventureWrites = []) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => localStorage.setItem('wc_user', 'sister'));
  const state = new Map([
    ['main', structuredClone(mainData)],
    ['vocab_adventure_v1_sister', structuredClone(initialAdventureState)],
    ['daily_task_sister', {}]
  ]);
  const page = await context.newPage();
  const errors = [];
  let adventureWriteCount = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('/rest/v1/kv_store')) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.route('**/rest/v1/kv_store*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      if (payload.key.startsWith('vocab_adventure_v1_')) {
        adventureWriteCount += 1;
        if (failedAdventureWrites.includes(adventureWriteCount)) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
          return;
        }
      }
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
  await page.goto(`${baseUrl}/${preview ? '?previewVocabularyAdventure=1' : ''}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.openVocabularyAdventureChallenge === 'function');
  await page.waitForFunction(() => document.getElementById('currentModeBadge')?.textContent.includes('当前：'));
  return { context, page, state, errors };
}

async function answerCurrent(page, state, correct = true) {
  const saved = state.get('vocab_adventure_v1_sister');
  const session = saved.challengeSession;
  const item = session.items[session.cursor];
  const question = item.question;
  if (question.interaction === 'choice') {
    const selected = correct
      ? question.correctIndex
      : (question.correctIndex + 1) % question.options.length;
    await page.locator('#vocabularyAdventureChallengeBody .vocabulary-adventure-options button').nth(selected).click();
  } else if (question.interaction === 'input') {
    await page.locator('#vocabularyAdventureChallengeInput').fill(correct ? question.answer : '__wrong__');
    await page.getByRole('button', { name: '确认' }).click();
  } else {
    const answer = correct ? question.answer : [...question.answer].reverse();
    for (const token of answer) await page.evaluate(value => selectVocabularyAdventureChallengeToken(value), token);
    await page.getByRole('button', { name: '确认' }).click();
  }
  await page.waitForSelector('#vocabularyAdventureChallengeAction:not([hidden])');
}

try {
  const hidden = await openPage({ width: 1024, height: 768 }, false);
  assert.equal(await hidden.page.locator('#vocabularyAdventureUnifiedHome').isHidden(), true);
  assert.equal(await hidden.page.locator('#homeQuickActions').isVisible(), true);
  assert.equal(await hidden.page.locator('#todayWordBtn').isVisible(), true);
  assert.equal(await hidden.page.locator('#mixedWordBtn').isVisible(), true);
  await hidden.page.locator('#todayWordBtn').click();
  await hidden.page.waitForSelector('#screenWordTaskMenu.active');
  await hidden.page.locator('#wordTaskChallengeBtn').click();
  await hidden.page.waitForSelector('#screenDailyQuiz.active');
  assert.equal(await hidden.page.locator('#dqCount').textContent(), '1/10');
  await hidden.context.close();

  const saveFailure = await openPage({ width: 1024, height: 768 }, true, [1, 3]);
  await saveFailure.page.waitForSelector('#vocabularyAdventureUnifiedHome:visible');
  await saveFailure.page.locator('#vocabularyAdventureChallengeEntry').click();
  await saveFailure.page.waitForFunction(() => (
    document.getElementById('vocabularyAdventureChallengeAction')?.textContent === '重新保存'
  ));
  assert.equal(saveFailure.state.get('vocab_adventure_v1_sister').challengeSession, undefined);
  await saveFailure.page.evaluate(() => { sbOnline = true; });
  await saveFailure.page.locator('#vocabularyAdventureChallengeAction').click();
  try {
    await saveFailure.page.waitForSelector('#vocabularyAdventureChallengeBody .vocabulary-adventure-question');
  } catch (error) {
    const diagnostics = await saveFailure.page.evaluate(() => ({
      body: document.getElementById('vocabularyAdventureChallengeBody')?.innerText,
      feedback: document.getElementById('vocabularyAdventureChallengeFeedbackText')?.innerText,
      action: document.getElementById('vocabularyAdventureChallengeAction')?.innerText
    }));
    throw new Error(`${error.message}\n${JSON.stringify({ diagnostics, errors: saveFailure.errors }, null, 2)}`);
  }
  await answerCurrent(saveFailure.page, saveFailure.state, true);
  assert.equal(saveFailure.state.get('vocab_adventure_v1_sister').challengeSession.cursor, 0);
  assert.match(await saveFailure.page.locator('#vocabularyAdventureChallengeFeedbackText').textContent(), /保存失败/);
  await saveFailure.page.evaluate(() => { sbOnline = true; });
  await saveFailure.page.locator('#vocabularyAdventureChallengeAction').click();
  await saveFailure.page.waitForFunction(() => (
    document.getElementById('vocabularyAdventureChallengeAction')?.textContent === '下一题'
  ));
  assert.equal(saveFailure.state.get('vocab_adventure_v1_sister').challengeSession.cursor, 1);
  assert.equal(saveFailure.state.get('vocab_adventure_v1_sister').challengeSession.correctCount, 1);
  await saveFailure.context.close();

  const run = await openPage({ width: 1180, height: 820 });
  try {
    await run.page.waitForSelector('#vocabularyAdventureUnifiedHome:visible');
  } catch (error) {
    const diagnostics = await run.page.evaluate(() => ({
      wrapper: document.getElementById('vocabularyAdventureUnifiedHome')?.outerHTML,
      currentUser: window.currentUser,
      preview: window.isVocabularyAdventurePreviewEnabled?.(location.search, localStorage),
      updater: String(window.updateVocabularyAdventurePreviewEntry || '').slice(0, 120)
    }));
    throw new Error(`${error.message}\n${JSON.stringify({ diagnostics, errors: run.errors }, null, 2)}`);
  }
  assert.equal(await run.page.locator('#homeQuickActions').isHidden(), true);
  assert.equal(await run.page.locator('#vocabularyAdventurePreviewEntry').isVisible(), true);
  assert.equal(await run.page.locator('#vocabularyAdventureChallengeEntry').isVisible(), true);
  assert.equal(await run.page.locator('#grammarChallengeHomeEntry').isVisible(), true);
  assert.equal(await run.page.locator('#vocabularyTourHomeEntry').isVisible(), true);
  assert.equal(await run.page.locator('#homeCheckinRow').isVisible(), true);
  assert.equal(await run.page.locator('#studentFeatureNav').isVisible(), true);
  await run.page.locator('#vocabularyAdventureChallengeEntry').click();
  await run.page.waitForSelector('#screenVocabularyAdventureChallenge.active');
  assert.equal(run.state.get('vocab_adventure_v1_sister').challengeSession.items.length, 10);

  await answerCurrent(run.page, run.state, false);
  const afterWrong = run.state.get('vocab_adventure_v1_sister');
  const wrongKey = afterWrong.challengeSession.items[0].wordKey;
  assert.ok(afterWrong.words[wrongKey].challengeFlagAt);
  assert.equal(afterWrong.words[wrongKey].reviewCount, 1);
  await run.page.locator('#vocabularyAdventureChallengeAction').click();

  const beforeRefresh = structuredClone(run.state.get('vocab_adventure_v1_sister').challengeSession.items[1].question);
  await run.page.reload({ waitUntil: 'networkidle' });
  await run.page.waitForFunction(() => typeof window.openVocabularyAdventureChallenge === 'function');
  await run.page.evaluate(() => openVocabularyAdventureChallenge());
  await run.page.waitForSelector('#screenVocabularyAdventureChallenge.active');
  assert.deepEqual(run.state.get('vocab_adventure_v1_sister').challengeSession.items[1].question, beforeRefresh);
  assert.equal(await run.page.locator('#vocabularyAdventureChallengeCount').textContent(), '2/10');

  while (run.state.get('vocab_adventure_v1_sister').challengeSession.status === 'active') {
    await answerCurrent(run.page, run.state, true);
    await run.page.locator('#vocabularyAdventureChallengeAction').click();
  }
  await run.page.waitForSelector('.vocabulary-adventure-challenge-result');
  assert.match(await run.page.locator('.vocabulary-adventure-challenge-score').textContent(), /90/);
  assert.equal(run.state.get('vocab_adventure_v1_sister').challengeDaily.attempts, 1);
  assert.equal(run.state.get('vocab_adventure_v1_sister').challengeSession.wrongItems.length, 1);

  const layout = await run.page.evaluate(() => {
    const body = document.getElementById('vocabularyAdventureChallengeBody').getBoundingClientRect();
    const feedback = document.querySelector('#screenVocabularyAdventureChallenge .vocabulary-adventure-feedback').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      overlap: body.bottom > feedback.top + 1,
      minButton: Math.min(...[...document.querySelectorAll('#screenVocabularyAdventureChallenge button')]
        .map(button => button.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => rect.height))
    };
  });
  assert.equal(layout.overflow, false);
  assert.equal(layout.overlap, false);
  assert.ok(layout.minButton >= 44);
  await run.page.screenshot({ path: path.join(resultDir, 'vocabulary-adventure-challenge-1180x820.png'), fullPage: true });

  await run.page.getByRole('button', { name: '返回词汇首页' }).click();
  await run.page.waitForSelector('#screenHome.active');
  await run.page.locator('#uBtnBrother').click();
  await run.page.waitForFunction(() => document.getElementById('currentModeBadge').textContent.includes('弟弟'));
  assert.equal(run.state.has('vocab_adventure_v1_brother'), false);
  await run.page.waitForFunction(() => document.getElementById('vocabularyAdventureChallengeEntry').disabled);
  assert.equal(await run.page.locator('#vocabularyAdventureChallengeEntry').isDisabled(), true);
  await run.page.evaluate(async () => {
    currentUser = 'teacher';
    localStorage.setItem('wc_user', 'teacher');
    document.body.classList.add('is-teacher');
    updateUserBar();
    await loadHome();
  });
  assert.equal(await run.page.locator('#vocabularyAdventureUnifiedHome').isHidden(), true);
  assert.equal(await run.page.locator('.teacher-home-nav').isVisible(), true);
  await run.context.close();

  const compact = await openPage({ width: 1024, height: 768 });
  await compact.page.waitForSelector('#vocabularyAdventureUnifiedHome:visible');
  const compactLayout = await compact.page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    adventureHeight: document.getElementById('vocabularyAdventurePreviewEntry').getBoundingClientRect().height,
    challengeHeight: document.getElementById('vocabularyAdventureChallengeEntry').getBoundingClientRect().height
  }));
  assert.equal(compactLayout.overflow, false);
  assert.ok(compactLayout.adventureHeight >= 44);
  assert.ok(compactLayout.challengeHeight >= 44);
  await compact.context.close();

  console.log('vocabulary adventure card 4 WebKit challenge viewport tests passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
