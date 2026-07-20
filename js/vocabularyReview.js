let vocabularyReviewIndex = 0;
let vocabularyReviewMode = 'learn';
let vocabularyReviewRevealed = false;
let vocabularyReviewTouchStart = null;
let vocabularyReviewDidSwipe = false;
const vocabularyReviewPreloadedImages = new Set();
const VOCABULARY_REVIEW_REMEMBERED_KEY = 'wc_vocabulary_review_remembered';
const VOCABULARY_REVIEW_MIGRATION_KEY = 'wc_vocabulary_review_shared_migration_v1';
let vocabularyReviewRememberedWords = new Set();
let vocabularyReviewWritePending = false;

function canUseVocabularyReview() {
  return currentUser === 'teacher' || currentUser === 'sister' || currentUser === 'brother';
}

function normalizeVocabularyReviewRememberedWords(words) {
  const availableWords = new Set(reviewWords.map(item => item.word));
  return Array.from(new Set(
    (Array.isArray(words) ? words : [])
      .filter(word => typeof word === 'string' && availableWords.has(word))
  ));
}

function readLegacyVocabularyReviewRememberedWords() {
  try {
    const saved = JSON.parse(localStorage.getItem(VOCABULARY_REVIEW_REMEMBERED_KEY) || '[]');
    return normalizeVocabularyReviewRememberedWords(saved);
  } catch (error) {
    return [];
  }
}

function getVocabularyReviewState(data = appData) {
  const state = data && data.vocabularyReviewState;
  return {
    version: 1,
    rememberedWords: normalizeVocabularyReviewRememberedWords(state && state.rememberedWords),
    updatedAt: state && typeof state.updatedAt === 'string' ? state.updatedAt : '',
    updatedBy: state && typeof state.updatedBy === 'string' ? state.updatedBy : ''
  };
}

function applyVocabularyReviewState(data = appData) {
  vocabularyReviewRememberedWords = new Set(getVocabularyReviewState(data).rememberedWords);
}

async function initializeVocabularyReviewSharedState() {
  if (!canUseVocabularyReview()) return false;
  try {
    const remote = await sbGetRemote('main');
    if (remote) {
      normalizeAppData(remote);
      appData = remote;
      setMainSnapshot(appData);
    }
    applyVocabularyReviewState(appData);
  } catch (error) {
    showStorageError(error);
    applyVocabularyReviewState(appData);
    return false;
  }

  let migrationComplete = false;
  try { migrationComplete = localStorage.getItem(VOCABULARY_REVIEW_MIGRATION_KEY) === '1'; } catch (error) {}
  if (migrationComplete) return true;

  const legacyWords = readLegacyVocabularyReviewRememberedWords();
  if (!legacyWords.length) {
    try { localStorage.setItem(VOCABULARY_REVIEW_MIGRATION_KEY, '1'); } catch (error) {}
    return true;
  }

  const migrated = await updateMainDataSafely(data => {
    const state = getVocabularyReviewState(data);
    data.vocabularyReviewState = {
      version: 1,
      rememberedWords: normalizeVocabularyReviewRememberedWords([
        ...state.rememberedWords,
        ...legacyWords
      ]),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };
    return true;
  });
  if (!migrated) return false;

  applyVocabularyReviewState(migrated);
  try { localStorage.setItem(VOCABULARY_REVIEW_MIGRATION_KEY, '1'); } catch (error) {}
  return true;
}

function getActiveVocabularyReviewWords() {
  return reviewWords.filter(item => !vocabularyReviewRememberedWords.has(item.word));
}

function preloadVocabularyReviewImages(index = vocabularyReviewIndex) {
  const activeWords = getActiveVocabularyReviewWords();
  if (!activeWords.length || typeof Image === 'undefined') return;
  [-2, -1, 0, 1, 2].forEach(offset => {
    const item = activeWords[(index + offset + activeWords.length) % activeWords.length];
    if (!item || vocabularyReviewPreloadedImages.has(item.image)) return;
    vocabularyReviewPreloadedImages.add(item.image);
    const image = new Image();
    image.src = item.image;
  });
}

