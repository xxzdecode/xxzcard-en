(function vocabularyQuestionTypesRepeatBootstrap(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VocabularyQuestionTypesRepeatPatch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPatchApi(root) {
  'use strict';

  const SCREENING_TYPES = Object.freeze(['wordToMeaning', 'audioToMeaning', 'meaningToWord']);
  const ADVENTURE_BASIC_TYPES = Object.freeze([
    'visualMatch',
    'wordToMeaning',
    'meaningToWord',
    'audioToMeaning'
  ]);
  const ADVENTURE_FORM_TYPES = Object.freeze([
    'phoneticToMeaning',
    'missingLetters',
    'letterOrder',
    'audioSpelling'
  ]);
  const USAGE_TYPES = Object.freeze(['collocationCloze', 'exampleCloze', 'sentenceOrder']);
  const FEATURE_PROMPT_PREFIX = '__VOCAB_CUE__:';
  const MISSING_PROMPT_PREFIX = '__VOCAB_MISSING__:';
  const featurePromises = new Map();
  let basePromise = null;
  let installed = null;
  let capturedChallengeState = null;

  function text(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueCandidates(values, core) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).filter(candidate => {
      const key = core.adventureWordKey(candidate && (candidate.key || candidate.word));
      if (!key || seen.has(key) || !candidate.card) return false;
      seen.add(key);
      return true;
    }).map(candidate => ({
      ...candidate,
      key: core.adventureWordKey(candidate.key || candidate.word)
    }));
  }

  function encodeCue(prefix, value) {
    return `${prefix}${encodeURIComponent(JSON.stringify(value))}`;
  }

  function cardImage(card) {
    const source = card && typeof card === 'object' ? card : {};
    return text(
      source.image
      || source.imageUrl
      || source.imageURL
      || source.imagePath
      || source.imageSrc
      || source.picture
      || source.visual
      || ''
    );
  }

  function optionSignature(question) {
    if (!question || typeof question !== 'object') return '';
    if (question.interaction === 'choice') {
      return (Array.isArray(question.options) ? question.options : [])
        .map(option => text(option && option.label))
        .join('\u241f');
    }
    if (question.interaction === 'order') {
      return (Array.isArray(question.tokens) ? question.tokens : [])
        .map(token => text(token && token.label))
        .join('\u241f');
    }
    return text(question.prompt);
  }

  function questionFingerprint(wordKey, taskType, question) {
    return [
      text(wordKey).toLocaleLowerCase(),
      text(taskType || (question && (question.questionType || question.taskType))),
      text(question && question.prompt),
      optionSignature(question)
    ].join('|');
  }

  function challengeHistoryByWord(stateValue) {
    const state = stateValue && typeof stateValue === 'object' ? stateValue : {};
    const session = state.challengeSession && Array.isArray(state.challengeSession.items)
      ? state.challengeSession
      : null;
    const history = new Map();
    if (!session || Number(session.attemptIndex) !== 1) return history;
    session.items.forEach(item => {
      const key = text(item && item.wordKey).toLocaleLowerCase();
      if (!key) return;
      if (!history.has(key)) history.set(key, []);
      history.get(key).push(item);
    });
    return history;
  }

  function previousItemsByWord() {
    return challengeHistoryByWord(capturedChallengeState);
  }

  function roundRobin(values, identity) {
    const groups = new Map();
    values.forEach(value => {
      const key = identity(value);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(value);
    });
    if (groups.size === values.length) return values;
    const queues = [...groups.values()];
    const result = [];
    let advanced = true;
    while (advanced) {
      advanced = false;
      queues.forEach(queue => {
        if (!queue.length) return;
        result.push(queue.shift());
        advanced = true;
      });
    }
    return result;
  }

  function createPatchedCore(core) {
    const originalNormalize = core.normalizeVocabularyAdventureState.bind(core);
    const originalPrepare = core.prepareVocabularyAdventureResult.bind(core);
    const originalShuffle = core.deterministicAdventureShuffle.bind(core);

    function normalizeVocabularyAdventureState(value) {
      const state = originalNormalize(value);
      if (state && state.challengeSession) capturedChallengeState = clone(state);
      return state;
    }

    function deterministicAdventureShuffle(values, seed, identity) {
      const getIdentity = typeof identity === 'function' ? identity : value => String(value);
      let ordered = originalShuffle(values, seed, identity);
      if (!/\|challenge\|\d+\|priority:/.test(String(seed || ''))) return ordered;

      ordered = roundRobin(ordered, value => text(getIdentity(value)).toLocaleLowerCase());
      if (!/\|challenge\|2\|priority:/.test(String(seed || ''))) return ordered;
      const previousWords = new Set(previousItemsByWord().keys());
      return [
        ...ordered.filter(value => !previousWords.has(text(getIdentity(value)).toLocaleLowerCase())),
        ...ordered.filter(value => previousWords.has(text(getIdentity(value)).toLocaleLowerCase()))
      ];
    }

    function assignVocabularyAdventureTaskType(options) {
      const settings = options && typeof options === 'object' ? options : {};
      const seed = `${settings.sessionDate || ''}|${core.adventureWordKey(settings.wordKey)}|${Number(settings.planIndex) || 0}`;
      let index = (core.stableAdventureHash(seed) + Math.max(0, Number(settings.planIndex) || 0)) % SCREENING_TYPES.length;
      if (SCREENING_TYPES[index] === settings.lastTaskType) index = (index + 1) % SCREENING_TYPES.length;
      return SCREENING_TYPES[index];
    }

    function buildVocabularyAdventureQuestion(options) {
      const settings = options && typeof options === 'object' ? options : {};
      const candidates = uniqueCandidates(settings.candidates, core);
      const wordKey = core.adventureWordKey(settings.wordKey);
      const target = candidates.find(candidate => candidate.key === wordKey);
      const taskType = text(settings.taskType) || assignVocabularyAdventureTaskType(settings);
      const supported = new Set([
        'wordToMeaning',
        'audioToMeaning',
        'phoneticToMeaning',
        'meaningToWord',
        'audioToWord',
        'phoneticToWord'
      ]);
      if (!target) return { ok: false, code: 'WORD_NOT_VISIBLE', wordKey, taskType };
      if (!supported.has(taskType)) return { ok: false, code: 'INVALID_TASK_TYPE', wordKey, taskType };

      const phonetic = text(target.card.phonetic);
      if (taskType.startsWith('phonetic') && !phonetic) {
        return { ok: false, code: 'PHONETIC_UNAVAILABLE', wordKey, taskType };
      }

      const answerMeaning = ['wordToMeaning', 'audioToMeaning', 'phoneticToMeaning'].includes(taskType);
      const seed = [
        settings.sessionDate || '',
        wordKey,
        Number(settings.planIndex) || 0,
        taskType,
        settings.seed || settings.userKey || ''
      ].join('|');
      const correctMeaning = text(target.card.meaning);
      const correctWord = text(target.word || target.card.word);
      const answer = {
        key: answerMeaning ? correctMeaning : wordKey,
        label: answerMeaning ? correctMeaning : correctWord,
        correct: true
      };
      const seen = new Set([answer.key]);
      const distractors = [];
      deterministicAdventureShuffle(candidates, `${seed}|distractors`, candidate => candidate.key)
        .forEach(candidate => {
          if (candidate.key === wordKey || distractors.length >= 3) return;
          const key = answerMeaning ? text(candidate.card.meaning) : candidate.key;
          const label = answerMeaning ? text(candidate.card.meaning) : text(candidate.word || candidate.card.word);
          if (!key || !label || seen.has(key)) return;
          seen.add(key);
          distractors.push({ key, label, correct: false });
        });
      const optionsList = deterministicAdventureShuffle(
        [answer, ...distractors],
        `${seed}|options`,
        option => `${option.key}|${option.correct ? 1 : 0}`
      );
      if (optionsList.length < 2) {
        return { ok: false, code: 'INSUFFICIENT_OPTIONS', wordKey, taskType };
      }

      let prompt = '';
      if (taskType === 'wordToMeaning') prompt = correctWord;
      if (taskType === 'meaningToWord') prompt = correctMeaning;
      if (taskType === 'phoneticToMeaning' || taskType === 'phoneticToWord') prompt = phonetic;
      if (taskType === 'audioToMeaning') {
        prompt = encodeCue(FEATURE_PROMPT_PREFIX, { taskType, meaning: correctMeaning });
      }

      const question = {
        ok: true,
        taskType,
        questionType: taskType,
        wordKey,
        seed,
        correctIndex: optionsList.findIndex(option => option.correct),
        options: optionsList,
        prompt,
        card: target.card
      };
      root.__vocabularyFeedbackQuestionContext = {
        source: 'screening',
        question: clone(question)
      };
      return question;
    }

    function prepareVocabularyAdventureResult(stateValue, submission) {
      const input = { ...(submission || {}) };
      const realTaskType = input.taskType;
      if (realTaskType === 'audioToMeaning') input.taskType = 'audioToWord';
      const next = originalPrepare(stateValue, input);
      if (realTaskType !== 'audioToMeaning') return next;
      const cursor = next.session ? next.session.cursor - 1 : -1;
      if (cursor >= 0 && next.session.plan[cursor]) next.session.plan[cursor].taskType = realTaskType;
      const key = core.adventureWordKey(submission && submission.wordKey);
      if (next.words[key]) next.words[key].lastTaskType = realTaskType;
      return next;
    }

    return Object.freeze({
      ...core,
      SCREENING_TASK_TYPES: SCREENING_TYPES,
      normalizeVocabularyAdventureState,
      deterministicAdventureShuffle,
      assignVocabularyAdventureTaskType,
      buildVocabularyAdventureQuestion,
      prepareVocabularyAdventureResult,
      getVocabularyQuestionRepeatContext: () => clone(capturedChallengeState)
    });
  }

  function deterministicMissingPart(word, seed, core) {
    const letters = [...text(word)];
    const eligible = letters
      .map((letter, index) => /[a-z]/i.test(letter) ? index : -1)
      .filter(index => index >= 0);
    if (eligible.length < 2) return null;
    const interior = eligible.filter(index => index > 0 && index < letters.length - 1);
    const pool = interior.length ? interior : eligible;
    const missingCount = eligible.length >= 7 && core.stableAdventureHash(`${seed}|count`) % 2 === 0 ? 2 : 1;
    const positions = core.deterministicAdventureShuffle(pool, `${seed}|positions`)
      .slice(0, Math.min(missingCount, pool.length))
      .sort((a, b) => a - b);
    const chosen = new Set(positions);
    return {
      answer: positions.map(index => letters[index].toLocaleLowerCase()).join(''),
      masked: letters.map((letter, index) => chosen.has(index) ? '_' : letter).join(''),
      positions
    };
  }

  function makeMissingOptions(target, missing, context, core, seed) {
    const answer = missing.answer;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const sourceLetters = new Set();
    const addLetters = value => [...text(value).toLocaleLowerCase()].forEach(letter => {
      if (/[a-z]/.test(letter)) sourceLetters.add(letter);
    });
    addLetters(target.word || target.card.word);
    (Array.isArray(context.allCards) ? context.allCards : []).forEach(candidate => {
      addLetters(candidate && (candidate.word || (candidate.card && candidate.card.word)));
    });
    [...answer].forEach(letter => {
      const index = alphabet.indexOf(letter);
      if (index >= 0) {
        sourceLetters.add(alphabet[(index + 25) % 26]);
        sourceLetters.add(alphabet[(index + 1) % 26]);
      }
    });

    const letters = core.deterministicAdventureShuffle([...sourceLetters], `${seed}|letter-pool`);
    const distractors = [];
    if (answer.length === 1) {
      letters.forEach(letter => {
        if (letter !== answer && distractors.length < 3) distractors.push(letter);
      });
    } else {
      const answerLetters = [...answer];
      letters.forEach((letter, index) => {
        if (distractors.length >= 3) return;
        const variant = [...answerLetters];
        variant[index % variant.length] = letter;
        const value = variant.join('');
        if (value !== answer && !distractors.includes(value)) distractors.push(value);
      });
      const reversed = [...answerLetters].reverse().join('');
      if (reversed !== answer && !distractors.includes(reversed) && distractors.length < 3) {
        distractors.push(reversed);
      }
    }

    let fallback = 0;
    while (distractors.length < 3 && fallback < alphabet.length) {
      const value = answer.length === 1
        ? alphabet[fallback]
        : [...answer].map((_, index) => alphabet[(fallback + index) % 26]).join('');
      if (value !== answer && !distractors.includes(value)) distractors.push(value);
      fallback += 1;
    }

    return core.deterministicAdventureShuffle(
      [answer, ...distractors.slice(0, 3)].map(value => ({
        key: value,
        label: value.toLocaleUpperCase(),
        correct: value === answer
      })),
      `${seed}|option-order`,
      option => `${option.key}|${option.correct ? 1 : 0}`
    );
  }

  function createPatchedReview(review, core) {
    const originalRegistry = review.VocabularyAdventureReviewTypes || {};
    const originalGrade = review.gradeVocabularyAdventureReviewQuestion.bind(review);

    function targetCandidate(context) {
      const key = core.adventureWordKey(context.planItem && context.planItem.wordKey);
      return uniqueCandidates(context.allCards, core).find(candidate => candidate.key === key) || null;
    }

    function basicChoice(context, taskType) {
      const question = core.buildVocabularyAdventureQuestion({
        candidates: uniqueCandidates(context.allCards, core),
        sessionDate: context.session && context.session.date,
        wordKey: context.planItem && context.planItem.wordKey,
        planIndex: context.planIndex,
        taskType,
        lastTaskType: context.wordState && context.wordState.lastTaskType,
        seed: context.userKey || ''
      });
      if (!question || !question.ok) return question;
      return {
        ...question,
        interaction: 'choice',
        questionType: taskType,
        category: taskType === 'phoneticToMeaning' ? 'form' : 'basic',
        requiresUsageConfirmation: false
      };
    }

    function missingLetters(context) {
      const target = targetCandidate(context);
      if (!target) return null;
      const targetKey = target.key;
      const word = text(target.word || target.card.word);
      const seed = [
        context.session && context.session.date || '',
        context.userKey || '',
        targetKey,
        Number(context.planIndex) || 0,
        'missingLetters'
      ].join('|');
      const missing = deterministicMissingPart(word, seed, core);
      if (!missing) return null;
      const options = makeMissingOptions(target, missing, context, core, seed);
      const cue = {
        meaning: text(target.card.meaning),
        image: cardImage(target.card),
        emoji: text(target.card.emoji),
        placeholder: '📝',
        maskedWord: missing.masked
      };
      return {
        ok: true,
        interaction: 'choice',
        questionType: 'missingLetters',
        category: 'form',
        wordKey: targetKey,
        prompt: encodeCue(MISSING_PROMPT_PREFIX, cue),
        maskedWord: missing.masked,
        missingPositions: missing.positions,
        missingCount: missing.positions.length,
        answer: missing.answer,
        fullAnswer: word,
        correctIndex: options.findIndex(option => option.correct),
        options,
        cue,
        seed,
        requiresUsageConfirmation: false
      };
    }

    function isSecondAttempt(context) {
      return /\|attempt:2(?:\||$)/.test(String(context && context.userKey || ''));
    }

    function previousItems(context) {
      if (!isSecondAttempt(context)) return [];
      const state = core.getVocabularyQuestionRepeatContext && core.getVocabularyQuestionRepeatContext();
      const key = core.adventureWordKey(context.planItem && context.planItem.wordKey);
      return challengeHistoryByWord(state).get(key) || [];
    }

    function guardRepeat(context, taskType, builder) {
      const history = previousItems(context);
      if (history.some(item => item && item.taskType === taskType)) return null;
      const question = builder();
      if (!question || !question.ok || !history.length) return question;
      const fingerprint = questionFingerprint(
        context.planItem && context.planItem.wordKey,
        taskType,
        question
      );
      return history.some(item => (
        questionFingerprint(item.wordKey, item.taskType, item.question) === fingerprint
      )) ? null : question;
    }

    const registry = {};
    Object.entries(originalRegistry).forEach(([taskType, definition]) => {
      registry[taskType] = {
        ...definition,
        build: context => guardRepeat(context, taskType, () => {
          if (taskType === 'missingLetters') return missingLetters(context);
          return definition.build(context);
        })
      };
    });
    registry.audioToMeaning = {
      id: 'audioToMeaning',
      category: 'basic',
      build: context => guardRepeat(context, 'audioToMeaning', () => basicChoice(context, 'audioToMeaning'))
    };
    registry.phoneticToMeaning = {
      id: 'phoneticToMeaning',
      category: 'form',
      build: context => guardRepeat(context, 'phoneticToMeaning', () => basicChoice(context, 'phoneticToMeaning'))
    };
    registry.missingLetters = {
      id: 'missingLetters',
      category: 'form',
      build: context => guardRepeat(context, 'missingLetters', () => missingLetters(context))
    };

    function candidatesForReason(reason) {
      if (reason === 'challenge') return [...ADVENTURE_BASIC_TYPES];
      if (reason === 'failed') {
        return ['audioToMeaning', 'wordToMeaning', 'meaningToWord', 'visualMatch', 'missingLetters', 'letterOrder'];
      }
      if (reason === 'hinted') {
        return ['audioToMeaning', 'phoneticToMeaning', 'missingLetters', 'letterOrder', 'wordToMeaning', 'meaningToWord', 'visualMatch', 'audioSpelling'];
      }
      if (reason === 'severeOverdue') {
        return ['wordToMeaning', 'audioToMeaning', 'meaningToWord', 'visualMatch', 'phoneticToMeaning', 'missingLetters', 'letterOrder'];
      }
      return [...ADVENTURE_BASIC_TYPES, ...ADVENTURE_FORM_TYPES, ...USAGE_TYPES];
    }

    function buildVocabularyAdventureReviewQuestion(input) {
      const context = { ...(input || {}) };
      const wordKey = core.adventureWordKey(context.planItem && context.planItem.wordKey);
      if (!targetCandidate(context)) {
        return { ok: false, reason: 'WORD_NOT_VISIBLE', wordKey, attemptedTypes: [] };
      }
      const reason = review.reviewReasonFromState(
        context.planItem,
        context.wordState,
        context.session && context.session.date
      );
      context.reason = reason;
      const allowed = candidatesForReason(reason);
      const requested = text(context.taskType || (context.planItem && context.planItem.taskType));
      let ordered = requested && allowed.includes(requested)
        ? [requested, ...allowed.filter(type => type !== requested)]
        : core.deterministicAdventureShuffle(
            allowed,
            `${context.session && context.session.date || ''}|${context.userKey || ''}|${wordKey}|${context.planIndex || 0}|review|${reason}|types`,
            type => type
          );
      const lastTaskType = context.wordState && context.wordState.lastTaskType;
      if (!requested && ordered.length > 1 && ordered[0] === lastTaskType) {
        ordered = [...ordered.slice(1), ordered[0]];
      }
      const attemptedTypes = [];
      for (const taskType of ordered) {
        attemptedTypes.push(taskType);
        const definition = registry[taskType];
        const question = definition && definition.build(context);
        if (question && question.ok) return { ...question, reason, attemptedTypes };
      }
      for (const taskType of ADVENTURE_BASIC_TYPES) {
        if (attemptedTypes.includes(taskType)) continue;
        attemptedTypes.push(taskType);
        const definition = registry[taskType];
        const question = definition && definition.build(context);
        if (question && question.ok) return { ...question, reason, attemptedTypes };
      }
      return { ok: false, reason: 'NO_SAFE_QUESTION', wordKey, attemptedTypes };
    }

    function buildVocabularyAdventureMeaningConfirmation(input) {
      const context = { ...(input || {}) };
      const reason = review.reviewReasonFromState(
        context.planItem,
        context.wordState,
        context.session && context.session.date
      );
      context.reason = reason;
      const types = core.deterministicAdventureShuffle(
        ['wordToMeaning', 'meaningToWord', 'audioToMeaning'],
        `${context.session && context.session.date || ''}|${context.userKey || ''}|${context.planItem && context.planItem.wordKey || ''}|confirmation`,
        type => type
      );
      for (const taskType of types) {
        const question = registry[taskType].build(context);
        if (question && question.ok) return { ...question, confirmation: true, reason };
      }
      return {
        ok: false,
        reason: 'NO_SAFE_CONFIRMATION',
        wordKey: core.adventureWordKey(context.planItem && context.planItem.wordKey),
        attemptedTypes: types
      };
    }

    function gradeVocabularyAdventureReviewQuestion(question, answer) {
      const correct = originalGrade(question, answer);
      root.__vocabularyFeedbackGradeContext = {
        question: clone(question),
        answer: clone(answer),
        correct,
        gradedAt: new Date().toISOString()
      };
      return correct;
    }

    return Object.freeze({
      ...review,
      BASIC_TYPES: ADVENTURE_BASIC_TYPES,
      FORM_TYPES: ADVENTURE_FORM_TYPES,
      ALL_TYPES: Object.freeze([...ADVENTURE_BASIC_TYPES, ...ADVENTURE_FORM_TYPES, ...USAGE_TYPES]),
      VocabularyAdventureReviewTypes: Object.freeze(registry),
      buildVocabularyAdventureReviewQuestion,
      buildVocabularyAdventureMeaningConfirmation,
      gradeVocabularyAdventureReviewQuestion,
      deterministicMissingPart: (word, seed) => deterministicMissingPart(word, seed, core)
    });
  }

  function expandChallengeCandidates(candidates, limit) {
    const source = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
    const target = Math.max(1, Number(limit) || 10);
    if (!source.length || source.length >= target) return source;
    const result = [];
    for (let index = 0; index < target; index += 1) {
      result.push({
        ...source[index % source.length],
        __challengeRepeatCopy: Math.floor(index / source.length)
      });
    }
    return result;
  }

  function install(core, review) {
    if (!core || !review) throw new Error('Vocabulary adventure core and review are required');
    const patchedCore = createPatchedCore(core);
    const patchedReview = createPatchedReview(review, patchedCore);
    return { core: patchedCore, review: patchedReview };
  }

  function installBrowserPatches() {
    if (installed && root.VocabularyAdventureCore === installed.core) return installed;
    if (!root.VocabularyAdventureCore || !root.VocabularyAdventureReview) {
      throw new Error('Vocabulary adventure modules are not ready');
    }
    installed = install(root.VocabularyAdventureCore, root.VocabularyAdventureReview);
    root.VocabularyAdventureCore = installed.core;
    root.VocabularyAdventureReview = installed.review;

    if (typeof root.collectVisibleVocabularyAdventureCandidates === 'function'
        && !root.collectVisibleVocabularyAdventureCandidates.__questionRepeatWrapped) {
      const originalCollect = root.collectVisibleVocabularyAdventureCandidates;
      const wrapped = function collectVisibleVocabularyAdventureCandidatesPatched(...args) {
        const candidates = originalCollect.apply(this, args);
        return root.__vocabularyChallengeCandidateExpansion
          ? expandChallengeCandidates(candidates, 10)
          : candidates;
      };
      wrapped.__questionRepeatWrapped = true;
      root.collectVisibleVocabularyAdventureCandidates = wrapped;
    }
    return installed;
  }

  function installChallengeBrowserWrappers() {
    if (typeof root.openVocabularyAdventureChallenge === 'function'
        && !root.openVocabularyAdventureChallenge.__questionRepeatWrapped) {
      const originalOpen = root.openVocabularyAdventureChallenge;
      const wrappedOpen = async function openVocabularyAdventureChallengePatched(...args) {
        root.__vocabularyChallengeCandidateExpansion = true;
        try {
          return await originalOpen.apply(this, args);
        } finally {
          root.__vocabularyChallengeCandidateExpansion = false;
        }
      };
      wrappedOpen.__questionRepeatWrapped = true;
      root.openVocabularyAdventureChallenge = wrappedOpen;
    }
    if (typeof root.startAnotherVocabularyAdventureChallenge === 'function') {
      root.startAnotherVocabularyAdventureChallenge = function startAnotherVocabularyAdventureChallengePatched() {
        return root.openVocabularyAdventureChallenge(true);
      };
    }
    if (typeof root.updateVocabularyAdventurePreviewEntry === 'function'
        && !root.updateVocabularyAdventurePreviewEntry.__questionRepeatWrapped) {
      const originalUpdate = root.updateVocabularyAdventurePreviewEntry;
      const wrappedUpdate = async function updateVocabularyAdventurePreviewEntryPatched(...args) {
        root.__vocabularyChallengeCandidateExpansion = true;
        try {
          return await originalUpdate.apply(this, args);
        } finally {
          root.__vocabularyChallengeCandidateExpansion = false;
        }
      };
      wrappedUpdate.__questionRepeatWrapped = true;
      root.updateVocabularyAdventurePreviewEntry = wrappedUpdate;
    }
  }

  function ensureBase() {
    if (basePromise) return basePromise;
    basePromise = root.loadFeatureScript('js/vocabularyAdventureCore.js')
      .then(() => root.loadFeatureScript('js/vocabularyAdventure.js'))
      .then(() => root.loadFeatureScript('js/vocabularyAdventureReview.js'))
      .then(() => installBrowserPatches());
    return basePromise;
  }

  function loadSupportModules() {
    return Promise.all([
      root.loadFeatureScript('data/vocabularyLessonAssets.js').catch(() => null),
      root.loadFeatureScript('js/vocabularyPracticeUI.js'),
      root.loadFeatureScript('js/vocabularyFeedbackErrorUI.js')
    ]);
  }

  function loadFeatureGroup(group, fallback) {
    if (!['adventurePlayer', 'adventureChallenge'].includes(group)) return fallback(group);
    if (featurePromises.has(group)) return featurePromises.get(group);
    const promise = Promise.all([ensureBase(), loadSupportModules()]).then(([modules]) => {
      if (group === 'adventurePlayer') {
        return root.loadFeatureScript('js/vocabularyAdventurePlayer.js');
      }
      return root.loadFeatureScript('js/vocabularyAdventureChallenge.js');
    }).then(() => {
      if (group === 'adventureChallenge') installChallengeBrowserWrappers();
      root.VocabularyPracticeUI?.afterFeatureGroup?.(group, installed);
      root.VocabularyFeedbackErrorUI?.afterFeatureGroup?.(group, installed);
    }).catch(error => {
      featurePromises.delete(group);
      throw error;
    });
    featurePromises.set(group, promise);
    return promise;
  }

  return Object.freeze({
    SCREENING_TYPES,
    ADVENTURE_BASIC_TYPES,
    ADVENTURE_FORM_TYPES,
    FEATURE_PROMPT_PREFIX,
    MISSING_PROMPT_PREFIX,
    questionFingerprint,
    challengeHistoryByWord,
    deterministicMissingPart: (word, seed, core) => deterministicMissingPart(word, seed, core),
    expandChallengeCandidates,
    install,
    loadFeatureGroup
  });
});
