const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class FakeElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.onclick = null;
    this.attributes = {};
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach(name => this.classList.values.add(name)),
      remove: (...names) => names.forEach(name => this.classList.values.delete(name)),
      contains: name => this.classList.values.has(name)
    };
  }
  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  insertBefore(node) {
    return this.appendChild(node);
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  addEventListener(name, handler) {
    this[`on${name}`] = handler;
  }
  querySelector(selector) {
    if (selector === '.vav2-fox') {
      return this.children.find(child => child.className === 'vav2-fox') || null;
    }
    if (selector === '.vav2-fox-bubble') return null;
    if (selector === '.vocabulary-adventure-question-label') return nodes.label;
    if (selector === '.vocabulary-adventure-question') return null;
    if (selector.includes('.vocabulary-adventure-result')) return null;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === '.vav2-fox-bubble') return [];
    if (selector.includes('.vocabulary-adventure-hint:not([hidden])')) {
      return nodes.hint.hidden ? [] : [nodes.hint];
    }
    if (selector === '.vocabulary-adventure-summary-grid > div') return [];
    return [];
  }
}

const nodes = {
  screen: new FakeElement('section', 'screenVocabularyAdventure'),
  title: new FakeElement('div', 'vocabularyAdventureStageTitle'),
  progress: new FakeElement('div', 'vocabularyAdventureTotalProgress'),
  feedback: new FakeElement('div', 'vocabularyAdventureFeedbackText'),
  action: new FakeElement('button', 'vocabularyAdventureAction'),
  body: new FakeElement('div', 'vocabularyAdventureBody'),
  label: new FakeElement('div'),
  hint: new FakeElement('div')
};
nodes.progress.textContent = '今日计划 10 / 30';
nodes.title.textContent = '第一站 · 摸底';
nodes.body.dataset.mode = 'question';
nodes.label.textContent = '听一听，选择正确单词';
nodes.hint.innerHTML = '<strong>首字母：A…</strong>';
nodes.hint.hidden = false;

const byId = new Map([
  [nodes.screen.id, nodes.screen],
  [nodes.title.id, nodes.title],
  [nodes.progress.id, nodes.progress],
  [nodes.feedback.id, nodes.feedback],
  [nodes.action.id, nodes.action],
  [nodes.body.id, nodes.body]
]);

const head = new FakeElement('head');
const document = {
  readyState: 'complete',
  head,
  getElementById(id) {
    if (id === 'vav2SafeOverrides') {
      return head.children.find(child => child.id === id) || null;
    }
    return byId.get(id) || null;
  },
  querySelector(selector) {
    if (selector.startsWith('link[data-vav2-styles]')) {
      return head.children.find(child => child.tagName === 'LINK' && child.dataset.vav2Styles === '1') || null;
    }
    return null;
  },
  createElement(tagName) {
    return new FakeElement(tagName);
  },
  addEventListener() {}
};

let nextCalls = 0;
let answerCalls = 0;
let unrelatedCalls = 0;
const windowObject = {
  setTimeout,
  clearTimeout,
  Promise,
  nextVocabularyAdventure() {
    nextCalls += 1;
  },
  answerVocabularyAdventure() {
    answerCalls += 1;
    return Promise.resolve('saved');
  },
  speakVocabularyAdventureCurrent() {},
  closeVocabularyAdventure() {},
  otherClick() {
    unrelatedCalls += 1;
  }
};

const context = {
  window: windowObject,
  document,
  console,
  Promise,
  setTimeout,
  clearTimeout
};
vm.createContext(context);

const scriptPath = require('path').join(__dirname, '..', 'js', 'vocabularyAdventureVisualV2.js');
const source = fs.readFileSync(scriptPath, 'utf8');
assert(!source.includes('MutationObserver'), 'must not install a MutationObserver');
assert(!source.includes('setInterval'), 'must not install a polling interval');
vm.runInContext(source, context, { filename: scriptPath });

(async () => {
  assert.strictEqual(windowObject.__VOCABULARY_ADVENTURE_VISUAL_V2_SAFE__, true);
  assert.strictEqual(nodes.title.textContent, '词汇探险');
  assert(!nodes.hint.innerHTML.includes('首字母'), 'hint must not reveal the first letter');
  assert(nodes.hint.innerHTML.includes('开头和结尾的声音'), 'audio hint should remain useful');
  assert.strictEqual(typeof windowObject.answerVocabularyAdventure, 'function');
  assert.strictEqual(typeof windowObject.nextVocabularyAdventure, 'function');

  await windowObject.answerVocabularyAdventure(0);
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.strictEqual(answerCalls, 1, 'wrapped answer must call original exactly once');

  const nextPromise = windowObject.nextVocabularyAdventure();
  assert.strictEqual(nextCalls, 0, 'boundary transition must run before advancing');
  await nextPromise;
  assert.strictEqual(nextCalls, 1, 'next must advance exactly once after the flash');
  assert.strictEqual(nodes.screen.children.filter(node => node.className === 'vav2-transition').length, 0);

  windowObject.otherClick();
  assert.strictEqual(unrelatedCalls, 1, 'unrelated page clicks must remain untouched');

  const stressStarted = Date.now();
  await Promise.all(Array.from({ length: 200 }, () => windowObject.answerVocabularyAdventure(0)));
  await new Promise(resolve => setTimeout(resolve, 180));
  const stressElapsed = Date.now() - stressStarted;
  assert.strictEqual(answerCalls, 201, 'stress run must call the original once per request');
  assert(stressElapsed < 1500, `stress run took too long: ${stressElapsed}ms`);

  const wrappedNext = windowObject.nextVocabularyAdventure;
  await new Promise(resolve => setTimeout(resolve, 2300));
  assert.strictEqual(windowObject.nextVocabularyAdventure, wrappedNext, 'bounded installer must not re-wrap functions');

  console.log('PASS safe visual enhancement');
  console.log(JSON.stringify({
    mutationObserver: false,
    answerCalls,
    nextCalls,
    hint: nodes.hint.innerHTML,
    unrelatedCalls,
    stressElapsed,
    transitionNodes: nodes.screen.children.filter(node => node.className === 'vav2-transition').length
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
