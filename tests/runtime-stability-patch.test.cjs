const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const vocabularyUx = require('../js/runtimeVocabularyUx.js');
const homeStability = require('../js/runtimeHomeStability.js');

test('bilingual examples become a Chinese prompt and English-only order tokens', () => {
  globalThis.VocabularyAdventureCore = {
    adventureWordKey(value) { return String(value || '').trim().toLowerCase(); },
    deterministicAdventureShuffle(values) { return [...values].reverse(); }
  };
  const question = vocabularyUx.transformSentenceOrder({
    ok: true,
    questionType: 'sentenceOrder',
    prompt: '尾巴',
    sourceText: 'The dog wagged its tail happily. / 那只狗高兴地摇着它的尾巴。',
    seed: 'demo'
  }, {
    planItem: { wordKey: 'tail' },
    allCards: [{ key: 'tail', word: 'tail', card: { word: 'tail' } }]
  });

  assert.equal(question.prompt, '那只狗高兴地摇着它的尾巴。');
  assert.equal(question.tokens.some(token => /[\u3400-\u9fff]/.test(token.label)), false);
  assert.equal(question.tokens.find(token => token.label === 'tail')?.id.startsWith('focus:'), true);
  const byId = new Map(question.tokens.map(token => [token.id, token.label]));
  assert.deepEqual(question.answer.map(id => byId.get(id)), ['The', 'dog', 'wagged', 'its', 'tail', 'happily.']);
});

test('encoded missing-letter cues decode even when surrounded by whitespace', () => {
  const payload = { meaning: '尾巴', maskedWord: 't_il', emoji: '🐕' };
  const encoded = `  __VOCAB_MISSING__:${encodeURIComponent(JSON.stringify(payload))}  `;
  assert.deepEqual(vocabularyUx.decodeCue(encoded), { kind: 'missing', value: payload });
});

test('reward-state ranking prevents pending and claimed cards from regressing to idle', () => {
  assert.equal(homeStability.rank({ state: 'idle', completed: false }), 0);
  assert.equal(homeStability.rank({ state: 'idle', completed: true }), 1);
  assert.equal(homeStability.rank({ state: 'pending', completed: true }), 2);
  assert.equal(homeStability.rank({ state: 'opening', completed: true }), 3);
  assert.equal(homeStability.rank({ state: 'claimed', completed: true }), 4);
});

test('home loading indicator is time-bounded and never serializes refresh promises', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/runtimeHomeStability.js'), 'utf8');
  assert.match(source, /grammarChallenge:\s*'grammarChallengeHomeStatus'/);
  assert.match(source, /card\.dataset\.rewardState !== value\.state/);
  assert.match(source, /safetyTimer[\s\S]*3500/);
  assert.match(source, /return result;/);
  assert.doesNotMatch(source, /let active\s*=/);
  assert.doesNotMatch(source, /pointer-events:auto/);
});

test('feature loading and activity wrappers remain stable when installed repeatedly', async () => {
  const featureSource = fs.readFileSync(path.join(__dirname, '../js/runtimeFeatureLoading.js'), 'utf8');
  const activitySource = fs.readFileSync(path.join(__dirname, '../js/studentActivityControls.js'), 'utf8');
  const timeoutCallbacks = [];
  const intervalCallbacks = [];
  const entries = new Map();

  function createNode(id = '') {
    return {
      id,
      children: [],
      className: '',
      dataset: {},
      attributes: new Map(),
      classList: { contains() { return false; } },
      appendChild(child) { this.children.push(child); },
      removeAttribute(name) { this.attributes.delete(name); },
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      remove() {}
    };
  }

  entries.set('vocabularyAdventurePreviewEntry', createNode('vocabularyAdventurePreviewEntry'));
  entries.set('vocabularyAdventureChallengeEntry', createNode('vocabularyAdventureChallengeEntry'));
  let adventureCalls = 0;
  let challengeCalls = 0;
  const context = vm.createContext({
    console,
    currentUser: 'sister',
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Promise,
    Map,
    Set,
    document: {
      readyState: 'complete',
      head: { appendChild(node) { if (node.id) entries.set(node.id, node); } },
      createElement() { return createNode(); },
      getElementById(id) { return entries.get(id) || null; },
      querySelector(selector) {
        if (selector === '#vocabularyAdventurePreviewEntry') return entries.get('vocabularyAdventurePreviewEntry');
        if (selector === '#vocabularyAdventureChallengeEntry') return entries.get('vocabularyAdventureChallengeEntry');
        return null;
      },
      querySelectorAll() { return []; },
      addEventListener() {}
    },
    setTimeout(callback) {
      const token = { callback, cancelled: false };
      timeoutCallbacks.push(token);
      return token;
    },
    clearTimeout(token) { if (token) token.cancelled = true; },
    setInterval(callback) { intervalCallbacks.push(callback); return callback; },
    clearInterval() {},
    addEventListener() {},
    isTeacher: () => false,
    loadHome: async () => true,
    loadFeatureGroup: async group => group,
    loadVocabularyAdventureState: async () => ({ version: 1, words: {}, session: null }),
    saveCurrentVocabularyAdventureState: async () => true,
    getVocabularyAdventureLegacyChallengeUsage: async () => ({ attempts: 0, bestScore: 0 }),
    openVocabularyAdventure: async () => { adventureCalls += 1; return 'adventure'; },
    closeVocabularyAdventure() {},
    openVocabularyAdventureChallenge: async () => { challengeCalls += 1; return 'challenge'; },
    closeVocabularyAdventureChallenge() {},
    sbGet: async () => null,
    sbSet: async () => true,
    alert() {}
  });
  context.globalThis = context;
  context.window = context;

  vm.runInContext(featureSource, context, { filename: 'runtimeFeatureLoading.js' });
  vm.runInContext(activitySource, context, { filename: 'studentActivityControls.js' });
  await Promise.resolve();

  intervalCallbacks[0]();
  const activityReassertions = timeoutCallbacks.splice(0);
  activityReassertions.forEach(token => {
    if (!token.cancelled) token.callback();
  });
  intervalCallbacks[0]();
  await Promise.resolve();

  assert.equal(context.openVocabularyAdventure.__activityAware, true);
  assert.equal(context.openVocabularyAdventureChallenge.__activityAware, true);
  assert.equal(await context.openVocabularyAdventure(), 'adventure');
  assert.equal(await context.openVocabularyAdventureChallenge(), 'challenge');
  assert.equal(adventureCalls, 1);
  assert.equal(challengeCalls, 1);
  assert.notEqual(entries.get('vocabularyAdventurePreviewEntry').attributes.get('aria-busy'), 'true');
  assert.notEqual(entries.get('vocabularyAdventureChallengeEntry').attributes.get('aria-busy'), 'true');
});
