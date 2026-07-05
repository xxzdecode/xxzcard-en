// SPELLING TILE HELPERS (used by daily quiz type S)
// ══════════════════════════════════════
function buildSpellingPuzzle(en) {
  const answer = en.toLowerCase().split('/')[0].trim();
  const letters = answer.split('');
  const blankCount = Math.min(2, Math.max(1, letters.length));
  const maxStart = Math.max(0, letters.length - blankCount);
  const blankStart = Math.floor(Math.random() * (maxStart + 1));
  const blankIndices = new Set(Array.from({ length: blankCount }, (_, i) => blankStart + i));
  const slots = letters.map((l, i) => blankIndices.has(i) ? null : l);
  const blankLetters = [...blankIndices].map(i => letters[i]);
  const extra = 'aeiourstlndcmphbgwy'.split('');
  const pool = [...blankLetters];
  let attempts = 0;
  while (pool.length < Math.min(blankLetters.length + 2, 10) && attempts < 30) {
    const r = extra[Math.floor(Math.random() * extra.length)];
    if (!pool.includes(r) || pool.filter(x=>x===r).length < blankLetters.filter(x=>x===r).length + 1) pool.push(r);
    attempts++;
  }
  const choices = pool.sort(() => Math.random()-0.5);
  return { slots, slotAnswers: letters, choices };
}
function renderSpellingSlots() {
  const c = document.getElementById('letterSlots'); if (!c) return; c.innerHTML = '';
  currentSlots.forEach((l, i) => {
    const s = document.createElement('div');
    const isBlank = l === null;
    const userPlaced = choiceMap[i] !== undefined;
    if (isBlank) {
      s.className = 'letter-slot';
      s.textContent = '';
      s.addEventListener('click', () => removeSpellingSlot(i));
    } else if (userPlaced) {
      s.className = 'letter-slot filled';
      s.textContent = l;
      s.addEventListener('click', () => removeSpellingSlot(i));
    } else {
      s.className = 'letter-slot filled';
      s.style.background = '#F0F4F8';
      s.style.borderColor = '#C8D8E8';
      s.style.color = '#5A6A7A';
      s.style.cursor = 'default';
      s.textContent = l;
    }
    c.appendChild(s);
  });
}
function renderSpellingChoices() {
  const c = document.getElementById('letterChoices'); if (!c) return; c.innerHTML = '';
  currentChoices.forEach((l,i) => {
    const b = document.createElement('div');
    b.className = 'letter-choice'+(usedChoiceIndices.includes(i)?' used':''); b.textContent = l;
    b.addEventListener('click', () => addSpellingSlot(i,l)); c.appendChild(b);
  });
}
function addSpellingSlot(ci, l) {
  const confirmBtn = document.getElementById('dqConfirmBtn');
  if (confirmBtn && confirmBtn.style.display === 'none') return; // already answered
  if (usedChoiceIndices.includes(ci)) return;
  const fi = currentSlots.indexOf(null); if (fi===-1) return;
  currentSlots[fi] = l; choiceMap[fi] = ci; usedChoiceIndices.push(ci);
  renderSpellingSlots(); renderSpellingChoices();
  if (currentSlots.indexOf(null) === -1 && confirmBtn) confirmBtn.disabled = false;
}
function removeSpellingSlot(si) {
  const confirmBtn = document.getElementById('dqConfirmBtn');
  if (confirmBtn && confirmBtn.style.display === 'none') return; // already answered
  if (choiceMap[si] === undefined) return;
  const ci = choiceMap[si];
  usedChoiceIndices = usedChoiceIndices.filter(x=>x!==ci);
  delete choiceMap[si];
  currentSlots[si] = null;
  renderSpellingSlots(); renderSpellingChoices();
  if (confirmBtn) confirmBtn.disabled = true;
}

