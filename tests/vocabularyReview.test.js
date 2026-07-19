const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/vocabularyReviewData.js'), 'utf8'), context);

const words = JSON.parse(vm.runInContext('JSON.stringify(reviewWords)', context));
assert.ok(words.length > 0);
assert.equal(new Set(words.map(item => item.word)).size, words.length);
for (const item of words) {
  assert.equal(typeof item.word, 'string');
  assert.ok(item.word.length > 0);
  assert.equal(typeof item.phonetic, 'string');
  assert.ok(item.phonetic.length > 0);
  assert.equal(typeof item.meaning, 'string');
  assert.ok(item.meaning.length > 0);
  assert.equal(item.image, `assets/vocabulary-review/${item.word}.webp`);
  assert.equal(typeof item.placeholder, 'string');
  assert.ok(item.placeholder.length > 0);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const reviewScript = fs.readFileSync(path.join(root, 'js/vocabularyReview.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.equal((html.match(/id="vocabularyReviewImage"/g) || []).length, 1);
assert.equal((html.match(/id="vocabularyReviewQuizImage"/g) || []).length, 0);
assert.match(reviewScript, /image\.getAttribute\('src'\) !== item\.image/);
assert.match(reviewScript, /\[-2, -1, 0, 1, 2\]/);
for (const item of words.filter(item => fs.existsSync(path.join(root, item.image)))) {
  assert.ok(serviceWorker.includes(`./${item.image}`), `image missing from service worker: ${item.image}`);
}
assert.match(serviceWorker, /vocabulary-review-v3/);
assert.match(serviceWorker, /fetch\(event\.request, \{ cache: 'no-cache' \}\)/);
assert.match(serviceWorker, /cache\.put\(cacheKey, copy\)/);
assert.match(serviceWorker, /\.catch\(\(\) => caches\.match\(cacheKey\)\)/);

assert.match(html, /id="vocabularyReviewRemembered"/);
assert.match(html, /onclick="markVocabularyReviewWordRemembered\(\)"/);
assert.match(reviewScript, /wc_vocabulary_review_remembered/);
assert.match(reviewScript, /function getActiveVocabularyReviewWords\(\)/);
assert.match(reviewScript, /function restoreVocabularyReviewWord\(word\)/);
assert.match(reviewScript, /vocabularyReviewRememberedWords\.has\(item\.word\)/);

const savedValues = new Map();
const browserContext = vm.createContext({
  localStorage: {
    getItem: key => savedValues.get(key) || null,
    setItem: (key, value) => savedValues.set(key, value)
  },
  document: {
    addEventListener() {},
    getElementById() { return null; }
  },
  navigator: {},
  window: {
    addEventListener() {},
    setTimeout(callback) { callback(); }
  }
});
vm.runInContext(fs.readFileSync(path.join(root, 'js/vocabularyReviewData.js'), 'utf8'), browserContext);
vm.runInContext(reviewScript, browserContext);
assert.equal(vm.runInContext('getActiveVocabularyReviewWords().length', browserContext), words.length);
const rememberedWord = words[0].word;
browserContext.rememberedWord = rememberedWord;
vm.runInContext('vocabularyReviewRememberedWords.add(rememberedWord); saveVocabularyReviewRememberedWords()', browserContext);
assert.equal(vm.runInContext('getActiveVocabularyReviewWords().length', browserContext), words.length - 1);
assert.deepEqual(JSON.parse(savedValues.get('wc_vocabulary_review_remembered')), [rememberedWord]);

console.log('vocabulary review data tests passed');
