import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { devices, webkit } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, 'test-results');
fs.mkdirSync(resultDir, { recursive: true });

function card(word, meaning, emoji) {
  return {
    word,
    meaning,
    pos: 'n.',
    phonetic: `/${word}/`,
    emoji,
    morphology: { knowledgeKey: word },
    collocations: [{
      phrase: `use ${word}`,
      meaning: `使用${meaning}`,
      example: `I use ${word} every day.`
    }],
    irregularForms: [{ form: `${word}s`, meaning: '复数' }],
    synonyms: [{ word: `${word} friend`, meaning: '近义表达' }],
    wordFamily: [{ word: `${word} family`, meaning: '词族表达' }],
    tip: `${word} tip`
  };
}

const cards = [
  card('apple', '苹果', '🍎'),
  card('banana', '香蕉', '🍌'),
  card('candle', '蜡烛', '🕯️'),
  card('dragon', '龙', '🐉')
];

const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [{
    id: 'review-viewport',
    name: '抗遗忘本地测试',
    date: '2026-07-29',
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
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await webkit.launch();

function reviewState(taskType, user = 'sister') {
  return {
    version: 1,
    words: {
      apple: {
        lastResult: 'D',
        intervalIndex: 1,
        lastReviewedAt: '2026-07-26T02:00:00.000Z',
        nextReviewAt: '2026-07-29',
        reviewCount: 1,
        lastTaskType: '',
        challengeFlagAt: ''
      }
    },
    session: {
      date: '2026-07-29',
      plan: [{
        wordKey: 'apple',
        word: 'apple',
        batchId: 'intentionally-stale',
        batchName: '旧位置',
        cardIndex: 999,
        phase: 'review',
        reviewReason: 'due',
        taskType,
        status: 'pending',
        result: ''
      }],
      cursor: 0,
      phase: 'review',
      completed: false,
      rewardGranted: false
    },
    testUser: user
  };
}

async function openReview({
  taskType,
  viewport = { width: 1024, height: 768 },
  user = 'sister'
}) {
  const contextOptions = viewport.contextOptions || (viewport.viewport ? viewport : { viewport });
  const context = await browser.newContext({ ...contextOptions, serviceWorkers: 'block' });
  await context.addInitScript(({ selectedUser }) => {
    localStorage.setItem('wc_user', selectedUser);
    let reviewApi;
    Object.defineProperty(globalThis, 'VocabularyAdventureReview', {
      configurable: true,
      get() {
        return reviewApi;
      },
      set(value) {
        reviewApi = {
          ...value,
          buildVocabularyAdventureReviewQuestion(input) {
            const question = value.buildVocabularyAdventureReviewQuestion(input);
            globalThis.__actualReviewQuestion = question;
            return question;
          },
          buildVocabularyAdventureMeaningConfirmation(input) {
            const question = value.buildVocabularyAdventureMeaningConfirmation(input);
            globalThis.__actualMeaningConfirmation = question;
            return question;
          }
        };
      }
    });
  }, { selectedUser: user });
  const state = new Map([
    ['main', structuredClone(mainData)],
    [`vocab_adventure_v1_${user}`, reviewState(taskType, user)]
  ]);
  const writes = [];
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route(/\/assets\/student-home\/card6\/.*\.png$/, route => route.abort());
  await page.route('**/rest/v1/kv_store*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
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
    const key = (url.searchParams.get('key') || '').replace(/^eq\./, '');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(state.has(key) ? [{ value: state.get(key) }] : [])
    });
  });
  await page.goto(`${baseUrl}/?previewVocabularyAdventure=1`, { waitUntil: 'commit' });
  await page.waitForFunction(
    () => typeof window.openVocabularyAdventure === 'function',
    null,
    { timeout: 60000 }
  );
  await page.evaluate(() => { sbOnline = true; });
  await page.waitForSelector('#vocabularyAdventurePreviewEntry:visible');
  await page.locator('#vocabularyAdventurePreviewEntry').click();
  await page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureStageTitle')?.textContent === '第二站 · 抗遗忘'
  ));
  return { context, page, state, writes, errors, user };
}

