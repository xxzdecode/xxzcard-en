let vocabularyReviewIndex = 0;
let vocabularyReviewMode = 'learn';
let vocabularyReviewRevealed = false;
let vocabularyReviewTouchStart = null;
let vocabularyReviewDidSwipe = false;
const vocabularyReviewPreloadedImages = new Set();
const VOCABULARY_REVIEW_REMEMBERED_KEY = 'wc_vocabulary_review_remembered';
let vocabularyReviewRememberedWords = loadVocabularyReviewRememberedWords();

function loadVocabularyReviewRememberedWords() {
  try {
    const saved = JSON.parse(localStorage.getItem(VOCABULARY_REVIEW_REMEMBERED_KEY) || '[]');
    if (!Array.isArray(saved)) return new Set();
    const availableWords = new Set(reviewWords.map(item => item.word));
    return new Set(saved.filter(word => typeof word === 'string' && availableWords.has(word)));
  } catch (error) {
    return new Set();
  }
}

function saveVocabularyReviewRememberedWords() {
  try {
    localStorage.setItem(
      VOCABULARY_REVIEW_REMEMBERED_KEY,
      JSON.stringify(Array.from(vocabularyReviewRememberedWords))
    );
  } catch (error) {}
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
      <button class="vocabulary-review-list-remember" type="button" onclick="markVocabularyReviewWordRemembered('${item.word}')" aria-label="将 ${item.word} 标记为已记住">
        ✓ 记住了
      </button>
    </div>
  `).join('');
  if (empty) empty.hidden = activeWords.length > 0;
  if (startButton) startButton.disabled = activeWords.length === 0;

  if (rememberedPanel) rememberedPanel.hidden = rememberedWords.length === 0;
  if (rememberedSummary) rememberedSummary.textContent = `已记住（${rememberedWords.length}）`;
  if (rememberedList) {
    rememberedList.innerHTML = rememberedWords.map(item => `
      <button type="button" onclick="restoreVocabularyReviewWord('${item.word}')">
        <s>${item.word}</s><span>恢复</span>
      </button>
    `).join('');
  }
}

function openVocabularyReviewList() {
  if (!isTeacher()) return;
  document.body.classList.remove('vocabulary-review-open');
  renderVocabularyReviewList();
  showScreen('screenVocabularyReviewList');
  preloadVocabularyReviewImages();
}

function startVocabularyReview(index = 0) {
  const activeWords = getActiveVocabularyReviewWords();
  if (!isTeacher() || !activeWords.length) return;
  const requestedIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  vocabularyReviewIndex = ((Math.trunc(requestedIndex) % activeWords.length) + activeWords.length) % activeWords.length;
  vocabularyReviewMode = 'learn';
  vocabularyReviewRevealed = false;
  document.body.classList.add('vocabulary-review-open');
  showScreen('screenVocabularyReviewPlayer');
  renderVocabularyReviewCard(false);
}

function closeVocabularyReviewPlayer() {
  if (!isTeacher()) return;
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

function markVocabularyReviewWordRemembered(word) {
  const activeWords = getActiveVocabularyReviewWords();
  const item = word
    ? reviewWords.find(candidate => candidate.word === word)
    : activeWords[vocabularyReviewIndex];
  if (!isTeacher() || !item || vocabularyReviewRememberedWords.has(item.word)) return;

  const finish = () => {
    card?.classList.remove('is-remembering');
    vocabularyReviewRememberedWords.add(item.word);
    saveVocabularyReviewRememberedWords();
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
  };

  const card = document.getElementById('vocabularyReviewCard');
  if (isVocabularyReviewPlayerActive() && card) {
    card.classList.add('is-remembering');
    window.setTimeout(finish, 280);
  } else {
    finish();
  }
}

function restoreVocabularyReviewWord(word) {
  if (!isTeacher() || !vocabularyReviewRememberedWords.delete(word)) return;
  saveVocabularyReviewRememberedWords();
  renderVocabularyReviewList();
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
