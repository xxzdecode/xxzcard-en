'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bootstrapSource = fs.readFileSync(
  path.join(__dirname, '../js/vocabularyQuestionTypesRepeatBootstrap.js'),
  'utf8'
);

function createCore() {
  return {
    normalizeVocabularyAdventureState(value) {
      return value && typeof value === 'object' ? value : { words: {}, session: null };
    },
    prepareVocabularyAdventureResult(value) {
      return value;
    },
    deterministicAdventureShuffle(values) {
      return [...values];
    },
    adventureWordKey(value) {
      return String(value || '').trim().toLowerCase();
    },
    stableAdventureHash() {
      return 0;
    }
  };
}

function createReview() {
  return {
    VocabularyAdventureReviewTypes: {},
    gradeVocabularyAdventureReviewQuestion() {
      return true;
    },
    reviewReasonFromState() {
      return 'due';
    }
  };
}

function installLoadedModule(context, source) {
  if (source === 'js/vocabularyAdventureCore.js') {
    context.VocabularyAdventureCore = createCore();
  }
  if (source === 'js/vocabularyAdventure.js') {
    context.collectVisibleVocabularyAdventureCandidates = () => [];
  }
  if (source === 'js/vocabularyAdventureReview.js') {
    context.VocabularyAdventureReview = createReview();
  }
  if (source === 'js/vocabularyAdventurePlayer.js') {
    context.openVocabularyAdventure = () => true;
  }
  if (source === 'js/vocabularyAdventureChallenge.js') {
    context.openVocabularyAdventureChallenge = () => true;
  }
}

function createHarness(loadFeatureScript) {
  const warnings = [];
  const context = {
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    loadFeatureScript: null
  };
  context.globalThis = context;
  context.window = context;
  context.loadFeatureScript = source => Promise.resolve()
    .then(() => loadFeatureScript(source, context));
  vm.createContext(context);
  vm.runInContext(bootstrapSource, context, {
    filename: 'js/vocabularyQuestionTypesRepeatBootstrap.js'
  });
  return { context, warnings };
}

function failFallback(group) {
  throw new Error(`unexpected fallback: ${group}`);
}

test('a failed base script clears the cached base promise and the same page can retry', async () => {
  const loaded = [];
  let coreAttempts = 0;
  const { context } = createHarness(async (source, target) => {
    loaded.push(source);
    if (source === 'js/vocabularyAdventureCore.js') {
      coreAttempts += 1;
      if (coreAttempts === 1) throw new Error('core temporarily unavailable');
    }
    installLoadedModule(target, source);
  });

  await assert.rejects(
    context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback),
    /core temporarily unavailable/
  );
  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);

  assert.equal(coreAttempts, 2);
  assert.equal(loaded.includes('js/vocabularyAdventurePlayer.js'), true);
  assert.equal(typeof context.openVocabularyAdventure, 'function');
});

test('a failed player script clears only the group promise and retries without rebuilding the base', async () => {
  let coreAttempts = 0;
  let playerAttempts = 0;
  const { context } = createHarness(async (source, target) => {
    if (source === 'js/vocabularyAdventureCore.js') coreAttempts += 1;
    if (source === 'js/vocabularyAdventurePlayer.js') {
      playerAttempts += 1;
      if (playerAttempts === 1) throw new Error('player temporarily unavailable');
    }
    installLoadedModule(target, source);
  });

  await assert.rejects(
    context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback),
    /player temporarily unavailable/
  );
  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);

  assert.equal(coreAttempts, 1);
  assert.equal(playerAttempts, 2);
});

test('optional presentation helpers may fail without blocking the core player', async () => {
  const optionalSources = new Set([
    'data/vocabularyLessonAssets.js',
    'js/vocabularyPracticeUI.js',
    'js/vocabularyFeedbackErrorUI.js'
  ]);
  const { context, warnings } = createHarness(async (source, target) => {
    if (optionalSources.has(source)) throw new Error(`optional failure: ${source}`);
    installLoadedModule(target, source);
  });

  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(typeof context.openVocabularyAdventure, 'function');
  assert.equal(warnings.filter(args => args[0] === 'optional vocabulary support unavailable').length, 3);
});

test('a hanging optional helper does not delay the feature-group promise', async () => {
  let releaseSupport;
  const supportGate = new Promise(resolve => {
    releaseSupport = resolve;
  });
  const { context } = createHarness(async (source, target) => {
    installLoadedModule(target, source);
    if (source === 'js/vocabularyPracticeUI.js') return supportGate;
    return undefined;
  });

  const result = await Promise.race([
    context.VocabularyQuestionTypesRepeatPatch
      .loadFeatureGroup('adventurePlayer', failFallback)
      .then(() => 'loaded'),
    new Promise(resolve => setTimeout(() => resolve('timed-out'), 50))
  ]);

  assert.equal(result, 'loaded');
  releaseSupport();
  await new Promise(resolve => setImmediate(resolve));
});

test('the old runtime recovery wrapper is no longer present', () => {
  const runtimeSource = fs.readFileSync(
    path.join(__dirname, '../js/runtimeStabilityPatch.js'),
    'utf8'
  );
  assert.doesNotMatch(runtimeSource, /adventureLoaderRecovery|installAdventureLoaderRecovery/);
  assert.doesNotMatch(runtimeSource, /vocabularyQuestionTypesRepeatBootstrap\.js\?/);
});