async function currentQuestion(page, taskType) {
  return page.evaluate(type => {
    const question = globalThis.__actualReviewQuestion;
    if (!question || question.questionType !== type) {
      throw new Error(`missing captured review question for ${type}`);
    }
    return question;
  }, taskType);
}

async function visibleMatchPairs(page) {
  return page.locator('.vocabulary-adventure-match-board button').evaluateAll(buttons => {
    const groups = new Map();
    for (const button of buttons) {
      const id = button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      if (!id) continue;
      const key = id.split(':')[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(id);
    }
    return [...groups.values()].filter(ids => ids.length === 2);
  });
}

async function visibleChoiceIndices(page, question) {
  const correctOption = question.options[question.correctIndex];
  const correctLabel = typeof correctOption === 'object' ? correctOption.label : correctOption;
  return page.locator('#vocabularyAdventureReviewOptions button').evaluateAll((buttons, expected) => {
    const entries = buttons.map(button => ({
      index: Number(button.dataset.optionIndex),
      label: button.textContent.trim()
    }));
    const correct = entries.find(entry => entry.label === String(expected).trim());
    return {
      correct: correct?.index ?? -1,
      wrong: entries.filter(entry => entry.index !== correct?.index).map(entry => entry.index)
    };
  }, correctLabel);
}

async function answerCorrect(run, taskType) {
  const { page } = run;
  const question = await currentQuestion(page, taskType);
  assert.equal(question.ok, true);
  assert.equal(question.questionType, taskType);
  if (question.interaction === 'choice') {
    const indices = await visibleChoiceIndices(page, question);
    assert.notEqual(indices.correct, -1);
    await page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${indices.correct}"]`).click();
  } else if (question.interaction === 'input') {
    await page.locator('#vocabularyAdventureReviewInput').fill(question.answer);
    await page.getByRole('button', { name: '确认' }).click();
  } else if (question.interaction === 'order') {
    await page.evaluate(async answer => {
      for (const tokenId of answer) selectVocabularyAdventureReviewToken(tokenId);
      await submitVocabularyAdventureReviewOrder();
    }, question.answer);
  } else if (question.interaction === 'match') {
    const pairs = await visibleMatchPairs(page);
    await page.evaluate(async idsByPair => {
      for (const pair of idsByPair) {
        await selectVocabularyAdventureMatchCard(pair[0]);
        await selectVocabularyAdventureMatchCard(pair[1]);
      }
    }, pairs);
  } else {
    assert.fail(`unknown interaction ${question.interaction}`);
  }
  await page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('已记录为 D')
  ));
  return question;
}

function assertNoHorizontalOverlap(layout) {
  assert.equal(layout.noHorizontalOverflow, true);
  assert.ok(layout.stageBottom <= layout.footerTop + 1, JSON.stringify(layout));
  assert.ok(layout.footerBottom <= layout.viewportHeight + 1, JSON.stringify(layout));
  assert.ok(layout.buttonHeights.every(height => height >= 44), JSON.stringify(layout));
}

