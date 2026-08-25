(function grammarPagePracticeCoreModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GrammarPagePracticeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGrammarPagePracticeCore() {
  'use strict';

  function createInteractionState() {
    return {
      selected: [],
      assignments: {},
      activeOption: null,
      locked: false,
      judging: false
    };
  }

  function isFrozen(interaction, solved) {
    return Boolean(solved || interaction.locked || interaction.judging);
  }

  function validOptionIndex(question, index) {
    return Number.isInteger(index)
      && index >= 0
      && Array.isArray(question && question.options)
      && index < question.options.length;
  }

  function selectOption(question, interaction, index, solved) {
    if (!question || !interaction || isFrozen(interaction, solved) || !validOptionIndex(question, index)) {
      return false;
    }

    if (question.type === 'classify') {
      interaction.activeOption = index;
      return true;
    }

    if (question.type === 'multi') {
      interaction.selected = interaction.selected.includes(index)
        ? interaction.selected.filter(item => item !== index)
        : [...interaction.selected, index];
      return true;
    }

    if (question.type === 'order') {
      interaction.selected = interaction.selected.includes(index)
        ? interaction.selected.filter(item => item !== index)
        : [...interaction.selected, index];
      return true;
    }

    interaction.selected = [index];
    return true;
  }

  function assignActiveOption(question, interaction, target, solved) {
    if (!question || question.type !== 'classify' || !interaction || isFrozen(interaction, solved)) return false;
    if (!Array.isArray(question.targets) || !question.targets.includes(target)) return false;
    if (!validOptionIndex(question, interaction.activeOption)) return false;

    const option = question.options[interaction.activeOption];
    interaction.assignments[option] = target;
    interaction.activeOption = null;
    return true;
  }

  function canSubmit(question, interaction) {
    if (!question || !interaction || !Array.isArray(question.options)) return false;

    if (question.type === 'classify') {
      return question.options.length > 0
        && question.options.every(option => {
          const target = interaction.assignments[option];
          return Boolean(target) && (!Array.isArray(question.targets) || question.targets.includes(target));
        });
    }

    if (question.type === 'order') {
      return interaction.selected.length === question.options.length
        && new Set(interaction.selected).size === question.options.length;
    }

    if (question.type === 'multi') return interaction.selected.length > 0;
    return interaction.selected.length === 1;
  }

  function beginSubmit(question, interaction, solved) {
    if (!interaction || isFrozen(interaction, solved) || !canSubmit(question, interaction)) return false;
    interaction.judging = true;
    interaction.locked = true;
    return true;
  }

  function orderAnswerMatches(question, selectedIndices) {
    if (!question || !Array.isArray(question.options) || !Array.isArray(selectedIndices)) return false;
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
    const used = new Set();
    const expectedIndices = answers.map(value => {
      if (typeof value === 'number') return value;
      const index = question.options.findIndex((option, optionIndex) => option === value && !used.has(optionIndex));
      if (index >= 0) used.add(index);
      return index;
    });
    if (selectedIndices.length !== expectedIndices.length || expectedIndices.some(index => index < 0)) return false;
    return selectedIndices.every((selectedIndex, index) => (
      validOptionIndex(question, selectedIndex)
      && String(question.options[selectedIndex]) === String(question.options[expectedIndices[index]])
    ));
  }

  return Object.freeze({
    createInteractionState,
    isFrozen,
    selectOption,
    assignActiveOption,
    canSubmit,
    beginSubmit,
    orderAnswerMatches
  });
});
