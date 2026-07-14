const CHALLENGE_TYPE_IDS = ['A', 'B', 'C', 'L', 'S', 'O', 'D', 'P', 'K', 'R'];

const CHALLENGE_ASSIGNMENT_PRIORITY = ['R', 'K', 'A', 'P', 'D', 'S', 'O', 'L', 'B', 'C'];

const CHALLENGE_TYPE_FALLBACKS = {
  A: ['K', 'R', 'B'],
  K: ['A', 'R', 'B'],
  R: ['K', 'A', 'O'],
  P: ['L', 'B'],
  D: ['S', 'O', 'L'],
  S: ['O', 'D'],
  O: ['S', 'D'],
  L: ['P', 'B'],
  B: ['C'],
  C: ['B']
};

const CHALLENGE_TYPE_LABELS = {
  A: 'A 型 · 例句填空',
  B: 'B 型 · 选英文',
  C: 'C 型 · 选中文',
  L: 'L 型 · 听力辨词',
  S: 'S 型 · 拼写',
  O: 'O 型 · 字母排序',
  D: 'D 型 · 听音拼写',
  P: 'P 型 · 音标选词',
  K: 'K 型 · 搭配补全',
  R: 'R 型 · 句子排序'
};

const CHALLENGE_TYPE_CLASSES = {
  A: 'dq-type-A',
  B: 'dq-type-B',
  C: 'dq-type-C',
  L: 'dq-type-L',
  S: 'dq-type-S',
  O: 'dq-type-O',
  D: 'dq-type-D',
  P: 'dq-type-P',
  K: 'dq-type-K',
  R: 'dq-type-R'
};

function simpleWord(value) {
  const word = String(value || '').split('/')[0].trim().toLowerCase();
  return /^[a-z]+$/.test(word) ? word : '';
}

function makeMissingPart(answer) {
  if (answer.length < 2) return null;
  const len = answer.length >= 5 && Math.random() < 0.5 ? 2 : 1;
  const maxStart = Math.max(0, answer.length - len);
  const start = Math.floor(Math.random() * (maxStart + 1));
  const missing = answer.slice(start, start + len);
  return {
    missing,
    masked: answer.slice(0, start) + '_'.repeat(missing.length) + answer.slice(start + len)
  };
}

function makeSegmentOptions(answer) {
  const normalized = String(answer || '').toLowerCase();
  const commonPool = [
    'a','e','i','o','u','b','c','d','f','g','h','l','m','n','p','r','s','t',
    'pp','oo','ee','ai','ch','sh','th','st','ar','or','le','an','in','er'
  ];
  const generalPool = [
    'j','k','q','v','w','x','y','z','ea','oa','ou','ow','ck','ng','ph','wh','qu','ll','ss','tt','nd','nt'
  ];
  const options = [normalized];

  function addCandidate(candidate) {
    if (options.length < 4 && /^[a-z]+$/.test(candidate) && candidate.length === normalized.length && !options.includes(candidate)) {
      options.push(candidate);
    }
  }

  commonPool.filter(item => item.length === normalized.length).sort(() => Math.random() - 0.5).forEach(addCandidate);
  generalPool.filter(item => item.length === normalized.length).sort(() => Math.random() - 0.5).forEach(addCandidate);

  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let attempts = 0;
  while (options.length < 4 && attempts < 40) {
    let candidate = '';
    for (let i = 0; i < normalized.length; i++) {
      candidate += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    addCandidate(candidate);
    attempts++;
  }

  // Deterministic fallback guarantees completion after the bounded random attempts.
  let counter = 0;
  while (options.length < 4) {
    let value = counter++;
    let candidate = '';
    for (let i = 0; i < normalized.length; i++) {
      candidate = alphabet[value % alphabet.length] + candidate;
      value = Math.floor(value / alphabet.length);
    }
    addCandidate(candidate);
  }
  return options.sort(() => Math.random() - 0.5);
}

function getEnglishExamples(card, word) {
  if (!card || !Array.isArray(card.collocations)) return [];
  return card.collocations.reduce((examples, item, sourceIndex) => {
    if (!item || typeof item !== 'object') return examples;
    const rawExample = typeof item.example === 'string' ? item.example.trim() : '';
    if (!rawExample) return examples;
    const exactSeparatorIndex = rawExample.indexOf(' / ');
    const separatorIndex = exactSeparatorIndex >= 0 ? exactSeparatorIndex : rawExample.indexOf('/');
    const sentence = (separatorIndex >= 0 ? rawExample.slice(0, separatorIndex) : rawExample).trim();
    if (!sentence) return examples;
    examples.push({ sentence, clozeSpan: findClozeSpan(sentence, word), sourceIndex });
    return examples;
  }, []);
}

function getUsableCollocations(card, word = getCardWord(card)) {
  if (!card || !Array.isArray(card.collocations)) return [];
  const target = String(word || '').split('/')[0].trim();
  if (!target) return [];
  return card.collocations.reduce((items, item, sourceIndex) => {
    const phrase = item && typeof item.phrase === 'string' ? item.phrase.trim().replace(/\s+/g, ' ') : '';
    if (!phrase) return items;
    const span = findClozeSpan(phrase, target);
    if (!span || !(span.prefix + span.suffix).trim()) return items;
    items.push({
      phrase,
      target: span.matched,
      prefix: span.prefix,
      suffix: span.suffix,
      sourceIndex
    });
    return items;
  }, []);
}

function getCardPhonetic(card) {
  return card && typeof card.phonetic === 'string' ? card.phonetic.trim() : '';
}

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeUniqueWordOptions(answerCard, allCards, count, options = {}) {
  const answer = String(getCardWord(answerCard) || '').trim();
  if (!answer || !Array.isArray(allCards) || count < 1) return null;
  const answerKey = answer.toLocaleLowerCase();
  const excluded = new Set((options.excludeWords || []).map(word => String(word).toLocaleLowerCase()));
  const seen = new Set([answerKey]);
  const preferred = [];
  const fallback = [];
  const answerPos = String(answerCard.pos || '').trim().toLocaleLowerCase();

  allCards.forEach(card => {
    const word = String(getCardWord(card) || '').trim();
    const key = word.toLocaleLowerCase();
    if (!word || seen.has(key) || excluded.has(key)) return;
    if (options.filterCandidate && !options.filterCandidate(card, word)) return;
    seen.add(key);
    const samePos = answerPos && String(card.pos || '').trim().toLocaleLowerCase() === answerPos;
    (options.preferSamePos && samePos ? preferred : fallback).push(word);
  });

  const distractors = [...shuffled(preferred), ...shuffled(fallback)].slice(0, count - 1);
  return distractors.length === count - 1 ? shuffled([answer, ...distractors]) : null;
}

function makeUniqueMeaningOptions(answerCard, allCards, count) {
  const answer = String(getCardMeaning(answerCard) || '').trim();
  if (!answer || !Array.isArray(allCards) || count < 1) return null;
  const seen = new Set([answer.toLocaleLowerCase()]);
  const distractors = [];
  shuffled(allCards).forEach(card => {
    const meaning = String(getCardMeaning(card) || '').trim();
    const key = meaning.toLocaleLowerCase();
    if (!meaning || seen.has(key) || distractors.length >= count - 1) return;
    seen.add(key);
    distractors.push(meaning);
  });
  return distractors.length === count - 1 ? shuffled([answer, ...distractors]) : null;
}

function getSentenceTokens(sentence) {
  const normalized = String(sentence || '').trim().replace(/\s+/g, ' ');
  if (!normalized || !/[A-Za-z]/.test(normalized)) return [];
  return normalized.split(' ');
}

function normalizeSentenceAnswer(sentence) {
  const normalized = String(sentence || '').trim().replace(/\s+/g, ' ');
  return normalized.replace(/[A-Za-z]/, letter => letter.toLocaleLowerCase());
}

function makeIndexedSequence(values) {
  return values.map((text, sourceIndex) => ({ text, sourceIndex }));
}

function shuffleSequenceAwayFromOriginal(items) {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = shuffled(items);
    if (result.some((item, index) => item.text !== items[index].text)) return result;
  }
  return [...items.slice(1), items[0]];
}

