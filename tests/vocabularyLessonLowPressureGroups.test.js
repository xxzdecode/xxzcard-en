'use strict';

const assert = require('assert');
const {
  ROUND_SIZE,
  roundOffset,
  sliceRound,
  completedWordCount,
  firstIncompleteGroupIndex,
  groupProgressLabel
} = require('../js/vocabularyLessonLowPressureGroups.js');

assert.strictEqual(ROUND_SIZE, 10);
assert.strictEqual(roundOffset(0), 0);
assert.strictEqual(roundOffset(9), 0);
assert.strictEqual(roundOffset(10), 10);
assert.strictEqual(roundOffset(19), 10);
assert.deepStrictEqual(sliceRound(Array.from({ length: 20 }, (_, i) => i), 0), [0,1,2,3,4,5,6,7,8,9]);
assert.deepStrictEqual(sliceRound(Array.from({ length: 20 }, (_, i) => i), 14), [10,11,12,13,14,15,16,17,18,19]);

const config = {
  groups: [
    { id: 'jobs:g01', wordKeys: Array.from({ length: 20 }, (_, i) => `a${i}`) },
    { id: 'jobs:g02', wordKeys: Array.from({ length: 20 }, (_, i) => `b${i}`) },
    { id: 'jobs:g03', wordKeys: Array.from({ length: 7 }, (_, i) => `c${i}`) }
  ]
};
const progress = {
  groups: {
    'jobs:g01': { status: 'completed', wordIndex: 19 },
    'jobs:g02': { status: 'active', wordIndex: 10 }
  }
};

assert.strictEqual(completedWordCount(config, progress), 20);
assert.strictEqual(firstIncompleteGroupIndex(config, progress), 1);
assert.strictEqual(groupProgressLabel(config.groups[0], progress), '20/20');
assert.strictEqual(groupProgressLabel(config.groups[1], progress), '11/20');
assert.strictEqual(groupProgressLabel(config.groups[2], progress), '0/7');

console.log('vocabularyLessonLowPressureGroups tests passed');
