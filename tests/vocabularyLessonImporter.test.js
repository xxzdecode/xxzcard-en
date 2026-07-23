const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vocabulary-lesson-import-'));
fs.mkdirSync(path.join(tempRoot, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(tempRoot, 'data'), { recursive: true });
fs.mkdirSync(path.join(tempRoot, 'assets', 'vocabulary-lessons'), { recursive: true });
fs.copyFileSync(path.join(root, 'scripts', 'importVocabularyLesson.js'), path.join(tempRoot, 'scripts', 'importVocabularyLesson.js'));
fs.copyFileSync(path.join(root, 'service-worker.js'), path.join(tempRoot, 'service-worker.js'));
fs.writeFileSync(path.join(tempRoot, 'data', 'vocabularyLessonVisuals.json'), JSON.stringify({
    schemaVersion: 2,
    lessons: [{
      lessonId: '2026-07-24-test',
      sourceWordbook: '测试词表',
      status: 'placeholder-ready',
      items: [
        { word: 'breath', visualType: 'scene', collocations: ['take a deep breath'], teacherNote: '保留老师提醒' }
      ]
    }]
  }, null, 2));
fs.writeFileSync(path.join(tempRoot, 'data', 'vocabularyLessonAssets.js'), 'self.VOCABULARY_LESSON_ASSETS = Object.freeze([]);\n');
fs.writeFileSync(path.join(tempRoot, 'styles-vocabulary-lesson.css'), '/* fixture */\n');
fs.writeFileSync(path.join(tempRoot, 'assets', 'vocabulary-lessons', 'scene-placeholder.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

const fixture = path.join(tempRoot, '_incoming', 'vocabulary-lessons', '2026-07-24-test');
fs.mkdirSync(path.join(fixture, 'images'), { recursive: true });

async function prepare() {
  await sharp({
    create: { width: 1400, height: 1400, channels: 3, background: { r: 245, g: 225, b: 235 } }
  }).png().toFile(path.join(fixture, 'images', 'breath.png'));
  fs.writeFileSync(path.join(fixture, 'manifest.json'), JSON.stringify({
    schemaVersion: 2,
    lessonId: '2026-07-24-test',
    sourceWordbook: '测试词表',
    status: 'pending',
    items: [
      { word: 'breath', visualType: 'scene', filename: 'breath.png', focalPoint: '50% 45%' },
      { word: 'hilltop', visualType: 'compound', parts: ['⛰️', '🔝'] },
      { word: 'truth', visualType: 'concept', icons: ['💬', '✅'], layout: 'statement-confirmed', relation: 'statement matches fact' },
      { word: 'plane', visualType: 'emoji', emoji: '✈️' }
    ]
  }, null, 2));
}

function runImporter(packagePath) {
  const moduleRoot = path.dirname(path.dirname(path.dirname(require.resolve('sharp'))));
  const result = spawnSync(process.execPath, [path.join(tempRoot, 'scripts', 'importVocabularyLesson.js'), packagePath], {
    cwd: tempRoot,
    env: { ...process.env, NODE_PATH: [path.join(root, 'node_modules'), moduleRoot].join(path.delimiter) },
    encoding: 'utf8'
  });
  return result;
}

(async () => {
  await prepare();
  const first = runImporter(fixture);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.match(first.stdout, /转换场景图：1/);

  const mainPath = path.join(tempRoot, 'assets', 'vocabulary-lessons', '2026-07-24-test', 'breath.webp');
  const thumbPath = path.join(tempRoot, 'assets', 'vocabulary-lessons', '2026-07-24-test', 'breath-thumb.webp');
  assert.ok(fs.existsSync(mainPath));
  assert.ok(fs.existsSync(thumbPath));
  const mainMeta = await sharp(mainPath).metadata();
  const thumbMeta = await sharp(thumbPath).metadata();
  assert.deepEqual([mainMeta.width, mainMeta.height, mainMeta.format], [1024, 1024, 'webp']);
  assert.deepEqual([thumbMeta.width, thumbMeta.height, thumbMeta.format], [384, 384, 'webp']);

  const registry = JSON.parse(fs.readFileSync(path.join(tempRoot, 'data', 'vocabularyLessonVisuals.json'), 'utf8'));
  assert.equal(registry.lessons.length, 1);
  assert.equal(registry.lessons[0].items.length, 4);
  assert.equal(registry.lessons[0].items[0].image, 'assets/vocabulary-lessons/2026-07-24-test/breath.webp');
  assert.ok(registry.lessons[0].items[0].sourceHash);
  assert.deepEqual(registry.lessons[0].items[0].collocations, ['take a deep breath']);
  assert.equal(registry.lessons[0].items[0].teacherNote, '保留老师提醒');
  assert.deepEqual(registry.lessons[0].items[2].concept.icons, ['💬', '✅']);
  assert.equal(registry.lessons[0].items[2].concept.relation, '→');
  const assets = fs.readFileSync(path.join(tempRoot, 'data', 'vocabularyLessonAssets.js'), 'utf8');
  assert.match(assets, /breath\.webp/);
  assert.match(assets, /breath-thumb\.webp/);
  const sw = fs.readFileSync(path.join(tempRoot, 'service-worker.js'), 'utf8');
  assert.match(sw, /vocabulary-review-v19-[a-f0-9]{10}/);
  const resultJson = JSON.parse(fs.readFileSync(path.join(fixture, 'result.json'), 'utf8'));
  assert.equal(resultJson.summary.converted.length, 1);
  assert.equal(resultJson.summary.registered.length, 4);
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture, 'manifest.json'), 'utf8')).status, 'completed');

  const second = runImporter(fixture);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(second.stdout, /幂等跳过：1/);
  const secondRegistry = JSON.parse(fs.readFileSync(path.join(tempRoot, 'data', 'vocabularyLessonVisuals.json'), 'utf8'));
  assert.equal(secondRegistry.lessons.length, 1, 're-import must replace the lesson instead of duplicating it');

  const invalid = path.join(tempRoot, '_incoming', 'vocabulary-lessons', 'invalid');
  fs.mkdirSync(path.join(invalid, 'images'), { recursive: true });
  fs.writeFileSync(path.join(invalid, 'manifest.json'), JSON.stringify({
    schemaVersion: 2,
    lessonId: 'invalid',
    sourceWordbook: '无效',
    items: [
      { word: 'same', visualType: 'scene', filename: 'missing.png' },
      { word: 'same', visualType: 'unknown' }
    ]
  }));
  const failed = runImporter(invalid);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /缺图|重复|不支持/);

  console.log('vocabulary lesson importer tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
