#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
export const WEAKNESS_VIEW_KEY = 'assessment_weakness_view_v1';
const STUDENT_IDS = ['sister', 'brother'];
const CURRENT_STATUSES = new Set(['active', 'improving']);
const GROUP_TITLE_OVERRIDES = Object.freeze({
  'sentence-parts': '句子结构'
});

export class PublishWeaknessViewError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'PublishWeaknessViewError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new PublishWeaknessViewError(code, message, details);
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function requiredText(value, label) {
  const result = text(value);
  if (!result) fail('INVALID_WEAKNESS_STATE', `${label} 不能为空`);
  return result;
}

function canonicalJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalJsonValue(value[key])]));
}

function sameJson(left, right) {
  return JSON.stringify(canonicalJsonValue(left)) === JSON.stringify(canonicalJsonValue(right));
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalJsonValue(value)), 'utf8').digest('hex')}`;
}

function topicTitleMap(topics) {
  if (!Array.isArray(topics)) fail('INVALID_TOPICS', '知识点目录必须是数组');
  const result = new Map();
  topics.forEach((topic, index) => {
    if (!isObject(topic)) return;
    const key = text(topic.topicKey || topic.topic_key);
    const title = text(topic.titleZh || topic.title_zh || topic.title);
    if (key && title) result.set(key, title);
    else if (key || title) fail('INVALID_TOPICS', `topics[${index}] 的标识或标题不完整`);
  });
  return result;
}

function groupTitle(kpId, titles) {
  if (GROUP_TITLE_OVERRIDES[kpId]) return GROUP_TITLE_OVERRIDES[kpId];
  const full = titles.get(kpId) || kpId;
  return full.split(/[：:]/, 1)[0].trim() || kpId;
}

function evidenceCount(value, weaknessId) {
  if (!Array.isArray(value)) fail('INVALID_WEAKNESS_STATE', `${weaknessId}.evidence 必须是数组`);
  const refs = new Set();
  value.forEach((item, index) => {
    if (!isObject(item)) fail('INVALID_WEAKNESS_STATE', `${weaknessId}.evidence[${index}] 必须是对象`);
    const paperId = text(item.paper_id);
    const attemptId = text(item.attempt_id);
    if ((!paperId && !attemptId) || (paperId && attemptId)) {
      fail('INVALID_WEAKNESS_STATE', `${weaknessId}.evidence[${index}] 必须且只能包含 paper_id 或 attempt_id`);
    }
    const questionId = requiredText(item.question_id, `${weaknessId}.evidence[${index}].question_id`);
    refs.add(`${paperId ? 'paper' : 'attempt'}\u0000${paperId || attemptId}\u0000${questionId}`);
  });
  return refs.size;
}

function normalizeStudentItems(studentId, value, titles) {
  const source = isObject(value) ? value : {};
  const rawItems = Array.isArray(source.items) ? source.items : [];
  const weaknessIds = new Set();
  const groups = new Map();

  rawItems.forEach((item, index) => {
    if (!isObject(item)) fail('INVALID_WEAKNESS_STATE', `${studentId}.items[${index}] 必须是对象`);
    const status = requiredText(item.status, `${studentId}.items[${index}].status`);
    if (!['active', 'improving', 'mastered'].includes(status)) {
      fail('INVALID_WEAKNESS_STATE', `${studentId}.items[${index}].status 无效`);
    }
    if (!CURRENT_STATUSES.has(status)) return;

    const weaknessId = requiredText(item.weakness_id, `${studentId}.items[${index}].weakness_id`);
    if (weaknessIds.has(weaknessId)) fail('INVALID_WEAKNESS_STATE', `weakness_id 重复：${weaknessId}`);
    weaknessIds.add(weaknessId);
    if (requiredText(item.student_id, `${weaknessId}.student_id`) !== studentId) {
      fail('INVALID_WEAKNESS_STATE', `${weaknessId}.student_id 与所属学生不一致`);
    }
    const kpId = requiredText(item.kp_id, `${weaknessId}.kp_id`);
    const normalized = {
      weakness_id: weaknessId,
      title: requiredText(item.title, `${weaknessId}.title`),
      status,
      evidence_count: evidenceCount(item.evidence, weaknessId),
      last_seen_at: requiredText(item.last_seen_at, `${weaknessId}.last_seen_at`)
    };
    if (!groups.has(kpId)) groups.set(kpId, []);
    groups.get(kpId).push(normalized);
  });

  const normalizedGroups = [...groups.entries()].map(([kpId, items]) => {
    items.sort((left, right) => (
      (left.status === right.status ? 0 : left.status === 'active' ? -1 : 1)
      || right.evidence_count - left.evidence_count
      || right.last_seen_at.localeCompare(left.last_seen_at)
    ));
    return {
      kp_id: kpId,
      title: groupTitle(kpId, titles),
      item_count: items.length,
      evidence_count: items.reduce((sum, item) => sum + item.evidence_count, 0),
      items
    };
  });
  normalizedGroups.sort((left, right) => (
    right.item_count - left.item_count
    || right.evidence_count - left.evidence_count
    || left.kp_id.localeCompare(right.kp_id)
  ));
  return {
    item_count: normalizedGroups.reduce((sum, group) => sum + group.item_count, 0),
    groups: normalizedGroups
  };
}

export function buildWeaknessView(state, topics, now = new Date()) {
  if (!isObject(state) || !isObject(state.students)) {
    fail('INVALID_WEAKNESS_STATE', '薄弱知识点状态缺少 students');
  }
  const sourceUpdatedAt = requiredText(state.updated_at, 'updated_at');
  const titles = topicTitleMap(topics);
  return {
    schema_version: 1,
    source_updated_at: sourceUpdatedAt,
    source_hash: sha256(state),
    published_at: now.toISOString(),
    students: Object.fromEntries(STUDENT_IDS.map(studentId => [
      studentId,
      normalizeStudentItems(studentId, state.students[studentId], titles)
    ]))
  };
}

function requestHeaders(config) {
  return {
    'Content-Type': 'application/json',
    apikey: config.key,
    Authorization: `Bearer ${config.key}`
  };
}

async function responseJson(response) {
  const body = await response.text();
  if (!body) return null;
  try { return JSON.parse(body); } catch { return body; }
}

export async function fetchWeaknessView(config, fetchImpl = fetch) {
  const response = await fetchImpl(
    `${config.url}/rest/v1/kv_store?key=eq.${WEAKNESS_VIEW_KEY}&select=value`,
    { headers: requestHeaders(config) }
  );
  const body = await responseJson(response);
  if (!response.ok) fail('SUPABASE_READ_ERROR', `读取 ${WEAKNESS_VIEW_KEY} 失败：HTTP ${response.status}`, body);
  if (!Array.isArray(body) || body.length > 1) fail('INVALID_REMOTE_VIEW', `${WEAKNESS_VIEW_KEY} 返回格式无效`);
  return body.length ? body[0].value : null;
}

async function writeWeaknessView(config, view, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/kv_store`, {
    method: 'POST',
    headers: { ...requestHeaders(config), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key: WEAKNESS_VIEW_KEY, value: view })
  });
  const body = await responseJson(response);
  if (!response.ok) fail('SUPABASE_WRITE_ERROR', `写入 ${WEAKNESS_VIEW_KEY} 失败：HTTP ${response.status}`, body);
}

