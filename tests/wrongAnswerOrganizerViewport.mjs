import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const edgeExecutable = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const resultDir = path.join(root, '.codex-backups', 'wrong-answer-organizer-visual-qa');
fs.mkdirSync(resultDir, { recursive: true });

const realDailyMap = JSON.parse(fs.readFileSync(path.join(
  root,
  'tests',
  'fixtures',
  'daily-2026-08-06-brother-sentence-parts-01-question-map.json'
), 'utf8'));

const catalog = {
  schema_version: 1,
  latest_paper_id: 'paper-daily-2026-08-06-brother-sentence-parts-01-brother',
  assessments: [
    realDailyMap,
    {
      assessment_id: 'weekly-2026-W31',
      assessment_type: 'weekly',
      assessment_date: '2026-08-01',
      title: '基础语法周测',
      papers: [{
        paper_id: 'weekly-2026-W31:sister',
        student_id: 'sister',
        map_revision: 'sha256:weekly-v1',
        map_hash: 'sha256:weekly-map-v1',
        sections: [{
          section_id: 'section-1',
          display_label: '一、选择',
          items: [{ question_id: 'S01', display_label: '第 1 小问', kp_ids: ['articles'] }]
        }]
      }]
    }
  ]
};

const mainData = { pin: '1234', batches: [], mixedAssignments: [], taskAssignments: [] };
const state = new Map([
  ['main', structuredClone(mainData)],
  ['assessment_catalog_v1', structuredClone(catalog)],
  ['assessment_grading_v1_sister', { schema_version: 1, student_id: 'sister', records: {} }],
  ['assessment_grading_v1_brother', { schema_version: 1, student_id: 'brother', records: {} }]
]);
const posts = [];

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

