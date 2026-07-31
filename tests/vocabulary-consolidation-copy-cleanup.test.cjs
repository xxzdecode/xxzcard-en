'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const player = require('../js/vocabularyConsolidationCore.js');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function coreStub() {
  return {
    normalizeVocabularyAdventureState(value) {
      const source = value && typeof value === 'object' ? value : {};
      const session = source.session && typeof source.session === 'object'
        ? {
            date: source.session.date || '2026-08-01',
            plan: clone(source.session.plan || []),
            cursor: Number(source.session.cursor) || 0,
            phase: source.session.phase || 'completed',
            completed: source.session.completed === true,
            rewardGranted: source.session.rewardGranted === true
          }
        : null;
      return { version: 1, words: clone(source.words || {}), session };
    },
    buildVocabularyAdventureQuestion({ candidates, wordKey, taskType }) {
      const target = candidates.find(item => item.key === wordKey);
      const other = candidates.find(item => item.key !== wordKey);
      if (!target || !other) return { ok: false, code: 'INSUFFICIENT_OPTIONS' };
      const meaningAnswer = taskType !== 'meaningToWord' && taskType !== 'audioToWord';
      const options = meaningAnswer
        ? [{ label: target.card.meaning, correct: true }, { label: other.card.meaning, correct: false }]
        : [{ label: target.card.word, correct: true }, { label: other.card.word, correct: false }];
      return {
        ok: true,
        interaction: 'choice',
        taskType,
        questionType: taskType,
        prompt: meaningAnswer ? target.card.word : target.card.meaning,
        options,
        correctIndex: 0
      };
    }
  };
}

function completedSession(results) {
  return {
    date: '2026-08-01',
    plan: results.map((entry, index) => ({
      wordKey: entry.word,
      word: entry.word,
      phase: index % 2 ? 'review' : 'screening',
      status: 'completed',
      result: entry.result,
      taskType: entry.taskType || 'wordToMeaning',
      confirmationTaskType: entry.confirmationTaskType || ''
    })),
    cursor: results.length,
    phase: 'completed',
    completed: true,
    rewardGranted: false
  };
}

function state(results) {
  const words = Object.fromEntries(results.map(({ word }) => [word, {
    lastResult: 'F', intervalIndex: 2, reviewCount: 4, nextReviewAt: '2026-08-08', lastTaskType: 'wordToMeaning'
  }]));
  return { version: 1, words, session: completedSession(results) };
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('only current-plan F/H words enter consolidation', () => {
  const selected = player.selectVocabularyConsolidationItems(completedSession([
    { word: 'alpha', result: 'D' },
    { word: 'bravo', result: 'F' },
    { word: 'charlie', result: 'H' },
    { word: 'delta', result: 'D' }
  ]));
  assert.deepEqual(selected.map(item => item.wordKey), ['bravo', 'charlie']);
});

test('F is prioritized, H fills, and total is capped at six', () => {
  const selected = player.selectVocabularyConsolidationItems(completedSession([
    { word: 'h1', result: 'H' }, { word: 'f1', result: 'F' }, { word: 'f2', result: 'F' },
    { word: 'h2', result: 'H' }, { word: 'f3', result: 'F' }, { word: 'h3', result: 'H' },
    { word: 'h4', result: 'H' }, { word: 'h5', result: 'H' }
  ]));
  assert.deepEqual(selected.map(item => item.wordKey), ['f1', 'f2', 'f3', 'h1', 'h2', 'h3']);
});

test('deduplicates while preserving original order inside result priority', () => {
  const selected = player.selectVocabularyConsolidationItems(completedSession([
    { word: 'same', result: 'H' }, { word: 'first', result: 'F' },
    { word: 'same', result: 'F' }, { word: 'second', result: 'F' }
  ]));
  assert.deepEqual(selected.map(item => item.wordKey), ['first', 'same', 'second']);
});

test('no weak words completes consolidation immediately', () => {
  const core = coreStub();
  const next = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'D' }, { word: 'bravo', result: 'D' }
  ]), core);
  assert.equal(next.session.consolidation.status, 'completed');
  assert.equal(next.session.consolidation.items.length, 0);
});

test('question type differs from the main-plan type', () => {
  const core = coreStub();
  const base = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F', taskType: 'wordToMeaning' },
    { word: 'bravo', result: 'D' }
  ]), core);
  const review = {
    VocabularyAdventureReviewTypes: {
      wordToMeaning: { build: () => ({ ok: true, interaction: 'choice', questionType: 'wordToMeaning' }) },
      meaningToWord: { build: () => ({ ok: true, interaction: 'choice', questionType: 'meaningToWord', options: [{ label: 'alpha' }, { label: 'bravo' }], correctIndex: 0 }) }
    }
  };
  const question = player.buildVocabularyConsolidationQuestion({
    state: base,
    candidates: [
      { key: 'alpha', card: { word: 'alpha', meaning: 'A' } },
      { key: 'bravo', card: { word: 'bravo', meaning: 'B' } }
    ],
    core,
    review
  });
  assert.equal(question.ok, true);
  assert.notEqual(question.questionType, 'wordToMeaning');
});

