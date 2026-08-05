#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const MasterVocabularyLibrary = require('../js/masterVocabularyLibrary.js');
const ReferenceWordbookImport = require('../js/referenceWordbookImport.js');
const VocabularyJsonImport = require('../js/vocabularyJsonImport.js');

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.dirname(SCRIPT_DIR);
const DEFAULT_CATEGORIES = path.join(REPO_ROOT, 'data', 'vocabularyCategories.json');
const DEFAULT_IMPORTS = path.join(REPO_ROOT, 'data', 'imports');
const DEFAULT_RPC = 'apply_reference_wordbook_atomic';
const SHARED_WITH = Object.freeze(['sister', 'brother']);
const CATEGORY_FIELDS = Object.freeze(['category', 'categories', 'categoryId', 'categoryName']);

const HELP_TEXT = `正式分类引用式单词本同步

用法：
  node scripts/sync-category-wordbook.mjs --category <名称或ID> --dry-run
  node scripts/sync-category-wordbook.mjs --category <名称或ID> --apply --plan-hash <sha256>

可选：
  --package <path>       指定正式 schemaVersion 2 导入包
  --categories <path>    指定分类骨架，默认 data/vocabularyCategories.json
  --snapshot <path>      dry-run 使用本地 main JSON，不访问 Supabase
  --result <path>        结果 JSON，默认当前目录/result.json
  --supabase-url <url>   覆盖 SUPABASE_URL
  --supabase-key <key>   覆盖 SUPABASE_KEY
  --rpc-name <name>      覆盖 RPC，默认 ${DEFAULT_RPC}

安全边界：
  - dry-run 与 apply 必须且只能选择一个。
  - apply 必须使用同一份 dry-run 输出的 planHash。
  - 不读取 js/config.js 中的前端 key，不删除或归档旧词本。
  - 任一冲突、同名异 ID、缺失引用或基线变化都会停止。
`;

function fail(message, code = 'VALIDATION_ERROR', details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  throw error;
}

export function parseArgs(argv) {
  const valueOptions = new Set([
    '--category', '--package', '--categories', '--snapshot', '--result',
    '--supabase-url', '--supabase-key', '--plan-hash', '--rpc-name'
  ]);
  const flagOptions = new Set(['--dry-run', '--apply', '--help']);
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (flagOptions.has(argument)) {
      const key = argument.slice(2).replaceAll('-', '');
      if (options[key]) fail(`参数 ${argument} 不得重复`, 'ARGUMENT_ERROR');
      options[key] = true;
      continue;
    }
    if (!valueOptions.has(argument)) fail(`未知参数：${argument}`, 'ARGUMENT_ERROR');
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) fail(`参数 ${argument} 缺少值`, 'ARGUMENT_ERROR');
    const key = argument.slice(2).replaceAll('-', '');
    if (Object.hasOwn(options, key)) fail(`参数 ${argument} 不得重复`, 'ARGUMENT_ERROR');
    options[key] = value;
    index += 1;
  }
  return options;
}

function validateOptions(options) {
  if (options.help) return;
  if (!String(options.category || '').trim()) fail('缺少必选参数：--category <名称或ID>', 'ARGUMENT_ERROR');
  if (Boolean(options.dryrun) === Boolean(options.apply)) {
    fail('--dry-run 和 --apply 必须且只能选择一个', 'ARGUMENT_ERROR');
  }
  if (options.apply && !String(options.planhash || '').trim()) {
    fail('--apply 必须提供 dry-run 生成的 --plan-hash', 'ARGUMENT_ERROR');
  }
  if (options.apply && options.snapshot) fail('--apply 不允许使用本地 snapshot', 'ARGUMENT_ERROR');
}

async function readUtf8(filePath) {
  const bytes = await readFile(filePath);
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.startsWith('\uFEFF')) fail(`JSON 不允许包含 BOM：${filePath}`, 'INVALID_UTF8');
    return text;
  } catch (error) {
    if (error.code) throw error;
    fail(`文件不是有效 UTF-8：${filePath}`, 'INVALID_UTF8');
  }
}