async function handleStorageRoute(route) {
  const request = route.request();
  if (request.method() === 'POST') {
    const payload = request.postDataJSON();
    posts.push(structuredClone(payload));
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
}

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: edgeExecutable });
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, serviceWorkers: 'block' });
  await context.addInitScript(mirror => {
    localStorage.setItem('wc_user', 'teacher');
    localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
  }, mainData);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Service Worker')) errors.push(message.text());
  });
  await page.route('**/rest/v1/kv_store*', handleStorageRoute);

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.classList.contains('is-teacher'));
  await page.waitForFunction(() => {
    const entry = document.getElementById('teacherLatestAssessmentEntry');
    return entry && !entry.disabled && entry.getAttribute('aria-busy') === 'false';
  });
  await page.waitForFunction(() => document.querySelectorAll('#teacherDashboardGrid > .teacher-dashboard-card').length === 6);
  assert.equal(await page.locator('#teacherLatestAssessmentTitle').textContent(), '26/08/06_Gavin日测1');
  assert.equal(await page.locator('#teacherLatestAssessmentStatus').textContent(), '待批改 · 共 10 小问');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(resultDir, 'home-1180x820.png'), fullPage: false });

  await page.locator('#teacherLatestAssessmentEntry').click();
  await page.waitForSelector('#screenWrongAnswerDetail.active');
  assert.equal(await page.locator('.wrong-answer-section').count(), 3);
  assert.deepEqual(await page.locator('.wrong-answer-section').evaluateAll(nodes => nodes.map(node => node.open)), [true, true, true]);
  const detailText = await page.locator('#screenWrongAnswerDetail').innerText();
  assert.doesNotMatch(detailText, /\d+\s*分|%|百分比/);
  await page.locator('input[value="daily-2026-08-06-brother-sentence-parts-01.s1.q2"]').check();
  await page.locator('input[value="daily-2026-08-06-brother-sentence-parts-01.s3.q2"]').check();
  await page.locator('#wrongAnswerTeacherNote').fill('大题三第2题：没有认出 after school 是补充信息。');
  assert.equal(await page.locator('#wrongAnswerSelectedCount').textContent(), '2');
  await page.locator('#wrongAnswerSaveButton').click();
  await page.waitForFunction(() => document.getElementById('wrongAnswerSaveStatus')?.textContent === '已保存：错 2 / 10 小问');

  const savedPost = posts.find(post => post.key === 'assessment_grading_v1_brother');
  assert.ok(savedPost, 'grading save POST was not sent');
  const saved = savedPost.value.records['paper-daily-2026-08-06-brother-sentence-parts-01-brother'];
  assert.deepEqual(saved.wrong_question_ids, [
    'daily-2026-08-06-brother-sentence-parts-01.s1.q2',
    'daily-2026-08-06-brother-sentence-parts-01.s3.q2'
  ]);
  assert.deepEqual(saved.wrong_items, [
    { question_id: 'daily-2026-08-06-brother-sentence-parts-01.s1.q2', kp_ids: ['sentence-parts'] },
    { question_id: 'daily-2026-08-06-brother-sentence-parts-01.s3.q2', kp_ids: ['sentence-parts'] }
  ]);
  assert.equal(saved.map_revision, '1');
  assert.equal(saved.map_hash, 'sha256:19c6715e294085fb347ef49ac93092617ec9a7e65eda2e73eb0a338ddc04094c');
  assert.equal(saved.teacher_note, '大题三第2题：没有认出 after school 是补充信息。');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(resultDir, 'detail-1180x820.png'), fullPage: false });

  await page.locator('#screenWrongAnswerDetail .back-btn').click();
  await page.waitForSelector('#screenWrongAnswerDirectory.active');
  assert.equal(await page.locator('#wrongAnswerDirectoryStatus').textContent(), '按学生查看每天、每张卷子的批改记录。');
  assert.equal(await page.locator('.wrong-answer-roadmap-card').count(), 2);
  assert.deepEqual(
    await page.locator('.wrong-answer-roadmap-card h3').allTextContents(),
    ['整理错题集', '分析薄弱知识点']
  );
  assert.equal(
    await page.locator('[data-paper-id="paper-daily-2026-08-06-brother-sentence-parts-01-brother"] .wrong-answer-paper-row__count').textContent(),
    '错 2 / 10 小问'
  );
  assert.equal(
    await page.locator('[data-paper-id="paper-daily-2026-08-06-brother-sentence-parts-01-brother"] small').textContent(),
    '练习范围：句子骨架：主语、谓语、宾语'
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(resultDir, 'directory-1180x820.png'), fullPage: false });

  await page.locator('#screenWrongAnswerDirectory .back-btn').click();
  await page.waitForSelector('#screenHome.active');
  await page.locator('.teacher-dashboard-entry-card--wrong-answers .teacher-dashboard-card__action').click();
  await page.waitForSelector('#screenWrongAnswerDirectory.active');
  assert.equal(await page.locator('#wrongAnswerDirectoryStatus').textContent(), '按学生查看每天、每张卷子的批改记录。');
  assert.deepEqual(errors, []);
  await context.close();

  const phoneContext = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
  await phoneContext.addInitScript(mirror => {
    localStorage.setItem('wc_user', 'teacher');
    localStorage.setItem('wc_sb_main', JSON.stringify(mirror));
  }, mainData);
  const phonePage = await phoneContext.newPage();
  await phonePage.route('**/rest/v1/kv_store*', handleStorageRoute);
  await phonePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await phonePage.waitForFunction(() => document.body.classList.contains('is-teacher'));
  await phonePage.locator('.teacher-dashboard-entry-card--wrong-answers .teacher-dashboard-card__action').click();
  await phonePage.waitForSelector('#screenWrongAnswerDirectory.active');
  assert.equal(await phonePage.locator('.wrong-answer-roadmap-card').count(), 2);
  assert.ok(await phonePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(
    await phonePage.locator('.wrong-answer-roadmap-card').evaluateAll(cards => cards.map(card => ({
      withinViewport: card.getBoundingClientRect().left >= 0 && card.getBoundingClientRect().right <= innerWidth,
      textFits: card.scrollWidth <= card.clientWidth && card.scrollHeight <= card.clientHeight
    }))),
    [
      { withinViewport: true, textFits: true },
      { withinViewport: true, textFits: true }
    ]
  );
  await phonePage.screenshot({ path: path.join(resultDir, 'directory-393x852.png'), fullPage: true });
  await phonePage.locator('#screenWrongAnswerDirectory [data-paper-id="paper-daily-2026-08-06-brother-sentence-parts-01-brother"]').click();
  await phonePage.waitForSelector('#screenWrongAnswerDetail.active');
  assert.ok(await phonePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(
    await phonePage.locator('#wrongAnswerTeacherNote, #wrongAnswerSaveButton').evaluateAll(nodes => nodes.map(node => ({
      withinViewport: node.getBoundingClientRect().left >= 0 && node.getBoundingClientRect().right <= innerWidth,
      touchHeight: node.getBoundingClientRect().height >= 44
    }))),
    [
      { withinViewport: true, touchHeight: true },
      { withinViewport: true, touchHeight: true }
    ]
  );
  await phonePage.screenshot({ path: path.join(resultDir, 'detail-393x852.png'), fullPage: true });
  await phoneContext.close();
  console.log(`wrong answer organizer iPad and iPhone viewport tests passed: ${resultDir}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
