const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function classList() {
  const values = new Set();
  return {
    add(...items) { items.forEach(item => values.add(item)); },
    remove(...items) { items.forEach(item => values.delete(item)); },
    contains(item) { return values.has(item); }
  };
}

function element(id = '') {
  return {
    id,
    className: '',
    classList: classList(),
    dataset: {},
    hidden: false,
    innerHTML: '',
    textContent: '',
    children: [],
    style: {},
    appendChild(child) { this.children.push(child); return child; },
    insertBefore(child) { this.children.push(child); return child; },
    addEventListener(name, handler) { this[`on${name}`] = handler; },
    setAttribute(name, value) { this[name] = String(value); },
    querySelector() { return null; }
  };
}

test('category enhancement preserves the workbook route and never inserts its virtual batch into appData', async () => {
  const script = read('js/vocabularyLessonCategories.js');
  const list = element('vocabularyLessonBookList');
  const empty = element('vocabularyLessonBookEmpty');
  const title = element('vocabularyLessonSelectionTitle');
  const copy = element();
  title.parentElement = { querySelector: () => copy };
  const topbarTitle = element();
  const icon = element();
  const selectionCopy = element();
  const back = element();
  const screen = element('screenVocabularyReviewList');
  screen.classList.add('active');
  const elements = new Map([
    [list.id, list], [empty.id, empty], [title.id, title], [screen.id, screen]
  ]);
  const batches = [{
    id: 'today-book', name: '今日新词', sharedWith: ['sister'], createdAt: '2026-08-05',
    cards: [{ word: 'bus', meaning: '公共汽车' }, { word: 'car', meaning: '汽车' }]
  }];
  let normalRenders = 0;
  let selectedVirtual = null;
  const document = {
    head: { appendChild() {} },
    createElement(tag) { return element(tag); },
    getElementById(id) {
      if (id === 'vocabularyLessonCategoryEntry') {
        return list.children.find(child => child.id === id) || null;
      }
      return elements.get(id) || null;
    },
    querySelector(selector) {
      if (selector === '#screenVocabularyReviewList .topbar-title') return topbarTitle;
      if (selector === '.vocabulary-lesson-selection-icon') return icon;
      if (selector === '#screenVocabularyReviewList .vocabulary-lesson-selection-copy') return selectionCopy;
      if (selector === '#screenVocabularyReviewList .back-btn') return back;
      return null;
    }
  };
  const context = vm.createContext({
    console,
    document,
    currentUser: 'sister',
    appData: { batches },
    vocabularyLessonState: { mode: 'selection' },
    installVocabularyLessonShell() {},
    renderVocabularyLessonBookSelection() { normalRenders += 1; list.innerHTML = '今日新词'; list.children = []; },
    selectVocabularyLessonBook() {},
    renderVocabularyLesson() {},
    renderVocabularyLessonSharedAdmin() {},
    getVocabularyLessonVisibleBatches(data) { return data.batches.slice(); },
    compareVocabularyLessonBatchesNewestFirst() { return 0; },
    getVocabularyLessonCardWord(card) { return card.word; },
    normalizeVocabularyLessonWord(word) { return String(word).toLowerCase(); },
    escapeVocabularyLessonHtml(value) { return String(value); },
    async selectVocabularyLessonVirtualBatch(batch) { selectedVirtual = batch; return true; },
    clearVocabularyLessonTransientState() {},
    closeVocabularyReviewList() {},
    showScreen() {},
    fetch: async () => ({
      ok: true,
      async json() {
        return {
          schemaVersion: 1,
          groups: [{ id: 'themes', name: '主题词汇', categories: [{ id: 'vehicles', name: '交通工具', icon: '🚌', words: ['bus', 'car'] }] }]
        };
      }
    }),
    setTimeout(handler) { handler(); return 1; },
    clearTimeout() {},
    encodeURIComponent,
    decodeURIComponent,
    Promise,
    Map,
    Set
  });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(script, context, { filename: 'vocabularyLessonCategories.js' });
  await Promise.resolve();
  await Promise.resolve();

  context.renderVocabularyLessonBookSelection();
  assert.equal(normalRenders, 1);
  assert.equal(topbarTitle.textContent, '新词导览');
  assert.equal(title.textContent, '选择今天要讲的单词本');
  assert.equal(list.children.filter(child => child.id === 'vocabularyLessonCategoryEntry').length, 1);

  const before = JSON.stringify(context.appData);
  const opened = await context.selectVocabularyLessonCategory('vehicles');
  assert.equal(opened, true);
  assert.equal(JSON.stringify(context.appData), before);
  assert.equal(selectedVirtual.id, 'vocabulary-category:vehicles');
  assert.equal(selectedVirtual.vocabularyLessonTransient, true);
  assert.equal(Object.hasOwn(selectedVirtual, 'createdAt'), false);
});

