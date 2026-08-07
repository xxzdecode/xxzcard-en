const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'lazyFeatures.js'),
  'utf8'
);
const serviceWorkerSource = fs.readFileSync(
  path.join(__dirname, '..', 'service-worker.js'),
  'utf8'
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createElement(tagName = 'div') {
  const listeners = new Map();
  const attributes = new Map();
  return {
    tagName: String(tagName).toUpperCase(),
    dataset: {},
    style: {},
    children: [],
    hidden: false,
    textContent: '',
    innerHTML: '',
    onload: null,
    onerror: null,
    removed: false,
    get firstChild() {
      return this.children[0] || null;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      return child;
    },
    replaceChildren(...children) {
      this.children = [...children];
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    click() {
      const listener = listeners.get('click');
      return listener ? listener() : undefined;
    },
    querySelector() {
      return null;
    }
  };
}

function createHarness(options = {}) {
  const scripts = [];
  const elements = new Map([
    ['vocabularyAdventurePreviewEntry', createElement('button')],
    ['vocabularyAdventureHomeStatus', createElement('span')],
    ['studentHomeNotice', createElement('div')]
  ]);
  elements.get('studentHomeNotice').hidden = true;

  const document = {
    readyState: 'complete',
    head: {
      appendChild(script) {
        if (typeof options.appendScript === 'function') {
          return options.appendScript(script, scripts);
        }
        scripts.push(script);
        return script;
      }
    },
    body: createElement('body'),
    createElement,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    addEventListener() {}
  };

  const context = {
    document,
    console: { error() {}, warn() {} },
    alert() {},
    Blob: function Blob() {},
    URL: {
      createObjectURL() { return 'blob:test'; },
      revokeObjectURL() {}
    },
    requestIdleCallback() { return 1; },
    setTimeout: options.setTimeout || setTimeout,
    clearTimeout: options.clearTimeout || clearTimeout,
    loadHome() { return Promise.resolve(); }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/lazyFeatures.js' });
  return { context, scripts, elements };
}

test('loadFeatureScript shares one in-flight script request', async () => {
  const { context, scripts } = createHarness();
  const first = context.loadFeatureScript('js/example.js');
  const second = context.loadFeatureScript('js/example.js');

  assert.strictEqual(first, second);
  assert.equal(scripts.length, 1);

  scripts[0].onload();
  await Promise.all([first, second]);
  await context.loadFeatureScript('js/example.js');
  assert.equal(scripts.length, 1);
});

test('loadFeatureScript removes failed state so a retry can succeed', async () => {
  const { context, scripts } = createHarness();
  const first = context.loadFeatureScript('js/retry.js');
  scripts[0].onerror();
  await assert.rejects(first, /功能资源加载失败/);
  assert.equal(scripts[0].removed, true);

  const retry = context.loadFeatureScript('js/retry.js');
  assert.equal(scripts.length, 2);
  scripts[1].onload();
  await retry;
});

test('loadFeatureScript retries after appendChild throws synchronously', async () => {
  let appendAttempts = 0;
  const { context, scripts } = createHarness({
    appendScript(script, insertedScripts) {
      appendAttempts += 1;
      if (appendAttempts === 1) throw new Error('head unavailable');
      insertedScripts.push(script);
      return script;
    }
  });

  const first = context.loadFeatureScript('js/append-retry.js');
  await assert.rejects(first, /功能资源加载失败|head unavailable/);
  assert.equal(appendAttempts, 1);
  assert.equal(scripts.length, 0);

  const retry = context.loadFeatureScript('js/append-retry.js');
  assert.equal(appendAttempts, 2);
  assert.equal(scripts.length, 1);
  scripts[0].onload();
  await retry;
});

test('loadFeatureScript retries after a loading timeout', async () => {
  const timers = [];
  const clearedTimers = [];
  const { context, scripts } = createHarness({
    setTimeout(callback, delay) {
      const id = timers.length + 1;
      timers.push({ id, callback, delay });
      return id;
    },
    clearTimeout(id) {
      clearedTimers.push(id);
    }
  });

  const first = context.loadFeatureScript('js/timeout-retry.js');
  assert.equal(scripts.length, 1);
  assert.equal(timers[0].delay, 10000);
  const rejected = assert.rejects(first, /功能资源加载超时/);
  timers[0].callback();
  await rejected;
  assert.equal(scripts[0].removed, true);
  assert.deepEqual(clearedTimers, [1]);

  const retry = context.loadFeatureScript('js/timeout-retry.js');
  assert.equal(scripts.length, 2);
  scripts[1].onload();
  await retry;
  assert.deepEqual(clearedTimers, [1, 2]);
});

test('new-word guide real lazy entry loads task 016 once and resolves to the workbook handler', async () => {
  const { context, scripts } = createHarness();
  let opened = 0;
  const launch = context.openVocabularyReviewList();
  const expected = [
    'js/vocabularyReviewData.js',
    'js/vocabularyReview.js',
    'js/vocabularyLesson016.js',
    'js/vocabularyLessonCategories.js'
  ];

  for (let index = 0; index < expected.length; index += 1) {
    while (scripts.length <= index) await Promise.resolve();
    assert.equal(scripts[index].src, expected[index]);
    if (scripts[index].src === 'js/vocabularyReview.js') {
      context.openVocabularyReviewList = async () => { opened += 1; return 'workbook-route'; };
    }
    scripts[index].onload();
  }

  assert.equal(await launch, 'workbook-route');
  assert.equal(opened, 1);
  assert.equal(scripts.filter(script => script.src === 'js/vocabularyLesson016.js').length, 1);
});

test('adventure entry is single-flight and exposes loading feedback', async () => {
  const { context, elements } = createHarness();
  const group = deferred();
  let opened = 0;
  context.loadFeatureGroup = () => group.promise;

  const first = context.openVocabularyAdventure();
  const second = context.openVocabularyAdventure();
  assert.strictEqual(first, second);
  assert.equal(elements.get('vocabularyAdventurePreviewEntry').getAttribute('aria-busy'), 'true');
  assert.equal(elements.get('vocabularyAdventureHomeStatus').textContent, '正在打开…');
  assert.equal(elements.get('studentHomeNotice').hidden, false);

  context.openVocabularyAdventure = async () => { opened += 1; };
  group.resolve();
  await Promise.all([first, second]);

  assert.equal(opened, 1);
  assert.equal(elements.get('studentHomeNotice').hidden, true);
  assert.equal(elements.get('vocabularyAdventurePreviewEntry').getAttribute('aria-busy'), null);
});

test('adventure entry loading feedback works without replaceChildren', async () => {
  const { context, elements } = createHarness();
  const notice = elements.get('studentHomeNotice');
  delete notice.replaceChildren;
  const group = deferred();
  context.loadFeatureGroup = () => group.promise;

  const first = context.openVocabularyAdventure();
  assert.equal(notice.hidden, false);
  assert.equal(notice.children.length, 1);
  assert.equal(notice.children[0].textContent, '正在打开词汇探险…');

  context.openVocabularyAdventure = async () => {};
  group.resolve();
  await first;
  assert.equal(notice.hidden, true);
  assert.equal(notice.children.length, 0);
});

test('adventure load failure shows an in-page retry that can recover', async () => {
  const { context, elements } = createHarness();
  const firstGroup = deferred();
  context.loadFeatureGroup = () => firstGroup.promise;

  const first = context.openVocabularyAdventure();
  firstGroup.reject(new Error('offline'));
  assert.equal(await first, null);

  const notice = elements.get('studentHomeNotice');
  assert.equal(elements.get('vocabularyAdventureHomeStatus').textContent, '点击重试');
  assert.equal(notice.hidden, false);
  assert.equal(notice.children.length, 2);
  assert.equal(notice.children[1].textContent, '重新打开');

  const retryGroup = deferred();
  let opened = 0;
  context.loadFeatureGroup = () => retryGroup.promise;
  const retry = notice.children[1].click();
  context.openVocabularyAdventure = async () => { opened += 1; };
  retryGroup.resolve();
  await retry;

  assert.equal(opened, 1);
  assert.equal(notice.hidden, true);
});

test('service worker precaches the complete adventure runtime', () => {
  assert.match(serviceWorkerSource, /xxzcard-app-shell-v69/);
  assert.match(serviceWorkerSource, /xxzcard-runtime-v69/);
  assert.match(serviceWorkerSource, /\.\/js\/vocabularyAdventurePlayer\.js/);
  assert.match(serviceWorkerSource, /\.\/js\/vocabularyAdventureChallenge\.js/);
  assert.match(serviceWorkerSource, /\.\/js\/vocabularyPracticeUI\.js/);
  assert.match(serviceWorkerSource, /\.\/js\/vocabularyQuestionTypesRepeatBootstrap\.js/);
  assert.match(serviceWorkerSource, /staleWhileRevalidate/);
});
