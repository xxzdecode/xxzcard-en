#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.dirname(SCRIPT_DIR);

export const CARD_FIELDS = [
  'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
  'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
];

const ARRAY_FIELDS = new Set([
  'morphology', 'collocations', 'irregularForms', 'synonyms', 'wordFamily'
]);
const STRING_FIELDS = new Set(CARD_FIELDS.filter(field => !ARRAY_FIELDS.has(field)));
const POS_PARTS = new Set(['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'det.', 'interj.']);
const NESTED_FIELDS = {
  morphology: ['part', 'meaning', 'knowledgeKey'],
  collocations: ['phrase', 'example'],
  irregularForms: ['label', 'form'],
  synonyms: ['word', 'meaning'],
  wordFamily: ['word', 'pos', 'meaning']
};
const IRREGULAR_LABELS = new Set(['现在式', '过去式', '过去分词', '三单', '复数', '比较级', '最高级']);
const SHARED_WITH = ['sister', 'brother'];
const DEFAULT_RPC = 'create_wordbook_atomic';
const TIME_ZONE = 'Asia/Singapore';

const HELP_TEXT = `新建单词本自动化

用法：
  node scripts/create-wordbook.mjs --task <task.json> --dry-run
  node scripts/create-wordbook.mjs --task <task.json> --apply
  node scripts/create-wordbook.mjs --file <cards.txt> --name <名称> --task-id <id> --dry-run [--snapshot <main.json>]
  node scripts/create-wordbook.mjs --file <cards.txt> --name <名称> --task-id <id> --apply

必选：
  --task <path>       固定任务 JSON；使用时不再单独传 file/name/task-id
  --file <path>       ChatGPT 已完成内容的真实导入 TXT
  --name <text>       名称正文；脚本自动生成 MM.DD｜名称
  --task-id <id>      稳定任务 ID；重跑同一任务时必须保持不变
  --dry-run           解析、校验和查重，但不写 Supabase
  --apply             通过事务 RPC 写入，并在写后重新读取验收

可选：
  --snapshot <path>   dry-run 使用本地 main 数据夹具，不访问 Supabase
  --result <path>     result.json 路径，默认当前目录/result.json
  --supabase-url <u>  覆盖 SUPABASE_URL
  --supabase-key <k>  覆盖 SUPABASE_KEY
  --rpc-name <name>   覆盖 RPC 名称，默认 ${DEFAULT_RPC}
  --help              显示说明

安全约束：
  脚本不会生成或改写释义、音标及卡片内容，也不会创建 known/unknown 学习状态。
`;

function fail(message, code = 'VALIDATION_ERROR', details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  throw error;
}

export function parseArgs(argv) {
  const valueOptions = new Set([
    '--task', '--file', '--name', '--task-id', '--snapshot', '--result',
    '--supabase-url', '--supabase-key', '--rpc-name'
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
    if (value === undefined || value.startsWith('--')) {
      fail(`参数 ${argument} 缺少值`, 'ARGUMENT_ERROR');
    }
    const key = argument.slice(2).replaceAll('-', '');
    if (Object.hasOwn(options, key)) fail(`参数 ${argument} 不得重复`, 'ARGUMENT_ERROR');
    options[key] = value;
    index += 1;
  }
  return options;
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label}不能为空`);
  return value.trim();
}

function validateOptions(options) {
  if (options.help) return;
  if (!options.file) fail('缺少必选参数：--file <path>', 'ARGUMENT_ERROR');
  if (!options.name) fail('缺少必选参数：--name <名称>', 'ARGUMENT_ERROR');
  if (!options.taskid) fail('缺少必选参数：--task-id <id>', 'ARGUMENT_ERROR');
  if (Boolean(options.dryrun) === Boolean(options.apply)) {
    fail('--dry-run 和 --apply 必须且只能选择一个', 'ARGUMENT_ERROR');
  }
  if (options.apply && options.snapshot) {
    fail('--apply 不允许使用 --snapshot；正式写入必须读取 Supabase 最新数据', 'ARGUMENT_ERROR');
  }
  if (String(options.name).includes('｜')) {
    fail('--name 只填写名称正文，不要包含日期前缀或全角竖线');
  }
}

function parseTaskDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) fail('task.date 必须是 YYYY-MM-DD', 'INVALID_TASK');
  const date = new Date(`${value}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== value) fail('task.date 不是有效日期', 'INVALID_TASK');
  return { iso: value, monthDay: `${match[2]}.${match[3]}` };
}

function validateTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) fail('task.json 必须是 JSON 对象', 'INVALID_TASK');
  requireText(task.taskId, 'task.taskId');
  requireText(task.sourceFile, 'task.sourceFile');
  requireText(task.baseName, 'task.baseName');
  parseTaskDate(task.date);
  if (task.timezone !== TIME_ZONE) fail(`task.timezone 必须是 ${TIME_ZONE}`, 'INVALID_TASK');
  if (!sameStringArray(task.sharedWith, SHARED_WITH)) fail('task.sharedWith 必须是 sister + brother', 'INVALID_TASK');
  if (!Number.isInteger(task.expectedCardCount) || task.expectedCardCount < 0) {
    fail('task.expectedCardCount 必须是非负整数', 'INVALID_TASK');
  }
  if (!Array.isArray(task.expectedWords) || task.expectedWords.some(word => typeof word !== 'string' || !word.trim())) {
    fail('task.expectedWords 必须是非空字符串数组', 'INVALID_TASK');
  }
  if (!Array.isArray(task.existingWords) || !Array.isArray(task.existingCardUpdateCandidates)) {
    fail('task.existingWords 和 existingCardUpdateCandidates 必须是数组', 'INVALID_TASK');
  }
  if (task.mode !== 'create' || task.strict !== true || task.autoApplyAfterDryRun !== true) {
    fail('第一版只支持 mode=create、strict=true、autoApplyAfterDryRun=true', 'INVALID_TASK');
  }
}

