const REVIEW_CARD_POOL_LIMIT = 20;
const REVIEW_STEP_TEMPLATE = Object.freeze([
  { type: 'match', count: 1 },
  { type: 'repeat', count: 3 },
  { type: 'listen', count: 3 },
  { type: 'phonetic', count: 2 },
  { type: 'blank', count: 3 },
  { type: 'sort', count: 2 },
  { type: 'dictation', count: 2 },
  { type: 'collocation', count: 2 },
  { type: 'sentenceOrder', count: 2 }
]);
const REVIEW_STEP_LIMIT = REVIEW_STEP_TEMPLATE.reduce((total, item) => total + item.count, 0);

const REVIEW_TYPE_FALLBACKS = Object.freeze({
  repeat: ['listen', 'blank', 'sort'],
  listen: ['blank', 'repeat'],
  phonetic: ['listen', 'blank'],
  blank: ['listen', 'repeat'],
  sort: ['blank', 'listen'],
  dictation: ['sort', 'blank'],
  collocation: ['blank', 'listen'],
  sentenceOrder: ['collocation', 'sort']
});

function reviewCardKey(card) {
  return String(getCardWord(card) || '').trim().toLocaleLowerCase();
}

function uniqueReviewCards(cards) {
  const seen = new Set();
  return (Array.isArray(cards) ? cards : []).filter(card => {
    const key = reviewCardKey(card);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isReviewTypeAvailable(typeId, card, allCards) {
  const questionType = getQuestionType('review', typeId);
  if (!questionType || !card) return false;
  if (!questionType.isAvailable) return true;
  try {
    return !!questionType.isAvailable(card, allCards);
  } catch (error) {
    console.warn(`[review-plan] ${typeId} 可用性检查失败`, reviewCardKey(card), error);
    return false;
  }
}

function orderedReviewCandidates(pool, usedWords, previousWord, typeId, allCards) {
  const supported = pool.filter(card => isReviewTypeAvailable(typeId, card, allCards));
  if (supported.length === 0) return [];

  const unused = supported.filter(card => !usedWords.has(reviewCardKey(card)));
  const candidates = unused.length > 0 ? unused : shuffled(supported);
  return [
    ...candidates.filter(card => reviewCardKey(card) !== previousWord),
    ...candidates.filter(card => reviewCardKey(card) === previousWord)
  ];
}

function tryBuildReviewStep(typeId, requestedType, pool, allCards, usedWords, previousWord) {
  const questionType = getQuestionType('review', typeId);
  if (!questionType) return null;
  const candidates = orderedReviewCandidates(pool, usedWords, previousWord, typeId, allCards);

  for (const card of candidates) {
    let step = null;
    try {
      step = questionType.build(card, allCards);
    } catch (error) {
      console.warn(`[review-plan] ${typeId} 构建失败`, reviewCardKey(card), error);
    }
    if (!step) continue;
    const key = reviewCardKey(card);
    usedWords.add(key);
    return {
      ...step,
      requestedType,
      ...(typeId !== requestedType ? { fallbackFrom: requestedType } : {})
    };
  }
  return null;
}

function buildReviewMatchStep(pool) {
  const cards = pool.filter(card => reviewCardKey(card)).slice(0, 4);
  if (cards.length === 0) return null;
  const questionType = getQuestionType('review', 'match');
  if (!questionType) return null;
  const step = questionType.build(cards);
  return step ? { ...step, requestedType: 'match' } : null;
}

function buildReviewPlan(deck, allCards) {
  const pool = uniqueReviewCards(deck);
  const optionPool = uniqueReviewCards([...(Array.isArray(allCards) ? allCards : []), ...pool]);
  if (pool.length === 0) return [];

  const plan = [];
  const usedWords = new Set();
  let previousWord = '';

  REVIEW_STEP_TEMPLATE.forEach(templateItem => {
    for (let index = 0; index < templateItem.count; index++) {
      if (templateItem.type === 'match') {
        const matchStep = buildReviewMatchStep(pool);
        if (matchStep) plan.push(matchStep);
        continue;
      }

      const candidateTypes = [templateItem.type, ...(REVIEW_TYPE_FALLBACKS[templateItem.type] || [])];
      let step = null;
      for (const typeId of candidateTypes) {
        step = tryBuildReviewStep(
          typeId,
          templateItem.type,
          pool,
          optionPool,
          usedWords,
          previousWord
        );
        if (step) break;
      }
      if (!step) continue;
      plan.push(step);
      previousWord = reviewCardKey(step.card);
    }
  });

  return plan;
}

function buildReviewSteps(deck) {
  reviewSteps = buildReviewPlan(deck, activeTaskAllCards);
  reviewIndex = 0;
  return reviewSteps;
}

function cleanupReviewStepResources() {
  if (typeof stopReviewRecording === 'function') stopReviewRecording();
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

function renderReviewStep() {
  cleanupReviewStepResources();
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
        <button class="memory-card" data-i="${i}" data-side="${t.side}" data-pair-key="${escapeAttr(t.pairKey)}" data-text="${escapeAttr(t.text)}">
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
  const ok = first.dataset.pairKey === btn.dataset.pairKey && first.dataset.side !== btn.dataset.side;
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
    const card = activeTaskAllCards.find(c => getCardWord(c) === cardEn) || { word: cardEn, meaning: '' };
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
    const card = activeTaskAllCards.find(c => getCardWord(c) === cardEn) || { word: cardEn, meaning: '' };
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
      ${renderEnglishCardBackHtml(card, { answerNote: true })}
    </div>`;
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
  cleanupReviewStepResources();
  reviewIndex++;
  renderReviewStep();
}

async function finishReviewRound() {
  cleanupReviewStepResources();
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
  cleanupReviewStepResources();
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
  cleanupReviewStepResources();
  reviewWrongIndex++;
  renderWrongReviewCard();
}

function finishReviewToSource() {
  cleanupReviewStepResources();
  finishTaskToSource();
}

function escapeJs(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
