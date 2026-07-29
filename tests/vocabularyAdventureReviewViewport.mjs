import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devices, webkit } from 'playwright';

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
  const context = await browser.newContext(viewport.contextOptions || (viewport.viewport ? viewport : { viewport }));
  await context.addInitScript(({ selectedUser }) => {
    localStorage.setItem('wc_user', selectedUser);
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
  await page.goto(`${baseUrl}/?previewVocabularyAdventure=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#vocabularyAdventurePreviewEntry:visible');
  await page.locator('#vocabularyAdventurePreviewEntry').click();
  await page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureStageTitle')?.textContent === '第二站 · 抗遗忘'
  ));
  return { context, page, state, writes, errors, user };
}

async function currentQuestion(page, taskType) {
  return page.evaluate(type => {
    const state = JSON.parse(localStorage.getItem(`wc_sb_vocab_adventure_v1_${localStorage.getItem('wc_user')}`));
    const item = state.session.plan[state.session.cursor];
    const candidates = collectVisibleVocabularyAdventureCandidates();
    return VocabularyAdventureReview.buildVocabularyAdventureReviewQuestion({
      session: state.session,
      planItem: item,
      planIndex: state.session.cursor,
      wordState: state.words[item.wordKey],
      card: candidates.find(candidate => candidate.key === item.wordKey).card,
      allCards: candidates,
      userKey: localStorage.getItem('wc_user'),
      taskType: type
    });
  }, taskType);
}

async function answerCorrect(run, taskType) {
  const { page } = run;
  const question = await currentQuestion(page, taskType);
  assert.equal(question.ok, true);
  assert.equal(question.questionType, taskType);
  if (question.interaction === 'choice') {
    await page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${question.correctIndex}"]`).click();
  } else if (question.interaction === 'input') {
    await page.locator('#vocabularyAdventureReviewInput').fill(question.answer);
    await page.getByRole('button', { name: '确认' }).click();
  } else if (question.interaction === 'order') {
    await page.evaluate(async answer => {
      for (const tokenId of answer) selectVocabularyAdventureReviewToken(tokenId);
      await submitVocabularyAdventureReviewOrder();
    }, question.answer);
  } else if (question.interaction === 'match') {
    await page.evaluate(async pairs => {
      for (const pair of pairs) {
        await selectVocabularyAdventureMatchCard(`${pair.key}:visual`);
        await selectVocabularyAdventureMatchCard(`${pair.key}:word`);
      }
    }, question.pairs);
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
    const question = await answerCorrect(run, taskType);
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
    const wrong = question.options.map((_, index) => index).filter(index => index !== question.correctIndex);
    await run.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${wrong[0]}"]`).click();
    await run.page.waitForSelector('#vocabularyAdventureReviewHint:visible');
    const secondIndex = expectedResult === 'H' ? question.correctIndex : wrong[1];
    await run.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${secondIndex}"]`).click();
    if (expectedResult === 'F') {
      await run.page.waitForSelector('.vocabulary-adventure-full-card');
    } else {
      await run.page.waitForFunction(() => (
        document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('已记录为 H')
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
  const visualQuestion = await currentQuestion(visualConfirmation.page, 'visualMatch');
  await visualConfirmation.page.evaluate(async pairs => {
    await selectVocabularyAdventureMatchCard(`${pairs[0].key}:visual`);
    await selectVocabularyAdventureMatchCard(`${pairs[1].key}:word`);
    await selectVocabularyAdventureMatchCard(`${pairs[0].key}:word`);
    await selectVocabularyAdventureMatchCard(`${pairs[1].key}:visual`);
    for (const pair of pairs) {
      await selectVocabularyAdventureMatchCard(`${pair.key}:visual`);
      await selectVocabularyAdventureMatchCard(`${pair.key}:word`);
    }
  }, visualQuestion.pairs);
  await visualConfirmation.page.waitForFunction(() => (
    document.querySelector('.vocabulary-adventure-question-label')?.textContent.includes('配对后')
  ));
  const visualMeaning = await visualConfirmation.page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('wc_sb_vocab_adventure_v1_sister'));
    const item = state.session.plan[state.session.cursor];
    const candidates = collectVisibleVocabularyAdventureCandidates();
    return VocabularyAdventureReview.buildVocabularyAdventureMeaningConfirmation({
      session: state.session,
      planItem: item,
      planIndex: state.session.cursor,
      wordState: state.words[item.wordKey],
      card: candidates.find(candidate => candidate.key === item.wordKey).card,
      allCards: candidates,
      userKey: 'sister'
    });
  });
  await visualConfirmation.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${visualMeaning.correctIndex}"]`).click();
  await visualConfirmation.page.waitForFunction(() => (
    document.querySelector('#vocabularyAdventureFeedbackText')?.textContent.includes('已记录为 H')
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
  const wrongUsage = usageQuestion.options.findIndex((_, index) => index !== usageQuestion.correctIndex);
  await usageWeak.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${wrongUsage}"]`).click();
  await usageWeak.page.waitForFunction(() => (
    document.querySelector('.vocabulary-adventure-question-label')?.textContent.includes('基础意义确认')
  ));
  const confirmation = await usageWeak.page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('wc_sb_vocab_adventure_v1_sister'));
    const item = state.session.plan[state.session.cursor];
    const candidates = collectVisibleVocabularyAdventureCandidates();
    return VocabularyAdventureReview.buildVocabularyAdventureMeaningConfirmation({
      session: state.session,
      planItem: item,
      planIndex: state.session.cursor,
      wordState: state.words[item.wordKey],
      card: candidates.find(candidate => candidate.key === item.wordKey).card,
      allCards: candidates,
      userKey: 'sister'
    });
  });
  await usageWeak.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${confirmation.correctIndex}"]`).click();
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
  const wrongFirst = usageFailedQuestion.options.findIndex((_, index) => index !== usageFailedQuestion.correctIndex);
  await usageFailed.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${wrongFirst}"]`).click();
  await usageFailed.page.waitForFunction(() => (
    document.querySelector('.vocabulary-adventure-question-label')?.textContent.includes('基础意义确认')
  ));
  const confirmationFailed = await usageFailed.page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('wc_sb_vocab_adventure_v1_sister'));
    const item = state.session.plan[state.session.cursor];
    const candidates = collectVisibleVocabularyAdventureCandidates();
    return VocabularyAdventureReview.buildVocabularyAdventureMeaningConfirmation({
      session: state.session,
      planItem: item,
      planIndex: state.session.cursor,
      wordState: state.words[item.wordKey],
      card: candidates.find(candidate => candidate.key === item.wordKey).card,
      allCards: candidates,
      userKey: 'sister'
    });
  });
  const wrongConfirmation = confirmationFailed.options.findIndex((_, index) => index !== confirmationFailed.correctIndex);
  await usageFailed.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${wrongConfirmation}"]`).click();
  await usageFailed.page.waitForSelector('.vocabulary-adventure-full-card');
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
  await retry.page.locator(`#vocabularyAdventureReviewOptions button[data-option-index="${retryQuestion.correctIndex}"]`).click();
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
