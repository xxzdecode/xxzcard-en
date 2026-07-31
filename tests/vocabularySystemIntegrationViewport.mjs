import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { webkit } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, 'test-results');
fs.mkdirSync(resultDir, { recursive: true });

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

const words = [
  'apple', 'banana', 'carrot', 'dragon', 'eagle', 'forest', 'garden', 'harbor',
  'island', 'jungle', 'kitten', 'lemon', 'mirror', 'number', 'orange', 'pencil'
];
const cards = words.map((word, index) => ({
  word,
  meaning: `中文意思${index}`,
  pos: 'n.',
  phonetic: `/test${index}/`,
  emoji: index === 0 ? '🍎' : '📝',
  collocations: [{
    phrase: `${word} practice`,
    example: `We use ${word} in a clear example sentence. / 这是例句。`
  }],
  irregularForms: index === 0 ? ['apples'] : [],
  tip: index === 0 ? '开头是 a。' : ''
}));

function choiceQuestion(index) {
  const next = (index + 1) % cards.length;
  return {
    ok: true,
    interaction: 'choice',
    questionType: 'wordToMeaning',
    wordKey: cards[index].word,
    prompt: cards[index].word,
    options: [
      { key: cards[index].meaning, label: cards[index].meaning, correct: true },
      { key: cards[next].meaning, label: cards[next].meaning, correct: false }
    ],
    correctIndex: 0,
    requiresUsageConfirmation: false
  };
}

function initialAdventureState() {
  const today = localDateKey();
  return {
    version: 1,
    words: Object.fromEntries(cards.map(card => [card.word, {
      lastResult: 'D',
      intervalIndex: 2,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: today,
      reviewCount: 1,
      lastTaskType: '',
      challengeFlagAt: ''
    }])),
    session: null,
    challengeDaily: { date: today, attempts: 0, bestScore: 0 },
    challengeSession: {
      date: today,
      attemptIndex: 1,
      seed: `${today}|sister|challenge|1`,
      status: 'active',
      cursor: 0,
      correctCount: 0,
      wrongCount: 0,
      wrongItems: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: '',
      items: cards.slice(0, 10).map((card, index) => ({
        wordKey: card.word,
        taskType: 'wordToMeaning',
        question: choiceQuestion(index),
        status: 'pending',
        userAnswer: null,
        correct: null,
        answeredAt: ''
      }))
    }
  };
}

const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [{
    id: 'vocabulary-integration',
    name: '词汇整合验收',
    date: localDateKey(),
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

async function openPage(viewport, name) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.addInitScript(() => localStorage.setItem('wc_user', 'sister'));
  const store = new Map([
    ['main', structuredClone(mainData)],
    ['vocab_adventure_v1_sister', initialAdventureState()],
    ['daily_task_sister', {}]
  ]);
  let failedWritesRemaining = 0;
  const page = await context.newPage();
  const errors = [];
  page.on('dialog', dialog => dialog.dismiss());
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/rest/v1/kv_store*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      if (failedWritesRemaining > 0) {
        failedWritesRemaining -= 1;
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        return;
      }
      const payload = request.postDataJSON();
      store.set(payload.key, structuredClone(payload.value));
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
      return;
    }
    const url = new URL(request.url());
    if (url.searchParams.get('select') === 'key,value') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([...store].map(([key, value]) => ({ key, value })))
      });
      return;
    }
    if (url.searchParams.get('select') === 'key') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[{"key":"main"}]' });
      return;
    }
    const key = (url.searchParams.get('key') || '').replace(/^eq\./, '');
    const value = store.get(key);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(value === undefined ? [] : [{ value }])
    });
  });

  await page.goto(`${baseUrl}/?previewVocabularyAdventure=1`, { waitUntil: 'commit' });
  await page.waitForFunction(() => typeof window.openVocabularyAdventureChallenge === 'function');
  await page.waitForFunction(() => document.getElementById('studentDashboard')?.offsetParent !== null);
  await page.evaluate(() => openVocabularyAdventureChallenge());
  await page.waitForSelector('#screenVocabularyAdventureChallenge.active');
  await page.waitForSelector('#vocabularyAdventureChallengeBody .vocabulary-adventure-question');
  return {
    context,
    page,
    store,
    errors,
    name,
    failNextSave: () => { failedWritesRemaining = 4; }
  };
}

async function clickChoice(page, correct) {
  const buttons = page.locator('#vocabularyAdventureChallengeBody .vocabulary-adventure-options button');
  await buttons.nth(correct ? 0 : 1).click();
}

async function assertScopedSelection(page) {
  const result = await page.evaluate(() => {
    const selectionValue = node => {
      if (!node) return '';
      const style = getComputedStyle(node);
      return style.userSelect || style.webkitUserSelect || '';
    };
    const prompt = document.querySelector('#vocabularyAdventureChallengeBody .vocabulary-adventure-prompt-text');
    const body = document.getElementById('vocabularyAdventureChallengeBody');
    const input = document.createElement('input');
    input.value = 'editable';
    body.appendChild(input);
    const values = {
      prompt: selectionValue(prompt),
      option: selectionValue(document.querySelector('#vocabularyAdventureChallengeBody .vocabulary-adventure-options button')),
      input: selectionValue(input)
    };
    input.remove();
    return values;
  });
  assert.equal(result.option, 'none');
  assert.ok(['text', 'auto'].includes(result.input), `input selection must remain editable, got ${result.input}`);
  if (result.prompt) assert.equal(result.prompt, 'none');
}