function makeSentencePhraseBlocks(sentence) {
  const tokens = getSentenceTokens(sentence);
  if (tokens.length < 3 || tokens.length > 10) return null;
  const blockCount = Math.min(6, Math.max(3, Math.ceil(tokens.length / 2)));
  const blocks = [];
  let cursor = 0;
  for (let i = 0; i < blockCount; i++) {
    const remainingTokens = tokens.length - cursor;
    const remainingBlocks = blockCount - i;
    const size = Math.ceil(remainingTokens / remainingBlocks);
    blocks.push(tokens.slice(cursor, cursor + size).join(' '));
    cursor += size;
  }
  return blocks;
}

function visibleCollocationWords(collocation) {
  return ((collocation.prefix || '') + ' ' + (collocation.suffix || ''))
    .toLocaleLowerCase()
    .match(/[a-z]+(?:['’\-][a-z]+)*/g) || [];
}

function makeWordOptions(card) {
  const word = getCardWord(card);
  const others = activeTaskAllCards.filter(candidate => getCardWord(candidate) !== word).map(getCardWord);
  return [word, ...others.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
}

function makeQuestionContext(card, allCards, questionSet = 'task-challenge') {
  const word = getCardWord(card);
  const others = allCards.filter(c => getCardWord(c) !== word);
  const wrong3 = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
  const usableExamples = getEnglishExamples(card, word).filter(example => example.clozeSpan);
  const selectedExample = usableExamples[Math.floor(Math.random() * usableExamples.length)] || null;
  return {
    card,
    allCards,
    wrong3,
    word,
    meaning: getCardMeaning(card),
    clozeSpan: selectedExample ? selectedExample.clozeSpan : null,
    exampleSource: selectedExample,
    questionSet
  };
}

function makeQuestionFromRegistry(card, allCards, typeIds, questionSet = 'task-challenge') {
  const context = makeQuestionContext(card, allCards, questionSet);
  const available = typeIds.filter(id => {
    const type = ChallengeQuestionTypes[id];
    return type && (!type.isAvailable || type.isAvailable(context));
  });
  if (available.length === 0) return null;
  const picked = available[Math.floor(Math.random() * available.length)];
  return ChallengeQuestionTypes[picked].build(context);
}

function makeTaskChallengeQuestion(card, allCards) {
  return makeQuestion('challenge', card, allCards, CHALLENGE_TYPE_IDS, 'task-challenge');
}

function challengeTypeIsAvailable(typeId, context) {
  const type = ChallengeQuestionTypes[typeId];
  return !!type && (!type.isAvailable || type.isAvailable(context));
}

function buildChallengeCandidateMatrix(deck, allCards, questionSet) {
  return Object.fromEntries(CHALLENGE_TYPE_IDS.map(typeId => [
    typeId,
    deck.reduce((candidates, card, cardIndex) => {
      const context = makeQuestionContext(card, allCards, questionSet);
      if (challengeTypeIsAvailable(typeId, context)) candidates.push({ card, cardIndex, context });
      return candidates;
    }, [])
  ]));
}

function chooseChallengeActualTypes(candidateMatrix) {
  const typesAlreadyRepresented = new Set(
    CHALLENGE_TYPE_IDS.filter(typeId => candidateMatrix[typeId].length > 0)
  );
  return CHALLENGE_TYPE_IDS.map((requestedType, requestedIndex) => {
    if (candidateMatrix[requestedType].length > 0) {
      return { requestedType, actualType: requestedType, requestedIndex };
    }
    const preferred = [
      ...(CHALLENGE_TYPE_FALLBACKS[requestedType] || []),
      ...CHALLENGE_ASSIGNMENT_PRIORITY
    ].filter((typeId, index, values) => values.indexOf(typeId) === index && candidateMatrix[typeId].length > 0);
    const actualType = preferred.find(typeId => !typesAlreadyRepresented.has(typeId)) || preferred[0] || null;
    if (actualType) typesAlreadyRepresented.add(actualType);
    return { requestedType, actualType, requestedIndex };
  });
}

function assignChallengeCards(assignments, candidateMatrix) {
  const cardOwners = new Map();
  const assignedCards = new Map();
  const constrainedFirst = [...assignments].sort((left, right) => {
    const leftCount = left.actualType ? candidateMatrix[left.actualType].length : 0;
    const rightCount = right.actualType ? candidateMatrix[right.actualType].length : 0;
    if (leftCount !== rightCount) return leftCount - rightCount;
    const leftPriority = CHALLENGE_ASSIGNMENT_PRIORITY.indexOf(left.requestedType);
    const rightPriority = CHALLENGE_ASSIGNMENT_PRIORITY.indexOf(right.requestedType);
    return leftPriority - rightPriority;
  });

  function tryAssign(assignment, visitedAssignments, visitedCards) {
    if (!assignment.actualType || visitedAssignments.has(assignment.requestedIndex)) return false;
    visitedAssignments.add(assignment.requestedIndex);
    for (const candidate of candidateMatrix[assignment.actualType]) {
      if (visitedCards.has(candidate.cardIndex)) continue;
      visitedCards.add(candidate.cardIndex);
      const owner = cardOwners.get(candidate.cardIndex);
      if (!owner || tryAssign(owner, visitedAssignments, visitedCards)) {
        cardOwners.set(candidate.cardIndex, assignment);
        assignedCards.set(assignment.requestedIndex, candidate);
        return true;
      }
    }
    return false;
  }

  constrainedFirst.forEach(assignment => tryAssign(assignment, new Set(), new Set()));

  const useCounts = new Map();
  assignedCards.forEach(candidate => useCounts.set(candidate.cardIndex, (useCounts.get(candidate.cardIndex) || 0) + 1));
  constrainedFirst.forEach(assignment => {
    if (assignedCards.has(assignment.requestedIndex) || !assignment.actualType) return;
    const candidate = [...candidateMatrix[assignment.actualType]].sort((left, right) => {
      const useDifference = (useCounts.get(left.cardIndex) || 0) - (useCounts.get(right.cardIndex) || 0);
      return useDifference || left.cardIndex - right.cardIndex;
    })[0];
    if (!candidate) return;
    assignedCards.set(assignment.requestedIndex, candidate);
    useCounts.set(candidate.cardIndex, (useCounts.get(candidate.cardIndex) || 0) + 1);
  });
  return assignedCards;
}

function countAdjacentChallengeCards(questions) {
  let count = 0;
  for (let index = 1; index < questions.length; index++) {
    if (questions[index - 1].card === questions[index].card) count++;
  }
  return count;
}

function shuffleChallengeQuestions(questions) {
  let best = [...questions];
  let bestAdjacent = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = shuffled(questions);
    const adjacent = countAdjacentChallengeCards(candidate);
    if (adjacent < bestAdjacent) {
      best = candidate;
      bestAdjacent = adjacent;
      if (adjacent === 0) break;
    }
  }
  return best;
}

function buildChallengePlan(deck, allCards, questionSet = 'task-challenge') {
  const prioritizedDeck = Array.isArray(deck) ? deck.filter(Boolean) : [];
  const optionPool = Array.isArray(allCards) && allCards.length ? allCards.filter(Boolean) : prioritizedDeck;
  if (prioritizedDeck.length === 0 || optionPool.length === 0) return [];

  const candidateMatrix = buildChallengeCandidateMatrix(prioritizedDeck, optionPool, questionSet);
  const assignments = chooseChallengeActualTypes(candidateMatrix);
  const assignedCards = assignChallengeCards(assignments, candidateMatrix);
  const questions = [];

  for (const assignment of assignments) {
    const candidate = assignedCards.get(assignment.requestedIndex);
    const type = assignment.actualType && ChallengeQuestionTypes[assignment.actualType];
    if (!candidate || !type) {
      console.error('[challenge-plan] 找不到安全题型或卡片', assignment);
      return [];
    }
    let question;
    try {
      question = type.build(candidate.context);
    } catch (error) {
      console.error('[challenge-plan] 题目构建失败', { assignment, card: candidate.card, error });
      return [];
    }
    if (!question || question.type !== assignment.actualType || !question.card) {
      console.error('[challenge-plan] 题目对象不完整', { assignment, question });
      return [];
    }
    questions.push({
      ...question,
      requestedType: assignment.requestedType,
      actualType: assignment.actualType,
      fallbackFrom: assignment.requestedType === assignment.actualType ? null : assignment.requestedType
    });
  }

  if (questions.length !== CHALLENGE_TYPE_IDS.length) return [];
  const finalQuestions = shuffleChallengeQuestions(questions);
  console.info('[challenge-plan] 显示顺序：' + finalQuestions
    .map(question => `${question.actualType}(${getCardWord(question.card)})`)
    .join(' → '));
  return finalQuestions;
}

function questionBadge(q) {
  return `<span class="dq-type-badge ${CHALLENGE_TYPE_CLASSES[q.type]}">${CHALLENGE_TYPE_LABELS[q.type]}</span>`;
}

function questionChrome() {
  return `
    <button class="dq-confirm-btn" id="dqConfirmBtn" disabled onclick="confirmDQAnswer()">确认</button>
    <div class="dq-feedback" id="dqFeedback"></div>
    <button class="dq-next-btn" id="dqNextBtn" onclick="nextDQ()">下一题 →</button>`;
}

function renderChoiceOptions(q) {
  const optWrap = document.getElementById('dqOptions');
  if (!optWrap) return;
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'dq-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectDQOpt(i, opt));
    optWrap.appendChild(btn);
  });
}

function gradeChoiceQuestion(q) {
  if (dqSelectedOpt === null) return { ready: false };
  return { ready: true, correct: dqSelectedOpt === q.answer, picked: dqSelectedOpt };
}

function applyChoiceResult(q, result) {
  document.querySelectorAll('.dq-opt').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.className = 'dq-opt correct-ans';
    else if (btn.textContent === result.picked && !result.correct) btn.className = 'dq-opt wrong-ans';
    else btn.className = 'dq-opt';
  });
  const blank = document.getElementById('dqBlank');
  if (blank) {
    blank.textContent = result.picked;
    blank.className = 'dq-blank ' + (result.correct ? 'correct-ans' : 'wrong-ans');
  }
  applyQuestionResult(q, result.correct);
}

