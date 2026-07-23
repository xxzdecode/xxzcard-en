const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const studyScript = fs.readFileSync(path.join(root, 'js/study.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert.match(studyScript, /function isAppleTouchWebKit\(\)/);
assert.match(studyScript, /platform === 'MacIntel' && navigator\.maxTouchPoints > 1/);
assert.match(studyScript, /function ensureStudyCardMotionLayer\(\)/);
assert.match(studyScript, /motion\.id = 'cardMotion'/);
assert.match(studyScript, /motion\.appendChild\(wrapper\)/);

assert.match(studyScript, /\.card-wrapper\.flipped\s*\{[\s\S]*rotateY\(180deg\)/);
assert.match(studyScript, /html\.ios-touch-webkit \.card-wrapper[\s\S]*transform-style: flat/);
assert.match(studyScript, /html\.ios-touch-webkit \.card-wrapper\.flipped \.card-back[\s\S]*visibility: visible/);
assert.match(studyScript, /html\.ios-touch-webkit \.back-body[\s\S]*-webkit-overflow-scrolling: auto/);

assert.match(studyScript, /w\.style\.removeProperty\('transform'\)/);
assert.match(studyScript, /w\.classList\.toggle\('flipped', studyFlipped\)/);
assert.match(studyScript, /front\?\.setAttribute\('aria-hidden'/);
assert.match(studyScript, /resetStudyCardMotion\(false\);\s*setFlipped\(studyFlipped\)/);

assert.match(studyScript, /motion\.style\.transform = `translateX/);
assert.doesNotMatch(studyScript, /(?:wrapper|w)\.style\.transform\s*=/);
assert.match(studyScript, /addEventListener\('touchcancel'/);

assert.match(serviceWorker, /vocabulary-review-v17/);
assert.match(serviceWorker, /'\.\/js\/study\.js'/);

console.log('study card flip tests passed');