test('home navigation and user switching clear category-only runtime state', () => {
  const reviewContext = vm.createContext({
    console,
    currentUser: 'sister',
    currentBatchId: null,
    document: {
      body: { classList: classList() },
      head: { appendChild() {} },
      createElement: element,
      getElementById(id) {
        return element(id);
      },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    window: null,
    navigator: {},
    Set,
    Map,
    Promise,
    sessionStorage: { getItem() { return null; }, setItem() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    getCardWord(card) { return card.word; },
    getCardMeaning(card) { return card.meaning; },
    resetStudentRuntimeView() {},
    loadHome() {},
    showScreen() {},
    isTeacher() { return reviewContext.currentUser === 'teacher'; },
    appData: { pin: '1234' }
  });
  reviewContext.window = reviewContext;
  reviewContext.globalThis = reviewContext;
  vm.runInContext(read('js/vocabularyReview.js'), reviewContext, { filename: 'vocabularyReview.js' });
  vm.runInContext(`
    vocabularyLessonState.batch = { id: 'vocabulary-category:vehicles', vocabularyLessonTransient: true };
    vocabularyLessonState.categoryId = 'vehicles';
    vocabularyLessonState.categoryName = '交通工具';
    vocabularyLessonState.words = [{ word: 'bus' }];
    currentBatchId = 'vocabulary-category:vehicles';
  `, reviewContext);
  assert.equal(reviewContext.clearVocabularyLessonTransientState(), true);
  const cleaned = vm.runInContext(`({
    batch: vocabularyLessonState.batch,
    words: vocabularyLessonState.words.length,
    categoryId: vocabularyLessonState.categoryId || '',
    currentBatchId
  })`, reviewContext);
  assert.deepEqual(JSON.parse(JSON.stringify(cleaned)), {
    batch: null, words: 0, categoryId: '', currentBatchId: null
  });

  vm.runInContext(read('js/auth.js'), reviewContext, { filename: 'auth.js' });
  vm.runInContext(`
    vocabularyLessonState.batch = { id: 'vocabulary-category:vehicles', vocabularyLessonTransient: true };
    vocabularyLessonState.categoryId = 'vehicles';
    currentBatchId = 'vocabulary-category:vehicles';
    switchUser('brother');
  `, reviewContext);
  const switched = vm.runInContext(`({
    user: currentUser,
    batch: vocabularyLessonState.batch,
    categoryId: vocabularyLessonState.categoryId || '',
    currentBatchId
  })`, reviewContext);
  assert.deepEqual(JSON.parse(JSON.stringify(switched)), {
    user: 'brother', batch: null, categoryId: '', currentBatchId: null
  });
});

test('background refresh redraws the active selection route instead of returning to books', () => {
  const screen = element('screenVocabularyReviewList');
  screen.classList.add('active');
  const routeContext = vm.createContext({
    console,
    currentUser: 'sister',
    currentBatchId: null,
    document: {
      body: { classList: classList() },
      head: { appendChild() {} },
      createElement: element,
      getElementById(id) {
        return id === screen.id ? screen : element(id);
      },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    window: null,
    navigator: {},
    Set,
    Map,
    Promise,
    sessionStorage: { getItem() { return null; }, setItem() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    getCardWord(card) { return card.word; },
    getCardMeaning(card) { return card.meaning; },
    isTeacher() { return false; },
    appData: { batches: [] }
  });
  routeContext.window = routeContext;
  routeContext.globalThis = routeContext;
  vm.runInContext(read('js/vocabularyReview.js'), routeContext, { filename: 'vocabularyReview.js' });

  let bookRenders = 0;
  let categoryRenders = 0;
  let categoryGroupRenders = 0;
  routeContext.renderVocabularyLessonBookSelection = () => { bookRenders += 1; };
  routeContext.renderVocabularyLessonCategorySelection = () => { categoryRenders += 1; };
  routeContext.renderVocabularyLessonCategoryGroups = () => { categoryGroupRenders += 1; };

  routeContext.setVocabularyLessonSelectionRoute('categories');
  routeContext.refreshVocabularyReviewSharedStateFromAppData();
  assert.deepEqual([bookRenders, categoryRenders, categoryGroupRenders], [0, 1, 0]);

  routeContext.setVocabularyLessonSelectionRoute('category-groups');
  routeContext.refreshVocabularyReviewSharedStateFromAppData();
  assert.deepEqual([bookRenders, categoryRenders, categoryGroupRenders], [0, 1, 1]);

  routeContext.setVocabularyLessonSelectionRoute('books');
  routeContext.refreshVocabularyReviewSharedStateFromAppData();
  assert.deepEqual([bookRenders, categoryRenders, categoryGroupRenders], [1, 1, 1]);
});

test('main storage cloning strips transient category data while generic KV cloning stays unchanged', () => {
  const repository = read('js/repository.js');
  const start = repository.indexOf('function isVocabularyLessonTransientBatchRecord');
  const end = repository.indexOf('function fingerprintData', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({ JSON });
  vm.runInContext(repository.slice(start, end), context);
  const value = {
    batches: [
      { id: 'today-book', cards: [] },
      { id: 'vocabulary-category:vehicles', vocabularyLessonTransient: true, cards: [] }
    ],
    vocabularyLessonGroups: {
      'today-book': { groups: [] },
      'vocabulary-category:vehicles': { groups: [] }
    }
  };
  const generic = context.cloneForStorage(value);
  assert.deepEqual(JSON.parse(JSON.stringify(generic)), value, 'non-main KV cloning must preserve every field');

  const stored = context.cloneMainForStorage(value);
  assert.deepEqual(JSON.parse(JSON.stringify(stored)), {
    batches: [{ id: 'today-book', cards: [] }],
    vocabularyLessonGroups: { 'today-book': { groups: [] } }
  });
});
