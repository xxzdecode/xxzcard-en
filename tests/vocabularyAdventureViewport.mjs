import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, webkit } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, 'test-results');
fs.mkdirSync(resultDir, { recursive: true });

const cards = [
  {
    word: 'apple',
    meaning: '苹果',
    pos: 'n.',
    phonetic: '/ˈæpəl/',
    emoji: '🍎',
    morphology: { knowledgeKey: 'apple' },
    collocations: [{ phrase: 'an apple', meaning: '一个苹果' }],
    irregularForms: [{ form: 'apples', meaning: '复数' }],
    synonyms: [{ word: 'fruit', meaning: '水果' }],
    wordFamily: [{ word: 'apple tree', meaning: '苹果树' }],
    tip: 'Apple starts with A.'
  },
  { word: 'banana', meaning: '香蕉', pos: 'n.', phonetic: '/bəˈnɑːnə/', emoji: '🍌' },
  { word: 'cat', meaning: '猫', pos: 'n.', phonetic: '/kæt/', emoji: '🐱' },
  { word: 'dog', meaning: '狗', pos: 'n.', phonetic: '/dɒɡ/', emoji: '🐶' }
];

const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [{
    id: 'adventure-viewport',
    name: '探险本地测试',
    date: '2026-07-28',
    bookPurpose: 'common',
    sharedWith: ['sister', 'brother'],
    cards
  }]
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
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const edgeExecutable = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const webkitExecutable = webkit.executablePath();
const browser = fs.existsSync(webkitExecutable)
  ? await webkit.launch()
  : await chromium.launch({ executablePath: edgeExecutable });

async function openRealPage({
  viewport,
  user = 'sister',
  preview = true,
  initialAdventureState = null,
  failAdventureWrites = 0
}) {
  const contextOptions = viewport.contextOptions || (viewport.viewport ? viewport : { viewport });
  const context = await browser.newContext({ ...contextOptions, serviceWorkers: 'block' });
  await context.addInitScript(({ selectedUser }) => {
    localStorage.setItem('wc_user', selectedUser);
  }, { selectedUser: user });
  const state = new Map([['main', structuredClone(mainData)]]);
  if (initialAdventureState) {
    state.set(`vocab_adventure_v1_${user}`, structuredClone(initialAdventureState));
  }
  const writes = [];
  let failedAdventureWriteCount = 0;
  let remainingAdventureWriteFailures = Math.max(0, Number(failAdventureWrites) || 0);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route(/\/assets\/student-home\/card6\/.*\.png$/, route => route.abort());
  await page.route('**/rest/v1/kv_store*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      if (
        payload.key.startsWith('vocab_adventure_v1_')
        && remainingAdventureWriteFailures > 0
      ) {
        remainingAdventureWriteFailures -= 1;
        failedAdventureWriteCount += 1;
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        return;
      }
      state.set(payload.key, structuredClone(payload.value));
      writes.push(structuredClone(payload));
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
    const keyExpression = url.searchParams.get('key') || '';
    const key = keyExpression.replace(/^eq\./, '');
    const value = state.get(key);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(typeof value === 'undefined' ? [] : [{ value }])
    });
  });
  const query = preview ? '?previewVocabularyAdventure=1' : '';
  await page.goto(`${baseUrl}/${query}`, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(() => typeof window.openVocabularyAdventure === 'function');
    await page.evaluate(() => { sbOnline = true; });
    if (user === 'teacher') {
      await page.waitForFunction(() => document.body.classList.contains('is-teacher'));
    } else {
      await page.waitForSelector('#studentDashboard:visible');
      await page.waitForFunction(expectedName => (
        document.getElementById('currentModeBadge')?.textContent.includes(expectedName)
      ), user === 'brother' ? '弟弟' : '姐姐');
    }
  } catch (error) {
    throw new Error(`real page did not initialize: ${errors.join(' | ') || error.message}`);
  }
  return {
    context,
    page,
    state,
    writes,
    errors,
    failedAdventureWriteCount: () => failedAdventureWriteCount,
    failNextAdventureWrites(count = 4) {
      failedAdventureWriteCount = 0;
      remainingAdventureWriteFailures = Math.max(0, Number(count) || 0);
    }
  };
}

function boxesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function adventurePlanEntry(word, phase = 'screening', status = 'pending', result = '') {
  return {
    wordKey: word,
    word,
    batchId: 'stale-location-is-not-trusted',
    batchName: '旧位置',
    cardIndex: 999,
    phase,
    taskType: status === 'completed' ? 'wordToMeaning' : '',
    status,
    result
  };
}

function adventureWordState(lastResult = 'D') {
  return {
    lastResult,
    intervalIndex: 1,
    lastReviewedAt: '2026-07-28T02:00:00.000Z',
    nextReviewAt: '2026-07-31',
    reviewCount: 1,
    lastTaskType: 'wordToMeaning',
    challengeFlagAt: ''
  };
}

try {
  if (process.argv.includes('--hint-toggle-only')) {
    const hintRun = await openRealPage({ viewport: { width: 393, height: 852 } });
    const { page } = hintRun;
    await page.locator('#vocabularyAdventurePreviewEntry').click();
    await page.waitForSelector('#vocabularyAdventureOptions button');
    const wrongIndex = await page.evaluate(() => {
      const question = window.__vocabularyFeedbackQuestionContext?.question;
      return question.options.findIndex((_, index) => index !== question.correctIndex);
    });
    const optionsBefore = await page.locator('#vocabularyAdventureOptions button').allTextContents();
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${wrongIndex}"]`).click();
    await page.waitForSelector('.vav2-guide-bubble:visible');
    assert.equal(await page.locator('.vav2-bubble-collapse').innerText(), '收起');
    await page.locator('.vav2-bubble-collapse').click();
    await page.waitForSelector('.vav2-guide-bubble', { state: 'hidden' });
    assert.deepEqual(await page.locator('#vocabularyAdventureOptions button').allTextContents(), optionsBefore);
    await page.locator('.vav2-guide-fox').click();
    await page.waitForSelector('.vav2-guide-bubble:visible');
    assert.deepEqual(await page.locator('#vocabularyAdventureOptions button').allTextContents(), optionsBefore);
    assert.equal(await page.locator('.vav2-guide-fox').getAttribute('aria-expanded'), 'true');
    await page.screenshot({
      path: path.join(resultDir, 'vocabulary-adventure-hint-toggle-iphone16-portrait-393x852.png'),
      fullPage: true
    });
    assert.deepEqual(
      hintRun.errors.filter(error => !/Failed to load resource: net::ERR_FAILED/.test(error)),
      []
    );
    await hintRun.context.close();
    console.log('vocabulary adventure hint toggle viewport test passed');
  } else {
  const hidden = await openRealPage({ viewport: { width: 1024, height: 768 }, preview: false });
  assert.equal(await hidden.page.locator('#vocabularyAdventurePreviewEntry').isVisible(), true);
  assert.equal(await hidden.page.locator('#studentDashboard').isVisible(), true);
  await hidden.context.close();

  const teacher = await openRealPage({ viewport: { width: 1024, height: 768 }, user: 'teacher' });
  assert.equal(await teacher.page.locator('#vocabularyAdventurePreviewEntry').isHidden(), true);
  await teacher.context.close();

  const initialSaveFailure = await openRealPage({
    viewport: { width: 1024, height: 768 },
    failAdventureWrites: 4
  });
  await initialSaveFailure.page.locator('#vocabularyAdventurePreviewEntry').click();
  await initialSaveFailure.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureAction')?.textContent === '重新保存'
  ));
  assert.equal(await initialSaveFailure.page.locator('#vocabularyAdventureOptions button').count(), 0);
  assert.match(
    await initialSaveFailure.page.locator('#vocabularyAdventureFeedbackText').innerText(),
    /保存失败/
  );
  await initialSaveFailure.context.close();

  const resumedState = {
    version: 1,
    words: { apple: adventureWordState() },
    session: {
      date: '2026-07-28',
      plan: [
        adventurePlanEntry('apple', 'screening', 'completed', 'D'),
        adventurePlanEntry('banana')
      ],
      cursor: 1,
      phase: 'screening',
      completed: false,
      rewardGranted: false
    }
  };
  const resumed = await openRealPage({
    viewport: { width: 1024, height: 768 },
    initialAdventureState: resumedState
  });
  await resumed.page.locator('#vocabularyAdventurePreviewEntry').click();
  await resumed.page.waitForSelector('#vocabularyAdventureOptions button');
  assert.equal(await resumed.page.locator('#vocabularyAdventureScreeningProgress').innerText(), '摸底 1 / 2');
  assert.equal(resumed.writes.filter(write => write.key === 'vocab_adventure_v1_sister').length, 0);
  await resumed.context.close();

  const reviewBoundaryState = {
    version: 1,
    words: { apple: adventureWordState() },
    session: {
      date: '2026-07-28',
      plan: [
        adventurePlanEntry('apple', 'screening', 'completed', 'D'),
        adventurePlanEntry('banana', 'review')
      ],
      cursor: 1,
      phase: 'review',
      completed: false,
      rewardGranted: false
    }
  };
  const boundary = await openRealPage({
    viewport: { width: 1024, height: 768 },
    initialAdventureState: reviewBoundaryState
  });
  await boundary.page.locator('#vocabularyAdventurePreviewEntry').click();
  await boundary.page.waitForSelector('.vocabulary-adventure-question.is-review');
  assert.equal(await boundary.page.locator('.vocabulary-adventure-question.is-review').count(), 1);
  assert.equal(boundary.state.get('vocab_adventure_v1_sister').session.plan[1].status, 'pending');
  assert.equal(boundary.state.get('vocab_adventure_v1_sister').session.completed, false);
  assert.equal(boundary.writes.filter(write => write.key === 'vocab_adventure_v1_sister').length, 0);
  await boundary.context.close();

  const brother = await openRealPage({
    viewport: { width: 1024, height: 768 },
    user: 'brother'
  });
  await brother.page.locator('#vocabularyAdventurePreviewEntry').click();
  await brother.page.waitForSelector('#vocabularyAdventureOptions button');
  assert.ok(brother.state.has('vocab_adventure_v1_brother'));
  assert.equal(brother.state.has('vocab_adventure_v1_sister'), false);
  await brother.context.close();

  for (const viewport of [
    { width: 1180, height: 820, name: 'ipad-air11-landscape-1180x820' },
    { width: 393, height: 852, name: 'iphone16-portrait-393x852' }
  ]) {
    const run = await openRealPage({ viewport });
    const { page } = run;
    await page.waitForSelector('#vocabularyAdventurePreviewEntry:visible');
    assert.equal(await page.getByRole('button', { name: /今日单词/ }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /混合单词/ }).count(), 0);

    await page.locator('#vocabularyAdventurePreviewEntry').click();
    await page.waitForSelector('#screenVocabularyAdventure.active');
    await page.waitForSelector('#vocabularyAdventureOptions button');
    const questionLayout = await page.evaluate(() => {
      const options = [...document.querySelectorAll('#vocabularyAdventureOptions button')];
      const footer = document.querySelector('.vocabulary-adventure-feedback').getBoundingClientRect();
      const question = document.querySelector('.vocabulary-adventure-question').getBoundingClientRect();
      return {
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
        footerTop: footer.top,
        footerBottom: footer.bottom,
        questionBottom: question.bottom,
        optionHeights: options.map(button => button.getBoundingClientRect().height),
        optionCount: options.length,
        viewportHeight: innerHeight
      };
    });
    assert.equal(questionLayout.noHorizontalOverflow, true);
    assert.ok(questionLayout.optionCount >= 2 && questionLayout.optionCount <= 4);
    assert.ok(questionLayout.optionHeights.every(height => height >= 44));
    assert.ok(questionLayout.questionBottom <= questionLayout.footerTop + 1);
    assert.ok(questionLayout.footerBottom <= questionLayout.viewportHeight + 1);

    const questionEvidence = await page.evaluate(() => {
      const question = window.__vocabularyFeedbackQuestionContext?.question;
      return {
        wordKey: question.wordKey,
        word: question.card?.word || question.wordKey,
        meaning: question.card?.meaning || question.card?.zh || '',
        correctAnswer: question.options[question.correctIndex]?.label || '',
        wrongIndices: question.options
          .map((_, index) => index)
          .filter(index => index !== question.correctIndex)
      };
    });
    const wrongIndices = questionEvidence.wrongIndices;
    assert.ok(wrongIndices.length >= 2);
    if (viewport.name === 'iphone16-portrait-393x852') {
      await page.evaluate(() => {
        window.VOCABULARY_LESSON_ASSETS = [];
        const clearVisual = card => {
          if (!card || typeof card !== 'object') return;
          ['image', 'imageUrl', 'imageURL', 'imagePath', 'visualImage', 'lessonImage', 'picture', 'photo', 'emoji', 'icon']
            .forEach(key => { card[key] = ''; });
        };
        const master = appData && appData.masterCards;
        if (Array.isArray(master)) master.forEach(clearVisual);
        else if (master && typeof master === 'object') Object.values(master).forEach(clearVisual);
        (Array.isArray(appData && appData.batches) ? appData.batches : [])
          .forEach(batch => (Array.isArray(batch.cards) ? batch.cards : []).forEach(clearVisual));
      });
    }
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${wrongIndices[0]}"]`).click();
    await page.waitForSelector('.vav2-guide-bubble:visible');
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${wrongIndices[1]}"]`).click();
    await page.waitForSelector('.vte-shell, .vocabulary-adventure-full-card');
    const usesTeachingCard = await page.locator('.vte-shell').count() > 0;
    if (usesTeachingCard) {
      await page.waitForFunction(() => document.querySelector('.vav2-guide-panel')?.hidden === true);
    }
    const detail = page.locator(usesTeachingCard ? '.vte-shell' : '.vocabulary-adventure-full-card');
    const fullText = await detail.innerText();
    const expectedDetails = usesTeachingCard
      ? [questionEvidence.word, questionEvidence.correctAnswer, '正确答案', '下一题']
      : [questionEvidence.word, questionEvidence.meaning, '固定搭配', '提示'];
    for (const expected of expectedDetails) {
      if (!expected) continue;
      assert.match(fullText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    if (viewport.name === 'iphone16-portrait-393x852') {
      assert.equal(/\bWORD\b/.test(fullText), false);
      assert.equal(await page.locator('.vte-placeholder-word').innerText(), questionEvidence.word);
      const closeBox = await page.locator('.vte-close').boundingBox();
      assert.ok(closeBox && closeBox.width >= 44 && closeBox.height >= 44);
      await page.locator('.vte-next').scrollIntoViewIfNeeded();
      const mobileScroll = await page.evaluate(() => {
        const stage = document.querySelector('#screenVocabularyAdventure .vocabulary-adventure-stage');
        const next = document.querySelector('#vocabularyAdventureBody .vte-next').getBoundingClientRect();
        return {
          overflowY: getComputedStyle(stage).overflowY,
          scrollTop: stage.scrollTop,
          scrollHeight: stage.scrollHeight,
          clientHeight: stage.clientHeight,
          nextTop: next.top,
          nextBottom: next.bottom,
          viewportHeight: innerHeight
        };
      });
      assert.match(mobileScroll.overflowY, /auto|scroll/);
      assert.ok(mobileScroll.nextTop >= 0 && mobileScroll.nextBottom <= mobileScroll.viewportHeight,
        `iPhone teaching-card next button must be reachable: ${JSON.stringify(mobileScroll)}`);
    }
    const resultLayout = await page.evaluate(() => {
      const teaching = document.querySelector('.vte-shell');
      const result = (teaching || document.querySelector('.vocabulary-adventure-result')).getBoundingClientRect();
      const footer = document.querySelector('.vocabulary-adventure-feedback').getBoundingClientRect();
      const action = (document.querySelector('.vte-next') || document.querySelector('#vocabularyAdventureAction')).getBoundingClientRect();
      return {
        usesTeachingCard: !!teaching,
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
        overlap: {
          left: result.left,
          right: result.right,
          top: result.top,
          bottom: result.bottom
        },
        footer: {
          left: footer.left,
          right: footer.right,
          top: footer.top,
          bottom: footer.bottom
        },
        actionHeight: action.height
      };
    });
    assert.equal(resultLayout.noHorizontalOverflow, true);
    if (!resultLayout.usesTeachingCard) {
      assert.equal(boxesOverlap(resultLayout.overlap, resultLayout.footer), false);
    }
    assert.ok(resultLayout.actionHeight >= 44);

    const saved = run.state.get('vocab_adventure_v1_sister');
    assert.equal(saved.words[questionEvidence.wordKey].lastResult, 'F');
    assert.equal(saved.words[questionEvidence.wordKey].reviewCount, 1);
    assert.equal(saved.session.cursor, 1);
    assert.ok(run.writes.filter(write => write.key === 'vocab_adventure_v1_sister').length >= 2);
    assert.deepEqual(run.errors, []);
    await page.screenshot({
      path: path.join(resultDir, `vocabulary-adventure-card-2-${viewport.name}.png`),
      fullPage: true
    });
    if (viewport.name === 'iphone16-portrait-393x852' && usesTeachingCard) {
      await page.locator('.vte-close').click();
      await page.waitForSelector('.vte-shell', { state: 'detached' });
      await page.waitForSelector('#vocabularyAdventureOptions button, .vocabulary-adventure-summary');
    }
    await run.context.close();
  }

  for (const expectedResult of ['D', 'H']) {
    const run = await openRealPage({ viewport: { width: 1024, height: 768 } });
    const { page } = run;
    await page.locator('#vocabularyAdventurePreviewEntry').click();
    await page.waitForSelector('#vocabularyAdventureOptions button');
    const answer = await page.evaluate(() => {
      const question = window.__vocabularyFeedbackQuestionContext?.question;
      return {
        wordKey: question.wordKey,
        correct: question.correctIndex,
        wrong: question.options.map((_, index) => index).find(index => index !== question.correctIndex)
      };
    });
    if (expectedResult === 'H') {
      await page.locator(`#vocabularyAdventureOptions button[data-option-index="${answer.wrong}"]`).click();
      await page.waitForSelector('.vav2-guide-bubble:visible');
    }
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${answer.correct}"]`).click();
    await page.waitForFunction(() => (
      document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('回答正确')
      || document.querySelector('#vocabularyAdventureScreeningProgress')?.textContent.includes('1 / 4')
    ));
    assert.equal(
      run.state.get('vocab_adventure_v1_sister').words[answer.wordKey].lastResult,
      expectedResult
    );
    await run.context.close();
  }

  const saveRetry = await openRealPage({ viewport: { width: 1024, height: 768 } });
  await saveRetry.page.locator('#vocabularyAdventurePreviewEntry').click();
  await saveRetry.page.waitForSelector('#vocabularyAdventureOptions button');
  saveRetry.failNextAdventureWrites(4);
  const retryQuestion = await saveRetry.page.evaluate(() => {
    const question = window.__vocabularyFeedbackQuestionContext?.question;
    return { wordKey: question.wordKey, correctIndex: question.correctIndex };
  });
  await saveRetry.page.locator(`#vocabularyAdventureOptions button[data-option-index="${retryQuestion.correctIndex}"]`).click();
  await saveRetry.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureAction')?.textContent === '重新保存'
  ));
  assert.equal(saveRetry.failedAdventureWriteCount(), 4);
  assert.equal(saveRetry.state.get('vocab_adventure_v1_sister').session.cursor, 0);
  await saveRetry.page.locator('#vocabularyAdventureAction').click();
  await saveRetry.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureScreeningProgress')?.textContent.includes('1 / 4')
  ));
  const retrySaved = saveRetry.state.get('vocab_adventure_v1_sister');
  assert.equal(retrySaved.words[retryQuestion.wordKey].reviewCount, 1);
  assert.equal(retrySaved.session.cursor, 1);
  assert.equal(saveRetry.writes.filter(write => write.key === 'vocab_adventure_v1_sister').length, 2);
  await saveRetry.context.close();

  console.log('vocabulary adventure card 2 browser viewport tests passed');
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