test('missing advanced fields safely fall back to a basic meaning question', () => {
  const core = coreStub();
  const base = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F', taskType: 'missingLetters' },
    { word: 'bravo', result: 'D' }
  ]), core);
  const review = {
    VocabularyAdventureReviewTypes: {
      phoneticToWord: { build: () => null },
      missingLetters: { build: () => null }
    }
  };
  const question = player.buildVocabularyConsolidationQuestion({
    state: base,
    candidates: [
      { key: 'alpha', card: { word: 'alpha', meaning: 'A' } },
      { key: 'bravo', card: { word: 'bravo', meaning: 'B' } }
    ],
    core,
    review
  });
  assert.equal(question.ok, true);
  assert.equal(question.fallback, true);
  assert.notEqual(question.taskType, 'missingLetters');
});

test('consolidation leaves formal memory results and scheduling untouched', () => {
  const core = coreStub();
  const before = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F', taskType: 'wordToMeaning' },
    { word: 'bravo', result: 'D' }
  ]), core);
  const wordsBefore = clone(before.words);
  const after = player.prepareVocabularyConsolidationResult(before, {
    expectedCursor: 0,
    wordKey: 'alpha',
    taskType: 'meaningToWord',
    correct: true,
    attempts: 1
  }, core);
  assert.deepEqual(after.words, wordsBefore);
});

test('cursor advances only after a successful save', async () => {
  const core = coreStub();
  const before = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F' }, { word: 'bravo', result: 'D' }
  ]), core);
  const prepared = player.prepareVocabularyConsolidationResult(before, {
    expectedCursor: 0, wordKey: 'alpha', taskType: 'meaningToWord', correct: true, attempts: 1
  }, core);
  const committed = await player.persistPreparedVocabularyState(before, prepared, async () => true);
  assert.equal(committed.ok, true);
  assert.equal(committed.state.session.consolidation.cursor, 1);
});

test('save failure keeps the current consolidation item', async () => {
  const core = coreStub();
  const before = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F' }, { word: 'bravo', result: 'D' }
  ]), core);
  const prepared = player.prepareVocabularyConsolidationResult(before, {
    expectedCursor: 0, wordKey: 'alpha', taskType: 'meaningToWord', correct: false, attempts: 2
  }, core);
  const committed = await player.persistPreparedVocabularyState(before, prepared, async () => false);
  assert.equal(committed.ok, false);
  assert.equal(committed.state.session.consolidation.cursor, 0);
  assert.equal(committed.state.session.consolidation.items[0].status, 'pending');
});

test('refresh restores the exact saved consolidation plan', () => {
  const core = coreStub();
  const generated = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F' }, { word: 'bravo', result: 'H' }, { word: 'charlie', result: 'D' }
  ]), core);
  generated.session.consolidation.items[0].taskType = 'meaningToWord';
  const restored = player.ensureVocabularyConsolidation(clone(generated), core);
  assert.deepEqual(restored.session.consolidation, generated.session.consolidation);
});

test('completed consolidation is not generated again', () => {
  const core = coreStub();
  const generated = player.ensureVocabularyConsolidation(state([
    { word: 'alpha', result: 'F' }, { word: 'bravo', result: 'D' }
  ]), core);
  generated.session.consolidation.items[0].status = 'completed';
  generated.session.consolidation.items[0].taskType = 'meaningToWord';
  generated.session.consolidation.cursor = 1;
  generated.session.consolidation.status = 'completed';
  const reopened = player.ensureVocabularyConsolidation(generated, core);
  assert.equal(reopened.session.consolidation.status, 'completed');
  assert.equal(reopened.session.consolidation.items.length, 1);
  assert.equal(reopened.session.consolidation.items[0].taskType, 'meaningToWord');
});

test('sister and brother use completely separate state keys', () => {
  assert.equal(player.vocabularyAdventureStateKeyForUser('sister'), 'vocab_adventure_v1_sister');
  assert.equal(player.vocabularyAdventureStateKeyForUser('brother'), 'vocab_adventure_v1_brother');
  assert.notEqual(player.vocabularyAdventureStateKeyForUser('sister'), player.vocabularyAdventureStateKeyForUser('brother'));
});

test('legacy sessions without consolidation normalize safely', () => {
  const core = coreStub();
  const legacy = state([{ word: 'alpha', result: 'F' }, { word: 'bravo', result: 'D' }]);
  delete legacy.session.consolidation;
  const normalized = player.ensureVocabularyConsolidation(legacy, core);
  assert.equal(normalized.session.consolidation.items.length, 1);
  assert.equal(normalized.session.consolidation.cursor, 0);
});

test('active child-facing copy contains no internal diagnostic phrases', () => {
  const source = ['vocabularyConsolidationCore.js', 'vocabularyConsolidationView.js', 'vocabularyConsolidationPlayer.js']
    .map(file => fs.readFileSync(path.join(__dirname, '../js', file), 'utf8')).join('\n');
  const visibleSegments = [
    ...source.matchAll(/setFeedback\((['"`])([\s\S]*?)\1/g),
    ...source.matchAll(/setPlayerBody\(`([\s\S]*?)`/g)
  ].map(match => match[2] || match[1] || '').join('\n');
  const banned = [
    'D 直接答对', 'H 提示后', 'F 待加强', '已记录为 D', '已记录为 H', '已记录为 F',
    'usageWeak', 'usage weak', '使用较弱', '间隔保持不变', '严重逾期', '掌握率', '复习优先级'
  ];
  banned.forEach(phrase => assert.equal(visibleSegments.includes(phrase), false, phrase));
});

(async () => {
  for (const [name, fn] of tests) {
    await fn();
    console.log(`✓ ${name}`);
  }
  console.log(`\n${tests.length} vocabulary consolidation/copy tests passed.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
