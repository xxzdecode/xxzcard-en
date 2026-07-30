(function installVocabularyLessonCategories() {
  'use strict';

  const CATEGORY_REGISTRY_URL = 'data/vocabularyCategories.json';
  const CATEGORY_STYLE_URL = 'styles-vocabulary-lesson-categories.css';
  const VIRTUAL_BATCH_PREFIX = 'vocabulary-category:';
  const MAX_CATEGORY_WORDS = 40;
  let categoryRegistry = { schemaVersion: 1, groups: [] };
  let categoryRegistryPromise = null;
  let categoryRegistryLoaded = false;
  let installed = false;
  let originalSelectVocabularyLessonBook = null;
  let originalRenderVocabularyLesson = null;

  function playerReady() {
    return typeof installVocabularyLessonShell === 'function'
      && typeof renderVocabularyLessonBookSelection === 'function'
      && typeof selectVocabularyLessonBook === 'function'
      && typeof renderVocabularyLesson === 'function'
      && typeof vocabularyLessonState !== 'undefined';
  }

  function normalizeCategoryWord(value) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function validateCategoryRegistry(value) {
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.groups)) {
      return { schemaVersion: 1, groups: [] };
    }
    return {
      schemaVersion: 1,
      source: String(value.source || ''),
      groups: value.groups
        .filter(group => group && typeof group.id === 'string' && Array.isArray(group.categories))
        .map(group => ({
          id: group.id,
          name: String(group.name || group.id),
          description: String(group.description || ''),
          categories: group.categories
            .filter(category => category && typeof category.id === 'string' && Array.isArray(category.words))
            .map(category => ({
              id: category.id,
              name: String(category.name || category.id),
              icon: String(category.icon || '📚'),
              words: category.words.map(String).filter(Boolean)
            }))
        }))
    };
  }

  function ensureCategoryStyles() {
    if (document.getElementById('vocabularyLessonCategoryStyles')) return;
    const link = document.createElement('link');
    link.id = 'vocabularyLessonCategoryStyles';
    link.rel = 'stylesheet';
    link.href = CATEGORY_STYLE_URL;
    document.head.appendChild(link);
  }

  function loadVocabularyLessonCategories(force = false) {
    if (!force && categoryRegistryPromise) return categoryRegistryPromise;
    categoryRegistryLoaded = false;
    categoryRegistryPromise = fetch(CATEGORY_REGISTRY_URL, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`category registry HTTP ${response.status}`);
        return response.json();
      })
      .then(value => {
        categoryRegistry = validateCategoryRegistry(value);
        categoryRegistryLoaded = true;
        return categoryRegistry;
      })
      .catch(error => {
        console.warn('Vocabulary category registry unavailable.', error);
        categoryRegistry = { schemaVersion: 1, groups: [] };
        categoryRegistryLoaded = true;
        return categoryRegistry;
      });
    return categoryRegistryPromise;
  }

  function visibleCategoryCards() {
    const visible = getVocabularyLessonVisibleBatches(appData, currentUser).slice();
    if (typeof compareVocabularyLessonBatchesNewestFirst === 'function') {
      visible.sort(compareVocabularyLessonBatchesNewestFirst);
    }
    const byMatchKey = new Map();
    visible.forEach(batch => {
      (Array.isArray(batch.cards) ? batch.cards : []).forEach(card => {
        const word = getVocabularyLessonCardWord(card);
        const matchKey = normalizeCategoryWord(word);
        if (matchKey && !byMatchKey.has(matchKey)) byMatchKey.set(matchKey, card);
      });
    });
    return byMatchKey;
  }

  function availableCategoryGroups() {
    const cardIndex = visibleCategoryCards();
    const matchedKeys = new Set();
    const groups = categoryRegistry.groups.map(group => {
      const categories = group.categories.map(category => {
        const cards = [];
        const seen = new Set();
        category.words.forEach(word => {
          const matchKey = normalizeCategoryWord(word);
          const card = cardIndex.get(matchKey);
          const cardKey = card && normalizeVocabularyLessonWord(getVocabularyLessonCardWord(card));
          if (!card || !cardKey || seen.has(cardKey)) return;
          seen.add(cardKey);
          matchedKeys.add(matchKey);
          cards.push(card);
        });
        return { ...category, cards };
      }).filter(category => category.cards.length > 0);
      return { ...group, categories };
    }).filter(group => group.categories.length > 0);

    const unclassified = [];
    cardIndex.forEach((card, matchKey) => {
      if (!matchedKeys.has(matchKey)) unclassified.push(card);
    });
    if (unclassified.length) {
      const categories = [];
      for (let index = 0; index < unclassified.length; index += MAX_CATEGORY_WORDS) {
        const part = Math.floor(index / MAX_CATEGORY_WORDS) + 1;
        const multiple = unclassified.length > MAX_CATEGORY_WORDS;
        categories.push({
          id: `unclassified-${part}`,
          name: multiple ? `其他未分类 ${part}` : '其他未分类',
          icon: '🗂️',
          cards: unclassified.slice(index, index + MAX_CATEGORY_WORDS)
        });
      }
      groups.push({
        id: 'unclassified',
        name: '待继续整理',
        description: '这些词仍可正常授课，只是暂未收入附件分类索引。',
        categories
      });
    }
    return groups;
  }

  function categoryById(categoryId) {
    for (const group of availableCategoryGroups()) {
      const category = group.categories.find(item => item.id === categoryId);
      if (category) return category;
    }
    return null;
  }

  function escapeCategoryHtml(value) {
    if (typeof escapeVocabularyLessonHtml === 'function') return escapeVocabularyLessonHtml(value);
    return String(value || '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function renderCategorySelection() {
    installVocabularyLessonShell();
    ensureCategoryStyles();
    const list = document.getElementById('vocabularyLessonBookList');
    const empty = document.getElementById('vocabularyLessonBookEmpty');
    const title = document.getElementById('vocabularyLessonSelectionTitle');
    const copy = title && title.parentElement ? title.parentElement.querySelector('p') : null;
    const icon = document.querySelector('.vocabulary-lesson-selection-icon');
    const topbarTitle = document.querySelector('#screenVocabularyReviewList .topbar-title');
    if (!list) return;

    if (topbarTitle) topbarTitle.textContent = '分类词汇导览';
    if (title) title.textContent = '选择词汇类别';
    if (copy) copy.textContent = '同一个词可以出现在多个类别中；正式单词卡和探险记录不会改变。';
    if (icon) icon.textContent = '🗂️';

    if (!categoryRegistryLoaded) {
      list.innerHTML = '<p class="vocabulary-lesson-category-loading">正在整理分类……</p>';
      if (empty) empty.hidden = true;
      loadVocabularyLessonCategories().then(renderCategorySelection);
      return;
    }

    const groups = availableCategoryGroups();
    list.className = 'vocabulary-lesson-book-list vocabulary-lesson-category-list';
    list.innerHTML = groups.map(group => `
      <section class="vocabulary-lesson-category-group" aria-labelledby="vocabularyCategoryGroup-${escapeCategoryHtml(group.id)}">
        <header>
          <h2 id="vocabularyCategoryGroup-${escapeCategoryHtml(group.id)}">${escapeCategoryHtml(group.name)}</h2>
          ${group.description ? `<p>${escapeCategoryHtml(group.description)}</p>` : ''}
        </header>
        <div class="vocabulary-lesson-category-grid">
          ${group.categories.map(category => `
            <button class="vocabulary-lesson-category-button" type="button" onclick="selectVocabularyLessonCategory(decodeURIComponent('${encodeURIComponent(category.id)}'))">
              <span class="vocabulary-lesson-category-icon" aria-hidden="true">${escapeCategoryHtml(category.icon)}</span>
              <strong>${escapeCategoryHtml(category.name)}</strong>
              <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>
            </button>`).join('')}
        </div>
      </section>`).join('');
    if (empty) {
      empty.textContent = categoryRegistry.groups.length
        ? '当前可见单词中没有匹配到分类词。'
        : '分类索引暂时无法读取，请刷新后重试。';
      empty.hidden = groups.length > 0;
    }
    if (typeof renderVocabularyLessonSharedAdmin === 'function') renderVocabularyLessonSharedAdmin();
  }

  function makeVirtualCategoryBatch(category) {
    return {
      id: `${VIRTUAL_BATCH_PREFIX}${category.id}`,
      name: `分类｜${category.name}`,
      bookPurpose: 'common',
      sharedWith: ['sister', 'brother'],
      createdAt: '9999-12-31',
      cards: category.cards.slice()
    };
  }

  async function selectVocabularyLessonCategory(categoryId) {
    await loadVocabularyLessonCategories();
    const category = categoryById(String(categoryId || ''));
    if (!category || !category.cards.length || !originalSelectVocabularyLessonBook) return false;
    const virtualBatch = makeVirtualCategoryBatch(category);
    appData.batches.push(virtualBatch);
    try {
      originalSelectVocabularyLessonBook(virtualBatch.id);
      vocabularyLessonState.categoryId = category.id;
      vocabularyLessonState.categoryName = category.name;
      renderVocabularyLesson();
      return true;
    } finally {
      const index = appData.batches.indexOf(virtualBatch);
      if (index >= 0) appData.batches.splice(index, 1);
    }
  }

  function installOverrides() {
    if (installed || !playerReady()) return false;
    installed = true;
    ensureCategoryStyles();
    originalSelectVocabularyLessonBook = selectVocabularyLessonBook;
    originalRenderVocabularyLesson = renderVocabularyLesson;
    renderVocabularyLessonBookSelection = renderCategorySelection;
    renderVocabularyLesson = function renderVocabularyLessonWithCategoryTitle() {
      originalRenderVocabularyLesson();
      const title = document.getElementById('vocabularyLessonModeTitle');
      if (title && vocabularyLessonState.categoryName && vocabularyLessonState.mode === 'teaching') {
        title.textContent = vocabularyLessonState.categoryName;
      }
    };
    window.loadVocabularyLessonCategories = loadVocabularyLessonCategories;
    window.selectVocabularyLessonCategory = selectVocabularyLessonCategory;
    window.normalizeVocabularyCategoryWord = normalizeCategoryWord;
    loadVocabularyLessonCategories().then(() => {
      if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) {
        renderVocabularyLessonBookSelection();
      }
    });
    return true;
  }

  function waitForPlayer() {
    if (installOverrides()) return;
    window.setTimeout(waitForPlayer, 0);
  }

  waitForPlayer();
})();