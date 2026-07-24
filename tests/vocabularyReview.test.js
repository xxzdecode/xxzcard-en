const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const core = require(path.join(root, 'js/vocabularyReviewData.js'));
const reviewScript = fs.readFileSync(path.join(root, 'js/vocabularyReview.js'), 'utf8');
const task016Script = fs.readFileSync(path.join(root, 'js/vocabularyLesson016.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-vocabulary-lesson.css'), 'utf8');
const task016Styles = fs.readFileSync(path.join(root, 'styles-vocabulary-lesson-016.css'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/vocabularyLessonVisuals.json'), 'utf8'));
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const placeholder = fs.readFileSync(path.join(root, 'assets/vocabulary-lessons/scene-placeholder.svg'), 'utf8');

const forty = Array.from({ length: 40 }, (_, index) => ({ word: `word-${index + 1}` }));
assert.deepEqual(core.chunkVocabularyLessonItems(forty).map(batch => batch.length), [10, 10, 10, 10]);
assert.deepEqual(core.chunkVocabularyLessonItems(forty.slice(0, 23)).map(batch => batch.length), [10, 10, 3]);
assert.deepEqual(core.chunkVocabularyLessonItems([]), []);

const studentData = {
  batches: [
    { id: '1', name: 'older', cards: [{ word: 'one' }], sharedWith: ['sister'], createdAt: '2026-07-01' },
    { id: '2', name: 'today', cards: [{ word: 'two' }], sharedWith: ['sister'], createdAt: '2026-07-23' },
    { id: '3', name: 'teacher only', cards: [{ word: 'three' }], sharedWith: [], createdAt: '2026-07-24' },
    { id: '4', name: 'same date A', cards: [{ word: 'four' }], sharedWith: ['sister'], createdAt: '2026-07-23' },
    { id: '5', name: 'undated', cards: [{ word: 'five' }], sharedWith: ['sister'] }
  ]
};
assert.deepEqual(core.getVocabularyLessonVisibleBatches(studentData, 'sister').map(batch => batch.id), ['5', '1', '2', '4']);
assert.deepEqual(core.getVocabularyLessonVisibleBatches(studentData, 'teacher').map(batch => batch.id), ['5', '1', '2', '4', '3']);
assert.equal(core.getVocabularyLessonLatestBatch(studentData, 'sister').id, '4');
assert.equal(core.getVocabularyLessonLatestBatch(studentData, 'teacher').id, '3');
assert.equal(core.selectVocabularyLessonBatch(studentData, 'sister', '1').id, '1');
assert.equal(core.selectVocabularyLessonBatch(studentData, 'sister', '').id, '4');
assert.ok(core.compareVocabularyLessonBatchesOldestFirst(
  { id: '9', createdAt: '2026-07-23' },
  { id: '10', createdAt: '2026-07-23' }
) < 0, 'same-date ordering should use a stable numeric id tiebreaker');

const lesson = registry.lessons.find(item => item.lessonId === '2026-07-24-common-words-2');
assert.ok(lesson);
assert.equal(new Set(lesson.items.map(item => item.word)).size, lesson.items.length);
assert.deepEqual(
  Array.from(new Set(lesson.items.map(item => item.visualType))).sort(),
  ['compound', 'concept', 'emoji', 'scene']
);
const scene = core.findVocabularyLessonVisual('breath', { name: '常用词2' }, registry);
const compound = core.findVocabularyLessonVisual('hilltop', { name: '常用词2' }, registry);
const concept = core.findVocabularyLessonVisual('truth', { name: '常用词2' }, registry);
const emoji = core.findVocabularyLessonVisual('aeroplane', { name: '常用词2' }, registry);
assert.equal(scene.visualType, 'scene');
assert.equal(scene.image, 'assets/vocabulary-lessons/2026-07-24-common-words-2/breath.webp');
assert.equal(scene.thumbnail, 'assets/vocabulary-lessons/2026-07-24-common-words-2/breath-thumb.webp');
assert.match(scene.sourceHash, /^[a-f0-9]{64}$/);
assert.deepEqual(compound.parts, ['⛰️', '🔝']);
assert.deepEqual(concept.concept.icons, ['💬', '✅']);
assert.equal(emoji.emoji, '✈️');

const cards = [
  { word: 'breath', meaning: '呼吸', phonetic: '/breθ/', collocations: ['take a breath'], tip: 'card tip' },
  { word: 'hilltop', meaning: '山顶', emoji: '⛰️' },
  { word: 'truth', meaning: '真相' },
  { word: 'aeroplane', meaning: '飞机', emoji: '✈️' },
  { word: 'unlisted', meaning: '未登记', emoji: '🧪' }
];
const built = core.buildVocabularyLessonWords({ name: '常用词2', cards }, registry);
assert.deepEqual(built.map(item => item.visualType), ['scene', 'compound', 'concept', 'emoji', 'emoji']);
assert.equal(built[0].teacherNote, '名词；注意与 breathe（动词）区分。');
assert.deepEqual(built[0].collocations, ['take a deep breath']);
assert.equal(built[4].emoji, '🧪');

const randomSource = Array.from({ length: 25 }, (_, index) => ({ word: `r${index + 1}` }));
let pool = [];
const first = core.createVocabularyLessonRandomBatch(randomSource, pool, 10, () => 0.37);
pool = first.remainingKeys;
const second = core.createVocabularyLessonRandomBatch(randomSource, pool, 10, () => 0.37);
pool = second.remainingKeys;
const third = core.createVocabularyLessonRandomBatch(randomSource, pool, 10, () => 0.37);
assert.equal(first.items.length, 10);
assert.equal(second.items.length, 10);
assert.equal(third.items.length, 10);
assert.equal(new Set(first.items.map(item => item.word)).size, 10);
assert.equal(new Set(second.items.map(item => item.word)).size, 10);
assert.equal(new Set([...first.items, ...second.items].map(item => item.word)).size, 20, 'the pool should avoid cross-batch repeats before all words rotate');
assert.equal(new Set([...first.items, ...second.items, ...third.items].map(item => item.word)).size, 25, 'all words should be seen before the pool refills');

assert.match(reviewScript, /mode:\s*'selection'/);
for (const mode of ['teaching', 'batchReview', 'batchReviewDetail', 'finalMenu', 'randomReview', 'hardWordReview']) {
  assert.ok(reviewScript.includes(`'${mode}'`), `missing state: ${mode}`);
}
assert.match(reviewScript, /sessionStorage\.setItem/);
assert.match(reviewScript, /VOCABULARY_LESSON_HARD_KEY_PREFIX/);
assert.doesNotMatch(reviewScript, /vocabularyReviewState\.rememberedWords\s*=\s*Array\.from\(vocabularyLessonState\.hardWords/);
assert.match(reviewScript, /aria-label="查看这张图片"/);
assert.doesNotMatch(reviewScript, /aria-label="[^"]*\$\{item\.word\}/);
assert.match(reviewScript, /id="vocabularyLessonInfoContent" \$\{randomHidden \? 'hidden aria-hidden="true"'/);
assert.match(reviewScript, /createVocabularyLessonRandomBatch/);
assert.doesNotMatch(reviewScript, /sort\(\(\)\s*=>\s*Math\.random\(\)\s*-\s*0\.5\)/);
assert.match(reviewScript, /<strong>随机过词<\/strong>/);
assert.match(reviewScript, /<strong>难词巩固<\/strong>/);
assert.doesNotMatch(reviewScript, /已完成\$\{|剩余\$\{|\$\{[^}]*\}\s*\/\s*\$\{/);

assert.match(task016Script, /CIRCLED_BATCH_LABELS\s*=\s*\['①', '②', '③', '④'\]/);
assert.match(task016Script, /★ 难词/);
assert.match(task016Script, /↻ 随机/);
assert.match(task016Script, /compareVocabularyLessonBatchesNewestFirst/);
assert.match(task016Script, /getVisibleVocabularyLessonCurrentTask/);
assert.match(task016Script, /is-current/);
assert.match(task016Script, /vocabulary-lesson-status-badge">当前/);
assert.match(task016Script, /vocabulary-lesson-status-badge">最新/);
assert.match(task016Script, /mode === 'teaching'\) title\.textContent = '新词导览'/);
assert.match(task016Script, /wc_vocabulary_lesson_position_v1:/);
assert.match(task016Script, /encodeURIComponent\(String\(typeof currentUser/);
assert.match(task016Script, /signature:\s*getVocabularyLessonProgressSignature/);
assert.match(task016Script, /JSON\.parse\(localStorage\.getItem/);
assert.match(task016Script, /catch \(_\) \{\s*return fallback;/);
assert.match(task016Script, /target >= 4/);
assert.match(task016Script, /vocabularyLessonState\.hardWords/);
assert.doesNotMatch(task016Script, /vocabularyReviewState\.rememberedWords\s*=/);
assert.match(task016Script, /aria-label', '本批学习进度'/);
assert.match(task016Script, /aria-hidden="true"/);
assert.doesNotMatch(task016Script, />\s*\d+\s*\/\s*\d+\s*</);
assert.doesNotMatch(task016Script, /共\s*\$\{|剩余\s*\$\{|%/);

assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*2fr\)\s+minmax\(260px,\s*1fr\)/);
assert.match(styles, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
assert.match(styles, /grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
assert.match(styles, /min-height:\s*44px/);
assert.match(styles, /env\(safe-area-inset/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(styles, /orientation:\s*landscape/);
assert.match(task016Styles, /grid-template-rows:\s*52px auto 18px minmax\(0, 1fr\) auto/);
assert.match(task016Styles, /\.vocabulary-lesson-main\s*\{[\s\S]*grid-row:\s*4/);
assert.match(task016Styles, /\.vocabulary-lesson-footer\s*\{[\s\S]*grid-row:\s*5/);
assert.match(task016Styles, /\.vocabulary-lesson-batch-dots\s*\{[\s\S]*overflow:\s*visible/);
assert.match(task016Styles, /grid-template-columns:\s*repeat\(4,/);
assert.match(task016Styles, /object-fit:\s*contain !important/);
assert.match(task016Styles, /width:\s*auto !important/);
assert.match(task016Styles, /height:\s*auto !important/);
assert.match(task016Styles, /max-width:\s*100%/);
assert.match(task016Styles, /max-height:\s*100%/);
assert.match(task016Styles, /min-width:\s*900px/);
assert.match(task016Styles, /max-height:\s*850px/);
assert.match(placeholder, /<svg/);
assert.doesNotMatch(placeholder, /<text|watermark/i);

assert.match(serviceWorker, /vocabulary-review-v21-layoutfix/);
assert.match(serviceWorker, /'\.\/styles-vocabulary-lesson-016\.css'/);
assert.match(serviceWorker, /'\.\/js\/vocabularyLesson016\.js'/);
assert.match(serviceWorker, /VOCABULARY_LESSON_ASSETS/);

console.log('unified vocabulary lesson tests passed');