export async function publishWeaknessView({ state, topics, config, apply = false, now = new Date(), fetchImpl = fetch }) {
  const planned = buildWeaknessView(state, topics, now);
  const initial = await fetchWeaknessView(config, fetchImpl);
  const result = {
    key: WEAKNESS_VIEW_KEY,
    source_hash: planned.source_hash,
    source_updated_at: planned.source_updated_at,
    student_item_counts: Object.fromEntries(STUDENT_IDS.map(id => [id, planned.students[id].item_count]))
  };
  if (initial && initial.source_hash === planned.source_hash) {
    return { status: 'already_published', changed_database: false, ...result };
  }
  if (!apply) return { status: 'dry_run_ready', changed_database: false, ...result };

  const latest = await fetchWeaknessView(config, fetchImpl);
  if (!sameJson(latest, initial)) fail('REMOTE_CHANGED', '预演后远端薄弱项快照发生变化，已停止写入');
  await writeWeaknessView(config, planned, fetchImpl);
  const verified = await fetchWeaknessView(config, fetchImpl);
  if (!sameJson(verified, planned)) fail('POST_WRITE_VERIFY_ERROR', '写入后薄弱项快照与计划不一致');
  return { status: 'published', changed_database: true, ...result };
}

function parseArgs(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--help') options.help = true;
    else if (['--source', '--topics', '--result'].includes(arg)) options[arg.slice(2)] = argv[++index];
    else fail('INVALID_ARGUMENT', `未知参数：${arg}`);
  }
  return options;
}

async function readJson(filePath, label) {
  const source = await readFile(path.resolve(filePath), 'utf8');
  if (source.startsWith('\uFEFF')) fail('INVALID_JSON', `${label} 不允许包含 BOM`);
  try { return JSON.parse(source); } catch (error) { fail('INVALID_JSON', `${label} 无法解析：${error.message}`); }
}

async function loadConfig(env = process.env) {
  let url = text(env.SUPABASE_URL).replace(/\/+$/, '');
  let key = text(env.SUPABASE_KEY);
  if (!url || !key) {
    const source = await readFile(path.join(REPO_ROOT, 'js', 'config.js'), 'utf8');
    url ||= source.match(/const SB_URL = '([^']+)'/)?.[1] || '';
    key ||= source.match(/const SB_KEY = '([^']+)'/)?.[1] || '';
  }
  if (!url || !key) fail('SUPABASE_CONFIG_ERROR', '无法读取 Supabase 配置');
  return { url, key };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('用法：node scripts/publish-weakness-view.mjs --source <学生薄弱知识点.json> [--topics <topics.json>] [--apply] [--result <result.json>]');
    return;
  }
  if (!options.source) fail('INVALID_ARGUMENT', '必须提供 --source <学生薄弱知识点.json>');
  const state = await readJson(options.source, '学生薄弱知识点.json');
  const topics = await readJson(options.topics || path.join(REPO_ROOT, 'grammar-library', 'data', 'topics.json'), 'topics.json');
  const config = await loadConfig();
  const result = await publishWeaknessView({ state, topics, config, apply: options.apply });
  if (options.result) await writeFile(path.resolve(options.result), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch(error => {
    console.error(`错误 [${error.code || 'UNEXPECTED_ERROR'}]：${error.message}`);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
