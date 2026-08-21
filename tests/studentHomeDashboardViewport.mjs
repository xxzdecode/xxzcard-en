import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const edgeExecutable = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const launchBrowser = () => chromium.launch({ executablePath: edgeExecutable });
const resultDir = path.join(root, '.codex-backups', 'home-v4-visual-qa');
fs.mkdirSync(resultDir, { recursive: true });

const cards = Array.from({ length: 12 }, (_, index) => ({
  word: `home${index}`,
  meaning: `首页词${index}`,
  phonetic: `/həʊm${index}/`,
  pos: 'n.',
  emoji: '🌱'
}));
const mainData = {
  pin: '1234',
  mixedAssignments: [],
  taskAssignments: [],
  batches: [{
    id: 'student-home-v4',
    name: '首页视口测试',
    date: '2026-07-29',
    bookPurpose: 'common',
    sharedWith: ['sister', 'brother'],
    cards
  }]
};
const grammarTopics = JSON.parse(fs.readFileSync(path.join(root, 'grammar-library', 'data', 'topics.json'), 'utf8'));
const teacherGrammarProgress = {
  schemaVersion: 1,
  scopeKey: 'shared',
  topics: {
    'sentence-parts': {
      status: 'confirmed_complete',
      last_lesson_date: '2026-07-20',
      title: '句子骨架：主语、谓语、宾语'
    },
    'time-prepositions': {
      status: 'confirmed_complete',
      last_lesson_date: '2026-08-04',
      title: '时间介词 at / on / in'
    },
    'place-prepositions': {
      status: 'materials_ready',
      last_lesson_date: '2026-08-07',
      title: '地点介词'
    }
  },
  events: []
};
const adventureState = {
  version: 1,
  words: Object.fromEntries(cards.map(card => [card.word, {
    lastResult: 'H',
    intervalIndex: 1,
    lastReviewedAt: '2026-07-28T02:00:00.000Z',
    nextReviewAt: '2026-07-29',
    reviewCount: 1,
    lastTaskType: 'wordToMeaning',
    challengeFlagAt: ''
  }])),
  session: null
};

function todayKey() {
  const date = new Date();
  return date.getFullYear() + '-'
    + String(date.getMonth() + 1).padStart(2, '0') + '-'
    + String(date.getDate()).padStart(2, '0');
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.ttf', 'font/ttf']
]);

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'index.html' : path.normalize(pathname).replace(/^[/\\]+/, '');
  const filePath = path.join(root, relative);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
  response.end(fs.readFileSync(filePath));
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();

