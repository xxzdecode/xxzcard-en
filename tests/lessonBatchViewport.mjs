import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const pages = [
  ['grammar-challenge/practices/2026-08-18.html', 10],
  ['courseware/26.08.18｜原因与结果 why-because-so 随堂练习.html', 20],
  ['grammar-challenge/practices/2026-08-19.html', 10],
  ['courseware/26.08.19｜although 让步与转折随堂练习.html', 20],
  ['grammar-challenge/practices/2026-08-20.html', 10],
  ['courseware/26.08.20｜代词系统与基础反身代词随堂练习.html', 20],
  ['grammar-challenge/practices/2026-08-21.html', 10],
  ['courseware/26.08.21｜形容词与感官系动词随堂练习.html', 20],
  ['grammar-challenge/practices/2026-08-22.html', 10],
  ['courseware/26.08.22｜比较级 -er、more 与 than 随堂练习.html', 20]
];

const viewports = [
  ['iPad Air 11 landscape', { width: 1180, height: 820 }],
  ['iPhone 16 portrait', { width: 393, height: 852 }]
];

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/favicon.ico') {
    response.writeHead(204).end();
    return;
  }
  const relative = decodeURIComponent(url.pathname).replace(/^[/\\]+/, '');
  const filePath = path.resolve(root, relative || 'index.html');
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', mime.get(path.extname(filePath)) || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
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

async function finishRound(page, expectedCount) {
  const initial = await page.evaluate(() => window.__LESSON_PREP_QA__.state());
  assert.equal(initial.total, expectedCount);
  assert.equal(new Set(initial.order).size, expectedCount);

  for (let step = 0; step < expectedCount; step += 1) {
    const before = await page.evaluate(() => window.__LESSON_PREP_QA__.state());
    await page.evaluate(() => window.__LESSON_PREP_QA__.solveCurrent());
    if (before.mode === 'practice') {
      await page.locator('#checkButton').click();
      await page.waitForFunction(() => !document.getElementById('nextButton').disabled);
    }
    await page.locator('#nextButton').click();
    await page.waitForFunction(previous => {
      const state = window.__LESSON_PREP_QA__.state();
      return state.complete || state.index !== previous;
    }, before.index);
  }

  const final = await page.evaluate(() => window.__LESSON_PREP_QA__.state());
  assert.equal(final.complete, true);
  await assert.doesNotReject(() => page.locator('#completionDialog[open]').waitFor({ state: 'visible' }));
}

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await launchBrowser();

try {
  for (const [viewportName, viewport] of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    await page.addInitScript(() => {
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => nativeSetTimeout(callback, Math.min(Number(delay) || 0, 20), ...args);
    });

    try {
      for (const [pagePath, questionCount] of pages) {
        errors.length = 0;
        await page.goto(`${baseUrl}/${encodeURI(pagePath)}`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__LESSON_PREP_QA__?.state));
        const layout = await page.evaluate(() => ({
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          optionCount: document.querySelectorAll('.option').length,
          nextVisible: Boolean(document.getElementById('nextButton')?.getClientRects().length)
        }));
        assert.ok(layout.documentWidth <= layout.viewportWidth + 1, `${viewportName} ${pagePath} document overflow`);
        assert.ok(layout.bodyWidth <= layout.viewportWidth + 1, `${viewportName} ${pagePath} body overflow`);
        assert.ok(layout.optionCount > 0, `${viewportName} ${pagePath} has no answer options`);
        assert.equal(layout.nextVisible, true, `${viewportName} ${pagePath} next button hidden`);

        if (viewport.width === 393) {
          const touchTargets = await page.locator('.option:visible, .question-actions button:visible').evaluateAll(nodes => (
            nodes.map(node => ({ text: node.textContent.trim(), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))
          ));
          for (const target of touchTargets) {
            assert.ok(target.width >= 44 && target.height >= 44, `${pagePath} touch target too small: ${JSON.stringify(target)}`);
          }
        }

        await finishRound(page, questionCount);
        assert.deepEqual(errors, [], `${viewportName} ${pagePath} browser errors`);
      }
    } finally {
      await page.close();
      await context.close();
    }
  }
  console.log('five-lesson HTML viewport and full-round interaction tests passed (10 pages x 2 viewports)');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
