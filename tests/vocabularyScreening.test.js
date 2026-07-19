const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, Date, Math, JSON, Object, Array, Set, String });
vm.runInContext(fs.readFileSync(path.join(root, 'js/dictionary.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/vocabularyScreeningData.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/vocabularyScreening.js'), 'utf8'), context);

function value(expression) {
  return vm.runInContext(expression, context);
}

const batches = value('VOCABULARY_SCREENING_BATCHES');
assert.equal(batches.length, 1);
assert.equal(batches[0].id, 'common-words-1');
assert.equal(batches[0].title, '常用词1');
assert.equal(batches[0].words.length, 169);
assert.equal(new Set(Array.from(batches[0].words, item => item.word.toLowerCase())).size, 169);
assert.ok(batches[0].words.every(item => item.word && item.meaning && item.pos));

const options = value(`makeVocabularyMeaningOptions(
  VOCABULARY_SCREENING_BATCHES[0].words[0],
  VOCABULARY_SCREENING_BATCHES[0].words,
  4,
  () => 0.42
)`);
assert.equal(options.length, 4);
assert.equal(new Set(Array.from(options)).size, 4);
assert.ok(Array.from(options).includes('孩子'));

value(`globalThis.__record = makeVocabularyScreeningRecord(
  VOCABULARY_SCREENING_BATCHES[0],
  'sister',
  new Date('2026-07-20T03:00:00.000Z'),
  () => 0.5
)`);
assert.equal(value('__record.questionOrder.length'), 169);
assert.equal(value('nextVocabularyScreeningWord(__record) !== ""'), true);

value(`
  const batch = VOCABULARY_SCREENING_BATCHES[0];
  __record.questionOrder.forEach((word, index) => {
    const item = getVocabularyScreeningWord(batch, word);
    answerVocabularyScreeningRecord(
      __record,
      batch,
      word,
      index === 0 ? '不是正确释义' : item.meaning,
      new Date('2026-07-20T04:00:00.000Z')
    );
  });
`);
assert.equal(value('__record.knownWords.length'), 168);
assert.equal(value('__record.unknownWords.length'), 1);
assert.equal(value('__record.completedAt'), '2026-07-20T04:00:00.000Z');
assert.equal(value('nextVocabularyScreeningWord(__record)'), '');

const wordbook = value('makeVocabularyScreeningWordbook(VOCABULARY_SCREENING_BATCHES[0], __record)');
assert.equal(wordbook.id, 'screening-common-words-1-sister');
assert.equal(wordbook.name, '07.20｜常用词1');
assert.deepEqual(Array.from(wordbook.sharedWith), ['sister']);
assert.equal(wordbook.cards.length, 1);
assert.deepEqual(Object.keys(wordbook.cards[0]), [
  'word', 'meaning', 'pos', 'phonetic', 'emoji', 'morphology',
  'collocations', 'irregularForms', 'synonyms', 'wordFamily', 'tip'
]);
context.__wordbookCard = wordbook.cards[0];
assert.equal(value('isCurrentEnglishCard(__wordbookCard)'), true);

value(`
  globalThis.__known1 = mergeVocabularyKnownLibrary(
    null, VOCABULARY_SCREENING_BATCHES[0], __record,
    new Date('2026-07-20T04:01:00.000Z')
  );
  globalThis.__known2 = mergeVocabularyKnownLibrary(
    __known1, VOCABULARY_SCREENING_BATCHES[0], __record,
    new Date('2026-07-20T04:02:00.000Z')
  );
`);
assert.equal(value('__known1.words.length'), 168);
assert.equal(value('__known2.words.length'), 168);
assert.equal(value('__known2.student'), 'sister');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /id="screenVocabularyScreening"/);
assert.match(html, /onclick="openVocabularyScreening\(\)"/);
assert.ok(html.indexOf('js/vocabularyScreeningData.js') < html.indexOf('js/vocabularyScreening.js'));
assert.ok(html.indexOf('js/vocabularyScreening.js') < html.indexOf('js/main.js'));

console.log('vocabulary screening tests passed');
