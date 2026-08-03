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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

function createHarness(loadFeatureScript, extras = {}) {
  const warnings = [];
  const context = {
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    loadFeatureScript: null,
    ...extras
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
  let ownText = '';
  const element = {
    tagName: String(tagName).toUpperCase(),
    dataset: {},
    style: {},
    children: [],
    hidden: false,
    className: '',
    onload: null,
    onerror: null,
    removed: false,
    get textContent() {
      return ownText + this.children.map(child => String(child && child.textContent || '')).join('');
    },
    set textContent(value) {
      ownText = String(value == null ? '' : value);
      this.children = [];
    },
    get firstChild() {
      return this.children[0] || null;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...children) {
      children.forEach(child => this.appendChild(child));
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      return child;
    },
    replaceChildren(...children) {
      ownText = '';
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
      return listener ? listener({ target: this }) : undefined;
    },
    matches() {
      return false;
    },
    closest() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  return element;
}

function createEntryHarness(onScript) {
  const idleCallbacks = [];
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
    requestIdleCallback(callback) {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    },
    setTimeout,
    clearTimeout,
    loadHome() { return Promise.resolve(); }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(lazyFeaturesSource, context, { filename: 'js/lazyFeatures.js' });
  vm.runInContext(mainLoaderSource, context, { filename: 'js/main.js#loader' });
  return { context, elements, idleCallbacks };
}

function createFallbackDocument() {
  const bodies = new Map();
  const document = {
    createElement,
    getElementById(id) {
      return bodies.get(id) || null;
    }
  };

  function makePrompt(raw, bodyId) {
    const label = createElement('div');
    const question = createElement('section');
    question.className = 'vocabulary-adventure-question';
    question.querySelector = () => label;

    const prompt = createElement('div');
    prompt.className = 'vocabulary-adventure-prompt-text';
    prompt.textContent = raw;
    prompt.matches = selector => selector === '.vocabulary-adventure-prompt-text';
    prompt.closest = selector => selector === '.vocabulary-adventure-question' ? question : null;

    const option = createElement('button');
    let optionClicks = 0;
    option.addEventListener('click', () => { optionClicks += 1; });

    const body = createElement('div');
    body.querySelectorAll = selector => selector === '.vocabulary-adventure-prompt-text'
      ? [prompt]
      : [];
    bodies.set(bodyId, body);
    return { body, prompt, label, option, optionClicks: () => optionClicks };
  }

  return { document, makePrompt };
}

function failFallback(group) {
  throw new Error(`unexpected fallback: ${group}`);
}

function flushTasks() {
  return new Promise(resolve => setImmediate(resolve));
}

async function flushSupport() {
  await flushTasks();
  await flushTasks();
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

test('a failed player script clears only the player feature promise and keeps the base cache', async () => {
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

test('optional support failures do not block the player entry', async () => {
  const optionalSources = new Set([
    'data/vocabularyLessonAssets.js',
    'js/vocabularyPracticeUI.js',
    'js/vocabularyFeedbackErrorUI.js'
  ]);
  const { context, warnings } = createHarness(async (source, target) => {
    if (optionalSources.has(source)) throw new Error(`optional failure: ${source}`);
    installLoadedModule(target, source);
  });

  const result = await Promise.race([
    context.VocabularyQuestionTypesRepeatPatch
      .loadFeatureGroup('adventurePlayer', failFallback)
      .then(() => context.openVocabularyAdventure())
      .then(() => 'opened'),
    new Promise(resolve => setTimeout(() => resolve('timed-out'), 50))
  ]);
  await flushSupport();

  assert.equal(result, 'opened');
  assert.equal(warnings.filter(args => args[0] === 'optional vocabulary support unavailable').length, 3);
});

test('the real openVocabularyAdventure entry retries PracticeUI after a first failure', async () => {
  let practiceAttempts = 0;
  let coreAttempts = 0;
  let playerAttempts = 0;
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
    if (source === 'js/vocabularyAdventureCore.js') coreAttempts += 1;
    if (source === 'js/vocabularyAdventurePlayer.js') playerAttempts += 1;
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
        return 'opened';
      };
    }
    script.onload();
  });

  assert.equal(await context.openVocabularyAdventure(), 'opened');
  await flushSupport();
  assert.equal(practiceAttempts, 1);

  assert.equal(await context.openVocabularyAdventure(), 'opened');
  await flushSupport();

  assert.equal(practiceAttempts, 2);
  assert.equal(coreAttempts, 1);
  assert.equal(playerAttempts, 1);
  assert.equal(opened, 2);
});

test('idle preload and a fast click share one failing support promise without unhandled rejection', async () => {
  let practiceAttempts = 0;
  let pendingPracticeScript = null;
  let opened = 0;
  const unhandled = [];
  const listener = reason => unhandled.push(reason);
  process.on('unhandledRejection', listener);

  try {
    const { context, idleCallbacks } = createEntryHarness((script, target) => {
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
        pendingPracticeScript = script;
        return;
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

    assert.equal(idleCallbacks.length, 1);
    const preload = idleCallbacks[0]();
    const click = context.openVocabularyAdventure();
    await flushTasks();
    assert.equal(practiceAttempts, 1);
    assert.ok(pendingPracticeScript);

    pendingPracticeScript.onerror();
    assert.equal(await click, 'opened');
    await preload;
    await flushSupport();

    assert.equal(practiceAttempts, 1);
    assert.equal(opened, 1);
    assert.equal(unhandled.length, 0);
  } finally {
    process.removeListener('unhandledRejection', listener);
  }
});

test('concurrent player entries create one support promise and activate UI once', async () => {
  const gate = deferred();
  let practiceLoads = 0;
  let practiceActivations = 0;
  let opens = 0;
  const { context } = createHarness(async (source, target) => {
    if (source === 'js/vocabularyPracticeUI.js') {
      practiceLoads += 1;
      target.VocabularyPracticeUI = {
        afterFeatureGroup(group) {
          assert.equal(group, 'adventurePlayer');
          practiceActivations += 1;
        }
      };
      return gate.promise;
    }
    installLoadedModule(target, source);
    if (source === 'js/vocabularyAdventurePlayer.js') {
      target.openVocabularyAdventure = () => {
        opens += 1;
        return true;
      };
    }
  });

  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);
  const first = context.openVocabularyAdventure();
  const second = context.openVocabularyAdventure();
  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(practiceLoads, 1);

  gate.resolve();
  await flushSupport();

  assert.equal(practiceLoads, 1);
  assert.equal(practiceActivations, 1);
  assert.equal(opens, 2);
});

test('native fallback hides encoded audio and missing-letter prompts while answers remain usable', async () => {
  const { document, makePrompt } = createFallbackDocument();
  let spoken = 0;
  const audioCue = `__VOCAB_CUE__:${encodeURIComponent(JSON.stringify({
    taskType: 'audioToMeaning',
    meaning: '猫'
  }))}`;
  const audio = makePrompt(audioCue, 'vocabularyAdventureBody');
  const { context } = createHarness(async (source, target) => {
    if (source === 'js/vocabularyPracticeUI.js') {
      throw new Error('practice UI unavailable');
    }
    installLoadedModule(target, source);
  }, {
    document,
    speakVocabularyAdventureCurrent() {
      spoken += 1;
    }
  });

  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);
  assert.equal(context.openVocabularyAdventure(), true);
  await flushSupport();

  assert.doesNotMatch(audio.prompt.textContent, /__VOCAB_CUE__:/);
  assert.doesNotMatch(audio.prompt.textContent, /猫/);
  assert.match(audio.prompt.textContent, /再听一次/);
  assert.equal(audio.label.textContent, '听一听，选择中文意思');
  audio.prompt.children[0].click();
  assert.equal(spoken, 1);
  audio.option.click();
  assert.equal(audio.optionClicks(), 1);

  const missingCue = `__VOCAB_MISSING__:${encodeURIComponent(JSON.stringify({
    meaning: '猫',
    emoji: '🐱',
    placeholder: '📝',
    maskedWord: 'c_t'
  }))}`;
  const missing = makePrompt(missingCue, 'vocabularyAdventureBody');
  assert.equal(context.openVocabularyAdventure(), true);
  await flushSupport();

  assert.doesNotMatch(missing.prompt.textContent, /__VOCAB_MISSING__:/);
  assert.match(missing.prompt.textContent, /猫/);
  assert.match(missing.prompt.textContent, /🐱/);
  assert.match(missing.prompt.textContent, /c_t/);
  assert.doesNotMatch(missing.prompt.textContent, /cat/);
  assert.equal(missing.label.textContent, '选择缺失字母');
  missing.option.click();
  assert.equal(missing.optionClicks(), 1);
});

test('a Challenge support failure clears only Challenge support state and leaves Player cached', async () => {
  const featureLoads = new Map();
  const activations = { adventurePlayer: 0, adventureChallenge: 0 };
  let failChallengeOnce = true;
  const { context } = createHarness(async (source, target) => {
    featureLoads.set(source, (featureLoads.get(source) || 0) + 1);
    if (source === 'js/vocabularyPracticeUI.js') {
      target.VocabularyPracticeUI = {
        afterFeatureGroup(group) {
          activations[group] += 1;
          if (group === 'adventureChallenge' && failChallengeOnce) {
            failChallengeOnce = false;
            throw new Error('challenge activation failed');
          }
        }
      };
      return;
    }
    installLoadedModule(target, source);
  });

  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventurePlayer', failFallback);
  await flushSupport();
  assert.equal(context.openVocabularyAdventure(), true);
  await flushSupport();

  await context.VocabularyQuestionTypesRepeatPatch.loadFeatureGroup('adventureChallenge', failFallback);
  await flushSupport();
  assert.equal(activations.adventureChallenge, 1);

  assert.equal(await context.openVocabularyAdventureChallenge(), true);
  await flushSupport();
  assert.equal(activations.adventureChallenge, 2);

  assert.equal(context.openVocabularyAdventure(), true);
  await flushSupport();
  assert.equal(activations.adventurePlayer, 1);
  assert.equal(featureLoads.get('js/vocabularyAdventureCore.js'), 1);
  assert.equal(featureLoads.get('js/vocabularyAdventurePlayer.js'), 1);
  assert.equal(featureLoads.get('js/vocabularyAdventureChallenge.js'), 1);
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

test('the old runtime recovery wrapper is no longer present', () => {
  const runtimeSource = fs.readFileSync(
    path.join(__dirname, '../js/runtimeStabilityPatch.js'),
    'utf8'
  );
  assert.doesNotMatch(runtimeSource, /adventureLoaderRecovery|installAdventureLoaderRecovery/);
  assert.doesNotMatch(runtimeSource, /vocabularyQuestionTypesRepeatBootstrap\.js\?/);
  assert.doesNotMatch(bootstrapSource, /void\s+promise\.then\(/);
});