async function resolveTaskOptions(rawOptions) {
  if (!rawOptions.task) return { options: rawOptions, task: null, taskPath: null };
  if (rawOptions.file || rawOptions.name || rawOptions.taskid) {
    fail('--task 不得与 --file、--name 或 --task-id 同时使用', 'ARGUMENT_ERROR');
  }
  const taskPath = path.resolve(rawOptions.task);
  const source = await readUtf8(taskPath);
  let task;
  try { task = JSON.parse(source); } catch (error) {
    fail(`task.json 无法解析：${error.message}`, 'INVALID_TASK');
  }
  validateTask(task);
  return {
    task,
    taskPath,
    options: {
      ...rawOptions,
      file: path.resolve(path.dirname(taskPath), task.sourceFile),
      name: task.baseName,
      taskid: task.taskId,
      result: rawOptions.result || path.join(path.dirname(taskPath), 'result.json'),
      taskdate: task.date
    }
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function cardFingerprint(card) {
  return `sha256:${sha256(stableStringify(card))}`;
}

export function normalizedWord(value) {
  return String(value || '').trim().toLocaleLowerCase('en');
}

export function singaporeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    iso: `${values.year}-${values.month}-${values.day}`,
    monthDay: `${values.month}.${values.day}`
  };
}

export function makeBatch({ title, taskId, cards, now = new Date(), date: requestedDate = null }) {
  const cleanTitle = requireText(title, '名称');
  const cleanTaskId = requireText(taskId, 'taskId');
  const date = requestedDate ? parseTaskDate(requestedDate) : singaporeDateParts(now);
  const prefix = `${date.monthDay}｜`;
  const finalName = cleanTitle.startsWith(prefix) ? cleanTitle : `${prefix}${cleanTitle}`;
  const fingerprints = cards.map(cardFingerprint).sort();
  return {
    batch: {
      id: `wordbook-${sha256(cleanTaskId).slice(0, 20)}`,
      date: date.iso,
      name: finalName,
      cards,
      sharedWith: [...SHARED_WITH],
      automation: {
        schemaVersion: 1,
        taskId: cleanTaskId,
        title: cleanTitle,
        cardFingerprints: fingerprints,
        createdAt: now.toISOString()
      }
    },
    fingerprints
  };
}

