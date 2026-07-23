const VOCABULARY_LESSON_HARD_KEY_PREFIX = 'wc_vocabulary_lesson_hard_v1:';
const VOCABULARY_REVIEW_REMEMBERED_KEY = 'wc_vocabulary_review_remembered';
const VOCABULARY_REVIEW_MIGRATION_KEY = 'wc_vocabulary_review_shared_migration_v1';
const vocabularyReviewPreloadedImages = new Set();

let vocabularyReviewRememberedWords = new Set();
let vocabularyReviewWritePending = false;
let vocabularyLessonTouchStart = null;
let vocabularyLessonDidSwipe = false;
let vocabularyLessonShellReady = false;

const vocabularyLessonState = {
  mode: 'selection',
  batch: null,
  books: [],
  words: [],
  batches: [],
  batchIndex: 0,
  wordIndex: 0,
  reviewDetailIndex: 0,
  hardWords: new Set(),
  randomWords: [],
  randomIndex: 0,
  randomPool: [],
  revealed: false,
  reviewScrollTop: 0
};

function canUseVocabularyReview() {
  return currentUser === 'teacher' || currentUser === 'sister' || currentUser === 'brother';
}

function allVocabularyReviewWords(data = appData) {
  const seen = new Set();
  const words = [];
  (Array.isArray(data && data.batches) ? data.batches : []).forEach(batch => {
    (Array.isArray(batch && batch.cards) ? batch.cards : []).forEach(card => {
      const word = getVocabularyLessonCardWord(card);
      const key = normalizeVocabularyLessonWord(word);
      if (key && !seen.has(key)) {
        seen.add(key);
        words.push(word);
      }
    });
  });
  return words;
}

function normalizeVocabularyReviewRememberedWords(words, data = appData) {
  const available = new Map(allVocabularyReviewWords(data).map(word => [normalizeVocabularyLessonWord(word), word]));
  return Array.from(new Set(
    (Array.isArray(words) ? words : [])
      .map(word => available.get(normalizeVocabularyLessonWord(word)))
      .filter(Boolean)
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
    rememberedWords: normalizeVocabularyReviewRememberedWords(state && state.rememberedWords, data),
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

  if (!isTeacher()) return true;
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
      rememberedWords: normalizeVocabularyReviewRememberedWords([...state.rememberedWords, ...legacyWords], data),
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

function ensureVocabularyLessonStyles() {
  if (document.getElementById('vocabularyLessonStyles')) return;
  const link = document.createElement('link');
  link.id = 'vocabularyLessonStyles';
  link.rel = 'stylesheet';
  link.href = 'styles-vocabulary-lesson.css';
  document.head.appendChild(link);
}

function upgradeVocabularyLessonEntryLabels() {
  document.querySelectorAll('[onclick="openVocabularyReviewList()"] .grammar-challenge-entry__title').forEach(label => {
    label.textContent = '新词导览';
  });
}

function installVocabularyLessonShell() {
  if (vocabularyLessonShellReady) return;
  ensureVocabularyLessonStyles();
  upgradeVocabularyLessonEntryLabels();

  const listScreen = document.getElementById('screenVocabularyReviewList');
  const playerScreen = document.getElementById('screenVocabularyReviewPlayer');
  if (!listScreen || !playerScreen) return;

  listScreen.innerHTML = `
    <div class="topbar vocabulary-lesson-selection-topbar">
      <button class="back-btn" type="button" onclick="closeVocabularyReviewList()" aria-label="返回首页">←</button>
      <span class="topbar-title">新词导览</span>
    </div>
    <main class="vocabulary-lesson-selection">
      <section class="vocabulary-lesson-selection-card" aria-labelledby="vocabularyLessonSelectionTitle">
        <div class="vocabulary-lesson-selection-copy">
          <span class="vocabulary-lesson-selection-icon" aria-hidden="true">🖼️</span>
          <div>
            <h1 id="vocabularyLessonSelectionTitle">选择今天要讲的单词本</h1>
            <p>每批讲完后进入纯图片回顾，再继续下一批。</p>
          </div>
        </div>
        <div class="vocabulary-lesson-book-list" id="vocabularyLessonBookList"></div>
        <p class="vocabulary-lesson-empty" id="vocabularyLessonBookEmpty" hidden>当前没有可用的单词本。</p>
      </section>
      <details class="vocabulary-lesson-shared-admin teacher-only" id="vocabularyLessonSharedAdmin" hidden>
        <summary>共享“已记住”管理</summary>
        <p>这里只保留旧共享状态的安全管理入口，不会改变本次课堂的难词标记。</p>
        <div id="vocabularyLessonSharedAdminBody"></div>
      </details>
    </main>`;

  playerScreen.innerHTML = `
    <div class="vocabulary-lesson-app" id="vocabularyLessonApp">
      <header class="vocabulary-lesson-topbar">
        <button class="vocabulary-lesson-icon-button" type="button" onclick="closeVocabularyReviewPlayer()" aria-label="退出新词导览">←</button>
        <h1 id="vocabularyLessonModeTitle">第1批</h1>
        <button class="vocabulary-lesson-change-button" id="vocabularyLessonChangeButton" type="button" onclick="startVocabularyLessonRandomReview(true)" hidden>换一批</button>
      </header>
      <main class="vocabulary-lesson-main" id="vocabularyLessonMain"></main>
      <footer class="vocabulary-lesson-footer" id="vocabularyLessonFooter"></footer>
    </div>`;

  bindVocabularyLessonGestures();
  vocabularyLessonShellReady = true;
}

function getVocabularyLessonHardStorageKey(batch = vocabularyLessonState.batch) {
  return VOCABULARY_LESSON_HARD_KEY_PREFIX + String(batch && batch.id || 'none');
}

function readVocabularyLessonHardWords(batch) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(getVocabularyLessonHardStorageKey(batch)) || '[]');
    return new Set((Array.isArray(saved) ? saved : []).map(normalizeVocabularyLessonWord).filter(Boolean));
  } catch (error) {
    return new Set();
  }
}

