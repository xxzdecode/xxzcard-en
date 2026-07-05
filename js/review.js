async function startReviewTask(task) {
  const deck = await prioritizedTaskDeck(task.deck, 20, task.batchId);
  if (deck.length === 0) { alert('还没有单词可以温习'); return; }
  activeTask = {...task, mode: 'review'};
  activeTaskDeck = deck;
  activeTaskAllCards = task.allCards && task.allCards.length >= 4 ? task.allCards : deck;
  activeTaskReturn = task.returnTo || 'home';
  if (task.batchId) currentBatchId = String(task.batchId);
  reviewRound = 1;
  reviewWrongCards = [];
  buildReviewSteps(deck);
  showScreen('screenReview');
  renderReviewStep();
}

function buildReviewSteps(deck) {
  reviewSteps = [];
  const pool = deck.slice(0, 20);
  const matchCards = pool.slice(0, 8);
  for (let i = 0; i < matchCards.length; i += 4) {
    reviewSteps.push({ type: 'match', cards: matchCards.slice(i, i + 4) });
  }
  addReviewTypeSteps('repeat', pool.slice(8, 12));
  addReviewTypeSteps('blank', pool.slice(12, 15));
  addReviewTypeSteps('listen', pool.slice(15, 18));
  addReviewTypeSteps('sort', pool.slice(18, 20));
  reviewIndex = 0;
}

function addReviewTypeSteps(type, cards) {
  cards.forEach(card => reviewSteps.push({ type, card }));
}

function renderReviewStep() {
  if (reviewIndex >= reviewSteps.length) {
    finishReviewRound();
    return;
  }
  const step = reviewSteps[reviewIndex];
  document.getElementById('reviewModeLabel').textContent = activeTask.title + (reviewRound > 1 ? ' · 错题再练' : '');
  document.getElementById('reviewCount').textContent = `${reviewIndex + 1}/${reviewSteps.length}`;
  document.getElementById('reviewFill').style.width = `${((reviewIndex + 1) / reviewSteps.length) * 100}%`;
  if (step.type === 'match') renderReviewMatch(step);
  if (step.type === 'repeat') renderReviewRepeat(step.card);
  if (step.type === 'blank') renderReviewBlank(step.card);
  if (step.type === 'listen') renderReviewListen(step.card);
  if (step.type === 'sort') renderReviewSort(step.card);
}

function reviewCardShell(type, body) {
  document.getElementById('reviewWrap').innerHTML = `<div class="review-card"><span class="review-type">${type}</span>${body}</div>`;
}

function renderReviewMatch(step) {
  reviewMatchSelection = null;
  reviewMatchPairsDone = 0;
  reviewMatchLocked = false;
  step.tiles = step.cards.flatMap(c => [
    { side: 'en', en: c.en, text: c.en },
    { side: 'zh', en: c.en, text: c.zh || c.en }
  ]).sort(() => Math.random() - 0.5);
  reviewCardShell('对对碰', `
    <div class="match-preview-grid">
      ${step.cards.map(c => `
        <div class="match-preview-card">
          <div class="match-preview-emoji">${c.emoji || '📚'}</div>
          <div class="match-preview-en">${c.en}</div>
          <div class="match-preview-zh">${c.zh || ''}</div>
        </div>`).join('')}
    </div>
    <button class="review-action secondary" onclick="startReviewMatchPlay()">我记住了</button>`);
}

function startReviewMatchPlay() {
  const step = reviewSteps[reviewIndex];
  reviewCardShell('对对碰', `
    <div class="review-sub">翻开两张，找到英文和中文朋友</div>
    <div class="review-memory-grid" id="reviewMatchGrid">
      ${step.tiles.map((t, i) => `
        <button class="memory-card" data-i="${i}" data-side="${t.side}" data-en="${escapeAttr(t.en)}" data-text="${escapeAttr(t.text)}">
          <span class="memory-face memory-back">?</span>
          <span class="memory-face memory-front">${t.text}</span>
        </button>`).join('')}
    </div>`);
  document.querySelectorAll('.memory-card').forEach(btn => btn.addEventListener('click', () => chooseReviewMatch(btn, step.cards.length)));
}

