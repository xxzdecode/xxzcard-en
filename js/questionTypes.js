const CHALLENGE_TYPE_IDS = ['A', 'B', 'C', 'L', 'S', 'O'];

const CHALLENGE_TYPE_LABELS = {
  A: 'A 型 · 例句填空',
  B: 'B 型 · 选英文',
  C: 'C 型 · 选中文',
  L: 'L 型 · 听力辨词',
  S: 'S 型 · 拼写',
  O: 'O 型 · 字母排序'
};

const CHALLENGE_TYPE_CLASSES = {
  A: 'dq-type-A',
  B: 'dq-type-B',
  C: 'dq-type-C',
  L: 'dq-type-L',
  S: 'dq-type-S',
  O: 'dq-type-O'
};

function simpleWord(en) {
  return String(en || '').split('/')[0].trim().replace(/[^a-zA-Z]/g, '').toLowerCase();
}

function makeMissingPart(answer) {
  const len = Math.min(2, Math.max(1, answer.length));
  const maxStart = Math.max(0, answer.length - len);
  const start = Math.floor(Math.random() * (maxStart + 1));
  const missing = answer.slice(start, start + len);
  return {
    missing,
    masked: answer.slice(0, start) + '_'.repeat(missing.length) + answer.slice(start + len)
  };
}

function makeSegmentOptions(answer) {
  const pool = ['pp','oo','ee','ai','ch','sh','th','st','ar','or','le','an','in','er'].filter(x => x !== answer);
  return [answer, ...pool.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
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
  return {
    card,
    allCards,
    wrong3,
    word,
    meaning: getCardMeaning(card),
    clozeSpan: card.ex ? findClozeSpan(card.ex, word) : null,
    questionSet
  };
}

function makeQuestionFromRegistry(card, allCards, typeIds, questionSet = 'task-challenge') {
  const context = makeQuestionContext(card, allCards, questionSet);
  const available = typeIds.filter(id => {
    const type = ChallengeQuestionTypes[id];
    return type && (!type.isAvailable || type.isAvailable(context));
  });
  const picked = available[Math.floor(Math.random() * available.length)];
  return ChallengeQuestionTypes[picked].build(context);
}

function makeTaskChallengeQuestion(card, allCards) {
  return makeQuestion('challenge', card, allCards, CHALLENGE_TYPE_IDS, 'task-challenge');
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
    isAvailable: context => !!context.clozeSpan,
    build(context) {
      const options = shuffle4([context.word, ...context.wrong3.map(getCardWord)]);
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
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'B',
        question: context.meaning + (context.card.pos ? `（${context.card.pos}）` : ''),
        answer: context.word,
        options: shuffle4([context.word, ...context.wrong3.map(getCardWord)]),
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
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'C',
        question: context.word,
        answer: context.meaning,
        options: shuffle4([context.meaning, ...context.wrong3.map(getCardMeaning)]),
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
    build(context) {
      return {
        questionSet: context.questionSet,
        type: 'L',
        question: context.word,
        answer: context.word,
        options: shuffle4([context.word, ...context.wrong3.map(getCardWord)]),
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
  }
};

let challengeOrderController = null;
let reviewOrderController = null;

function createLetterOrderController(config) {
  const answerBox = document.getElementById(config.answerBoxId);
  const letterRow = document.getElementById(config.letterRowId);
  const confirmButton = config.confirmButtonId ? document.getElementById(config.confirmButtonId) : null;
  const picked = [];
  let locked = false;

  function render() {
    answerBox.innerHTML = '';
    picked.forEach((item, pickedIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'review-answer-letter';
      button.textContent = item.letter;
      button.setAttribute('aria-label', `撤回字母 ${item.letter}`);
      button.disabled = locked;
      button.addEventListener('click', () => {
        if (locked) return;
        picked.splice(pickedIndex, 1);
        render();
      });
      answerBox.appendChild(button);
    });

    letterRow.querySelectorAll('.review-letter').forEach(button => {
      const used = picked.some(item => item.sourceIndex === Number(button.dataset.i));
      button.disabled = locked || used;
      button.style.opacity = used ? '0.35' : '';
    });
    if (confirmButton) confirmButton.disabled = locked || picked.length !== config.answerLength;
  }

  config.letters.forEach((letter, sourceIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-letter';
    button.dataset.i = String(sourceIndex);
    button.textContent = letter;
    button.addEventListener('click', () => {
      if (locked || picked.some(item => item.sourceIndex === sourceIndex)) return;
      picked.push({ letter, sourceIndex });
      render();
    });
    letterRow.appendChild(button);
  });
  render();

  return {
    value: () => picked.map(item => item.letter).join(''),
    isComplete: () => picked.length === config.answerLength,
    items: () => picked.map(item => ({ ...item })),
    lock() {
      locked = true;
      render();
    }
  };
}

const ReviewQuestionTypes = {
  match: {
    build(cards) {
      return {
        type: 'match',
        cards,
        tiles: cards.flatMap(card => [
          { side: 'en', en: getCardWord(card), text: getCardWord(card) },
          { side: 'zh', en: getCardWord(card), text: getCardMeaning(card) || getCardWord(card) }
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
    build(card) {
      const answer = simpleWord(getCardWord(card));
      const part = makeMissingPart(answer);
      return { type: 'blank', card, part, options: makeSegmentOptions(part.missing, answer) };
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
    build: card => ({ type: 'listen', card, options: makeWordOptions(card) }),
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