let existingParser;

function loadExistingParser() {
  if (existingParser) return existingParser;
  const context = vm.createContext({ console: { warn() {}, log() {}, error() {} } });
  const dictionaryPath = path.join(REPO_ROOT, 'js', 'dictionary.js');
  const importPath = path.join(REPO_ROOT, 'js', 'import.js');
  return Promise.all([readFile(dictionaryPath, 'utf8'), readFile(importPath, 'utf8')]).then(([dictionary, importer]) => {
    vm.runInContext(dictionary, context, { filename: dictionaryPath });
    vm.runInContext(importer, context, { filename: importPath });
    existingParser = text => {
      context.__wordbookInput = text;
      const result = vm.runInContext('parseCards(__wordbookInput)', context);
      delete context.__wordbookInput;
      return JSON.parse(JSON.stringify(result));
    };
    return existingParser;
  });
}

function validateLineLayout(text) {
  const errors = [];
  if (text.startsWith('\uFEFF')) errors.push('TXT 不允许包含 UTF-8 BOM');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\u200c\u200d\u2060\ufeff]/u.test(text)) {
    errors.push('TXT 包含控制字符、BOM 或不可见零宽字符');
  }
  if (text.includes('\t')) errors.push('TXT 不允许使用制表符');
  const hasCrLf = text.includes('\r\n');
  const withoutCrLf = text.replaceAll('\r\n', '');
  if (withoutCrLf.includes('\r')) errors.push('TXT 包含单独 CR 或混合换行');
  if (hasCrLf && /(^|[^\r])\n/.test(text)) errors.push('TXT 不允许混用 CRLF 和 LF');

  const normalized = text.replaceAll('\r\n', '\n');
  if (normalized.trim() === '') return ['TXT 内容不能为空'];
  if (/\n[ \t]+\n/.test(normalized)) errors.push('卡片分隔行必须是完全空白的一行');
  if (/\n{3,}/.test(normalized)) errors.push('卡片之间只能保留一个完整空行');
  if (normalized.startsWith('\n')) errors.push('文件开头不允许空行');
  if (/\n\n$/.test(normalized)) errors.push('文件结尾不允许额外空行');

  const body = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  const blocks = body.split('\n\n');
  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n');
    if (lines.length !== CARD_FIELDS.length) {
      errors.push(`第 ${blockIndex + 1} 张卡必须正好有 ${CARD_FIELDS.length} 行，实际 ${lines.length} 行`);
      return;
    }
    lines.forEach((line, fieldIndex) => {
      const expected = `${CARD_FIELDS[fieldIndex]}: `;
      if (!line.startsWith(expected)) {
        errors.push(`第 ${blockIndex + 1} 张卡第 ${fieldIndex + 1} 行必须以“${expected}”开头`);
      } else if (line.slice(expected.length).startsWith(' ')) {
        errors.push(`第 ${blockIndex + 1} 张卡第 ${fieldIndex + 1} 行冒号后只能有一个空格`);
      }
    });
  });
  return errors;
}

function validateExactKeys(item, expectedKeys, label, errors) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`${label} 必须是 JSON 对象`);
    return false;
  }
  const keys = Object.keys(item);
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    errors.push(`${label} 字段必须完整并按顺序排列：${expectedKeys.join(' → ')}`);
    return false;
  }
  return true;
}

function validateNestedArray(field, items, cardLabel, errors) {
  const expectedKeys = NESTED_FIELDS[field];
  items.forEach((item, index) => {
    const label = `${cardLabel}.${field}[${index}]`;
    if (!validateExactKeys(item, expectedKeys, label, errors)) return;
    expectedKeys.forEach(key => {
      if (typeof item[key] !== 'string' || item[key].trim() === '') {
        errors.push(`${label}.${key} 必须是非空字符串`);
      }
    });
    if (field === 'irregularForms' && !IRREGULAR_LABELS.has(item.label)) {
      errors.push(`${label}.label 不在允许范围：${[...IRREGULAR_LABELS].join('、')}`);
    }
    if (field === 'collocations' && typeof item.example === 'string' && !item.example.includes(' / ')) {
      errors.push(`${label}.example 必须使用“英文 / 中文”格式`);
    }
    if (field === 'wordFamily' && typeof item.pos === 'string' && !isValidPos(item.pos)) {
      errors.push(`${label}.pos 必须使用规定的词性缩写`);
    }
  });
}

