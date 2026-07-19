import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

import {
  acceptBatch,
  cardFingerprint,
  inspectIdempotency,
  makeBatch,
  parseAndValidateCards,
  run,
  singaporeDateParts
} from '../scripts/create-wordbook.mjs';

const root = path.resolve(import.meta.dirname, '..');
const fixtureDir = path.join(root, 'tests', 'fixtures', 'create-wordbook');
const validFile = path.join(fixtureDir, 'valid-cards.txt');
const emptySnapshot = path.join(fixtureDir, 'empty-main.json');
const taskFile = path.join(fixtureDir, 'task.json');
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function temporaryResultPath() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'create-wordbook-'));
  temporaryDirectories.push(dir);
  return path.join(dir, 'result.json');
}

async function validText() {
  return readFile(validFile, 'utf8');
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('reuses the website parser and enforces the complete current format', async () => {
  const parsed = await parseAndValidateCards(await validText());
  assert.equal(parsed.cards.length, 2);
  assert.equal(parsed.uniqueWordCount, 2);
  assert.deepEqual(Object.keys(parsed.cards[0]), [
    'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
    'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
  ]);
});

test('rejects BOM, wrong nested shapes, American IPA and duplicate words', async () => {
  const source = await validText();
  await assert.rejects(() => parseAndValidateCards(`\uFEFF${source}`), error => {
    assert.equal(error.code, 'INVALID_IMPORT_TEXT');
    assert.match(error.details.join('\n'), /BOM/);
    return true;
  });

  const badShape = source.replace(
    'synonyms: []',
    'synonyms: [{"word":"fruit"}]'
  );
  await assert.rejects(() => parseAndValidateCards(badShape), error => {
    assert.match(error.details.join('\n'), /synonyms\[0\].*word.*meaning/);
    return true;
  });

  const american = source.replace('/ɡəʊ/', '/ɡoʊ/');
  await assert.rejects(() => parseAndValidateCards(american), error => {
    assert.match(error.details.join('\n'), /美式 IPA/);
    return true;
  });

  const duplicate = source.replace('word: go', 'word: Apple');
  await assert.rejects(() => parseAndValidateCards(duplicate), error => {
    assert.match(error.details.join('\n'), /批次内重复词/);
    return true;
  });
});

test('rejects extra spacing and array counts outside the content rules', async () => {
  const source = await validText();
  await assert.rejects(() => parseAndValidateCards(source.replace('word: apple', 'word:  apple')), error => {
    assert.match(error.details.join('\n'), /冒号后只能有一个空格/);
    return true;
  });

  const tooManyFamilies = Array.from({ length: 4 }, (_, index) => ({
    word: `family${index}`,
    pos: 'n.',
    meaning: `词族${index}`
  }));
  await assert.rejects(() => parseAndValidateCards(source.replace(
    'wordFamily: []',
    `wordFamily: ${JSON.stringify(tooManyFamilies)}`
  )), error => {
    assert.match(error.details.join('\n'), /wordFamily 最多 3 项/);
    return true;
  });
});

test('uses Asia/Singapore for the date and MM.DD name', () => {
  const instant = new Date('2026-07-19T16:30:00.000Z');
  assert.deepEqual(singaporeDateParts(instant), { iso: '2026-07-20', monthDay: '07.20' });
  const { batch } = makeBatch({ title: '课堂词汇', taskId: 'lesson-42', cards: [], now: instant });
  assert.equal(batch.name, '07.20｜课堂词汇');
  assert.equal(batch.date, '2026-07-20');
  assert.deepEqual(batch.sharedWith, ['sister', 'brother']);
  const prefixed = makeBatch({ title: '07.20｜课堂词汇', taskId: 'lesson-43', cards: [], date: '2026-07-20' });
  assert.equal(prefixed.batch.name, '07.20｜课堂词汇');
});

test('card fingerprints are stable across object key order', () => {
  assert.equal(
    cardFingerprint({ word: 'apple', meaning: '苹果', nested: { b: 2, a: 1 } }),
    cardFingerprint({ nested: { a: 1, b: 2 }, meaning: '苹果', word: 'apple' })
  );
});

test('checks taskId, same batch name, existing words and stored fingerprints', async () => {
  const { cards } = await parseAndValidateCards(await validText());
  const planned = makeBatch({
    title: '课堂词汇', taskId: 'lesson-42', cards,
    now: new Date('2026-07-19T16:30:00.000Z')
  });
  assert.equal(inspectIdempotency({ batches: [] }, planned.batch, planned.fingerprints).status, 'ready');

  const exact = inspectIdempotency({ batches: [planned.batch] }, planned.batch, planned.fingerprints);
  assert.equal(exact.status, 'already_applied');

  const nextDay = makeBatch({
    title: '课堂词汇', taskId: 'lesson-42', cards,
    now: new Date('2026-07-20T16:30:00.000Z')
  });
  assert.equal(nextDay.batch.name, '07.21｜课堂词汇');
  assert.equal(
    inspectIdempotency({ batches: [planned.batch] }, nextDay.batch, nextDay.fingerprints).status,
    'already_applied'
  );

  const sameTaskDifferentName = structuredClone(planned.batch);
  sameTaskDifferentName.automation.title = '不同名称';
  assert.equal(
    inspectIdempotency({ batches: [sameTaskDifferentName] }, planned.batch, planned.fingerprints).status,
    'conflict'
  );

  const legacyBatch = { id: 'old', name: '旧本', cards: [{ word: 'APPLE' }], sharedWith: [] };
  const wordConflict = inspectIdempotency({ batches: [legacyBatch] }, planned.batch, planned.fingerprints);
  assert.match(wordConflict.conflicts.join('\n'), /Supabase 已存在词 apple/);
});

test('dry-run with a fixture writes result.json and never calls Supabase', async () => {
  const resultPath = await temporaryResultPath();
  let fetchCalls = 0;
  const result = await run({
    file: validFile,
    name: '课堂词汇',
    taskid: 'dry-run-001',
    dryrun: true,
    snapshot: emptySnapshot,
    result: resultPath
  }, {
    now: new Date('2026-07-19T16:30:00.000Z'),
    fetchImpl: async () => { fetchCalls += 1; throw new Error('must not fetch'); },
    env: {}
  });
  assert.equal(result.status, 'dry_run_ready');
  assert.equal(fetchCalls, 0);
  assert.equal(result.checks.learningStateWrites, 0);
  const saved = JSON.parse(await readFile(resultPath, 'utf8'));
  assert.equal(saved.batch.name, '07.20｜课堂词汇');
  assert.deepEqual(saved.batch.sharedWith, ['sister', 'brother']);
  assert.deepEqual(saved.counts, { cards: 2, uniqueWords: 2 });
});

test('loads the canonical task.json contract and writes task result fields', async () => {
  const resultPath = await temporaryResultPath();
  const result = await run({
    task: taskFile,
    dryrun: true,
    snapshot: emptySnapshot,
    result: resultPath
  }, { now: new Date('2026-07-25T00:00:00.000Z'), env: {} });
  assert.equal(result.status, 'dry_run_ready');
  assert.equal(result.finalName, '07.20｜自动化测试');
  assert.equal(result.timezone, 'Asia/Singapore');
  assert.equal(result.cardCount, 2);
  assert.deepEqual(result.skippedExisting, ['book']);
  assert.equal(result.existingCardUpdateCandidates.length, 1);
  assert.equal(result.verified, false);
});

test('task contract rejects expectation and timezone drift', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'create-wordbook-task-'));
  temporaryDirectories.push(dir);
  await writeFile(path.join(dir, 'valid-cards.txt'), await validText(), 'utf8');
  const base = JSON.parse(await readFile(taskFile, 'utf8'));
  await writeFile(path.join(dir, 'bad-count.json'), JSON.stringify({ ...base, expectedCardCount: 3 }), 'utf8');
  await assert.rejects(() => run({
    task: path.join(dir, 'bad-count.json'), dryrun: true, snapshot: emptySnapshot,
    result: path.join(dir, 'count-result.json')
  }, { env: {} }), error => error.code === 'TASK_EXPECTATION_MISMATCH');

  await writeFile(path.join(dir, 'bad-timezone.json'), JSON.stringify({ ...base, timezone: 'Asia/Tokyo' }), 'utf8');
  await assert.rejects(() => run({
    task: path.join(dir, 'bad-timezone.json'), dryrun: true, snapshot: emptySnapshot,
    result: path.join(dir, 'timezone-result.json')
  }, { env: {} }), error => error.code === 'INVALID_TASK');
});