function renderVocabularyReviewList() {
  const count = document.getElementById('vocabularyReviewCount');
  const list = document.getElementById('vocabularyReviewWordList');
  const empty = document.getElementById('vocabularyReviewEmpty');
  const startButton = document.querySelector('.vocabulary-review-start-btn');
  const rememberedPanel = document.getElementById('vocabularyReviewRemembered');
  const rememberedSummary = document.getElementById('vocabularyReviewRememberedSummary');
  const rememberedList = document.getElementById('vocabularyReviewRememberedList');
  const activeWords = getActiveVocabularyReviewWords();
  const rememberedWords = reviewWords.filter(item => vocabularyReviewRememberedWords.has(item.word));

  if (count) count.textContent = `${activeWords.length} 个待巩固`;
  if (!list) return;

  list.innerHTML = activeWords.map((item, index) => `
    <div class="vocabulary-review-word-item">
      <button class="vocabulary-review-word-chip" type="button" onclick="startVocabularyReview(${index})">
        ${item.word}
      </button>
      <button class="vocabulary-review-list-remember" type="button" data-vocabulary-review-word="${item.word}" onclick="markVocabularyReviewWordRemembered('${item.word}')" aria-label="将 ${item.word} 标记为已记住" ${vocabularyReviewWritePending ? 'disabled' : ''}>
        ✓ 记住了
      </button>
    </div>
  `).join('');
  if (empty) empty.hidden = activeWords.length > 0;
  if (startButton) startButton.disabled = activeWords.length === 0;

  if (rememberedPanel) rememberedPanel.hidden = !isTeacher() || rememberedWords.length === 0;
  if (rememberedSummary) rememberedSummary.textContent = `已记住（${rememberedWords.length}）`;
  if (rememberedList) {
    rememberedList.innerHTML = rememberedWords.map(item => `
      <button type="button" onclick="restoreVocabularyReviewWord('${item.word}')">
        <s>${item.word}</s><span>恢复</span>
      </button>
    `).join('');
  }
}

async function openVocabularyReviewList() {
  if (!canUseVocabularyReview()) return;
  document.body.classList.remove('vocabulary-review-open');
  await initializeVocabularyReviewSharedState();
  renderVocabularyReviewList();
  showScreen('screenVocabularyReviewList');
  preloadVocabularyReviewImages();
}

function closeVocabularyReviewList() {
  if (!canUseVocabularyReview()) return;
  document.body.classList.remove('vocabulary-review-open');
  showScreen('screenHome');
  loadHome();
}

function startVocabularyReview(index = 0) {
  const activeWords = getActiveVocabularyReviewWords();
  if (!canUseVocabularyReview() || !activeWords.length) return;
  const requestedIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  vocabularyReviewIndex = ((Math.trunc(requestedIndex) % activeWords.length) + activeWords.length) % activeWords.length;
  vocabularyReviewMode = 'learn';
  vocabularyReviewRevealed = false;
  document.body.classList.add('vocabulary-review-open');
  showScreen('screenVocabularyReviewPlayer');
  renderVocabularyReviewCard(false);
}

function closeVocabularyReviewPlayer() {
  if (!canUseVocabularyReview()) return;
  document.body.classList.remove('vocabulary-review-open');
  renderVocabularyReviewList();
  showScreen('screenVocabularyReviewList');
}

function setVocabularyReviewMode(mode) {
  if (mode !== 'learn' && mode !== 'quiz') return;
  vocabularyReviewMode = mode;
  vocabularyReviewRevealed = false;
  renderVocabularyReviewCard(false);
}