function isValidPos(value) {
  const parts = String(value).split('/');
  return parts.length > 0 && parts.every(part => POS_PARTS.has(part));
}

function validateCard(card, cardIndex, errors) {
  const label = `第 ${cardIndex + 1} 张卡`;
  if (!validateExactKeys(card, CARD_FIELDS, label, errors)) return;
  for (const field of STRING_FIELDS) {
    if (typeof card[field] !== 'string') errors.push(`${label}.${field} 必须是字符串`);
  }
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(card[field])) errors.push(`${label}.${field} 必须是数组`);
  }
  for (const field of ['word', 'meaning', 'pos', 'phonetic']) {
    if (typeof card[field] !== 'string' || card[field].trim() === '') {
      errors.push(`${label}.${field} 不能为空`);
    }
  }
  if (typeof card.pos === 'string' && card.pos && !isValidPos(card.pos)) {
    errors.push(`${label}.pos 必须使用规定的词性缩写，可用 / 组合`);
  }
  if (typeof card.phonetic === 'string' && card.phonetic) {
    if (!/^\/[^/\r\n]+\/$/u.test(card.phonetic)) errors.push(`${label}.phonetic 必须放在 / / 中`);
    if (/(?:oʊ|ɚ|ɝ)/u.test(card.phonetic)) errors.push(`${label}.phonetic 包含规则明确禁止的美式 IPA`);
  }
  if (Array.isArray(card.collocations) && (card.collocations.length < 1 || card.collocations.length > 5)) {
    errors.push(`${label}.collocations 必须有 1–5 项`);
  }
  if (Array.isArray(card.synonyms) && card.synonyms.length > 5) {
    errors.push(`${label}.synonyms 最多 5 项`);
  }
  if (Array.isArray(card.wordFamily) && card.wordFamily.length > 3) {
    errors.push(`${label}.wordFamily 最多 3 项`);
  }
  for (const field of ARRAY_FIELDS) {
    if (Array.isArray(card[field])) validateNestedArray(field, card[field], label, errors);
  }
}

export async function parseAndValidateCards(text) {
  const layoutErrors = validateLineLayout(text);
  const parser = await loadExistingParser();
  const parsed = parser(text);
  const errors = [...layoutErrors, ...(parsed.errors || [])];
  (parsed.cards || []).forEach((card, index) => validateCard(card, index, errors));

  const words = new Map();
  (parsed.cards || []).forEach((card, index) => {
    const key = normalizedWord(card.word);
    if (!key) return;
    if (words.has(key)) errors.push(`批次内重复词：${card.word}（第 ${words.get(key) + 1}、${index + 1} 张卡）`);
    else words.set(key, index);
  });
  if (errors.length > 0) fail('TXT 解析或完整格式校验失败', 'INVALID_IMPORT_TEXT', errors);
  return { cards: parsed.cards, uniqueWordCount: words.size };
}

function getBatches(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.batches)) {
    fail('Supabase main.value 格式无效：缺少 batches 数组', 'INVALID_REMOTE_DATA');
  }
  return data.batches;
}

function sameStringArray(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length && left.every((item, index) => item === right[index]);
}

