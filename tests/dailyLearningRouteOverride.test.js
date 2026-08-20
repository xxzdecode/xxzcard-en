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
assert.equal(api.ASSIGNMENT_PREFIX, 'daily_learning_route_assignment_v1_');
assert.equal(api.OVERRIDE_SYNC_TIMEOUT_MS, 8000);
assert.equal(api.assignmentKey('sister'), 'daily_learning_route_assignment_v1_sister');
assert.equal(api.assignmentKey('brother'), 'daily_learning_route_assignment_v1_brother');
assert.equal(api.mergeRoute(automatic, { dates: {} }, '2026-08-01'), automatic);

const grammar = api.mergeRoute(automatic, {
  dates: { '2026-08-01': { grammarChallenge: practice } }
}, '2026-08-01');
assert.equal(grammar.grammarChallenge.id, 'manual-courseware::courseware-1');
assert.equal(grammar.grammarChallenge.source, 'courseware-practice');
assert.equal(grammar.classroomPractice.id, 'classroom-auto');

const classroom = api.mergeRoute(automatic, {
  dates: { '2026-08-01': { classroomPractice: practice } }
}, '2026-08-01');
assert.equal(classroom.classroomPractice.id, 'courseware-1');
assert.equal(classroom.grammarChallenge.id, 'grammar-auto');

assert.equal(
  api.mergeRoute(automatic, { dates: { '2026-08-02': { grammarChallenge: practice } } }, '2026-08-01'),
  automatic
);

const pinned = api.mergePinnedRoute(automatic, {
  dates: {
    '2026-08-01': {
      grammarChallenge: { id: 'grammar-pinned', title: '固定语法' },
      classroomPractice: { id: 'classroom-pinned', title: '固定随堂', path: 'courseware/pinned.html' },
      updatedAt: '2026-08-01T01:00:00.000Z'
    }
  }
}, '2026-08-01');
assert.equal(pinned.grammarChallenge.id, 'grammar-pinned');
assert.equal(pinned.classroomPractice.id, 'classroom-pinned');
assert.equal(pinned.assignmentPinned.date, '2026-08-01');
assert.equal(api.mergePinnedRoute(automatic, { dates: {} }, '2026-08-01'), automatic);

assert.equal(api.hasPracticeData('<script id="practice-data" type="application/json">{}</script>'), true);
assert.equal(api.hasPracticeData("<div class='practice' id='practice-data'></div>"), true);
assert.equal(api.hasPracticeData('<main id="lesson"></main>'), false);

const wrapper = fs.readFileSync(path.join(root, 'grammar-challenge/practices/courseware-daily.html'), 'utf8');
assert.match(wrapper, /interactionMode:\s*'challenge-locked'/);
assert.match(wrapper, /Math\.min\(10, questions\.length\)/);
assert.match(wrapper, /page-practice-shell\.js/);

const auth = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
assert.match(auth, /dailyLearningRouteOverride\.js/);
assert.match(auth, /document\.write/);

const grammarChallenges = fs.readFileSync(path.join(root, 'js/grammarChallenges.js'), 'utf8');
assert.match(grammarChallenges, /openManualGrammarChallenge/);
assert.match(grammarChallenges, /activeGrammarChallengeId = id/);

const overrideRuntime = fs.readFileSync(path.join(root, 'js/dailyLearningRouteOverride.js'), 'utf8');
const coursewareData = fs.readFileSync(path.join(root, 'js/courseware-data.js'), 'utf8');
assert.match(overrideRuntime, /root\.openManualGrammarChallenge = openManualGrammar/);
assert.match(overrideRuntime, /Promise\.race/);
assert.match(overrideRuntime, /AbortController/);
assert.match(overrideRuntime, /option\.disabled = check\.state !== 'compatible'/);
assert.match(overrideRuntime, /typeof item\.grammarCompatible === 'boolean'/);
assert.match(overrideRuntime, /另有 \$\{unverifiedCount\} 条暂时无法验证/);
assert.equal((coursewareData.match(/"grammarCompatible": true/g) || []).length, 19);
assert.equal((coursewareData.match(/"grammarCompatible": false/g) || []).length, 5);
assert.match(overrideRuntime, /ensurePinnedSlot/);
assert.match(overrideRuntime, /openStudentGrammarChallenge/);
assert.match(overrideRuntime, /openStudentClassroomPractice/);
assert.match(overrideRuntime, /grammar_challenge_active_v2_/);
assert.match(overrideRuntime, /classroom_practice_daily_v1_/);
assert.doesNotMatch(overrideRuntime, /patchGrammarLoader/);

async function testFreshOverrideRefreshesStaleDeviceCacheWithoutBlockingRoute() {
  const now = new Date();
  const testDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const storage = new Map();
  storage.set('daily_learning_route_override_cache_v1', JSON.stringify({
    schemaVersion: 1,
    dates: {
      [testDate]: {
        grammarChallenge: { practiceId: 'grammar-old', title: '旧语法随堂练习', path: 'courseware/old-grammar.html' },
        classroomPractice: { practiceId: 'classroom-old', title: '旧随堂练习', path: 'courseware/old-classroom.html' }
      }
    }
  }));
  const freshOverride = {
    schemaVersion: 1,
    dates: {
      [testDate]: {
        grammarChallenge: { practiceId: 'grammar-new', title: '新语法随堂练习', path: 'courseware/new-grammar.html' },
        classroomPractice: { practiceId: 'classroom-new', title: '新随堂练习', path: 'courseware/new-classroom.html' }
      }
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
  let routeRefreshes = 0;
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
    loadDailyLearningRoute() { routeRefreshes += 1; return Promise.resolve(); },
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
  assert.equal(route.grammarChallenge.id, 'manual-courseware::grammar-old');
  assert.equal(route.classroomPractice.id, 'classroom-old');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(
    JSON.parse(storage.get('daily_learning_route_override_cache_v1')).dates[testDate].grammarChallenge.practiceId,
    'grammar-new'
  );
  const refreshTimer = timers.find(timer => timer.delay === 150 && !timer.cleared);
  assert.ok(refreshTimer, 'fresh cloud override should schedule a non-blocking route redraw');
  refreshTimer.callback();
  assert.equal(routeRefreshes, 1);
}

testFreshOverrideRefreshesStaleDeviceCacheWithoutBlockingRoute()
  .then(() => console.log('daily learning route override tests passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
