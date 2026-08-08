'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'dailyLearningRoute.js'), 'utf8');
const route = {
  schemaVersion: 1,
  updatedAt: '2026-08-08T08:00:00+08:00',
  grammarChallenge: { id: 'grammar-cached', title: '缓存语法挑战' },
  classroomPractice: { id: 'classroom-cached', title: '缓存随堂练习' }
};
const storage = new Map([
  ['daily_learning_route_cache_v1', JSON.stringify({ version: 1, route })]
]);
let opened = '';

const document = {
  visibilityState: 'visible',
  head: { appendChild() {} },
  body: { classList: { add() {} } },
  createElement() { return { id: '', textContent: '' }; },
  getElementById() { return null; },
  addEventListener() {}
};

const context = {
  console,
  document,
  currentUser: 'sister',
  SB_URL: 'https://example.invalid',
  SB_HEADERS: {},
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  // Both route refresh and Supabase reads stay unresolved. Cached entry must
  // not await either dependency.
  fetch() { return new Promise(() => {}); },
  AbortController: class AbortController { constructor() { this.signal = {}; } abort() {} },
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  setTimeout() { return 1; },
  clearTimeout() {},
  addEventListener() {},
  dispatchEvent() {},
  isTeacher() { return false; },
  loadHome: async () => true,
  getMirrorValue() { return null; },
  updateMirrorValue() {},
  loadFeatureGroup: async group => group,
  openGrammarChallenge(id) { opened = id; }
};
context.window = context;
context.globalThis = context;

vm.runInNewContext(source, context, { filename: 'dailyLearningRoute.js' });

(async () => {
  const started = await context.startDailyLearningRoute();
  assert.equal(started.grammarChallenge.id, 'grammar-cached');

  await Promise.race([
    context.openStudentGrammarChallenge(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('cached grammar entry blocked on network')), 100))
  ]);
  assert.equal(opened, 'grammar-cached');
  console.log('grammar offline-first entry test passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
