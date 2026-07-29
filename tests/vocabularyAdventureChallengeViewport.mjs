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

const cards = Array.from({ length: 12 }, (_, index) => {
  const word = index === 0 ? 'electroencephalographically' : `trail${index}`;
  return {
    word,
    meaning: index === 0
      ? '用脑电图方式进行记录和分析的超长测试释义，用来确认窄屏能够自然换行'
      : `探险词${index}`,
    pos: 'n.',
    phonetic: `/treɪl${index}/`,
    emoji: '🌲',
    morphology: [],
    collocations: [{
      phrase: `${word} practice`,
      example: `We use ${word} in this deliberately long example sentence today so narrow screens must wrap every line safely`
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

async function openPage(
  viewport,
  preview = true,
  failedAdventureWrites = [],
  user = 'sister',
  sharedState = null
) {
  const contextOptions = viewport.contextOptions || (viewport.viewport ? viewport : { viewport });
  const context = await browser.newContext({ ...contextOptions, serviceWorkers: 'block' });
  await context.addInitScript(selectedUser => localStorage.setItem('wc_user', selectedUser), user);
  const state = sharedState || new Map([
    ['main', structuredClone(mainData)],
    [`vocab_adventure_v1_${user}`, structuredClone(initialAdventureState)],
    [`daily_task_${user}`, {}]
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
  await page.route(/\/assets\/student-home\/card6\/.*\.png$/, route => route.abort());
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
  await page.goto(`${baseUrl}/${preview ? '?previewVocabularyAdventure=1' : ''}`, { waitUntil: 'commit' });
  await page.waitForFunction(() => typeof window.openVocabularyAdventureChallenge === 'function');
  await page.waitForFunction(() => typeof sbOnline !== 'undefined' && sbOnline === true);
  await page.waitForFunction(() => document.getElementById('currentModeBadge')?.textContent.includes('当前：'));
  return { context, page, state, errors };
}

async function answerCurrent(page, state, correct = true, user = 'sister') {
  const saved = state.get(`vocab_adventure_v1_${user}`);
  const session = saved.challengeSession;
  const item = session.items[session.cursor];
  const question = item.question;
  await page.waitForFunction(expected => (
    document.getElementById('vocabularyAdventureChallengeCount')?.textContent === expected
  ), `${session.cursor + 1}/10`);
  if (question.interaction === 'choice') {
    const selected = correct
      ? question.correctIndex
      : (question.correctIndex + 1) % question.options.length;
    await page.locator('#vocabularyAdventureChallengeBody .vocabulary-adventure-options button').nth(selected).click();
  } else if (question.interaction === 'input') {
    await page.locator('#vocabularyAdventureChallengeInput').fill(correct ? question.answer : 'wrong');
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
  assert.equal(await hidden.page.locator('#studentDashboard').isVisible(), true);
  assert.equal(await hidden.page.locator('#homeQuickActions').count(), 0);
  assert.equal(await hidden.page.locator('#todayWordBtn').count(), 0);
  assert.equal(await hidden.page.locator('#mixedWordBtn').count(), 0);
  assert.equal(await hidden.page.locator('#vocabularyAdventurePreviewEntry').isVisible(), true);
  assert.equal(await hidden.page.locator('#vocabularyAdventureChallengeEntry').isVisible(), true);
  await hidden.context.close();

  const saveFailure = await openPage({ width: 1024, height: 768 }, true, [1, 3]);
  await saveFailure.page.waitForSelector('#studentDashboard:visible');
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

  const run = await openPage({
    name: 'ipad11-landscape',
    contextOptions: devices['iPad (gen 11) landscape']
  });
  try {
    await run.page.waitForSelector('#studentDashboard:visible');
  } catch (error) {
    const diagnostics = await run.page.evaluate(() => ({
      wrapper: document.getElementById('studentDashboard')?.outerHTML,
      currentUser: window.currentUser,
      preview: window.isVocabularyAdventurePreviewEnabled?.(location.search, localStorage),
      updater: String(window.updateVocabularyAdventurePreviewEntry || '').slice(0, 120)
    }));
    throw new Error(`${error.message}\n${JSON.stringify({ diagnostics, errors: run.errors }, null, 2)}`);
  }
  assert.equal(await run.page.locator('#homeQuickActions').count(), 0);
  assert.equal(await run.page.locator('#vocabularyAdventurePreviewEntry').isVisible(), true);
  assert.equal(await run.page.locator('#vocabularyAdventureChallengeEntry').isVisible(), true);
  assert.equal(await run.page.locator('#grammarChallengeHomeEntry').isVisible(), true);
  assert.equal(await run.page.locator('#vocabularyTourHomeEntry').isVisible(), true);
  assert.equal(await run.page.locator('#studentClassroomPracticeEntry').isVisible(), true);
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
  await run.page.reload({ waitUntil: 'commit' });
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
  await run.page.screenshot({ path: path.join(resultDir, 'vocabulary-adventure-challenge-ipad11-landscape-944x656.png'), fullPage: true });

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
  assert.equal(await run.page.locator('#studentDashboard').isHidden(), true);
  assert.equal(await run.page.locator('.teacher-home-nav').isVisible(), true);
  await run.context.close();

  const compact = await openPage({ width: 1024, height: 768 });
  await compact.page.waitForSelector('#studentDashboard:visible');
  const compactLayout = await compact.page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    adventureHeight: document.getElementById('vocabularyAdventurePreviewEntry').getBoundingClientRect().height,
    challengeHeight: document.getElementById('vocabularyAdventureChallengeEntry').getBoundingClientRect().height
  }));
  assert.equal(compactLayout.overflow, false);
  assert.ok(compactLayout.adventureHeight >= 44);
  assert.ok(compactLayout.challengeHeight >= 44);
  await compact.context.close();

  const sharedState = new Map([
    ['main', structuredClone(mainData)],
    ['vocab_adventure_v1_sister', structuredClone(initialAdventureState)],
    ['vocab_adventure_v1_brother', structuredClone(initialAdventureState)],
    ['daily_task_sister', {}],
    ['daily_task_brother', {}]
  ]);
  const [sister, brother] = await Promise.all([
    openPage({ width: 1180, height: 820 }, true, [2], 'sister', sharedState),
    openPage({ width: 1180, height: 820 }, true, [], 'brother', sharedState)
  ]);
  await Promise.all([
    sister.page.waitForSelector('#studentDashboard:visible'),
    brother.page.waitForSelector('#studentDashboard:visible')
  ]);
  await Promise.all([
    sister.page.locator('#vocabularyAdventureChallengeEntry').click(),
    brother.page.locator('#vocabularyAdventureChallengeEntry').click()
  ]);
  await Promise.all([
    sister.page.waitForSelector('#screenVocabularyAdventureChallenge.active'),
    brother.page.waitForSelector('#screenVocabularyAdventureChallenge.active')
  ]);

  const sisterStart = structuredClone(sharedState.get('vocab_adventure_v1_sister').challengeSession);
  const brotherStart = structuredClone(sharedState.get('vocab_adventure_v1_brother').challengeSession);
  assert.equal(sisterStart.cursor, 0);
  assert.equal(brotherStart.cursor, 0);
  assert.notEqual(sisterStart.seed, brotherStart.seed);
  assert.notDeepEqual(
    sisterStart.items.map(item => item.wordKey),
    brotherStart.items.map(item => item.wordKey)
  );

  await Promise.all([
    answerCurrent(sister.page, sharedState, false, 'sister'),
    answerCurrent(brother.page, sharedState, true, 'brother')
  ]);
  assert.equal(sharedState.get('vocab_adventure_v1_sister').challengeSession.cursor, 0);
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeSession.cursor, 1);
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeSession.wrongItems.length, 0);
  assert.match(
    await sister.page.locator('#vocabularyAdventureChallengeFeedbackText').textContent(),
    /保存失败/
  );

  await sister.page.evaluate(() => { sbOnline = true; });
  await sister.page.locator('#vocabularyAdventureChallengeAction').click();
  await sister.page.waitForFunction(() => (
    document.getElementById('vocabularyAdventureChallengeAction')?.textContent === '下一题'
  ));
  const sisterAfterRetry = sharedState.get('vocab_adventure_v1_sister');
  const sisterWrongKey = sisterAfterRetry.challengeSession.items[0].wordKey;
  assert.equal(sisterAfterRetry.challengeSession.cursor, 1);
  assert.equal(sisterAfterRetry.challengeSession.wrongItems.length, 1);
  assert.ok(sisterAfterRetry.words[sisterWrongKey].challengeFlagAt);
  assert.equal(
    sharedState.get('vocab_adventure_v1_brother').words[sisterWrongKey].challengeFlagAt,
    ''
  );

  const brotherQuestion = structuredClone(
    sharedState.get('vocab_adventure_v1_brother').challengeSession.items[1].question
  );
  await brother.page.reload({ waitUntil: 'commit' });
  await brother.page.waitForFunction(() => typeof window.openVocabularyAdventureChallenge === 'function');
  await brother.page.evaluate(() => openVocabularyAdventureChallenge());
  await brother.page.waitForSelector('#screenVocabularyAdventureChallenge.active');
  assert.deepEqual(
    sharedState.get('vocab_adventure_v1_brother').challengeSession.items[1].question,
    brotherQuestion
  );
  assert.equal(sharedState.get('vocab_adventure_v1_sister').challengeSession.cursor, 1);

  sister.page.once('dialog', dialog => dialog.accept());
  await sister.page.locator('#screenVocabularyAdventureChallenge .vocabulary-adventure-exit').click();
  await sister.page.waitForSelector('#screenHome.active');
  assert.equal(sharedState.get('vocab_adventure_v1_sister').challengeSession.status, 'abandoned');
  assert.equal(sharedState.get('vocab_adventure_v1_sister').challengeDaily.attempts, 1);
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeSession.status, 'active');
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeSession.cursor, 1);

  while (sharedState.get('vocab_adventure_v1_brother').challengeSession.status === 'active') {
    await answerCurrent(brother.page, sharedState, true, 'brother');
    await brother.page.locator('#vocabularyAdventureChallengeAction').click();
  }
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeDaily.attempts, 1);
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeDaily.bestScore, 100);
  assert.equal(sharedState.get('vocab_adventure_v1_brother').challengeSession.wrongItems.length, 0);
  assert.equal(sharedState.get('vocab_adventure_v1_sister').challengeDaily.bestScore, 0);
  assert.equal(sharedState.get('vocab_adventure_v1_sister').challengeSession.wrongItems.length, 1);
  await Promise.all([sister.context.close(), brother.context.close()]);

  const deviceState = new Map([
    ['main', structuredClone(mainData)],
    ['vocab_adventure_v1_sister', structuredClone(initialAdventureState)],
    ['daily_task_sister', {}]
  ]);
  const deviceA = await openPage({ width: 1024, height: 768 }, true, [], 'sister', deviceState);
  await deviceA.page.waitForSelector('#studentDashboard:visible');
  await deviceA.page.locator('#vocabularyAdventureChallengeEntry').click();
  await deviceA.page.waitForSelector('#screenVocabularyAdventureChallenge.active');
  await answerCurrent(deviceA.page, deviceState, true, 'sister');
  await deviceA.page.locator('#vocabularyAdventureChallengeAction').click();
  const deviceAQuestion = structuredClone(
    deviceState.get('vocab_adventure_v1_sister').challengeSession.items[1].question
  );
  await deviceA.context.close();

  const deviceB = await openPage({ width: 1024, height: 768 }, true, [], 'sister', deviceState);
  await deviceB.page.waitForSelector('#studentDashboard:visible');
  await deviceB.page.locator('#vocabularyAdventureChallengeEntry').click();
  await deviceB.page.waitForSelector('#screenVocabularyAdventureChallenge.active');
  assert.equal(deviceState.get('vocab_adventure_v1_sister').challengeSession.cursor, 1);
  assert.deepEqual(
    deviceState.get('vocab_adventure_v1_sister').challengeSession.items[1].question,
    deviceAQuestion
  );
  assert.equal(await deviceB.page.locator('#vocabularyAdventureChallengeCount').textContent(), '2/10');
  await deviceB.context.close();

  const phone = await openPage({ width: 393, height: 852 });
  await phone.page.waitForSelector('#studentDashboard:visible');
  const phoneHome = await phone.page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    adventureVisible: !!document.getElementById('vocabularyAdventurePreviewEntry')?.getClientRects().length,
    challengeVisible: !!document.getElementById('vocabularyAdventureChallengeEntry')?.getClientRects().length,
    adventureHeight: document.getElementById('vocabularyAdventurePreviewEntry').getBoundingClientRect().height,
    challengeHeight: document.getElementById('vocabularyAdventureChallengeEntry').getBoundingClientRect().height
  }));
  assert.equal(phoneHome.overflow, false);
  assert.equal(phoneHome.adventureVisible, true);
  assert.equal(phoneHome.challengeVisible, true);
  assert.ok(phoneHome.adventureHeight >= 44);
  assert.ok(phoneHome.challengeHeight >= 44);
  await phone.page.locator('#vocabularyAdventureChallengeEntry').click();
  await phone.page.waitForSelector('#screenVocabularyAdventureChallenge.active');

  const seenInteractions = new Set();
  while (phone.state.get('vocab_adventure_v1_sister').challengeSession.status === 'active') {
    const phoneSession = phone.state.get('vocab_adventure_v1_sister').challengeSession;
    const question = phoneSession.items[phoneSession.cursor].question;
    seenInteractions.add(question.interaction);
    const questionLayout = await phone.page.evaluate(() => {
      const screen = document.getElementById('screenVocabularyAdventureChallenge');
      const top = screen.querySelector('.vocabulary-adventure-topbar').getBoundingClientRect();
      const stage = screen.querySelector('.vocabulary-adventure-stage').getBoundingClientRect();
      const feedback = screen.querySelector('.vocabulary-adventure-feedback').getBoundingClientRect();
      const controls = [...screen.querySelectorAll('button,input')]
        .map(control => control.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0);
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        topStageOverlap: top.bottom > stage.top + 1,
        stageFeedbackOverlap: stage.bottom > feedback.top + 1,
        minControl: Math.min(...controls.map(rect => rect.height))
      };
    });
    assert.equal(questionLayout.overflow, false);
    assert.equal(questionLayout.topStageOverlap, false);
    assert.equal(questionLayout.stageFeedbackOverlap, false);
    assert.ok(questionLayout.minControl >= 44);

    if (question.interaction === 'input') {
      const input = phone.page.locator('#vocabularyAdventureChallengeInput');
      await input.focus();
      await phone.page.setViewportSize({ width: 393, height: 560 });
      const keyboardLayout = await phone.page.evaluate(() => {
        const inputRect = document.getElementById('vocabularyAdventureChallengeInput').getBoundingClientRect();
        const confirmRect = document.querySelector('.vocabulary-adventure-review-input button').getBoundingClientRect();
        const feedbackRect = document.querySelector('#screenVocabularyAdventureChallenge .vocabulary-adventure-feedback').getBoundingClientRect();
        return {
          inputVisible: inputRect.top >= 0 && inputRect.bottom <= window.innerHeight,
          confirmVisible: confirmRect.top >= 0 && confirmRect.bottom <= window.innerHeight,
          feedbackVisible: feedbackRect.top < window.innerHeight && feedbackRect.bottom <= window.innerHeight
        };
      });
      assert.equal(keyboardLayout.inputVisible, true);
      assert.equal(keyboardLayout.confirmVisible, true);
      assert.equal(keyboardLayout.feedbackVisible, true);
      await phone.page.setViewportSize({ width: 393, height: 852 });
    }

    await answerCurrent(phone.page, phone.state, false);
    await phone.page.locator('#vocabularyAdventureChallengeAction').click();
  }
  assert.ok(seenInteractions.has('choice'));
  assert.ok(seenInteractions.has('input'));
  assert.ok(seenInteractions.has('order'));
  await phone.page.waitForSelector('.vocabulary-adventure-challenge-result');
  const phoneResult = await phone.page.evaluate(() => {
    const result = document.querySelector('.vocabulary-adventure-challenge-result');
    result.scrollTop = result.scrollHeight;
    const actions = result.querySelector('.vocabulary-adventure-challenge-result-actions').getBoundingClientRect();
    const actionButtons = [...result.querySelectorAll('.vocabulary-adventure-challenge-result-actions button')]
      .map(button => button.getBoundingClientRect());
    const wrongItems = [...result.querySelectorAll('.vocabulary-adventure-challenge-wrong article')];
    const lastWrong = wrongItems.at(-1)?.getBoundingClientRect();
    const resultRect = result.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollable: result.scrollHeight >= result.clientHeight,
      actionsReachable: actions.height > 0
        && actions.top >= resultRect.top - 1
        && actions.bottom <= resultRect.bottom + 1,
      minActionHeight: Math.min(...actionButtons.map(rect => rect.height)),
      lastWrongReachable: !lastWrong || (
        lastWrong.top >= resultRect.top - 1
        && lastWrong.bottom <= resultRect.bottom + 1
      )
    };
  });
  assert.equal(phoneResult.overflow, false);
  assert.equal(phoneResult.actionsReachable, true);
  assert.equal(phoneResult.lastWrongReachable, true);
  assert.ok(phoneResult.minActionHeight >= 44);
  await phone.page.locator('.vocabulary-adventure-challenge-result-actions').scrollIntoViewIfNeeded();
  await phone.page.waitForTimeout(150);
  const phoneScreenshotReachability = await phone.page.evaluate(() => {
    const result = document.querySelector('.vocabulary-adventure-challenge-result').getBoundingClientRect();
    const actions = document.querySelector('.vocabulary-adventure-challenge-result-actions').getBoundingClientRect();
    return actions.top >= result.top - 1 && actions.bottom <= result.bottom + 1;
  });
  assert.equal(phoneScreenshotReachability, true);
  await phone.page.screenshot({
    path: path.join(resultDir, 'vocabulary-adventure-challenge-iphone16-portrait-393x852.png'),
    fullPage: false
  });
  await phone.context.close();

  console.log('vocabulary adventure card 5 WebKit challenge, isolation and viewport tests passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
