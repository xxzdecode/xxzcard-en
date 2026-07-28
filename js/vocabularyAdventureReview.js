(function vocabularyAdventureReviewModule(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./vocabularyAdventureCore.js')
    : root.VocabularyAdventureCore;
  const exported = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root && typeof module !== 'object') root.VocabularyAdventureReview = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyAdventureReview(core) {
  'use strict';

  const BASIC_TYPES = Object.freeze(['visualMatch', 'wordToMeaning', 'meaningToWord', 'audioToWord']);
  const FORM_TYPES = Object.freeze(['phoneticToWord', 'missingLetters', 'letterOrder', 'audioSpelling']);
  const USAGE_TYPES = Object.freeze(['collocationCloze', 'exampleCloze', 'sentenceOrder']);
  const ALL_TYPES = Object.freeze([...BASIC_TYPES, ...FORM_TYPES, ...USAGE_TYPES]);

  function normalizeText(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function normalizedAnswer(value) {
    return normalizeText(value).toLocaleLowerCase().replace(/[’']/g, "'");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function reviewReasonFromState(planItem, wordState, sessionDate) {
    if (planItem && planItem.reviewReason) return planItem.reviewReason;
    const state = wordState || {};
    if (state.challengeFlagAt) return 'challenge';
    if (state.lastResult === 'F') return 'failed';
    if (state.lastResult === 'H') return 'hinted';
    if (state.nextReviewAt && sessionDate) {
      const due = new Date(`${state.nextReviewAt}T00:00:00`);
      const session = new Date(`${sessionDate}T00:00:00`);
      const overdueDays = Math.floor((session - due) / 86400000);
      if (overdueDays >= 2) return 'severeOverdue';
      if (overdueDays >= 0) return 'due';
    }
    return 'stable';
  }

  function reviewSeed(context, reason, taskType) {
    const session = context.session || {};
    const item = context.planItem || {};
    return [
      session.date || '',
      context.userKey || '',
      core.adventureWordKey(item.wordKey),
      Number.isInteger(context.planIndex) ? context.planIndex : session.cursor || 0,
      'review',
      reason || '',
      taskType || ''
    ].join('|');
  }

  function targetCandidate(context) {
    const key = core.adventureWordKey(context.planItem && context.planItem.wordKey);
    return (Array.isArray(context.allCards) ? context.allCards : [])
      .find(candidate => candidate && candidate.key === key) || null;
  }

  function uniqueCandidates(context) {
    const seen = new Set();
    return (Array.isArray(context.allCards) ? context.allCards : []).filter(candidate => {
      const key = core.adventureWordKey(candidate && candidate.key);
      if (!key || seen.has(key) || !candidate.card) return false;
      seen.add(key);
      return true;
    });
  }

  function mapCoreChoiceQuestion(question, category) {
    if (!question || !question.ok) return question;
    return {
      ...question,
      interaction: 'choice',
      questionType: question.taskType,
      category,
      requiresUsageConfirmation: false
    };
  }

  function buildBasicChoice(context, taskType, seed) {
    return mapCoreChoiceQuestion(core.buildVocabularyAdventureQuestion({
      candidates: uniqueCandidates(context),
      sessionDate: context.session && context.session.date,
      wordKey: context.planItem && context.planItem.wordKey,
      planIndex: context.planIndex,
      taskType,
      lastTaskType: context.wordState && context.wordState.lastTaskType,
      seed
    }), 'basic');
  }

  function makeEnglishOptions(context, taskType, prompt) {
    const target = targetCandidate(context);
    if (!target) return null;
    const seed = reviewSeed(context, context.reason, taskType);
    const distractors = core.deterministicAdventureShuffle(
      uniqueCandidates(context).filter(candidate => candidate.key !== target.key),
      `${seed}|english-options`,
      candidate => candidate.key
    ).slice(0, 3);
    const options = core.deterministicAdventureShuffle(
      [target, ...distractors].map(candidate => ({
        key: candidate.key,
        label: normalizeText(candidate.word || candidate.card.word),
        correct: candidate.key === target.key
      })),
      `${seed}|option-order`,
      option => option.key
    );
    if (options.length < 2) return null;
    return {
      ok: true,
      interaction: 'choice',
      questionType: taskType,
      category: 'form',
      prompt,
      wordKey: target.key,
      correctIndex: options.findIndex(option => option.correct),
      options,
      seed,
      requiresUsageConfirmation: false
    };
  }

  function deterministicMissingPart(word, seed) {
    const letters = [...normalizeText(word)];
    const eligible = letters.map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
    if (eligible.length < 2) return null;
    const count = eligible.length >= 5 && core.stableAdventureHash(`${seed}|count`) % 2 === 0 ? 2 : 1;
    const chosen = core.deterministicAdventureShuffle(eligible, `${seed}|positions`).slice(0, count);
    const chosenSet = new Set(chosen);
    return {
      answer: chosen.sort((a, b) => a - b).map(index => letters[index]).join(''),
      masked: letters.map((letter, index) => chosenSet.has(index) ? '_' : letter).join(''),
      positions: [...chosen].sort((a, b) => a - b)
    };
  }

  function getCollocations(card, word) {
    return (Array.isArray(card && card.collocations) ? card.collocations : []).map((entry, index) => {
      if (typeof entry === 'string') return { phrase: normalizeText(entry), example: '', sourceIndex: index };
      return {
        phrase: normalizeText(entry && (entry.phrase || entry.collocation || '')),
        example: normalizeText(entry && entry.example),
        sourceIndex: index
      };
    }).filter(entry => entry.phrase || entry.example).map(entry => ({
      ...entry,
      phraseSpan: entry.phrase.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i')),
      exampleSpan: entry.example.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'))
    }));
  }

  function clozeText(text, word) {
    const expression = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return expression.test(text) ? text.replace(expression, '_____') : '';
  }

  function buildVisualMatch(context, taskType) {
    const target = targetCandidate(context);
    if (!target) return null;
    const candidates = core.deterministicAdventureShuffle(
      uniqueCandidates(context).filter(candidate => candidate.key !== target.key),
      `${reviewSeed(context, context.reason, taskType)}|pairs`,
      candidate => candidate.key
    ).slice(0, 3);
    const pairCandidates = [target, ...candidates];
    if (pairCandidates.length < 2) return null;
    const visualByWord = context.visualByWord && typeof context.visualByWord === 'object'
      ? context.visualByWord
      : {};
    const pairs = pairCandidates.map(candidate => {
      const mappedVisual = normalizeText(visualByWord[candidate.key]);
      const emoji = normalizeText(candidate.card.emoji);
      return {
        key: candidate.key,
        word: normalizeText(candidate.word || candidate.card.word),
        visual: mappedVisual || emoji || normalizeText(candidate.card.meaning),
        visualKind: mappedVisual ? 'visual' : emoji ? 'emoji' : 'meaning',
        target: candidate.key === target.key
      };
    });
    const cards = core.deterministicAdventureShuffle(
      pairs.flatMap(pair => ([
        { id: `${pair.key}:visual`, pairKey: pair.key, side: 'visual', label: pair.visual, kind: pair.visualKind },
        { id: `${pair.key}:word`, pairKey: pair.key, side: 'word', label: pair.word, kind: 'word' }
      ])),
      `${reviewSeed(context, context.reason, taskType)}|board`,
      card => card.id
    );
    return {
      ok: true,
      interaction: 'match',
      questionType: taskType,
      category: 'basic',
      wordKey: target.key,
      pairs,
      cards,
      seed: reviewSeed(context, context.reason, taskType),
      requiresUsageConfirmation: false
    };
  }

  function buildInputQuestion(context, taskType) {
    const target = targetCandidate(context);
    if (!target) return null;
    const word = normalizeText(target.word || target.card.word);
    const seed = reviewSeed(context, context.reason, taskType);
    if (taskType === 'missingLetters') {
      const missing = deterministicMissingPart(word, seed);
      if (!missing) return null;
      return {
        ok: true,
        interaction: 'input',
        questionType: taskType,
        category: 'form',
        wordKey: target.key,
        prompt: missing.masked,
        answer: missing.answer,
        fullAnswer: word,
        seed,
        requiresUsageConfirmation: false
      };
    }
    if (taskType === 'audioSpelling') {
      if (!/[a-z]/i.test(word)) return null;
      return {
        ok: true,
        interaction: 'input',
        questionType: taskType,
        category: 'form',
        wordKey: target.key,
        prompt: '',
        answer: word,
        fullAnswer: word,
        seed,
        requiresUsageConfirmation: false
      };
    }
    return null;
  }

  function buildLetterOrder(context, taskType) {
    const target = targetCandidate(context);
    if (!target) return null;
    const word = normalizeText(target.word || target.card.word);
    const letters = [...word].map((label, index) => ({ id: `${index}:${label}`, label, sourceIndex: index }));
    if (letters.length < 2) return null;
    let shuffled = core.deterministicAdventureShuffle(letters, `${reviewSeed(context, context.reason, taskType)}|letters`, item => item.id);
    if (shuffled.every((item, index) => item.sourceIndex === index)) shuffled = [...shuffled.slice(1), shuffled[0]];
    return {
      ok: true,
      interaction: 'order',
      questionType: taskType,
      category: 'form',
      wordKey: target.key,
      prompt: normalizeText(target.card.meaning),
      tokens: shuffled,
      answer: letters.map(item => item.id),
      seed: reviewSeed(context, context.reason, taskType),
      requiresUsageConfirmation: false
    };
  }

  function buildUsageQuestion(context, taskType) {
    const target = targetCandidate(context);
    if (!target) return null;
    const word = normalizeText(target.word || target.card.word);
    const items = getCollocations(target.card, word);
    const seed = reviewSeed(context, context.reason, taskType);
    const selected = core.deterministicAdventureShuffle(items, `${seed}|source`, item => item.sourceIndex)[0];
    if (!selected) return null;

    if (taskType === 'collocationCloze') {
      const source = selected.phraseSpan ? selected.phrase : '';
      const prompt = clozeText(source, word);
      if (!prompt) return null;
      const base = makeEnglishOptions(context, taskType, prompt);
      if (!base) return null;
      return {
        ...base,
        category: 'usage',
        questionType: taskType,
        requiresUsageConfirmation: true,
        sourceText: source
      };
    }
    if (taskType === 'exampleCloze') {
      const source = selected.exampleSpan ? selected.example : '';
      const prompt = clozeText(source, word);
      if (!prompt) return null;
      const base = makeEnglishOptions(context, taskType, prompt);
      if (!base) return null;
      return {
        ...base,
        category: 'usage',
        questionType: taskType,
        requiresUsageConfirmation: true,
        sourceText: source
      };
    }
    if (taskType === 'sentenceOrder') {
      const sentence = selected.example;
      const words = sentence.split(/\s+/).filter(Boolean);
      if (words.length < 3) return null;
      const tokens = words.map((label, index) => ({ id: `${index}:${label}`, label, sourceIndex: index }));
      let shuffled = core.deterministicAdventureShuffle(tokens, `${seed}|sentence`, token => token.id);
      if (shuffled.every((token, index) => token.sourceIndex === index)) shuffled = [...shuffled.slice(1), shuffled[0]];
      return {
        ok: true,
        interaction: 'order',
        questionType: taskType,
        category: 'usage',
        wordKey: target.key,
        prompt: normalizeText(target.card.meaning),
        tokens: shuffled,
        answer: tokens.map(token => token.id),
        seed,
        requiresUsageConfirmation: true,
        sourceText: sentence
      };
    }
    return null;
  }

  const VocabularyAdventureReviewTypes = Object.freeze({
    visualMatch: {
      id: 'visualMatch',
      category: 'basic',
      build: context => buildVisualMatch(context, 'visualMatch')
    },
    wordToMeaning: {
      id: 'wordToMeaning',
      category: 'basic',
      build: context => buildBasicChoice(context, 'wordToMeaning')
    },
    meaningToWord: {
      id: 'meaningToWord',
      category: 'basic',
      build: context => buildBasicChoice(context, 'meaningToWord')
    },
    audioToWord: {
      id: 'audioToWord',
      category: 'basic',
      build: context => buildBasicChoice(context, 'audioToWord')
    },
    phoneticToWord: {
      id: 'phoneticToWord',
      category: 'form',
      build: context => {
        const target = targetCandidate(context);
        const phonetic = normalizeText(target && target.card.phonetic);
        return phonetic ? makeEnglishOptions(context, 'phoneticToWord', phonetic) : null;
      }
    },
    missingLetters: {
      id: 'missingLetters',
      category: 'form',
      build: context => buildInputQuestion(context, 'missingLetters')
    },
    letterOrder: {
      id: 'letterOrder',
      category: 'form',
      build: context => buildLetterOrder(context, 'letterOrder')
    },
    audioSpelling: {
      id: 'audioSpelling',
      category: 'form',
      build: context => buildInputQuestion(context, 'audioSpelling')
    },
    collocationCloze: {
      id: 'collocationCloze',
      category: 'usage',
      build: context => buildUsageQuestion(context, 'collocationCloze')
    },
    exampleCloze: {
      id: 'exampleCloze',
      category: 'usage',
      build: context => buildUsageQuestion(context, 'exampleCloze')
    },
    sentenceOrder: {
      id: 'sentenceOrder',
      category: 'usage',
      build: context => buildUsageQuestion(context, 'sentenceOrder')
    }
  });

  function candidatesForReason(reason) {
    if (reason === 'challenge') return [...BASIC_TYPES];
    if (reason === 'failed') {
      return ['audioToWord', 'wordToMeaning', 'meaningToWord', 'visualMatch', 'missingLetters', 'letterOrder'];
    }
    if (reason === 'hinted') {
      return ['audioToWord', 'phoneticToWord', 'missingLetters', 'letterOrder', 'wordToMeaning', 'meaningToWord', 'visualMatch', 'audioSpelling'];
    }
    if (reason === 'severeOverdue') {
      return ['wordToMeaning', 'audioToWord', 'meaningToWord', 'visualMatch', 'phoneticToWord', 'missingLetters', 'letterOrder'];
    }
    return [...ALL_TYPES];
  }

  function buildVocabularyAdventureReviewQuestion(input) {
    const context = { ...(input || {}) };
    const target = targetCandidate(context);
    const wordKey = core.adventureWordKey(context.planItem && context.planItem.wordKey);
    if (!target) {
      return { ok: false, reason: 'WORD_NOT_VISIBLE', wordKey, attemptedTypes: [] };
    }
    const reason = reviewReasonFromState(
      context.planItem,
      context.wordState,
      context.session && context.session.date
    );
    context.reason = reason;
    const allowed = candidatesForReason(reason);
    const requested = context.taskType || (context.planItem && context.planItem.taskType);
    let ordered = requested && allowed.includes(requested)
      ? [requested, ...allowed.filter(type => type !== requested)]
      : core.deterministicAdventureShuffle(
          allowed,
          `${reviewSeed(context, reason, '')}|types`,
          type => type
        );
    const lastTaskType = context.wordState && context.wordState.lastTaskType;
    if (!requested && ordered.length > 1 && ordered[0] === lastTaskType) {
      ordered = [...ordered.slice(1), ordered[0]];
    }
    const primaryType = ordered[0];
    if (primaryType) {
      const primaryCategory = VocabularyAdventureReviewTypes[primaryType].category;
      ordered = [
        primaryType,
        ...ordered.slice(1).filter(type => VocabularyAdventureReviewTypes[type].category === primaryCategory),
        ...ordered.slice(1).filter(type => VocabularyAdventureReviewTypes[type].category !== primaryCategory)
      ];
    }
    const attemptedTypes = [];
    for (const taskType of ordered) {
      attemptedTypes.push(taskType);
      const question = VocabularyAdventureReviewTypes[taskType].build(context);
      if (question && question.ok) {
        return { ...question, reason, attemptedTypes, seed: reviewSeed(context, reason, taskType) };
      }
    }
    for (const taskType of BASIC_TYPES) {
      if (attemptedTypes.includes(taskType)) continue;
      attemptedTypes.push(taskType);
      const question = VocabularyAdventureReviewTypes[taskType].build(context);
      if (question && question.ok) {
        return { ...question, reason, attemptedTypes, seed: reviewSeed(context, reason, taskType) };
      }
    }
    return { ok: false, reason: 'NO_SAFE_QUESTION', wordKey, attemptedTypes };
  }

  function buildVocabularyAdventureMeaningConfirmation(input) {
    const context = { ...(input || {}) };
    const reason = reviewReasonFromState(
      context.planItem,
      context.wordState,
      context.session && context.session.date
    );
    context.reason = reason;
    const types = core.deterministicAdventureShuffle(
      ['wordToMeaning', 'meaningToWord', 'audioToWord'],
      `${reviewSeed(context, reason, 'confirmation')}|types`,
      type => type
    );
    for (const taskType of types) {
      const question = buildBasicChoice(context, taskType);
      if (question && question.ok) {
        return {
          ...question,
          confirmation: true,
          reason,
          seed: reviewSeed(context, reason, `confirmation:${taskType}`)
        };
      }
    }
    return {
      ok: false,
      reason: 'NO_SAFE_CONFIRMATION',
      wordKey: core.adventureWordKey(context.planItem && context.planItem.wordKey),
      attemptedTypes: types
    };
  }

  function gradeVocabularyAdventureReviewQuestion(question, answer) {
    if (!question || !question.ok) return false;
    if (question.interaction === 'choice') return Number(answer) === question.correctIndex;
    if (question.interaction === 'input') return normalizedAnswer(answer) === normalizedAnswer(question.answer);
    if (question.interaction === 'order') {
      const values = Array.isArray(answer) ? answer : [];
      return values.length === question.answer.length
        && values.every((value, index) => value === question.answer[index]);
    }
    return false;
  }

  function visualMatchOutcome(errorCount) {
    const errors = Math.max(0, Number(errorCount) || 0);
    if (errors === 0) return { result: 'D', requiresConfirmation: false };
    if (errors === 1) return { result: 'H', requiresConfirmation: false };
    return { result: '', requiresConfirmation: true };
  }

  return Object.freeze({
    BASIC_TYPES,
    FORM_TYPES,
    USAGE_TYPES,
    ALL_TYPES,
    VocabularyAdventureReviewTypes,
    reviewReasonFromState,
    buildVocabularyAdventureReviewQuestion,
    buildVocabularyAdventureMeaningConfirmation,
    gradeVocabularyAdventureReviewQuestion,
    visualMatchOutcome,
    deterministicMissingPart
  });
});
