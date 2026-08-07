import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mergeAssessmentCatalog,
  publishQuestionMap,
  sanitizeQuestionMap
} from '../scripts/publish-assessment-map.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = JSON.parse(fs.readFileSync(path.join(
  root,
  'tests',
  'fixtures',
  'daily-2026-08-06-brother-sentence-parts-01-question-map.json'
), 'utf8'));

function response(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return value == null ? '' : JSON.stringify(value); }
  };
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).reverse().map(key => [key, reverseObjectKeys(value[key])])
  );
}

test('real daily map is sanitized to metadata only', () => {
  const source = structuredClone(fixture);
  source.papers[0].sections[0].items[0].question_text = 'must not be uploaded';
  const map = sanitizeQuestionMap(source);
  assert.equal(map.assessment_id, 'daily-2026-08-06-brother-sentence-parts-01');
  assert.equal(map.papers[0].sections.flatMap(section => section.items).length, 10);
  assert.equal(map.map_revision, '1');
  assert.doesNotMatch(JSON.stringify(map), /must not be uploaded|question_text/);
});

test('daily rules reject short papers and oversized sections', () => {
  const short = structuredClone(fixture);
  short.papers[0].sections.pop();
  assert.throws(() => sanitizeQuestionMap(short), /日测小题数少于 10/);
  const oversized = structuredClone(fixture);
  oversized.papers[0].sections[0].items.push(
    { ...oversized.papers[0].sections[0].items[0], question_id: 'extra-1' },
    { ...oversized.papers[0].sections[0].items[0], question_id: 'extra-2' }
  );
  assert.throws(() => sanitizeQuestionMap(oversized), /超过日测每大题 5 小题上限/);
});

test('catalog merge preserves other assessments and refuses silent map replacement', () => {
  const map = sanitizeQuestionMap(fixture);
  const previous = {
    schema_version: 1,
    latest_paper_id: 'old-paper',
    updated_at: '2026-08-05T00:00:00.000Z',
    assessments: [{ assessment_id: 'old-assessment', assessment_date: '2026-08-05', map_hash: 'sha256:old' }]
  };
  const merged = mergeAssessmentCatalog(previous, map, new Date('2026-08-06T00:00:00.000Z'));
  assert.equal(merged.changed, true);
  assert.equal(merged.catalog.assessments.length, 2);
  assert.equal(merged.catalog.latest_paper_id, map.papers[0].paper_id);
  assert.equal(mergeAssessmentCatalog(merged.catalog, map).changed, false);
  assert.equal(mergeAssessmentCatalog(reverseObjectKeys(merged.catalog), map).changed, false);
  const conflict = structuredClone(merged.catalog);
  conflict.assessments[1].map_hash = 'sha256:different';
  assert.throws(() => mergeAssessmentCatalog(conflict, map), /map_hash 不同/);
});

test('republishing an older map preserves the latest paper pointer and is idempotent', () => {
  const oldMap = sanitizeQuestionMap(fixture);
  const newerMap = structuredClone(oldMap);
  newerMap.assessment_id = 'daily-2026-08-07-brother-next-02';
  newerMap.assessment_date = '2026-08-07';
  newerMap.map_hash = 'sha256:newer-map';
  newerMap.papers[0].paper_id = 'paper-daily-2026-08-07-brother-next-02-brother';
  const current = {
    schema_version: 1,
    latest_paper_id: newerMap.papers[0].paper_id,
    updated_at: '2026-08-07T00:00:00.000Z',
    assessments: [oldMap, newerMap]
  };
  const merged = mergeAssessmentCatalog(current, oldMap, new Date('2026-08-08T00:00:00.000Z'));
  assert.equal(merged.changed, false);
  assert.equal(merged.catalog.latest_paper_id, newerMap.papers[0].paper_id);
  assert.equal(merged.catalog.updated_at, current.updated_at);
});

test('dry-run never writes and apply performs double-read plus post-write verification', async () => {
  const map = sanitizeQuestionMap(fixture);
  let calls = 0;
  const dryRun = await publishQuestionMap({
    questionMap: map,
    config: { url: 'https://example.invalid', key: 'test' },
    fetchImpl: async () => {
      calls += 1;
      return response(200, []);
    }
  });
  assert.equal(dryRun.status, 'dry_run_ready');
  assert.equal(calls, 1);

  let stored = null;
  const methods = [];
  const applied = await publishQuestionMap({
    questionMap: map,
    config: { url: 'https://example.invalid', key: 'test' },
    apply: true,
    now: new Date('2026-08-06T00:00:00.000Z'),
    fetchImpl: async (_url, options = {}) => {
      const method = options.method || 'GET';
      methods.push(method);
      if (method === 'POST') {
        stored = JSON.parse(options.body).value;
        return response(201, null);
      }
      return response(200, stored ? [{ value: reverseObjectKeys(stored) }] : []);
    }
  });
  assert.equal(applied.status, 'published');
  assert.deepEqual(methods, ['GET', 'GET', 'POST', 'GET']);
  assert.equal(stored.assessments[0].map_hash, map.map_hash);
});
