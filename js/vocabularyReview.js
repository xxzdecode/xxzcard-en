let vocabularyReviewIndex = 0;
let vocabularyReviewMode = 'learn';
let vocabularyReviewRevealed = false;
let vocabularyReviewTouchStart = null;
let vocabularyReviewDidSwipe = false;

function renderVocabularyReviewList() {
  const count = document.getElementById('vocabularyReviewCount');
  const list = document.getElementById('vocabularyReviewWordList');
  if (count) count.textContent = `${reviewWords.length} 个共用词`;
  if (!list) return;

  list.innerHTML = reviewWords.map((item, index) => `
    <button class="vocabulary-review-word-chip" type="button" onclick="startVocabularyReview(${index})">
      ${item.word}
    </button>
  `).join('');
}

function openVocabularyReviewList() {
  if (!isTeacher()) return;
  document.body.classList.remove('vocabulary-review-open');
  renderVocabularyReviewList();
  showScreen('screenVocabularyReviewList');
}

function startVocabularyReview(index = 0) {
  if (!isTeacher() || !reviewWords.length) return;
  const requestedIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  vocabularyReviewIndex = ((Math.trunc(requestedIndex) % reviewWords.length) + reviewWords.length) % reviewWords.length;
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
  if (!reviewWords.length) return;
  vocabularyReviewIndex = (vocabularyReviewIndex + Number(delta) + reviewWords.length) % reviewWords.length;
  vocabularyReviewRevealed = false;
  renderVocabularyReviewCard(true);
}

function revealVocabularyReviewCard() {
  if (vocabularyReviewMode !== 'quiz' || vocabularyReviewRevealed) return;
  vocabularyReviewRevealed = true;
  renderVocabularyReviewCard(false);
}

function speakVocabularyReviewWord() {
  const item = reviewWords[vocabularyReviewIndex];
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
  image.src = item.image;
}

function renderVocabularyReviewCard(animate = true) {
  const item = reviewWords[vocabularyReviewIndex];
  const card = document.getElementById('vocabularyReviewCard');
  if (!item || !card) return;

  document.getElementById('vocabularyReviewProgress').textContent = `${vocabularyReviewIndex + 1} / ${reviewWords.length}`;
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
  setVocabularyReviewImage(
    document.getElementById('vocabularyReviewQuizImage'),
    document.getElementById('vocabularyReviewQuizFallback'),
    item
  );
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
