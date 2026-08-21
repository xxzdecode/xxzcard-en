'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'studentRewards.js'), 'utf8');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function element(id = '') {
  const handlers = new Map();
  return {
    id,
    dataset: {},
    style: { setProperty() {} },
    hidden: false,
    disabled: false,
    textContent: '',
    title: '',
    className: '',
    appendChild() {},
    remove() {},
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, handler) { handlers.set(name, handler); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 44, height: 44 }; },
    trigger(name) { return handlers.get(name)?.({ stopPropagation() {} }); }
  };
}

const sources = ['adventure', 'vocabularyChallenge', 'grammarChallenge', 'classroomPractice'];
const cards = new Map();
const chests = [];
for (const sourceName of sources) {
  const card = element(`card-${sourceName}`);
  card.dataset.rewardSource = sourceName;
  const chest = element(`chest-${sourceName}`);
  const image = element(`image-${sourceName}`);
  chest.dataset.rewardSource = sourceName;
  chest.querySelector = selector => selector === 'img' ? image : null;
  chest.closest = selector => selector === '.student-home-card' ? card : null;
  card.querySelector = selector => selector === '.student-reward-chest' ? chest : null;
  cards.set(sourceName, card);
  chests.push(chest);
}

const elements = new Map([
  ['studentDashboard', element('studentDashboard')],
  ['studentHomeNotice', element('studentHomeNotice')],
  ['studentSummaryTag', element('studentSummaryTag')],
  ['vocabularyAdventureHomeStatus', element('vocabularyAdventureHomeStatus')],
  ['vocabularyAdventureChallengeHomeSub', element('vocabularyAdventureChallengeHomeSub')],
  ['grammarChallengeHomeStatus', element('grammarChallengeHomeStatus')],
  ['studentClassroomPracticeStatus', element('studentClassroomPracticeStatus')]
]);

const document = {
  head: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
  body: { appendChild() {} },
  createElement() { return element(); },
  getElementById(id) { return elements.get(id) || null; },
  querySelector(selector) {
    const match = /data-reward-source="([^"]+)"/.exec(selector);
    return match ? cards.get(match[1]) || null : null;
  },
  querySelectorAll(selector) { return selector === '.student-reward-chest' ? chests : []; }
};

let resolveSister;
let delaySister = true;
let remoteCalls = 0;
let savedRecord = null;
let resolveSave;
let savePromise = new Promise(resolve => { resolveSave = resolve; });

const context = vm.createContext({
  console,
  document,
  currentUser: 'sister',
  isTeacher: () => false,
  loadHome: async () => true,
  getMirrorValue: () => null,
  renderStudentRewardSummary(summary) { this.__renderedSummaries.push(clone(summary)); },
  __renderedSummaries: [],
  sbGet: async () => null,
  sbGetRemote: async key => {
    remoteCalls += 1;
    if (key === 'student_reward_v1_sister' && delaySister) {
      return new Promise(resolve => { resolveSister = resolve; });
    }
    if (key === 'student_reward_v1_brother') return clone(context.__brotherRecord);
    return null;
  },
  sbSet: async (_key, value) => {
    savedRecord = clone(value);
    context.__brotherRecord = clone(value);
    resolveSave();
    return true;
  },
  setInterval: () => 1,
  clearInterval() {},
  setTimeout: () => 1,
  clearTimeout() {},
  matchMedia: () => ({ matches: true }),
  Date,
  Math,
  JSON,
  Object,
  Array,
  Number,
  String,
  Promise,
  Map,
  Set
});
context.globalThis = context;
context.window = context;
vm.runInContext(source, context, { filename: 'studentRewards.js' });

(async () => {
  const today = context.StudentRewards.dateKey();
  context.__brotherRecord = {
    owner: 'brother',
    totalCoins: 50,
    daily: {
      [today]: {
        coins: 0,
        sources: { adventure: 0 },
        claims: { adventure: { status: 'pending', amount: 5, mode: 'set' } }
      }
    },
    transactions: []
  };

  const staleSisterLoad = context.loadStudentRewardSummary();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(typeof resolveSister, 'function');
  context.currentUser = 'brother';
  delaySister = false;
  resolveSister({ owner: 'sister', totalCoins: 999, daily: {}, transactions: [] });
  await staleSisterLoad;
  assert.equal(context.__renderedSummaries.length, 0, 'stale sister response must not render for brother');

  await context.loadStudentRewardSummary();
  assert.equal(context.__renderedSummaries.length, 1);
  assert.equal(elements.get('studentDashboard').dataset.rewardUser, 'brother');
  assert.equal(cards.get('adventure').dataset.rewardUser, 'brother');
  assert.equal(chests[0].dataset.rewardUser, 'brother');

  chests[0].trigger('click');
  await savePromise;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(savedRecord.owner, 'brother');
  assert.equal(savedRecord.totalCoins, 55);
  assert.equal(savedRecord.daily[today].claims.adventure.status, 'claimed');

  const callsBeforeStaleClick = remoteCalls;
  context.currentUser = 'sister';
  chests[0].dataset.rewardUser = 'brother';
  cards.get('adventure').dataset.rewardUser = 'brother';
  savePromise = new Promise(resolve => { resolveSave = resolve; });
  chests[0].trigger('click');
  await Promise.resolve();
  assert.equal(remoteCalls, callsBeforeStaleClick, 'a brother chest must not read or write after switching to sister');
  assert.equal(elements.get('studentHomeNotice').textContent, '账号已切换，请刷新后再领取');

  console.log('student reward owner isolation tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
