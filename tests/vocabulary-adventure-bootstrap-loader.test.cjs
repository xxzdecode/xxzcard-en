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
const lazyFeaturesSource = fs.readFileSync(
  path.join(__dirname, '../js/lazyFeatures.js'),
  'utf8'
);
const mainSource = fs.readFileSync(
  path.join(__dirname, '../js/main.js'),
  'utf8'
);
const mainLoaderEnd = mainSource.indexOf('// Record the latest selected choice');
assert.notEqual(mainLoaderEnd, -1);
const mainLoaderSource = mainSource.slice(0, mainLoaderEnd);

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
  if (source === 'data/vocabularyLessonAssets.js') {
    context.VocabularyLessonAssets = {};
  }
  if (source === 'js/vocabularyPracticeUI.js') {
    context.VocabularyPracticeUI = { afterFeatureGroup() {} };
  }
  if (source === 'js/vocabularyFeedbackErrorUI.js') {
    context.VocabularyFeedbackErrorUI = { afterFeatureGroup() {} };
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

function createElement(tagName = 'div') {
  const listeners = new Map();
  const attributes = new Map();
  return {
    tagName: String(tagName).toUpperCase(),
    dataset: {},
    style: {},
    children: [],
    hidden: false,
    textContent: '',
    onload: null,
    onerror: null,
    removed: false,
    get firstChild() {
      return this.children[0] || null;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      return child;
    },
    replaceChildren(...children) {
      this.children = [...children];
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    click() {
      const listener = listeners.get('click');
      return listener ? listener() : undefined;
    },
    querySelector() {
      return null;
    }
  };
}

function createEntryHarness(onScript) {
  const elements = new Map([
    ['vocabularyAdventurePreviewEntry', createElement('button')],
    ['vocabularyAdventureHomeStatus', createElement('span')],
    ['studentHomeNotice', createElement('div')]
  ]);
  elements.get('studentHomeNotice').hidden = true;

  const document = {
    readyState: 'complete',
    head: {
      appendChild(script) {
        onScript(script, context);
        return script;
      }
    },
    body: createElement('body'),
    createElement,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    addEventListener() {}
  };

  const context = {
    document,
    console: { error() {}, warn() {} },
    alert() {},
    Blob: function Blob() {},
    URL: {
      createObjectURL() { return 'blob:test'; },
      revokeObjectURL() {}
    },
    requestIdleCallback() { return 1; },
    setTimeout,
    clearTimeout,
    loadHome() { return Promise.resolve(); }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(lazyFeaturesSource, context, { filename: 'js/lazyFeatures.js' });
  vm.runInContext(mainLoaderSource, context, { filename: 'js/main.js#loader' });
  return { context, elements };
}

function failFallback(group) {
  throw new Error(`unexpected fallback: ${group}`);
}

function flushTasks() {
  return new Promise(resolve => setImmediate(resolve));
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
    'js/vocabularyFeedbackErrorUI.js'
  ]);
  const { context, warnings } = createHarness(async (source, target) => {
    if (optionalSources.has(source)) throw new Error(`optional failure: ${source}`);
    installLoadedModule(target, source);
  });

  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);
  await flushTasks();

  assert.equal(typeof context.openVocabularyAdventure, 'function');
  assert.equal(warnings.filter(args => args[0] === 'optional vocabulary support unavailable').length, 2);
});

test('required PracticeUI failure blocks entry and retries without reloading core or player', async () => {
  let coreAttempts = 0;
  let playerAttempts = 0;
  let practiceAttempts = 0;
  const { context } = createHarness(async (source, target) => {
    if (source === 'js/vocabularyAdventureCore.js') coreAttempts += 1;
    if (source === 'js/vocabularyAdventurePlayer.js') playerAttempts += 1;
    if (source === 'js/vocabularyPracticeUI.js') {
      practiceAttempts += 1;
      if (practiceAttempts === 1) throw new Error('practice UI temporarily unavailable');
    }
    installLoadedModule(target, source);
  });

  await assert.rejects(
    context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback),
    /practice UI temporarily unavailable/
  );
  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);
  await flushTasks();

  assert.equal(coreAttempts, 1);
  assert.equal(playerAttempts, 1);
  assert.equal(practiceAttempts, 2);
  assert.equal(typeof context.VocabularyPracticeUI?.afterFeatureGroup, 'function');
});