function gradeSpellingQuestion(q) {
  if (currentSlots.indexOf(null) !== -1) return { ready: false };
  const correct = slotAnswers.every((l, i) => currentSlots[i] && currentSlots[i].toLowerCase() === l.toLowerCase());
  return { ready: true, correct };
}

function applySpellingResult(q, result) {
  document.querySelectorAll('.letter-slot').forEach((slot, i) => {
    if (choiceMap[i] !== undefined) {
      const ok = currentSlots[i] && currentSlots[i].toLowerCase() === slotAnswers[i].toLowerCase();
      slot.className = 'letter-slot ' + (ok ? 'correct' : 'wrong');
    }
  });
  applyQuestionResult(q, result.correct);
}

function applyQuestionResult(q, correct) {
  const fb = document.getElementById('dqFeedback');
  document.getElementById('dqConfirmBtn').style.display = 'none';
  document.getElementById('dqNextBtn').style.display = 'block';
  if (correct) {
    dqCorrect++;
    fb.className = 'dq-feedback correct-fb';
    fb.textContent = '🎉 正确！';
    return;
  }
  dqWrongList.push(q.card);
  if (typeof markCardUnknown === 'function') markCardUnknown(q.card);
  fb.className = 'dq-feedback wrong-fb';
  fb.innerHTML = `❌ 正确答案：<strong>${q.answer}</strong>　${getCardWord(q.card)} — ${getCardMeaning(q.card)}`;
}