function saveVocabularyLessonHardWords() {
  try {
    sessionStorage.setItem(
      getVocabularyLessonHardStorageKey(),
      JSON.stringify(Array.from(vocabularyLessonState.hardWords))
    );
  } catch (error) {}
}

function renderVocabularyLessonBookSelection() {
  installVocabularyLessonShell();
  const list = document.getElementById('vocabularyLessonBookList');
  const empty = document.getElementById('vocabularyLessonBookEmpty');
  if (!list) return;
  const visibleBooks = getVocabularyLessonVisibleBatches(appData, currentUser);
  const primaryBook = selectVocabularyLessonBatch(appData, currentUser, '');
  const books = primaryBook
    ? [primaryBook, ...visibleBooks.filter(batch => String(batch.id) !== String(primaryBook.id))]
    : visibleBooks;
  vocabularyLessonState.books = books;
  list.innerHTML = books.map((batch, index) => `
    <button class="vocabulary-lesson-book-button${index === 0 ? ' is-primary' : ''}" type="button" onclick="selectVocabularyLessonBook(decodeURIComponent('${encodeURIComponent(String(batch.id))}'))">
      <span aria-hidden="true">${index === 0 ? '🌞' : '📚'}</span>
      <span>${escapeVocabularyLessonHtml(batch.name || '未命名单词本')}</span>
      <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>
    </button>`).join('');
  if (empty) empty.hidden = books.length > 0;
  renderVocabularyLessonSharedAdmin();
}

