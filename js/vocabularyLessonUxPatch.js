(function vocabularyLessonUxPatch(root) {
  'use strict';

  const CIRCLED_BATCH_LABELS = Object.freeze(['①', '②', '③', '④']);
  const PROGRESS_KEY_PREFIX = 'wc_vocabulary_lesson_progress_v2:';

  function clampInteger(value, min, max) {
    const number = Math.trunc(Number(value));
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(number, max));
  }

  function sortBooksOldestFirst(books, getDate) {
    const dateOf = typeof getDate === 'function'
      ? getDate
      : book => String(book && (book.sortDate || book.date || book.createdAt || book.updatedAt) || '').trim();
    return (Array.isArray(books) ? books.slice() : []).sort((a, b) => {
      const dateCompare = dateOf(a).localeCompare(dateOf(b));
      if (dateCompare) return dateCompare;
      return Number(a && a.id || 0) - Number(b && b.id || 0);
    });
  }

  function latestBook(books) {
    const safeBooks = Array.isArray(books) ? books : [];
    return safeBooks.length ? safeBooks[safeBooks.length - 1] : null;
  }

  function normalizeSavedProgress(saved, batchLengths) {
    const lengths = Array.isArray(batchLengths) ? batchLengths : [];
    const lastBatchIndex = Math.max(0, lengths.length - 1);
    const source = saved && typeof saved === 'object' ? saved : {};
    const batchIndex = clampInteger(source.batchIndex, 0, lastBatchIndex);
    const sourceIndexes = source.wordIndexes && typeof source.wordIndexes === 'object'
      ? source.wordIndexes
      : {};
    const wordIndexes = {};
    lengths.forEach((length, index) => {
      wordIndexes[index] = clampInteger(sourceIndexes[index], 0, Math.max(0, Number(length) - 1));
    });
    return { batchIndex, wordIndexes };
  }

  function createProgressDotModel(count, currentIndex) {
    const safeCount = Math.max(0, Math.trunc(Number(count)) || 0);
    const safeIndex = safeCount ? clampInteger(currentIndex, 0, safeCount - 1) : 0;
    return Array.from({ length: safeCount }, (_, index) => ({
      index,
      current: index === safeIndex,
      done: index < safeIndex
    }));
  }

  const helpers = {
    CIRCLED_BATCH_LABELS,
    clampInteger,
    sortBooksOldestFirst,
    latestBook,
    normalizeSavedProgress,
    createProgressDotModel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = helpers;
  }

  if (!root || !root.document) return;

  const document = root.document;

  function isReady() {
    return typeof vocabularyLessonState !== 'undefined'
      && typeof renderVocabularyLesson === 'function'
      && typeof renderVocabularyLessonBookSelection === 'function';
  }

  function currentBookId(batch) {
    return String(batch && batch.id || 'none');
  }

  function progressStorageKey(batch) {
    const user = typeof currentUser === 'undefined' ? 'unknown' : String(currentUser || 'unknown');
    return `${PROGRESS_KEY_PREFIX}${user}:${currentBookId(batch)}`;
  }

  function readLessonProgress(batch, batches) {
    const lengths = (Array.isArray(batches) ? batches : []).map(items => Array.isArray(items) ? items.length : 0);
    try {
      const saved = JSON.parse(root.localStorage.getItem(progressStorageKey(batch)) || '{}');
      return normalizeSavedProgress(saved, lengths);
    } catch (error) {
      return normalizeSavedProgress({}, lengths);
    }
  }

  function writeLessonProgress() {
    if (!vocabularyLessonState.batch || !vocabularyLessonState.batches.length) return;
    if (!['teaching', 'batchReview', 'batchReviewDetail'].includes(vocabularyLessonState.mode)) return;

    const saved = readLessonProgress(vocabularyLessonState.batch, vocabularyLessonState.batches);
    const batchIndex = clampInteger(
      vocabularyLessonState.batchIndex,
      0,
      Math.max(0, vocabularyLessonState.batches.length - 1)
    );
    const items = vocabularyLessonState.batches[batchIndex] || [];
    const activeIndex = vocabularyLessonState.mode === 'batchReviewDetail'
      ? vocabularyLessonState.reviewDetailIndex
      : vocabularyLessonState.mode === 'batchReview'
        ? Math.max(0, items.length - 1)
        : vocabularyLessonState.wordIndex;

    saved.batchIndex = batchIndex;
    saved.wordIndexes[batchIndex] = clampInteger(activeIndex, 0, Math.max(0, items.length - 1));
    try {
      root.localStorage.setItem(progressStorageKey(vocabularyLessonState.batch), JSON.stringify(saved));
    } catch (error) {}
  }

  function migrateHardWordsToLocalStorage(batch) {
    const key = getVocabularyLessonHardStorageKey(batch);
    try {
      const localValue = root.localStorage.getItem(key);
      if (localValue != null) return localValue;
      const sessionValue = root.sessionStorage.getItem(key);
      if (sessionValue != null) {
        root.localStorage.setItem(key, sessionValue);
        return sessionValue;
      }
    } catch (error) {}
    return '[]';
  }

  function installShellControls() {
    const topbar = document.querySelector('.vocabulary-lesson-topbar');
    if (!topbar || topbar.dataset.uxPatch === '1') return;
    topbar.dataset.uxPatch = '1';
    topbar.innerHTML = `
      <button class="vocabulary-lesson-icon-button" type="button" onclick="closeVocabularyReviewPlayer()" aria-label="退出新词导览">←</button>
      <nav class="vocabulary-lesson-batch-nav" id="vocabularyLessonBatchNav" aria-label="批次与复习方式"></nav>
      <div class="vocabulary-lesson-dot-progress" id="vocabularyLessonDotProgress" aria-label="本批进度"></div>
      <h1 class="vocabulary-lesson-patch-hidden-control" id="vocabularyLessonModeTitle" aria-live="polite">第1批</h1>
      <button class="vocabulary-lesson-change-button vocabulary-lesson-patch-hidden-control" id="vocabularyLessonChangeButton" type="button" onclick="startVocabularyLessonRandomReview(true)" hidden>换一批</button>`;
  }

  function hasHardWords() {
    return vocabularyLessonState.words.some(item => vocabularyLessonState.hardWords.has(item.key));
  }

  function renderBatchNavigation() {
    const nav = document.getElementById('vocabularyLessonBatchNav');
    if (!nav) return;
    const batchCount = vocabularyLessonState.batches.length;
    const regularMode = ['teaching', 'batchReview', 'batchReviewDetail'].includes(vocabularyLessonState.mode);
    const buttons = CIRCLED_BATCH_LABELS.map((label, index) => {
      const disabled = index >= batchCount;
      const active = regularMode && index === vocabularyLessonState.batchIndex;
      return `<button type="button" class="vocabulary-lesson-nav-button batch${active ? ' is-active' : ''}" onclick="jumpToVocabularyLessonBatch(${index})" aria-label="第${index + 1}批" aria-pressed="${active}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    });
    const hardActive = vocabularyLessonState.mode === 'hardWordReview';
    const randomActive = vocabularyLessonState.mode === 'randomReview';
    buttons.push(`<button type="button" class="vocabulary-lesson-nav-button review${hardActive ? ' is-active' : ''}" onclick="startVocabularyLessonHardWordReview()" aria-pressed="${hardActive}" ${hasHardWords() ? '' : 'disabled'}>★ 难词</button>`);
    buttons.push(`<button type="button" class="vocabulary-lesson-nav-button review${randomActive ? ' is-active' : ''}" onclick="startVocabularyLessonRandomReview(false)" aria-pressed="${randomActive}" ${vocabularyLessonState.words.length ? '' : 'disabled'}>↻ 随机</button>`);
    nav.innerHTML = buttons.join('');
  }

  function dotProgressState() {
    const mode = vocabularyLessonState.mode;
    if (mode === 'finalMenu' || mode === 'selection') return { count: 0, index: 0 };
    if (mode === 'batchReview') {
      const items = vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || [];
      return { count: items.length, index: Math.max(0, items.length - 1) };
    }
    const items = vocabularyLessonCurrentItems();
    return { count: items.length, index: vocabularyLessonCurrentIndex() };
  }

  function renderDotProgress() {
    const progress = document.getElementById('vocabularyLessonDotProgress');
    if (!progress) return;
    const state = dotProgressState();
    const dots = createProgressDotModel(state.count, state.index);
    progress.hidden = dots.length === 0;
    progress.innerHTML = dots.map(dot => `<span class="vocabulary-lesson-progress-dot${dot.done ? ' is-done' : ''}${dot.current ? ' is-current' : ''}" aria-hidden="true"></span>`).join('');
    if (dots.length) progress.setAttribute('aria-label', `本批第 ${state.index + 1} 个词`);
  }

  function renderTopControls() {
    installShellControls();
    renderBatchNavigation();
    renderDotProgress();
  }

  function renderBookSelectionOldestFirst() {
    installVocabularyLessonShell();
    const list = document.getElementById('vocabularyLessonBookList');
    const empty = document.getElementById('vocabularyLessonBookEmpty');
    if (!list) return;
    const books = getVocabularyLessonVisibleBatches(appData, currentUser);
    const newest = latestBook(books);
    const newestId = currentBookId(newest);
    vocabularyLessonState.books = books;
    list.innerHTML = books.map(batch => {
      const isLatest = currentBookId(batch) === newestId;
      return `
        <button class="vocabulary-lesson-book-button${isLatest ? ' is-latest' : ''}" type="button" onclick="selectVocabularyLessonBook(decodeURIComponent('${encodeURIComponent(String(batch.id))}'))">
          <span aria-hidden="true">${isLatest ? '🆕' : '📚'}</span>
          <span class="vocabulary-lesson-book-copy">
            <span>${escapeVocabularyLessonHtml(batch.name || '未命名单词本')}</span>
            ${isLatest ? '<small class="vocabulary-lesson-latest-badge">最新</small>' : ''}
          </span>
          <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>
        </button>`;
    }).join('');
    if (empty) empty.hidden = books.length > 0;
    renderVocabularyLessonSharedAdmin();
  }

  function openSelectedBook(batchId) {
    const batch = selectVocabularyLessonBatch(appData, currentUser, batchId);
    if (!batch) return;
    currentBatchId = String(batch.id);
    vocabularyLessonState.batch = batch;
    vocabularyLessonState.words = buildVocabularyLessonWords(batch, vocabularyLessonVisualRegistry);
    vocabularyLessonState.batches = chunkVocabularyLessonItems(vocabularyLessonState.words, VOCABULARY_LESSON_BATCH_SIZE);
    const saved = readLessonProgress(batch, vocabularyLessonState.batches);
    vocabularyLessonState.batchIndex = saved.batchIndex;
    vocabularyLessonState.wordIndex = saved.wordIndexes[saved.batchIndex] || 0;
    vocabularyLessonState.reviewDetailIndex = 0;
    vocabularyLessonState.hardWords = readVocabularyLessonHardWords(batch);
    vocabularyLessonState.randomWords = [];
    vocabularyLessonState.randomIndex = 0;
    vocabularyLessonState.randomPool = [];
    vocabularyLessonState.revealed = true;
    vocabularyLessonState.reviewScrollTop = 0;
    vocabularyLessonState.mode = 'teaching';
    document.body.classList.add('vocabulary-review-open');
    showScreen('screenVocabularyReviewPlayer');
    renderVocabularyLesson();
  }

  const originalRenderVocabularyLesson = renderVocabularyLesson;
  const originalCloseVocabularyReviewPlayer = closeVocabularyReviewPlayer;

  getVocabularyLessonVisibleBatches = function patchedVisibleBatches(data, user) {
    const batches = Array.isArray(data && data.batches) ? data.batches : [];
    const role = String(user || '');
    return sortBooksOldestFirst(
      batches
        .filter(batch => Array.isArray(batch && batch.cards) && batch.cards.length > 0)
        .filter(batch => role === 'teacher' || (Array.isArray(batch.sharedWith) && batch.sharedWith.includes(role))),
      getVocabularyLessonBatchDate
    );
  };

  selectVocabularyLessonBatch = function patchedSelectBatch(data, user, preferredId) {
    const batches = getVocabularyLessonVisibleBatches(data, user);
    if (!batches.length) return null;
    const preferred = batches.find(batch => String(batch.id) === String(preferredId || ''));
    return preferred || latestBook(batches);
  };

  readVocabularyLessonHardWords = function patchedReadHardWords(batch) {
    try {
      const saved = JSON.parse(migrateHardWordsToLocalStorage(batch));
      return new Set((Array.isArray(saved) ? saved : []).map(normalizeVocabularyLessonWord).filter(Boolean));
    } catch (error) {
      return new Set();
    }
  };

  saveVocabularyLessonHardWords = function patchedSaveHardWords() {
    try {
      root.localStorage.setItem(
        getVocabularyLessonHardStorageKey(),
        JSON.stringify(Array.from(vocabularyLessonState.hardWords))
      );
    } catch (error) {}
  };

  renderVocabularyLessonBookSelection = renderBookSelectionOldestFirst;
  selectVocabularyLessonBook = openSelectedBook;

  startVocabularyReview = function patchedStartVocabularyReview(index) {
    if (!canUseVocabularyReview()) return;
    installVocabularyLessonShell();
    if (!vocabularyLessonState.batch || !vocabularyLessonState.words.length) {
      const batch = selectVocabularyLessonBatch(appData, currentUser, currentBatchId);
      if (!batch) return;
      currentBatchId = String(batch.id);
      vocabularyLessonState.batch = batch;
      vocabularyLessonState.words = buildVocabularyLessonWords(batch, vocabularyLessonVisualRegistry);
      vocabularyLessonState.batches = chunkVocabularyLessonItems(vocabularyLessonState.words, VOCABULARY_LESSON_BATCH_SIZE);
      vocabularyLessonState.hardWords = readVocabularyLessonHardWords(batch);
    }
    if (!vocabularyLessonState.batches.length) return;
    const saved = readLessonProgress(vocabularyLessonState.batch, vocabularyLessonState.batches);
    vocabularyLessonState.mode = 'teaching';
    vocabularyLessonState.batchIndex = saved.batchIndex;
    const requested = Number.isFinite(Number(index)) && Number(index) > 0
      ? Number(index)
      : saved.wordIndexes[saved.batchIndex] || 0;
    vocabularyLessonState.wordIndex = clampInteger(
      requested,
      0,
      Math.max(0, (vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || []).length - 1)
    );
    vocabularyLessonState.revealed = true;
    document.body.classList.add('vocabulary-review-open');
    showScreen('screenVocabularyReviewPlayer');
    renderVocabularyLesson();
  };

  root.jumpToVocabularyLessonBatch = function jumpToVocabularyLessonBatch(index) {
    const target = clampInteger(index, 0, Math.max(0, vocabularyLessonState.batches.length - 1));
    if (!vocabularyLessonState.batches[target]) return;
    writeLessonProgress();
    const saved = readLessonProgress(vocabularyLessonState.batch, vocabularyLessonState.batches);
    vocabularyLessonState.batchIndex = target;
    vocabularyLessonState.wordIndex = saved.wordIndexes[target] || 0;
    vocabularyLessonState.reviewDetailIndex = 0;
    vocabularyLessonState.reviewScrollTop = 0;
    vocabularyLessonState.revealed = true;
    vocabularyLessonState.mode = 'teaching';
    renderVocabularyLesson();
  };

  renderVocabularyLesson = function patchedRenderVocabularyLesson() {
    installShellControls();
    originalRenderVocabularyLesson();
    renderTopControls();
    writeLessonProgress();
  };

  closeVocabularyReviewPlayer = function patchedCloseVocabularyReviewPlayer() {
    writeLessonProgress();
    originalCloseVocabularyReviewPlayer();
  };

  function activatePatch() {
    if (!isReady()) return false;
    installShellControls();
    const listScreen = document.getElementById('screenVocabularyReviewList');
    const playerScreen = document.getElementById('screenVocabularyReviewPlayer');
    if (listScreen && listScreen.classList.contains('active')) renderVocabularyLessonBookSelection();
    if (playerScreen && playerScreen.classList.contains('active')) renderVocabularyLesson();
    return true;
  }

  if (!activatePatch()) {
    let attempts = 0;
    const timer = root.setInterval(() => {
      attempts += 1;
      if (activatePatch() || attempts > 40) root.clearInterval(timer);
    }, 50);
  }
})(typeof window !== 'undefined' ? window : globalThis);
