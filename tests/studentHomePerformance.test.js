const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-student-home-dashboard.css'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'js', 'repository.js'), 'utf8');
const lazy = fs.readFileSync(path.join(root, 'js', 'lazyFeatures.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(html, /<link rel="stylesheet" href="styles-home-nav\.css"/);
assert.match(html, /<link rel="stylesheet" href="styles-student-home-dashboard\.css"/);
assert.equal((html.match(/<script src=/g) || []).length, 8, 'initial page should load only eight core scripts');
assert.match(html, /js\/lazyFeatures\.js/);
assert.doesNotMatch(html, /<script src="js\/dictionary\.js"/);
assert.doesNotMatch(html, /<script src="js\/courseware\.js"/);

assert.match(styles, /#screenHome\.active\s*\{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
assert.match(styles, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
assert.match(styles, /grid-template-rows:\s*64px\s+minmax\(0,\s*1fr\)/);
assert.doesNotMatch(
  styles.match(/@media \(min-width: 768px\)[\s\S]*?@media \(min-width: 768px\) and \(orientation: portrait\)/)?.[0] || '',
  /clamp\(300px|clamp\(245px/
);

assert.match(repository, /const local = getMirrorValue\('main'\)/);
assert.match(repository, /Promise\.resolve\(\)\.then\(async \(\) =>/);
assert.match(repository, /background failure must not block/);

assert.match(lazy, /teacherTools:/);
assert.match(lazy, /courseware:/);
assert.match(lazy, /vocabularyReview:/);
assert.match(lazy, /requestIdleCallback/);

assert.match(serviceWorker, /xxzcard-app-shell-v35/);
assert.match(main, /loadFeatureScript\('js\/studentRewards\.js'\)/);
assert.match(main, /loadFeatureScript\('js\/studentRewardReconcile\.js'\)/);
assert.match(serviceWorker, /js\/studentRewardReconcile\.js/);
assert.match(main, /serviceWorker\.register\('\.\/service-worker\.js'\)/);
assert.match(serviceWorker, /Promise\.allSettled/);
assert.doesNotMatch(serviceWorker, /cache\.addAll/);
assert.doesNotMatch(serviceWorker, /assets\/vocabulary-review\//);
assert.doesNotMatch(serviceWorker, /VOCABULARY_LESSON_ASSETS/);
assert.doesNotMatch(serviceWorker, /courseware\//);
assert.match(serviceWorker, /navigationNetworkFirst/);
assert.doesNotMatch(serviceWorker, /navigationStaleWhileRevalidate/);
assert.match(serviceWorker, /apiNetworkFirst/);
assert.match(serviceWorker, /cacheFirst/);
assert.match(serviceWorker, /const cached = await cache\.match\(request\)/);
assert.match(serviceWorker, /requestUrl\.pathname === appRoot\.pathname/);

for (const [name, maxBytes] of [
  ['vocabulary-adventure-scene.webp', 210000],
  ['word-challenge-scene.webp', 200000],
  ['grammar-challenge-scene.webp', 200000],
  ['classroom-practice-scene.webp', 200000],
  ['new-word-guide-scene.webp', 200000]
]) {
  const file = path.join(root, 'assets', 'student-home', 'card6', 'scenes', name);
  assert.ok(fs.existsSync(file), `${name} should exist`);
  assert.ok(fs.statSync(file).size <= maxBytes, `${name} should stay within the performance budget`);
}

console.log('student home performance tests passed');
