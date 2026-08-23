const assert = require('node:assert/strict');
const groups = require('../js/vocabularyLessonGroups.js');

function book(id, count) {
  return { id, cards: Array.from({ length: count }, (_, index) => ({ word: `word-${index + 1}` })) };
}

(async () => {
  const thirtyOne = groups.reconcileVocabularyLessonGroups(book('book-a', 31), null);
  assert.deepEqual(thirtyOne.groups.map(group => group.wordKeys.length), [20, 11]);
  assert.deepEqual(thirtyOne.groups.map(group => group.id), ['book-a:g01', 'book-a:g02']);

  const sealedTwelve = groups.reconcileVocabularyLessonGroups(book('book-b', 15), {
    version: 1,
    bookId: 'book-b',
    groupSize: 20,
    groups: [{ id: 'book-b:g01', order: 1, wordKeys: groups.collectBookWordKeys(book('book-b', 12)), sealed: true }]
  });
  assert.deepEqual(sealedTwelve.groups.map(group => group.wordKeys.length), [12, 3]);

  const openTwelve = groups.reconcileVocabularyLessonGroups(book('book-c', 15), {
    version: 1,
    bookId: 'book-c',
    groupSize: 20,
    groups: [{ id: 'book-c:g01', order: 1, wordKeys: groups.collectBookWordKeys(book('book-c', 12)), sealed: false }]
  });
  assert.deepEqual(openTwelve.groups.map(group => group.wordKeys.length), [15]);

  const expandedCategory = {
    id: 'vocabulary-category:vehicles',
    vocabularyLessonTransient: true,
    vocabularyLessonTaughtGroupAliases: ['book-vehicles'],
    cards: [{ word: 'bus' }, { word: 'car' }, { word: 'truck' }]
  };
  const frozenCategory = groups.reconcileVocabularyLessonGroupsWithTaught(expandedCategory, {
    version: 1,
    groups: {
      'book-vehicles:g01': {
        status: 'taught',
        wordKeysSnapshot: ['bus', 'car']
      }
    }
  });
  assert.deepEqual(
    frozenCategory.groups.map(group => ({ id: group.id, words: group.wordKeys, sealed: group.sealed })),
    [
      { id: 'book-vehicles:g01', words: ['bus', 'car'], sealed: true },
      { id: 'vocabulary-category:vehicles:g02', words: ['truck'], sealed: false }
    ],
    'words added to a taught category must start a new group without changing the taught snapshot'
  );

  const noTaughtCategory = groups.reconcileVocabularyLessonGroupsWithTaught(expandedCategory, null);
  assert.deepEqual(noTaughtCategory.groups.map(group => group.wordKeys), [['bus', 'car', 'truck']]);

  const expandedAgain = {
    ...expandedCategory,
    cards: [
      { word: 'bus' },
      { word: 'car' },
      ...Array.from({ length: 21 }, (_, index) => ({ word: `new-${index + 1}` }))
    ]
  };
  const frozenAcrossBoundaries = groups.reconcileVocabularyLessonGroupsWithTaught(expandedAgain, {
    version: 1,
    groups: {
      'book-vehicles:g01': { status: 'taught', wordKeysSnapshot: ['bus', 'car'] }
    }
  });
  assert.deepEqual(frozenAcrossBoundaries.groups.map(group => group.wordKeys.length), [2, 20, 1]);
  assert.deepEqual(frozenAcrossBoundaries.groups.map(group => group.id), [
    'book-vehicles:g01',
    'vocabulary-category:vehicles:g02',
    'vocabulary-category:vehicles:g03'
  ]);

  const newlyTaught = groups.markVocabularyLessonGroupCompleted(null, {
    groupId: frozenCategory.groups[1].id,
    wordKeys: frozenCategory.groups[1].wordKeys,
    completedAt: '2026-08-23T10:00:00+08:00',
    eligibleDate: '2026-08-24'
  });
  assert.deepEqual(newlyTaught.progress.groups['vocabulary-category:vehicles:g02'].wordKeysSnapshot, ['truck']);
  assert.equal(newlyTaught.progress.challengeQueue['vocabulary-category:vehicles:g02'].eligibleDate, '2026-08-24');

  const unrelatedTaughtCategory = groups.reconcileVocabularyLessonGroupsWithTaught(expandedCategory, {
    version: 1,
    groups: {
      'book-colours:g01': { status: 'taught', wordKeysSnapshot: ['bus', 'car'] }
    }
  });
  assert.deepEqual(
    unrelatedTaughtCategory.groups.map(group => group.wordKeys),
    [['bus', 'car', 'truck']],
    'an unrelated taught group must not freeze this category'
  );

  const sister = groups.markVocabularyLessonGroupCompleted(null, {
    groupId: 'book-a:g01',
    wordKeys: thirtyOne.groups[0].wordKeys,
    completedAt: '2026-08-01T21:30:00+08:00',
    eligibleDate: '2026-08-02'
  });
  assert.equal(sister.changed, true);
  assert.equal(groups.isVocabularyLessonGroupCompleted(sister.progress, 'book-a:g01'), true);
  assert.equal(groups.isVocabularyLessonGroupCompleted(null, 'book-a:g01'), false);

  const repeated = groups.markVocabularyLessonGroupCompleted(sister.progress, {
    groupId: 'book-a:g01',
    wordKeys: thirtyOne.groups[0].wordKeys,
    completedAt: '2026-08-01T22:00:00+08:00',
    eligibleDate: '2026-08-02'
  });
  assert.equal(repeated.changed, false);
  assert.equal(repeated.progress.groups['book-a:g01'].completedAt, '2026-08-01T21:30:00+08:00');
  assert.equal(Object.keys(repeated.progress.challengeQueue).length, 1);

  assert.deepEqual(groups.collectEligibleQueuedWords(sister.progress, '2026-08-01'), []);
  assert.equal(groups.collectEligibleQueuedWords(sister.progress, '2026-08-02').length, 20);

  const consumed = groups.consumeQueuedWords(
    sister.progress,
    groups.collectEligibleQueuedWords(sister.progress, '2026-08-02').slice(0, 10)
  );
  assert.equal(consumed.changed, true);
  assert.equal(groups.collectEligibleQueuedWords(consumed.progress, '2026-08-02').length, 10);

  const migrated = groups.migrateLegacyVocabularyLessonProgress({
    version: 1,
    lastTeachingBatchIndex: 1,
    batchPositions: [0, 3]
  }, [20, 11]);
  assert.deepEqual(migrated, { groupIndex: 0, wordIndex: 13, absoluteIndex: 13 });

  const remote = sister.progress;
  const conservative = groups.mergeVocabularyLessonProgressAfterFailedLoad(
    remote,
    groups.defaultVocabularyLessonProgress()
  );
  assert.equal(conservative.groups['book-a:g01'].status, 'completed');
  assert.equal(conservative.challengeQueue['book-a:g01'].wordKeys.length, 20);

  const falseMarker = groups.prepareVocabularyLessonProgressWrite(null, {
    version: 1,
    groups: {},
    challengeQueue: {},
    migrations: { 'book-z': 'legacy-v1-to-groups-v1' }
  }, false);
  assert.equal(falseMarker.migrations['book-z'], undefined);

  const realMarker = groups.prepareVocabularyLessonProgressWrite(null, {
    version: 1,
    groups: {
      'book-z:g01': {
        status: 'active',
        wordIndex: 4,
        updatedAt: '2026-08-01T10:00:00Z'
      }
    },
    challengeQueue: {},
    migrations: { 'book-z': 'legacy-v1-to-groups-v1' }
  }, false);
  assert.equal(realMarker.migrations['book-z'], 'legacy-v1-to-groups-v1');

  let reads = 0;
  let written = null;
  const fakeRoot = {
    document: {},
    setTimeout,
    sbGet: async key => {
      reads += 1;
      if (reads === 1) throw new Error('temporary read failure');
      assert.equal(key, 'vocab_lesson_progress_v1_sister');
      return remote;
    },
    sbSet: async (key, value) => {
      assert.equal(key, 'vocab_lesson_progress_v1_sister');
      written = value;
      return true;
    }
  };
  groups.installCloudProgressSafety(fakeRoot);
  await assert.rejects(() => fakeRoot.sbGet('vocab_lesson_progress_v1_sister'));
  await fakeRoot.sbSet('vocab_lesson_progress_v1_sister', groups.defaultVocabularyLessonProgress());
  assert.equal(reads, 2);
  assert.equal(written.groups['book-a:g01'].status, 'completed');
  assert.equal(written.challengeQueue['book-a:g01'].wordKeys.length, 20);

  console.log('vocabulary lesson group tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
