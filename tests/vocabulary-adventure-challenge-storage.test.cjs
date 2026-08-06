'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const challenge = require('../js/vocabularyAdventureChallenge.js');

const root = path.resolve(__dirname, '..');
const challengeSource = fs.readFileSync(path.join(root, 'js', 'vocabularyAdventureChallenge.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal(
  (challengeSource.match(/saveCurrentVocabularyAdventureState\([^;]+\{ queue: true \}\)/g) || []).length,
  4,
  'challenge start, answer, retry, and exit must all use local-first queued saves'
);
assert.match(html, /id="vocabularyAdventureChallengeSyncStatus" aria-live="polite"/);

function createElement() {
  const attributes = new Map();
  return {
    dataset: {},
    style: {},
    hidden: false,
    disabled: false,
    textContent: '',
    innerHTML: '',
    onclick: null,
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createCandidates() {
  return Array.from({ length: 12 }, (_, index) => {
    const word = `trail${index}`;
    return {
      key: word,
      card: {
        word,
        meaning: `探险词${index}`,
        phonetic: `/treɪl${index}/`,
        collocations: [{
          phrase: `${word} practice`,
          example: `We use ${word} in class today.`
        }]
      }
    };
  });
}

function createState(candidates) {
  return {
    version: 1,
    words: Object.fromEntries(candidates.map(candidate => [candidate.key, {
      lastResult: 'D',
      intervalIndex: 1,
      lastReviewedAt: '2026-08-01T00:00:00.000Z',
      nextReviewAt: '2026-08-04',
      reviewCount: 1,
      lastTaskType: '',
      challengeFlagAt: ''
    }])),
    session: null
  };
}

test('challenge waits for a remote read and durable plan save before rendering question one', async () => {
  const ids = [
    'studentDashboard',
    'vocabularyAdventurePreviewEntry',
    'vocabularyAdventureChallengeEntry',
    'vocabularyAdventureChallengeHomeTitle',
    'vocabularyAdventureChallengeHomeSub',
    'vocabularyAdventureChallengeBody',
    'vocabularyAdventureChallengeFeedbackText',
    'vocabularyAdventureChallengeAction',
    'vocabularyAdventureChallengeCount',
    'vocabularyAdventureChallengeFill'
  ];
  const elements = new Map(ids.map(id => [id, createElement()]));
  const candidates = createCandidates();
  const initialState = createState(candidates);
  let remoteAvailable = false;
  let saveAvailable = false;
  let saveAttempts = 0;
  let durableState = null;

  global.window = global;
  global.document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll() {
      return [];
    }
  };
  global.currentUser = 'sister';
  global.showScreen = () => {};
  global.collectVisibleVocabularyAdventureCandidates = () => candidates;
  global.loadVocabularyAdventureState = async (_user, options) => {
    if (options && options.requireRemote && !remoteAvailable) {
      throw Object.assign(new Error('offline'), { code: 'NETWORK_OFFLINE' });
    }
    return structuredClone(initialState);
  };
  global.saveCurrentVocabularyAdventureState = async value => {
    saveAttempts += 1;
    if (!saveAvailable) return false;
    durableState = structuredClone(value);
    return true;
  };
  global.speakWord = () => {};

  const api = challenge.createVocabularyAdventureChallengeBrowserApi();
  Object.assign(global, api);

  global.__sbConnectionOnline = false;
  await api.updateVocabularyAdventurePreviewEntry();
  assert.equal(elements.get('vocabularyAdventureChallengeEntry').dataset.state, 'storage-unavailable');
  assert.equal(elements.get('vocabularyAdventureChallengeEntry').disabled, false);
  assert.equal(elements.get('vocabularyAdventureChallengeHomeSub').textContent, '云端连接异常 · 点击重试');
  global.__sbConnectionOnline = true;

  const expectedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => expectedErrors.push(args);
  await api.openVocabularyAdventureChallenge();
  console.error = originalConsoleError;
  assert.equal(expectedErrors.length, 1);
  assert.equal(elements.get('vocabularyAdventureChallengeAction').textContent, '重试连接');
  assert.match(elements.get('vocabularyAdventureChallengeFeedbackText').textContent, /必须先可靠保存到云端/);
  assert.doesNotMatch(elements.get('vocabularyAdventureChallengeBody').innerHTML, /vocabulary-adventure-question/);
  assert.equal(saveAttempts, 0);

  remoteAvailable = true;
  await api.retryOpenVocabularyAdventureChallenge();
  assert.equal(elements.get('vocabularyAdventureChallengeAction').textContent, '重新保存');
  assert.doesNotMatch(elements.get('vocabularyAdventureChallengeBody').innerHTML, /vocabulary-adventure-question/);
  assert.equal(saveAttempts, 1);
  assert.equal(durableState, null);

  saveAvailable = true;
  await api.retryVocabularyAdventureChallengeSave();
  assert.equal(saveAttempts, 2);
  assert.equal(durableState.challengeSession.status, 'active');
  assert.equal(durableState.challengeSession.cursor, 0);
  assert.match(elements.get('vocabularyAdventureChallengeBody').innerHTML, /vocabulary-adventure-question/);
});
