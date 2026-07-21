const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const topics = readJson('grammar-library/data/topics.json');
const coverage = readJson('grammar-library/data/source-coverage.json');
const initial = readJson('grammar-library/data/initial-progress.json');
const topicKeys = new Set(topics.map(topic => topic.topicKey));

assert.equal(topicKeys.size, topics.length, 'topic_key values must be unique');
assert.equal(new Set(topics.map(topic => topic.sequenceOrder)).size, topics.length, 'sequence_order values must be unique');
topics.forEach(topic => {
  for (const key of ['topicKey', 'titleZh', 'titleEn', 'moduleKey', 'sequenceOrder', 'parentTopicKey', 'category', 'level', 'isAssessableNow', 'tags', 'summary', 'rules', 'examples', 'pitfalls']) {
    assert.notEqual(topic[key], undefined, `${topic.topicKey} is missing ${key}`);
  }
});

assert.deepEqual(countsByCatalog(), { D1: 59, D2: 65, D3: 29 });
assert.equal(new Set(coverage.map(item => item.sourceItemKey)).size, coverage.length, 'source item keys must be unique');
coverage.forEach(item => {
  assert.ok(topicKeys.has(item.topicKey), `${item.sourceItemKey} maps to an unknown topic`);
  assert.ok(item.coverageMode, `${item.sourceItemKey} needs a coverage mode`);
  assert.ok(item.notes, `${item.sourceItemKey} needs notes`);
});
for (let i = 1; i <= 59; i++) assert.ok(coverage.some(item => item.sourceItemKey === `D1-${String(i).padStart(2, '0')}`));
for (let i = 1; i <= 65; i++) assert.ok(coverage.some(item => item.sourceItemKey === `D2-${String(i).padStart(2, '0')}`));

const which = topics.find(topic => topic.topicKey === 'which');
assert.match(which.summary, /哪一个|选择/);
assert.doesNotMatch(which.summary, /谁的/);
for (const advanced of ['past-continuous', 'past-perfect', 'past-perfect-continuous', 'present-perfect-continuous', 'future-continuous', 'future-perfect', 'future-perfect-continuous', 'passive-voice', 'subjunctive-present-contrary', 'infinitives-complex-verbs']) {
  assert.equal(topics.find(topic => topic.topicKey === advanced).level, 'advanced');
}

const initialMap = new Map(initial.map(item => [item.topicKey, item.status]));
for (const key of ['sentence-parts', 'subject-pronouns-be', 'articles', 'simple-present-use', 'third-person-singular', 'simple-present-negative-question']) assert.equal(initialMap.get(key), 'confirmed_complete');
for (const key of ['wh-question-method', 'frequency-adverbs', 'can']) assert.equal(initialMap.get(key), 'needs_review');
for (const key of ['there-be', 'impersonal-it']) assert.equal(initialMap.get(key), 'to_teach');

const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260721230000_create_grammar_knowledge_library.sql'), 'utf8');
for (const table of ['grammar_topics', 'grammar_topic_sources', 'grammar_teaching_progress', 'grammar_progress_events']) assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
assert.match(migration, /security invoker/i);
assert.match(migration, /app_metadata/);
assert.doesNotMatch(migration, /for (insert|update|delete) to anon/i, 'anonymous writes must not be granted');
assert.match(migration, /set_grammar_progress/);

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(index, />知识点库</);
assert.match(index, /grammar-library\/index\.html|js\/grammarLibrary\.js/);

console.log(`grammar library tests passed (${topics.length} topics, ${coverage.length} source mappings)`);

function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function countsByCatalog() { return Object.fromEntries(['D1', 'D2', 'D3'].map(key => [key, coverage.filter(item => item.sourceCatalog === key).length])); }