async function openHome(user, contextOptions, options = {}) {
  const context = await browser.newContext({ ...contextOptions, serviceWorkers: 'block' });
  await context.addInitScript(({ selectedUser, mirror }) => {
    localStorage.setItem('wc_user', selectedUser);
    localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
  }, { selectedUser: user, mirror: mainData });
  const state = new Map([
    ['main', structuredClone(mainData)],
    [`vocab_adventure_v1_${user}`, structuredClone(adventureState)],
    [`daily_task_${user}`, {}],
    ['grammar_progress', structuredClone(teacherGrammarProgress)],
    [`student_reward_v1_${user}`, options.rewardRecord || {
      version: 1,
      user,
      totalCoins: user === 'brother' ? 417 : 406,
      daily: {}
    }]
  ]);
  const page = await context.newPage();
  const errors = [];
  const postKeys = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Service Worker')) errors.push(message.text());
  });
  if (options.masterVocabularyDelayMs) {
    await page.route('**/js/masterVocabularyLibrary.js', async route => {
      await new Promise(resolve => setTimeout(resolve, options.masterVocabularyDelayMs));
      await route.continue();
    });
  }
  if (options.summaryModuleDelayMs) {
    await page.route('**/js/teacherDashboardSummaries.js', async route => {
      await new Promise(resolve => setTimeout(resolve, options.summaryModuleDelayMs));
      await route.continue();
    });
  }
  await page.route('**/rest/v1/kv_store*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      postKeys.push(payload.key);
      if (options.saveDelayMs) await new Promise(resolve => setTimeout(resolve, options.saveDelayMs));
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
  await page.goto(baseUrl, { waitUntil: 'commit' });
  try {
    await page.waitForFunction(expected => (
      document.getElementById('studentSummaryName')?.textContent === expected
        || (expected === '老师' && document.body.classList.contains('is-teacher'))
    ), user === 'brother' ? '弟弟' : user === 'teacher' ? '老师' : '姐姐');
  } catch (error) {
    const state = await page.evaluate(() => ({
      readyState: document.readyState,
      currentName: document.getElementById('studentSummaryName')?.textContent || '',
      bodyClass: document.body.className
    }));
    throw new Error(`student home init failed for ${user}: ${JSON.stringify({ state, errors })}`, { cause: error });
  }
  await page.waitForFunction(() => Boolean(document.querySelector('link[data-student-home-dashboard]')?.sheet));
  if (user !== 'teacher') {
    assert.equal(await page.locator('#fbLoading').isVisible().catch(() => false), false);
    const scenes = page.locator('.student-home-card__scene');
    for (let index = 0; index < await scenes.count(); index += 1) {
      await scenes.nth(index).scrollIntoViewIfNeeded();
      await scenes.nth(index).evaluate(image => image.decode());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  return { context, page, errors, state, postKeys };
}

async function assertStudentHome(page, expectedName, {
  orientation,
  expectRotatePrompt = false,
  minimumDashboardWidth = 0
}) {
  await page.waitForSelector('#studentDashboard:visible');
  assert.equal(await page.locator('#studentSummaryName').textContent(), expectedName);
  await page.waitForSelector('#studentRewardValues:visible');
  assert.equal(await page.locator('#studentRewardUnavailable').isHidden(), true);
  assert.equal(
    await page.locator('#studentTotalCoins').textContent(),
    expectedName === '弟弟' ? '417' : '406'
  );
  assert.equal(await page.locator('#homeQuickActions').count(), 0);
  assert.equal(await page.locator('#todayWordBtn').count(), 0);
  assert.equal(await page.locator('#mixedWordBtn').count(), 0);
  assert.deepEqual(
    await page.locator('.student-home-section > h2').allTextContents(),
    ['今日复习', '挑战测验', '今日新课']
  );
  assert.deepEqual(
    await page.locator('.student-home-card__scene').evaluateAll(images => images.map(image => image.getAttribute('src'))),
    [
      'assets/student-home/home-v4/scenes/vocabulary-adventure.webp',
      'assets/student-home/home-v4/scenes/word-challenge.webp',
      'assets/student-home/home-v4/scenes/grammar-challenge.webp',
      'assets/student-home/home-v4/scenes/classroom-practice.webp'
    ]
  );
  const layout = await page.evaluate(() => {
    const adventure = document.getElementById('vocabularyAdventurePreviewEntry').getBoundingClientRect();
    const word = document.getElementById('vocabularyAdventureChallengeEntry').getBoundingClientRect();
    const grammar = document.getElementById('grammarChallengeHomeEntry').getBoundingClientRect();
    const classroom = document.getElementById('studentClassroomPracticeEntry').getBoundingClientRect();
    const lessonGrid = document.getElementById('studentClassroomPracticeEntry').closest('.student-home-card-grid');
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      verticalOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      adventureHeight: adventure.height,
      compactHeight: word.height,
      dashboardWidth: document.getElementById('studentDashboard').getBoundingClientRect().width,
      avatarWidth: document.getElementById('studentSummaryAvatarImage').getBoundingClientRect().width,
      avatarSource: document.getElementById('studentSummaryAvatarImage').getAttribute('src'),
      sceneTransforms: [...document.querySelectorAll('.student-home-card__scene')]
        .map(image => getComputedStyle(image).transform),
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      challengeSameColumn: Math.abs(word.left - grammar.left) < 2,
      challengeSameRow: Math.abs(word.top - grammar.top) < 2,
      lessonSingleCard: lessonGrid?.children.length === 1
        && Math.abs(document.getElementById('studentClassroomPracticeEntry').closest('.student-home-card').getBoundingClientRect().width
          - lessonGrid.getBoundingClientRect().width) < 2,
      minTouch: Math.min(...[...document.querySelectorAll('#studentDashboard button, #studentFeatureNav button')]
        .map(button => button.getBoundingClientRect().height)),
      maxVisibleBottom: Math.max(
        ...[...document.querySelectorAll('#studentDashboard button, #studentFeatureNav button')]
          .map(button => button.getBoundingClientRect().bottom)
      )
    };
  });
  assert.equal(layout.overflow, false);
  if (orientation === 'landscape') {
    assert.equal(layout.verticalOverflow, false);
    assert.ok(layout.maxVisibleBottom <= layout.innerHeight);
    assert.ok(layout.avatarWidth >= 75, `iPad avatar should render at full size, got ${layout.avatarWidth}`);
    assert.ok(layout.sceneTransforms.every(transform => transform !== 'none'));
  }
  assert.match(layout.avatarSource, new RegExp(`${expectedName === '弟弟' ? 'brother' : 'sister'}-avatar\\.png$`));
  assert.ok(layout.adventureHeight > layout.compactHeight);
  assert.equal(
    orientation === 'landscape' ? layout.challengeSameColumn : layout.challengeSameRow,
    true
  );
  assert.equal(layout.lessonSingleCard, true);
  assert.ok(layout.minTouch >= 44);
  assert.equal(
    layout.innerWidth > layout.innerHeight,
    orientation === 'landscape',
    `expected explicit ${orientation} viewport, got ${layout.innerWidth}x${layout.innerHeight}`
  );
  assert.ok(layout.dashboardWidth >= minimumDashboardWidth);
  assert.equal(await page.locator('#studentHomeRotatePrompt').isVisible(), expectRotatePrompt);
}

const iphone16Portrait = {
  ...devices['iPhone 13'],
  viewport: { width: 393, height: 852 },
  screen: { width: 393, height: 852 }
};
const ipadBase = {
  userAgent: devices['iPad (gen 11)'].userAgent,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true
};
const ipadViewport = (width, height) => ({
  ...ipadBase,
  viewport: { width, height },
  screen: { width, height }
});

async function assertCachedHomeWorksOffline() {
  const offlineBrowser = await launchBrowser();
  const context = await offlineBrowser.newContext({
    ...ipadViewport(1180, 820),
    serviceWorkers: 'allow'
  });
  try {
    await context.addInitScript(mirror => {
      localStorage.setItem('wc_user', 'sister');
      localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
      localStorage.setItem('wc_sb_student_reward_v1_sister', JSON.stringify({
        version: 1,
        user: 'sister',
        totalCoins: 406,
        daily: {}
      }));
    }, mainData);
    const page = await context.newPage();
    await page.route('**/rest/v1/kv_store*', async route => {
      const url = new URL(route.request().url());
      const key = (url.searchParams.get('key') || '').replace(/^eq\./, '');
      const value = key === 'main'
        ? mainData
        : key === 'student_reward_v1_sister'
          ? { version: 3, user: 'sister', totalCoins: 406, daily: {} }
          : null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(value == null ? [] : [{ value }])
      });
    });
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      return true;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    const startedAt = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(() => document.getElementById('studentSummaryName')?.textContent === '姐姐');
    await page.waitForTimeout(1500);
    assert.ok(Date.now() - startedAt < 5000);
    assert.equal(await page.locator('#studentDashboard').isVisible(), true);
    assert.equal(await page.locator('#studentTotalCoins').textContent(), '406', 'offline reward mirror should remain visible');
    await context.setOffline(false);
  } finally {
    await context.close();
    await offlineBrowser.close();
  }
}

