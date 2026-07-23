#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('缺少 sharp。请先运行 npm install，再重新执行视觉包导入。');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'vocabularyLessonVisuals.json');
const ASSET_LIST_PATH = path.join(ROOT, 'data', 'vocabularyLessonAssets.js');
const SERVICE_WORKER_PATH = path.join(ROOT, 'service-worker.js');
const SUPPORTED_TYPES = new Set(['scene', 'compound', 'concept', 'emoji']);

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`无法读取 JSON：${filePath}\n${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function normalizeWord(word) {
  return String(word || '').trim().toLowerCase();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isLocalFilename(filename) {
  if (!filename || typeof filename !== 'string') return false;
  if (/^[a-z]+:\/\//i.test(filename)) return false;
  if (path.isAbsolute(filename)) return false;
  const normalized = path.normalize(filename);
  return normalized !== '..' && !normalized.startsWith(`..${path.sep}`);
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function validateManifest(manifest, packageDir) {
  if (!manifest || manifest.schemaVersion !== 2) fail('manifest.schemaVersion 必须为 2。');
  const lessonId = slugify(manifest.lessonId);
  if (!lessonId || lessonId !== manifest.lessonId) fail('lessonId 必须是小写字母、数字和连字符组成的稳定 slug。');
  if (!String(manifest.sourceWordbook || '').trim()) fail('manifest.sourceWordbook 不能为空。');
  if (!Array.isArray(manifest.items) || !manifest.items.length) fail('manifest.items 必须是非空数组。');

  const seen = new Set();
  const errors = [];
  manifest.items.forEach((item, index) => {
    const prefix = `items[${index}]`;
    const word = normalizeWord(item && item.word);
    if (!word) errors.push(`${prefix}.word 不能为空`);
    if (seen.has(word)) errors.push(`${prefix}.word 重复：${word}`);
    seen.add(word);
    if (!SUPPORTED_TYPES.has(item && item.visualType)) errors.push(`${prefix}.visualType 不支持：${item && item.visualType}`);

    if (item && item.visualType === 'scene') {
      if (!isLocalFilename(item.filename)) {
        errors.push(`${prefix}.filename 必须是视觉包内的本地文件名`);
      } else {
        const sourcePath = path.resolve(packageDir, 'images', item.filename);
        const imagesRoot = path.resolve(packageDir, 'images') + path.sep;
        if (!sourcePath.startsWith(imagesRoot)) errors.push(`${prefix}.filename 越出 images 目录`);
        else if (!fs.existsSync(sourcePath)) errors.push(`${prefix} 缺图：${item.filename}`);
      }
    }
    if (item && item.visualType === 'compound' && (!Array.isArray(item.parts) || item.parts.length < 2)) {
      errors.push(`${prefix}.parts 至少需要两个视觉成分`);
    }
    if (
      item
      && item.visualType === 'concept'
      && (!item.concept || typeof item.concept !== 'object')
      && (!Array.isArray(item.icons) || item.icons.length < 2)
    ) {
      errors.push(`${prefix}.concept 或 icons 必须提供概念关系数据`);
    }
    if (item && item.visualType === 'emoji' && !String(item.emoji || '').trim()) {
      errors.push(`${prefix}.emoji 不能为空`);
    }
  });
  if (errors.length) fail(`视觉包校验失败：\n- ${errors.join('\n- ')}`);
}

async function convertScene(sourcePath, mainPath, thumbPath) {
  fs.mkdirSync(path.dirname(mainPath), { recursive: true });
  await sharp(sourcePath)
    .rotate()
    .flatten({ background: '#fffdfc' })
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86 })
    .toFile(mainPath);
  await sharp(sourcePath)
    .rotate()
    .flatten({ background: '#fffdfc' })
    .resize(384, 384, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(thumbPath);
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return { schemaVersion: 2, lessons: [] };
  const registry = readJson(REGISTRY_PATH);
  if (registry.schemaVersion !== 2 || !Array.isArray(registry.lessons)) fail('统一视觉清单格式无效。');
  return registry;
}

function buildGeneratedAssetList(registry) {
  const assets = new Set([
    './styles-vocabulary-lesson.css',
    './data/vocabularyLessonVisuals.json',
    './data/vocabularyLessonAssets.js',
    './assets/vocabulary-lessons/scene-placeholder.svg'
  ]);
  registry.lessons.forEach(lesson => {
    lesson.items.forEach(item => {
      if (item.image) assets.add('./' + String(item.image).replace(/^\.\//, ''));
      if (item.thumbnail) assets.add('./' + String(item.thumbnail).replace(/^\.\//, ''));
    });
  });
  return Array.from(assets).sort();
}

function writeGeneratedAssets(registry) {
  const assets = buildGeneratedAssetList(registry);
  fs.writeFileSync(
    ASSET_LIST_PATH,
    `self.VOCABULARY_LESSON_ASSETS = Object.freeze(${JSON.stringify(assets, null, 2)});\n`
  );
  return assets;
}

function updateServiceWorkerCache(registry) {
  const source = fs.readFileSync(SERVICE_WORKER_PATH, 'utf8');
  const digest = crypto.createHash('sha256').update(JSON.stringify(registry)).digest('hex').slice(0, 10);
  const cacheName = `vocabulary-review-v19-${digest}`;
  const updated = source.replace(
    /const VOCABULARY_REVIEW_CACHE = '[^']+';/,
    `const VOCABULARY_REVIEW_CACHE = '${cacheName}';`
  );
  if (updated === source) fail('service-worker.js 中未找到缓存版本常量。');
  fs.writeFileSync(SERVICE_WORKER_PATH, updated);
  return cacheName;
}

async function main() {
  const input = process.argv[2];
  if (!input) fail('用法：npm run vocabulary:lesson-import -- <视觉包目录>');
  const packageDir = path.resolve(process.cwd(), input);
  const manifestPath = path.join(packageDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) fail(`未找到 manifest.json：${manifestPath}`);

  const manifest = readJson(manifestPath);
  validateManifest(manifest, packageDir);
  const registry = loadRegistry();
  const existingLesson = registry.lessons.find(lesson => lesson.lessonId === manifest.lessonId);
  const existingByWord = new Map(
    (existingLesson && existingLesson.items || []).map(item => [normalizeWord(item.word), item])
  );
  const outputDir = path.join(ROOT, 'assets', 'vocabulary-lessons', manifest.lessonId);
  const summary = { converted: [], skipped: [], registered: [], errors: [] };
  const registeredItems = [];

  for (const item of manifest.items) {
    const word = normalizeWord(item.word);
    const existing = existingByWord.get(word) || {};
    const output = { ...existing, ...item, word };
    delete output.filename;
    if (item.visualType === 'concept' && (!item.concept || typeof item.concept !== 'object')) {
      output.concept = {
        icons: item.icons.map(String),
        relation: '→',
        layout: String(item.layout || '').trim(),
        description: String(item.relation || '').trim()
      };
      delete output.icons;
      delete output.layout;
      delete output.relation;
    }
    if (item.visualType === 'scene') {
      const sourcePath = path.resolve(packageDir, 'images', item.filename);
      const slug = slugify(word);
      const mainRelative = `assets/vocabulary-lessons/${manifest.lessonId}/${slug}.webp`;
      const thumbRelative = `assets/vocabulary-lessons/${manifest.lessonId}/${slug}-thumb.webp`;
      const mainPath = path.join(ROOT, mainRelative);
      const thumbPath = path.join(ROOT, thumbRelative);
      const sourceHash = hashFile(sourcePath);
      const unchanged = existing && existing.sourceHash === sourceHash && fs.existsSync(mainPath) && fs.existsSync(thumbPath);
      if (unchanged) {
        summary.skipped.push(word);
      } else {
        await convertScene(sourcePath, mainPath, thumbPath);
        summary.converted.push(word);
      }
      output.image = mainRelative;
      output.thumbnail = thumbRelative;
      output.sourceHash = sourceHash;
    }
    registeredItems.push(output);
    summary.registered.push(word);
  }

  const lessonRecord = {
    lessonId: manifest.lessonId,
    sourceWordbook: String(manifest.sourceWordbook).trim(),
    status: 'completed',
    importedAt: new Date().toISOString(),
    items: registeredItems
  };
  const index = registry.lessons.findIndex(lesson => lesson.lessonId === manifest.lessonId);
  if (index >= 0) registry.lessons[index] = lessonRecord;
  else registry.lessons.push(lessonRecord);
  registry.lessons.sort((a, b) => a.lessonId.localeCompare(b.lessonId));
  writeJson(REGISTRY_PATH, registry);
  const cachedAssets = writeGeneratedAssets(registry);
  const cacheName = updateServiceWorkerCache(registry);

  manifest.status = 'completed';
  manifest.importedAt = lessonRecord.importedAt;
  writeJson(manifestPath, manifest);
  const result = {
    schemaVersion: 1,
    lessonId: manifest.lessonId,
    sourceWordbook: manifest.sourceWordbook,
    completedAt: lessonRecord.importedAt,
    targetCommit: process.env.GIT_COMMIT || '',
    output: {
      main: '1024x1024 WebP quality 86',
      thumbnail: '384x384 WebP quality 82',
      directory: path.relative(ROOT, outputDir).replace(/\\/g, '/')
    },
    cacheName,
    cachedAssetCount: cachedAssets.length,
    summary
  };
  writeJson(path.join(packageDir, 'result.json'), result);

  console.log(`视觉包：${manifest.lessonId}`);
  console.log(`来源单词本：${manifest.sourceWordbook}`);
  console.log(`成功登记：${summary.registered.length}`);
  console.log(`转换场景图：${summary.converted.length}`);
  console.log(`幂等跳过：${summary.skipped.length}`);
  console.log(`缓存版本：${cacheName}`);
  console.log(`结果文件：${path.join(packageDir, 'result.json')}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
