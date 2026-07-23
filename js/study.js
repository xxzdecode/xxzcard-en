// STUDY
// ══════════════════════════════════════
const STUDY_CARD_RENDER_STYLE_ID = 'studyCardRenderFixStyles';

function isAppleTouchWebKit() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isAppleTouchDevice = /iPad|iPhone|iPod/i.test(ua)
    || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isAppleTouchDevice && /AppleWebKit/i.test(ua);
}

function ensureStudyCardMotionLayer() {
  const wrapper = document.getElementById('cardWrapper');
  if (!wrapper) return null;

  if (!document.getElementById(STUDY_CARD_RENDER_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STUDY_CARD_RENDER_STYLE_ID;
    style.textContent = `
      .card-motion {
        width: 100%; height: 100%; min-height: 0; position: relative;
        border-radius: var(--radius); will-change: transform, opacity;
        transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
      }
      .card-motion > .card-wrapper {
        width: 100%; height: 100%; min-height: 0;
      }
      .card-wrapper {
        transform: rotateY(0deg);
        -webkit-transform: rotateY(0deg);
        will-change: transform;
      }
      .card-wrapper.flipped {
        transform: rotateY(180deg);
        -webkit-transform: rotateY(180deg);
      }
      .card-face {
        isolation: isolate;
        will-change: transform;
      }
      .card-front {
        transform: rotateY(0deg);
        -webkit-transform: rotateY(0deg);
      }
      .card-back {
        transform: rotateY(180deg);
        -webkit-transform: rotateY(180deg);
      }
      .card-face[aria-hidden="true"] { pointer-events: none; }

      html.ios-touch-webkit .card-wrapper,
      html.ios-touch-webkit .card-wrapper.flipped {
        transform: none;
        -webkit-transform: none;
        transform-style: flat;
        -webkit-transform-style: flat;
        transition: none;
      }
      html.ios-touch-webkit .card-face,
      html.ios-touch-webkit .card-front,
      html.ios-touch-webkit .card-back {
        transform: none;
        -webkit-transform: none;
        transform-style: flat;
        -webkit-transform-style: flat;
        backface-visibility: visible;
        -webkit-backface-visibility: visible;
      }
      html.ios-touch-webkit .card-face {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.18s ease, visibility 0s linear 0.18s;
      }
      html.ios-touch-webkit .card-front {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transition-delay: 0s;
      }
      html.ios-touch-webkit .card-wrapper.flipped .card-front {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition-delay: 0s, 0.18s;
      }
      html.ios-touch-webkit .card-wrapper.flipped .card-back {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transition-delay: 0s;
      }
      html.ios-touch-webkit .back-body {
        -webkit-overflow-scrolling: auto;
      }
    `;
    document.head.appendChild(style);
  }

  document.documentElement.classList.toggle('ios-touch-webkit', isAppleTouchWebKit());

  let motion = document.getElementById('cardMotion');
  if (!motion) {
    motion = document.createElement('div');
    motion.id = 'cardMotion';
    motion.className = 'card-motion';
    wrapper.parentNode.insertBefore(motion, wrapper);
    motion.appendChild(wrapper);
  }
  return motion;
}

function resetStudyCardMotion(animateBack = false) {
  const motion = ensureStudyCardMotionLayer();
  if (!motion) return;
  if (typeof motion.getAnimations === 'function') {
    motion.getAnimations().forEach(animation => animation.cancel());
  }
  motion.style.transition = animateBack ? 'transform 0.3s ease' : 'none';
  motion.style.transform = '';
  motion.style.opacity = '1';
  if (!animateBack) {
    requestAnimationFrame(() => { motion.style.transition = ''; });
  }
}

ensureStudyCardMotionLayer();

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
  bb.innerHTML = renderEnglishCardBackHtml(c);
  bb.scrollTop = 0;
  const total = studyDeck.length;
  document.getElementById('progressCount').textContent = `${studyCurrent+1}/${total}`;
  document.getElementById('progressFill').style.width = `${((studyCurrent+1)/total)*100}%`;
  resetStudyCardMotion(false);
  setFlipped(false); buildDots();
}
function setFlipped(v) {
  studyFlipped = Boolean(v);
  const w = document.getElementById('cardWrapper');
  const front = w.querySelector('.card-front');
  const back = w.querySelector('.card-back');

  // The flip layer is class-controlled only. Swipe transforms belong to #cardMotion.
  w.style.removeProperty('transform');
  w.style.removeProperty('transition');
  w.style.removeProperty('opacity');
  w.classList.toggle('flipped', studyFlipped);
  w.dataset.face = studyFlipped ? 'back' : 'front';
  front?.setAttribute('aria-hidden', String(studyFlipped));
  back?.setAttribute('aria-hidden', String(!studyFlipped));

  document.getElementById('flipBtn').textContent = studyFlipped ? '翻回正面' : '翻面 · 查看释义';
  if (studyFlipped) document.getElementById('backBody').scrollTop = 0;
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
  const word = getCardWord(c);
  if (studyIsGlobal && c._batchId) {
    const bId = String(c._batchId);
    if (!globalUserRecs[bId]) globalUserRecs[bId] = await loadUserBatch(bId);
    const rec = globalUserRecs[bId];
    if (known) { if (!rec.known.includes(word)) rec.known.push(word); rec.unknown = rec.unknown.filter(x=>x!==word); }
    else { if (!rec.unknown.includes(word)) rec.unknown.push(word); rec.known = rec.known.filter(x=>x!==word); }
    if (!await saveUserBatch(bId, rec)) return;
  } else {
    if (known) {
      if (!currentUserRec.known.includes(word)) currentUserRec.known.push(word);
      currentUserRec.unknown = currentUserRec.unknown.filter(x=>x!==word);
    } else {
      if (!currentUserRec.unknown.includes(word)) currentUserRec.unknown.push(word);
      currentUserRec.known = currentUserRec.known.filter(x=>x!==word);
    }
    if (!await saveUserRec()) return;
  }
  animateSwipe(known);
}
function animateSwipe(known) {
  const motion = ensureStudyCardMotionLayer();
  const overlay = document.getElementById('swipeOverlay');
  overlay.textContent = known ? '✅' : '❌';
  overlay.className = 'swipe-overlay ' + (known ? 'show-yes' : 'show-no');
  motion.style.transition = 'transform 0.32s ease, opacity 0.32s ease';
  motion.style.transform = `translateX(${known?150:-150}px) rotate(${known?7:-7}deg)`;
  motion.style.opacity = '0';
  setTimeout(async () => {
    overlay.className = 'swipe-overlay';
    resetStudyCardMotion(false);
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
let touchStartY = 0;
let touchDirection = '';
stageEl.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchDirection = '';
  dragging = false;
  dragX = 0;
}, {passive:true});
stageEl.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  if (!touchDirection && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
    touchDirection = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
  }
  if (touchDirection === 'horizontal') {
    dragging = true; dragX = dx;
    const motion = ensureStudyCardMotionLayer();
    const ov = document.getElementById('swipeOverlay');
    motion.style.transition = 'none';
    motion.style.transform = `translateX(${dx*0.55}px) rotate(${dx*0.025}deg)`;
    if (dx>30) { ov.textContent='✅'; ov.className='swipe-overlay show-yes'; }
    else if (dx<-30) { ov.textContent='❌'; ov.className='swipe-overlay show-no'; }
    else { ov.className='swipe-overlay'; }
  }
}, {passive:true});
stageEl.addEventListener('touchend', () => {
  document.getElementById('swipeOverlay').className = 'swipe-overlay';
  if (Math.abs(dragX) > 65) { judge(dragX > 0); }
  else {
    resetStudyCardMotion(true);
    setTimeout(() => { dragging = false; }, 300);
  }
  dragX = 0;
  touchDirection = '';
}, {passive:true});
stageEl.addEventListener('touchcancel', () => {
  document.getElementById('swipeOverlay').className = 'swipe-overlay';
  resetStudyCardMotion(true);
  dragging = false;
  dragX = 0;
  touchDirection = '';
}, {passive:true});

// ══════════════════════════════════════