const ChallengeQuestionTypes = {
  A: {
    isAvailable: context => !!context.clozeSpan && !!makeUniqueWordOptions(context.card, context.allCards, 4),
    build(context) {
      const options = makeUniqueWordOptions(context.card, context.allCards, 4);
      return {
        questionSet: context.questionSet,
        type: 'A',
        sentencePrefix: context.clozeSpan.prefix,
        sentenceSuffix: context.clozeSpan.suffix,
        answer: context.word,
        options,
        maxLen: Math.max(...options.map(o => o.length)),
        card: context.card
      };
    },
    render(q) {
      return `
        ${questionBadge(q)}
        <div class="dq-sentence" id="dqSentence">${q.sentencePrefix}<span class="dq-blank" id="dqBlank" style="min-width:${q.maxLen + 1}ch"></span>${q.sentenceSuffix}</div>
        <div class="dq-options" id="dqOptions"></div>
        ${questionChrome()}`;
    },
    setup: renderChoiceOptions,
    grade: gradeChoiceQuestion,
    applyResult: applyChoiceResult
  },
  B: {
    isAvailable: context => !!String(context.word || '').trim() && !!makeUniqueWordOptions(context.card, context.allCards, 4),
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'B',
        question: context.meaning + (context.card.pos ? `（${context.card.pos}）` : ''),
        answer: context.word,
        options: makeUniqueWordOptions(context.card, context.allCards, 4),
        card: context.card
      };
    },
    render(q) {
      return `${questionBadge(q)}<div class="dq-question">${q.question}</div><div class="dq-options" id="dqOptions"></div>${questionChrome()}`;
    },
    setup: renderChoiceOptions,
    grade: gradeChoiceQuestion,
    applyResult: applyChoiceResult
  },
  C: {
    isAvailable: context => !!String(context.meaning || '').trim() && !!makeUniqueMeaningOptions(context.card, context.allCards, 4),
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'C',
        question: context.word,
        answer: context.meaning,
        options: makeUniqueMeaningOptions(context.card, context.allCards, 4),
        card: context.card
      };
    },
    render(q) {
      return `${questionBadge(q)}<div class="dq-question">${q.question}</div><div class="dq-options" id="dqOptions"></div>${questionChrome()}`;
    },
    setup: renderChoiceOptions,
    grade: gradeChoiceQuestion,
    applyResult: applyChoiceResult
  },
  L: {
    isAvailable: context => !!String(context.word || '').trim() && !!makeUniqueWordOptions(context.card, context.allCards, 4),
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'L',
        question: context.word,
        answer: context.word,
        options: makeUniqueWordOptions(context.card, context.allCards, 4),
        card: context.card
      };
    },
    render(q) {
      return `
        ${questionBadge(q)}
        <div class="dq-listen-zone">
          <button class="dq-listen-btn" id="dqListenBtn" onclick="speakWord('${escapeJs(q.question)}')">🔊</button>
          <div class="dq-listen-hint">点击播放，选出听到的单词</div>
        </div>
        <div class="dq-options" id="dqOptions"></div>
        ${questionChrome()}`;
    },
    setup(q) {
      renderChoiceOptions(q);
      speakWord(q.question);
    },
    grade: gradeChoiceQuestion,
    applyResult: applyChoiceResult
  },
  S: {
    isAvailable: context => simpleWord(context.word).length >= 2,
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'S',
        question: context.meaning + (context.card.pos ? `（${context.card.pos}）` : ''),
        answer: context.word,
        puzzle: buildSpellingPuzzle(context.word),
        card: context.card
      };
    },
    render(q) {
      return `
        ${questionBadge(q)}
        <div class="dq-question">${q.question}</div>
        <div class="letter-slots" id="letterSlots"></div>
        <div class="letter-choices" id="letterChoices"></div>
        ${questionChrome()}`;
    },
    setup(q) {
      currentSlots = [...q.puzzle.slots];
      slotAnswers = q.puzzle.slotAnswers;
      currentChoices = [...q.puzzle.choices];
      choiceMap = {};
      usedChoiceIndices = [];
      renderSpellingSlots();
      renderSpellingChoices();
    },
    grade: gradeSpellingQuestion,
    applyResult: applySpellingResult
  },
  O: {
    isAvailable: context => simpleWord(context.word).length >= 2,
    build(context) {
      const answer = simpleWord(context.word);
      return {
        questionSet: context.questionSet,
        type: 'O',
        question: context.meaning + (context.card.pos ? `（${context.card.pos}）` : ''),
        answer: context.word,
        letters: answer.split('').sort(() => Math.random() - 0.5),
        card: context.card
      };
    },
    render(q) {
      return `
        ${questionBadge(q)}
        <div class="dq-question">${q.question}</div>
        <div class="review-answer-box" id="dqOrderAnswer"></div>
        <div class="review-letter-row" id="dqOrderLetters"></div>
        ${questionChrome()}`;
    },
    setup(q) {
      challengeOrderController = createLetterOrderController({
        answerBoxId: 'dqOrderAnswer',
        letterRowId: 'dqOrderLetters',
        confirmButtonId: 'dqConfirmBtn',
        letters: q.letters,
        answerLength: simpleWord(q.answer).length
      });
    },
    grade(q) {
      if (!challengeOrderController || !challengeOrderController.isComplete()) return { ready: false };
      return {
        ready: true,
        correct: challengeOrderController.value().toLowerCase() === simpleWord(q.answer)
      };
    },
    applyResult(q, result) {
      if (challengeOrderController) challengeOrderController.lock();
      applyQuestionResult(q, result.correct);
    }
  },
  D: {
    isAvailable: context => simpleWord(context.word).length >= 2,
    build(context) {
      const answer = simpleWord(context.word);
      const letters = shuffleSequenceAwayFromOriginal(makeIndexedSequence(answer.split('')));
      return {
        questionSet: context.questionSet,
        type: 'D',
        answer,
        letters,
        card: context.card
      };
    },
    render(q) {
      return `
        ${questionBadge(q)}
        <div class="dq-listen-zone">
          <button class="dq-listen-btn" onclick="speakWord('${escapeJs(getCardWord(q.card))}')" aria-label="播放发音">🔊</button>
          <div class="dq-listen-hint">听发音，把字母拼成单词</div>
        </div>
        <div class="review-answer-box sequence-answer-box" id="dqOrderAnswer"></div>
        <div class="review-letter-row sequence-candidate-row" id="dqOrderLetters"></div>
        ${questionChrome()}`;
    },
    setup(q) {
      challengeOrderController = createSequenceOrderController({
        answerBoxId: 'dqOrderAnswer',
        candidateRowId: 'dqOrderLetters',
        confirmButtonId: 'dqConfirmBtn',
        items: q.letters,
        expectedLength: q.letters.length,
        joinWith: ''
      });
      speakWord(getCardWord(q.card));
    },
    grade(q) {
      if (!challengeOrderController || !challengeOrderController.isComplete()) return { ready: false };
      return { ready: true, correct: challengeOrderController.value().toLocaleLowerCase() === q.answer };
    },
    applyResult(q, result) {
      challengeOrderController.lock();
      applyQuestionResult(q, result.correct);
    }
  },
  P: {
    isAvailable(context) {
      return !!getCardPhonetic(context.card) && !!makeUniqueWordOptions(context.card, context.allCards, 4, { preferSamePos: true });
    },
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'P',
        question: getCardPhonetic(context.card),
        answer: context.word,
        options: makeUniqueWordOptions(context.card, context.allCards, 4, { preferSamePos: true }),
        card: context.card
      };
    },
    render(q) {
      return `${questionBadge(q)}<div class="dq-phonetic">${escapeHtml(q.question)}</div><div class="dq-options" id="dqOptions"></div>${questionChrome()}`;
    },
    setup: renderChoiceOptions,
    grade: gradeChoiceQuestion,
    applyResult: applyChoiceResult
  },
  K: {
    isAvailable(context) {
      return getUsableCollocations(context.card, context.word).some(collocation =>
        !!makeUniqueWordOptions(context.card, context.allCards, 4, {
          preferSamePos: true,
          excludeWords: visibleCollocationWords(collocation)
        })
      );
    },
    build(context) {
      const usable = getUsableCollocations(context.card, context.word)
        .map(collocation => ({
          collocation,
          options: makeUniqueWordOptions(context.card, context.allCards, 4, {
            preferSamePos: true,
            excludeWords: visibleCollocationWords(collocation)
          })
        }))
        .filter(item => item.options)
        .sort((a, b) => a.collocation.phrase.length - b.collocation.phrase.length);
      const selected = usable[Math.floor(Math.random() * Math.min(usable.length, 3))];
      return {
        questionSet: context.questionSet,
        type: 'K',
        prefix: selected.collocation.prefix,
        suffix: selected.collocation.suffix,
        answer: context.word,
        options: selected.options,
        card: context.card
      };
    },
    render(q) {
      return `${questionBadge(q)}<div class="dq-collocation">${escapeHtml(q.prefix)}<span class="dq-blank" id="dqBlank">___</span>${escapeHtml(q.suffix)}</div><div class="dq-options" id="dqOptions"></div>${questionChrome()}`;
    },
    setup: renderChoiceOptions,
    grade: gradeChoiceQuestion,
    applyResult: applyChoiceResult
  },
  R: {
    isAvailable(context) {
      return getEnglishExamples(context.card, context.word).some(example => {
        const count = getSentenceTokens(example.sentence).length;
        return count >= 4 && count <= 10;
      });
    },
    build(context) {
      const examples = getEnglishExamples(context.card, context.word).filter(example => {
        const count = getSentenceTokens(example.sentence).length;
        return count >= 4 && count <= 10;
      });
      const selected = examples[Math.floor(Math.random() * examples.length)];
      const items = makeIndexedSequence(getSentenceTokens(selected.sentence));
      return {
        questionSet: context.questionSet,
        type: 'R',
        answer: selected.sentence,
        tokens: shuffleSequenceAwayFromOriginal(items),
        card: context.card
      };
    },
    render(q) {
      return `
        ${questionBadge(q)}
        <div class="dq-order-hint">点击词块，组成正确句子</div>
        <div class="review-answer-box sequence-answer-box sequence-sentence" id="dqOrderAnswer"></div>
        <div class="review-letter-row sequence-candidate-row" id="dqOrderLetters"></div>
        ${questionChrome()}`;
    },
    setup(q) {
      challengeOrderController = createSequenceOrderController({
        answerBoxId: 'dqOrderAnswer',
        candidateRowId: 'dqOrderLetters',
        confirmButtonId: 'dqConfirmBtn',
        items: q.tokens,
        expectedLength: q.tokens.length,
        joinWith: ' '
      });
    },
    grade(q) {
      if (!challengeOrderController || !challengeOrderController.isComplete()) return { ready: false };
      return { ready: true, correct: normalizeSentenceAnswer(challengeOrderController.value()) === normalizeSentenceAnswer(q.answer) };
    },
    applyResult(q, result) {
      challengeOrderController.lock();
      applyQuestionResult(q, result.correct);
    }
  }
};

