(function installVocabularyLessonTask016() {
  const PROGRESS_KEY_PREFIX = 'wc_vocabulary_lesson_position_v1:';
  const CIRCLED_BATCH_LABELS = ['①', '②', '③', '④'];
  const ACCESSIBLE_BATCH_LABELS = ['第一批', '第二批', '第三批', '第四批'];
  let installed = false;

  function playerReady() {
    return typeof installVocabularyLessonShell === 'function'
      && typeof renderVocabularyLesson === 'function'
      && typeof vocabularyLessonState !== 'undefined';
  }

  function clampIndex(value, length) {
    if (!length) return 0;
    const index = Math.trunc(Number(value));
    return Number.isFinite(index) ? Math.max(0, Math.min(index, length - 1)) : 0;
  }

  function getProgressStorageKey(batch = vocabularyLessonState.batch) {
    const user = encodeURIComponent(String(typeof currentUser === 'undefined' ? '' : currentUser));
    const batchId = encodeURIComponent(String(batch && batch.id || 'none'));
    return `${PROGRESS_KEY_PREFIX}${user}:${batchId}`;
  }

  function getVocabularyLessonProgressSignature() {
    let hash = 2166136261;
    const source = vocabularyLessonState.words.map(item => item.key).join('|');
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${vocabularyLessonState.words.length}:${(hash >>> 0).toString(16)}`;
  }

  function defaultProgressState() {
    return {
      batchIndex: 0,
      lastTeachingBatchIndex: 0,
      batchPositions: vocabularyLessonState.batches.map(() => 0)
    };
  }

  function readVocabularyLessonProgress() {
    const fallback = defaultProgressState();
    try {
      const raw = JSON.parse(localStorage.getItem(getProgressStorageKey()) || 'null');
      if (!raw || raw.version !== 1 || raw.signature !== getVocabularyLessonProgressSignature()) return fallback;
      const positions = vocabularyLessonState.batches.map((items, index) => {
        return clampIndex(Array.isArray(raw.batchPositions) ? raw.batchPositions[index] : 0, items.length);
      });
      const lastTeachingBatchIndex = clampIndex(raw.lastTeachingBatchIndex, vocabularyLessonState.batches.length);
      return {
        batchIndex: clampIndex(raw.batchIndex, vocabularyLessonState.batches.length),
        lastTeachingBatchIndex,
        batchPositions: positions
      };
    } catch (_) {
      return fallback;
    }
  }

  function ensureProgressState() {
    if (!Array.isArray(vocabularyLessonState.batchPositions)
      || vocabularyLessonState.batchPositions.length !== vocabularyLessonState.batches.length) {
      vocabularyLessonState.batchPositions = vocabularyLessonState.batches.map(() => 0);
    }
    vocabularyLessonState.lastTeachingBatchIndex = clampIndex(
      vocabularyLessonState.lastTeachingBatchIndex,
      vocabularyLessonState.batches.length
    );
  }

  function saveVocabularyLessonProgress() {
    if (!vocabularyLessonState.batch || !vocabularyLessonState.batches.length) return;
    ensureProgressState();
    if (vocabularyLessonState.mode === 'teaching') {
      vocabularyLessonState.batchPositions[vocabularyLessonState.batchIndex] = clampIndex(
        vocabularyLessonState.wordIndex,
        (vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || []).length
      );
      vocabularyLessonState.lastTeachingBatchIndex = vocabularyLessonState.batchIndex;
    }
    try {
      localStorage.setItem(getProgressStorageKey(), JSON.stringify({
        version: 1,
        signature: getVocabularyLessonProgressSignature(),
        batchIndex: vocabularyLessonState.lastTeachingBatchIndex,
        lastTeachingBatchIndex: vocabularyLessonState.lastTeachingBatchIndex,
        batchPositions: vocabularyLessonState.batchPositions.map((value, index) => {
          return clampIndex(value, (vocabularyLessonState.batches[index] || []).length);
        })
      }));
    } catch (_) {}
  }

  function ensureTask016Styles() {
    if (document.getElementById('vocabularyLessonTask016Styles')) return;
    const link = document.createElement('link');
    link.id = 'vocabularyLessonTask016Styles';
    link.rel = 'stylesheet';
    link.href = 'styles-vocabulary-lesson-016.css';
    document.head.appendChild(link);
  }

  function ensureTask016Shell() {
    installVocabularyLessonShell();
    ensureTask016Styles();
    const app = document.getElementById('vocabularyLessonApp');
    const main = document.getElementById('vocabularyLessonMain');
    if (!app || !main) return;

    let nav = document.getElementById('vocabularyLessonQuickNav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'vocabularyLessonQuickNav';
      nav.className = 'vocabulary-lesson-quick-nav';
      nav.setAttribute('aria-label', '新词导览快捷入口');
      app.insertBefore(nav, main);
    }

    let progress = document.getElementById('vocabularyLessonBatchDots');
    if (!progress) {
      progress = document.createElement('div');
      progress.id = 'vocabularyLessonBatchDots';
      progress.className = 'vocabulary-lesson-batch-dots';
      progress.setAttribute('aria-label', '本批学习进度');
      app.insertBefore(progress, main);
    }
  }

  function renderTask016BookSelection() {
    installVocabularyLessonShell();
    ensureTask016Styles();
    const list = document.getElementById('vocabularyLessonBookList');
    const empty = document.getElementById('vocabularyLessonBookEmpty');
    if (!list) return;
    const books = getVocabularyLessonVisibleBatches(appData, currentUser);
    const latest = books.length ? books[books.length - 1] : null;
    vocabularyLessonState.books = books;
    list.innerHTML = books.map(batch => {
      const isLatest = latest && String(latest.id) === String(batch.id);
      return `
        <button class="vocabulary-lesson-book-button${isLatest ? ' is-latest' : ''}" type="button" onclick="selectVocabularyLessonBook(decodeURIComponent('${encodeURIComponent(String(batch.id))}'))">
          <span aria-hidden="true">📚</span>
          <span class="vocabulary-lesson-book-name">${escapeVocabularyLessonHtml(batch.name || '未命名单词本')}</span>
          ${isLatest ? '<span class="vocabulary-lesson-latest-badge">最新</span>' : '<span></span>'}
          <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>
        </button>`;
    }).join('');
    if (empty) empty.hidden = books.length > 0;
    renderVocabularyLessonSharedAdmin();
  }

  function renderTask016QuickNav() {
    ensureTask016Shell();
    const nav = document.getElementById('vocabularyLessonQuickNav');
    if (!nav) return;
    const activeBatch = clampIndex(vocabularyLessonState.batchIndex, vocabularyLessonState.batches.length);
    const hasHardWords = vocabularyLessonState.words.some(item => vocabularyLessonState.hardWords.has(item.key));
    const batchButtons = CIRCLED_BATCH_LABELS.map((label, index) => {
      const available = Boolean(vocabularyLessonState.batches[index] && vocabularyLessonState.batches[index].length);
      const selected = available && index === activeBatch;
      return `<button type="button" class="vocabulary-lesson-quick-button batch${selected ? ' is-active' : ''}" onclick="jumpVocabularyLessonBatch(${index})" aria-label="${ACCESSIBLE_BATCH_LABELS[index]}" aria-current="${selected ? 'step' : 'false'}" ${available ? '' : 'disabled'}>${label}</button>`;
    }).join('');
    nav.innerHTML = `${batchButtons}
      <button type="button" class="vocabulary-lesson-quick-button mode hard" onclick="openVocabularyLessonHardWordsFromNav()" aria-label="难词巩固" ${hasHardWords ? '' : 'disabled'}>★ 难词</button>
      <button type="button" class="vocabulary-lesson-quick-button mode random" onclick="openVocabularyLessonRandomFromNav()" aria-label="随机过词" ${vocabularyLessonState.words.length ? '' : 'disabled'}>↻ 随机</button>`;
  }

  function renderTask016BatchDots() {
    ensureTask016Shell();
    const progress = document.getElementById('vocabularyLessonBatchDots');
    if (!progress) return;
    const visible = vocabularyLessonState.mode === 'teaching';
    progress.hidden = !visible;
    if (!visible) {
      progress.innerHTML = '';
      return;
    }
    const items = vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || [];
    progress.innerHTML = items.map((_, index) => {
      const className = index < vocabularyLessonState.wordIndex
        ? ' is-past'
        : index === vocabularyLessonState.wordIndex ? ' is-current' : '';
      return `<span class="vocabulary-lesson-batch-dot${className}" aria-hidden="true"></span>`;
    }).join('');
  }

  function jumpVocabularyLessonBatch(index) {
    const target = Math.trunc(Number(index));
    if (target < 0 || target >= 4 || !vocabularyLessonState.batches[target]?.length) return false;
    saveVocabularyLessonProgress();
    ensureProgressState();
    vocabularyLessonState.batchIndex = target;
    vocabularyLessonState.lastTeachingBatchIndex = target;
    vocabularyLessonState.wordIndex = clampIndex(
      vocabularyLessonState.batchPositions[target],
      vocabularyLessonState.batches[target].length
    );
    vocabularyLessonState.mode = 'teaching';
    vocabularyLessonState.revealed = true;
    vocabularyLessonState.reviewScrollTop = 0;
    saveVocabularyLessonProgress();
    renderVocabularyLesson();
    return true;
  }

  function openVocabularyLessonHardWordsFromNav() {
    saveVocabularyLessonProgress();
    startVocabularyLessonHardWordReview();
  }

  function openVocabularyLessonRandomFromNav() {
    saveVocabularyLessonProgress();
    startVocabularyLessonRandomReview(false);
  }

  function installOverrides() {
    if (installed || !playerReady()) return false;
    installed = true;
    ensureTask016Styles();

    const baseRender = renderVocabularyLesson;
    renderVocabularyLesson = function renderVocabularyLessonTask016() {
      baseRender();
      ensureTask016Shell();
      renderTask016QuickNav();
      renderTask016BatchDots();
      const legacyChange = document.getElementById('vocabularyLessonChangeButton');
      if (legacyChange) legacyChange.hidden = true;
    };

    renderVocabularyLessonBookSelection = renderTask016BookSelection;

    selectVocabularyLessonBook = function selectVocabularyLessonBookTask016(batchId) {
      saveVocabularyLessonProgress();
      const batch = selectVocabularyLessonBatch(appData, currentUser, batchId);
      if (!batch) return;
      currentBatchId = String(batch.id);
      vocabularyLessonState.batch = batch;
      vocabularyLessonState.words = buildVocabularyLessonWords(batch, vocabularyLessonVisualRegistry);
      vocabularyLessonState.batches = chunkVocabularyLessonItems(vocabularyLessonState.words, VOCABULARY_LESSON_BATCH_SIZE);
      const saved = readVocabularyLessonProgress();
      vocabularyLessonState.batchPositions = saved.batchPositions;
      vocabularyLessonState.lastTeachingBatchIndex = saved.lastTeachingBatchIndex;
      vocabularyLessonState.batchIndex = saved.lastTeachingBatchIndex;
      vocabularyLessonState.wordIndex = clampIndex(
        saved.batchPositions[saved.lastTeachingBatchIndex],
        (vocabularyLessonState.batches[saved.lastTeachingBatchIndex] || []).length
      );
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
      saveVocabularyLessonProgress();
      renderVocabularyLesson();
    };

    const baseClosePlayer = closeVocabularyReviewPlayer;
    closeVocabularyReviewPlayer = function closeVocabularyReviewPlayerTask016() {
      saveVocabularyLessonProgress();
      return baseClosePlayer();
    };

    const baseChangeWord = changeVocabularyReviewWord;
    changeVocabularyReviewWord = function changeVocabularyReviewWordTask016(delta) {
      const wasTeaching = vocabularyLessonState.mode === 'teaching';
      if (wasTeaching) saveVocabularyLessonProgress();
      const result = baseChangeWord(delta);
      if (wasTeaching) {
        ensureProgressState();
        if (vocabularyLessonState.mode === 'teaching') {
          vocabularyLessonState.batchPositions[vocabularyLessonState.batchIndex] = vocabularyLessonState.wordIndex;
        }
        vocabularyLessonState.lastTeachingBatchIndex = vocabularyLessonState.batchIndex;
        saveVocabularyLessonProgress();
      }
      return result;
    };

    continueVocabularyLessonAfterBatchReview = function continueVocabularyLessonAfterBatchReviewTask016() {
      saveVocabularyLessonProgress();
      if (vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1) {
        vocabularyLessonState.batchIndex += 1;
        ensureProgressState();
        vocabularyLessonState.lastTeachingBatchIndex = vocabularyLessonState.batchIndex;
        vocabularyLessonState.wordIndex = clampIndex(
          vocabularyLessonState.batchPositions[vocabularyLessonState.batchIndex],
          vocabularyLessonState.batches[vocabularyLessonState.batchIndex].length
        );
        vocabularyLessonState.reviewScrollTop = 0;
        vocabularyLessonState.mode = 'teaching';
        vocabularyLessonState.revealed = true;
        saveVocabularyLessonProgress();
      } else {
        vocabularyLessonState.mode = 'finalMenu';
      }
      renderVocabularyLesson();
    };

    window.jumpVocabularyLessonBatch = jumpVocabularyLessonBatch;
    window.openVocabularyLessonHardWordsFromNav = openVocabularyLessonHardWordsFromNav;
    window.openVocabularyLessonRandomFromNav = openVocabularyLessonRandomFromNav;
    window.getVocabularyLessonProgressStorageKey = getProgressStorageKey;
    window.addEventListener('beforeunload', saveVocabularyLessonProgress);

    ensureTask016Shell();
    if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) {
      renderVocabularyLessonBookSelection();
    }
    if (document.getElementById('screenVocabularyReviewPlayer')?.classList.contains('active')) {
      renderVocabularyLesson();
    }
    return true;
  }

  function waitForPlayer() {
    if (installOverrides()) return;
    window.setTimeout(waitForPlayer, 0);
  }

  waitForPlayer();
})();