export function inspectIdempotency(data, plannedBatch, fingerprints) {
  const batches = getBatches(data);
  const taskId = plannedBatch.automation.taskId;
  const existingWords = new Map();
  const existingFingerprints = new Map();

  for (const batch of batches) {
    for (const card of Array.isArray(batch.cards) ? batch.cards : []) {
      const key = normalizedWord(card && card.word);
      if (key && !existingWords.has(key)) existingWords.set(key, batch.name || batch.id || '未知批次');
    }
    const stored = batch && batch.automation && Array.isArray(batch.automation.cardFingerprints)
      ? batch.automation.cardFingerprints : [];
    stored.forEach(fingerprint => existingFingerprints.set(fingerprint, batch.name || batch.id || '未知批次'));
  }

  const taskBatch = batches.find(batch => batch && batch.automation && batch.automation.taskId === taskId);
  if (taskBatch) {
    const storedFingerprints = taskBatch.automation.cardFingerprints || [];
    const exact = taskBatch.id === plannedBatch.id
      && taskBatch.automation.title === plannedBatch.automation.title
      && sameStringArray(storedFingerprints, fingerprints);
    if (exact) return { status: 'already_applied', batch: taskBatch, conflicts: [] };
    return {
      status: 'conflict', batch: taskBatch,
      conflicts: [`taskId 已存在但批次内容不同：${taskId}`]
    };
  }

  const conflicts = [];
  const wordConflicts = [];
  const sameName = batches.find(batch => batch && batch.name === plannedBatch.name);
  if (sameName) conflicts.push(`同名批次已存在：${plannedBatch.name}`);
  const sameId = batches.find(batch => batch && String(batch.id) === String(plannedBatch.id));
  if (sameId) conflicts.push(`批次 ID 已存在：${plannedBatch.id}`);
  for (const card of plannedBatch.cards) {
    const key = normalizedWord(card.word);
    if (existingWords.has(key)) wordConflicts.push(`Supabase 已存在词 ${card.word}（${existingWords.get(key)}）`);
  }
  for (const fingerprint of fingerprints) {
    if (existingFingerprints.has(fingerprint)) {
      conflicts.push(`卡片指纹已存在 ${fingerprint}（${existingFingerprints.get(fingerprint)}）`);
    }
  }
  if (wordConflicts.length === plannedBatch.cards.length && conflicts.length === 0) {
    return { status: 'no_changes', batch: null, conflicts: [...new Set(wordConflicts)] };
  }
  conflicts.push(...wordConflicts);
  return { status: conflicts.length ? 'conflict' : 'ready', batch: null, conflicts: [...new Set(conflicts)] };
}

function supabaseConfig(options, env) {
  const url = String(options.supabaseurl || env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(options.supabasekey || env.SUPABASE_KEY || '');
  if (!url || !key) {
    fail('需要 SUPABASE_URL 和 SUPABASE_KEY（可用环境变量或命令行参数提供）', 'SUPABASE_CONFIG_ERROR');
  }
  return { url, key };
}

function headers(config) {
  return {
    'Content-Type': 'application/json',
    apikey: config.key,
    Authorization: `Bearer ${config.key}`
  };
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function fetchMain(config, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/kv_store?key=eq.main&select=value`, {
    headers: headers(config)
  });
  const body = await responseBody(response);
  if (!response.ok) fail(`读取 Supabase main 失败：HTTP ${response.status}`, 'SUPABASE_READ_ERROR', body);
  if (!Array.isArray(body) || body.length !== 1 || !body[0] || body[0].value == null) {
    fail('Supabase main 行不存在或返回格式无效', 'INVALID_REMOTE_DATA');
  }
  return body[0].value;
}

export async function callAtomicRpc(config, rpcName, batch, fingerprints, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/rpc/${encodeURIComponent(rpcName)}`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({
      p_task_id: batch.automation.taskId,
      p_batch: batch,
      p_card_fingerprints: fingerprints
    })
  });
  const body = await responseBody(response);
  if (!response.ok) fail(`Supabase 事务 RPC 失败：HTTP ${response.status}`, 'SUPABASE_WRITE_ERROR', body);
  if (!body || !['applied', 'already_applied'].includes(body.status)) {
    fail('Supabase 事务 RPC 返回了无法验收的状态', 'SUPABASE_WRITE_ERROR', body);
  }
  return body;
}

