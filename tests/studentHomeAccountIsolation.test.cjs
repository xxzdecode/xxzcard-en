'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const homeSource = fs.readFileSync(path.join(root, 'js', 'home.js'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'js', 'auth.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const rewardsSource = fs.readFileSync(path.join(root, 'js', 'studentRewards.js'), 'utf8');

function node(id = '') {
  const attributes = new Map();
  return {
    id,
    dataset: {},
    hidden: false,
    disabled: false,
    textContent: '',
    src: '',
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || ''; },
    querySelector() { return null; }
  };
}

const sources = ['adventure', 'vocabularyChallenge', 'grammarChallenge', 'classroomPractice'];
const cards = sources.map(sourceName => {
  const card = node(`card-${sourceName}`);
  const stamp = node(`stamp-${sourceName}`);
  const chest = node(`chest-${sourceName}`);
  const image = node(`image-${sourceName}`);
  card.dataset.rewardSource = sourceName;
  card.querySelector = selector => {
    if (selector === '.student-home-card__stamp') return stamp;
    if (selector === '.student-reward-chest') return chest;
    return null;
  };
  chest.querySelector = selector => selector === 'img' ? image : null;
  return { sourceName, card, stamp, chest, image };
});

const elements = new Map([
  ['studentDashboard', node('studentDashboard')],
  ['studentSummaryName', node('studentSummaryName')],
  ['studentSummaryAvatarImage', node('studentSummaryAvatarImage')],
  ['studentRewardUnavailable', node('studentRewardUnavailable')],
  ['studentRewardValues', node('studentRewardValues')],
  ['vocabularyAdventureHomeStatus', node('vocabularyAdventureHomeStatus')],
  ['vocabularyAdventureChallengeHomeSub', node('vocabularyAdventureChallengeHomeSub')],
  ['grammarChallengeHomeStatus', node('grammarChallengeHomeStatus')],
  ['studentClassroomPracticeStatus', node('studentClassroomPracticeStatus')],
  ['studentClassroomPracticeEntry', node('studentClassroomPracticeEntry')]
]);

const context = vm.createContext({
  console,
  currentUser: 'sister',
  isTeacher: () => false,
  renderStudentRewardSummary: () => { throw new Error('mismatched record must not render'); },
  document: {
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      return selector === '.student-home-card[data-reward-source]' ? cards.map(entry => entry.card) : [];
    }
  },
  Date,
  Map,
  Object,
  String,
  Number,
  Promise
});
context.globalThis = context;
context.window = context;
vm.runInContext(homeSource, context, { filename: 'home.js' });

function markCompleted(owner) {
  cards.forEach(({ card, stamp, chest, image }) => {
    card.dataset.rewardUser = owner;
    card.dataset.rewardState = 'claimed';
    card.dataset.completed = 'true';
    stamp.hidden = false;
    chest.dataset.rewardUser = owner;
    chest.dataset.state = 'claimed';
    chest.disabled = false;
    image.src = 'assets/student-home/home-v4/ui/chest-claimed.png';
  });
}

function assertNeutral(owner) {
  assert.equal(elements.get('studentDashboard').dataset.homeOwner, owner);
  assert.match(elements.get('studentDashboard').dataset.homeContext, new RegExp(`^${owner}\\|\\d{4}-\\d{2}-\\d{2}$`));
  cards.forEach(({ card, stamp, chest, image }) => {
    assert.equal(card.dataset.rewardUser, owner);
    assert.equal(card.dataset.rewardState, 'idle');
    assert.equal(card.dataset.completed, 'false');
    assert.equal(stamp.hidden, true);
    assert.equal(chest.dataset.rewardUser, owner);
    assert.equal(chest.dataset.state, 'idle');
    assert.equal(chest.disabled, true);
    assert.equal(chest.dataset.homeContext, elements.get('studentDashboard').dataset.homeContext);
    assert.match(image.src, /chest-idle\.png$/);
  });
}

// Rapid sister -> brother -> sister switching invalidates both previous async requests.
markCompleted('sister');
context.currentUser = 'brother';
context.resetStudentHomeAccountView('brother');
const brotherRequest = context.getStudentHomeRenderContext();
assertNeutral('brother');
context.currentUser = 'sister';
context.resetStudentHomeAccountView('sister');
const sisterRequest = context.getStudentHomeRenderContext();
assertNeutral('sister');
assert.equal(context.isStudentHomeRenderContextCurrent(brotherRequest), false);
assert.equal(context.isStudentHomeRenderContextCurrent(sisterRequest), true);

// An offline mirror whose embedded owner is absent or wrong cannot paint the current dashboard.
assert.equal(context.applyStudentRewardRecord({ owner: 'brother', totalCoins: 99, daily: {} }, sisterRequest), false);
assert.equal(context.applyStudentRewardRecord({ totalCoins: 99, daily: {} }, sisterRequest), false);
assert.equal(context.applyStudentClassroomPracticeHomeRecord({ owner: 'brother', status: 'completed' }, sisterRequest), false);
assert.equal(elements.get('studentClassroomPracticeStatus').textContent, '正在读取');
assert.equal(context.applyStudentClassroomPracticeHomeRecord(null, sisterRequest, false), true);
assert.equal(elements.get('studentClassroomPracticeStatus').textContent, '状态暂不可用');
assert.equal(elements.get('studentClassroomPracticeEntry').disabled, true);

assert.match(authSource, /currentUser = user;[\s\S]*?resetStudentHomeAccountView\(user\);[\s\S]*?loadHome\(\);/);
assert.match(mainSource, /beginStudentHomeRenderContext\(user\)/);
assert.match(mainSource, /updateVocabularyAdventurePreviewEntry\(context\)/);
assert.match(rewardsSource, /button\?\.dataset\.homeContext !== expectedContext/);

console.log('student home account-isolation tests passed');