let challengeOrderController = null;
let reviewOrderController = null;
let reviewSequenceAnswer = '';
let reviewSequenceIsSentence = false;

function createSequenceOrderController(config) {
  const answerBox = document.getElementById(config.answerBoxId);
  const candidateRow = document.getElementById(config.candidateRowId);
  const confirmButton = config.confirmButtonId ? document.getElementById(config.confirmButtonId) : null;
  const picked = [];
  let locked = false;

  function render() {
    answerBox.innerHTML = '';
    picked.forEach((item, pickedIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'review-answer-letter';
      button.textContent = item.text;
      button.setAttribute('aria-label', `撤回 ${item.text}`);
      button.disabled = locked;
      button.addEventListener('click', () => {
        if (locked) return;
        picked.splice(pickedIndex, 1);
        render();
      });
      answerBox.appendChild(button);
    });

    candidateRow.querySelectorAll('.review-letter').forEach(button => {
      const used = picked.some(item => item.sourceIndex === Number(button.dataset.i));
      button.disabled = locked || used;
      button.style.opacity = used ? '0.35' : '';
    });
    if (confirmButton) confirmButton.disabled = locked || picked.length !== config.expectedLength;
  }

  config.items.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-letter';
    button.dataset.i = String(item.sourceIndex);
    button.textContent = item.text;
    button.addEventListener('click', () => {
      if (locked || picked.some(pickedItem => pickedItem.sourceIndex === item.sourceIndex)) return;
      picked.push({ ...item });
      render();
    });
    candidateRow.appendChild(button);
  });
  render();

  return {
    value: () => picked.map(item => item.text).join(config.joinWith || ''),
    isComplete: () => picked.length === config.expectedLength,
    items: () => picked.map(item => ({ ...item })),
    lock() {
      locked = true;
      render();
    }
  };
}

