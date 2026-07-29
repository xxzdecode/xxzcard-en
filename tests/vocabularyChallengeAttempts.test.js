const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStorage(records) {
  const values = new Map(Object.entries(records));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] || null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

async function main() {
  const today = '2026-07-29';
  const dailyByUser = {
    sister: {
      [today]: {
        todayChallenge: { attempts: 1, bestScore: 70, checkedIn: true },
        mixedChallenge: {}
      }
    },
    brother: { [today]: {} }
  };
  const adventureByUser = {
    sister: { challengeDaily: { date: today, attempts: 1, bestScore: 80 } },
    brother: { challengeDaily: { date: today, attempts: 0, bestScore: 0 } }
  };
  const context = vm.createContext({
    console,
    currentUser: 'sister',
    localStorage: createStorage({
      [`wc_batch_challenge_v1_sister_${today}_batchChallenge_101`]:
        JSON.stringify({ attempts: 1, bestScore: 90, checkedIn: true }),
      [`wc_batch_challenge_v1_sister_2026-07-28_batchChallenge_101`]:
        JSON.stringify({ attempts: 2, bestScore: 100, checkedIn: true }),
      [`wc_batch_challenge_v1_brother_${today}_batchChallenge_101`]:
        JSON.stringify({ attempts: 2, bestScore: 100, checkedIn: true })
    }),
    sbGet: async key => dailyByUser[key.replace('daily_task_', '')] || {},
    loadVocabularyAdventureState: async user => adventureByUser[user] || {},
    VocabularyAdventureChallenge: {
      normalizeChallengeDaily(value, date) {
        return value && value.date === date
          ? value
          : { date, attempts: 0, bestScore: 0 };
      }
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'tasks.js'), 'utf8');
  vm.runInContext(source, context);

  const legacy = await vm.runInContext('getVocabularyAdventureLegacyChallengeUsage()', context);
  assert.deepEqual(
    { attempts: legacy.attempts, bestScore: legacy.bestScore },
    { attempts: 2, bestScore: 90 },
    'today, mixed and all current-user current-day batch challenges share legacy usage'
  );

  const shared = await vm.runInContext('getSharedVocabularyChallengeUsage()', context);
  assert.deepEqual(
    { attempts: shared.attempts, bestScore: shared.bestScore },
    { attempts: 3, bestScore: 90 },
    'the unified adventure challenge shares the same aggregate with every legacy entry'
  );
  assert.equal(await vm.runInContext("canStartChallenge('todayChallenge')", context), false);
  assert.equal(await vm.runInContext("canStartChallenge('mixedChallenge')", context), false);
  assert.equal(await vm.runInContext("canStartChallenge('batchChallenge_202')", context), false);
  assert.equal(
    (await vm.runInContext("challengeStatus('batchChallenge_202')", context)).state,
    'locked'
  );

  vm.runInContext("currentUser = 'brother'", context);
  adventureByUser.brother.challengeDaily.attempts = 0;
  assert.equal(
    await vm.runInContext("canStartChallenge('batchChallenge_202')", context),
    false,
    'the current child sees only that child’s two recorded attempts'
  );

  vm.runInContext("currentUser = 'newChild'", context);
  assert.equal(
    await vm.runInContext("canStartChallenge('batchChallenge_202')", context),
    true,
    'another child without attempts keeps an independent allowance'
  );

  console.log('vocabulary challenge shared-attempt tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