function renderVocabularyLessonSharedAdmin() {
  const panel = document.getElementById('vocabularyLessonSharedAdmin');
  const body = document.getElementById('vocabularyLessonSharedAdminBody');
  if (!panel || !body) return;
  panel.hidden = !isTeacher();
  if (!isTeacher()) {
    body.innerHTML = '';
    return;
  }
  const allWords = allVocabularyReviewWords(appData);
  const active = allWords.filter(word => !vocabularyReviewRememberedWords.has(word));
  const remembered = allWords.filter(word => vocabularyReviewRememberedWords.has(word));
  body.innerHTML = `
    <div class="vocabulary-lesson-shared-columns">
      <section>
        <h2>可标记</h2>
        <div class="vocabulary-lesson-shared-list">
          ${active.map(word => `<button type="button" onclick="markVocabularyReviewWordRemembered(decodeURIComponent('${encodeURIComponent(word)}'))" ${vocabularyReviewWritePending ? 'disabled' : ''}>${escapeVocabularyLessonHtml(word)}<span>标记</span></button>`).join('') || '<p>没有可标记的词。</p>'}
        </div>
      </section>
      <section>
        <h2>已记住</h2>
        <div class="vocabulary-lesson-shared-list">
          ${remembered.map(word => `<button type="button" onclick="restoreVocabularyReviewWord(decodeURIComponent('${encodeURIComponent(word)}'))" ${vocabularyReviewWritePending ? 'disabled' : ''}><s>${escapeVocabularyLessonHtml(word)}</s><span>恢复</span></button>`).join('') || '<p>暂时没有记录。</p>'}
        </div>
      </section>
    </div>`;
}

async function openVocabularyReviewList() {
  if (!canUseVocabularyReview()) return;
  installVocabularyLessonShell();
  document.body.classList.remove('vocabulary-review-open');
  await Promise.all([
    initializeVocabularyReviewSharedState(),
    loadVocabularyLessonVisualRegistry()
  ]);
  renderVocabularyLessonBookSelection();
  showScreen('screenVocabularyReviewList');
}

function closeVocabularyReviewList() {
  if (!canUseVocabularyReview()) return;
  document.body.classList.remove('vocabulary-review-open');
  showScreen('screenHome');
  loadHome();
}

function selectVocabularyLessonBook(batchId) {
  const batch = selectVocabularyLessonBatch(appData, currentUser, batchId);
  if (!batch) return;
  currentBatchId = String(batch.id);
  vocabularyLessonState.batch = batch;
  vocabularyLessonState.words = buildVocabularyLessonWords(batch, vocabularyLessonVisualRegistry);
  vocabularyLessonState.batches = chunkVocabularyLessonItems(vocabularyLessonState.words, VOCABULARY_LESSON_BATCH_SIZE);
  vocabularyLessonState.batchIndex = 0;
  vocabularyLessonState.wordIndex = 0;
  vocabularyLessonState.reviewDetailIndex = 0;
  vocabularyLessonState.hardWords = readVocabularyLessonHardWords(batch);
  vocabularyLessonState.randomWords = [];
  vocabularyLessonState.randomIndex = 0;
  vocabularyLessonState.randomPool = [];
  vocabularyLessonState.revealed = false;
  vocabularyLessonState.reviewScrollTop = 0;
  startVocabularyReview(0);
}

function startVocabularyReview(index = 0) {
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
  vocabularyLessonState.mode = 'teaching';
  vocabularyLessonState.batchIndex = 0;
  vocabularyLessonState.wordIndex = Math.max(0, Math.min(Math.trunc(Number(index)) || 0, vocabularyLessonState.batches[0].length - 1));
  vocabularyLessonState.revealed = true;
  document.body.classList.add('vocabulary-review-open');
  showScreen('screenVocabularyReviewPlayer');
  renderVocabularyLesson();
}

function closeVocabularyReviewPlayer() {
  if (!canUseVocabularyReview()) return;
  document.body.classList.remove('vocabulary-review-open');
  vocabularyLessonState.mode = 'selection';
  renderVocabularyLessonBookSelection();
  showScreen('screenVocabularyReviewList');
}

function escapeVocabularyLessonHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function vocabularyLessonCurrentItems() {
  if (vocabularyLessonState.mode === 'randomReview') return vocabularyLessonState.randomWords;
  if (vocabularyLessonState.mode === 'hardWordReview') {
    return vocabularyLessonState.words.filter(item => vocabularyLessonState.hardWords.has(item.key));
  }
  return vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || [];
}

