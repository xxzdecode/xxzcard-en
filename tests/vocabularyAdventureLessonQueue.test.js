const assert = require('node:assert/strict');
const core = require('../js/vocabularyAdventureCore.js');
const guidePool = require('../js/vocabularyAdventureLessonQueue.js');

const masterCards = {
  apple: { word: 'Apple', meaning: '苹果', phonetic: '/ap/' },
  pear: { word: 'pear', meaning: '梨' },
  bus: { word: 'bus', meaning: '公共汽车' },
  hidden: { word: 'hidden', meaning: '不应出现' },
  invalid: { word: 'invalid', meaning: '' }
};
const groups = [{
  id: 'themes',
  categories: [{
    id: 'fruit',
    name: '水果',
    cardRefs: [
      { wordKey: 'apple', overrides: { word: 'APPLE' } },
      { wordKey: 'pear' },
      { wordKey: 'missing' }
    ]
  }, {
    id: 'school-day',
    name: '校内',
    cards: [masterCards.bus, masterCards.apple, masterCards.invalid]
  }]
}];

const candidates = guidePool.collectCurrentVocabularyGuideCandidates({ groups, masterCards });
assert.deepEqual(candidates.map(item => item.key), ['apple', 'pear', 'bus']);
assert.equal(candidates[0].card.word, 'APPLE', 'reference overrides apply only to the guide candidate');
assert.equal(masterCards.apple.word, 'Apple', 'master cards stay immutable');
assert.equal(candidates.some(item => item.key === 'hidden'), false, 'the master library is not concatenated into the guide pool');

const browserRoot = {
  appData: { masterCards },
  collectVisibleVocabularyAdventureCandidates: () => [{ key: 'legacy' }],
  getVocabularyLessonAvailableCategoryGroups: () => groups
};
assert.equal(guidePool.installVocabularyAdventureGuidePoolBrowserPatch(browserRoot), true);
assert.deepEqual(browserRoot.collectVisibleVocabularyAdventureCandidates().map(item => item.key), ['apple', 'pear', 'bus']);

browserRoot.getVocabularyLessonAvailableCategoryGroups = () => [];
assert.deepEqual(browserRoot.collectVisibleVocabularyAdventureCandidates(), [], 'a genuinely empty guide stays empty');

assert.equal(typeof core.collectVocabularyGuideCandidates, 'function');
console.log('vocabulary adventure guide pool tests passed');
