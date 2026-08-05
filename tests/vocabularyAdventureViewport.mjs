import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, devices, webkit } = createRequire(import.meta.url)('playwright');

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
        && failedAdventureWriteCount < failAdventureWrites
      ) {
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
  return { context, page, state, writes, errors };
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
      const candidates = collectVisibleVocabularyAdventureCandidates();
      const state = JSON.parse(localStorage.getItem('wc_sb_vocab_adventure_v1_sister'));
      const item = state.session.plan[state.session.cursor];
      const question = window.VocabularyAdventureCore.buildVocabularyAdventureQuestion({
        candidates,
        sessionDate: state.session.date,
        wordKey: item.wordKey,
        planIndex: state.session.cursor,
        lastTaskType: state.words[item.wordKey]?.lastTaskType
      });
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
    failAdventureWrites: 1
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
  await boundary.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureStageTitle')?.textContent === '第二站 · 抗遗忘'
  ));
  assert.equal(await boundary.page.locator('.vocabulary-adventure-question.is-review').count(), 1);
  assert.equal(boundary.state.get('vocab_adventure_v1_sister').session.plan[1].status, 'pending');
  assert.equal(boundary.state.get('vocab_adventure_v1_sister').session.completed, false);
  assert.equal(boundary.writes.length, 0);
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
    { width: 1024, height: 768, name: '1024x768' },
    { width: 1180, height: 820, name: '1180x820' },
    {
      name: 'ipad11-landscape-944x656',
      contextOptions: devices['iPad (gen 11) landscape']
    }
  ]) {
    const run = await openRealPage({ viewport });
    const { page } = run;
    await page.waitForSelector('#vocabularyAdventurePreviewEntry:visible');
    assert.equal(await page.getByRole('button', { name: /今日单词/ }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /混合单词/ }).count(), 0);

    await page.locator('#vocabularyAdventurePreviewEntry').click();
    await page.waitForSelector('#screenVocabularyAdventure.active');
    await page.waitForSelector('#vocabularyAdventureOptions button');
    if (viewport.name === 'ipad11-landscape-944x656') {
      await page.screenshot({
        path: path.join(resultDir, 'vocabulary-adventure-card-2-ipad11-landscape-question-944x656.png'),
        fullPage: false
      });
    }

    const questionLayout = await page.evaluate(() => {
      const options = [...document.querySelectorAll('#vocabularyAdventureOptions button')];
      const footer = document.querySelector('.vocabulary-adventure-feedback').getBoundingClientRect();
      const stage = document.querySelector('.vocabulary-adventure-stage').getBoundingClientRect();
      return {
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
        footerBottom: footer.bottom,
        stageBottom: stage.bottom,
        optionHeights: options.map(button => button.getBoundingClientRect().height),
        optionCount: options.length,
        viewportHeight: innerHeight
      };
    });
    assert.equal(questionLayout.noHorizontalOverflow, true);
    assert.ok(questionLayout.optionCount >= 2 && questionLayout.optionCount <= 4);
    assert.ok(questionLayout.optionHeights.every(height => height >= 44));
    assert.ok(questionLayout.stageBottom <= questionLayout.footerBottom);
    assert.ok(questionLayout.footerBottom <= questionLayout.viewportHeight + 1);

    const wrongIndices = await page.locator('#vocabularyAdventureOptions button').evaluateAll(buttons => (
      buttons
        .filter(button => !['apple', '苹果'].includes(button.textContent.trim()))
        .map(button => Number(button.dataset.optionIndex))
    ));
    assert.ok(wrongIndices.length >= 2);
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${wrongIndices[0]}"]`).click();
    await page.waitForSelector('#vocabularyAdventureHint:visible');
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${wrongIndices[1]}"]`).click();
    await page.waitForSelector('.vocabulary-adventure-full-card');
    await page.waitForFunction(() => document.querySelector('#vocabularyAdventureAction')?.textContent === '继续');

    const fullText = await page.locator('.vocabulary-adventure-full-card').innerText();
    for (const expected of ['apple', '苹果', 'n.', '/ˈæpəl/', '固定搭配', '词形变化', '近义词', '词族', '提示']) {
      assert.match(fullText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    const resultLayout = await page.evaluate(() => {
      const result = document.querySelector('.vocabulary-adventure-result').getBoundingClientRect();
      const footer = document.querySelector('.vocabulary-adventure-feedback').getBoundingClientRect();
      const action = document.querySelector('#vocabularyAdventureAction').getBoundingClientRect();
      return {
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
    assert.equal(boxesOverlap(resultLayout.overlap, resultLayout.footer), false);
    assert.ok(resultLayout.actionHeight >= 44);

    const saved = run.state.get('vocab_adventure_v1_sister');
    assert.equal(saved.words.apple.lastResult, 'F');
    assert.equal(saved.words.apple.reviewCount, 1);
    assert.equal(saved.session.cursor, 1);
    assert.ok(run.writes.filter(write => write.key === 'vocab_adventure_v1_sister').length >= 2);
    assert.deepEqual(run.errors, []);
    await page.screenshot({
      path: path.join(resultDir, `vocabulary-adventure-card-2-${viewport.name}.png`),
      fullPage: true
    });
    await run.context.close();
  }

  for (const expectedResult of ['D', 'H']) {
    const run = await openRealPage({ viewport: { width: 1024, height: 768 } });
    const { page } = run;
    await page.locator('#vocabularyAdventurePreviewEntry').click();
    await page.waitForSelector('#vocabularyAdventureOptions button');
    const answer = await page.evaluate(() => {
      const candidates = collectVisibleVocabularyAdventureCandidates();
      const state = JSON.parse(localStorage.getItem('wc_sb_vocab_adventure_v1_sister'));
      const item = state.session.plan[state.session.cursor];
      const question = window.VocabularyAdventureCore.buildVocabularyAdventureQuestion({
        candidates,
        sessionDate: state.session.date,
        wordKey: item.wordKey,
        planIndex: state.session.cursor
      });
      return {
        correct: question.correctIndex,
        wrong: question.options.map((_, index) => index).find(index => index !== question.correctIndex)
      };
    });
    if (expectedResult === 'H') {
      await page.locator(`#vocabularyAdventureOptions button[data-option-index="${answer.wrong}"]`).click();
      await page.waitForSelector('#vocabularyAdventureHint:visible');
    }
    await page.locator(`#vocabularyAdventureOptions button[data-option-index="${answer.correct}"]`).click();
    await page.waitForFunction(result => (
      document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes(`已记录为 ${result}`)
    ), expectedResult);
    assert.equal(run.state.get('vocab_adventure_v1_sister').words.apple.lastResult, expectedResult);
    await run.context.close();
  }

  const saveRetry = await openRealPage({ viewport: { width: 1024, height: 768 } });
  await saveRetry.page.locator('#vocabularyAdventurePreviewEntry').click();
  await saveRetry.page.waitForSelector('#vocabularyAdventureOptions button');
  await saveRetry.page.evaluate(() => {
    window.__adventureSaveAttempts = [];
    window.__adventureSaveShouldPass = false;
    window.saveCurrentVocabularyAdventureState = async state => {
      window.__adventureSaveAttempts.push(state);
      return window.__adventureSaveShouldPass;
    };
  });
  const correctIndex = await saveRetry.page.evaluate(() => {
    const candidates = collectVisibleVocabularyAdventureCandidates();
    const state = JSON.parse(localStorage.getItem('wc_sb_vocab_adventure_v1_sister'));
    const item = state.session.plan[state.session.cursor];
    return window.VocabularyAdventureCore.buildVocabularyAdventureQuestion({
      candidates,
      sessionDate: state.session.date,
      wordKey: item.wordKey,
      planIndex: state.session.cursor
    }).correctIndex;
  });
  await saveRetry.page.locator(`#vocabularyAdventureOptions button[data-option-index="${correctIndex}"]`).click();
  await saveRetry.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureAction')?.textContent === '重新保存'
  ));
  assert.equal(await saveRetry.page.locator('#vocabularyAdventureScreeningProgress').innerText(), '摸底 0 / 4');
  await saveRetry.page.evaluate(() => { window.__adventureSaveShouldPass = true; });
  await saveRetry.page.locator('#vocabularyAdventureAction').click();
  await saveRetry.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('已记录为 D')
  ));
  const retryEvidence = await saveRetry.page.evaluate(() => ({
    sameObject: window.__adventureSaveAttempts[0] === window.__adventureSaveAttempts[1],
    attempts: window.__adventureSaveAttempts.length,
    reviewCount: window.__adventureSaveAttempts[1].words.apple.reviewCount,
    cursor: window.__adventureSaveAttempts[1].session.cursor
  }));
  assert.deepEqual(retryEvidence, { sameObject: true, attempts: 2, reviewCount: 1, cursor: 1 });
  await saveRetry.context.close();

  console.log('vocabulary adventure card 2 browser viewport tests passed');
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