function vocabularyLessonCurrentIndex() {
  return vocabularyLessonState.mode === 'batchReviewDetail'
    ? vocabularyLessonState.reviewDetailIndex
    : vocabularyLessonState.mode === 'randomReview'
      ? vocabularyLessonState.randomIndex
      : vocabularyLessonState.wordIndex;
}

function vocabularyLessonCurrentItem() {
  return vocabularyLessonCurrentItems()[vocabularyLessonCurrentIndex()] || null;
}

function renderVocabularyLesson() {
  installVocabularyLessonShell();
  const title = document.getElementById('vocabularyLessonModeTitle');
  const change = document.getElementById('vocabularyLessonChangeButton');
  const main = document.getElementById('vocabularyLessonMain');
  const footer = document.getElementById('vocabularyLessonFooter');
  if (!title || !change || !main || !footer) return;

  change.hidden = vocabularyLessonState.mode !== 'randomReview';
  if (vocabularyLessonState.mode === 'batchReview') {
    title.textContent = '图片回顾';
    renderVocabularyLessonImageWall(main, footer);
    return;
  }
  if (vocabularyLessonState.mode === 'finalMenu') {
    title.textContent = '接下来';
    renderVocabularyLessonFinalMenu(main, footer);
    return;
  }

  if (vocabularyLessonState.mode === 'teaching') title.textContent = `第${vocabularyLessonState.batchIndex + 1}批`;
  else if (vocabularyLessonState.mode === 'batchReviewDetail') title.textContent = '图片回顾';
  else if (vocabularyLessonState.mode === 'randomReview') title.textContent = '随机过词';
  else title.textContent = '难词巩固';

  const item = vocabularyLessonCurrentItem();
  if (!item) {
    if (vocabularyLessonState.mode === 'hardWordReview') {
      vocabularyLessonState.mode = 'finalMenu';
      renderVocabularyLesson();
    }
    return;
  }

  const randomHidden = vocabularyLessonState.mode === 'randomReview' && !vocabularyLessonState.revealed;
  main.innerHTML = `
    <article class="vocabulary-lesson-card${randomHidden ? ' is-answer-hidden' : ''}" id="vocabularyLessonCard">
      <section class="vocabulary-lesson-visual-panel" aria-label="单词视觉提示">
        ${renderVocabularyLessonVisual(item, false)}
      </section>
      <section class="vocabulary-lesson-info-panel">
        <div class="vocabulary-lesson-info-content" id="vocabularyLessonInfoContent" ${randomHidden ? 'hidden aria-hidden="true"' : ''}>
          <div class="vocabulary-lesson-word-row">
            <h2>${escapeVocabularyLessonHtml(item.word)}</h2>
            <button type="button" class="vocabulary-lesson-sound" onclick="speakVocabularyReviewWord()" aria-label="播放发音">🔊</button>
          </div>
          ${item.phonetic ? `<p class="vocabulary-lesson-phonetic">${escapeVocabularyLessonHtml(item.phonetic)}</p>` : ''}
          ${item.meaning ? `<p class="vocabulary-lesson-meaning">${escapeVocabularyLessonHtml(item.meaning)}</p>` : ''}
          ${item.collocations.length ? `<div class="vocabulary-lesson-notes"><h3>常用搭配</h3>${item.collocations.map(line => `<p>${escapeVocabularyLessonHtml(line)}</p>`).join('')}</div>` : ''}
          ${item.teacherNote ? `<div class="vocabulary-lesson-tip"><span aria-hidden="true">💡</span><p>${escapeVocabularyLessonHtml(item.teacherNote)}</p></div>` : ''}
          ${item.confusionNote ? `<div class="vocabulary-lesson-confusion"><span aria-hidden="true">🔎</span><p>${escapeVocabularyLessonHtml(item.confusionNote)}</p></div>` : ''}
        </div>
        ${randomHidden ? `<button class="vocabulary-lesson-answer-cover" type="button" onclick="revealVocabularyReviewCard()"><span aria-hidden="true">👆</span><strong>点击显示</strong></button>` : ''}
      </section>
    </article>`;

  const hard = vocabularyLessonState.hardWords.has(item.key);
  const detailMode = vocabularyLessonState.mode === 'batchReviewDetail';
  const hardMode = vocabularyLessonState.mode === 'hardWordReview';
  footer.innerHTML = `
    <button type="button" class="vocabulary-lesson-footer-button secondary" onclick="changeVocabularyReviewWord(-1)" aria-label="上一个词">← 上一个</button>
    <button type="button" class="vocabulary-lesson-footer-button hard${hard ? ' is-hard' : ''}" onclick="toggleVocabularyLessonHardWord()">${hard ? '取消难词' : '标为难词'}</button>
    <button type="button" class="vocabulary-lesson-footer-button primary" onclick="changeVocabularyReviewWord(1)" aria-label="下一个词">下一个 →</button>
    ${detailMode ? '<button type="button" class="vocabulary-lesson-footer-button exit" onclick="exitVocabularyLessonBatchReviewDetail()">退出回顾</button>' : ''}
    ${hardMode ? '<button type="button" class="vocabulary-lesson-footer-button exit" onclick="returnVocabularyLessonFinalMenu()">退出巩固</button>' : ''}`;
  preloadVocabularyReviewImages();
}

