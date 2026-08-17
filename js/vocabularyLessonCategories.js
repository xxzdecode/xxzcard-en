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
  let originalRenderVocabularyLessonBookSelection = null;

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

  function normalizeCategoryAssignment(value) {
    const source = value && typeof value === 'object' ? value : {};
    const categoryId = String(source.categoryId || source.id || '').trim();
    if (!categoryId) return null;
    const words = [];
    const seen = new Set();
    (Array.isArray(source.words) ? source.words : []).forEach(word => {
      const text = String(word || '').trim();
      const matchKey = normalizeCategoryWord(text);
      if (!text || !matchKey || seen.has(matchKey)) return;
      seen.add(matchKey);
      words.push(text);
    });
    if (!words.length) return null;
    return {
      categoryId,
      categoryName: String(source.categoryName || source.name || categoryId).trim() || categoryId,
      groupId: String(source.groupId || 'generated').trim() || 'generated',
      groupName: String(source.groupName || '自动分类').trim() || '自动分类',
      groupDescription: String(source.groupDescription || '').trim(),
      icon: String(source.icon || '📚').trim() || '📚',
      words
    };
  }

  function visibleCategoryBatches() {
    const visible = getVocabularyLessonVisibleBatches(appData, currentUser).slice();
    if (typeof compareVocabularyLessonBatchesNewestFirst === 'function') {
      visible.sort(compareVocabularyLessonBatchesNewestFirst);
    }
    return visible;
  }

  function mergeCategoryWords(category, words) {
    const seen = new Set((Array.isArray(category.words) ? category.words : []).map(normalizeCategoryWord).filter(Boolean));
    (Array.isArray(words) ? words : []).forEach(word => {
      const matchKey = normalizeCategoryWord(word);
      if (!matchKey || seen.has(matchKey)) return;
      seen.add(matchKey);
      category.words.push(String(word).trim());
    });
  }

  function effectiveCategoryRegistry() {
    const groups = categoryRegistry.groups.map(group => ({
      ...group,
      categories: group.categories.map(category => ({
        ...category,
        words: category.words.slice()
      }))
    }));
    const groupById = new Map(groups.map(group => [group.id, group]));
    const categoryById = new Map();
    groups.forEach(group => group.categories.forEach(category => categoryById.set(category.id, category)));

    visibleCategoryBatches().forEach(batch => {
      (Array.isArray(batch.categoryAssignments) ? batch.categoryAssignments : []).forEach(rawAssignment => {
        const assignment = normalizeCategoryAssignment(rawAssignment);
        if (!assignment) return;
        let group = groupById.get(assignment.groupId);
        if (!group) {
          group = {
            id: assignment.groupId,
            name: assignment.groupName,
            description: assignment.groupDescription || '由导入单词本携带的分类信息自动生成。',
            categories: []
          };
          groups.push(group);
          groupById.set(group.id, group);
        }
        let category = categoryById.get(assignment.categoryId);
        if (!category) {
          category = {
            id: assignment.categoryId,
            name: assignment.categoryName,
            icon: assignment.icon,
            words: []
          };
          group.categories.push(category);
          categoryById.set(category.id, category);
        }
        mergeCategoryWords(category, assignment.words);
      });
    });

    return {
      schemaVersion: 1,
      source: categoryRegistry.source,
      groups
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
    const byMatchKey = new Map();
    visibleCategoryBatches().forEach(batch => {
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
    const groups = effectiveCategoryRegistry().groups.map(group => {
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
        description: '这些词仍可正常授课，只是暂未收入分类索引。',
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
    if (typeof setVocabularyLessonSelectionRoute === 'function') {
      setVocabularyLessonSelectionRoute('categories');
    }
    installVocabularyLessonShell();
    ensureCategoryStyles();
    const list = document.getElementById('vocabularyLessonBookList');
    const empty = document.getElementById('vocabularyLessonBookEmpty');
    const title = document.getElementById('vocabularyLessonSelectionTitle');
    const copy = title && title.parentElement ? title.parentElement.querySelector('p') : null;
    const icon = document.querySelector('.vocabulary-lesson-selection-icon');
    const topbarTitle = document.querySelector('#screenVocabularyReviewList .topbar-title');
    const selectionCopy = document.querySelector('#screenVocabularyReviewList .vocabulary-lesson-selection-copy');
    if (!list) return;

    if (selectionCopy) selectionCopy.hidden = false;
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
    if (typeof window.decorateVocabularyLessonCategoryProgress === 'function') {
      window.decorateVocabularyLessonCategoryProgress();
    }
  }

  function renderCategorySecondaryEntry() {
    const list = document.getElementById('vocabularyLessonBookList');
    if (!list || document.getElementById('vocabularyLessonCategoryEntry')) return;
    const entry = document.createElement('button');
    entry.id = 'vocabularyLessonCategoryEntry';
    entry.className = 'vocabulary-lesson-book-button vocabulary-lesson-category-entry';
    entry.type = 'button';
    entry.addEventListener('click', openVocabularyLessonCategorySelection);
    entry.innerHTML = `
      <span aria-hidden="true">🗂️</span>
      <span class="vocabulary-lesson-book-name">分类词汇<small>按主题浏览</small></span>
      <span class="vocabulary-lesson-status-badge">次级入口</span>
      <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>`;
    list.appendChild(entry);
  }

  function renderBookSelectionWithCategoryEntry() {
    if (!originalRenderVocabularyLessonBookSelection) return;
    if (typeof setVocabularyLessonSelectionRoute === 'function') {
      setVocabularyLessonSelectionRoute('books');
    }
    originalRenderVocabularyLessonBookSelection();
    const topbarTitle = document.querySelector('#screenVocabularyReviewList .topbar-title');
    const title = document.getElementById('vocabularyLessonSelectionTitle');
    const copy = title && title.parentElement ? title.parentElement.querySelector('p') : null;
    const icon = document.querySelector('.vocabulary-lesson-selection-icon');
    const selectionCopy = document.querySelector('#screenVocabularyReviewList .vocabulary-lesson-selection-copy');
    if (selectionCopy) selectionCopy.hidden = false;
    if (topbarTitle) topbarTitle.textContent = '新词导览';
    if (title) title.textContent = '选择今天要讲的单词本';
    if (copy) copy.textContent = '优先显示今天或当前可见的单词本；分类词汇可从下方次级入口打开。';
    if (icon) icon.textContent = '🖼️';
    renderCategorySecondaryEntry();
  }

  function installSelectionBackButton(handler) {
    const button = document.querySelector('#screenVocabularyReviewList .back-btn');
    if (button) button.onclick = handler;
  }

  function openVocabularyLessonCategorySelection() {
    if (typeof clearVocabularyLessonTransientState === 'function') clearVocabularyLessonTransientState();
    if (typeof setVocabularyLessonSelectionRoute === 'function') {
      setVocabularyLessonSelectionRoute('categories');
    }
    renderCategorySelection();
    installSelectionBackButton(closeVocabularyLessonCategorySelection);
    showScreen('screenVocabularyReviewList');
  }

  function closeVocabularyLessonCategorySelection() {
    if (typeof clearVocabularyLessonTransientState === 'function') clearVocabularyLessonTransientState();
    if (typeof setVocabularyLessonSelectionRoute === 'function') {
      setVocabularyLessonSelectionRoute('books');
    }
    renderBookSelectionWithCategoryEntry();
    installSelectionBackButton(closeVocabularyReviewList);
    showScreen('screenVocabularyReviewList');
  }

  function makeVirtualCategoryBatch(category) {
    return {
      id: `${VIRTUAL_BATCH_PREFIX}${category.id}`,
      name: `分类｜${category.name}`,
      bookPurpose: 'common',
      vocabularyLessonTransient: true,
      cards: category.cards.slice()
    };
  }

  async function selectVocabularyLessonCategory(categoryId) {
    await loadVocabularyLessonCategories();
    const category = categoryById(String(categoryId || ''));
    if (!category || !category.cards.length || !originalSelectVocabularyLessonBook) return false;
    const virtualBatch = makeVirtualCategoryBatch(category);
    const opened = typeof window.selectVocabularyLessonVirtualBatch === 'function'
      ? await window.selectVocabularyLessonVirtualBatch(virtualBatch, null)
      : false;
    if (!opened) return false;
    vocabularyLessonState.categoryId = category.id;
    vocabularyLessonState.categoryName = category.name;
    renderVocabularyLesson();
    return true;
  }

  function installOverrides() {
    if (installed || !playerReady()) return false;
    installed = true;
    ensureCategoryStyles();
    originalSelectVocabularyLessonBook = selectVocabularyLessonBook;
    originalRenderVocabularyLesson = renderVocabularyLesson;
    originalRenderVocabularyLessonBookSelection = renderVocabularyLessonBookSelection;
    renderVocabularyLessonBookSelection = renderBookSelectionWithCategoryEntry;
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
    window.normalizeVocabularyCategoryAssignment = normalizeCategoryAssignment;
    window.getVocabularyLessonEffectiveCategoryRegistry = effectiveCategoryRegistry;
    window.getVocabularyLessonCategoryById = categoryById;
    window.makeVocabularyLessonVirtualCategoryBatch = makeVirtualCategoryBatch;
    window.renderVocabularyLessonCategorySelection = renderCategorySelection;
    window.openVocabularyLessonCategorySelection = openVocabularyLessonCategorySelection;
    window.closeVocabularyLessonCategorySelection = closeVocabularyLessonCategorySelection;
    window.getVocabularyLessonAvailableCategoryGroups = availableCategoryGroups;
    loadVocabularyLessonCategories().then(() => {
      if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) {
        if (typeof refreshVocabularyLessonSelectionRoute === 'function') {
          refreshVocabularyLessonSelectionRoute();
        } else {
          renderVocabularyLessonBookSelection();
        }
      }
    });
    return true;
  }

  function waitForPlayer() {
    if (installOverrides()) return;
    window.setTimeout(waitForPlayer, 0);
  }

  function loadLowPressureGroups() {
    if (document.getElementById('vocabularyLessonLowPressureGroupsScript')) return;
    const script = document.createElement('script');
    script.id = 'vocabularyLessonLowPressureGroupsScript';
    script.src = 'js/vocabularyLessonLowPressureGroups.js';
    script.async = false;
    document.head.appendChild(script);
  }

  waitForPlayer();
  loadLowPressureGroups();
})();
