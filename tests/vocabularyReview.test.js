const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dataScript = fs.readFileSync(path.join(root, 'js/vocabularyReviewData.js'), 'utf8');
const reviewScript = fs.readFileSync(path.join(root, 'js/vocabularyReview.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

const dataContext = vm.createContext({});
vm.runInContext(dataScript, dataContext);
const words = JSON.parse(vm.runInContext('JSON.stringify(reviewWords)', dataContext));

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

const studentNav = html.match(/<nav class="bottom-feature-nav student-only"[\s\S]*?<\/nav>/)?.[0] || '';
const teacherNav = html.match(/<nav class="teacher-home-nav teacher-only"[\s\S]*?<\/nav>/)?.[0] || '';
assert.deepEqual(
  Array.from(studentNav.matchAll(/<span>([^<]+)<\/span>/g), match => match[1]),
  ['单词卡', '生词检验', '生词巩固', '音标训练', '专项小游戏']
);
assert.equal((studentNav.match(/openVocabularyReviewList\(\)/g) || []).length, 1);
assert.equal((teacherNav.match(/openVocabularyReviewList\(\)/g) || []).length, 1);
assert.match(html, /onclick="closeVocabularyReviewList\(\)"/);
assert.match(styles, /grid-template-columns:\s*repeat\(6/);
assert.match(styles, /:nth-child\(-n \+ 3\).*span 2/);
assert.match(styles, /:nth-child\(n \+ 4\).*span 3/);
assert.match(styles, /:nth-child\(4\)::before\s*\{\s*content:\s*none/);
assert.match(styles, /body:not\(\.is-teacher\) \.vocabulary-review-remembered/);

assert.match(serviceWorker, /vocabulary-review-v10/);
assert.match(serviceWorker, /fetch\(event\.request, \{ cache: 'no-cache' \}\)/);
assert.match(serviceWorker, /cache\.put\(cacheKey, copy\)/);
assert.match(serviceWorker, /\.catch\(\(\) => caches\.match\(cacheKey\)\)/);
assert.equal((html.match(/id="vocabularyReviewImage"/g) || []).length, 1);
assert.equal((html.match(/id="vocabularyReviewQuizImage"/g) || []).length, 0);
assert.match(reviewScript, /image\.getAttribute\('src'\) !== item\.image/);
assert.match(reviewScript, /\[-2, -1, 0, 1, 2\]/);
assert.match(html, />打乱卡片<\/button>/);
assert.match(html, /id="vocabularyReviewRememberButton"[^>]*hidden/);
assert.match(styles, /\.vocabulary-review-actions\s*\{[^}]*grid-template-columns/);
for (const item of words.filter(item => fs.existsSync(path.join(root, item.image)))) {
  assert.ok(serviceWorker.includes(`./${item.image}`), `image missing from service worker: ${item.image}`);
}

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: value => values.add(value),
    remove: value => values.delete(value),
    contains: value => values.has(value),
    toggle(value, force) {
      if (force === undefined ? !values.has(value) : force) values.add(value);
      else values.delete(value);
    }
  };
}

function createHarness({ legacyWords = [], rememberedWords = [], failWrites = false } = {}) {
  const savedValues = new Map();
  if (legacyWords.length) savedValues.set('wc_vocabulary_review_remembered', JSON.stringify(legacyWords));
  const elements = new Map();
  const element = (id, active = false) => {
    const value = {
      id,
      hidden: false,
      disabled: false,
      innerHTML: '',
      textContent: '',
      classList: createClassList(active ? ['active'] : []),
      setAttribute() {},
      getAttribute() { return ''; },
      addEventListener() {}
    };
    elements.set(id, value);
    return value;
  };
  const screens = [element('screenHome'), element('screenVocabularyReviewList'), element('screenVocabularyReviewPlayer')];
  [
    'vocabularyReviewCount', 'vocabularyReviewWordList', 'vocabularyReviewEmpty',
    'vocabularyReviewRemembered', 'vocabularyReviewRememberedSummary',
    'vocabularyReviewRememberedList', 'vocabularyReviewRememberButton',
    'vocabularyReviewCard', 'vocabularyReviewProgress', 'vocabularyReviewWord',
    'vocabularyReviewPhonetic', 'vocabularyReviewMeaning', 'vocabularyReviewFullFace',
    'vocabularyReviewQuizFace', 'vocabularyReviewImage', 'vocabularyReviewImageFallback'
  ].forEach(id => element(id));
  const startButton = { disabled: false };
  const shuffleButton = { disabled: false };
  let writeAttempts = 0;
  let remoteMain = {
    batches: [],
    vocabularyReviewState: { version: 1, rememberedWords: [...rememberedWords], updatedAt: '', updatedBy: '' }
  };
  const context = vm.createContext({
    console,
    Date,
    Set,
    currentUser: 'sister',
    appData: JSON.parse(JSON.stringify(remoteMain)),
    localStorage: {
      getItem: key => savedValues.get(key) || null,
      setItem: (key, value) => savedValues.set(key, value)
    },
    document: {
      body: { classList: createClassList() },
      addEventListener() {},
      getElementById: id => elements.get(id) || null,
      querySelector: selector => {
        if (selector === '.vocabulary-review-start-btn') return startButton;
        if (selector === '.vocabulary-review-shuffle-btn') return shuffleButton;
        return null;
      },
      querySelectorAll: selector => selector === '.screen' ? screens : []
    },
    navigator: {},
    window: { addEventListener() {}, setTimeout(callback) { callback(); }, scrollTo() {} },
    Image: undefined,
    isTeacher: () => context.currentUser === 'teacher',
    normalizeAppData: () => false,
    setMainSnapshot() {},
    showStorageError() {},
    loadHome() {},
    showScreen(id) {
      screens.forEach(screen => screen.classList.remove('active'));
      elements.get(id)?.classList.add('active');
    },
    sbGetRemote: async () => JSON.parse(JSON.stringify(remoteMain)),
    updateMainDataSafely: async mutator => {
      writeAttempts += 1;
      if (failWrites) return null;
      const next = JSON.parse(JSON.stringify(remoteMain));
      const changed = mutator(next);
      if (changed !== false) remoteMain = next;
      context.appData = JSON.parse(JSON.stringify(remoteMain));
      return context.appData;
    }
  });
  vm.runInContext(dataScript, context);
  vm.runInContext(reviewScript, context);
  return {
    context,
    elements,
    savedValues,
    startButton,
    shuffleButton,
    value: expression => vm.runInContext(expression, context),
    setFailWrites(value) { failWrites = value; },
    getRemote: () => JSON.parse(JSON.stringify(remoteMain)),
    getWriteAttempts: () => writeAttempts
  };
}

async function verifySharedState() {
  const first = words[0].word;
  const second = words[1].word;
  const third = words[2].word;
  const harness = createHarness({
    legacyWords: [first, 'removed-word', first],
    rememberedWords: [second, 'stale-cloud-word']
  });

  for (const role of ['teacher', 'sister', 'brother']) {
    harness.context.currentUser = role;
    assert.equal(harness.value('canUseVocabularyReview()'), true);
  }
  harness.context.currentUser = 'unknown';
  assert.equal(harness.value('canUseVocabularyReview()'), false);

  harness.context.currentUser = 'sister';
  await harness.value('initializeVocabularyReviewSharedState()');
  assert.deepEqual(harness.getRemote().vocabularyReviewState.rememberedWords, [second, 'stale-cloud-word']);
  assert.equal(harness.savedValues.has('wc_vocabulary_review_shared_migration_v1'), false);
  assert.equal(harness.value(`getActiveVocabularyReviewWords().some(item => item.word === ${JSON.stringify(second)})`), false);

  harness.value('renderVocabularyReviewList()');
  assert.doesNotMatch(harness.elements.get('vocabularyReviewWordList').innerHTML, /记住了/);
  assert.equal(harness.elements.get('vocabularyReviewRemembered').hidden, true);
  harness.value('startVocabularyReview(0)');
  assert.equal(harness.elements.get('vocabularyReviewRememberButton').hidden, true);
  assert.equal(harness.elements.get('vocabularyReviewRememberButton').disabled, true);

  const beforeStudentWrite = JSON.stringify(harness.getRemote());
  const studentWriteAttempts = harness.getWriteAttempts();
  await harness.value(`markVocabularyReviewWordRemembered(${JSON.stringify(third)})`);
  await harness.value(`updateVocabularyReviewSharedWord(${JSON.stringify(third)}, true)`);
  assert.equal(JSON.stringify(harness.getRemote()), beforeStudentWrite);
  assert.equal(harness.getWriteAttempts(), studentWriteAttempts);

  harness.context.currentUser = 'brother';
  harness.context.appData = harness.getRemote();
  harness.value('applyVocabularyReviewState(appData)');
  assert.equal(harness.value(`getActiveVocabularyReviewWords().some(item => item.word === ${JSON.stringify(second)})`), false);

  const refreshedDevice = createHarness({
    rememberedWords: [second]
  });
  refreshedDevice.context.currentUser = 'brother';
  await refreshedDevice.value('initializeVocabularyReviewSharedState()');
  assert.equal(
    refreshedDevice.value(`getActiveVocabularyReviewWords().some(item => item.word === ${JSON.stringify(second)})`),
    false,
    'a fresh device load should use the shared cloud state'
  );

  harness.context.currentUser = 'teacher';
  await harness.value('initializeVocabularyReviewSharedState()');
  assert.deepEqual(harness.getRemote().vocabularyReviewState.rememberedWords, [second, first]);
  assert.equal(harness.savedValues.get('wc_vocabulary_review_shared_migration_v1'), '1');
  harness.value('renderVocabularyReviewList()');
  assert.match(harness.elements.get('vocabularyReviewWordList').innerHTML, /✓ 记住了/);
  harness.value('startVocabularyReview(0)');
  assert.equal(harness.elements.get('vocabularyReviewRememberButton').hidden, false);

  await harness.value(`markVocabularyReviewWordRemembered(${JSON.stringify(third)})`);
  assert.ok(harness.getRemote().vocabularyReviewState.rememberedWords.includes(third));
  await harness.value(`restoreVocabularyReviewWord(${JSON.stringify(third)})`);
  assert.equal(harness.getRemote().vocabularyReviewState.rememberedWords.includes(third), false);

  harness.context.currentUser = 'unknown';
  const beforeUnknown = JSON.stringify(harness.getRemote());
  await harness.value(`markVocabularyReviewWordRemembered(${JSON.stringify(third)})`);
  assert.equal(JSON.stringify(harness.getRemote()), beforeUnknown);

  harness.context.currentUser = 'teacher';
  const beforeFailure = harness.value('getActiveVocabularyReviewWords().length');
  harness.setFailWrites(true);
  await harness.value(`markVocabularyReviewWordRemembered(${JSON.stringify(third)})`);
  assert.equal(harness.value('getActiveVocabularyReviewWords().length'), beforeFailure);
  assert.equal(harness.value('vocabularyReviewWritePending'), false);

  const failedMigration = createHarness({ legacyWords: [first], failWrites: true });
  failedMigration.context.currentUser = 'teacher';
  await failedMigration.value('initializeVocabularyReviewSharedState()');
  assert.equal(failedMigration.savedValues.has('wc_vocabulary_review_shared_migration_v1'), false);
  assert.deepEqual(failedMigration.getRemote().vocabularyReviewState.rememberedWords, []);

  const emptyStudent = createHarness({ rememberedWords: words.map(item => item.word) });
  emptyStudent.context.currentUser = 'brother';
  await emptyStudent.value('initializeVocabularyReviewSharedState()');
  emptyStudent.value('renderVocabularyReviewList()');
  assert.equal(emptyStudent.elements.get('vocabularyReviewEmpty').hidden, false);
  assert.equal(emptyStudent.startButton.disabled, true);
  assert.equal(emptyStudent.shuffleButton.disabled, true);
  assert.equal(emptyStudent.elements.get('vocabularyReviewRemembered').hidden, true);

  const emptyTeacher = createHarness({ rememberedWords: words.map(item => item.word) });
  emptyTeacher.context.currentUser = 'teacher';
  await emptyTeacher.value('initializeVocabularyReviewSharedState()');
  emptyTeacher.value('renderVocabularyReviewList()');
  assert.equal(emptyTeacher.elements.get('vocabularyReviewEmpty').hidden, false);
  assert.equal(emptyTeacher.startButton.disabled, true);
  assert.equal(emptyTeacher.elements.get('vocabularyReviewRemembered').hidden, false);
}

async function verifyShuffle() {
  const harness = createHarness();
  const originalWords = harness.value('reviewWords.map(item => item.word)');
  const input = [1, 2, 3, 4];
  harness.context.shuffleInput = input;
  const shuffled = harness.value('shuffleVocabularyReviewItems(shuffleInput, () => 0)');
  assert.deepEqual(Array.from(shuffled).sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4]);
  assert.deepEqual(Array.from(harness.value('shuffleVocabularyReviewItems([], () => 0)')), []);
  assert.deepEqual(Array.from(harness.value('shuffleVocabularyReviewItems([1], () => 0)')), [1]);

  const writesBeforeShuffle = harness.getWriteAttempts();
  const beforeOrder = harness.value('getActiveVocabularyReviewWords().map(item => item.word)');
  harness.value('shuffleVocabularyReviewCards(() => 0)');
  const afterOrder = harness.value('getActiveVocabularyReviewWords().map(item => item.word)');
  assert.notDeepEqual(Array.from(afterOrder), Array.from(beforeOrder));
  assert.deepEqual(Array.from(afterOrder).sort(), Array.from(beforeOrder).sort());
  assert.deepEqual(Array.from(harness.value('reviewWords.map(item => item.word)')), Array.from(originalWords));
  assert.equal(harness.value('vocabularyReviewIndex'), 0);
  assert.equal(harness.getWriteAttempts(), writesBeforeShuffle);

  harness.context.currentUser = 'teacher';
  const firstShuffledWord = afterOrder[0];
  await harness.value(`markVocabularyReviewWordRemembered(${JSON.stringify(firstShuffledWord)})`);
  assert.equal(harness.value(`getActiveVocabularyReviewWords().some(item => item.word === ${JSON.stringify(firstShuffledWord)})`), false);
  await harness.value(`restoreVocabularyReviewWord(${JSON.stringify(firstShuffledWord)})`);
  const restoredOrder = harness.value('getActiveVocabularyReviewWords().map(item => item.word)');
  assert.equal(restoredOrder.at(-1), firstShuffledWord);
  assert.equal(new Set(restoredOrder).size, restoredOrder.length);
}

Promise.all([verifySharedState(), verifyShuffle()])
  .then(() => console.log('vocabulary review shared-state tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
