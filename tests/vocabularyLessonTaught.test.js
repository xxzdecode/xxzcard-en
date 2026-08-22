const assert = require('node:assert/strict');
const taught = require('../js/vocabularyLessonTaught.js');

function completed(groupId, words, completedAt) {
  return {
    version: 1,
    groups: {
      [groupId]: {
        status: 'completed',
        completedAt,
        updatedAt: completedAt,
        wordKeysSnapshot: words
      }
    },
    challengeQueue: {},
    migrations: {}
  };
}

const legacySister = completed(
  'book-numbers-basic:g01',
  ['one', 'two'],
  '2026-08-18T10:00:00+08:00'
);
legacySister.groups['book-vehicles:g01'] = {
  status: 'active',
  updatedAt: '2026-08-21T09:00:00+08:00',
  wordIndex: 3,
  wordKeysSnapshot: ['bus', 'car']
};
const legacyBrother = completed(
  'book-week-months:g01',
  ['Monday', 'January'],
  '2026-08-19T11:00:00+08:00'
);
legacyBrother.groups['book-numbers-basic:g01'] = {
  ...legacyBrother.groups['book-week-months:g01'],
  completedAt: '2026-08-20T11:00:00+08:00',
  wordKeysSnapshot: ['two', 'three']
};

const migrated = taught.migrateLegacyCompletedGroups(
  null,
  [legacySister, legacyBrother],
  '2026-08-21T08:00:00+08:00'
);
assert.equal(migrated.changed, true);
assert.deepEqual(Object.keys(migrated.state.groups).sort(), [
  'book-numbers-basic:g01',
  'book-week-months:g01'
]);
assert.equal(migrated.state.groups['book-vehicles:g01'], undefined, 'active legacy groups must not migrate');
assert.deepEqual(
  migrated.state.groups['book-numbers-basic:g01'].wordKeysSnapshot,
  ['one', 'two', 'three']
);
assert.equal(migrated.state.groups['book-numbers-basic:g01'].taughtAt, '2026-08-18T10:00:00+08:00');
assert.equal(migrated.state.groups['book-numbers-basic:g01'].eligibleDate, '2026-08-19');
assert.equal(taught.migrateLegacyCompletedGroups(migrated.state, [], '2026-08-22').changed, false);

const marked = taught.markVocabularyLessonGroupTaught(migrated.state, {
  groupId: 'book-vehicles:g01',
  wordKeys: ['bus', 'car', 'BUS'],
  taughtAt: '2026-08-21T14:30:00+08:00'
});
assert.equal(marked.changed, true);
assert.equal(taught.isVocabularyLessonGroupTaught(marked.state, 'book-vehicles:g01'), true);
assert.equal(taught.isVocabularyLessonGroupTaught(marked.state, 'book-vehicles:g01', ['bus', 'car']), true);
assert.equal(taught.isVocabularyLessonGroupTaught(marked.state, 'book-vehicles:g01', ['bus', 'car', 'truck']), false);
assert.equal(
  taught.isVocabularyLessonGroupTaught(marked.state, 'vocabulary-category:vehicles:g01', ['bus', 'car']),
  true,
  'a category card must recognize words taught under the formal wordbook group id'
);
assert.equal(taught.isVocabularyLessonGroupTaught(marked.state, 'vocabulary-category:vehicles:g01', ['bus', 'truck']), false);
assert.equal(marked.state.groups['book-vehicles:g01'].eligibleDate, '2026-08-22');
assert.deepEqual(marked.state.groups['book-vehicles:g01'].wordKeysSnapshot, ['bus', 'car']);

const adventureWords = taught.collectTaughtWordEntries(marked.state);
assert.equal(adventureWords.some(item => item.wordKey === 'bus'), true, 'taught words are available to adventure immediately');
assert.equal(
  taught.collectTaughtWordEntries(marked.state, { challengeDate: '2026-08-21' }).some(item => item.wordKey === 'bus'),
  false,
  'same-day taught words must not enter challenge'
);
assert.equal(
  taught.collectTaughtWordEntries(marked.state, { challengeDate: '2026-08-22' }).some(item => item.wordKey === 'bus'),
  true,
  'taught words enter challenge on the next day'
);

(async () => {
  const stored = {
    version: 1,
    groups: {},
    migrations: { [taught.LEGACY_MIGRATION_ID]: { migratedAt: '2026-08-21T08:00:00+08:00' } }
  };
  let mirrorReads = 0;
  let remoteReads = 0;
  global.sbGet = async key => {
    assert.equal(key, taught.TAUGHT_STATE_KEY);
    mirrorReads += 1;
    return stored;
  };
  global.sbGetRemote = async key => {
    assert.equal(key, taught.TAUGHT_STATE_KEY);
    remoteReads += 1;
    return stored;
  };

  await taught.loadVocabularyLessonTaughtState();
  assert.equal(mirrorReads, 1, 'ordinary loads must retain the mirrored offline fallback');
  assert.equal(remoteReads, 0);

  await taught.loadVocabularyLessonTaughtState({ fresh: true });
  assert.equal(remoteReads, 1, 'explicit fresh loads must still require the remote value');

  delete global.sbGet;
  delete global.sbGetRemote;
  console.log('vocabulary lesson taught state tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
