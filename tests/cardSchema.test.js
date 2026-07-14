const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console });

vm.runInContext(fs.readFileSync(path.join(root, 'js/dictionary.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/import.js'), 'utf8'), context);

const validText = [
  'word: wind',
  'meaning: 风',
  'pos: 名词',
  'phonetic: /wɪnd/',
  'emoji: 🌬️',
  'morphology: []',
  'collocations: [{"phrase":"strong wind","example":"The wind blows. / 风吹着。"}]',
  'irregularForms: []',
  'synonyms: ["breeze"]',
  'wordFamily: []',
  'tip: 小提示'
].join('\n');

context.testInput = validText;
const valid = vm.runInContext('parseCards(testInput)', context);
assert.deepEqual(Array.from(valid.errors), []);
assert.equal(valid.cards.length, 1);
assert.deepEqual(Object.keys(valid.cards[0]), [
  'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
  'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
]);
assert.deepEqual(JSON.parse(JSON.stringify(valid.cards[0].collocations)), [{
  phrase: 'strong wind',
  example: 'The wind blows. / 风吹着。'
}]);
assert.ok(['en', 'zh', 'ex', 'note'].every(field => !(field in valid.cards[0])));

for (const field of ['en', 'zh', 'ex', 'note']) {
  context.testInput = validText.replace('word: wind', `${field}: legacy`);
  const result = vm.runInContext('parseCards(testInput)', context);
  assert.equal(result.cards.length, 0, `${field} must not produce a partial card`);
  assert.match(result.errors.join('\n'), new RegExp(`旧字段：${field}`));
}

for (const mixed of [
  validText.replace('meaning: 风', 'zh: 风'),
  validText.replace('word: wind', 'en: wind')
]) {
  context.testInput = mixed;
  const result = vm.runInContext('parseCards(testInput)', context);
  assert.equal(result.cards.length, 0);
  assert.ok(result.errors.length > 0);
}

context.testInput = JSON.stringify([{ word: 'wind', meaning: '风' }]);
const jsonResult = vm.runInContext('parseCards(testInput)', context);
assert.equal(jsonResult.cards.length, 0);
assert.match(jsonResult.errors.join('\n'), /不支持外层 JSON/);

context.legacyCard = { en: 'wind', zh: '风' };
assert.equal(vm.runInContext('getCardWord(legacyCard)', context), '');
assert.equal(vm.runInContext('getCardMeaning(legacyCard)', context), '');
assert.equal(vm.runInContext('normalizeEnglishCard(legacyCard)', context), context.legacyCard);
assert.deepEqual(context.legacyCard, { en: 'wind', zh: '风' });

console.log('card schema tests passed');