try {
  const taskTypes = [
    'visualMatch',
    'wordToMeaning',
    'audioToWord',
    'phoneticToWord',
    'missingLetters',
    'letterOrder',
    'audioSpelling',
    'collocationCloze',
    'exampleCloze',
    'sentenceOrder'
  ];

  for (const taskType of taskTypes) {
    const run = await openReview({ taskType });
    let question;
    try {
      question = await answerCorrect(run, taskType);
    } catch (error) {
      const diagnostics = await run.page.evaluate(() => ({
        label: document.querySelector('.vocabulary-adventure-question-label')?.textContent,
        feedback: document.querySelector('#vocabularyAdventureFeedbackText')?.textContent,
        action: document.querySelector('#vocabularyAdventureAction')?.textContent
      }));
      throw new Error(`${taskType}: ${error.message}\n${JSON.stringify(diagnostics)}`);
    }
    const saved = run.state.get('vocab_adventure_v1_sister');
    assert.equal(saved.words.apple.reviewCount, 2);
    assert.equal(saved.words.apple.intervalIndex, 2);
    assert.equal(saved.words.apple.lastTaskType, taskType);
    assert.equal(saved.session.plan[0].taskType, taskType);
    assert.equal(saved.session.plan[0].status, 'completed');
    assert.equal(saved.session.completed, true);
    assert.equal(run.writes.length, 1);
    assert.deepEqual(run.errors, []);
    if (taskType === 'visualMatch' || taskType === 'sentenceOrder') {
      await run.page.locator('#vocabularyAdventureAction').click();
      await run.page.waitForSelector('.vocabulary-adventure-summary');
      assert.match(await run.page.locator('.vocabulary-adventure-summary').innerText(), /今日完成/);
      await run.page.screenshot({
        path: path.join(resultDir, `vocabulary-adventure-card-3-${taskType}-1024x768.png`),
        fullPage: true
      });
    }
    assert.equal(question.seed.includes('|review|'), true);
    await run.context.close();
  }

  for (const expectedResult of ['H', 'F']) {
    const run = await openReview({ taskType: 'wordToMeaning' });
    const question = await currentQuestion(run.page, 'wordToMeaning');
    const indices = await visibleChoiceIndices(run.page, question);
    await run.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${indices.wrong[0]}"]`).click();
    await run.page.waitForSelector('#vocabularyAdventureReviewHint:visible');
    const secondIndex = expectedResult === 'H' ? indices.correct : indices.wrong[1];
    await run.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${secondIndex}"]`).click();
    if (expectedResult === 'F') {
      await run.page.waitForSelector('.vocabulary-adventure-full-card');
    } else {
      await run.page.waitForFunction(() => (
        document.querySelector('#vocabularyAdventureAction')?.textContent === '继续'
      ));
    }
    const saved = run.state.get('vocab_adventure_v1_sister');
    assert.equal(saved.words.apple.lastResult, expectedResult);
    assert.equal(saved.words.apple.intervalIndex, expectedResult === 'H' ? 1 : 0);
    assert.equal(saved.words.apple.reviewCount, 2);
    assert.equal(run.writes.length, 1);
    await run.context.close();
  }

  const visualConfirmation = await openReview({ taskType: 'visualMatch' });
  const visualPairs = await visibleMatchPairs(visualConfirmation.page);
  await visualConfirmation.page.evaluate(async idsByPair => {
    await selectVocabularyAdventureMatchCard(idsByPair[0][0]);
    await selectVocabularyAdventureMatchCard(idsByPair[1][1]);
    await selectVocabularyAdventureMatchCard(idsByPair[0][1]);
    await selectVocabularyAdventureMatchCard(idsByPair[1][0]);
    for (const pair of idsByPair) {
      await selectVocabularyAdventureMatchCard(pair[0]);
      await selectVocabularyAdventureMatchCard(pair[1]);
    }
  }, visualPairs);
  await visualConfirmation.page.waitForFunction(() => (
    document.querySelector('.vocabulary-adventure-question-label')?.textContent.includes('配对后')
  ));
  const visualMeaning = await visualConfirmation.page.evaluate(() => globalThis.__actualMeaningConfirmation);
  const visualMeaningIndices = await visibleChoiceIndices(visualConfirmation.page, visualMeaning);
  await visualConfirmation.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${visualMeaningIndices.correct}"]`).click();
  await visualConfirmation.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureAction')?.textContent === '继续'
  ));
  const visualSaved = visualConfirmation.state.get('vocab_adventure_v1_sister');
  assert.equal(visualSaved.words.apple.lastResult, 'H');
  assert.equal(visualSaved.session.plan[0].outcomeDetail, '');
  assert.equal(visualSaved.session.plan[0].taskType, 'visualMatch');
  assert.equal(visualSaved.session.plan[0].confirmationTaskType, visualMeaning.questionType);
  await visualConfirmation.context.close();

  const usageWeak = await openReview({ taskType: 'exampleCloze' });
  await usageWeak.page.evaluate(() => {
    window.__usageSaveAttempts = [];
    window.__usageSavePass = false;
    window.__usageOriginalSave = window.saveCurrentVocabularyAdventureState;
    window.saveCurrentVocabularyAdventureState = async state => {
      window.__usageSaveAttempts.push(state);
      return window.__usageSavePass ? window.__usageOriginalSave(state) : false;
    };
  });
  const usageQuestion = await currentQuestion(usageWeak.page, 'exampleCloze');
  const usageIndices = await visibleChoiceIndices(usageWeak.page, usageQuestion);
  await usageWeak.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${usageIndices.wrong[0]}"]`).click();
  await usageWeak.page.waitForFunction(() => (
    document.querySelector('.vocabulary-adventure-question-label')?.textContent.includes('基础意义确认')
  ));
  const confirmation = await usageWeak.page.evaluate(() => globalThis.__actualMeaningConfirmation);
  const confirmationIndices = await visibleChoiceIndices(usageWeak.page, confirmation);
  await usageWeak.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${confirmationIndices.correct}"]`).click();
  await usageWeak.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureAction')?.textContent === '重新保存'
  ));
  assert.equal(await usageWeak.page.locator('#vocabularyAdventureScreeningProgress').innerText(), '抗遗忘 0 / 1');
  await usageWeak.page.evaluate(() => { window.__usageSavePass = true; });
  await usageWeak.page.locator('#vocabularyAdventureAction').click();
  await usageWeak.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('当前间隔保持不变')
  ));
  const usageWeakSaved = usageWeak.state.get('vocab_adventure_v1_sister');
  assert.equal(usageWeakSaved.words.apple.intervalIndex, 1);
  assert.equal(usageWeakSaved.words.apple.reviewCount, 2);
  assert.equal(usageWeakSaved.session.plan[0].taskType, 'exampleCloze');
  assert.equal(usageWeakSaved.session.plan[0].confirmationTaskType, confirmation.questionType);
  assert.equal(usageWeakSaved.session.plan[0].outcomeDetail, 'usageWeak');
  assert.equal(usageWeak.writes.length, 1);
  assert.deepEqual(await usageWeak.page.evaluate(() => ({
    attempts: window.__usageSaveAttempts.length,
    sameObject: window.__usageSaveAttempts[0] === window.__usageSaveAttempts[1],
    reviewCount: window.__usageSaveAttempts[1].words.apple.reviewCount
  })), { attempts: 2, sameObject: true, reviewCount: 2 });
  await usageWeak.context.close();

  const usageFailed = await openReview({ taskType: 'collocationCloze' });
  const usageFailedQuestion = await currentQuestion(usageFailed.page, 'collocationCloze');
  const usageFailedIndices = await visibleChoiceIndices(usageFailed.page, usageFailedQuestion);
  await usageFailed.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${usageFailedIndices.wrong[0]}"]`).click();
  await usageFailed.page.waitForFunction(() => (
    document.querySelector('.vocabulary-adventure-question-label')?.textContent.includes('基础意义确认')
  ));
  const confirmationFailed = await usageFailed.page.evaluate(() => globalThis.__actualMeaningConfirmation);
  const confirmationFailedIndices = await visibleChoiceIndices(usageFailed.page, confirmationFailed);
  await usageFailed.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${confirmationFailedIndices.wrong[0]}"]`).click();
  try {
    await usageFailed.page.waitForSelector('.vocabulary-adventure-full-card');
  } catch (error) {
    const diagnostics = await usageFailed.page.evaluate(() => ({
      body: document.getElementById('vocabularyAdventureBody')?.innerText,
      feedback: document.getElementById('vocabularyAdventureFeedbackText')?.innerText,
      action: document.getElementById('vocabularyAdventureAction')?.innerText,
      localState: localStorage.getItem('wc_sb_vocab_adventure_v1_sister')
    }));
    throw new Error(`${error.message}\n${JSON.stringify({ diagnostics, errors: usageFailed.errors }, null, 2)}`);
  }
  const usageFailedSaved = usageFailed.state.get('vocab_adventure_v1_sister');
  assert.equal(usageFailedSaved.words.apple.lastResult, 'F');
  assert.equal(usageFailedSaved.words.apple.intervalIndex, 0);
  assert.equal(usageFailedSaved.words.apple.reviewCount, 2);
  await usageFailed.context.close();

  const retry = await openReview({ taskType: 'wordToMeaning' });
  await retry.page.evaluate(() => {
    window.__reviewSaveAttempts = [];
    window.__reviewSavePass = false;
    window.saveCurrentVocabularyAdventureState = async state => {
      window.__reviewSaveAttempts.push(state);
      return window.__reviewSavePass;
    };
  });
  const retryQuestion = await currentQuestion(retry.page, 'wordToMeaning');
  const retryIndices = await visibleChoiceIndices(retry.page, retryQuestion);
  await retry.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${retryIndices.correct}"]`).click();
  await retry.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureAction')?.textContent === '重新保存'
  ));
  assert.equal(await retry.page.locator('#vocabularyAdventureScreeningProgress').innerText(), '抗遗忘 0 / 1');
  assert.equal(await retry.page.locator('.vocabulary-adventure-summary').count(), 0);
  await retry.page.evaluate(() => { window.__reviewSavePass = true; });
  await retry.page.locator('#vocabularyAdventureAction').click();
  await retry.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('已记录为 D')
  ));
  assert.deepEqual(await retry.page.evaluate(() => ({
    attempts: window.__reviewSaveAttempts.length,
    sameObject: window.__reviewSaveAttempts[0] === window.__reviewSaveAttempts[1],
    reviewCount: window.__reviewSaveAttempts[1].words.apple.reviewCount,
    cursor: window.__reviewSaveAttempts[1].session.cursor,
    completed: window.__reviewSaveAttempts[1].session.completed
  })), {
    attempts: 2,
    sameObject: true,
    reviewCount: 2,
    cursor: 1,
    completed: true
  });
  await retry.context.close();

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1180, height: 820 },
    {
      name: 'ipad11-landscape-944x656',
      contextOptions: devices['iPad (gen 11) landscape']
    }
  ]) {
    const run = await openReview({ taskType: 'visualMatch', viewport });
    const layout = await run.page.evaluate(() => {
      const stage = document.querySelector('.vocabulary-adventure-stage').getBoundingClientRect();
      const footer = document.querySelector('.vocabulary-adventure-feedback').getBoundingClientRect();
      return {
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
        stageBottom: stage.bottom,
        footerTop: footer.top,
        footerBottom: footer.bottom,
        viewportHeight: innerHeight,
        buttonHeights: [...document.querySelectorAll('.vocabulary-adventure-match-board button, .vocabulary-adventure-feedback button')]
          .filter(button => !button.hidden)
          .map(button => button.getBoundingClientRect().height)
      };
    });
    assertNoHorizontalOverlap(layout);
    await run.context.close();
  }

  const brother = await openReview({ taskType: 'wordToMeaning', user: 'brother' });
  await answerCorrect(brother, 'wordToMeaning');
  assert.equal(brother.state.has('vocab_adventure_v1_sister'), false);
  assert.equal(brother.state.get('vocab_adventure_v1_brother').words.apple.reviewCount, 2);
  await brother.context.close();

  console.log('vocabulary adventure card 3 WebKit review viewport tests passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