test('a hanging optional helper does not delay the feature-group promise', async () => {
  let releaseSupport;
  const supportGate = new Promise(resolve => {
    releaseSupport = resolve;
  });
  const { context } = createHarness(async (source, target) => {
    installLoadedModule(target, source);
    if (source === 'js/vocabularyFeedbackErrorUI.js') return supportGate;
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
  await flushTasks();
});

test('the real lazy entry and main loader recover through the in-page retry', async () => {
  let coreAttempts = 0;
  let opened = 0;
  const { context, elements } = createEntryHarness((script, target) => {
    const source = script.src;
    if (source === 'js/vocabularyQuestionTypesRepeatBootstrap.js') {
      vm.runInContext(bootstrapSource, target, {
        filename: 'js/vocabularyQuestionTypesRepeatBootstrap.js'
      });
      script.onload();
      return;
    }
    if (source === 'js/vocabularyAdventureCore.js') {
      coreAttempts += 1;
      if (coreAttempts === 1) {
        script.onerror();
        return;
      }
    }
    installLoadedModule(target, source);
    if (source === 'js/vocabularyAdventurePlayer.js') {
      target.openVocabularyAdventure = () => {
        opened += 1;
        return 'opened';
      };
    }
    script.onload();
  });

  const first = await context.openVocabularyAdventure();
  assert.equal(first, null);
  assert.equal(coreAttempts, 1);
  assert.equal(elements.get('vocabularyAdventureHomeStatus').textContent, '点击重试');

  const notice = elements.get('studentHomeNotice');
  assert.equal(notice.hidden, false);
  assert.equal(notice.children.length, 2);
  assert.equal(notice.children[1].textContent, '重新打开');

  const retry = notice.children[1].click();
  assert.equal(await retry, 'opened');
  assert.equal(coreAttempts, 2);
  assert.equal(opened, 1);
  assert.equal(notice.hidden, true);
  assert.equal(elements.get('vocabularyAdventurePreviewEntry').getAttribute('aria-busy'), null);
});

test('real Player re-entry retries required PracticeUI after the lazy handler is cached', async () => {
  let practiceAttempts = 0;
  let opened = 0;
  const { context, elements } = createEntryHarness((script, target) => {
    const source = script.src;
    if (source === 'js/vocabularyQuestionTypesRepeatBootstrap.js') {
      vm.runInContext(bootstrapSource, target, {
        filename: 'js/vocabularyQuestionTypesRepeatBootstrap.js'
      });
      script.onload();
      return;
    }
    if (source === 'js/vocabularyPracticeUI.js') {
      practiceAttempts += 1;
      if (practiceAttempts === 1) {
        script.onerror();
        return;
      }
    }
    installLoadedModule(target, source);
    if (source === 'js/vocabularyAdventurePlayer.js') {
      target.openVocabularyAdventure = () => {
        opened += 1;
        return 'player-opened';
      };
    }
    script.onload();
  });

  assert.equal(await context.openVocabularyAdventure(), null);
  assert.equal(practiceAttempts, 1);
  assert.equal(elements.get('vocabularyAdventureHomeStatus').textContent, '点击重试');
  assert.equal(await context.openVocabularyAdventure(), 'player-opened');
  assert.equal(practiceAttempts, 2);
  assert.equal(opened, 1);
});

test('real Challenge re-entry retries required PracticeUI and remains on the lazy chain', async () => {
  let practiceAttempts = 0;
  let opened = 0;
  const { context } = createEntryHarness((script, target) => {
    const source = script.src;
    if (source === 'js/vocabularyQuestionTypesRepeatBootstrap.js') {
      vm.runInContext(bootstrapSource, target, {
        filename: 'js/vocabularyQuestionTypesRepeatBootstrap.js'
      });
      script.onload();
      return;
    }
    if (source === 'js/vocabularyPracticeUI.js') {
      practiceAttempts += 1;
      if (practiceAttempts === 1) {
        script.onerror();
        return;
      }
    }
    installLoadedModule(target, source);
    if (source === 'js/vocabularyAdventureChallenge.js') {
      target.openVocabularyAdventureChallenge = () => {
        opened += 1;
        return 'challenge-opened';
      };
    }
    script.onload();
  });

  assert.equal(await context.openVocabularyAdventureChallenge(), null);
  assert.equal(practiceAttempts, 1);
  assert.equal(await context.openVocabularyAdventureChallenge(), 'challenge-opened');
  assert.equal(practiceAttempts, 2);
  assert.equal(opened, 1);
});

test('idle preload and a rapid Player click share a failed support load without unhandled rejection', async () => {
  let rejectPractice;
  let practiceAttempts = 0;
  const unhandled = [];
  const onUnhandled = reason => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const { context } = createEntryHarness((script, target) => {
      const source = script.src;
      if (source === 'js/vocabularyQuestionTypesRepeatBootstrap.js') {
        vm.runInContext(bootstrapSource, target, {
          filename: 'js/vocabularyQuestionTypesRepeatBootstrap.js'
        });
        script.onload();
        return;
      }
      if (source === 'js/vocabularyPracticeUI.js') {
        practiceAttempts += 1;
        rejectPractice = () => script.onerror();
        return;
      }
      installLoadedModule(target, source);
      script.onload();
    });

    const preload = context.loadFeatureGroup('adventurePlayer');
    const click = context.openVocabularyAdventure();
    await flushTasks();
    assert.equal(practiceAttempts, 1);
    rejectPractice();
    const [preloadResult, clickResult] = await Promise.allSettled([preload, click]);
    assert.equal(preloadResult.status, 'rejected');
    assert.equal(clickResult.status, 'fulfilled');
    assert.equal(clickResult.value, null);
    await flushTasks();
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('PracticeUI must install its decoding API before either adventure entry can open', async () => {
  const { context } = createHarness(async (source, target) => {
    if (source !== 'js/vocabularyPracticeUI.js') installLoadedModule(target, source);
  });

  await assert.rejects(
    context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback),
    /VocabularyPracticeUI is required/
  );
  await assert.rejects(
    context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventureChallenge', failFallback),
    /VocabularyPracticeUI is required/
  );
});

test('the old runtime recovery wrapper is no longer present', () => {
  const runtimeSource = fs.readFileSync(
    path.join(__dirname, '../js/runtimeStabilityPatch.js'),
    'utf8'
  );
  assert.doesNotMatch(runtimeSource, /adventureLoaderRecovery|installAdventureLoaderRecovery/);
  assert.doesNotMatch(runtimeSource, /vocabularyQuestionTypesRepeatBootstrap\.js\?/);
});
