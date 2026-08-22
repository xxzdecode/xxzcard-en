import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const bank = require('../grammar-challenge/data/question-bank.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const resultDir = path.join(root, '.codex-backups', 'grammar-adaptive-visual-qa');
const questions = bank.items.slice(0, 15).map(item => ({ ...item, id: item.bankItemId }));

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8']
]);

const harness = `<!doctype html><meta charset="utf-8"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;overflow:hidden}</style>
<iframe id="challenge" src="/grammar-challenge/index.html?adaptive=1&embedded=1"></iframe>`;
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  if (pathname === '/adaptive-harness.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(harness);
    return;
  }
  const relative = path.normalize(pathname).replace(/^[/\\]+/, '');
  const filePath = path.join(root, relative);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
  response.end(fs.readFileSync(filePath));
});

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!/Executable doesn't exist|spawn EPERM/.test(String(error?.message || error))) throw error;
    return chromium.launch({ channel: 'msedge' });
  }
}

async function checkViewport(browser, baseUrl, viewport, filename) {
  const context = await browser.newContext({ viewport, screen: viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  try {
    await page.addInitScript(config => {
      let cursor = 0;
      window.getAdaptiveGrammarFrameConfig = () => structuredClone({
        ...config,
        adaptiveSession: { ...config.adaptiveSession, cursor }
      });
      window.recordAdaptiveGrammarAnswer = async () => {
        cursor += 1;
        return {
          session: { cursor, items: config.questions.map((_, index) => ({ firstTryCorrect: index < cursor ? true : null })) },
          replacement: null,
          questions: structuredClone(config.questions)
        };
      };
    }, {
      version: 1,
      title: '15题综合语法挑战',
      interactionMode: 'challenge-locked',
      completionTitle: '今日语法挑战完成',
      completion: '最近课程与已学知识点都完成了复习。',
      feedbackDelayMs: 10,
      knowledge: ['最近课程 8 题', '历史知识 7 题', '错题稍后再练'],
      round: { size: 15, shuffle: false },
      adaptiveSession: { enabled: true, cursor: 0, results: Array(15).fill(null) },
      questions
    });
    await page.goto(`${baseUrl}/adaptive-harness.html`, { waitUntil: 'commit' });
    await page.waitForFunction(() => /grammar-challenge\/index\.html/.test(document.getElementById('challenge')?.contentWindow?.location?.pathname || ''));
    const frame = page.frames().find(candidate => /grammar-challenge\/index\.html/.test(candidate.url()));
    assert.ok(frame, 'adaptive grammar frame should open');
    await frame.waitForFunction(() => window.__LESSON_PREP_QA__?.state?.().total === 15);
    const layout = await frame.evaluate(() => {
      const options = [...document.querySelectorAll('.option')].map(node => node.getBoundingClientRect());
      return {
        width: innerWidth,
        height: innerHeight,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        progress: document.getElementById('progressText')?.textContent || '',
        total: window.__LESSON_PREP_QA__.state().total,
        minTapHeight: Math.min(...options.map(rect => rect.height)),
        optionLefts: options.map(rect => Math.round(rect.left))
      };
    });
    assert.deepEqual([layout.width, layout.height], [viewport.width, viewport.height]);
    assert.equal(layout.overflowX, false);
    assert.equal(layout.total, 15);
    assert.match(layout.progress, /1\s*\/\s*15/);
    assert.ok(layout.minTapHeight >= 44, `option tap height was ${layout.minTapHeight}`);
    if (viewport.width === 393) assert.equal(new Set(layout.optionLefts).size, 1, 'phone options should use one column');

    await frame.evaluate(() => window.__LESSON_PREP_QA__.selectWrong());
    await frame.locator('#nextButton').click();
    await frame.waitForSelector('#feedback.wrong');
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal((await frame.evaluate(() => window.__LESSON_PREP_QA__.state().index)), 0, '答错后应留在当前题');
    assert.equal(await frame.locator('#nextButton').isEnabled(), true);
    await frame.locator('#nextButton').click();
    await frame.waitForFunction(() => window.__LESSON_PREP_QA__?.state?.().index === 1);
    assert.match(await frame.locator('#progressText').textContent(), /2\s*\/\s*15/);
    await frame.evaluate(() => window.__LESSON_PREP_QA__.solveCurrent());
    await frame.locator('#nextButton').click();
    await frame.waitForFunction(() => window.__LESSON_PREP_QA__?.state?.().index === 2);
    await page.screenshot({ path: path.join(resultDir, filename), fullPage: true });
  } finally {
    await context.close();
  }
}

fs.mkdirSync(resultDir, { recursive: true });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
try {
  await checkViewport(browser, baseUrl, { width: 1180, height: 820 }, 'grammar-adaptive-ipad-air11-1180x820.png');
  await checkViewport(browser, baseUrl, { width: 393, height: 852 }, 'grammar-adaptive-iphone16-393x852.png');
  console.log(`grammar adaptive iPad and iPhone viewport tests passed: ${resultDir}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
