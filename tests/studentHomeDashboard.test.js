const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const homeSource = fs.readFileSync(path.join(root, 'js', 'home.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-student-home-dashboard.css'), 'utf8');

const dashboardStart = html.indexOf('<section id="studentDashboard"');
const dashboardEnd = html.indexOf('<nav class="bottom-feature-nav student-only"', dashboardStart);
const dashboard = dashboardStart >= 0 && dashboardEnd > dashboardStart
  ? html.slice(dashboardStart, dashboardEnd)
  : '';
assert.ok(dashboard, 'student dashboard should exist');
assert.match(dashboard, /class="student-dashboard student-home-dashboard student-only"/);
assert.ok(dashboard.indexOf('今日复习') < dashboard.indexOf('挑战测验'));
assert.ok(dashboard.indexOf('挑战测验') < dashboard.indexOf('今日新课'));
assert.match(dashboard, /student-home-card--adventure[^>]*id="vocabularyAdventurePreviewEntry"/);
assert.match(dashboard, /id="vocabularyAdventureChallengeEntry"[\s\S]*单词挑战/);
assert.match(dashboard, /id="grammarChallengeHomeEntry"[\s\S]*语法挑战/);
assert.match(dashboard, /id="studentClassroomPracticeEntry"[\s\S]*未发布/);
assert.match(dashboard, /id="vocabularyTourHomeEntry"[\s\S]*新词导览/);
assert.doesNotMatch(dashboard, /今日单词|混合单词/);
assert.doesNotMatch(html, /id="homeQuickActions"|id="todayWordBtn"|id="mixedWordBtn"/);

const buttons = [...dashboard.matchAll(/<button\b/g)];
assert.equal(buttons.length, 5, 'dashboard should expose five task cards');
assert.equal((dashboard.match(/student-home-card-grid/g) || []).length, 2);
for (const asset of [
  'vocabulary-adventure-scene.png',
  'word-challenge-scene.png',
  'grammar-challenge-scene.png',
  'classroom-practice-scene.png',
  'new-word-guide-scene.png'
]) {
  assert.match(dashboard, new RegExp(`assets/student-home/card6/scenes/${asset}`));
}
assert.doesNotMatch(dashboard, /<svg\b/);
assert.match(dashboard, /id="studentHomeRotatePrompt"[\s\S]*请将 iPad 横过来使用[\s\S]*横屏可以完整看到今天的学习任务/);
assert.match(styles, /\.student-home-card--adventure\s*\{[^}]*height:/s);
assert.match(styles, /\.student-home-card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
assert.match(styles, /@import url\("\.\/assets\/student-home\/card6\/docs\/student-home-tokens\.css"\)/);
assert.match(styles, /wood-plaque-blank\.png/);
assert.match(styles, /@media \(min-width: 768px\) and \(max-width: 1366px\) and \(orientation: landscape\)/);
assert.match(styles, /width:\s*min\(1180px,\s*calc\(100vw - 48px\)\)/);
assert.match(styles, /@media \(min-width: 768px\) and \(orientation: portrait\)/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);

function fakeElement() {
  return {
    textContent: '',
    hidden: false,
    style: {},
    attributes: {},
    parentElement: null,
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

const elements = Object.fromEntries([
  'studentSummaryName',
  'studentSummaryAvatarImage',
  'studentSummaryAvatarFallback',
  'studentRewardUnavailable',
  'studentRewardValues',
  'studentTotalCoins',
  'studentTodayCoins',
  'studentTodayMaxCoins',
  'studentTodayCoinsProgress',
  'studentHomeNotice'
].map(id => [id, fakeElement()]));
elements.studentTodayCoinsProgress.parentElement = fakeElement();

const context = {
  console,
  currentUser: 'sister',
  document: { getElementById: id => elements[id] || null },
  isTeacher: () => context.currentUser === 'teacher'
};
vm.createContext(context);
vm.runInContext(homeSource, context);

context.renderStudentRewardSummary({ available: false, todayMaxCoins: 30 });
assert.equal(elements.studentSummaryName.textContent, '姐姐');
assert.equal(elements.studentRewardUnavailable.hidden, false);
assert.equal(elements.studentRewardValues.hidden, true);

context.currentUser = 'brother';
context.renderStudentRewardSummary({
  available: true,
  totalCoins: 12.5,
  todayCoins: 18,
  todayMaxCoins: 30
});
assert.equal(elements.studentSummaryName.textContent, '弟弟');
assert.equal(elements.studentSummaryAvatarImage.hidden, true);
assert.equal(elements.studentSummaryAvatarFallback.hidden, false);
assert.equal(elements.studentRewardUnavailable.hidden, true);
assert.equal(elements.studentRewardValues.hidden, false);
assert.equal(elements.studentTotalCoins.textContent, '12.5');
assert.equal(elements.studentTodayCoins.textContent, '18');
assert.equal(elements.studentTodayCoinsProgress.style.width, '60%');
assert.equal(elements.studentTodayCoinsProgress.parentElement.attributes['aria-valuenow'], '18');

context.openStudentClassroomPractice();
assert.equal(elements.studentHomeNotice.textContent, '今天的随堂练习还没有发布');
assert.equal(elements.studentHomeNotice.hidden, false);
context.currentUser = 'teacher';
elements.studentHomeNotice.textContent = '';
context.openStudentClassroomPractice();
assert.equal(elements.studentHomeNotice.textContent, '', 'teacher must not enter through the student adapter');

assert.match(homeSource, /renderStudentRewardSummary\(\{ available: false, todayMaxCoins: 30 \}\)/);
const rewardRendererSource = homeSource.match(/function renderStudentRewardSummary\(summary\) \{[\s\S]*?\n\}/)?.[0] || '';
const classroomAdapterSource = homeSource.match(/function openStudentClassroomPractice\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(rewardRendererSource, /sbSet\(|saveData\(/);
assert.doesNotMatch(classroomAdapterSource, /sbSet\(|saveData\(|openCoursewareList\(/);
assert.match(homeSource, /notice\.textContent = '今天的随堂练习还没有发布'/);

console.log('student home dashboard tests passed');
