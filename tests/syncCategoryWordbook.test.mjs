import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import {
  buildPlan,
  locateImportPackage,
  resolveCategory,
  run,
  validatePackageForCategory
} from '../scripts/sync-category-wordbook.mjs';

const root = path.resolve(import.meta.dirname, '..');
const temporaryDirectories = [];
const now = new Date('2026-08-05T02:30:00.000Z');

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sync-category-wordbook-'));
  temporaryDirectories.push(directory);
  return directory;
}

function categoryIndex(id = 'fruit', name = '水果', words = ['apple', 'pear']) {
  return { schemaVersion: 1, groups: [{ id: 'themes', categories: [{ id, name, words }] }] };
}

function importPackage(id = 'book-fruit', name = '水果', words = ['apple', 'pear']) {
  return {
    schemaVersion: 2,
    wordbook: {
      id,
      name,
      bookType: 'reference',
      bookPurpose: 'common',
      cardRefs: words.map(wordKey => ({ wordKey }))
    },
    masterPatch: { create: [], setIfEmpty: [], appendUnique: [] }
  };
}

function mainData() {
  const card = (word, meaning) => ({
    word, meaning, pos: 'n.', phonetic: '', emoji: '', morphology: [], collocations: [],
    irregularForms: [], synonyms: [], wordFamily: [], tip: ''
  });
  return {
    schemaVersion: 2,
    masterLibrary: { version: 1, createdAt: '2026-08-01T00:00:00.000Z', source: 'formal' },
    masterCards: {
      apple: card('apple', '苹果'),
      pear: card('pear', '梨')
    },
    batches: []
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function writeScenario(directory) {
  const categoriesPath = path.join(directory, 'categories.json');
  const packagePath = path.join(directory, 'book-fruit.reference.json');
  const snapshotPath = path.join(directory, 'main.json');
  await writeFile(categoriesPath, JSON.stringify(categoryIndex()), 'utf8');
  await writeFile(packagePath, JSON.stringify(importPackage()), 'utf8');
  await writeFile(snapshotPath, JSON.stringify(mainData()), 'utf8');
  return { categoriesPath, packagePath, snapshotPath };
}

test('resolves one formal category by exact name or stable ID', () => {
  const index = categoryIndex();
  assert.equal(resolveCategory(index, '水果').id, 'fruit');
  assert.equal(resolveCategory(index, 'FRUIT').name, '水果');
  assert.throws(() => resolveCategory(index, '不存在'), error => error.code === 'CATEGORY_NOT_FOUND_OR_AMBIGUOUS');
});

test('requires exact ordered category references and rejects category fields', () => {
  const category = resolveCategory(categoryIndex(), '水果');
  assert.equal(validatePackageForCategory(importPackage(), category).wordbook.id, 'book-fruit');
  assert.throws(
    () => validatePackageForCategory(importPackage('book-fruit', '水果', ['pear', 'apple']), category),
    error => error.code === 'CATEGORY_PACKAGE_MISMATCH'
  );
  const leaked = importPackage();
  leaked.wordbook.categoryId = 'fruit';
  assert.throws(() => validatePackageForCategory(leaked, category), error => error.code === 'INVALID_IMPORT_PACKAGE');
});

test('discovers the legacy people-family category only through exact name and refs', async () => {
  const directory = await temporaryDirectory();
  const category = resolveCategory(categoryIndex('people-family', '人物', ['friend', 'miss']), '人物');
  await writeFile(
    path.join(directory, 'book-people.reference.json'),
    JSON.stringify(importPackage('book-people', '人物', ['friend', 'miss'])),
    'utf8'
  );
  await writeFile(
    path.join(directory, 'book-other.reference.json'),
    JSON.stringify(importPackage('book-other', '别的分类', ['friend'])),
    'utf8'
  );
  assert.equal(
    path.basename(await locateImportPackage(category, null, directory)),
    'book-people.reference.json'
  );
});

test('fails closed when an existing non-empty master field conflicts', () => {
  const category = resolveCategory(categoryIndex(), '水果');
  const packageWithConflict = importPackage();
  packageWithConflict.masterPatch.setIfEmpty = [{ wordKey: 'apple', fields: { meaning: '苹果果实' } }];
  assert.throws(
    () => buildPlan(mainData(), category, validatePackageForCategory(packageWithConflict, category), 'fixture.json', now),
    error => error.code === 'REFERENCE_IMPORT_CONFLICT'
  );
});

test('refuses to use category sync as an implicit legacy-library migration', () => {
  const category = resolveCategory(categoryIndex(), '水果');
  const legacy = mainData();
  legacy.batches.push({ id: 'legacy', name: '旧词本', cards: [{ word: 'banana', meaning: '香蕉' }] });
  assert.throws(
    () => buildPlan(legacy, category, validatePackageForCategory(importPackage(), category), 'fixture.json', now),
    error => error.code === 'INVALID_REMOTE_DATA'
  );
});

test('local dry-run writes a deterministic result without any Supabase call', async () => {
  const directory = await temporaryDirectory();
  const files = await writeScenario(directory);
  let fetchCalls = 0;
  const resultPath = path.join(directory, 'result.json');
  const result = await run({
    category: '水果', dryrun: true, categories: files.categoriesPath,
    package: files.packagePath, snapshot: files.snapshotPath, result: resultPath
  }, {
    now,
    env: {},
    fetchImpl: async () => { fetchCalls += 1; throw new Error('must not fetch'); }
  });
  assert.equal(result.status, 'dry_run_ready');
  assert.equal(result.acceptance.references, 2);
  assert.deepEqual(result.acceptance.sharedWith, ['sister', 'brother']);
  assert.equal(fetchCalls, 0);
  assert.equal(JSON.parse(await readFile(resultPath, 'utf8')).planHash, result.planHash);
});

test('stale plan hash refuses apply before the RPC write', async () => {
  const directory = await temporaryDirectory();
  const files = await writeScenario(directory);
  let rpcCalls = 0;
  const fetchImpl = async url => {
    if (url.includes('/rpc/')) rpcCalls += 1;
    return jsonResponse([{ key: 'main', value: mainData() }]);
  };
  await assert.rejects(() => run({
    category: '水果', apply: true, planhash: '0'.repeat(64),
    categories: files.categoriesPath, package: files.packagePath,
    result: path.join(directory, 'apply-result.json')
  }, {
    now, fetchImpl,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_KEY: 'test-key' }
  }), error => error.code === 'STALE_PLAN');
  assert.equal(rpcCalls, 0);
});

test('apply uses one atomic RPC, verifies the snapshot, and is idempotent', async () => {
  const directory = await temporaryDirectory();
  const files = await writeScenario(directory);
  const dryRun = await run({
    category: '水果', dryrun: true, categories: files.categoriesPath,
    package: files.packagePath, snapshot: files.snapshotPath,
    result: path.join(directory, 'dry-result.json')
  }, { now, env: {} });

  let current = mainData();
  const snapshots = new Map();
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET' });
    if (url.includes('/rpc/apply_reference_wordbook_atomic')) {
      const payload = JSON.parse(options.body);
      snapshots.set(payload.p_snapshot_key, structuredClone(current));
      current = structuredClone(payload.p_next_main);
      return jsonResponse({ status: 'applied', snapshotKey: payload.p_snapshot_key });
    }
    const parsed = new URL(url);
    const key = parsed.searchParams.get('key').replace(/^eq\./, '');
    const value = key === 'main' ? current : snapshots.get(key);
    return jsonResponse([{ key, value: structuredClone(value) }]);
  };

  const applied = await run({
    category: '水果', apply: true, planhash: dryRun.planHash,
    categories: files.categoriesPath, package: files.packagePath,
    result: path.join(directory, 'apply-result.json')
  }, {
    now, fetchImpl,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_KEY: 'test-key' }
  });
  assert.equal(applied.status, 'applied');
  assert.match(applied.snapshotKey, /^pre_fruit_reference_import_/);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  assert.equal(calls.filter(call => call.method === 'GET').length, 3);

  await writeFile(files.snapshotPath, JSON.stringify(current), 'utf8');
  const repeated = await run({
    category: '水果', dryrun: true, categories: files.categoriesPath,
    package: files.packagePath, snapshot: files.snapshotPath,
    result: path.join(directory, 'repeat-result.json')
  }, { now, env: {} });
  assert.equal(repeated.status, 'already_applied');
  assert.equal(repeated.changed, false);
});