test('returns no_changes when every requested word now exists', async () => {
  const resultPath = await temporaryResultPath();
  const snapshotPath = path.join(path.dirname(resultPath), 'all-existing.json');
  await writeFile(snapshotPath, JSON.stringify({ batches: [{
    id: 'legacy', name: '旧本', sharedWith: [], cards: [{ word: 'apple' }, { word: 'go' }]
  }] }), 'utf8');
  const result = await run({
    task: taskFile, dryrun: true, snapshot: snapshotPath, result: resultPath
  }, { env: {} });
  assert.equal(result.status, 'no_changes');
  assert.equal(result.checks.transactionWrite, 'not_run');
});

test('an idempotent dry-run on a later day reports the original batch', async () => {
  const resultPath = await temporaryResultPath();
  const { cards } = await parseAndValidateCards(await validText());
  const original = makeBatch({
    title: '课堂词汇', taskId: 'dry-existing-001', cards,
    now: new Date('2026-07-19T16:30:00.000Z')
  });
  const snapshotPath = path.join(path.dirname(resultPath), 'existing.json');
  await writeFile(snapshotPath, JSON.stringify({ batches: [original.batch] }), 'utf8');
  const result = await run({
    file: validFile,
    name: '课堂词汇',
    taskid: 'dry-existing-001',
    dryrun: true,
    snapshot: snapshotPath,
    result: resultPath
  }, { now: new Date('2026-07-20T16:30:00.000Z'), env: {} });
  assert.equal(result.status, 'already_applied');
  assert.equal(result.batch.name, '07.20｜课堂词汇');
  assert.equal(result.checks.postWriteAcceptance, 'passed_existing');
});

