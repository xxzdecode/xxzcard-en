const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const saved = new Map();
const requests = [];
const summary = {
  pin: '0716',
  mixedAssignments: [{ date: '2026-08-27', batchIds: ['book-1'] }],
  taskAssignments: [{ date: '2026-08-27', todayBatchId: 'book-1' }],
  vocabularyReviewState: { version: 1, rememberedWords: ['go'] },
  schemaVersion: 2,
  masterLibrary: { version: 1 }
};
const full = {
  ...summary,
  masterCards: { go: { word: 'go', meaning: '去' } },
  batches: [{ id: 'book-1', cardRefs: [{ wordKey: 'go' }] }]
};

const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Set,
  String,
  Promise,
  encodeURIComponent,
  SB_URL: 'https://example.invalid',
  SB_HEADERS: {},
  DEFAULT_CARDS: [],
  appData: { batches: [], pin: null },
  currentUser: 'sister',
  navigator: { onLine: true },
  localStorage: {
    getItem: key => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: key => saved.delete(key)
  },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {} })
  },
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  alert: () => {},
  fetch: async url => {
    requests.push(String(url));
    const isFull = /[?&]select=value(?:&|$)/.test(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => isFull ? [{ value: structuredClone(full) }] : [structuredClone(summary)]
    };
  },
  normalizeAppData: data => {
    if (!Array.isArray(data.batches)) data.batches = [];
    return false;
  },
  normalizePhonemeLibrary: () => false,
  findInvalidEnglishCard: () => null,
  isCurrentEnglishCard: () => true,
  normalizeCardDictionary: () => {},
  normalizeEnglishCard: card => card,
  loadHome: () => {}
});

vm.runInContext(fs.readFileSync(path.join(root, 'js', 'repository.js'), 'utf8'), context);

async function run() {
  const initial = await vm.runInContext('initData().then(data => { appData = data; return data; })', context);
  assert.equal(initial.batches.length, 0, 'first paint must not need wordbook or card data');
  await vm.runInContext('mainSummaryPromise', context);

  assert.equal(requests.length, 1, 'startup should make only one main-summary request');
  assert.match(requests[0], /select=pin%3Avalue-%3Epin/);
  assert.doesNotMatch(requests[0], /select=value(?:&|$)/);
  assert.equal(context.appData.pin, '0716');
  assert.equal(saved.has('wc_sb_main'), false, 'summary must not overwrite the full offline mirror');

  const loaded = await vm.runInContext('ensureFullMainData()', context);
  assert.equal(requests.length, 2, 'first vocabulary entry should request full main once');
  assert.match(requests[1], /[?&]select=value(?:&|$)/);
  assert.equal(loaded.masterCards.go.meaning, '去');
  assert.equal(saved.has('wc_sb_main'), true, 'full main remains available for offline feature entry');

  await vm.runInContext('ensureFullMainData()', context);
  assert.equal(requests.length, 2, 'full main should be reused after the first feature entry');
}

run()
  .then(() => console.log('main lazy-loading tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
