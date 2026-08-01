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
    appendChild(child) {
      this.children.push(child);
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

function createHarness() {
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
    setTimeout,
    clearTimeout,
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

test('service worker keeps lazy code on runtime network-first caching', () => {
  assert.match(serviceWorkerSource, /xxzcard-app-shell-v49/);
  assert.match(serviceWorkerSource, /xxzcard-runtime-v49/);
  assert.doesNotMatch(serviceWorkerSource, /vocabularyAdventurePlayer/);
  assert.match(serviceWorkerSource, /staticNetworkFirst/);
});