function getVocabularyLessonRelationSymbol(value, fallback = '＋') {
  const relation = String(value || '').trim();
  return /^[＋+→↔=×·]$/.test(relation) ? relation : fallback;
}

function renderVocabularyLessonVisual(item, thumbnail) {
  const compactClass = thumbnail ? ' is-thumbnail' : '';
  if (item.visualType === 'scene') {
    const source = thumbnail ? (item.thumbnail || item.image) : item.image;
    const image = source || VOCABULARY_LESSON_SCENE_PLACEHOLDER;
    return `<div class="vocabulary-lesson-visual scene${compactClass}"><img src="${escapeVocabularyLessonHtml(image)}" alt="" style="object-position:${escapeVocabularyLessonHtml(item.focalPoint)}" onerror="this.onerror=null;this.src='${VOCABULARY_LESSON_SCENE_PLACEHOLDER}'"></div>`;
  }
  if (item.visualType === 'compound') {
    return `<div class="vocabulary-lesson-visual compound${compactClass}" aria-hidden="true">${item.parts.map((part, index) => `${index ? `<span class="vocabulary-lesson-relation">${escapeVocabularyLessonHtml(getVocabularyLessonRelationSymbol(item.relation))}</span>` : ''}<span class="vocabulary-lesson-part">${escapeVocabularyLessonHtml(part)}</span>`).join('')}</div>`;
  }
  if (item.visualType === 'concept') {
    const concept = item.concept || {};
    const icons = Array.isArray(concept.icons) ? concept.icons : [concept.before, concept.after].filter(Boolean);
    const relation = getVocabularyLessonRelationSymbol(concept.relation, '→');
    return `<div class="vocabulary-lesson-visual concept${compactClass}" aria-hidden="true">${icons.map((icon, index) => `${index ? `<span class="vocabulary-lesson-concept-arrow">${escapeVocabularyLessonHtml(relation)}</span>` : ''}<span class="vocabulary-lesson-concept-icon">${escapeVocabularyLessonHtml(icon)}</span>`).join('') || '<span class="vocabulary-lesson-concept-icon">💭</span><span class="vocabulary-lesson-concept-arrow">→</span><span class="vocabulary-lesson-concept-icon">✨</span>'}</div>`;
  }
  return `<div class="vocabulary-lesson-visual emoji${compactClass}" aria-hidden="true"><span>${escapeVocabularyLessonHtml(item.emoji || '✨')}</span></div>`;
}