function chooseReviewMatch(btn, total) {
  if (reviewMatchLocked || btn.classList.contains('done') || btn.classList.contains('flipped')) return;
  btn.classList.add('flipped');
  if (!reviewMatchSelection) {
    reviewMatchSelection = btn;
    return;
  }
  reviewMatchLocked = true;
  const first = reviewMatchSelection;
  reviewMatchSelection = null;
  const ok = first.dataset.en === btn.dataset.en && first.dataset.side !== btn.dataset.side;
  if (ok) {
    first.classList.add('done');
    btn.classList.add('done');
    reviewMatchPairsDone++;
    setTimeout(() => {
      reviewMatchLocked = false;
      if (reviewMatchPairsDone >= total) nextReviewStep();
    }, 420);
  } else {
    first.classList.add('wrong');
    btn.classList.add('wrong');
    setTimeout(() => {
      first.classList.remove('flipped', 'wrong');
      btn.classList.remove('flipped', 'wrong');
      reviewMatchLocked = false;
    }, 700);
  }
}

function renderReviewRepeat(card) {
  reviewCardShell('跟读', `
    <div class="review-question">${card.en}</div>
    <div class="review-sub">${card.zh || ''}</div>
    <button class="review-action" onclick="speakWord('${escapeJs(card.en)}')">🔊 播放发音</button>
    <button class="review-action secondary" onclick="nextReviewStep()">我读完了</button>`);
  speakWord(card.en);
}

function renderReviewBlank(card) {
  const answer = simpleWord(card.en);
  const part = makeMissingPart(answer);
  const options = makeSegmentOptions(part.missing, answer);
  reviewCardShell('缺字母选择', `
    <div class="review-spell-word">${part.masked}</div>
    <div class="review-sub">${card.zh || ''}</div>
    <div class="review-options">
      ${options.map(o => `<button class="review-opt" onclick="answerReviewChoice(this,'${escapeJs(o)}','${escapeJs(part.missing)}','${escapeJs(card.en)}')">${o}</button>`).join('')}
    </div>`);
}

function renderReviewListen(card) {
  const options = makeWordOptions(card);
  reviewCardShell('听音选词', `
    <button class="review-action" onclick="speakWord('${escapeJs(card.en)}')">🔊 播放</button>
    <div class="review-options">
      ${options.map(o => `<button class="review-opt" onclick="answerReviewChoice(this,'${escapeJs(o)}','${escapeJs(card.en)}','${escapeJs(card.en)}')">${o}</button>`).join('')}
    </div>`);
  speakWord(card.en);
}

function renderReviewSort(card) {
  reviewSortPicked = [];
  const letters = simpleWord(card.en).split('').sort(() => Math.random() - 0.5);
  reviewCardShell('字母排序', `
    <div class="review-question">${card.zh || ''}</div>
    <div class="review-sub">把字母排成正确的英文单词</div>
    <div class="review-answer-box" id="reviewSortAnswer"></div>
    <div class="review-letter-row" id="reviewLetterRow">
      ${letters.map((l, i) => `<button class="review-letter" data-i="${i}" onclick="pickReviewLetter(this,'${escapeJs(l)}')">${l}</button>`).join('')}
    </div>
    <button class="review-action" onclick="checkReviewSort('${escapeJs(card.en)}')">确认</button>`);
}

function answerReviewChoice(btn, picked, answer, cardEn) {
  const ok = String(picked).toLowerCase() === String(answer).toLowerCase();
  document.querySelectorAll('.review-opt').forEach(b => b.disabled = true);
  btn.classList.add(ok ? 'correct' : 'wrong');
  if (ok) {
    setTimeout(nextReviewStep, 260);
  } else {
    const card = activeTaskAllCards.find(c => c.en === cardEn) || { en: cardEn, zh: '' };
    addReviewWrong(card);
    setTimeout(() => showReviewCorrection(card), 260);
  }
}

function pickReviewLetter(btn, letter) {
  btn.disabled = true;
  btn.style.opacity = '0.35';
  reviewSortPicked.push(letter);
  document.getElementById('reviewSortAnswer').textContent = reviewSortPicked.join('');
}

function checkReviewSort(cardEn) {
  const answer = simpleWord(cardEn);
  if (reviewSortPicked.length < answer.length) return;
  const ok = reviewSortPicked.join('').toLowerCase() === answer.toLowerCase();
  if (ok) {
    nextReviewStep();
  } else {
    const card = activeTaskAllCards.find(c => c.en === cardEn) || { en: cardEn, zh: '' };
    addReviewWrong(card);
    showReviewCorrection(card);
  }
}