try {
  if (process.env.STUDENT_HOME_OFFLINE_ONLY === '1') {
    await assertCachedHomeWorksOffline();
    console.log('student home offline cache test passed');
  } else {
  const teacherDashboardOnly = process.argv.includes('--teacher-dashboard-only');
  if (!teacherDashboardOnly) {
  const sister = await openHome('sister', iphone16Portrait);
  await assertStudentHome(sister.page, '姐姐', { orientation: 'portrait' });
  await sister.page.waitForTimeout(500);
  assert.deepEqual(sister.postKeys, [], 'opening the student home must not trigger a cloud write');
  await sister.page.screenshot({ path: path.join(resultDir, 'sister-home-iphone16-portrait-393x852.png'), fullPage: true });
  assert.deepEqual(sister.errors, []);
  await sister.context.close();

  const brother = await openHome('brother', iphone16Portrait);
  await assertStudentHome(brother.page, '弟弟', { orientation: 'portrait' });
  assert.equal(await brother.page.locator('#studentSummaryAvatarImage').isVisible(), true);
  assert.match(await brother.page.locator('#studentSummaryAvatarImage').getAttribute('src'), /brother-avatar\.png$/);
  await brother.page.screenshot({ path: path.join(resultDir, 'brother-home-iphone16-portrait-393x852.png'), fullPage: true });
  assert.deepEqual(brother.errors, []);
  await brother.context.close();
  }

  const teacher = await openHome('teacher', ipadViewport(1180, 820), {
    masterVocabularyDelayMs: 3000,
    summaryModuleDelayMs: 5000
  });
  assert.equal(await teacher.page.locator('#studentDashboard').isHidden(), true);
  assert.equal(await teacher.page.locator('#studentFeatureNav').isHidden(), true);
  assert.equal(await teacher.page.locator('#teacherDashboard').isVisible(), true);
  await teacher.page.waitForSelector('#teacherActivityPanel:visible', { timeout: 1500 });
  assert.equal(
    await teacher.page.evaluate(() => typeof window.MasterVocabularyLibrary),
    'undefined',
    'coin controls must appear before an unrelated optional module finishes loading'
  );
  assert.equal(
    await teacher.page.evaluate(() => typeof window.TeacherDashboardSummaries),
    'undefined',
    'coin controls must not wait for the independent dashboard summary module'
  );
  assert.deepEqual(
    await teacher.page.locator('.teacher-home-nav .teacher-dashboard-button span').allTextContents(),
    ['进入管理', '导入', '导出词单', '新词导览']
  );
  await teacher.page.waitForSelector('#teacherDailyRoutePanel:visible');
  await teacher.page.waitForSelector('#teacherActivityPanel:visible');
  await teacher.page.waitForSelector('#teacherStudentTagPanel:visible');
  await teacher.page.waitForSelector('.teacher-dashboard-entry-card--wrong-answers:visible');
  await teacher.page.locator('.teacher-dashboard-entry-card--wrong-answers .teacher-dashboard-card__action').click();
  await teacher.page.waitForSelector('#screenWrongAnswerDirectory.active');
  assert.equal(
    await teacher.page.evaluate(() => typeof window.TeacherDashboardSummaries),
    'undefined',
    'wrong-answer navigation must not wait for the dashboard summary module'
  );
  await teacher.page.locator('#screenWrongAnswerDirectory .back-btn').click();
  await teacher.page.waitForSelector('#screenHome.active');
  await teacher.page.waitForFunction(() => (
    document.getElementById('teacherLatestPracticeSummary')?.dataset.state === 'ready'
      && document.getElementById('teacherKnowledgeSummary')?.dataset.state === 'ready'
  ), null, { timeout: 8000 });
  assert.equal(await teacher.page.locator('#teacherLatestPracticeDate').textContent(), '2026年8月22日');
  assert.equal(
    await teacher.page.locator('#teacherLatestPracticeTitle').textContent(),
    '比较级 -er、more 与 than 随堂练习'
  );
  assert.equal(
    await teacher.page.locator('#teacherKnowledgeProgressCount').textContent(),
    `2 / ${grammarTopics.length}`
  );
  assert.equal(await teacher.page.locator('#teacherKnowledgeLastTopic').textContent(), '时间介词 at / on / in');
  assert.equal(await teacher.page.locator('#teacherKnowledgeNextTopic').textContent(), '地点介词');
  const teacherStabilityBefore = await teacher.page.evaluate(() => {
    const signature = () => [...document.querySelectorAll('#teacherDashboardGrid > .teacher-dashboard-card')]
      .map(card => card.id || getComputedStyle(card).order)
      .join('|');
    window.__teacherDashboardStabilityEvents = [];
    window.__teacherDashboardStabilityObserver = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'attributes') {
          if (record.target.matches?.('body, .screen.active')
              && record.oldValue !== record.target.getAttribute('class')) {
            window.__teacherDashboardStabilityEvents.push(`class:${record.target.id || 'body'}:${record.target.className}`);
          }
          return;
        }
        [...record.addedNodes].forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE
              && (node.matches?.('#teacherRewardPanel') || node.querySelector?.('#teacherRewardPanel'))) {
            window.__teacherDashboardStabilityEvents.push('legacy-reward-panel:added');
          }
        });
        [...record.removedNodes].forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE
              && (node.matches?.('#teacherRewardPanel') || node.querySelector?.('#teacherRewardPanel'))) {
            window.__teacherDashboardStabilityEvents.push('legacy-reward-panel:removed');
          }
        });
      });
    });
    window.__teacherDashboardStabilityObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true
    });
    return signature();
  });
  await teacher.page.evaluate(async () => {
    await Promise.all(Array.from({ length: 4 }, (_, index) => (
      window.loadHome({ background: true, reason: `teacher-stability-${index}` })
    )));
  });
  await teacher.page.waitForTimeout(250);
  const teacherStabilityAfter = await teacher.page.evaluate(() => {
    window.__teacherDashboardStabilityObserver?.disconnect();
    return {
      signature: [...document.querySelectorAll('#teacherDashboardGrid > .teacher-dashboard-card')]
        .map(card => card.id || getComputedStyle(card).order)
        .join('|'),
      events: window.__teacherDashboardStabilityEvents,
      activeScreens: [...document.querySelectorAll('.screen.active')].map(screen => screen.id),
      legacyRewardPanel: Boolean(document.getElementById('teacherRewardPanel'))
    };
  });
  assert.equal(teacherStabilityAfter.signature, teacherStabilityBefore);
  assert.deepEqual(teacherStabilityAfter.events, []);
  assert.deepEqual(teacherStabilityAfter.activeScreens, ['screenHome']);
  assert.equal(teacherStabilityAfter.legacyRewardPanel, false);
  const teacherLayout = await teacher.page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    pageWidth: document.documentElement.scrollWidth,
    primaryTitle: document.querySelector('.teacher-dashboard-primary h1')?.textContent,
    primaryBottom: document.querySelector('.teacher-dashboard-primary')?.getBoundingClientRect().bottom,
    dynamicCards: ['teacherDailyRoutePanel', 'teacherActivityPanel', 'teacherStudentTagPanel'].map(id => {
      const card = document.getElementById(id);
      const rect = card.getBoundingClientRect();
      return { id, top: rect.top, marginTop: getComputedStyle(card).marginTop };
    }),
    summaryCardsFit: ['teacherLatestPracticeSummary', 'teacherKnowledgeSummary'].map(id => {
      const panel = document.getElementById(id);
      return panel.scrollWidth <= panel.clientWidth && panel.scrollHeight <= panel.clientHeight;
    }),
    cardOrders: [...document.querySelectorAll('#teacherDashboardGrid > .teacher-dashboard-card')]
      .map(card => ({ id: card.id || '', order: getComputedStyle(card).order }))
      .sort((a, b) => Number(a.order) - Number(b.order))
  }));
  assert.deepEqual(teacherLayout.viewport, [1180, 820]);
  assert.ok(teacherLayout.pageWidth <= 1180, `teacher dashboard overflowed to ${teacherLayout.pageWidth}px`);
  assert.equal(teacherLayout.primaryTitle, '单词卡管理');
  assert.deepEqual(teacherLayout.summaryCardsFit, [true, true]);
  assert.ok(
    Math.max(...teacherLayout.dynamicCards.map(card => card.top))
      - Math.min(...teacherLayout.dynamicCards.map(card => card.top)) <= 1,
    `teacher cards are not top-aligned: ${JSON.stringify(teacherLayout.dynamicCards)}`
  );
  assert.ok(
    teacherLayout.dynamicCards.every(card => card.top >= teacherLayout.primaryBottom + 13),
    `teacher cards overlap the primary module: ${JSON.stringify(teacherLayout)}`
  );
  assert.deepEqual(teacherLayout.dynamicCards.map(card => card.marginTop), ['0px', '0px', '0px']);
  assert.deepEqual(teacherLayout.cardOrders.map(item => item.id || item.order), [
    'teacherDailyRoutePanel',
    'teacherActivityPanel',
    'teacherStudentTagPanel',
    '4',
    '5',
    '6'
  ]);
  await teacher.page.locator('#teacherStudentTagSister').fill('阅读小达人');
  await teacher.page.locator('#teacherStudentTagBrother').fill('勇敢挑战者');
  await teacher.page.locator('#teacherStudentTagSave').click();
  await teacher.page.waitForTimeout(1500);
  assert.equal(
    await teacher.page.locator('#teacherStudentTagStatus').textContent(),
    '学生小标签已保存',
    `tag save errors: ${JSON.stringify(teacher.errors)}`
  );
  assert.deepEqual(teacher.state.get('student_home_tags_v1'), {
    sister: '阅读小达人',
    brother: '勇敢挑战者'
  });
  await teacher.page.screenshot({ path: path.join(resultDir, 'teacher-dashboard-ipad-air11-landscape-1180x820.png'), fullPage: false });
  assert.deepEqual(teacher.errors, []);
  await teacher.context.close();

  const teacherPhone = await openHome('teacher', iphone16Portrait);
  await teacherPhone.page.waitForFunction(() => (
    document.getElementById('teacherLatestPracticeSummary')?.dataset.state === 'ready'
      && document.getElementById('teacherKnowledgeSummary')?.dataset.state === 'ready'
  ));
  await teacherPhone.page.waitForSelector('#teacherActivityPanel:visible');
  await teacherPhone.page.waitForSelector('.teacher-dashboard-entry-card--wrong-answers:visible');
  const teacherPhoneLayout = await teacherPhone.page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    minimumSummaryActionHeight: Math.min(...[...document.querySelectorAll(
      '.teacher-dashboard-entry-card--courseware .teacher-dashboard-card__action,'
        + '.teacher-dashboard-entry-card--knowledge .teacher-dashboard-card__action,'
        + '.teacher-dashboard-entry-card--wrong-answers .teacher-dashboard-card__action'
    )]
      .map(button => button.getBoundingClientRect().height)),
    summariesFit: ['teacherLatestPracticeSummary', 'teacherKnowledgeSummary'].map(id => {
      const panel = document.getElementById(id);
      return panel.scrollWidth <= panel.clientWidth && panel.scrollHeight <= panel.clientHeight;
    })
  }));
  assert.ok(teacherPhoneLayout.pageWidth <= teacherPhoneLayout.viewportWidth);
  assert.ok(teacherPhoneLayout.minimumSummaryActionHeight >= 44);
  assert.deepEqual(teacherPhoneLayout.summariesFit, [true, true]);
  await teacherPhone.page.screenshot({
    path: path.join(resultDir, 'teacher-dashboard-iphone16-portrait-393x852.png'),
    fullPage: true
  });
  assert.deepEqual(teacherPhone.errors, []);
  await teacherPhone.context.close();

  if (teacherDashboardOnly) {
    console.log(`teacher dashboard iPad and iPhone viewport tests passed: ${resultDir}`);
  } else {
  const ipadAir = await openHome('sister', ipadViewport(1180, 820));
  await assertStudentHome(ipadAir.page, '姐姐', {
    orientation: 'landscape',
    minimumDashboardWidth: 1128
  });
  await ipadAir.page.screenshot({ path: path.join(resultDir, 'ordinary-home-ipad-air11-landscape-1180x820.png'), fullPage: true });
  assert.deepEqual(ipadAir.errors, []);
  await ipadAir.context.close();

  const ipadSafariVisible = await openHome('sister', ipadViewport(1180, 694));
  await assertStudentHome(ipadSafariVisible.page, '姐姐', {
    orientation: 'landscape',
    minimumDashboardWidth: 1128
  });
  await ipadSafariVisible.page.screenshot({
    path: path.join(resultDir, 'ipad-safari-visible-area-1180x694.png'),
    fullPage: true
  });
  await ipadSafariVisible.page.locator('#uBtnBrother').click();
  await ipadSafariVisible.page.waitForFunction(() => (
    document.getElementById('studentSummaryName')?.textContent === '弟弟'
  ));
  assert.match(
    await ipadSafariVisible.page.locator('#studentSummaryAvatarImage').getAttribute('src'),
    /brother-avatar\.png$/
  );
  assert.ok(
    await ipadSafariVisible.page.locator('#studentSummaryAvatarImage').evaluate(image => (
      image.getBoundingClientRect().width >= 75 && image.naturalWidth > 0
    ))
  );
  await ipadSafariVisible.page.screenshot({
    path: path.join(resultDir, 'ipad-safari-brother-avatar-1180x694.png'),
    fullPage: true
  });
  assert.deepEqual(ipadSafariVisible.errors, []);
  await ipadSafariVisible.context.close();

  const pendingDate = todayKey();
  const pendingReward = {
    version: 3,
    user: 'sister',
    totalCoins: 406,
    daily: {
      [pendingDate]: {
        coins: 0,
        breakthroughCoins: 3,
        sources: {},
        claims: {
          adventure: {
            status: 'pending',
            amount: 5,
            mode: 'set',
            completedAt: `${pendingDate}T08:00:00.000Z`
          }
        }
      }
    },
    transactions: []
  };
  const rewardStates = await openHome('sister', ipadViewport(1180, 820), {
    rewardRecord: pendingReward,
    saveDelayMs: 700
  });
  await rewardStates.page.waitForSelector('.student-home-card[data-reward-source="adventure"][data-reward-state="pending"]');
  assert.equal(await rewardStates.page.locator('.student-home-card[data-reward-source="adventure"] .student-home-card__stamp').isVisible(), true);
  await rewardStates.page.screenshot({ path: path.join(resultDir, 'cleared-pending-claim-ipad-air11-landscape-1180x820.png'), fullPage: true });
  const pendingPhone = await openHome('sister', iphone16Portrait, { rewardRecord: pendingReward });
  await pendingPhone.page.waitForSelector('.student-reward-chest[data-reward-source="adventure"][data-state="pending"]');
  const pendingPhoneVisual = await pendingPhone.page.locator(
    '.student-reward-chest[data-reward-source="adventure"]'
  ).evaluate(button => ({
    image: button.querySelector('img')?.getAttribute('src') || '',
    label: getComputedStyle(button, '::after').content,
    width: button.getBoundingClientRect().width,
    height: button.getBoundingClientRect().height
  }));
  assert.match(pendingPhoneVisual.image, /chest-opening\.png$/);
  assert.match(pendingPhoneVisual.label, /点击领取/);
  assert.ok(pendingPhoneVisual.width >= 44 && pendingPhoneVisual.height >= 44);
  await pendingPhone.page.screenshot({
    path: path.join(resultDir, 'pending-claim-iphone16-portrait-393x852.png'),
    fullPage: true
  });
  assert.deepEqual(pendingPhone.errors, []);
  await pendingPhone.context.close();
  const chest = rewardStates.page.locator('.student-reward-chest[data-reward-source="adventure"]');
  await chest.click();
  try {
    await rewardStates.page.waitForSelector('.student-reward-chest[data-reward-source="adventure"][data-state="opening"]', { timeout: 5000 });
  } catch (error) {
    const claimDiagnostic = await rewardStates.page.evaluate(() => {
      const button = document.querySelector('.student-reward-chest[data-reward-source="adventure"]');
      return {
        state: button?.dataset.state,
        claiming: button?.dataset.claiming,
        handlerInstalled: button?.dataset.handlerInstalled,
        disabled: button?.disabled,
        notice: document.getElementById('studentHomeNotice')?.textContent || ''
      };
    });
    throw new Error(`claim animation did not enter opening state: ${JSON.stringify(claimDiagnostic)}`, { cause: error });
  }
  await rewardStates.page.screenshot({ path: path.join(resultDir, 'claiming-ipad-air11-landscape-1180x820.png'), fullPage: true });
  await rewardStates.page.waitForSelector('.student-reward-chest[data-reward-source="adventure"][data-state="claimed"]');
  assert.equal(await rewardStates.page.locator('#studentTotalCoins').textContent(), '411');
  await rewardStates.page.screenshot({ path: path.join(resultDir, 'claimed-ipad-air11-landscape-1180x820.png'), fullPage: true });
  await rewardStates.page.reload({ waitUntil: 'domcontentloaded' });
  await rewardStates.page.waitForSelector('.student-reward-chest[data-reward-source="adventure"][data-state="claimed"]');
  assert.equal(await rewardStates.page.locator('#studentTotalCoins').textContent(), '411');
  assert.equal(rewardStates.state.get('student_reward_v1_sister').transactions.length, 1);
  assert.deepEqual(rewardStates.errors, []);
  await rewardStates.context.close();

  await assertCachedHomeWorksOffline();

  console.log(`student home dashboard viewport tests passed: ${resultDir}`);
  }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