function renderVocabularyLessonImageWall(main, footer) {
  const items = vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || [];
  main.innerHTML = `<section class="vocabulary-lesson-image-wall" id="vocabularyLessonImageWall" aria-label="纯图片回顾">${items.map((item, index) => `<button type="button" class="vocabulary-lesson-image-tile" onclick="openVocabularyLessonBatchReviewDetail(${index})" aria-label="查看这张图片">${renderVocabularyLessonVisual(item, true)}</button>`).join('')}</section>`;
  footer.innerHTML = `<button type="button" class="vocabulary-lesson-footer-button primary vocabulary-lesson-next-batch" onclick="continueVocabularyLessonAfterBatchReview()">${vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1 ? '进入下一批 →' : '继续 →'}</button>`;
  const restoreScroll = () => {
    const wall = document.getElementById('vocabularyLessonImageWall');
    if (wall) wall.scrollTop = vocabularyLessonState.reviewScrollTop;
  };
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(restoreScroll);
  else window.setTimeout(restoreScroll, 0);
}

function renderVocabularyLessonFinalMenu(main, footer) {
  const hasHardWords = vocabularyLessonState.words.some(item => vocabularyLessonState.hardWords.has(item.key));
  main.innerHTML = `
    <section class="vocabulary-lesson-final-menu" aria-labelledby="vocabularyLessonFinalTitle">
      <div class="vocabulary-lesson-final-copy">
        <span aria-hidden="true">🌟</span>
        <h2 id="vocabularyLessonFinalTitle">选择接下来的复习方式</h2>
      </div>
      <div class="vocabulary-lesson-final-actions">
        <button type="button" onclick="startVocabularyLessonRandomReview(false)"><span aria-hidden="true">🔀</span><strong>随机过词</strong></button>
        <button type="button" onclick="startVocabularyLessonHardWordReview()" ${hasHardWords ? '' : 'disabled'}><span aria-hidden="true">⭐</span><strong>难词巩固</strong>${hasHardWords ? '' : '<small>先在授课中标记难词</small>'}</button>
      </div>
    </section>`;
  footer.innerHTML = '<button type="button" class="vocabulary-lesson-footer-button exit" onclick="closeVocabularyReviewPlayer()">返回单词本</button>';
}

function openVocabularyLessonBatchReviewDetail(index) {
  const wall = document.getElementById('vocabularyLessonImageWall');
  if (wall) vocabularyLessonState.reviewScrollTop = wall.scrollTop;
  const items = vocabularyLessonState.batches[vocabularyLessonState.batchIndex] || [];
  if (!items[index]) return;
  vocabularyLessonState.mode = 'batchReviewDetail';
  vocabularyLessonState.reviewDetailIndex = index;
  vocabularyLessonState.revealed = true;
  renderVocabularyLesson();
}

function exitVocabularyLessonBatchReviewDetail() {
  vocabularyLessonState.mode = 'batchReview';
  renderVocabularyLesson();
}

function continueVocabularyLessonAfterBatchReview() {
  if (vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1) {
    vocabularyLessonState.batchIndex += 1;
    vocabularyLessonState.wordIndex = 0;
    vocabularyLessonState.reviewScrollTop = 0;
    vocabularyLessonState.mode = 'teaching';
  } else {
    vocabularyLessonState.mode = 'finalMenu';
  }
  renderVocabularyLesson();
}

function returnVocabularyLessonFinalMenu() {
  vocabularyLessonState.mode = 'finalMenu';
  vocabularyLessonState.wordIndex = 0;
  renderVocabularyLesson();
}

function startVocabularyLessonRandomReview(replace = false) {
  if (!vocabularyLessonState.words.length) return;
  const result = createVocabularyLessonRandomBatch(
    vocabularyLessonState.words,
    vocabularyLessonState.randomPool,
    VOCABULARY_LESSON_RANDOM_SIZE
  );
  vocabularyLessonState.randomWords = result.items;
  vocabularyLessonState.randomPool = result.remainingKeys;
  vocabularyLessonState.randomIndex = 0;
  vocabularyLessonState.revealed = false;
  vocabularyLessonState.mode = 'randomReview';
  renderVocabularyLesson();
}