test('an already-applied RPC race verifies main without inventing a snapshot', async () => {
  const directory = await temporaryDirectory();
  const files = await writeScenario(directory);
  const dryRun = await run({
    category: '水果', dryrun: true, categories: files.categoriesPath,
    package: files.packagePath, snapshot: files.snapshotPath,
    result: path.join(directory, 'dry-result.json')
  }, { now, env: {} });
  const category = resolveCategory(categoryIndex(), '水果');
  const next = buildPlan(mainData(), category, validatePackageForCategory(importPackage(), category), files.packagePath, now).nextData;
  let getCalls = 0;
  const fetchImpl = async (url, options = {}) => {
    if (url.includes('/rpc/')) return jsonResponse({ status: 'already_applied' });
    getCalls += 1;
    return jsonResponse([{ key: 'main', value: getCalls === 1 ? mainData() : next }]);
  };
  const result = await run({
    category: '水果', apply: true, planhash: dryRun.planHash,
    categories: files.categoriesPath, package: files.packagePath,
    result: path.join(directory, 'race-result.json')
  }, {
    now, fetchImpl,
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_KEY: 'test-key' }
  });
  assert.equal(result.status, 'already_applied');
  assert.equal(result.snapshotKey, null);
  assert.equal(getCalls, 2);
});

test('SQL RPC locks main, snapshots once, updates once, and rechecks safety invariants', async () => {
  const sql = await readFile(path.join(root, 'scripts', 'sql', 'apply-reference-wordbook-atomic.sql'), 'utf8');
  assert.match(sql, /for update;/i);
  assert.equal((sql.match(/insert into public\.kv_store/gi) || []).length, 1);
  assert.equal((sql.match(/update public\.kv_store/gi) || []).length, 1);
  assert.match(sql, /duplicate normalized references/i);
  assert.doesNotMatch(sql, /min\s*\(\s*batch\s*\)/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /revoke all .* from public/i);
});