function changeVocabularyReviewWord(delta) {
  const activeWords = getActiveVocabularyReviewWords();
  if (!activeWords.length) return;
  vocabularyReviewIndex = (vocabularyReviewIndex + Number(delta) + activeWords.length) % activeWords.length;
  vocabularyReviewRevealed = false;
  renderVocabularyReviewCard(true);
}

function revealVocabularyReviewCard() {
  if (vocabularyReviewMode !== 'quiz' || vocabularyReviewRevealed) return;
  vocabularyReviewRevealed = true;
  renderVocabularyReviewCard(false);
}

function speakVocabularyReviewWord() {
  const item = getActiveVocabularyReviewWords()[vocabularyReviewIndex];
  if (!item) return;
  if (typeof speakWord === 'function') {
    speakWord(item.word);
  } else if (typeof speakEnglish === 'function') {
    speakEnglish(item.word);
  }
}

function setVocabularyReviewImage(image, fallback, item) {
  if (!image || !fallback) return;
  fallback.textContent = item.placeholder;
  fallback.hidden = true;
  image.hidden = false;
  image.alt = '';
  image.onload = () => {
    image.hidden = false;
    fallback.hidden = true;
  };
  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
  if (image.getAttribute('src') !== item.image) {
    image.src = item.image;
  }
}