test('apply performs two prechecks, one RPC write and post-write acceptance', async () => {
  const resultPath = await temporaryResultPath();
  let data = { batches: [], pin: null };
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body });
    if (url.includes('/rpc/create_wordbook_atomic')) {
      const request = JSON.parse(options.body);
      data = { ...data, batches: [...data.batches, request.p_batch] };
      return jsonResponse({ status: 'applied', batchId: request.p_batch.id, cardCount: request.p_batch.cards.length });
    }
    return jsonResponse([{ value: structuredClone(data) }]);
  };
  const result = await run({
    file: validFile,
    name: '课堂词汇',
    taskid: 'apply-001',
    apply: true,
    result: resultPath
  }, {
    now: new Date('2026-07-19T16:30:00.000Z'),
    fetchImpl,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_KEY: 'test-key' }
  });

  assert.equal(result.status, 'applied');
  assert.equal(calls.filter(call => call.method === 'GET').length, 3);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  assert.ok(calls.every(call => !/sister_|brother_/.test(call.url)));
  assert.equal(result.checks.postWriteAcceptance, 'passed');
  assert.equal(result.checks.pushStatus, 'sister+brother');
  assert.equal(acceptBatch(data, data.batches[0], data.batches[0].automation.cardFingerprints).ok, true);
});

test('RPC failure produces failed result and does not perform acceptance writes', async () => {
  const resultPath = await temporaryResultPath();
  let rpcCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('/rpc/')) {
      rpcCalls += 1;
      return jsonResponse({ code: '23505', message: 'forced rollback' }, 409);
    }
    return jsonResponse([{ value: { batches: [], pin: null } }]);
  };
  await assert.rejects(() => run({
    file: validFile,
    name: '课堂词汇',
    taskid: 'apply-fail-001',
    apply: true,
    result: resultPath
  }, {
    now: new Date('2026-07-19T16:30:00.000Z'),
    fetchImpl,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_KEY: 'test-key' }
  }), error => error.code === 'SUPABASE_WRITE_ERROR');
  assert.equal(rpcCalls, 1);
  const saved = JSON.parse(await readFile(resultPath, 'utf8'));
  assert.equal(saved.status, 'failed');
  assert.equal(saved.checks.postWriteAcceptance, 'not_run');
  assert.equal(saved.checks.learningStateWrites, 0);
});

test('SQL RPC contains row locking, one update and explicit execution grants', async () => {
  const sql = await readFile(path.join(root, 'scripts', 'sql', 'create-wordbook-atomic.sql'), 'utf8');
  assert.match(sql, /for update;/i);
  assert.equal((sql.match(/update public\.kv_store/gi) || []).length, 1);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /statement_timeout = '10s'/i);
  assert.match(sql, /revoke all .* from public/i);
  assert.match(sql, /grant execute .* to anon, authenticated/i);
});
