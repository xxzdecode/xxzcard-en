const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles-student-home-dashboard.css'), 'utf8');
const navStyles = fs.readFileSync(path.join(root, 'styles-home-nav.css'), 'utf8');
const adventureStyles = fs.readFileSync(path.join(root, 'styles-vocabulary-adventure-v2.css'), 'utf8');
const state = fs.readFileSync(path.join(root, 'js', 'state.js'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'js', 'repository.js'), 'utf8');
const lazy = fs.readFileSync(path.join(root, 'js', 'lazyFeatures.js'), 'utf8');
const adventureVisual = fs.readFileSync(path.join(root, 'js', 'vocabularyAdventureVisualV2.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const dailyRoute = fs.readFileSync(path.join(root, 'js', 'dailyLearningRoute.js'), 'utf8');
const wordCardPerformance = fs.readFileSync(path.join(root, 'js', 'wordCardPerformance.js'), 'utf8');
const wordCardStudySafety = fs.readFileSync(path.join(root, 'js', 'wordCardStudySafety.js'), 'utf8');
const runtimeHomeStability = fs.readFileSync(path.join(root, 'js', 'runtimeHomeStability.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(html, /<link rel="stylesheet" href="styles-home-nav\.css"/);
assert.match(html, /<link rel="stylesheet" href="styles-student-home-dashboard\.css"/);
assert.equal((html.match(/<script src=/g) || []).length, 8, 'initial page should load only eight core scripts');
assert.match(html, /js\/lazyFeatures\.js/);
assert.doesNotMatch(html, /<script src="js\/dictionary\.js"/);
assert.doesNotMatch(html, /<script src="js\/courseware\.js"/);

assert.match(navStyles, /html:not\(\.app-ready\) body\s*\{[^}]*opacity:\s*0/s);
assert.match(navStyles, /正在准备今天的学习/);
assert.match(navStyles, /html\.app-ready body\s*\{[^}]*opacity:\s*1/s);
assert.match(state, /installInitialAppBootGuard/);
assert.match(state, /root\.appData/);
assert.match(state, /finishInitialAppBoot/);
assert.match(state, /setTimeout\(finishInitialAppBoot, 8000\)/);
assert.match(state, /requestAnimationFrame/);

assert.match(styles, /@media \(min-width: 768px\)[\s\S]*?#screenHome\.active\s*\{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
assert.match(styles, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
assert.match(styles, /grid-template-rows:\s*37px\s+minmax\(0,\s*1fr\)\s+62px/);
assert.match(styles, /grid-template-columns:\s*1\.55fr\s+1fr\s+1fr/);
assert.doesNotMatch(
  styles.match(/@media \(min-width: 768px\)[\s\S]*?@media \(min-width: 768px\) and \(orientation: portrait\)/)?.[0] || '',
  /clamp\(300px|clamp\(245px/
);

assert.match(
  adventureStyles,
  /\.vav2-guide-bubble\s*\{[\s\S]*linear-gradient\(rgba\(255,249,213,\.97\),rgba\(255,249,213,\.97\)\)/,
  'fox bubble must have an opaque cream fill behind the transparent asset'
);
assert.match(adventureStyles, /\.vav2-guide-bubble\s*\{[\s\S]*color:#4f3b05/);
assert.match(adventureStyles, /\.vav2-guide-bubble\s*\{[\s\S]*text-shadow:0 1px 0 rgba\(255,255,255,\.92\)/);

assert.match(repository, /const local = getMirrorValue\('main'\)/);
assert.match(repository, /Promise\.resolve\(\)\.then\(async \(\) =>/);
assert.match(repository, /background failure must not block/);

assert.match(lazy, /adventurePlayer:/);
assert.match(lazy, /adventureChallenge:/);
assert.match(lazy, /\['openVocabularyAdventure', 'adventurePlayer'\]/);
assert.match(lazy, /\['openVocabularyAdventureChallenge', 'adventureChallenge'\]/);
assert.match(lazy, /featureGroupPromises\.delete\(group\)/);
assert.match(lazy, /teacherTools:/);
assert.match(lazy, /courseware:/);
assert.match(lazy, /vocabularyReview:/);
assert.match(lazy, /requestIdleCallback/);
assert.match(
  lazy,
  /Promise\.allSettled\(\[\s*loadFeatureGroup\('adventurePlayer'\),\s*loadFeatureGroup\('adventureChallenge'\)\s*\]\)/,
  'idle warmup should preload both adventure entries concurrently'
);
assert.match(
  lazy,
  /loadHome\(\{ background: true, reason: 'adventure-preload' \}\)/,
  'idle warmup refresh must stay silent'
);
assert.match(runtimeHomeStability, /const background = settings\.background === true/);
assert.match(runtimeHomeStability, /const loadingTimer = background \? 0 : root\.setTimeout/);
for (const reason of ['initial-cloud-refresh', 'cloud-reconnect', 'cloud-poll']) {
  assert.match(
    repository,
    new RegExp(`loadHome\\(\\{ background: true, reason: '${reason}' \\}\\)`),
    `${reason} must not show a user-initiated loading notice`
  );
}
assert.match(adventureVisual, /const LAYOUT_STYLESHEET = 'styles-vocabulary-adventure-v2\.css'/);
assert.match(adventureVisual, /function ensureLayoutStylesheet\(\)/);
assert.match(adventureVisual, /if \(!root \|\| !ensureLayoutStylesheet\(\)\) return/);
assert.match(adventureVisual, /ensureLayoutStylesheet\(\);\s*refresh\(\);/);
assert.match(adventureVisual, /const scheduleMicrotask = typeof queueMicrotask === 'function'/);
assert.match(adventureVisual, /function replaceChildrenCompat\(node, \.\.\.children\)/);

assert.match(serviceWorker, /xxzcard-app-shell-v77/);
assert.match(serviceWorker, /xxzcard-runtime-v77/);
assert.match(main, /loadFeatureScript\('js\/dailyLearningRoute\.js'\)/);
assert.ok(
  main.indexOf("loadFeatureScript('js/dailyLearningRoute.js')") < main.indexOf("loadFeatureScript('js/masterVocabularyLibrary.js')"),
  'daily route helper should start before optional startup enhancements'
);
assert.match(main, /__dailyLearningRoutePrefetchPromise = fetch/);
assert.match(main, /loadFeatureGroup\('teacherTools'\)/);
assert.match(main, /loadFeatureScript\('js\/wordCardPerformance\.js'\)/);
assert.match(main, /loadFeatureScript\('js\/wordCardStudySafety\.js'\)/);
assert.match(main, /loadFeatureScript\('js\/masterVocabularyLibrary\.js'\)/);
assert.match(main, /loadFeatureScript\('js\/studentRewards\.js'\)/);
assert.match(main, /loadFeatureScript\('js\/studentRewardLayoutGuard\.js'\)/);
assert.match(main, /loadFeatureScript\('js\/studentRewardReconcile\.js'\)/);
assert.match(
  main,
  /group !== 'adventureChallenge'[\s\S]*?vocabularyFeedbackErrorUI\.js[\s\S]*?vocabularyFeedbackSaveCoordinator\.js/,
  'challenge entry must wait for automatic feedback and next-question coordination'
);
assert.ok(
  main.indexOf('await loadHome();') < main.indexOf("loadFeatureScript('js/studentRewards.js')"),
  'the cached home must render before optional reward/history enhancements load'
);
assert.match(main, /await Promise\.all\(\[\s*loadFeatureScript\('js\/storageResilience\.js'\),\s*loadFeatureScript\('js\/masterVocabularyLibrary\.js'\)/s);
assert.match(main, /studentActivityStartup = loadFeatureScript\('js\/studentActivityControls\.js'\)/);
assert.ok(
  main.indexOf("loadFeatureScript('js/studentActivityControls.js')")
    < main.indexOf("loadFeatureScript('js/masterVocabularyLibrary.js')")
);
assert.match(main, /installHomeRefreshCoordinator/);
assert.match(main, /id === requestId/);
assert.match(main, /while \(rerunRequested\)/);
assert.match(dailyRoute, /ROUTE_TIMEOUT_MS = 2800/);
assert.match(dailyRoute, /cache: 'no-store'/);
assert.match(dailyRoute, /DAILY_ROUTE_CACHE_KEY/);
assert.match(dailyRoute, /readCachedRoute/);
assert.doesNotMatch(dailyRoute, /setInterval/);
assert.match(wordCardPerformance, /sbGetRemote\('main'\)/);
assert.match(wordCardPerformance, /renderTeacherWordCardsFast\(\)/);
assert.match(wordCardPerformance, /window\.openBatchWordCard/);
assert.doesNotMatch(wordCardPerformance, /await loadUserBatch/);
assert.doesNotMatch(wordCardPerformance, /Promise\.all\(batches/);
assert.match(wordCardStudySafety, /currentUserRec = await loadUserBatch\(currentBatchId\)/);
assert.match(wordCardStudySafety, /window\.startStudy/);
assert.match(serviceWorker, /js\/dailyLearningRoute\.js/);
assert.match(serviceWorker, /js\/wordCardPerformance\.js/);
assert.match(serviceWorker, /js\/wordCardStudySafety\.js/);
assert.match(serviceWorker, /js\/dictionary\.js/);
assert.match(serviceWorker, /js\/vocabularyAdventurePlayer\.js/);
assert.match(serviceWorker, /js\/vocabularyAdventureChallenge\.js/);
assert.match(serviceWorker, /js\/vocabularyQuestionTypesRepeatBootstrap\.js/);
assert.match(serviceWorker, /js\/vocabularyPracticeUI\.js/);
assert.match(serviceWorker, /dailyRouteNetworkOnly/);
assert.match(serviceWorker, /daily-learning-route\.json/);
assert.match(serviceWorker, /js\/masterVocabularyLibrary\.js/);
assert.match(serviceWorker, /js\/studentRewardLayoutGuard\.js/);
assert.match(serviceWorker, /js\/studentRewardReconcile\.js/);
assert.match(main, /serviceWorker\.register\('\.\/service-worker\.js'\)/);
assert.match(serviceWorker, /installAppShellAtomically/);
assert.match(serviceWorker, /response\.arrayBuffer\(\)/);
assert.match(serviceWorker, /Math\.min\(6, urls\.length\)/);
assert.doesNotMatch(serviceWorker, /Promise\.allSettled\(urls/);
assert.doesNotMatch(serviceWorker, /cache\.addAll/);
assert.doesNotMatch(serviceWorker, /assets\/vocabulary-review\//);
assert.doesNotMatch(serviceWorker, /VOCABULARY_LESSON_ASSETS/);
assert.match(serviceWorker, /grammar-challenge\/practices\/courseware-daily\.html/);
assert.match(serviceWorker, /staleWhileRevalidate/);
assert.match(serviceWorker, /cachedNavigation/);
assert.match(serviceWorker, /refreshStaticAsset/);
assert.doesNotMatch(serviceWorker, /navigationNetworkFirst|staticNetworkFirst/);
assert.doesNotMatch(serviceWorker, /apiNetworkFirst|isSupabaseApi|\.supabase\.co/);
assert.match(serviceWorker, /cacheFirst/);
assert.match(serviceWorker, /const cached = await matchCurrentGeneration\(request\)/);
assert.match(serviceWorker, /requestUrl\.pathname !== appRoot\.pathname/);

for (const [name, maxBytes] of [
  ['home-background.webp', 180000],
  ['vocabulary-adventure.webp', 180000],
  ['word-challenge.webp', 180000],
  ['grammar-challenge.webp', 140000],
  ['classroom-practice.webp', 140000],
  ['new-word-guide.webp', 140000]
]) {
  const file = path.join(root, 'assets', 'student-home', 'home-v4', 'scenes', name);
  assert.ok(fs.existsSync(file), `${name} should exist`);
  assert.ok(fs.statSync(file).size <= maxBytes, `${name} should stay within the performance budget`);
}

console.log('student home performance tests passed');