export function acceptBatch(data, plannedBatch, fingerprints) {
  const batch = getBatches(data).find(item => String(item.id) === String(plannedBatch.id));
  const errors = [];
  if (!batch) return { ok: false, errors: [`写入后找不到批次 ${plannedBatch.id}`], batch: null };
  if (batch.name !== plannedBatch.name) errors.push('写入后批次名称不一致');
  if (batch.date !== plannedBatch.date) errors.push('写入后批次日期不一致');
  if (!sameStringArray(batch.sharedWith, SHARED_WITH)) errors.push('推送状态不是 sister + brother');
  if (!Array.isArray(batch.cards) || batch.cards.length !== plannedBatch.cards.length) errors.push('写入后卡片数量不一致');
  const words = new Set((batch.cards || []).map(card => normalizedWord(card.word)).filter(Boolean));
  if (words.size !== plannedBatch.cards.length) errors.push('写入后唯一词数不一致');
  (batch.cards || []).forEach((card, index) => {
    const cardErrors = [];
    validateCard(card, index, cardErrors);
    errors.push(...cardErrors.map(error => `写入后${error}`));
  });
  const automation = batch.automation || {};
  if (automation.taskId !== plannedBatch.automation.taskId) errors.push('写入后 taskId 不一致');
  if (automation.title !== plannedBatch.automation.title) errors.push('写入后名称正文不一致');
  if (!sameStringArray(automation.cardFingerprints, fingerprints)) errors.push('写入后卡片指纹不一致');
  const actualFingerprints = (batch.cards || []).map(cardFingerprint).sort();
  if (!sameStringArray(actualFingerprints, fingerprints)) errors.push('写入后卡片内容与指纹不一致');
  if (Object.hasOwn(batch, 'known') || Object.hasOwn(batch, 'unknown')) {
    errors.push('批次中不应创建 known / unknown 学习状态');
  }
  return { ok: errors.length === 0, errors, batch };
}

async function readUtf8(filePath) {
  const bytes = await readFile(filePath);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`文件不是有效 UTF-8：${filePath}`, 'INVALID_UTF8');
  }
}

async function readSnapshot(filePath) {
  const text = await readUtf8(filePath);
  if (text.startsWith('\uFEFF')) fail(`快照 JSON 不允许包含 BOM：${filePath}`, 'INVALID_SNAPSHOT');
  let parsed;
  try { parsed = JSON.parse(text); } catch (error) {
    fail(`快照 JSON 无法解析：${error.message}`, 'INVALID_SNAPSHOT');
  }
  if (parsed && Object.hasOwn(parsed, 'value') && !Array.isArray(parsed.batches)) parsed = parsed.value;
  getBatches(parsed);
  return parsed;
}

