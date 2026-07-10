// STUDY
// ══════════════════════════════════════
async function startStudy(mode) {
  studyIsGlobal = false;
  resultContext = '';
  studyMode = mode;
  const batch = getCurrentBatch();
  currentUserRec = await loadUserBatch(currentBatchId);
  if (mode === 'all') {
    studyDeck = [...batch.cards];
    document.getElementById('modeLabel').textContent = '📖 全部学习';
  } else if (mode === 'shuffle') {
    studyDeck = [...batch.cards].sort(() => Math.random()-0.5);
    document.getElementById('modeLabel').textContent = '🔀 随机模式';
  } else if (mode === 'pool') {
    studyDeck = batch.cards.filter(c => currentUserRec.unknown.includes(getCardWord(c))).sort(() => Math.random()-0.5);
    document.getElementById('modeLabel').textContent = '💪 生词池';
  }
  studyCurrent = 0; studyFlipped = false;
  showScreen('screenStudy'); renderStudyCard();
}

function renderStudyCard() {
  const c = studyDeck[studyCurrent];
  normalizeEnglishCard(c);
  const idx = studyCurrent;
  document.getElementById('cardEmoji').style.background = getBg(idx);
  document.getElementById('cardEmoji').textContent = getEmoji(c, idx);
  document.getElementById('cardZh').innerHTML = `
    <span class="front-word">${escapeHtml(getCardWord(c))}</span>
    ${c.phonetic ? `<span class="front-phonetic">${escapeHtml(c.phonetic)}</span>` : ''}
  `;
  document.getElementById('cardPos').textContent = c.pos || '';
  document.getElementById('cardEn').textContent = getCardWord(c);
  const bb = document.getElementById('backBody');
  bb.innerHTML = renderEnglishCardBackHtml(c, { includeLegacy: true });
  const total = studyDeck.length;
  document.getElementById('progressCount').textContent = `${studyCurrent+1}/${total}`;
  document.getElementById('progressFill').style.width = `${((studyCurrent+1)/total)*100}%`;
  setFlipped(studyFlipped); buildDots();
}
function setFlipped(v) {
  studyFlipped = v;
  const w = document.getElementById('cardWrapper');
  v ? w.classList.add('flipped') : w.classList.remove('flipped');
  document.getElementById('flipBtn').textContent = v ? '翻回正面' : '翻面 · 查看释义';
}
function toggleFlip() { setFlipped(!studyFlipped); }
function recForCard(c) {
  if (studyIsGlobal && c._batchId) return globalUserRecs[String(c._batchId)] || {known:[],unknown:[]};
  return currentUserRec;
}
function buildDots() {
  const row = document.getElementById('dotRow'); row.innerHTML = '';
  studyDeck.forEach((c,i) => {
    const rec = recForCard(c);
    const word = getCardWord(c);
    const d = document.createElement('div');
    d.className = i===studyCurrent ? 'dot active'
      : rec.known.includes(word) ? 'dot known'
      : rec.unknown.includes(word) ? 'dot unknown' : 'dot';
    d.addEventListener('click', () => { studyCurrent = i; studyFlipped = false; renderStudyCard(); });
    row.appendChild(d);
  });
}
async function judge(known) {
  if (!canWriteCloudData()) return;
  const c = studyDeck[studyCurrent];
  const en = getCardWord(c);
  if (studyIsGlobal && c._batchId) {
    const bId = String(c._batchId);
    if (!globalUserRecs[bId]) globalUserRecs[bId] = await loadUserBatch(bId);
    const rec = globalUserRecs[bId];
    if (known) { if (!rec.known.includes(en)) rec.known.push(en); rec.unknown = rec.unknown.filter(x=>x!==en); }
    else { if (!rec.unknown.includes(en)) rec.unknown.push(en); rec.known = rec.known.filter(x=>x!==en); }
    if (!await saveUserBatch(bId, rec)) return;
  } else {
    if (known) {
      if (!currentUserRec.known.includes(en)) currentUserRec.known.push(en);
      currentUserRec.unknown = currentUserRec.unknown.filter(x=>x!==en);
    } else {
      if (!currentUserRec.unknown.includes(en)) currentUserRec.unknown.push(en);
      currentUserRec.known = currentUserRec.known.filter(x=>x!==en);
    }
    if (!await saveUserRec()) return;
  }
  animateSwipe(known);
}
function animateSwipe(known) {
  const wrapper = document.getElementById('cardWrapper');
  const overlay = document.getElementById('swipeOverlay');
  overlay.textContent = known ? '✅' : '❌';
  overlay.className = 'swipe-overlay ' + (known ? 'show-yes' : 'show-no');
  wrapper.style.transition = 'transform 0.32s ease, opacity 0.32s ease';
  wrapper.style.transform = `translateX(${known?150:-150}px) rotate(${known?7:-7}deg)`;
  wrapper.style.opacity = '0';
  setTimeout(async () => {
    overlay.className = 'swipe-overlay';
    wrapper.style.transition = 'none';
    wrapper.style.transform = '';
    wrapper.style.opacity = '1';
    setTimeout(() => { wrapper.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1)'; }, 20);
    if (studyCurrent < studyDeck.length - 1) { studyCurrent++; renderStudyCard(); }
    else {
      if (studyMode === 'shuffle') await markCheckIn('study');
      goDetail();
    }
  }, 340);
}

document.getElementById('cardWrapper').addEventListener('click', () => { if (!dragging) toggleFlip(); });
document.getElementById('backBody').addEventListener('click', e => {
  const link = e.target.closest('.word-link');
  if (link) {
    e.stopPropagation();
    jumpToWordLink(link.dataset.batch, parseInt(link.dataset.idx, 10));
    return;
  }
  if (e.target.closest('.more-details')) e.stopPropagation();
});
document.getElementById('speakBtn').addEventListener('click', e => {
  e.stopPropagation();
  const text = getCardWord(studyDeck[studyCurrent]).split('/')[0].trim();
  if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate=0.9; speechSynthesis.speak(u); }
});
const stageEl = document.getElementById('stage');
stageEl.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; dragging = false; dragX = 0; }, {passive:true});
stageEl.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - touchStartX;
  if (Math.abs(dx) > 10) {
    dragging = true; dragX = dx;
    const w = document.getElementById('cardWrapper');
    const ov = document.getElementById('swipeOverlay');
    w.style.transition = 'none';
    w.style.transform = `translateX(${dx*0.55}px) rotate(${dx*0.025}deg)`;
    if (dx>30) { ov.textContent='✅'; ov.className='swipe-overlay show-yes'; }
    else if (dx<-30) { ov.textContent='❌'; ov.className='swipe-overlay show-no'; }
    else { ov.className='swipe-overlay'; }
  }
}, {passive:true});
stageEl.addEventListener('touchend', () => {
  document.getElementById('swipeOverlay').className = 'swipe-overlay';
  if (Math.abs(dragX) > 65) { judge(dragX > 0); }
  else {
    const w = document.getElementById('cardWrapper');
    w.style.transition = 'transform 0.3s ease'; w.style.transform = '';
    setTimeout(() => { dragging = false; }, 300);
  }
  dragX = 0;
}, {passive:true});

// ══════════════════════════════════════
