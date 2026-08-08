#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
const CATALOG_KEY = 'assessment_catalog_v1';
const STUDENTS = new Set(['sister', 'brother']);
const ASSESSMENT_TYPES = new Set(['daily', 'weekly', 'monthly', 'homework']);

export class PublishAssessmentError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'PublishAssessmentError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new PublishAssessmentError(code, message, details);
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requiredText(value, label) {
  const result = String(value == null ? '' : value).trim();
  if (!result) fail('INVALID_QUESTION_MAP', `${label} 不能为空`);
  return result;
}

function optionalText(value) {
  return String(value == null ? '' : value).trim();
}

function uniqueTexts(value, label) {
  if (!Array.isArray(value) || !value.length) fail('INVALID_QUESTION_MAP', `${label} 必须是非空数组`);
  const items = value.map(item => requiredText(item, label));
  if (new Set(items).size !== items.length) fail('INVALID_QUESTION_MAP', `${label} 包含重复值`);
  return items;
}

function optionalField(target, key, value) {
  const normalized = optionalText(value);
  if (normalized) target[key] = normalized;
}

function canonicalJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalJsonValue(value[key])])
  );
}

function sameJson(left, right) {
  return JSON.stringify(canonicalJsonValue(left)) === JSON.stringify(canonicalJsonValue(right));
}

export function sanitizeQuestionMap(input) {
  if (!isObject(input)) fail('INVALID_QUESTION_MAP', 'question-map 顶层必须是对象');
  const assessmentId = requiredText(input.assessment_id, 'assessment_id');
  const assessmentType = requiredText(input.assessment_type, 'assessment_type');
  const assessmentDate = requiredText(input.assessment_date, 'assessment_date');
  const displayName = requiredText(input.display_name, 'display_name');
  const mapRevision = requiredText(input.map_revision, 'map_revision');
  const mapHash = requiredText(input.map_hash, 'map_hash');
  if (!ASSESSMENT_TYPES.has(assessmentType)) fail('INVALID_QUESTION_MAP', 'assessment_type 必须是 daily / weekly / monthly / homework');
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(assessmentDate)) fail('INVALID_QUESTION_MAP', 'assessment_date 必须是 YYYY-MM-DD');
  if (!/^sha256:[0-9a-f]{64}$/i.test(mapHash)) fail('INVALID_QUESTION_MAP', 'map_hash 必须是完整 sha256');
  if (!Array.isArray(input.papers) || !input.papers.length) fail('INVALID_QUESTION_MAP', 'papers 必须是非空数组');
  if (assessmentType === 'daily' && input.papers.length !== 1) fail('INVALID_QUESTION_MAP', '日测必须只包含一张学生卷');

  const paperIds = new Set();
  const papers = input.papers.map((paper, paperIndex) => {
    if (!isObject(paper)) fail('INVALID_QUESTION_MAP', `papers[${paperIndex}] 必须是对象`);
    const paperId = requiredText(paper.paper_id, `papers[${paperIndex}].paper_id`);
    const studentId = requiredText(paper.student_id, `papers[${paperIndex}].student_id`);
    if (!STUDENTS.has(studentId)) fail('INVALID_QUESTION_MAP', `papers[${paperIndex}].student_id 无效`);
    if (paperIds.has(paperId)) fail('INVALID_QUESTION_MAP', `paper_id 重复：${paperId}`);
    paperIds.add(paperId);
    if (!Array.isArray(paper.sections) || !paper.sections.length) fail('INVALID_QUESTION_MAP', `${paperId} 缺少 sections`);

    const sectionIds = new Set();
    const questionIds = new Set();
    const sections = paper.sections.map((section, sectionIndex) => {
      if (!isObject(section)) fail('INVALID_QUESTION_MAP', `${paperId}.sections[${sectionIndex}] 必须是对象`);
      const sectionId = requiredText(section.section_id, `${paperId}.sections[${sectionIndex}].section_id`);
      const displayLabel = requiredText(section.display_label, `${paperId}.${sectionId}.display_label`);
      if (sectionIds.has(sectionId)) fail('INVALID_QUESTION_MAP', `${paperId} 的 section_id 重复：${sectionId}`);
      sectionIds.add(sectionId);
      if (!Array.isArray(section.items) || !section.items.length) fail('INVALID_QUESTION_MAP', `${paperId}.${sectionId} 缺少 items`);
      if (assessmentType === 'daily' && section.items.length > 5) fail('INVALID_QUESTION_MAP', `${paperId}.${sectionId} 超过日测每大题 5 小题上限`);
      const items = section.items.map((item, itemIndex) => {
        if (!isObject(item)) fail('INVALID_QUESTION_MAP', `${paperId}.${sectionId}.items[${itemIndex}] 必须是对象`);
        const questionId = requiredText(item.question_id, `${paperId}.${sectionId}.items[${itemIndex}].question_id`);
        if (questionIds.has(questionId)) fail('INVALID_QUESTION_MAP', `${paperId} 的 question_id 重复：${questionId}`);
        questionIds.add(questionId);
        return {
          question_id: questionId,
          display_label: requiredText(item.display_label, `${questionId}.display_label`),
          kp_ids: uniqueTexts(item.kp_ids, `${questionId}.kp_ids`)
        };
      });
      return { section_id: sectionId, display_label: displayLabel, items };
    });
    if (assessmentType === 'daily' && questionIds.size < 10) fail('INVALID_QUESTION_MAP', `${paperId} 的日测小题数少于 10`);
    const normalizedPaper = { paper_id: paperId, student_id: studentId, sections };
    optionalField(normalizedPaper, 'student_name', paper.student_name);
    optionalField(normalizedPaper, 'student_file', paper.student_file);
    optionalField(normalizedPaper, 'display_name', paper.display_name);
    optionalField(normalizedPaper, 'scope_label', paper.scope_label);
    return normalizedPaper;
  });

  const result = {
    schema_version: Number(input.schema_version) || 1,
    assessment_id: assessmentId,
    assessment_type: assessmentType,
    assessment_date: assessmentDate,
    display_name: displayName,
    map_revision: mapRevision,
    papers,
    map_hash: mapHash
  };
  optionalField(result, 'scope_label', input.scope_label);
  return result;
}