function showReviewCorrection(card) {
  markCardUnknown(card);
  reviewCardShell('错题卡', `
    <div class="review-full-word-card">
      ${renderWordBackHtml(card)}
      <button class="review-action secondary" id="reviewContinueBtn" style="display:none" onclick="nextReviewStep()">继续</button>
    </div>`);
  setTimeout(() => {
    const btn = document.getElementById('reviewContinueBtn');
    if (btn) btn.style.display = 'block';
  }, 3000);
}

function renderWordBackHtml(card) {
  return `
    <div class="back-header">
      <div class="en-word">${card.en}</div>
      <button class="speak-btn" onclick="speakWord('${escapeJs(card.en)}')">🔊</button>
    </div>
    <div class="back-body">
      <div><div class="sec-label">释义</div><div class="meaning-text">${card.zh || ''}</div></div>
      ${card.emoji ? `<div class="student-word-emoji">${card.emoji}</div>` : ''}
      ${card.ex ? renderExampleHtml(card.ex) : ''}
      <div class="review-answer-note">正确答案：${card.en} / ${card.zh || ''}</div>
    </div>`;
}

function renderExampleHtml(ex) {
  const parts = String(ex).split('/').map(s => s.trim());
  if (parts.length >= 2) {
    return `<div><div class="sec-label">例句</div><div class="example-box"><div class="example-en">${parts.slice(0,-1).join(' / ')}</div><div class="example-zh">${parts[parts.length-1]}</div></div></div>`;
  }
  return `<div><div class="sec-label">例句</div><div class="example-box"><div class="example-en">${ex}</div></div></div>`;
}

function addReviewWrong(card) {
  if (!reviewWrongCards.some(c => c.en === card.en)) reviewWrongCards.push(card);
}

async function markCardUnknown(card) {
  if (isTeacher() || !card || !card.en) return;
  const batchId = card._batchId || (activeTask && activeTask.batchId) || currentBatchId;
  if (!batchId) return;
  const rec = await loadUserBatch(String(batchId));
  if (!rec.unknown.includes(card.en)) rec.unknown.push(card.en);
  rec.known = rec.known.filter(x => x !== card.en);
  await saveUserBatch(String(batchId), rec);
}

function nextReviewStep() {
  reviewIndex++;
  renderReviewStep();
}

async function finishReviewRound() {
  if (reviewWrongCards.length > 0) {
    renderWrongReviewStart();
    return;
  }
  await saveReviewComplete(activeTask.key);
  reviewCardShell('温习完成', `
    <div class="review-question">完成啦！</div>
    <div class="review-sub">今天的温习已经完成。</div>
    <button class="review-action secondary" onclick="finishReviewToSource()">返回</button>`);
}

function renderWrongReviewStart() {
  reviewWrongIndex = 0;
  document.getElementById('reviewModeLabel').textContent = '错题回顾';
  renderWrongReviewCard();
}

function renderWrongReviewCard() {
  const card = reviewWrongCards[reviewWrongIndex];
  if (!card) {
    reviewWrongCards = [];
    saveReviewComplete(activeTask.key).then(() => {
      reviewCardShell('温习完成', `
        <div class="review-question">完成啦！</div>
        <div class="review-sub">错题也回顾完了。</div>
        <button class="review-action secondary" onclick="finishReviewToSource()">返回</button>`);
    });
    return;
  }
  document.getElementById('reviewCount').textContent = `${reviewWrongIndex + 1}/${reviewWrongCards.length}`;
  document.getElementById('reviewFill').style.width = `${((reviewWrongIndex + 1) / reviewWrongCards.length) * 100}%`;
  reviewCardShell('错题回顾', `
    <div class="review-full-word-card">
      ${renderWordBackHtml(card)}
      <button class="review-action secondary" id="wrongReviewNextBtn" style="display:none" onclick="nextWrongReviewCard()">下一张</button>
    </div>`);
  setTimeout(() => {
    const btn = document.getElementById('wrongReviewNextBtn');
    if (btn) btn.style.display = 'block';
  }, 5000);
}

function nextWrongReviewCard() {
  reviewWrongIndex++;
  renderWrongReviewCard();
}

function finishReviewToSource() {
  finishTaskToSource();
}

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

function makeSegmentOptions(answer, word) {
  const pool = ['pp','oo','ee','ai','ch','sh','th','st','ar','or','le','an','in','er'].filter(x => x !== answer);
  return [answer, ...pool.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
}

function makeWordOptions(card) {
  const others = activeTaskAllCards.filter(c => c.en !== card.en).map(c => c.en);
  return [card.en, ...others.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
}

function escapeJs(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