function createLetterOrderController(config) {
  return createSequenceOrderController({
    answerBoxId: config.answerBoxId,
    candidateRowId: config.letterRowId,
    confirmButtonId: config.confirmButtonId,
    items: makeIndexedSequence(config.letters),
    expectedLength: config.answerLength,
    joinWith: ''
  });
}

function checkReviewSequence() {
  if (!reviewOrderController || !reviewOrderController.isComplete()) return;
  const picked = reviewOrderController.value();
  const correct = reviewSequenceIsSentence
    ? normalizeSentenceAnswer(picked) === normalizeSentenceAnswer(reviewSequenceAnswer)
    : picked.toLocaleLowerCase() === reviewSequenceAnswer.toLocaleLowerCase();
  reviewOrderController.lock();
  if (correct) {
    nextReviewStep();
    return;
  }
  const step = reviewSteps[reviewIndex];
  addReviewWrong(step.card);
  showReviewCorrection(step.card);
}

const ReviewQuestionTypes = {
  match: {
    build(cards) {
      return {
        type: 'match',
        cards,
        tiles: cards.flatMap(card => [
          { side: 'word', pairKey: getCardWord(card), text: getCardWord(card) },
          { side: 'meaning', pairKey: getCardWord(card), text: getCardMeaning(card) || getCardWord(card) }
        ]).sort(() => Math.random() - 0.5)
      };
    },
    render(step) {
      reviewMatchSelection = null;
      reviewMatchPairsDone = 0;
      reviewMatchLocked = false;
      reviewCardShell('对对碰', `
        <div class="match-preview-grid">
          ${step.cards.map(card => `
            <div class="match-preview-card">
              <div class="match-preview-emoji">${card.emoji || '📚'}</div>
              <div class="match-preview-en">${getCardWord(card)}</div>
              <div class="match-preview-zh">${getCardMeaning(card)}</div>
            </div>`).join('')}
        </div>
        <button class="review-action secondary" onclick="startReviewMatchPlay()">我记住了</button>`);
    }
  },
  repeat: {
    isAvailable: card => !!String(getCardWord(card) || '').trim(),
    build: card => ({ type: 'repeat', card }),
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('跟读', `
        <div class="review-question">${word}</div>
        <div class="review-sub">${getCardMeaning(step.card)}</div>
        <button class="review-action" onclick="speakWord('${escapeJs(word)}')">🔊 播放发音</button>
        <button class="review-action secondary" onclick="nextReviewStep()">我读完了</button>`);
      speakWord(word);
    }
  },
  blank: {
    isAvailable: card => simpleWord(getCardWord(card)).length >= 2,
    build(card) {
      const answer = simpleWord(getCardWord(card));
      const part = makeMissingPart(answer);
      return { type: 'blank', card, part, options: makeSegmentOptions(part.missing) };
    },
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('缺字母选择', `
        <div class="review-spell-word">${step.part.masked}</div>
        <div class="review-sub">${getCardMeaning(step.card)}</div>
        <div class="review-options">
          ${step.options.map(option => `<button class="review-opt" onclick="answerReviewChoice(this,'${escapeJs(option)}','${escapeJs(step.part.missing)}','${escapeJs(word)}')">${option}</button>`).join('')}
        </div>`);
    }
  },
  listen: {
    isAvailable(card, allCards) {
      return !!String(getCardWord(card) || '').trim() && !!makeUniqueWordOptions(card, allCards, 4);
    },
    build(card, allCards) {
      const options = makeUniqueWordOptions(card, allCards, 4);
      return options ? { type: 'listen', card, options } : null;
    },
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('听音选词', `
        <button class="review-action" onclick="speakWord('${escapeJs(word)}')">🔊 播放</button>
        <div class="review-options">
          ${step.options.map(option => `<button class="review-opt" onclick="answerReviewChoice(this,'${escapeJs(option)}','${escapeJs(word)}','${escapeJs(word)}')">${option}</button>`).join('')}
        </div>`);
      speakWord(word);
    }
  },
  sort: {
    isAvailable: card => simpleWord(getCardWord(card)).length >= 2,
    build(card) {
      return { type: 'sort', card, letters: simpleWord(getCardWord(card)).split('').sort(() => Math.random() - 0.5) };
    },
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('字母排序', `
        <div class="review-question">${getCardMeaning(step.card)}</div>
        <div class="review-sub">把字母排成正确的英文单词</div>
        <div class="review-answer-box" id="reviewSortAnswer"></div>
        <div class="review-letter-row" id="reviewLetterRow"></div>
        <button class="review-action" onclick="checkReviewSort('${escapeJs(word)}')">确认</button>`);
      reviewOrderController = createLetterOrderController({
        answerBoxId: 'reviewSortAnswer',
        letterRowId: 'reviewLetterRow',
        letters: step.letters,
        answerLength: simpleWord(word).length
      });
    }
  },
  dictation: {
    isAvailable: card => simpleWord(getCardWord(card)).length >= 2,
    build(card) {
      const answer = simpleWord(getCardWord(card));
      return {
        type: 'dictation',
        card,
        answer,
        letters: shuffleSequenceAwayFromOriginal(makeIndexedSequence(answer.split('')))
      };
    },
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('听音拼写', `
        <button class="review-action" onclick="speakWord('${escapeJs(word)}')">🔊 播放发音</button>
        <div class="review-question review-meaning-hint">${escapeHtml(getCardMeaning(step.card))}</div>
        <div class="review-sub">点击字母，拼出听到的单词</div>
        <div class="review-answer-box sequence-answer-box" id="reviewSequenceAnswer"></div>
        <div class="review-letter-row sequence-candidate-row" id="reviewSequenceCandidates"></div>
        <button class="review-action" id="reviewSequenceConfirm" onclick="checkReviewSequence()">确认</button>`);
      reviewSequenceAnswer = step.answer;
      reviewSequenceIsSentence = false;
      reviewOrderController = createSequenceOrderController({
        answerBoxId: 'reviewSequenceAnswer',
        candidateRowId: 'reviewSequenceCandidates',
        confirmButtonId: 'reviewSequenceConfirm',
        items: step.letters,
        expectedLength: step.letters.length,
        joinWith: ''
      });
      speakWord(word);
    }
  },
  phonetic: {
    isAvailable(card, allCards) {
      return !!getCardPhonetic(card) && !!makeUniqueWordOptions(card, allCards, 3, { preferSamePos: true });
    },
    build(card, allCards) {
      return {
        type: 'phonetic',
        card,
        phonetic: getCardPhonetic(card),
        options: makeUniqueWordOptions(card, allCards, 3, { preferSamePos: true })
      };
    },
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('音标选词', `
        <div class="review-phonetic">${escapeHtml(step.phonetic)}</div>
        <div class="review-options">
          ${step.options.map(option => `<button class="review-opt" onclick="answerReviewChoice(this,'${escapeJs(option)}','${escapeJs(word)}','${escapeJs(word)}')">${escapeHtml(option)}</button>`).join('')}
        </div>`);
    }
  },
  collocation: {
    isAvailable(card, allCards) {
      return getUsableCollocations(card).some(collocation =>
        !!makeUniqueWordOptions(card, allCards, 3, {
          preferSamePos: true,
          excludeWords: visibleCollocationWords(collocation)
        })
      );
    },
    build(card, allCards) {
      const usable = getUsableCollocations(card)
        .map(collocation => ({
          collocation,
          options: makeUniqueWordOptions(card, allCards, 3, {
            preferSamePos: true,
            excludeWords: visibleCollocationWords(collocation)
          })
        }))
        .filter(item => item.options)
        .sort((a, b) => a.collocation.phrase.length - b.collocation.phrase.length);
      const selected = usable[Math.floor(Math.random() * Math.min(usable.length, 3))];
      return { type: 'collocation', card, ...selected };
    },
    render(step) {
      const word = getCardWord(step.card);
      reviewCardShell('搭配补全', `
        <div class="review-collocation">${escapeHtml(step.collocation.prefix)}<span class="review-cloze">___</span>${escapeHtml(step.collocation.suffix)}</div>
        <div class="review-sub">${escapeHtml(getCardMeaning(step.card))}</div>
        <div class="review-options">
          ${step.options.map(option => `<button class="review-opt" onclick="answerReviewChoice(this,'${escapeJs(option)}','${escapeJs(word)}','${escapeJs(word)}')">${escapeHtml(option)}</button>`).join('')}
        </div>`);
    }
  },
  sentenceOrder: {
    isAvailable(card) {
      return getEnglishExamples(card, getCardWord(card)).some(example => !!makeSentencePhraseBlocks(example.sentence));
    },
    build(card) {
      const examples = getEnglishExamples(card, getCardWord(card))
        .map(example => ({ example, blocks: makeSentencePhraseBlocks(example.sentence) }))
        .filter(item => item.blocks)
        .sort((a, b) => getSentenceTokens(a.example.sentence).length - getSentenceTokens(b.example.sentence).length);
      const selected = examples[Math.floor(Math.random() * Math.min(examples.length, 3))];
      const items = makeIndexedSequence(selected.blocks);
      return {
        type: 'sentenceOrder',
        card,
        answer: selected.example.sentence,
        blocks: shuffleSequenceAwayFromOriginal(items)
      };
    },
    render(step) {
      reviewCardShell('句子排序', `
        <div class="review-sub">点击短语块，组成正确句子</div>
        <div class="review-answer-box sequence-answer-box sequence-sentence" id="reviewSequenceAnswer"></div>
        <div class="review-letter-row sequence-candidate-row" id="reviewSequenceCandidates"></div>
        <button class="review-action" id="reviewSequenceConfirm" onclick="checkReviewSequence()">确认</button>`);
      reviewSequenceAnswer = step.answer;
      reviewSequenceIsSentence = true;
      reviewOrderController = createSequenceOrderController({
        answerBoxId: 'reviewSequenceAnswer',
        candidateRowId: 'reviewSequenceCandidates',
        confirmButtonId: 'reviewSequenceConfirm',
        items: step.blocks,
        expectedLength: step.blocks.length,
        joinWith: ' '
      });
    }
  }
};

const QuestionTypeRegistries = {
  challenge: ChallengeQuestionTypes,
  review: ReviewQuestionTypes
};

function getQuestionType(mode, typeId) {
  const registry = QuestionTypeRegistries[mode];
  return registry ? registry[typeId] || null : null;
}

function makeQuestion(mode, card, allCards, allowedTypes, questionSet = mode) {
  if (mode !== 'challenge') {
    const type = getQuestionType(mode, allowedTypes[0]);
    return type ? type.build(card, allCards) : null;
  }
  return makeQuestionFromRegistry(card, allCards, allowedTypes, questionSet);
}

function getChallengeQuestionType(q) {
  return q ? getQuestionType('challenge', q.type) : null;
}