function catalogValue(value) {
  if (value == null) return { schema_version: 1, latest_paper_id: '', updated_at: '', assessments: [] };
  if (!isObject(value) || !Array.isArray(value.assessments)) fail('INVALID_REMOTE_CATALOG', '远端 assessment_catalog_v1 格式无效');
  return value;
}

export function mergeAssessmentCatalog(currentValue, questionMap, now = new Date()) {
  const current = catalogValue(currentValue);
  const existingIndex = current.assessments.findIndex(item => item && item.assessment_id === questionMap.assessment_id);
  if (existingIndex >= 0) {
    const existingHash = optionalText(current.assessments[existingIndex].map_hash);
    if (!existingHash || existingHash !== questionMap.map_hash) {
      fail('MAP_CONFLICT', `assessment_id 已存在但 map_hash 不同：${questionMap.assessment_id}`, {
        existingHash,
        incomingHash: questionMap.map_hash
      });
    }
  }
  const assessments = [...current.assessments];
  if (existingIndex >= 0) assessments[existingIndex] = questionMap;
  else assessments.push(questionMap);
  assessments.sort((left, right) => (
    String(left.assessment_date || '').localeCompare(String(right.assessment_date || ''))
    || String(left.assessment_id || '').localeCompare(String(right.assessment_id || ''))
  ));
  const latestAssessment = assessments[assessments.length - 1];
  const currentLatestBelongsToLatest = Array.isArray(latestAssessment && latestAssessment.papers)
    && latestAssessment.papers.some(paper => paper && paper.paper_id === current.latest_paper_id);
  const latestPaperId = currentLatestBelongsToLatest
    ? current.latest_paper_id
    : latestAssessment.papers[0].paper_id;
  const unchanged = existingIndex >= 0
    && sameJson(current.assessments[existingIndex], questionMap)
    && current.latest_paper_id === latestPaperId;
  return {
    changed: !unchanged,
    catalog: {
      ...current,
      schema_version: Number(current.schema_version) || 1,
      latest_paper_id: latestPaperId,
      updated_at: unchanged ? optionalText(current.updated_at) : now.toISOString(),
      assessments
    }
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
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function fetchAssessmentCatalog(config, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/kv_store?key=eq.${CATALOG_KEY}&select=value`, {
    headers: requestHeaders(config)
  });
  const body = await responseJson(response);
  if (!response.ok) fail('SUPABASE_READ_ERROR', `读取 ${CATALOG_KEY} 失败：HTTP ${response.status}`, body);
  if (!Array.isArray(body) || body.length > 1) fail('INVALID_REMOTE_CATALOG', `${CATALOG_KEY} 返回格式无效`);
  return body.length ? body[0].value : null;
}

export async function writeAssessmentCatalog(config, catalog, fetchImpl = fetch) {
  const response = await fetchImpl(`${config.url}/rest/v1/kv_store`, {
    method: 'POST',
    headers: { ...requestHeaders(config), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key: CATALOG_KEY, value: catalog })
  });
  const body = await responseJson(response);
  if (!response.ok) fail('SUPABASE_WRITE_ERROR', `写入 ${CATALOG_KEY} 失败：HTTP ${response.status}`, body);
}

export async function publishQuestionMap({ questionMap, config, apply = false, now = new Date(), fetchImpl = fetch }) {
  const initial = await fetchAssessmentCatalog(config, fetchImpl);
  const planned = mergeAssessmentCatalog(initial, questionMap, now);
  const baseResult = {
    assessment_id: questionMap.assessment_id,
    paper_ids: questionMap.papers.map(paper => paper.paper_id),
    total_questions: questionMap.papers.reduce((sum, paper) => (
      sum + paper.sections.reduce((paperSum, section) => paperSum + section.items.length, 0)
    ), 0),
    catalog_count: planned.catalog.assessments.length
  };
  if (!planned.changed) return { status: 'already_published', changed_database: false, ...baseResult };
  if (!apply) return { status: 'dry_run_ready', changed_database: false, ...baseResult };

  const latest = await fetchAssessmentCatalog(config, fetchImpl);
  if (!sameJson(latest, initial)) {
    fail('REMOTE_CHANGED', '预演后远端目录发生变化，已停止写入，请重新执行');
  }
  const finalPlan = mergeAssessmentCatalog(latest, questionMap, now);
  await writeAssessmentCatalog(config, finalPlan.catalog, fetchImpl);
  const verified = await fetchAssessmentCatalog(config, fetchImpl);
  if (!sameJson(verified, finalPlan.catalog)) {
    fail('POST_WRITE_VERIFY_ERROR', '写入后目录内容与计划不一致');
  }
  return { status: 'published', changed_database: true, ...baseResult };
}

function parseArgs(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--file' || arg === '--result') options[arg.slice(2)] = argv[++index];
    else fail('INVALID_ARGUMENT', `未知参数：${arg}`);
  }
  return options;
}

async function loadConfig(env = process.env) {
  let url = optionalText(env.SUPABASE_URL).replace(/\/+$/, '');
  let key = optionalText(env.SUPABASE_KEY);
  if (!url || !key) {
    const source = await readFile(path.join(REPO_ROOT, 'js', 'config.js'), 'utf8');
    url ||= source.match(/const SB_URL = '([^']+)'/)?.[1] || '';
    key ||= source.match(/const SB_KEY = '([^']+)'/)?.[1] || '';
  }
  if (!url || !key) fail('SUPABASE_CONFIG_ERROR', '无法读取 Supabase 配置');
  return { url, key };
}

async function readQuestionMap(filePath) {
  if (!filePath) fail('INVALID_ARGUMENT', '必须提供 --file <question-map.json>');
  const text = await readFile(path.resolve(filePath), 'utf8');
  if (text.startsWith('\uFEFF')) fail('INVALID_QUESTION_MAP', 'question-map.json 不允许包含 BOM');
  let parsed;
  try { parsed = JSON.parse(text); } catch (error) { fail('INVALID_QUESTION_MAP', `JSON 无法解析：${error.message}`); }
  return sanitizeQuestionMap(parsed);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('用法：node scripts/publish-assessment-map.mjs --file <question-map.json> [--apply] [--result <result.json>]');
    return;
  }
  const questionMap = await readQuestionMap(options.file);
  const config = await loadConfig();
  const result = await publishQuestionMap({ questionMap, config, apply: options.apply });
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