async function readJson(filePath) {
  const text = await readUtf8(filePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`JSON 无法解析：${filePath}：${error.message}`, 'INVALID_JSON');
  }
}

function clonePersisted(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  return ReferenceWordbookImport.stableStringify(value);
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function normalizedWords(values) {
  return (Array.isArray(values) ? values : []).map(MasterVocabularyLibrary.normalizeWordKey);
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function listCategories(categoryData) {
  if (!categoryData || !Array.isArray(categoryData.groups)) fail('分类骨架缺少 groups', 'INVALID_CATEGORY_INDEX');
  return categoryData.groups.flatMap(group => Array.isArray(group.categories) ? group.categories : [])
    .map(category => ({
      id: String(category && category.id || '').trim(),
      name: String(category && category.name || '').trim(),
      words: Array.isArray(category && category.words) ? category.words.map(word => String(word).trim()) : []
    }));
}

export function resolveCategory(categoryData, query) {
  const categories = listCategories(categoryData);
  const requested = String(query || '').trim();
  let matches = categories.filter(category => category.id === requested || category.name === requested);
  if (!matches.length) {
    const folded = requested.toLocaleLowerCase();
    matches = categories.filter(category => category.id.toLocaleLowerCase() === folded || category.name.toLocaleLowerCase() === folded);
  }
  if (matches.length !== 1) {
    fail(matches.length ? `分类名称或 ID 不唯一：${requested}` : `找不到正式分类：${requested}`, 'CATEGORY_NOT_FOUND_OR_AMBIGUOUS');
  }
  const category = matches[0];
  if (!category.id || !category.name || !category.words.length) fail(`分类定义不完整：${requested}`, 'INVALID_CATEGORY_INDEX');
  const normalized = normalizedWords(category.words);
  if (normalized.some(word => !word) || new Set(normalized).size !== normalized.length) {
    fail(`分类 ${category.name} 存在空词或规范化重复词`, 'INVALID_CATEGORY_INDEX');
  }
  return category;
}

function validateNoCategoryFields(value, location = '导入包') {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (CATEGORY_FIELDS.includes(key)) fail(`${location} 不得包含分类字段 ${key}`, 'INVALID_IMPORT_PACKAGE');
    validateNoCategoryFields(value[key], `${location}.${key}`);
  }
}

export function validatePackageForCategory(rawPackage, category) {
  validateNoCategoryFields(rawPackage);
  if (!rawPackage || !rawPackage.wordbook || rawPackage.wordbook.bookType !== 'reference') {
    fail('wordbook.bookType 必须显式为 reference', 'INVALID_IMPORT_PACKAGE');
  }
  let importPackage;
  try {
    importPackage = VocabularyJsonImport.parseReferenceImportPayload(rawPackage);
  } catch (error) {
    fail(`正式导入包无效：${error.message}`, 'INVALID_IMPORT_PACKAGE');
  }
  if (importPackage.wordbook.name !== category.name) {
    fail(`导入包名称 ${importPackage.wordbook.name} 与分类名称 ${category.name} 不一致`, 'CATEGORY_PACKAGE_MISMATCH');
  }
  if (importPackage.wordbook.bookPurpose !== 'common') fail('wordbook.bookPurpose 必须是 common', 'INVALID_IMPORT_PACKAGE');
  const categoryWords = normalizedWords(category.words);
  const referenceWords = importPackage.wordbook.cardRefs.map(ref => ref.wordKey);
  if (!sameStrings(categoryWords, referenceWords)) {
    fail('导入包 cardRefs 必须与正式分类词表数量、顺序和内容完全一致', 'CATEGORY_PACKAGE_MISMATCH', {
      categoryWords,
      referenceWords
    });
  }
  return importPackage;
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function locateImportPackage(category, explicitPath, importsDirectory = DEFAULT_IMPORTS) {
  if (explicitPath) return path.resolve(explicitPath);
  const conventional = path.join(importsDirectory, `book-${category.id}.reference.json`);
  if (await fileExists(conventional)) return conventional;

  const candidates = [];
  for (const name of await readdir(importsDirectory)) {
    if (!/^book-.+\.reference\.json$/i.test(name)) continue;
    const candidatePath = path.join(importsDirectory, name);
    const raw = await readJson(candidatePath);
    try {
      validatePackageForCategory(raw, category);
      candidates.push(candidatePath);
    } catch (error) {
      if (!['CATEGORY_PACKAGE_MISMATCH'].includes(error.code)) throw error;
    }
  }
  if (candidates.length !== 1) {
    fail(
      candidates.length ? `分类 ${category.name} 匹配到多个正式导入包` : `分类 ${category.name} 尚无正式导入包`,
      'IMPORT_PACKAGE_NOT_FOUND_OR_AMBIGUOUS',
      candidates
    );
  }
  return candidates[0];
}

function dateInShanghai(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function snapshotKey(categoryId, now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const safeId = categoryId.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `pre_${safeId}_reference_import_${parts.year}_${parts.month}_${parts.day}_${parts.hour}${parts.minute}`;
}

export function dataStats(data) {
  const masterCards = data && data.masterCards && typeof data.masterCards === 'object' ? data.masterCards : {};
  const batches = Array.isArray(data && data.batches) ? data.batches : [];
  let references = 0;
  let missingReferences = 0;
  let persistedCards = 0;
  for (const batch of batches) {
    const refs = Array.isArray(batch && batch.cardRefs) ? batch.cardRefs : [];
    references += refs.length;
    missingReferences += refs.filter(ref => !ref || !masterCards[MasterVocabularyLibrary.normalizeWordKey(ref.wordKey)]).length;
    if (Object.prototype.hasOwnProperty.call(batch || {}, 'cards') && Array.isArray(batch.cards)) {
      persistedCards += batch.cards.length;
    }
  }
  return {
    masterCards: Object.keys(masterCards).length,
    wordbooks: batches.length,
    references,
    missingReferences,
    persistedCards
  };
}

function validateTarget(data, category, importPackage) {
  const batches = Array.isArray(data && data.batches) ? data.batches : [];
  const targetId = importPackage.wordbook.id;
  const byId = batches.filter(batch => String(batch && batch.id) === targetId);
  if (byId.length !== 1) fail(`稳定 ID ${targetId} 的单词本数量必须为 1`, 'ACCEPTANCE_ERROR');
  const sameNameOtherId = batches.filter(batch => batch && batch.name === category.name && String(batch.id) !== targetId);
  if (sameNameOtherId.length) fail(`存在同名但不同 ID 的旧单词本：${category.name}`, 'NAME_ID_CONFLICT');
  const target = byId[0];
  const refs = Array.isArray(target.cardRefs) ? target.cardRefs : [];
  const refWords = refs.map(ref => MasterVocabularyLibrary.normalizeWordKey(ref && ref.wordKey));
  const expectedWords = normalizedWords(category.words);
  if (!sameStrings(refWords, expectedWords)) fail('写入后 cardRefs 与正式分类词表不一致', 'ACCEPTANCE_ERROR');
  if (new Set(refWords).size !== refWords.length) fail('写入后 cardRefs 存在重复', 'ACCEPTANCE_ERROR');
  if (Object.prototype.hasOwnProperty.call(target, 'cards')) fail('引用式词本不得持久化 cards', 'ACCEPTANCE_ERROR');
  if (target.bookType !== 'reference' || target.bookPurpose !== 'common') fail('引用式词本类型或用途不正确', 'ACCEPTANCE_ERROR');
  if (!sameStrings(Array.isArray(target.sharedWith) ? target.sharedWith : [], SHARED_WITH)) {
    fail('sharedWith 必须严格为 sister + brother', 'ACCEPTANCE_ERROR');
  }
  for (const ref of refs) {
    if (!data.masterCards || !data.masterCards[ref.wordKey]) fail(`缺失总库引用：${ref.wordKey}`, 'ACCEPTANCE_ERROR');
  }
  const stats = dataStats(data);
  if (stats.missingReferences !== 0 || stats.persistedCards !== 0) {
    fail('全库存在缺失引用或持久化完整 cards', 'ACCEPTANCE_ERROR', stats);
  }
  return {
    wordbookId: targetId,
    references: refs.length,
    sisterVisible: refs.length,
    brotherVisible: refs.length,
    sharedWith: [...SHARED_WITH]
  };
}

function validatePlanScope(baseData, nextData, audit, targetId) {
  const baseTopLevel = clonePersisted(baseData);
  const nextTopLevel = clonePersisted(nextData);
  delete baseTopLevel.masterCards;
  delete baseTopLevel.batches;
  delete nextTopLevel.masterCards;
  delete nextTopLevel.batches;
  if (stableStringify(baseTopLevel) !== stableStringify(nextTopLevel)) {
    fail('分类同步不得迁移或改写顶层元数据', 'OUT_OF_SCOPE_CHANGE');
  }

  const unrelatedBatches = data => data.batches.filter(batch => String(batch && batch.id) !== targetId);
  if (stableStringify(unrelatedBatches(baseData)) !== stableStringify(unrelatedBatches(nextData))) {
    fail('分类同步不得修改目标之外的单词本', 'OUT_OF_SCOPE_CHANGE');
  }

  const touchedWordKeys = new Set([
    ...audit.create.map(item => item.wordKey),
    ...audit.setIfEmpty.map(item => item.wordKey),
    ...audit.appendUnique.map(item => item.wordKey)
  ]);
  const allWordKeys = new Set([
    ...Object.keys(baseData.masterCards || {}),
    ...Object.keys(nextData.masterCards || {})
  ]);
  for (const wordKey of allWordKeys) {
    if (touchedWordKeys.has(wordKey)) continue;
    if (stableStringify(baseData.masterCards[wordKey]) !== stableStringify(nextData.masterCards[wordKey])) {
      fail(`分类同步不得修改审计范围外的总库词条：${wordKey}`, 'OUT_OF_SCOPE_CHANGE');
    }
  }
}

export function buildPlan(sourceData, category, importPackage, packagePath, now = new Date()) {
  const baseData = clonePersisted(sourceData && Object.hasOwn(sourceData, 'value') ? sourceData.value : sourceData);
  if (!baseData || typeof baseData !== 'object' || !baseData.masterCards || !Array.isArray(baseData.batches)) {
    fail('kv_store.main 结构无效', 'INVALID_REMOTE_DATA');
  }
  const baselineStats = dataStats(baseData);
  if (baselineStats.missingReferences !== 0 || baselineStats.persistedCards !== 0) {
    fail('kv_store.main 基线存在缺失引用或旧式完整 cards，必须先单独修复', 'INVALID_REMOTE_DATA', baselineStats);
  }
  const sameNameOtherId = baseData.batches.filter(batch => (
    batch && batch.name === category.name && String(batch.id) !== importPackage.wordbook.id
  ));
  if (sameNameOtherId.length) fail(`存在同名但不同 ID 的单词本：${category.name}`, 'NAME_ID_CONFLICT');

  const audit = ReferenceWordbookImport.auditReferenceImport(baseData, importPackage);
  if (audit.errors.length) fail('分类导入审计失败', 'REFERENCE_IMPORT_INVALID', audit.errors);
  if (audit.conflicts.length) fail('分类导入存在非空字段冲突', 'REFERENCE_IMPORT_CONFLICT', audit.conflicts);

  const nextData = clonePersisted(baseData);
  const applied = ReferenceWordbookImport.applyReferenceImport(nextData, audit, { date: dateInShanghai(now) });
  applied.batch.sharedWith = [...SHARED_WITH];
  if (!baseData.masterLibrary && nextData.masterLibrary && typeof nextData.masterLibrary === 'object') {
    nextData.masterLibrary.createdAt = now.toISOString();
  }
  const persistedNext = clonePersisted(nextData);
  validatePlanScope(baseData, persistedNext, audit, importPackage.wordbook.id);
  const acceptance = validateTarget(persistedNext, category, importPackage);
  const baseHash = sha256(baseData);
  const nextHash = sha256(persistedNext);
  const packageHash = sha256(importPackage);
  const planHash = sha256({
    category: { id: category.id, name: category.name, words: normalizedWords(category.words) },
    wordbookId: importPackage.wordbook.id,
    baseHash,
    nextHash,
    packageHash
  });
  return {
    baseData,
    nextData: persistedNext,
    changed: baseHash !== nextHash,
    baseHash,
    nextHash,
    packageHash,
    planHash,
    audit,
    acceptance,
    before: dataStats(baseData),
    after: dataStats(persistedNext),
    packagePath
  };
}

function supabaseConfig(options, env) {
  const url = String(options.supabaseurl || env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(options.supabasekey || env.SUPABASE_KEY || '');
  if (!url || !key) fail('需要 SUPABASE_URL 和 SUPABASE_KEY', 'SUPABASE_CONFIG_ERROR');
  return { url, key };
}

function headers(config) {
  return { 'Content-Type': 'application/json', apikey: config.key, Authorization: `Bearer ${config.key}` };
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function fetchStoreKey(config, key, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=key,value`, {
    headers: headers(config)
  });
  const body = await responseBody(response);
  if (!response.ok) fail(`读取 Supabase ${key} 失败：HTTP ${response.status}`, 'SUPABASE_READ_ERROR', body);
  if (!Array.isArray(body) || body.length !== 1 || !body[0] || body[0].value == null) {
    fail(`Supabase ${key} 不存在或返回格式无效`, 'INVALID_REMOTE_DATA', body);
  }
  return body[0].value;
}

export async function callAtomicRpc(config, rpcName, payload, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/rpc/${encodeURIComponent(rpcName)}`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify(payload)
  });
  const body = await responseBody(response);
  if (!response.ok) fail(`Supabase 事务 RPC 失败：HTTP ${response.status}`, 'SUPABASE_WRITE_ERROR', body);
  if (!body || !['applied', 'already_applied'].includes(body.status)) {
    fail('Supabase 事务 RPC 返回无法验收的状态', 'SUPABASE_WRITE_ERROR', body);
  }
  return body;
}

async function atomicWriteJson(filePath, value) {
  const resolved = path.resolve(filePath);
  const temporary = `${resolved}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await rename(temporary, resolved);
}

function resultFromPlan(mode, category, importPackage, plan) {
  return {
    schemaVersion: 1,
    status: 'running',
    mode,
    category: { id: category.id, name: category.name, words: category.words, count: category.words.length },
    wordbook: { id: importPackage.wordbook.id, name: importPackage.wordbook.name },
    package: { path: plan.packagePath, sha256: plan.packageHash },
    planHash: plan.planHash,
    baseHash: plan.baseHash,
    nextHash: plan.nextHash,
    changed: plan.changed,
    audit: {
      directReuse: plan.audit.summary.directReuse,
      create: plan.audit.summary.create,
      setIfEmpty: plan.audit.summary.setIfEmpty,
      appendUnique: plan.audit.summary.appendUnique,
      conflicts: plan.audit.summary.conflicts,
      missingReferences: plan.audit.errors.length
    },
    before: plan.before,
    after: plan.after,
    acceptance: plan.acceptance,
    snapshotKey: null,
    transaction: 'not_run',
    finishedAt: null,
    errors: []
  };
}

export async function run(rawOptions, dependencies = {}) {
  const options = { ...rawOptions };
  validateOptions(options);
  if (options.help) return { help: true };
  const fetchImpl = dependencies.fetchImpl || fetch;
  const env = dependencies.env || process.env;
  const now = dependencies.now || new Date();
  const resultPath = path.resolve(options.result || 'result.json');
  let result = { schemaVersion: 1, status: 'running', errors: [] };

  try {
    const categoriesPath = path.resolve(options.categories || DEFAULT_CATEGORIES);
    const categoryData = await readJson(categoriesPath);
    const category = resolveCategory(categoryData, options.category);
    const packagePath = await locateImportPackage(category, options.package, DEFAULT_IMPORTS);
    const rawPackage = await readJson(packagePath);
    const importPackage = validatePackageForCategory(rawPackage, category);

    let sourceData;
    let config;
    if (options.snapshot) {
      sourceData = await readJson(path.resolve(options.snapshot));
    } else {
      config = supabaseConfig(options, env);
      sourceData = await fetchStoreKey(config, 'main', fetchImpl);
    }
    const mode = options.apply ? 'apply' : 'dry-run';
    const plan = buildPlan(sourceData, category, importPackage, packagePath, now);
    result = resultFromPlan(mode, category, importPackage, plan);

    if (mode === 'dry-run') {
      result.status = plan.changed ? 'dry_run_ready' : 'already_applied';
      result.finishedAt = new Date().toISOString();
      await atomicWriteJson(resultPath, result);
      return result;
    }

    if (String(options.planhash).trim() !== plan.planHash) {
      fail('planHash 与当前 Git 包或 Supabase 基线不一致，请重新 dry-run', 'STALE_PLAN', {
        expected: options.planhash,
        actual: plan.planHash
      });
    }
    if (!plan.changed) {
      result.status = 'already_applied';
      result.transaction = 'not_needed';
      result.finishedAt = new Date().toISOString();
      await atomicWriteJson(resultPath, result);
      return result;
    }

    const key = snapshotKey(category.id, now);
    const rpc = await callAtomicRpc(config, options.rpcname || DEFAULT_RPC, {
      p_expected_main: plan.baseData,
      p_next_main: plan.nextData,
      p_snapshot_key: key,
      p_category_id: category.id,
      p_wordbook_id: importPackage.wordbook.id,
      p_package_sha256: plan.packageHash
    }, fetchImpl);
    result.transaction = rpc.status;
    result.snapshotKey = rpc.status === 'applied' ? (rpc.snapshotKey || key) : null;

    const finalData = await fetchStoreKey(config, 'main', fetchImpl);
    if (sha256(finalData) !== plan.nextHash) fail('写入后 main 与 dry-run 计划不一致', 'ACCEPTANCE_ERROR');
    if (result.snapshotKey) {
      const savedSnapshot = await fetchStoreKey(config, result.snapshotKey, fetchImpl);
      if (sha256(savedSnapshot) !== plan.baseHash) fail('写入前快照与 dry-run 基线不一致', 'ACCEPTANCE_ERROR');
    }
    result.acceptance = validateTarget(finalData, category, importPackage);
    result.status = rpc.status;
    result.finishedAt = new Date().toISOString();
    await atomicWriteJson(resultPath, result);
    return result;
  } catch (error) {
    result.status = error.code === 'ACCEPTANCE_ERROR' ? 'verify_failed' : 'failed';
    result.finishedAt = new Date().toISOString();
    result.errors = [{ code: error.code || 'UNEXPECTED_ERROR', message: error.message, details: error.details }];
    await atomicWriteJson(resultPath, result).catch(() => {});
    throw error;
  }
}

function printResult(result) {
  console.log(`状态：${result.status}`);
  console.log(`分类：${result.category.name}（${result.category.count} 词）`);
  console.log(`单词本：${result.wordbook.id}`);
  console.log(`复用 ${result.audit.directReuse}｜新建 ${result.audit.create}｜冲突 ${result.audit.conflicts}`);
  console.log(`planHash：${result.planHash}`);
  if (result.snapshotKey) console.log(`快照：${result.snapshotKey}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }
  const result = await run(options);
  printResult(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch(error => {
    console.error(`${error.code || 'ERROR'}：${error.message}`);
    process.exitCode = 1;
  });
}