// ══════════════════════════════════════
// DAILY QUIZ
// ══════════════════════════════════════
// Six types:
// A: fill-blank (example sentence with word blanked, true underline cloze) → 4 MCQ options (EN words)
// B: see Chinese → 4 MCQ options (EN words)
// C: see English → 4 MCQ options (Chinese meanings)
// L: listening (TTS speaks the English word) → 4 MCQ options (EN words)
// S: spelling (see Chinese, spell the English word with letter tiles)
// O: letter ordering (see Chinese, order all letters into the English word)

function buildDailyPool(cards, urec) {
  // priority: known > new > unknown (cap 10)
  const known = cards.filter(c => urec.known.includes(c.en));
  const newW  = cards.filter(c => !urec.known.includes(c.en) && !urec.unknown.includes(c.en));
  const unk   = cards.filter(c => urec.unknown.includes(c.en));
  let pool = [...known.sort(() => Math.random()-0.5)];
  if (pool.length < 10) pool.push(...newW.sort(() => Math.random()-0.5));
  if (pool.length < 10) pool.push(...unk.sort(() => Math.random()-0.5));
  return pool.slice(0, 10);
}

// find the word's position in the example sentence to build a true cloze (prefix/suffix split)
function findClozeSpan(ex, en) {
  if (!ex || !en) return null;
  const sentence = ex.split('/')[0].trim();
  const regex = new RegExp('\\b' + en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b', 'i');
  const m = sentence.match(regex);
  if (!m) return null;
  const start = m.index, end = start + m[0].length;
  return { prefix: sentence.slice(0, start), matched: m[0], suffix: sentence.slice(end) };
}

function makeDailyQuestion(card, allCards) {
  // pick random type
  const types = ['A','B','C','L','S','O'];
  // filter: A requires a usable cloze span in the example sentence
  const clozeSpan = card.ex ? findClozeSpan(card.ex, card.en) : null;
  const available = clozeSpan ? types : ['B','C','L','S','O'];
  const type = available[Math.floor(Math.random()*available.length)];

  // pick 3 wrong options from same batch
  const others = allCards.filter(c => c.en !== card.en);
  const shuffled = [...others].sort(() => Math.random()-0.5);
  const wrong3 = shuffled.slice(0,3);

  if (type === 'A') {
    const options = shuffle4([card.en, ...wrong3.map(c=>c.en)]);
    const maxLen = Math.max(...options.map(o => o.length));
    return { type:'A', sentencePrefix: clozeSpan.prefix, sentenceSuffix: clozeSpan.suffix, answer: card.en, options, maxLen, card };
  } else if (type === 'B') {
    // show Chinese, pick English
    const options = shuffle4([card.en, ...wrong3.map(c=>c.en)]);
    return { type:'B', question: card.zh + (card.pos ? `（${card.pos}）` : ''), answer: card.en, options, card };
  } else if (type === 'C') {
    // show English, pick Chinese
    const options = shuffle4([card.zh, ...wrong3.map(c=>c.zh)]);
    return { type:'C', question: card.en, answer: card.zh, options, card };
  } else if (type === 'L') {
    // listening: speak the English word, pick the EN word heard
    const options = shuffle4([card.en, ...wrong3.map(c=>c.en)]);
    return { type:'L', question: card.en, answer: card.en, options, card };
  } else if (type === 'S') {
    // spelling: show Chinese, spell the English word with letter tiles
    const puzzle = buildSpellingPuzzle(card.en);
    return { type:'S', question: card.zh + (card.pos ? `（${card.pos}）` : ''), answer: card.en, puzzle, card };
  } else {
    const answer = card.en.toLowerCase().split('/')[0].trim().replace(/[^a-zA-Z]/g, '');
    const letters = answer.split('').sort(() => Math.random()-0.5);
    return { type:'O', question: card.zh + (card.pos ? `（${card.pos}）` : ''), answer: card.en, letters, card };
  }
}

function shuffle4(arr) { return [...arr].sort(() => Math.random()-0.5); }

function speakWord(text) {
  if (!('speechSynthesis' in window)) { alert('当前设备不支持语音朗读'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.9;
  speechSynthesis.speak(u);
}

async function startDailyQuiz() {
  resultContext = 'daily';
  const batch = getCurrentBatch();
  currentUserRec = await loadUserBatch(currentBatchId);
  const pool = buildDailyPool(batch.cards, currentUserRec);
  if (pool.length === 0) { alert('还没有单词可以测验哦！'); return; }
  const allCards = batch.cards;
  dqQuestions = pool.map(card => makeDailyQuestion(card, allCards));
  dqIndex = 0; dqCorrect = 0; dqWrongList = []; dqSelectedOpt = null;
  showScreen('screenDailyQuiz'); renderDQQuestion();
}

function renderDQQuestion() {
  const total = dqQuestions.length;
  document.getElementById('dqCount').textContent = `${dqIndex+1}/${total}`;
  document.getElementById('dqFill').style.width = `${((dqIndex+1)/total)*100}%`;
  const q = dqQuestions[dqIndex];
  dqSelectedOpt = null;
  const wrap = document.getElementById('dqWrap');
  wrap.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'dq-card';
  const taskType = typeof getChallengeQuestionType === 'function' ? getChallengeQuestionType(q) : null;
  if (taskType) {
    card.innerHTML = taskType.render(q);
    wrap.appendChild(card);
    taskType.setup(q);
    return;
  }
  const typeLabels = {A:'A 型 · 例句填空', B:'B 型 · 选英文', C:'C 型 · 选中文', L:'L 型 · 听力辨词', S:'S 型 · 拼写', O:'O 型 · 字母排序'};
  const typeClasses = {A:'dq-type-A', B:'dq-type-B', C:'dq-type-C', L:'dq-type-L', S:'dq-type-S', O:'dq-type-O'};

  if (q.type === 'A') {
    card.innerHTML = `
      <span class="dq-type-badge ${typeClasses.A}">${typeLabels.A}</span>
      <div class="dq-sentence" id="dqSentence">${q.sentencePrefix}<span class="dq-blank" id="dqBlank" style="min-width:${q.maxLen+1}ch"></span>${q.sentenceSuffix}</div>
      <div class="dq-options" id="dqOptions"></div>
      <button class="dq-confirm-btn" id="dqConfirmBtn" disabled onclick="confirmDQAnswer()">确认</button>
      <div class="dq-feedback" id="dqFeedback"></div>
      <button class="dq-next-btn" id="dqNextBtn" onclick="nextDQ()">下一题 →</button>
    `;
  } else if (q.type === 'L') {
    card.innerHTML = `
      <span class="dq-type-badge ${typeClasses.L}">${typeLabels.L}</span>
      <div class="dq-listen-zone">
        <button class="dq-listen-btn" id="dqListenBtn" onclick="speakWord('${q.question.replace(/'/g,"\\'")}')">🔊</button>
        <div class="dq-listen-hint">点击播放，选出听到的单词</div>
      </div>
      <div class="dq-options" id="dqOptions"></div>
      <button class="dq-confirm-btn" id="dqConfirmBtn" disabled onclick="confirmDQAnswer()">确认</button>
      <div class="dq-feedback" id="dqFeedback"></div>
      <button class="dq-next-btn" id="dqNextBtn" onclick="nextDQ()">下一题 →</button>
    `;
  } else if (q.type === 'S') {
    card.innerHTML = `
      <span class="dq-type-badge ${typeClasses.S}">${typeLabels.S}</span>
      <div class="dq-question">${q.question}</div>
      <div class="letter-slots" id="letterSlots"></div>
      <div class="letter-choices" id="letterChoices"></div>
      <button class="dq-confirm-btn" id="dqConfirmBtn" disabled onclick="confirmDQAnswer()">确认</button>
      <div class="dq-feedback" id="dqFeedback"></div>
      <button class="dq-next-btn" id="dqNextBtn" onclick="nextDQ()">下一题 →</button>
    `;
  } else if (q.type === 'O') {
    card.innerHTML = `
      <span class="dq-type-badge ${typeClasses.O}">${typeLabels.O}</span>
      <div class="dq-question">${q.question}</div>
      <div class="review-answer-box" id="dqOrderAnswer"></div>
      <div class="review-letter-row" id="dqOrderLetters">
        ${q.letters.map((l, i) => `<button class="review-letter" data-i="${i}" onclick="pickDQOrderLetter(this,'${l.replace(/'/g,"\\'")}')">${l}</button>`).join('')}
      </div>
      <button class="dq-confirm-btn" id="dqConfirmBtn" disabled onclick="confirmDQAnswer()">确认</button>
      <div class="dq-feedback" id="dqFeedback"></div>
      <button class="dq-next-btn" id="dqNextBtn" onclick="nextDQ()">下一题 →</button>
    `;
  } else {
    card.innerHTML = `
      <span class="dq-type-badge ${typeClasses[q.type]}">${typeLabels[q.type]}</span>
      <div class="dq-question">${q.question}</div>
      <div class="dq-options" id="dqOptions"></div>
      <button class="dq-confirm-btn" id="dqConfirmBtn" disabled onclick="confirmDQAnswer()">确认</button>
      <div class="dq-feedback" id="dqFeedback"></div>
      <button class="dq-next-btn" id="dqNextBtn" onclick="nextDQ()">下一题 →</button>
    `;
  }
  wrap.appendChild(card);

  if (q.type === 'S') {
    // init spelling tile state from precomputed puzzle
    currentSlots = [...q.puzzle.slots];
    slotAnswers = q.puzzle.slotAnswers;
    currentChoices = [...q.puzzle.choices];
    choiceMap = {}; usedChoiceIndices = [];
    renderSpellingSlots(); renderSpellingChoices();
  } else if (q.type === 'O') {
    currentSlots = [];
  } else {
    // render MCQ options
    const optWrap = document.getElementById('dqOptions');
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'dq-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectDQOpt(i, opt));
      optWrap.appendChild(btn);
    });
  }

  // auto-play once for listening questions
  if (q.type === 'L') speakWord(q.question);
}

function pickDQOrderLetter(btn, letter) {
  const confirmBtn = document.getElementById('dqConfirmBtn');
  if (confirmBtn && confirmBtn.style.display === 'none') return;
  btn.disabled = true;
  btn.style.opacity = '0.35';
  currentSlots.push(letter);
  document.getElementById('dqOrderAnswer').textContent = currentSlots.join('');
  const q = dqQuestions[dqIndex];
  const answer = q.answer.toLowerCase().split('/')[0].trim().replace(/[^a-zA-Z]/g, '');
  if (currentSlots.length >= answer.length && confirmBtn) confirmBtn.disabled = false;
}

function selectDQOpt(i, val) {
  if (document.getElementById('dqConfirmBtn').style.display === 'none') return; // already answered
  dqSelectedOpt = val;
  const opts = document.querySelectorAll('.dq-opt');
  opts.forEach((b,j) => { b.className = 'dq-opt' + (j===i ? ' selected' : ''); });
  document.getElementById('dqConfirmBtn').disabled = false;
  const blank = document.getElementById('dqBlank');
  if (blank) { blank.textContent = val; blank.className = 'dq-blank filled-preview'; }
}

function confirmDQAnswer() {
  const q = dqQuestions[dqIndex];
  const taskType = typeof getChallengeQuestionType === 'function' ? getChallengeQuestionType(q) : null;
  if (taskType) {
    const result = taskType.grade(q);
    if (!result.ready) return;
    taskType.applyResult(q, result);
    return;
  }
  if (q.type === 'S') {
    if (currentSlots.indexOf(null) !== -1) return; // not filled yet
    const correct = slotAnswers.every((l, i) => currentSlots[i] && currentSlots[i].toLowerCase() === l.toLowerCase());
    document.querySelectorAll('.letter-slot').forEach((s, i) => {
      if (choiceMap[i] !== undefined) {
        s.className = 'letter-slot ' + (currentSlots[i] && currentSlots[i].toLowerCase() === slotAnswers[i].toLowerCase() ? 'correct' : 'wrong');
      }
    });
    const fb = document.getElementById('dqFeedback');
    document.getElementById('dqConfirmBtn').style.display = 'none';
    document.getElementById('dqNextBtn').style.display = 'block';
    if (correct) {
      dqCorrect++;
      fb.className = 'dq-feedback correct-fb';
      fb.textContent = '🎉 正确！';
    } else {
      dqWrongList.push(q.card);
      if (typeof markCardUnknown === 'function') markCardUnknown(q.card);
      fb.className = 'dq-feedback wrong-fb';
      fb.innerHTML = `❌ 正确答案：<strong>${q.answer}</strong>　${q.card.en} — ${q.card.zh}`;
    }
    return;
  }
  if (q.type === 'O') {
    const answer = q.answer.toLowerCase().split('/')[0].trim().replace(/[^a-zA-Z]/g, '');
    const picked = currentSlots.join('').toLowerCase();
    const correct = picked === answer;
    document.querySelectorAll('#dqOrderLetters .review-letter').forEach(b => b.disabled = true);
    const fb = document.getElementById('dqFeedback');
    document.getElementById('dqConfirmBtn').style.display = 'none';
    document.getElementById('dqNextBtn').style.display = 'block';
    if (correct) {
      dqCorrect++;
      fb.className = 'dq-feedback correct-fb';
      fb.textContent = '🎉 正确！';
    } else {
      dqWrongList.push(q.card);
      if (typeof markCardUnknown === 'function') markCardUnknown(q.card);
      fb.className = 'dq-feedback wrong-fb';
      fb.innerHTML = `❌ 正确答案：<strong>${q.answer}</strong>　${q.card.en} — ${q.card.zh}`;
    }
    return;
  }

  if (dqSelectedOpt === null) return;
  const correct = dqSelectedOpt === q.answer;
  // style options
  const opts = document.querySelectorAll('.dq-opt');
  opts.forEach(b => {
    b.disabled = true;
    if (b.textContent === q.answer) b.className = 'dq-opt correct-ans';
    else if (b.textContent === dqSelectedOpt && !correct) b.className = 'dq-opt wrong-ans';
    else b.className = 'dq-opt';
  });
  const blank = document.getElementById('dqBlank');
  if (blank) { blank.textContent = dqSelectedOpt; blank.className = 'dq-blank ' + (correct ? 'correct-ans' : 'wrong-ans'); }
  const fb = document.getElementById('dqFeedback');
  document.getElementById('dqConfirmBtn').style.display = 'none';
  document.getElementById('dqNextBtn').style.display = 'block';
  if (correct) {
    dqCorrect++;
    fb.className = 'dq-feedback correct-fb';
    fb.textContent = '🎉 正确！';
  } else {
    dqWrongList.push(q.card);
    if (typeof markCardUnknown === 'function') markCardUnknown(q.card);
    fb.className = 'dq-feedback wrong-fb';
    fb.innerHTML = `❌ 正确答案：<strong>${q.answer}</strong>　${q.card.en} — ${q.card.zh}`;
  }
}

async function nextDQ() {
  dqIndex++;
  if (dqIndex < dqQuestions.length) renderDQQuestion();
  else {
    if (activeTask && activeTask.mode === 'challenge') await completeActiveChallenge(dqCorrect, dqQuestions.length);
    else markCheckIn('quiz');
    showResult(dqCorrect, dqQuestions.length, dqWrongList);
  }
}

// ══════════════════════════════════════
