const CHALLENGE_TYPE_IDS = ['A', 'B', 'C', 'L', 'S'];

const CHALLENGE_TYPE_LABELS = {
  A: 'A 型 · 例句填空',
  B: 'B 型 · 选英文',
  C: 'C 型 · 选中文',
  L: 'L 型 · 听力辨词',
  S: 'S 型 · 拼写'
};

const CHALLENGE_TYPE_CLASSES = {
  A: 'dq-type-A',
  B: 'dq-type-B',
  C: 'dq-type-C',
  L: 'dq-type-L',
  S: 'dq-type-S'
};

function makeQuestionContext(card, allCards) {
  const others = allCards.filter(c => c.en !== card.en);
  const wrong3 = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    card,
    allCards,
    wrong3,
    clozeSpan: card.ex ? findClozeSpan(card.ex, card.en) : null
  };
}

function makeQuestionFromRegistry(card, allCards, typeIds) {
  const context = makeQuestionContext(card, allCards);
  const available = typeIds.filter(id => {
    const type = ChallengeQuestionTypes[id];
    return type && (!type.isAvailable || type.isAvailable(context));
  });
  const picked = available[Math.floor(Math.random() * available.length)];
  return ChallengeQuestionTypes[picked].build(context);
}

function makeTaskChallengeQuestion(card, allCards) {
  return makeQuestionFromRegistry(card, allCards, CHALLENGE_TYPE_IDS);
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
  fb.innerHTML = `❌ 正确答案：<strong>${q.answer}</strong>　${q.card.en} — ${q.card.zh}`;
}

const ChallengeQuestionTypes = {
  A: {
    isAvailable: context => !!context.clozeSpan,
    build(context) {
      const options = shuffle4([context.card.en, ...context.wrong3.map(c => c.en)]);
      return {
        questionSet: 'task-challenge',
        type: 'A',
        sentencePrefix: context.clozeSpan.prefix,
        sentenceSuffix: context.clozeSpan.suffix,
        answer: context.card.en,
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
        questionSet: 'task-challenge',
        type: 'B',
        question: context.card.zh + (context.card.pos ? `（${context.card.pos}）` : ''),
        answer: context.card.en,
        options: shuffle4([context.card.en, ...context.wrong3.map(c => c.en)]),
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
        questionSet: 'task-challenge',
        type: 'C',
        question: context.card.en,
        answer: context.card.zh,
        options: shuffle4([context.card.zh, ...context.wrong3.map(c => c.zh)]),
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
        questionSet: 'task-challenge',
        type: 'L',
        question: context.card.en,
        answer: context.card.en,
        options: shuffle4([context.card.en, ...context.wrong3.map(c => c.en)]),
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
        questionSet: 'task-challenge',
        type: 'S',
        question: context.card.zh + (context.card.pos ? `（${context.card.pos}）` : ''),
        answer: context.card.en,
        puzzle: buildSpellingPuzzle(context.card.en),
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
  }
};

function getChallengeQuestionType(q) {
  if (!q || q.questionSet !== 'task-challenge') return null;
  return ChallengeQuestionTypes[q.type] || null;
}