function renderVocabularyReviewCard(animate = true) {
  const activeWords = getActiveVocabularyReviewWords();
  const item = activeWords[vocabularyReviewIndex];
  const card = document.getElementById('vocabularyReviewCard');
  if (!item || !card) return;

  document.getElementById('vocabularyReviewProgress').textContent = `${vocabularyReviewIndex + 1} / ${activeWords.length}`;
  document.getElementById('vocabularyReviewWord').textContent = item.word;
  document.getElementById('vocabularyReviewPhonetic').textContent = item.phonetic;
  document.getElementById('vocabularyReviewMeaning').textContent = item.meaning;

  const quizHidden = vocabularyReviewMode === 'quiz' && !vocabularyReviewRevealed;
  card.classList.toggle('is-quiz-hidden', quizHidden);
  card.classList.toggle('vocabulary-review-card--refresh', animate);
  if (animate) {
    window.setTimeout(() => card.classList.remove('vocabulary-review-card--refresh'), 180);
  }

  document.querySelectorAll('[data-vocabulary-review-mode]').forEach(button => {
    const active = button.dataset.vocabularyReviewMode === vocabularyReviewMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const fullFace = document.getElementById('vocabularyReviewFullFace');
  const quizFace = document.getElementById('vocabularyReviewQuizFace');
  fullFace.setAttribute('aria-hidden', String(quizHidden));
  quizFace.setAttribute('aria-hidden', String(!quizHidden));

  setVocabularyReviewImage(
    document.getElementById('vocabularyReviewImage'),
    document.getElementById('vocabularyReviewImageFallback'),
    item
  );
  preloadVocabularyReviewImages();
}

function setVocabularyReviewWritePending(word, pending) {
  vocabularyReviewWritePending = pending;
  document.querySelectorAll('.vocabulary-review-list-remember').forEach(button => {
    button.disabled = pending;
  });
  const playerButton = document.getElementById('vocabularyReviewRememberButton');
  if (playerButton) playerButton.disabled = pending;
  const card = document.getElementById('vocabularyReviewCard');
  if (card && word) card.classList.toggle('is-remembering', pending);
}

async function updateVocabularyReviewSharedWord(word, remember) {
  if (!canUseVocabularyReview() || (!remember && !isTeacher())) return null;
  return await updateMainDataSafely(data => {
    const state = getVocabularyReviewState(data);
    const rememberedWords = new Set(state.rememberedWords);
    const changed = remember ? !rememberedWords.has(word) : rememberedWords.has(word);
    if (remember) rememberedWords.add(word);
    else rememberedWords.delete(word);
    if (!changed) return false;
    data.vocabularyReviewState = {
      version: 1,
      rememberedWords: normalizeVocabularyReviewRememberedWords(Array.from(rememberedWords)),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };
    return true;
  }, 2);
}

async function markVocabularyReviewWordRemembered(word) {
  const activeWords = getActiveVocabularyReviewWords();
  const item = word
    ? reviewWords.find(candidate => candidate.word === word)
    : activeWords[vocabularyReviewIndex];
  if (!canUseVocabularyReview() || vocabularyReviewWritePending || !item || vocabularyReviewRememberedWords.has(item.word)) return;

  setVocabularyReviewWritePending(item.word, true);
  const saved = await updateVocabularyReviewSharedWord(item.word, true);
  if (!saved) {
    setVocabularyReviewWritePending(item.word, false);
    return;
  }

  applyVocabularyReviewState(saved);
  setVocabularyReviewWritePending(item.word, false);
  const remainingWords = getActiveVocabularyReviewWords();
  if (!isVocabularyReviewPlayerActive()) {
    renderVocabularyReviewList();
    return;
  }
  if (!remainingWords.length) {
    closeVocabularyReviewPlayer();
    return;
  }
  vocabularyReviewIndex = Math.min(vocabularyReviewIndex, remainingWords.length - 1);
  vocabularyReviewRevealed = false;
  renderVocabularyReviewCard(true);
}

async function restoreVocabularyReviewWord(word) {
  if (!isTeacher() || vocabularyReviewWritePending || !vocabularyReviewRememberedWords.has(word)) return;
  setVocabularyReviewWritePending(word, true);
  const saved = await updateVocabularyReviewSharedWord(word, false);
  setVocabularyReviewWritePending(word, false);
  if (!saved) return;
  applyVocabularyReviewState(saved);
  renderVocabularyReviewList();
}

function refreshVocabularyReviewSharedStateFromAppData() {
  const list = document.getElementById('screenVocabularyReviewList');
  const player = document.getElementById('screenVocabularyReviewPlayer');
  const listActive = list && list.classList.contains('active');
  const playerActive = player && player.classList.contains('active');
  if (!listActive && !playerActive) return;
  applyVocabularyReviewState(appData);
  const activeWords = getActiveVocabularyReviewWords();
  if (playerActive && !activeWords.length) {
    closeVocabularyReviewPlayer();
  } else if (playerActive) {
    vocabularyReviewIndex = Math.min(vocabularyReviewIndex, activeWords.length - 1);
    renderVocabularyReviewCard(false);
  } else {
    renderVocabularyReviewList();
  }
}

function isVocabularyReviewPlayerActive() {
  return document.getElementById('screenVocabularyReviewPlayer')?.classList.contains('active');
}

document.addEventListener('keydown', event => {
  if (!isVocabularyReviewPlayerActive()) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    changeVocabularyReviewWord(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    changeVocabularyReviewWord(1);
  }
});

const vocabularyReviewCard = document.getElementById('vocabularyReviewCard');
const vocabularyReviewQuizFace = document.getElementById('vocabularyReviewQuizFace');

if (vocabularyReviewCard) {
  vocabularyReviewCard.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    vocabularyReviewTouchStart = { x: touch.clientX, y: touch.clientY };
    vocabularyReviewDidSwipe = false;
  }, { passive: true });

  vocabularyReviewCard.addEventListener('touchend', event => {
    if (!vocabularyReviewTouchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - vocabularyReviewTouchStart.x;
    const dy = touch.clientY - vocabularyReviewTouchStart.y;
    vocabularyReviewTouchStart = null;
    if (Math.abs(dx) <= 60 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    vocabularyReviewDidSwipe = true;
    changeVocabularyReviewWord(dx > 0 ? -1 : 1);
    window.setTimeout(() => { vocabularyReviewDidSwipe = false; }, 350);
  }, { passive: true });
}

if (vocabularyReviewQuizFace) {
  vocabularyReviewQuizFace.addEventListener('click', () => {
    if (vocabularyReviewDidSwipe) return;
    revealVocabularyReviewCard();
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
