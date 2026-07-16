import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('C12 data migrations keep constraints, RLS and service-only internal access', async () => {
  const schema = await read('supabase/migrations/20260716053512_create_homework_prep_schema.sql');
  const audit = await read('supabase/migrations/20260716065452_add_homework_audit_and_review_workflow.sql');
  for (const table of ['documents','homework_blocks','block_sources','questions','teaching_analysis','processing_tasks','review_items']) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(schema, /revoke all on table[\s\S]+from anon, authenticated/i);
  assert.match(schema, /questions_block_position_unique_idx/i);
  assert.match(schema, /homework_blocks_single_active_idx/i);
  assert.match(audit, /create table public\.homework_audit_events/i);
  assert.match(audit, /duration_ms bigint generated always/i);
  assert.match(audit, /revoke all on function public\.confirm_homework_block_ready[\s\S]+anon, authenticated/i);
});

test('C12 browser assets contain no service credential or signed URL flow', async () => {
  const files = await Promise.all([
    read('index.html'), read('js/config.js'), read('js/homeworkPrep.js'), read('styles.css')
  ]);
  const bundle = files.join('\n');
  assert.doesNotMatch(bundle, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.doesNotMatch(bundle, /createSignedUrl|signed[_ -]?url/i);
  assert.match(bundle, /Bearer \$\{session\.access_token\}/);
  assert.match(bundle, /responseType:\s*'blob'/);
});

test('C12 retry workflow is idempotent and caps automatic mechanical retries at two', async () => {
  const queue = await read('supabase/migrations/20260716054741_add_homework_queue_functions.sql');
  const workflow = await read('supabase/migrations/20260716065452_add_homework_audit_and_review_workflow.sql');
  assert.match(queue, /pg_advisory_xact_lock/i);
  assert.match(queue, /on conflict \(block_id, step_name\) do nothing/i);
  assert.match(queue, /where task\.block_id = p_block_id[\s\S]+task\.status <> 'completed'/i);
  assert.match(workflow, /target_task\.attempt_count <= 2/i);
  assert.match(workflow, /step_retry_scheduled/i);
  assert.match(workflow, /step_blocked/i);
});

test('C12 review edits rerun only analyzing or QA and ready remains teacher-gated', async () => {
  const workflow = await read('supabase/migrations/20260716065452_add_homework_audit_and_review_workflow.sql');
  assert.match(workflow, /then 'analyzing'[\s\S]+else 'qa'/i);
  assert.match(workflow, /rerun_step = 'analyzing' and step_name = 'qa'[\s\S]+pending/i);
  assert.match(workflow, /unresolved_review_items/i);
  assert.match(workflow, /qa_not_complete/i);
  assert.match(workflow, /block_not_reviewable/i);
  assert.match(workflow, /block_confirmed_ready/i);
});

test('C12 BLOCK-001 and BLOCK-002 replay relations and teacher decisions remain fixed', async () => {
  const seed = await read('supabase/seed.sql');
  assert.match(seed, /BLOCK-001', 1, 4[\s\S]+BLOCK-002', 5, 8/i);
  assert.match(seed, /000000000101'[\s\S]+\n\s*1,\n\s*3,[\s\S]+true,/i);
  assert.match(seed, /000000000102'[\s\S]+\n\s*4,\n\s*6,[\s\S]+true,/i);
  assert.match(seed, /R-001[\s\S]+Use a hundred/i);
  assert.match(seed, /R-002[\s\S]+Default to will visit/i);
  assert.match(seed, /\["will visit","are going to visit","are visiting"\]/i);
  assert.doesNotMatch(seed, /student_answer|teacher_mark/i);
});

test('C12 BLOCK-003 real trial maps C06-C09 truth and records the existing teacher confirmation', async () => {
  const seed = await read('supabase/seed.sql');
  const fixture = JSON.parse(await read('supabase/functions/homework-worker/fixtures/BLOCK-003_C08-C09_test_fixture_v0.1.json'));
  const confirmation = JSON.parse(await read('supabase/functions/homework-worker/fixtures/BLOCK-003_teacher_confirmation_v0.1.json'));
  assert.equal(fixture.answer_points, 60);
  assert.equal(fixture.qa.review_item_count, 0);
  assert.equal(fixture.qa.handwriting_ignored, true);
  assert.equal(confirmation.decision, 'approved');
  assert.match(seed, /BLOCK-003', 9, 12[\s\S]+1, 'ready'/i);
  assert.match(seed, /\[7,8,9\][\s\S]+cross_page_number[\s\S]+11/i);
  assert.match(seed, /teacher_content_confirmed[\s\S]+4aac44b7a1c888c5da60842d1012edf3a5866678/i);
  assert.match(seed, /"answer_points":60,"handwriting_ignored":true/i);
});
