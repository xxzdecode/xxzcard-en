const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(__dirname, '..', 'js', 'vocabularyAdventureVisualV2.js');
const source = fs.readFileSync(scriptPath, 'utf8');

assert(!source.includes('MutationObserver'), 'must not install a MutationObserver');
assert(!source.includes('setInterval'), 'must not install a polling interval');
assert(source.includes('styles-vocabulary-adventure-v2.css'), 'must load the incremental layout stylesheet');
assert(source.includes('vav2-guide-fox'), 'must render the illustrated fox layer');
assert(source.includes("title.textContent = '词汇探险'"), 'must keep the current main topbar title');
assert(source.includes("button.textContent = '🔊 再听一次'"), 'must support replay only inside the hint bubble');
assert(source.includes("control.innerHTML = '<span aria-hidden=\"true\">🔊</span><b>听读音</b>'"), 'must expose one fixed 听读音 control');

let answerCalls = 0;
let nextCalls = 0;
let unrelatedCalls = 0;

const document = {
  readyState: 'complete',
  head: { appendChild() {} },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() {
    return {
      dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      remove() {}
    };
  },
  createTextNode(text) { return { textContent: String(text) }; },
  addEventListener() {}
};

const windowObject = {
  Promise,
  setTimeout,
  clearTimeout,
  answerVocabularyAdventure() {
    answerCalls += 1;
    return Promise.resolve('saved');
  },
  nextVocabularyAdventure() {
    nextCalls += 1;
    return 'next';
  },
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
vm.runInContext(source, context, { filename: scriptPath });

(async () => {
  assert.strictEqual(windowObject.__VOCABULARY_ADVENTURE_VISUAL_V2_INCREMENTAL__, true);

  const result = await windowObject.answerVocabularyAdventure(0);
  assert.strictEqual(result, 'saved');
  assert.strictEqual(answerCalls, 1, 'wrapped answer must call the original exactly once');

  const nextResult = windowObject.nextVocabularyAdventure();
  assert.strictEqual(nextResult, 'next');
  assert.strictEqual(nextCalls, 1, 'wrapped next must call the original exactly once without a boundary');

  windowObject.otherClick();
  assert.strictEqual(unrelatedCalls, 1, 'unrelated page clicks must remain untouched');

  const wrappedAnswer = windowObject.answerVocabularyAdventure;
  const wrappedNext = windowObject.nextVocabularyAdventure;
  await new Promise(resolve => setTimeout(resolve, 2200));
  assert.strictEqual(windowObject.answerVocabularyAdventure, wrappedAnswer, 'bounded installer must not re-wrap answer');
  assert.strictEqual(windowObject.nextVocabularyAdventure, wrappedNext, 'bounded installer must not re-wrap next');

  console.log('PASS incremental visual safety');
  console.log(JSON.stringify({
    mutationObserver: false,
    pollingInterval: false,
    answerCalls,
    nextCalls,
    unrelatedCalls
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
