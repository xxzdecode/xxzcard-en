function buildReviewSteps(deck) {
  reviewSteps = [];
  const pool = deck.slice(0, 20);
  const matchCards = pool.slice(0, 8);
  for (let i = 0; i < matchCards.length; i += 4) {
    reviewSteps.push(getQuestionType('review', 'match').build(matchCards.slice(i, i + 4)));
  }
  addReviewTypeSteps('repeat', pool.slice(8, 12));
  addReviewTypeSteps('blank', pool.slice(12, 15));
  addReviewTypeSteps('listen', pool.slice(15, 18));
  addReviewTypeSteps('sort', pool.slice(18, 20));
  reviewIndex = 0;
}

function addReviewTypeSteps(type, cards) {
  const questionType = getQuestionType('review', type);
  cards.forEach(card => reviewSteps.push(questionType.build(card, activeTaskAllCards)));
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
  const questionType = getQuestionType('review', step.type);
  if (!questionType) throw new Error(`未注册的温习题型: ${step.type}`);
  questionType.render(step);
}

function reviewCardShell(type, body) {
  document.getElementById('reviewWrap').innerHTML = `<div class="review-card"><span class="review-type">${type}</span>${body}</div>`;
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

function answerReviewChoice(btn, picked, answer, cardEn) {
  const ok = String(picked).toLowerCase() === String(answer).toLowerCase();
  document.querySelectorAll('.review-opt').forEach(b => b.disabled = true);
  btn.classList.add(ok ? 'correct' : 'wrong');
  if (ok) {
    setTimeout(nextReviewStep, 260);
  } else {
    const card = activeTaskAllCards.find(c => getCardWord(c) === cardEn) || { en: cardEn, zh: '' };
    addReviewWrong(card);
    setTimeout(() => showReviewCorrection(card), 260);
  }
}

function checkReviewSort(cardEn) {
  const answer = simpleWord(cardEn);
  if (!reviewOrderController || !reviewOrderController.isComplete()) return;
  const picked = reviewOrderController.value();
  reviewOrderController.lock();
  const ok = picked.toLowerCase() === answer.toLowerCase();
  if (ok) {
    nextReviewStep();
  } else {
    const card = activeTaskAllCards.find(c => getCardWord(c) === cardEn) || { en: cardEn, zh: '' };
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
  normalizeEnglishCard(card);
  const word = getCardWord(card);
  return `
    <div class="back-header">
      <div class="en-word">${escapeHtml(word)}</div>
      <button class="speak-btn" onclick="speakWord('${escapeJs(word)}')">🔊</button>
    </div>
    <div class="back-body">
      ${renderEnglishCardBackHtml(card, { includeLegacy: true, answerNote: true })}
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
  const word = getCardWord(card);
  if (!reviewWrongCards.some(c => getCardWord(c) === word)) reviewWrongCards.push(card);
}

async function markCardUnknown(card) {
  const word = getCardWord(card);
  if (isTeacher() || !card || !word) return;
  if (!canWriteCloudData()) return;
  const batchId = card._batchId || (activeTask && activeTask.batchId) || currentBatchId;
  if (!batchId) return;
  const rec = await loadUserBatch(String(batchId));
  if (!rec.unknown.includes(word)) rec.unknown.push(word);
  rec.known = rec.known.filter(x => x !== word);
  if (!await saveUserBatch(String(batchId), rec)) return;
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
  if (!await saveReviewComplete(activeTask.key)) return;
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
    saveReviewComplete(activeTask.key).then(saved => {
      if (!saved) return;
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

function escapeJs(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