function startVocabularyLessonHardWordReview() {
  const hardItems = vocabularyLessonState.words.filter(item => vocabularyLessonState.hardWords.has(item.key));
  if (!hardItems.length) return;
  vocabularyLessonState.mode = 'hardWordReview';
  vocabularyLessonState.wordIndex = 0;
  vocabularyLessonState.revealed = true;
  renderVocabularyLesson();
}

function toggleVocabularyLessonHardWord() {
  const item = vocabularyLessonCurrentItem();
  if (!item) return;
  if (vocabularyLessonState.hardWords.has(item.key)) vocabularyLessonState.hardWords.delete(item.key);
  else vocabularyLessonState.hardWords.add(item.key);
  saveVocabularyLessonHardWords();

  if (vocabularyLessonState.mode === 'hardWordReview') {
    const remaining = vocabularyLessonCurrentItems();
    if (!remaining.length) {
      vocabularyLessonState.mode = 'finalMenu';
      vocabularyLessonState.wordIndex = 0;
    } else {
      vocabularyLessonState.wordIndex = Math.min(vocabularyLessonState.wordIndex, remaining.length - 1);
    }
  }
  renderVocabularyLesson();
}

function changeVocabularyReviewWord(delta) {
  const direction = Number(delta) < 0 ? -1 : 1;
  const mode = vocabularyLessonState.mode;
  const items = vocabularyLessonCurrentItems();
  if (!items.length) return;

  if (mode === 'teaching') {
    if (direction > 0 && vocabularyLessonState.wordIndex >= items.length - 1) {
      vocabularyLessonState.mode = 'batchReview';
      renderVocabularyLesson();
      return;
    }
    vocabularyLessonState.wordIndex = Math.max(0, Math.min(vocabularyLessonState.wordIndex + direction, items.length - 1));
  } else if (mode === 'batchReviewDetail') {
    vocabularyLessonState.reviewDetailIndex = (vocabularyLessonState.reviewDetailIndex + direction + items.length) % items.length;
  } else if (mode === 'randomReview') {
    vocabularyLessonState.randomIndex = (vocabularyLessonState.randomIndex + direction + items.length) % items.length;
    vocabularyLessonState.revealed = false;
  } else if (mode === 'hardWordReview') {
    vocabularyLessonState.wordIndex = (vocabularyLessonState.wordIndex + direction + items.length) % items.length;
  }
  renderVocabularyLesson();
}

function revealVocabularyReviewCard() {
  if (vocabularyLessonState.mode !== 'randomReview' || vocabularyLessonState.revealed) return;
  vocabularyLessonState.revealed = true;
  renderVocabularyLesson();
}

function speakVocabularyReviewWord() {
  const item = vocabularyLessonCurrentItem();
  if (!item) return;
  if (typeof speakWord === 'function') speakWord(item.word);
  else if (typeof speakEnglish === 'function') speakEnglish(item.word);
}

function preloadVocabularyReviewImages() {
  const items = vocabularyLessonCurrentItems();
  const index = vocabularyLessonCurrentIndex();
  if (!items.length || typeof Image === 'undefined') return;
  [-2, -1, 0, 1, 2].forEach(offset => {
    const item = items[(index + offset + items.length) % items.length];
    const source = item && item.visualType === 'scene' ? item.image : '';
    if (!source || vocabularyReviewPreloadedImages.has(source)) return;
    vocabularyReviewPreloadedImages.add(source);
    const image = new Image();
    image.src = source;
  });
}

