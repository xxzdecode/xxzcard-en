const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const stateSource = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const bootStyles = fs.readFileSync(path.join(root, 'styles-home-nav.css'), 'utf8');

function createClassList() {
  const values = new Set();
  return {
    add(...items) { items.forEach(item => values.add(item)); },
    remove(...items) { items.forEach(item => values.delete(item)); },
    toggle(item, enabled) {
      if (enabled) values.add(item);
      else values.delete(item);
      return enabled;
    },
    contains(item) { return values.has(item); },
    values
  };
}

function createHarness(user, initialAppData = null) {
  const htmlClassList = createClassList();
  const bodyClassList = createClassList();
  const elements = new Map([
    ['studentSummaryName', { textContent: '姐姐' }],
    ['studentSummaryAvatarImage', { src: 'assets/student-home/card6/ui/profile/sister-avatar.png' }]
  ]);
  const timers = [];
  const frames = [];
  const listeners = new Map();

  const context = {
    localStorage: {
      getItem(key) { return key === 'wc_user' ? user : null; }
    },
    document: {
      documentElement: { classList: htmlClassList, dataset: {} },
      body: { classList: bodyClassList },
      getElementById(id) { return elements.get(id) || null; }
    },
    setTimeout(callback, delay) {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timers.length;
    },
    clearTimeout(id) {
      if (timers[id - 1]) timers[id - 1].cleared = true;
    },
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    addEventListener(name, callback) { listeners.set(name, callback); },
    console
  };
  if (initialAppData) context.appData = initialAppData;
  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(stateSource, context, { filename: 'js/state.js' });

  return { context, htmlClassList, bodyClassList, elements, timers, frames, listeners };
}

function runPoll(harness) {
  const poll = harness.timers.find(timer => timer.delay === 40 && !timer.cleared);
  assert.ok(poll, 'boot guard should poll for initial app data');
  poll.callback();
  while (harness.frames.length) harness.frames.shift()();
}

test('boot CSS hides fallback home until the app is ready', () => {
  assert.match(bootStyles, /html:not\(\.app-ready\) body\s*\{[^}]*opacity:\s*0/s);
  assert.match(bootStyles, /正在准备今天的学习/);
  assert.match(bootStyles, /html\.app-ready body\s*\{[^}]*opacity:\s*1/s);
});

test('brother identity is resolved before the fallback home is revealed', () => {
  const harness = createHarness('brother');
  assert.equal(harness.htmlClassList.contains('app-booting'), true);
  assert.equal(harness.htmlClassList.contains('app-ready'), false);
  assert.equal(harness.bodyClassList.contains('is-teacher'), false);
  assert.equal(harness.elements.get('studentSummaryName').textContent, '弟弟');
  assert.match(harness.elements.get('studentSummaryAvatarImage').src, /brother-avatar\.png$/);
  assert.ok(harness.timers.some(timer => timer.delay === 8000), 'boot guard needs a fail-open timeout');

  harness.context.appData = { batches: [], pin: null };
  runPoll(harness);

  assert.equal(harness.htmlClassList.contains('app-booting'), false);
  assert.equal(harness.htmlClassList.contains('app-ready'), true);
});

test('teacher mode is applied before first reveal', () => {
  const harness = createHarness('teacher', { batches: [], pin: null });
  assert.equal(harness.bodyClassList.contains('is-teacher'), true);
  assert.equal(harness.htmlClassList.contains('app-ready'), false);

  while (harness.frames.length) harness.frames.shift()();

  assert.equal(harness.htmlClassList.contains('app-ready'), true);
  assert.equal(harness.htmlClassList.contains('app-booting'), false);
});
