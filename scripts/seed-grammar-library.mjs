import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const dryRun = args.has('--dry-run') || !apply;
const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const [topics, coverage, initialProgress] = await Promise.all([
  readJson('grammar-library/data/topics.json'),
  readJson('grammar-library/data/source-coverage.json'),
  readJson('grammar-library/data/initial-progress.json')
]);

validate();
const report = {
  mode: dryRun ? 'dry-run' : 'apply',
  topics: topics.length,
  sources: coverage.length,
  initialProgress: initialProgress.length,
  sourceCounts: Object.fromEntries(['D1', 'D2', 'D3'].map(key => [key, coverage.filter(item => item.sourceCatalog === key).length])),
  existingProgressKept: 0,
  initialProgressInserted: 0
};

if (dryRun) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply');

const sourceRefsByTopic = new Map();
coverage.forEach(item => {
  if (!sourceRefsByTopic.has(item.topicKey)) sourceRefsByTopic.set(item.topicKey, []);
  sourceRefsByTopic.get(item.topicKey).push(item.sourceItemKey);
});
const topicRows = topics.map(topic => ({
  topic_key: topic.topicKey,
  title_zh: topic.titleZh,
  title_en: topic.titleEn,
  module_key: topic.moduleKey,
  parent_topic_key: topic.parentTopicKey || null,
  sequence_order: topic.sequenceOrder,
  category: topic.category,
  level: topic.level,
  is_assessable_now: topic.isAssessableNow,
  tags: topic.tags,
  content: { summary: topic.summary, rules: topic.rules, examples: topic.examples, pitfalls: topic.pitfalls },
  source_refs: sourceRefsByTopic.get(topic.topicKey) || [],
  content_version: 1
}));

const savedTopics = await rest('/rest/v1/grammar_topics?on_conflict=topic_key&select=id,topic_key', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  body: topicRows
});
const topicIds = new Map(savedTopics.map(row => [row.topic_key, row.id]));

await rest('/rest/v1/grammar_topic_sources?on_conflict=source_item_key', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: coverage.map(item => ({
    topic_id: topicIds.get(item.topicKey),
    source_catalog: item.sourceCatalog,
    source_item_key: item.sourceItemKey,
    source_title: item.sourceTitle,
    coverage_mode: item.coverageMode,
    notes: item.notes
  }))
});

const existing = await rest('/rest/v1/grammar_teaching_progress?scope_key=eq.shared&select=topic_id');
const existingIds = new Set(existing.map(row => row.topic_id));
const missingProgress = initialProgress
  .map(item => ({ ...item, topicId: topicIds.get(item.topicKey) }))
  .filter(item => !existingIds.has(item.topicId));
report.existingProgressKept = initialProgress.length - missingProgress.length;

if (missingProgress.length) {
  const inserted = await rest('/rest/v1/grammar_teaching_progress?select=id,topic_id,status,created_at', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: missingProgress.map(item => ({
      topic_id: item.topicId,
      scope_key: 'shared',
      status: item.status,
      first_taught_at: ['needs_review', 'confirmed_complete'].includes(item.status) ? new Date().toISOString() : null,
      confirmed_at: item.status === 'confirmed_complete' ? new Date().toISOString() : null,
      note: item.note
    }))
  });
  await rest('/rest/v1/grammar_progress_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: inserted.map(row => ({
      topic_id: row.topic_id,
      scope_key: 'shared',
      old_status: null,
      new_status: row.status,
      note: '任务 011 初始化共享教学状态',
      created_at: row.created_at
    }))
  });
  report.initialProgressInserted = inserted.length;
}

console.log(JSON.stringify(report, null, 2));

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

function validate() {
  const topicKeys = new Set(topics.map(item => item.topicKey));
  if (topicKeys.size !== topics.length) throw new Error('Duplicate topicKey');
  if (coverage.some(item => !topicKeys.has(item.topicKey))) throw new Error('Coverage contains an unknown topicKey');
  const expected = { D1: 59, D2: 65, D3: 29 };
  for (const [catalog, count] of Object.entries(expected)) {
    if (coverage.filter(item => item.sourceCatalog === catalog).length !== count) throw new Error(`${catalog} coverage count mismatch`);
  }
  if (initialProgress.some(item => !topicKeys.has(item.topicKey))) throw new Error('Initial progress contains an unknown topicKey');
}

async function rest(resource, options = {}) {
  const response = await fetch(url + resource, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${resource} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}