function bindVocabularyLessonGestures() {
  const player = document.getElementById('screenVocabularyReviewPlayer');
  if (!player || player.dataset.vocabularyLessonGestures === '1') return;
  player.dataset.vocabularyLessonGestures = '1';
  player.addEventListener('touchstart', event => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch || vocabularyLessonState.mode === 'batchReview' || vocabularyLessonState.mode === 'finalMenu') return;
    vocabularyLessonTouchStart = { x: touch.clientX, y: touch.clientY };
    vocabularyLessonDidSwipe = false;
  }, { passive: true });
  player.addEventListener('touchend', event => {
    if (!vocabularyLessonTouchStart) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - vocabularyLessonTouchStart.x;
    const dy = touch.clientY - vocabularyLessonTouchStart.y;
    vocabularyLessonTouchStart = null;
    if (Math.abs(dx) <= 60 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    vocabularyLessonDidSwipe = true;
    changeVocabularyReviewWord(dx > 0 ? -1 : 1);
    window.setTimeout(() => { vocabularyLessonDidSwipe = false; }, 350);
  }, { passive: true });
}

function setVocabularyReviewWritePending(pending) {
  vocabularyReviewWritePending = pending;
  renderVocabularyLessonSharedAdmin();
}

async function updateVocabularyReviewSharedWord(word, remember) {
  if (!isTeacher()) return null;
  return await updateMainDataSafely(data => {
    const state = getVocabularyReviewState(data);
    const rememberedWords = new Set(state.rememberedWords);
    const available = allVocabularyReviewWords(data);
    const canonical = available.find(candidate => normalizeVocabularyLessonWord(candidate) === normalizeVocabularyLessonWord(word));
    if (!canonical) return false;
    const changed = remember ? !rememberedWords.has(canonical) : rememberedWords.has(canonical);
    if (remember) rememberedWords.add(canonical);
    else rememberedWords.delete(canonical);
    if (!changed) return false;
    data.vocabularyReviewState = {
      version: 1,
      rememberedWords: normalizeVocabularyReviewRememberedWords(Array.from(rememberedWords), data),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };
    return true;
  }, 2);
}

async function markVocabularyReviewWordRemembered(word) {
  if (!isTeacher() || vocabularyReviewWritePending || !word) return;
  setVocabularyReviewWritePending(true);
  const saved = await updateVocabularyReviewSharedWord(word, true);
  setVocabularyReviewWritePending(false);
  if (!saved) return;
  applyVocabularyReviewState(saved);
  renderVocabularyLessonSharedAdmin();
}

async function restoreVocabularyReviewWord(word) {
  if (!isTeacher() || vocabularyReviewWritePending || !word) return;
  setVocabularyReviewWritePending(true);
  const saved = await updateVocabularyReviewSharedWord(word, false);
  setVocabularyReviewWritePending(false);
  if (!saved) return;
  applyVocabularyReviewState(saved);
  renderVocabularyLessonSharedAdmin();
}

function refreshVocabularyReviewSharedStateFromAppData() {
  applyVocabularyReviewState(appData);
  const list = document.getElementById('screenVocabularyReviewList');
  if (list && list.classList.contains('active')) renderVocabularyLessonBookSelection();
}

function isVocabularyReviewPlayerActive() {
  return document.getElementById('screenVocabularyReviewPlayer')?.classList.contains('active');
}

// Compatibility shims retained for older inline calls and tests.
function setVocabularyReviewMode(mode) {
  if (mode === 'quiz') startVocabularyLessonRandomReview(false);
  else if (mode === 'learn') startVocabularyReview(0);
}
function shuffleVocabularyReviewItems(items, random = Math.random) {
  return shuffleVocabularyLessonItems(items, random);
}
function shuffleVocabularyReviewCards(random = Math.random) {
  vocabularyLessonState.words = shuffleVocabularyLessonItems(vocabularyLessonState.words, random);
  vocabularyLessonState.batches = chunkVocabularyLessonItems(vocabularyLessonState.words, VOCABULARY_LESSON_BATCH_SIZE);
  vocabularyLessonState.batchIndex = 0;
  vocabularyLessonState.wordIndex = 0;
  vocabularyLessonState.mode = 'teaching';
  renderVocabularyLesson();
}

installVocabularyLessonShell();

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
