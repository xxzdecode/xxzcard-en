const test = require('node:test');
const assert = require('node:assert/strict');

const vocabularyUx = require('../js/runtimeVocabularyUx.js');
const homeStability = require('../js/runtimeHomeStability.js');

test('bilingual examples become a Chinese prompt and English-only order tokens', () => {
  globalThis.VocabularyAdventureCore = {
    adventureWordKey(value) { return String(value || '').trim().toLowerCase(); },
    deterministicAdventureShuffle(values) { return [...values].reverse(); }
  };
  const question = vocabularyUx.transformSentenceOrder({
    ok: true,
    questionType: 'sentenceOrder',
    prompt: '尾巴',
    sourceText: 'The dog wagged its tail happily. / 那只狗高兴地摇着它的尾巴。',
    seed: 'demo'
  }, {
    planItem: { wordKey: 'tail' },
    allCards: [{ key: 'tail', word: 'tail', card: { word: 'tail' } }]
  });

  assert.equal(question.prompt, '那只狗高兴地摇着它的尾巴。');
  assert.equal(question.tokens.some(token => /[\u3400-\u9fff]/.test(token.label)), false);
  assert.equal(question.tokens.find(token => token.label === 'tail')?.id.startsWith('focus:'), true);
  const byId = new Map(question.tokens.map(token => [token.id, token.label]));
  assert.deepEqual(question.answer.map(id => byId.get(id)), ['The', 'dog', 'wagged', 'its', 'tail', 'happily.']);
});

test('encoded missing-letter cues decode even when surrounded by whitespace', () => {
  const payload = { meaning: '尾巴', maskedWord: 't_il', emoji: '🐕' };
  const encoded = `  __VOCAB_MISSING__:${encodeURIComponent(JSON.stringify(payload))}  `;
  assert.deepEqual(vocabularyUx.decodeCue(encoded), { kind: 'missing', value: payload });
});

test('reward-state ranking prevents pending and claimed cards from regressing to idle', () => {
  assert.equal(homeStability.rank({ state: 'idle', completed: false }), 0);
  assert.equal(homeStability.rank({ state: 'idle', completed: true }), 1);
  assert.equal(homeStability.rank({ state: 'pending', completed: true }), 2);
  assert.equal(homeStability.rank({ state: 'claimed', completed: true }), 3);
});
