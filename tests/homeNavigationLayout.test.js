const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const baseStyles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const layoutStyles = fs.readFileSync(path.join(root, 'styles-home-nav.css'), 'utf8');
const mainScript = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const reviewScript = fs.readFileSync(path.join(root, 'js/vocabularyReview.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

const studentNav = html.match(/<nav class="bottom-feature-nav student-only"[\s\S]*?<\/nav>/)?.[0] || '';
const teacherNav = html.match(/<nav class="teacher-home-nav teacher-only"[\s\S]*?<\/nav>/)?.[0] || '';
const activeStudentNav = studentNav.replace(/<!--[\s\S]*?-->/g, '');
const vocabularyTourEntry = html.match(/<button class="grammar-challenge-entry vocabulary-tour-entry"[\s\S]*?<\/button>/)?.[0] || '';

assert.match(studentNav, /生词检验已停用/);
assert.match(vocabularyTourEntry, /onclick="openVocabularyReviewList\(\)"/);
assert.match(vocabularyTourEntry, />新词导览</);
assert.deepEqual(
  Array.from(activeStudentNav.matchAll(/<span>([^<]+)<\/span>/g), match => match[1]),
  ['单词卡', '音标训练', '专项小游戏']
);
assert.deepEqual(
  Array.from(activeStudentNav.matchAll(/onclick="([^"]+)"/g), match => match[1]),
  ['openWordCards()', 'openPhonemeTraining()', 'openThemeQuizList()']
);
assert.deepEqual(
  Array.from(teacherNav.matchAll(/<span>([^<]+)<\/span>/g), match => match[1]),
  ['单词卡', '随堂练习', '知识点库']
);
assert.match(reviewScript, /upgradeVocabularyLessonEntryLabels/);
assert.match(reviewScript, /grammar-challenge-entry__title/);
assert.match(reviewScript, /label\.textContent = '新词导览'/);
assert.doesNotMatch(activeStudentNav, /openVocabularyReviewList|生词巩固/);
assert.doesNotMatch(teacherNav, /openVocabularyReviewList|生词巩固/);

assert.match(baseStyles, /\.teacher-home-nav\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
assert.match(baseStyles, /\.vocabulary-tour-entry\s*\{/);
assert.match(layoutStyles, /\.bottom-feature-nav\.student-only\s*\{[^}]*margin:\s*18px auto 6px[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
assert.match(layoutStyles, />\s*\.bottom-feature-nav__item\s*\{[^}]*grid-column:\s*auto/s);
assert.doesNotMatch(layoutStyles, /repeat\(6|span\s+[23]/);

assert.match(mainScript, /href\s*=\s*'styles-home-nav\.css'/);
assert.match(mainScript, /homeNavigationLayout\s*=\s*'three-columns'/);
assert.match(serviceWorker, /vocabulary-review-v20-task016/);
assert.match(serviceWorker, /'\.\/styles-home-nav\.css'/);
assert.match(serviceWorker, /'\.\/styles-vocabulary-lesson\.css'/);
assert.match(serviceWorker, /'\.\/styles-vocabulary-lesson-016\.css'/);

console.log('home navigation layout tests passed');