async function startFeedbackTrace(page) {
  await page.evaluate(() => {
    window.__vocabularyFeedbackTraceObserver?.disconnect?.();
    window.__vocabularyFeedbackTrace = [];
    const body = document.getElementById('vocabularyAdventureChallengeBody');
    const record = () => {
      window.__vocabularyFeedbackTrace.push({
        mode: body?.dataset.mode || '',
        wrong: body?.querySelectorAll('.vocabulary-adventure-options .is-wrong').length || 0,
        correct: body?.querySelectorAll('.vocabulary-adventure-options .is-correct').length || 0,
        teaching: body?.querySelectorAll('.vte-shell').length || 0
      });
    };
    const observer = new MutationObserver(record);
    observer.observe(body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-mode']
    });
    window.__vocabularyFeedbackTraceObserver = observer;
    record();
  });
}

async function readFeedbackTrace(page) {
  return page.evaluate(() => {
    window.__vocabularyFeedbackTraceObserver?.disconnect?.();
    return window.__vocabularyFeedbackTrace || [];
  });
}

async function waitForTeaching(run, targetName) {
  try {
    await run.page.waitForSelector('#vocabularyAdventureChallengeBody .vte-shell', { timeout: 15000 });
  } catch (error) {
    const diagnostic = await run.page.evaluate(() => {
      const body = document.getElementById('vocabularyAdventureChallengeBody');
      const feedback = document.getElementById('vocabularyAdventureChallengeFeedbackText');
      const action = document.getElementById('vocabularyAdventureChallengeAction');
      return {
        mode: body?.dataset.mode || '',
        bodyText: body?.innerText || '',
        feedback: feedback?.textContent || '',
        feedbackTone: feedback?.dataset.tone || '',
        action: action?.textContent || '',
        actionHidden: action?.hidden,
        buttons: [...(body?.querySelectorAll('button') || [])].map(button => ({
          text: button.textContent?.trim() || '',
          disabled: button.disabled,
          className: button.className
        })),
        trace: window.__vocabularyFeedbackTrace || [],
        selection: window.__vocabularyPracticeLastSelection || null,
        saveWrapped: !!window.saveCurrentVocabularyAdventureState?.__vteWrapped,
        lastGrade: window.__vocabularyFeedbackGradeContext || null
      };
    });
    diagnostic.savedCursor = run.store.get('vocab_adventure_v1_sister')?.challengeSession?.cursor;
    console.error(`[${targetName}] teaching timeout diagnostic: ${JSON.stringify(diagnostic)}`);
    await run.page.screenshot({
      path: path.join(resultDir, `vocabulary-system-${targetName}-teaching-timeout.png`),
      fullPage: true
    });
    throw error;
  }
}

try {
  for (const target of [
    { name: 'ipad-1180x820', viewport: { width: 1180, height: 820 }, landscape: true },
    { name: 'iphone-393x852', viewport: { width: 393, height: 852 }, landscape: false }
  ]) {
    const run = await openPage(target.viewport, target.name);
    await assertScopedSelection(run.page);

    const columns = await run.page.locator(
      '#vocabularyAdventureChallengeBody .vocabulary-adventure-options'
    ).evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    assert.equal(columns, target.landscape ? 2 : 1);

    await startFeedbackTrace(run.page);
    await clickChoice(run.page, false);
    await waitForTeaching(run, target.name);
    const wrongTrace = await readFeedbackTrace(run.page);
    assert.ok(
      wrongTrace.some(entry => entry.mode === 'question-feedback' && entry.wrong === 1 && entry.correct === 1),
      `wrong answer must show red and green option states before teaching: ${JSON.stringify(wrongTrace)}`
    );
    assert.match(
      await run.page.locator('#vocabularyAdventureChallengeBody .vte-kicker').textContent(),
      /正确答案/
    );
    assert.equal(await run.page.locator('#vocabularyAdventureChallengeAction:not([hidden])').count(), 0);
    await run.page.locator('#vocabularyAdventureChallengeBody .vte-next').click();
    await run.page.waitForFunction(() => (
      document.getElementById('vocabularyAdventureChallengeCount')?.textContent === '2/10'
    ));

    await startFeedbackTrace(run.page);
    await clickChoice(run.page, true);
    await run.page.waitForFunction(() => (
      document.getElementById('vocabularyAdventureChallengeCount')?.textContent === '3/10'
    ));
    const correctTrace = await readFeedbackTrace(run.page);
    assert.ok(
      correctTrace.some(entry => entry.mode === 'question-feedback' && entry.correct === 1),
      `correct answer must show a green option before advancing: ${JSON.stringify(correctTrace)}`
    );

    run.failNextSave();
    await clickChoice(run.page, true);
    await run.page.waitForFunction(() => (
      document.getElementById('vocabularyAdventureChallengeAction')?.textContent === '重新保存'
    ));
    assert.equal(run.store.get('vocab_adventure_v1_sister').challengeSession.cursor, 2);
    await run.page.locator('#vocabularyAdventureChallengeAction').click();
    await run.page.waitForFunction(() => (
      document.getElementById('vocabularyAdventureChallengeCount')?.textContent === '4/10'
    ));
    assert.equal(run.store.get('vocab_adventure_v1_sister').challengeSession.cursor, 3);

    await run.page.screenshot({
      path: path.join(resultDir, `vocabulary-system-${target.name}.png`),
      fullPage: true
    });
    const expectedRetryErrors = run.errors.filter(error => /503 \(Service Unavailable\)/.test(error));
    const unexpectedErrors = run.errors.filter(error => !/503 \(Service Unavailable\)/.test(error));
    assert.equal(expectedRetryErrors.length, 4, 'the injected failure must exercise all four save attempts');
    assert.deepEqual(unexpectedErrors, []);
    await run.context.close();
  }
  console.log('vocabulary system WebKit viewport tests passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
