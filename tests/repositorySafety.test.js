const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const savedLocalValues = new Map();
const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Set,
  String,
  Promise,
  SB_URL: 'https://example.invalid',
  SB_HEADERS: {},
  DEFAULT_CARDS: [],
  appData: { batches: [], pin: null },
  currentUser: 'sister',
  localStorage: {
    getItem: key => savedLocalValues.get(key) || null,
    setItem: (key, value) => savedLocalValues.set(key, value)
  },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {} })
  },
  setTimeout: () => 0,
  setInterval: () => 0,
  alert: () => {},
  normalizeAppData: () => false,
  normalizePhonemeLibrary: () => false,
  findInvalidEnglishCard: () => null,
  isCurrentEnglishCard: () => true,
  normalizeCardDictionary: () => {},
  normalizeEnglishCard: card => card,
  batchTodayISO: () => '2026-07-20',
  todayStr: () => '2026-07-20',
  loadHome: () => {},
  refreshTeacherWordCards: () => {}
});

vm.runInContext(fs.readFileSync(path.join(root, 'js/repository.js'), 'utf8'), context);

function value(expression) {
  return vm.runInContext(expression, context);
}

async function verifyMainWriteSafety() {
  const remote = {
    pin: '0716',
    batches: [{ id: 'remote-1', cards: [] }],
    taskAssignments: [{ date: '2026-07-20' }],
    mixedAssignments: []
  };

  context.__remoteMain = remote;
  context.sbGetRemote = async () => JSON.parse(JSON.stringify(context.__remoteMain));

  value("mainSnapshot = ''");
  await assert.rejects(
    value("ensureMainCanSave({ pin: null, batches: [] })"),
    error => error && error.code === 'MAIN_CONFLICT'
  );
  assert.equal(context.appData.batches[0].id, 'remote-1');

  value('setMainSnapshot(__remoteMain)');
  const intended = JSON.parse(JSON.stringify(remote));
  intended.batches.push({ id: 'new-1', cards: [] });
  context.__intendedMain = intended;
  await value('ensureMainCanSave(__intendedMain)');
  assert.ok(savedLocalValues.has('wc_main_last_good'));

  context.__remoteMain = {
    ...remote,
    batches: [...remote.batches, { id: 'other-device', cards: [] }]
  };
  await assert.rejects(
    value('ensureMainCanSave(__intendedMain)'),
    error => error && error.code === 'MAIN_CONFLICT'
  );
}

verifyMainWriteSafety()
  .then(() => console.log('repository safety tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
