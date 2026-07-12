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
  const known = cards.filter(c => urec.known.includes(getCardWord(c)));
  const newW  = cards.filter(c => !urec.known.includes(getCardWord(c)) && !urec.unknown.includes(getCardWord(c)));
  const unk   = cards.filter(c => urec.unknown.includes(getCardWord(c)));
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
  return makeQuestion('challenge', card, allCards, CHALLENGE_TYPE_IDS, 'daily');
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
  throw new Error(`未注册的挑战题型: ${q.type}`);
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
  throw new Error(`未注册的挑战题型: ${q.type}`);
}

async function nextDQ() {
  dqIndex++;
  if (dqIndex < dqQuestions.length) renderDQQuestion();
  else {
    if (activeTask && activeTask.mode === 'challenge') {
      if (!await completeActiveChallenge(dqCorrect, dqQuestions.length)) return;
    }
    else markCheckIn('quiz');
    showResult(dqCorrect, dqQuestions.length, dqWrongList);
  }
}

// ══════════════════════════════════════