async function atomicWriteJson(filePath, value) {
  const resolved = path.resolve(filePath);
  const temp = `${resolved}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await rename(temp, resolved);
}

function baseResult({ mode, sourcePath, resultPath, taskId, startedAt }) {
  return {
    schemaVersion: 1,
    status: 'running',
    mode,
    taskId,
    source: sourcePath,
    resultFile: resultPath,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    batch: null,
    counts: null,
    checks: {
      utf8: false,
      existingParser: false,
      completeFormat: false,
      batchUniqueWords: false,
      firstSupabaseCheck: 'not_run',
      secondSupabaseCheck: 'not_run',
      transactionWrite: 'not_run',
      postWriteAcceptance: 'not_run',
      pushStatus: 'not_run',
      learningStateWrites: 0
    },
    errors: []
  };
}

function validateTaskExpectations(task, parsed) {
  if (!task) return;
  if (parsed.cards.length !== task.expectedCardCount) {
    fail(`实际卡片数 ${parsed.cards.length} 与 expectedCardCount ${task.expectedCardCount} 不一致`, 'TASK_EXPECTATION_MISMATCH');
  }
  const actual = parsed.cards.map(card => normalizedWord(card.word)).sort();
  const expected = task.expectedWords.map(normalizedWord).sort();
  if (!sameStringArray(actual, expected)) {
    fail('实际标准化词表与 task.expectedWords 不一致', 'TASK_EXPECTATION_MISMATCH', { expected, actual });
  }
}

function addTaskResultFields(result, task, planned, verified) {
  if (!task || !planned) return;
  result.batchId = planned.batch.id;
  result.finalName = planned.batch.name;
  result.date = planned.batch.date;
  result.timezone = TIME_ZONE;
  result.cardCount = planned.batch.cards.length;
  result.uniqueWordCount = new Set(planned.batch.cards.map(card => normalizedWord(card.word))).size;
  result.sharedWith = [...SHARED_WITH];
  result.skippedExisting = task.existingWords;
  result.existingCardUpdateCandidates = task.existingCardUpdateCandidates;
  result.fingerprint = `sha256:${sha256(planned.fingerprints.join('\n'))}`;
  result.verified = verified;
}

export async function run(rawOptions, dependencies = {}) {
  const resolved = await resolveTaskOptions(rawOptions);
  const options = resolved.options;
  const task = resolved.task;
  validateOptions(options);
  if (options.help) return { help: true };
  const now = dependencies.now || new Date();
  const fetchImpl = dependencies.fetchImpl || fetch;
  const env = dependencies.env || process.env;
  const sourcePath = path.resolve(options.file);
  const resultPath = path.resolve(options.result || 'result.json');
  const mode = options.apply ? 'apply' : 'dry-run';
  const taskId = requireText(options.taskid, 'taskId');
  const result = baseResult({ mode, sourcePath, resultPath, taskId, startedAt: now });

  try {
    const text = await readUtf8(sourcePath);
    result.checks.utf8 = true;
    const parsed = await parseAndValidateCards(text);
    validateTaskExpectations(task, parsed);
    result.checks.existingParser = true;
    result.checks.completeFormat = true;
    result.checks.batchUniqueWords = true;
    const planned = makeBatch({ title: options.name, taskId, cards: parsed.cards, now, date: options.taskdate });
    addTaskResultFields(result, task, planned, false);
    result.batch = {
      id: planned.batch.id,
      date: planned.batch.date,
      name: planned.batch.name,
      sharedWith: planned.batch.sharedWith,
      cardFingerprints: planned.fingerprints
    };
    result.counts = { cards: planned.batch.cards.length, uniqueWords: parsed.uniqueWordCount };

    let firstData;
    let config;
    if (options.snapshot) {
      firstData = await readSnapshot(path.resolve(options.snapshot));
    } else {
      config = supabaseConfig(options, env);
      firstData = await fetchMain(config, fetchImpl);
    }
    const firstCheck = inspectIdempotency(firstData, planned.batch, planned.fingerprints);
    result.checks.firstSupabaseCheck = firstCheck.status;
    if (firstCheck.status === 'conflict') {
      fail('发布前 Supabase 查重失败', 'IDEMPOTENCY_CONFLICT', firstCheck.conflicts);
    }

    if (firstCheck.status === 'no_changes') {
      result.status = 'no_changes';
      result.finishedAt = new Date().toISOString();
      addTaskResultFields(result, task, planned, true);
      await atomicWriteJson(resultPath, result);
      return result;
    }

    if (mode === 'dry-run') {
      if (firstCheck.status === 'already_applied') {
        const expectedBatch = firstCheck.batch;
        const acceptance = acceptBatch(firstData, expectedBatch, planned.fingerprints);
        if (!acceptance.ok) fail('已存在幂等批次未通过验收', 'ACCEPTANCE_ERROR', acceptance.errors);
        result.batch = {
          id: expectedBatch.id,
          date: expectedBatch.date,
          name: expectedBatch.name,
          sharedWith: expectedBatch.sharedWith,
          cardFingerprints: planned.fingerprints
        };
        result.checks.postWriteAcceptance = 'passed_existing';
        result.checks.pushStatus = 'sister+brother';
      }
      result.status = firstCheck.status === 'already_applied'
        ? (task ? 'already_completed' : 'already_applied')
        : 'dry_run_ready';
      addTaskResultFields(result, task, { ...planned, batch: firstCheck.batch || planned.batch }, firstCheck.status === 'already_applied');
      result.finishedAt = new Date().toISOString();
      await atomicWriteJson(resultPath, result);
      return result;
    }

    const secondData = await fetchMain(config, fetchImpl);
    const secondCheck = inspectIdempotency(secondData, planned.batch, planned.fingerprints);
    result.checks.secondSupabaseCheck = secondCheck.status;
    if (secondCheck.status === 'conflict') {
      fail('发布前 Supabase 二次查重失败', 'IDEMPOTENCY_CONFLICT', secondCheck.conflicts);
    }
    if (secondCheck.status === 'no_changes') {
      result.status = 'no_changes';
      result.finishedAt = new Date().toISOString();
      addTaskResultFields(result, task, planned, true);
      await atomicWriteJson(resultPath, result);
      return result;
    }
    if (secondCheck.status === 'already_applied') {
      const expectedBatch = secondCheck.batch;
      const acceptance = acceptBatch(secondData, expectedBatch, planned.fingerprints);
      if (!acceptance.ok) fail('已存在幂等批次未通过验收', 'ACCEPTANCE_ERROR', acceptance.errors);
      result.batch = {
        id: expectedBatch.id,
        date: expectedBatch.date,
        name: expectedBatch.name,
        sharedWith: expectedBatch.sharedWith,
        cardFingerprints: planned.fingerprints
      };
      result.status = task ? 'already_completed' : 'already_applied';
      result.checks.transactionWrite = 'not_needed';
      result.checks.postWriteAcceptance = 'passed';
      result.checks.pushStatus = 'sister+brother';
    } else {
      const rpc = await callAtomicRpc(config, options.rpcname || DEFAULT_RPC, planned.batch, planned.fingerprints, fetchImpl);
      result.checks.transactionWrite = rpc.status;
      const finalData = await fetchMain(config, fetchImpl);
      const acceptance = acceptBatch(finalData, planned.batch, planned.fingerprints);
      if (!acceptance.ok) fail('写入后验收失败', 'ACCEPTANCE_ERROR', acceptance.errors);
      result.status = task ? 'success' : rpc.status;
      result.checks.postWriteAcceptance = 'passed';
      result.checks.pushStatus = 'sister+brother';
    }
    addTaskResultFields(result, task, { ...planned, batch: secondCheck.batch || planned.batch }, true);
    result.finishedAt = new Date().toISOString();
    await atomicWriteJson(resultPath, result);
    return result;
  } catch (error) {
    result.status = error.code === 'ACCEPTANCE_ERROR' ? 'verify_failed' : 'failed';
    result.finishedAt = new Date().toISOString();
    result.stage = error.code === 'ACCEPTANCE_ERROR' ? 'verify' : 'validate_or_publish';
    result.reason = error.message;
    result.changedDatabase = error.code === 'ACCEPTANCE_ERROR';
    result.errors.push({
      code: error.code || 'UNEXPECTED_ERROR',
      message: error.message,
      details: error.details
    });
    await atomicWriteJson(resultPath, result).catch(() => {});
    throw error;
  }
}

export function exitCodeForError(error) {
  if (error.code === 'IDEMPOTENCY_CONFLICT') return 2;
  if (error.code === 'SUPABASE_WRITE_ERROR') return 3;
  if (error.code === 'ACCEPTANCE_ERROR') return 4;
  if (/^(SUPABASE_CONFIG_ERROR|SUPABASE_READ_ERROR|INVALID_REMOTE_DATA)$/.test(error.code || '')) return 5;
  return 1;
}

function printResult(result) {
  console.log(result.mode === 'dry-run' ? '新建单词本预演完成（未写入 Supabase）' : '新建单词本自动化完成');
  console.log(`状态：${result.status}`);
  console.log(`批次：${result.batch.name}`);
  console.log(`卡片：${result.counts.cards}；唯一词：${result.counts.uniqueWords}`);
  console.log(`推送：${result.batch.sharedWith.join('、')}`);
  console.log(`结果：${result.resultFile}`);
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
    console.error(`错误 [${error.code || 'UNEXPECTED_ERROR'}]：${error.message}`);
    if (Array.isArray(error.details)) error.details.forEach(detail => console.error(`- ${detail}`));
    process.exitCode = exitCodeForError(error);
  });
}
