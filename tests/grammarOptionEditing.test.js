const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../grammar-challenge/js/page-practice-core.js');

function question(type, extras = {}) {
  return {
    type,
    options: ['A', 'B', 'C'],
    targets: ['left', 'right'],
    ...extras
  };
}

{
  const interaction = core.createInteractionState();
  const single = question('single');
  assert.equal(core.selectOption(single, interaction, 0, false), true);
  assert.deepEqual(interaction.selected, [0]);
  assert.equal(interaction.locked, false);
  assert.equal(core.selectOption(single, interaction, 1, false), true);
  assert.deepEqual(interaction.selected, [1]);
  assert.equal(core.canSubmit(single, interaction), true);
  assert.equal(core.beginSubmit(single, interaction, false), true);
  assert.equal(interaction.locked, true);
  assert.equal(interaction.judging, true);
  assert.equal(core.selectOption(single, interaction, 2, false), false);
  assert.deepEqual(interaction.selected, [1]);
  assert.equal(core.beginSubmit(single, interaction, false), false);
}

{
  const interaction = core.createInteractionState();
  const multi = question('multi');
  core.selectOption(multi, interaction, 0, false);
  core.selectOption(multi, interaction, 1, false);
  assert.deepEqual(interaction.selected, [0, 1]);
  core.selectOption(multi, interaction, 0, false);
  assert.deepEqual(interaction.selected, [1]);
  assert.equal(interaction.locked, false);
  assert.equal(core.canSubmit(multi, interaction), true);
}

{
  const interaction = core.createInteractionState();
  const order = question('order');
  core.selectOption(order, interaction, 2, false);
  core.selectOption(order, interaction, 0, false);
  assert.equal(core.canSubmit(order, interaction), false);
  core.selectOption(order, interaction, 2, false);
  core.selectOption(order, interaction, 1, false);
  core.selectOption(order, interaction, 2, false);
  assert.deepEqual(interaction.selected, [0, 1, 2]);
  assert.equal(core.canSubmit(order, interaction), true);
}

{
  const repeatedTokenOrder = question('order', {
    options: ['but', 'plays', 'football', 'the piano', 'her brother', 'She', 'plays', ',', '.'],
    answer: ['She', 'plays', 'the piano', ',', 'but', 'her brother', 'plays', 'football', '.']
  });
  assert.equal(
    core.orderAnswerMatches(repeatedTokenOrder, [5, 6, 3, 7, 0, 4, 1, 2, 8]),
    true,
    'visually identical repeated word blocks must be interchangeable'
  );
  assert.equal(core.orderAnswerMatches(repeatedTokenOrder, [5, 6, 3, 7, 0, 4, 2, 1, 8]), false);
}

{
  const interaction = core.createInteractionState();
  const classify = question('classify');
  core.selectOption(classify, interaction, 0, false);
  core.assignActiveOption(classify, interaction, 'left', false);
  core.selectOption(classify, interaction, 0, false);
  core.assignActiveOption(classify, interaction, 'right', false);
  assert.equal(interaction.assignments.A, 'right');
  core.selectOption(classify, interaction, 1, false);
  core.assignActiveOption(classify, interaction, 'left', false);
  assert.equal(core.canSubmit(classify, interaction), false);
  core.selectOption(classify, interaction, 2, false);
  core.assignActiveOption(classify, interaction, 'right', false);
  assert.equal(core.canSubmit(classify, interaction), true);
  assert.equal(core.beginSubmit(classify, interaction, false), true);
  assert.equal(core.assignActiveOption(classify, interaction, 'left', false), false);
}

const root = path.resolve(__dirname, '..');
const catalog = fs.readFileSync(path.join(root, 'grammar-challenge/data/catalog.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'grammar-challenge/index.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'grammar-challenge/js/page-practice-shell.js'), 'utf8');
const pagePaths = [...catalog.matchAll(/pagePath:\s*'([^']+)'/g)].map(match => match[1]);

assert.ok(pagePaths.length >= 12, 'all formal page challenges remain catalogued');
assert.match(index, /page-practice-core\.js/);
assert.match(index, /page-practice-shell\.js/);
assert.match(index, /interactionMode !== 'challenge-locked'/);
assert.match(index, /window\.__GRAMMAR_PAGE_PRACTICE_CONFIG__/);

const directDates = ['2026-07-31', '2026-08-01'];
directDates.forEach(date => {
  const page = fs.readFileSync(path.join(root, `grammar-challenge/practices/${date}.html`), 'utf8');
  const data = fs.readFileSync(path.join(root, `grammar-challenge/data/page-practices/${date}.js`), 'utf8');
  assert.match(page, new RegExp(`data/page-practices/${date}\\.js`), `${date} direct page loads its formal data`);
  assert.match(page, /page-practice-core\.js/, `${date} direct page loads the shared interaction core`);
  assert.match(page, /page-practice-shell\.js/, `${date} direct page loads the shared runtime`);
  assert.doesNotMatch(page, /state\.locked\s*=\s*true/, `${date} direct page no longer contains the old first-click lock`);
  assert.match(data, /interactionMode["']?\s*:\s*["']challenge-locked["']/, `${date} formal data remains challenge-locked`);
  assert.match(data, /"questions"\s*:\s*\[/, `${date} retains formal questions`);
});

const formalConfigs = fs.readdirSync(path.join(root, 'grammar-challenge/data/page-practices'))
  .filter(name => name.endsWith('.js'));
formalConfigs.forEach(name => {
  const date = name.replace(/\.js$/, '');
  const data = fs.readFileSync(path.join(root, 'grammar-challenge/data/page-practices', name), 'utf8');
  if (!/challenge-locked/.test(data)) return;
  const pagePath = path.join(root, 'grammar-challenge/practices', `${date}.html`);
  assert.equal(fs.existsSync(pagePath), true, `${name} has a formal direct page`);
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /page-practice-shell\.js/, `${name} direct page uses shared runtime`);
});

assert.match(shell, /core\.beginSubmit/);
assert.match(shell, /armRecordCapture\(\)/);
assert.match(shell, /removePracticeData\(true\)/);
assert.match(shell, /selected:\s*\[\.\.\.state\.interaction\.selected\]/);
assert.match(shell, /assignments:\s*\{\s*\.\.\.state\.interaction\.assignments\s*\}/);
assert.match(shell, /锁定、判分和最终界面状态完成后/);
assert.doesNotMatch(shell, /setTimeout\(installPracticeData/);

console.log('grammar option editing tests passed');
