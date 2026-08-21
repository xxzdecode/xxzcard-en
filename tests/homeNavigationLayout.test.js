const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const baseStyles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const layoutStyles = fs.readFileSync(path.join(root, 'styles-home-nav.css'), 'utf8');
const dashboardStyles = fs.readFileSync(path.join(root, 'styles-student-home-dashboard.css'), 'utf8');
const mainScript = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const reviewScript = fs.readFileSync(path.join(root, 'js/vocabularyReview.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

const studentNav = html.match(/<nav class="bottom-feature-nav student-only"[\s\S]*?<\/nav>/)?.[0] || '';
const teacherNav = html.match(/<nav class="teacher-home-nav teacher-dashboard-primary"[\s\S]*?<\/nav>/)?.[0] || '';
const teacherDashboard = html.match(/<main class="teacher-dashboard teacher-only"[\s\S]*?<\/main>/)?.[0] || '';
const activeStudentNav = studentNav.replace(/<!--[\s\S]*?-->/g, '');

assert.match(studentNav, /生词检验已停用/);
assert.doesNotMatch(studentNav, /openVocabularyReviewList|新词导览|vocabularyTourHomeEntry/);
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
  ['进入管理', '导入', '导出词单', '新词导览']
);
assert.match(teacherNav, /<h1>单词卡管理<\/h1>/);
assert.match(teacherDashboard, /onclick="openCoursewareList\(\)"[^>]*>进入随堂练习<\/button>/);
assert.match(teacherDashboard, /onclick="openGrammarLibrary\(\)"[^>]*>进入知识点库<\/button>/);
assert.doesNotMatch(teacherDashboard, /分类管理/);
assert.match(reviewScript, /upgradeVocabularyLessonEntryLabels/);
assert.doesNotMatch(activeStudentNav, /openVocabularyReviewList|生词巩固/);
assert.match(teacherNav, /id="teacherVocabularyGuideEntry"[^>]*onclick="openVocabularyReviewList\(\)"/);
assert.doesNotMatch(teacherNav, /生词巩固/);

assert.match(baseStyles, /\.teacher-dashboard-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
assert.match(baseStyles, /\.teacher-dashboard-primary__actions\s*\{[^}]*repeat\(4,\s*minmax\(96px,\s*1fr\)\)/s);
assert.match(baseStyles, /@media \(max-width: 899px\)[\s\S]*?\.teacher-dashboard-primary__actions\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
assert.match(baseStyles, /\.teacher-dashboard-primary\s*\{/);
assert.match(
  baseStyles,
  /#teacherDashboardGrid > #teacherDailyRoutePanel,[\s\S]*?#teacherDashboardGrid > #teacherStudentTagPanel\s*\{[^}]*margin:\s*0/s,
  'dynamic teacher cards must override legacy panel margins'
);
assert.match(baseStyles, /\.vocabulary-tour-entry\s*\{/);
assert.match(layoutStyles, /\.bottom-feature-nav\.student-only\s*\{[^}]*margin:\s*18px auto 6px[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
assert.match(layoutStyles, />\s*\.bottom-feature-nav__item\s*\{[^}]*grid-column:\s*auto/s);
assert.doesNotMatch(layoutStyles, /repeat\(6/);
assert.match(dashboardStyles, /\.student-home-card-grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
assert.match(dashboardStyles, /\.student-home-card-grid--single\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);

assert.match(html, /<link rel="stylesheet" href="styles-home-nav\.css"/);
assert.match(html, /<link rel="stylesheet" href="styles-student-home-dashboard\.css"/);
assert.doesNotMatch(mainScript, /createElement\('link'\)/);
const appShellVersion = serviceWorker.match(/const APP_SHELL_CACHE = 'xxzcard-app-shell-v(\d+)';/);
const runtimeVersion = serviceWorker.match(/const RUNTIME_CACHE = 'xxzcard-runtime-v(\d+)';/);
assert.ok(appShellVersion, 'service worker must declare an app-shell cache version');
assert.equal(runtimeVersion?.[1], appShellVersion[1], 'app-shell and runtime cache versions must stay aligned');
assert.doesNotMatch(serviceWorker, /assets\/student-home\//);
assert.match(serviceWorker, /'\.\/styles-home-nav\.css'/);
assert.match(serviceWorker, /'\.\/styles-student-home-dashboard\.css'/);
assert.match(serviceWorker, /'\.\/js\/vocabularyLessonTaught\.js'/);
assert.doesNotMatch(serviceWorker, /styles-vocabulary-lesson-016/);
assert.doesNotMatch(serviceWorker, /VOCABULARY_LESSON_ASSETS/);
assert.match(reviewScript, /function canUseVocabularyReview\(\) \{\s*return currentUser === 'teacher';\s*\}/);

console.log('home navigation layout tests passed');
