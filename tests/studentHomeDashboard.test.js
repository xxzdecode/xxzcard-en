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
assert.match(dashboard, /student-home-card--adventure[\s\S]*id="vocabularyAdventurePreviewEntry"/);
assert.match(dashboard, /id="vocabularyAdventureChallengeEntry"[\s\S]*单词挑战/);
assert.match(dashboard, /id="grammarChallengeHomeEntry"[\s\S]*语法挑战/);
assert.match(dashboard, /id="studentClassroomPracticeEntry"[\s\S]*今天可选 1 项/);
assert.match(dashboard, /id="vocabularyTourHomeEntry"[\s\S]*新词导览/);
assert.doesNotMatch(dashboard, /今日单词|混合单词/);
assert.doesNotMatch(html, /id="homeQuickActions"|id="todayWordBtn"|id="mixedWordBtn"/);

assert.equal((dashboard.match(/class="student-home-card__main"/g) || []).length, 5, 'dashboard should expose five task entries');
assert.equal((dashboard.match(/class="student-reward-chest"/g) || []).length, 4, 'only four reward modules should expose chests');
const tourCard = dashboard.match(/<article class="student-home-card[^"]*student-home-card--tour"[\s\S]*?<\/article>/)?.[0] || '';
assert.doesNotMatch(tourCard, /student-reward-chest/);
assert.equal((dashboard.match(/student-home-card-grid/g) || []).length, 2);
for (const asset of [
  'vocabulary-adventure.webp',
  'word-challenge.webp',
  'grammar-challenge.webp',
  'classroom-practice.webp',
  'new-word-guide.webp'
]) {
  assert.match(dashboard, new RegExp(`assets/student-home/home-v4/scenes/${asset}`));
}
assert.doesNotMatch(dashboard, /<svg\b/);
assert.doesNotMatch(dashboard, /assets\/student-home\/card6\/scenes\/[^"]+\.png/);
assert.match(dashboard, /fetchpriority="high"/);
assert.equal((dashboard.match(/decoding="async"/g) || []).length >= 5, true);
assert.match(dashboard, /id="studentHomeRotatePrompt"[\s\S]*请将 iPad 横过来使用[\s\S]*横屏可以完整看到今天的学习任务/);
assert.match(styles, /\.student-home-card--adventure\s*\{[^}]*height:/s);
assert.match(styles, /\.student-home-card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
assert.match(styles, /home-v4\/ui\/section-plaque\.png/);
assert.match(styles, /home-v4\/scenes\/home-background\.webp/);
assert.match(styles, /\.student-home-card--word-challenge \.student-home-card__scene\s*\{[^}]*transform:\s*scale\(1\.13\)/s);
assert.match(styles, /\.student-home-card--grammar \.student-home-card__scene\s*\{[^}]*transform:\s*scale\(1\.09\)/s);
assert.match(styles, /\.student-home-card--classroom \.student-home-card__scene\s*\{[^}]*transform:\s*scale\(1\.13\)/s);
assert.match(styles, /\.student-home-card--tour \.student-home-card__scene\s*\{[^}]*transform:\s*scale\(1\.28\)/s);
assert.match(styles, /\.student-summary-card__avatar\s*\{[^}]*width:\s*76px[^}]*height:\s*76px[^}]*border:\s*0/s);
assert.match(styles, /\.student-reward-chest\[data-state="pending"\]/);
assert.match(styles, /pointer-events:\s*none/);
assert.match(styles, /@media \(min-width: 768px\) and \(max-width: 1366px\) and \(orientation: landscape\)/);
assert.match(styles, /width:\s*min\(1180px,\s*100%\)/);
assert.match(styles, /@media \(min-width: 768px\) and \(orientation: portrait\)/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /\.student-summary-card__pending\[hidden\][\s\S]*?display:\s*none/);

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
  'studentRewardUnavailable',
  'studentRewardValues',
  'studentTotalCoins',
  'studentChallengeCoins',
  'studentTodayCoins',
  'studentTodayMaxCoins',
  'studentTodayCoinsProgress',
  'studentHomeNotice',
  'studentClassroomPracticeStatus',
  'studentClassroomPracticeEntry'
].map(id => [id, fakeElement()]));
elements.studentTodayCoinsProgress.parentElement = fakeElement();
let coursewareListOpened = 0;

const context = {
  console,
  currentUser: 'sister',
  document: { getElementById: id => elements[id] || null },
  isTeacher: () => context.currentUser === 'teacher',
  sbGet: async key => key === 'student_reward_v1_sister'
    ? { totalCoins: 406, daily: { '2026-07-30': { coins: 8 } } }
    : null,
  openCoursewareList: async () => { coursewareListOpened += 1; }
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
  challengeCoins: 7,
  todayCoins: 18,
  todayMaxCoins: 30
});
assert.equal(elements.studentSummaryName.textContent, '弟弟');
assert.equal(elements.studentSummaryAvatarImage.hidden, false);
assert.match(elements.studentSummaryAvatarImage.src, /brother-avatar\.png$/);
assert.equal(elements.studentRewardUnavailable.hidden, true);
assert.equal(elements.studentRewardValues.hidden, false);
assert.equal(elements.studentTotalCoins.textContent, '12.5');
assert.equal(elements.studentChallengeCoins.textContent, '7');
assert.equal(elements.studentTodayCoins.textContent, '18');
assert.equal(elements.studentTodayCoinsProgress.style.width, '60%');
assert.equal(elements.studentTodayCoinsProgress.parentElement.attributes['aria-valuenow'], '18');

context.openStudentClassroomPractice();
assert.equal(elements.studentHomeNotice.textContent, '');
assert.equal(elements.studentHomeNotice.hidden, true);
assert.equal(coursewareListOpened, 1);
context.currentUser = 'teacher';
context.openStudentClassroomPractice();
assert.equal(coursewareListOpened, 1, 'teacher must not enter through the student adapter');

assert.match(homeSource, /student_reward_v1_/);
assert.match(homeSource, /\$\{user\}-avatar\.png/);
assert.match(homeSource, /await loadStudentRewardSummary\(\)/);
assert.match(homeSource, /await refreshStudentClassroomPracticeHome\(\)/);
const rewardRendererSource = homeSource.match(/function renderStudentRewardSummary\(summary\) \{[\s\S]*?\n\}/)?.[0] || '';
const classroomAdapterSource = homeSource.match(/function openStudentClassroomPractice\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(rewardRendererSource, /sbSet\(|saveData\(/);
assert.doesNotMatch(classroomAdapterSource, /sbSet\(|saveData\(/);
assert.match(classroomAdapterSource, /openCoursewareList\(/);
assert.match(homeSource, /await openCoursewareList\(\)/);

console.log('student home dashboard tests passed');
