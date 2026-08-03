const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const vocabularyUx = require('../js/runtimeVocabularyUx.js');
const homeStability = require('../js/runtimeHomeStability.js');

function createRuntimePatchHarness(options = {}) {
  const insertedScripts = [];
  const context = {
    console: {
      warn() {},
      error() {}
    },
    document: {
      readyState: 'complete',
      head: {
        appendChild(script) {
          insertedScripts.push(script.src);
          Promise.resolve().then(() => script.onload && script.onload());
          return script;
        }
      },
      createElement() {
        return {
          src: '',
          async: true,
          dataset: {},
          onload: null,
          onerror: null
        };
      },
      addEventListener() {}
    },
    setTimeout,
    clearTimeout,
    setInterval() { return 1; },
    clearInterval() {},
    loadFeatureGroup: options.loadFeatureGroup || (async group => `loaded:${group}`),
    loadFeatureScript: options.loadFeatureScript || (async () => undefined)
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '../js/runtimeStabilityPatch.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'js/runtimeStabilityPatch.js' });
  context.installAdventureLoaderRecovery();
  return { context, insertedScripts };
}

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
  assert.equal(homeStability.rank({ state: 'claimed', completed: true }), 3);
});

test('home loading indicator is time-bounded and never serializes refresh promises', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/runtimeHomeStability.js'), 'utf8');
  assert.match(source, /safetyTimer[\s\S]*3500/);
  assert.match(source, /return result;/);
  assert.doesNotMatch(source, /let active\s*=/);
  assert.doesNotMatch(source, /pointer-events:auto/);
});

test('adventure loader rebuilds a poisoned bootstrap and ignores optional UI failures', async () => {
  const loaded = [];
  const { context } = createRuntimePatchHarness({
    async loadFeatureGroup(group) {
      if (group === 'adventurePlayer') throw new Error('poisoned base promise');
      return `loaded:${group}`;
    },
    async loadFeatureScript(source) {
      loaded.push(source);
      if (/vocabularyQuestionTypesRepeatBootstrap\.js\?adventureLoaderRecovery=/.test(source)) {
        context.VocabularyQuestionTypesRepeatPatch = {
          async loadFeatureGroup(group) {
            await context.loadFeatureScript('js/vocabularyAdventureCore.js');
            await context.loadFeatureScript('js/vocabularyPracticeUI.js');
            await context.loadFeatureScript(
              group === 'adventurePlayer'
                ? 'js/vocabularyAdventurePlayer.js'
                : 'js/vocabularyAdventureChallenge.js'
            );
          }
        };
        return;
      }
      if (source === 'js/vocabularyPracticeUI.js') {
        throw new Error('optional UI unavailable');
      }
    }
  });

  await context.loadFeatureGroup('adventurePlayer');

  assert.equal(
    loaded.some(source => /vocabularyQuestionTypesRepeatBootstrap\.js\?adventureLoaderRecovery=1/.test(source)),
    true
  );
  assert.equal(loaded.includes('js/vocabularyAdventurePlayer.js'), true);
  assert.equal(await context.loadFeatureGroup('teacherTools'), 'loaded:teacherTools');
});

test('adventure loader clears a failed recovery so the next click can retry', async () => {
  const recoverySources = [];
  let recoveryRun = 0;
  const { context } = createRuntimePatchHarness({
    async loadFeatureGroup() {
      throw new Error('poisoned base promise');
    },
    async loadFeatureScript(source) {
      if (!/vocabularyQuestionTypesRepeatBootstrap\.js\?adventureLoaderRecovery=/.test(source)) return;
      recoverySources.push(source);
      recoveryRun += 1;
      const run = recoveryRun;
      context.VocabularyQuestionTypesRepeatPatch = {
        async loadFeatureGroup() {
          if (run === 1) throw new Error('network still unavailable');
        }
      };
    }
  });

  await assert.rejects(context.loadFeatureGroup('adventurePlayer'), /network still unavailable/);
  await context.loadFeatureGroup('adventurePlayer');

  assert.equal(recoverySources.length, 2);
  assert.notEqual(recoverySources[0], recoverySources[1]);
});
