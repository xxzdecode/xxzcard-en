const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const api = require(path.join(root, 'js/dailyLearningRouteOverride.js'));

const automatic = {
  grammarChallenge: { id: 'grammar-auto', title: '自动语法' },
  classroomPractice: { id: 'classroom-auto', title: '自动随堂' }
};
const practice = {
  practiceId: 'courseware-1',
  title: '26.08.01｜示例随堂练习',
  path: 'courseware/example.html'
};

assert.equal(api.KEY, 'daily_learning_route_override_v1');
assert.equal(api.PREFIX, 'manual-courseware::');
assert.equal(api.mergeRoute(automatic, { dates: {} }, '2026-08-01'), automatic);

const grammar = api.mergeRoute(automatic, {
  current: { grammarChallenge: practice, updatedAt: '2026-08-01T01:00:00.000Z' }
});
assert.equal(grammar.grammarChallenge.id, 'manual-courseware::courseware-1');
assert.equal(grammar.grammarChallenge.source, 'courseware-practice');
assert.equal(grammar.classroomPractice.id, 'classroom-auto');

const classroom = api.mergeRoute(automatic, {
  current: { classroomPractice: practice, updatedAt: '2026-08-01T01:00:00.000Z' }
});
assert.equal(classroom.classroomPractice.id, 'courseware-1');
assert.equal(classroom.grammarChallenge.id, 'grammar-auto');

const newerStaticRoute = { ...automatic, updatedAt: '2026-08-20T13:35:00.000Z' };
const manualWins = api.mergeRoute(newerStaticRoute, {
  current: {
    grammarChallenge: practice,
    updatedAt: '2026-08-20T12:00:00.000Z'
  }
});
assert.equal(manualWins.grammarChallenge.id, 'manual-courseware::courseware-1');
assert.equal(manualWins.updatedAt, '2026-08-20T12:00:00.000Z', 'manual selection is the only route authority');

const migrated = api.normalize({
  dates: {
    '2026-08-01': { grammarChallenge: { ...practice, practiceId: 'old' }, updatedAt: '2026-08-01T01:00:00.000Z' },
    '2026-08-02': { grammarChallenge: practice, updatedAt: '2026-08-02T01:00:00.000Z' }
  }
});
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.current.grammarChallenge.practiceId, 'courseware-1');

const deployedRoute = JSON.parse(fs.readFileSync(path.join(root, 'data/daily-learning-route.json'), 'utf8'));
assert.equal(deployedRoute.grammarChallenge.id, 'manual-courseware::courseware-2026-08-04');
assert.equal(deployedRoute.classroomPractice.id, 'courseware-2026-08-06');

assert.equal(api.hasPracticeData('<script id="practice-data" type="application/json">{}</script>'), true);
assert.equal(api.hasPracticeData("<div class='practice' id='practice-data'></div>"), true);
assert.equal(api.hasPracticeData('<main id="lesson"></main>'), false);

const wrapper = fs.readFileSync(path.join(root, 'grammar-challenge/practices/courseware-daily.html'), 'utf8');
assert.match(wrapper, /interactionMode:\s*'challenge-locked'/);
assert.match(wrapper, /Math\.min\(10, questions\.length\)/);
assert.match(wrapper, /page-practice-shell\.js/);

const auth = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
assert.doesNotMatch(auth, /dailyLearningRouteOverride\.js/);
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
assert.match(main, /await loadFeatureScript\('js\/dailyLearningRouteOverride\.js'\)/);
assert.ok(
  main.indexOf("await loadFeatureScript('js/dailyLearningRouteOverride.js')")
    < main.indexOf('window.__dailyLearningRoutePrefetchPromise = fetch'),
  'manual selection authority must load before route prefetch'
);

const grammarChallenges = fs.readFileSync(path.join(root, 'js/grammarChallenges.js'), 'utf8');
assert.match(grammarChallenges, /openManualGrammarChallenge/);
assert.match(grammarChallenges, /activeGrammarChallengeId = id/);

const overrideRuntime = fs.readFileSync(path.join(root, 'js/dailyLearningRouteOverride.js'), 'utf8');
const coursewareData = fs.readFileSync(path.join(root, 'js/courseware-data.js'), 'utf8');
assert.match(overrideRuntime, /root\.openManualGrammarChallenge = openManualGrammar/);
assert.match(overrideRuntime, /Promise\.race/);
assert.match(overrideRuntime, /AbortController/);
assert.match(overrideRuntime, /schemaVersion:\s*2/);
assert.match(overrideRuntime, /manualSelection:/);
assert.equal((coursewareData.match(/"grammarCompatible": true/g) || []).length, 19);
assert.equal((coursewareData.match(/"grammarCompatible": false/g) || []).length, 5);
assert.doesNotMatch(overrideRuntime, /ensurePinnedSlot/);
assert.doesNotMatch(overrideRuntime, /daily_learning_route_assignment_v1_/);
assert.doesNotMatch(overrideRuntime, /patchGrammarLoader/);

