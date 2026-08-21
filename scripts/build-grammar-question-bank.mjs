import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'grammar-challenge', 'data', 'catalog.js');
const outputPath = path.join(root, 'grammar-challenge', 'data', 'question-bank.js');

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .map(value => String(value || '').trim())
    .filter(Boolean))];
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashQuestion(question) {
  const payload = stableJson({
    source: question.source || '',
    prompt: question.prompt || '',
    options: question.options || [],
    answer: question.answer ?? question.correctAnswer ?? question.assignments ?? null
  });
  return `sha256:${crypto.createHash('sha256').update(payload, 'utf8').digest('hex')}`;
}

function readCatalog() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(catalogPath, 'utf8'), context, { filename: catalogPath });
  return Array.isArray(context.window.GRAMMAR_CHALLENGE_CATALOG)
    ? context.window.GRAMMAR_CHALLENGE_CATALOG
    : [];
}

function readPracticeConfig(entry) {
  if (!entry.pagePath) return null;
  const filePath = path.resolve(root, 'grammar-challenge', entry.pagePath);
  if (!fs.existsSync(filePath)) return null;
  const source = fs.readFileSync(filePath, 'utf8');
  const wrapperMatch = source.match(/\bconst\s+config\s*=\s*(\{[\s\S]*?\});\s*\n\s*const\s+response\s*=/);
  const match = wrapperMatch || source.match(/(?:^|\n)\s*<script\b[^>]*\bid=["']practice-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const config = JSON.parse(match[1]);
    return config && Array.isArray(config.questions)
      ? config
      : null;
  } catch (error) {
    throw new Error(`${entry.id}: practice-data is not valid JSON (${error.message})`);
  }
}

function mapped(entry, field, questionId) {
  const table = entry && entry[field];
  return table && typeof table === 'object' ? table[questionId] : undefined;
}

const catalog = readCatalog();
const items = [];
const skipped = [];

catalog.forEach(entry => {
  const config = readPracticeConfig(entry);
  if (!config) {
    skipped.push(entry.id);
    return;
  }
  config.questions.forEach((rawQuestion, index) => {
    const sourceQuestionId = String(rawQuestion.id || `q${index + 1}`);
    const kpIds = unique(
      mapped(entry, 'questionKpIds', sourceQuestionId)
      || rawQuestion.kpIds
      || rawQuestion.kpId
      || entry.kpIds
    );
    const weaknessIds = unique(
      rawQuestion.weaknessIds
      || mapped(entry, 'questionWeaknessIds', sourceQuestionId)
    );
    const primaryWeaknessId = String(
      rawQuestion.primaryWeaknessId
      || mapped(entry, 'questionPrimaryWeaknessIds', sourceQuestionId)
      || (weaknessIds.length === 1 ? weaknessIds[0] : '')
    ).trim();
    const diagnosticTargets = unique(
      rawQuestion.diagnosticTargets
      || mapped(entry, 'questionDiagnosticTargets', sourceQuestionId)
    );
    const contentHash = String(
      rawQuestion.contentHash
      || mapped(entry, 'questionContentHashes', sourceQuestionId)
      || hashQuestion(rawQuestion)
    ).trim();
    const primaryKpId = kpIds[0] || String(entry.lessonKey || '').trim();
    const variantGroupId = primaryWeaknessId
      || `${primaryKpId}::${String(rawQuestion.category || rawQuestion.type || 'general')}`;
    const bankItemId = `${entry.id}::${sourceQuestionId}`;

    items.push({
      ...rawQuestion,
      id: bankItemId,
      bankItemId,
      sourceQuestionId,
      sourceChallengeId: entry.id,
      sourceChallengeDate: entry.date,
      sourceChallengeTitle: entry.title,
      sourceLessonKey: entry.lessonKey,
      sourceLessonKpIds: unique(entry.kpIds),
      kpIds,
      primaryKpId,
      weaknessIds,
      primaryWeaknessId,
      diagnosticTargets,
      contentHash,
      variantGroupId
    });
  });
});

const duplicateIds = items.map(item => item.bankItemId)
  .filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`duplicate bank item ids: ${unique(duplicateIds).join(', ')}`);

const version = `sha256:${crypto.createHash('sha256').update(stableJson(items), 'utf8').digest('hex')}`;
const payload = {
  schemaVersion: 1,
  version,
  sourceCatalog: 'grammar-challenge/data/catalog.js',
  skippedChallengeIds: skipped,
  items
};
const serialized = JSON.stringify(payload, null, 2);
const output = `(function registerGrammarQuestionBank(root, factory) {\n`
  + `  const value = factory();\n`
  + `  if (typeof module === 'object' && module.exports) module.exports = value;\n`
  + `  if (root) root.GRAMMAR_QUESTION_BANK = value;\n`
  + `})(typeof globalThis !== 'undefined' ? globalThis : this, function createGrammarQuestionBank() {\n`
  + `  return Object.freeze(${serialized});\n`
  + `});\n`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`grammar question bank: ${items.length} items, ${skipped.length} skipped challenges, ${version}`);
