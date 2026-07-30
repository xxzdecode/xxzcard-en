#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const library = require('../js/masterVocabularyLibrary.js');

function parseArgs(argv) {
  const options = { write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') options.input = argv[++index];
    else if (arg === '--output') options.output = argv[++index];
    else if (arg === '--write') options.write = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findMain(payload) {
  if (payload && Array.isArray(payload.batches)) return payload;
  if (Array.isArray(payload)) {
    const row = payload.find(item => item && item.key === 'main');
    if (row && row.value) return row.value;
  }
  throw new Error('Cannot find main app data.');
}

async function fetchMain() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_ANON_KEY || '');
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY or use --input.');
  const response = await fetch(`${url}/rest/v1/kv_store?select=key,value&key=eq.main`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}`);
  return findMain(await response.json());
}

async function writeMain(value) {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_ANON_KEY || '');
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY before --write.');
  const response = await fetch(`${url}/rest/v1/kv_store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ key: 'main', value })
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}`);
}

function summary(value) {
  return {
    schemaVersion: value.schemaVersion,
    masterCardCount: Object.keys(value.masterCards || {}).length,
    batchCount: (value.batches || []).length,
    referenceCount: (value.batches || []).reduce((sum, batch) => sum + (batch.cardRefs || []).length, 0),
    persistedFullCardsInBatches: (value.batches || []).filter(batch => Object.prototype.hasOwnProperty.call(batch, 'cards')).length
  };
}

function printHelp() {
  console.log(`Usage:\n  node scripts/migrateMasterVocabularyLibrary.js --input main.json [--output migrated.json]\n  SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/migrateMasterVocabularyLibrary.js --write\n\nThe script is idempotent. It never removes master cards when a wordbook is removed.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const source = options.input ? findMain(readJson(path.resolve(options.input))) : await fetchMain();
  library.normalizeAppData(source);
  const migrated = library.persistedCopy(source);
  const invalid = library.findInvalidData(source);
  if (invalid) throw new Error(`Migration validation failed: ${JSON.stringify(invalid)}`);

  if (options.output) {
    const output = path.resolve(options.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');
  }
  if (options.write) await writeMain(migrated);
  console.log(JSON.stringify(summary(migrated), null, 2));
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