async function testFreshSelectionWinsDuringColdStart() {
  const now = new Date();
  const testDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const storage = new Map();
  storage.set('daily_learning_route_override_cache_v1', JSON.stringify({
    schemaVersion: 2,
    current: {
      grammarChallenge: { practiceId: 'grammar-old', title: '旧语法随堂练习', path: 'courseware/old-grammar.html' },
      classroomPractice: { practiceId: 'classroom-old', title: '旧随堂练习', path: 'courseware/old-classroom.html' },
      updatedAt: '2026-08-20T01:00:00.000Z'
    }
  }));
  const freshOverride = {
    schemaVersion: 2,
    current: {
      grammarChallenge: { practiceId: 'grammar-new', title: '新语法随堂练习', path: 'courseware/new-grammar.html' },
      classroomPractice: { practiceId: 'classroom-new', title: '新随堂练习', path: 'courseware/new-classroom.html' },
      updatedAt: '2026-08-21T01:00:00.000Z'
    }
  };
  const baseFetch = async input => {
    const url = String(input);
    if (url.includes('/rest/v1/kv_store')) {
      return new Response(JSON.stringify([{ value: freshOverride }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(automatic), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const timers = [];
  const context = {
    AbortController,
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    Response,
    URL,
    console,
    document: {
      addEventListener() {},
      getElementById() { return null; }
    },
    dispatchEvent() {},
    fetch: baseFetch,
    location: { href: 'https://example.test/index.html' },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    SB_HEADERS: {},
    SB_URL: 'https://example.supabase.test',
    loadDailyLearningRoute() { return Promise.resolve(); },
    setTimeout(callback, delay) {
      timers.push({ callback, delay, cleared: false });
      return timers.length;
    },
    clearTimeout(id) {
      if (timers[id - 1]) timers[id - 1].cleared = true;
    }
  };
  context.globalThis = context;
  vm.runInNewContext(overrideRuntime, context, { filename: 'dailyLearningRouteOverride.js' });

  const response = await context.fetch('data/daily-learning-route.json');
  const route = await response.json();
  assert.equal(route.grammarChallenge.id, 'manual-courseware::grammar-new');
  assert.equal(route.classroomPractice.id, 'classroom-new');
  assert.equal(
    JSON.parse(storage.get('daily_learning_route_override_cache_v1')).current.grammarChallenge.practiceId,
    'grammar-new'
  );
}

async function testCachedSelectionSurvivesOfflineColdStart() {
  const storage = new Map();
  storage.set('daily_learning_route_cache_v1', JSON.stringify({
    version: 1,
    route: automatic
  }));
  storage.set('daily_learning_route_override_cache_v1', JSON.stringify({
    schemaVersion: 2,
    current: {
      grammarChallenge: { practiceId: 'grammar-cached', title: '已保存语法随堂练习', path: 'courseware/cached-grammar.html' },
      classroomPractice: { practiceId: 'classroom-cached', title: '已保存随堂练习', path: 'courseware/cached-classroom.html' },
      updatedAt: '2026-08-21T02:00:00.000Z'
    }
  }));
  const baseFetch = async () => { throw new Error('offline'); };
  const context = {
    AbortController,
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    Response,
    URL,
    console,
    document: { addEventListener() {}, getElementById() { return null; } },
    dispatchEvent() {},
    fetch: baseFetch,
    location: { href: 'https://example.test/index.html' },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    SB_HEADERS: {},
    SB_URL: 'https://example.supabase.test',
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  context.globalThis = context;
  vm.runInNewContext(overrideRuntime, context, { filename: 'dailyLearningRouteOverride.js' });

  const response = await context.fetch('data/daily-learning-route.json');
  assert.equal(response.status, 200);
  const route = await response.json();
  assert.equal(route.grammarChallenge.id, 'manual-courseware::grammar-cached');
  assert.equal(route.classroomPractice.id, 'classroom-cached');
}

Promise.all([
  testFreshSelectionWinsDuringColdStart(),
  testCachedSelectionSurvivesOfflineColdStart()
])
  .then(() => console.log('daily learning route override tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
