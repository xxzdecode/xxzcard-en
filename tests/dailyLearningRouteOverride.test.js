const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
assert.match(overrideRuntime, /root\.openManualGrammarChallenge = openManualGrammar/);
assert.doesNotMatch(overrideRuntime, /patchGrammarLoader/);

console.log('daily learning route override tests passed');
