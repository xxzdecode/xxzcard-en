import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_KEY || '';
const [topics, coverage, initialProgress] = await Promise.all([
  readJson('grammar-library/data/topics.json'),
  readJson('grammar-library/data/source-coverage.json'),
  readJson('grammar-library/data/initial-progress.json')
]);

validate();
const report = {
  mode: apply ? 'apply' : 'dry-run',
  storage: 'kv_store/grammar_progress',
  topics: topics.length,
  sources: coverage.length,
  initialProgress: initialProgress.length,
  sourceCounts: Object.fromEntries(['D1', 'D2', 'D3'].map(catalog => [catalog, coverage.filter(item => item.sourceCatalog === catalog).length])),
  existingProgressKept: 0,
  initialProgressInserted: 0
};

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY are required for --apply');

const rows = await rest('/rest/v1/kv_store?key=eq.grammar_progress&select=value');
const existing = rows.length && rows[0].value && typeof rows[0].value === 'object'
  ? rows[0].value
  : { schemaVersion: 1, scopeKey: 'shared', topics: {}, events: [] };
const nextTopics = { ...(existing.topics || {}) };
const now = new Date().toISOString();
for (const item of initialProgress) {
  const topic = topics.find(candidate => candidate.topicKey === item.topicKey);
  if (nextTopics[item.topicKey]) {
    nextTopics[item.topicKey] = {
      ...nextTopics[item.topicKey],
      title: topic.titleZh,
      module: topic.moduleKey,
      sequence: topic.sequenceOrder
    };
    report.existingProgressKept += 1;
    continue;
  }
  nextTopics[item.topicKey] = {
    title: topic.titleZh,
    module: topic.moduleKey,
    sequence: topic.sequenceOrder,
    status: item.status,
    last_lesson_date: null,
    note: item.note || '',
    updated_at: now
  };
  report.initialProgressInserted += 1;
}
const value = {
  schemaVersion: 1,
  scopeKey: 'shared',
  updatedAt: now,
  topics: nextTopics,
  events: Array.isArray(existing.events) ? existing.events : []
};
await rest('/rest/v1/kv_store', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates' },
  body: { key: 'grammar_progress', value }
});
console.log(JSON.stringify(report, null, 2));

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

function validate() {
  const topicKeys = new Set(topics.map(item => item.topicKey));
  if (topicKeys.size !== topics.length) throw new Error('Duplicate topicKey');
  if (coverage.some(item => !topicKeys.has(item.topicKey))) throw new Error('Coverage contains an unknown topicKey');
  for (const [catalog, count] of Object.entries({ D1: 59, D2: 65, D3: 29 })) {
    if (coverage.filter(item => item.sourceCatalog === catalog).length !== count) throw new Error(`${catalog} coverage count mismatch`);
  }
  if (initialProgress.some(item => !topicKeys.has(item.topicKey))) throw new Error('Initial progress contains an unknown topicKey');
}

async function rest(resource, options = {}) {
  const response = await fetch(url + resource, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${resource} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}
