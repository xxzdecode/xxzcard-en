import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WEAKNESS_VIEW_KEY,
  buildWeaknessView,
  publishWeaknessView
} from '../scripts/publish-weakness-view.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const evidence = (paperId, questionIds) => questionIds.map(questionId => ({ paper_id: paperId, question_id: questionId }));
const state = {
  schema_version: 2,
  updated_at: '2026-08-07T08:00:00.000Z',
  students: {
    sister: { items: [] },
    brother: {
      items: [
        {
          weakness_id: 'brother.sentence-parts.time-adjunct',
          student_id: 'brother',
          kp_id: 'sentence-parts',
          title: '识别时间信息属于补充信息',
          status: 'active',
          last_seen_at: '2026-08-06',
          evidence: evidence('paper-1', ['q1', 'q2'])
        },
        {
          weakness_id: 'brother.sentence-parts.subject-boundary-no-object-discrimination',
          student_id: 'brother',
          kp_id: 'sentence-parts',
          title: '识别完整主语，并判断句子是否需要宾语',
          status: 'active',
          last_seen_at: '2026-08-06',
          evidence: evidence('paper-1', ['q3'])
        },
        {
          weakness_id: 'brother.sentence-parts.copular-predicate',
          student_id: 'brother',
          kp_id: 'sentence-parts',
          title: '理解 be 动词与表语共同构成状态谓语',
          status: 'active',
          last_seen_at: '2026-08-06',
          evidence: evidence('paper-1', ['q4'])
        }
      ]
    }
  }
};
const topics = JSON.parse(fs.readFileSync(path.join(root, 'grammar-library', 'data', 'topics.json'), 'utf8'));
const now = new Date('2026-08-07T09:00:00.000Z');

const view = buildWeaknessView(state, topics, now);
assert.equal(view.schema_version, 1);
assert.match(view.source_hash, /^sha256:[0-9a-f]{64}$/);
assert.equal(view.students.sister.item_count, 0);
assert.equal(view.students.brother.item_count, 3);
assert.equal(view.students.brother.groups.length, 1);
assert.equal(view.students.brother.groups[0].kp_id, 'sentence-parts');
assert.equal(view.students.brother.groups[0].title, '句子结构');
assert.equal(view.students.brother.groups[0].item_count, 3);
assert.equal(view.students.brother.groups[0].evidence_count, 4);
assert.deepEqual(
  view.students.brother.groups[0].items.map(item => [item.title, item.evidence_count]),
  [
    ['识别时间信息属于补充信息', 2],
    ['识别完整主语，并判断句子是否需要宾语', 1],
    ['理解 be 动词与表语共同构成状态谓语', 1]
  ]
);
assert.doesNotMatch(JSON.stringify(view), /prompt|answer|observation|teacher_note|instructional_implication/);

function response(status, value) {
  return { ok: status >= 200 && status < 300, status, text: async () => value == null ? '' : JSON.stringify(value) };
}

let remote = null;
const calls = [];
async function fetchImpl(url, options = {}) {
  calls.push({ url, options });
  if (options.method === 'POST') {
    const payload = JSON.parse(options.body);
    assert.equal(payload.key, WEAKNESS_VIEW_KEY);
    remote = payload.value;
    return response(201, {});
  }
  return response(200, remote == null ? [] : [{ value: remote }]);
}

const config = { url: 'https://example.supabase.co', key: 'test-key' };
const dryRun = await publishWeaknessView({ state, topics, config, now, fetchImpl });
assert.equal(dryRun.status, 'dry_run_ready');
assert.equal(dryRun.changed_database, false);
assert.equal(calls.filter(call => call.options.method === 'POST').length, 0);

const applied = await publishWeaknessView({ state, topics, config, now, apply: true, fetchImpl });
assert.equal(applied.status, 'published');
assert.equal(applied.changed_database, true);
assert.equal(remote.source_hash, view.source_hash);
assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);

const repeated = await publishWeaknessView({ state, topics, config, now: new Date('2026-08-08T09:00:00.000Z'), apply: true, fetchImpl });
assert.equal(repeated.status, 'already_published');
assert.equal(repeated.changed_database, false);
assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);

console.log('weakness view publisher tests passed');
