(function installVocabularyLessonCategories() {
  'use strict';

  const CATEGORY_REGISTRY_URL = 'data/vocabularyCategories.json';
  const CATEGORY_STYLE_URL = 'styles-vocabulary-lesson-categories.css';
  const VIRTUAL_BATCH_PREFIX = 'vocabulary-category:';
  const SCHOOL_NAME_PATTERN = /^\s*校内(?:词汇)?\s*[｜|]\s*(四年级|4年级|七年级|7年级)\s*[｜|]\s*(\d{4}-\d{2}-\d{2})\s*$/;
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
    return String(value || '').trim().toLocaleLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
  }

  function normalizeSchoolGrade(value) {
    const grade = String(value || '').trim().toLocaleLowerCase();
    if (grade === '4' || grade === '4年级' || grade === '四年级' || grade === 'grade 4') return '4';
    if (grade === '7' || grade === '7年级' || grade === '七年级' || grade === 'grade 7') return '7';
    return '';
  }

  function normalizeISODate(value) {
    const text = String(value || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return '';
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1])
      && date.getMonth() === Number(match[2]) - 1
      && date.getDate() === Number(match[3]) ? text : '';
  }

  function schoolGuideMeta(batch) {
    const section = batch && batch.guideSection && typeof batch.guideSection === 'object' ? batch.guideSection : {};
    const kind = String(section.kind || section.type || '').trim().toLocaleLowerCase();
    const grade = normalizeSchoolGrade(section.grade);
    const date = normalizeISODate(section.date);
    if (kind === 'school' && grade && date) return { kind: 'school', grade, date };
    const match = SCHOOL_NAME_PATTERN.exec(String(batch && batch.name || '').trim());
    if (!match) return null;
    const inferredGrade = normalizeSchoolGrade(match[1]);
    const inferredDate = normalizeISODate(match[2]);
    return inferredGrade && inferredDate ? { kind: 'school', grade: inferredGrade, date: inferredDate } : null;
  }

  function validateCategoryRegistry(value) {
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.groups)) return { schemaVersion: 1, groups: [] };
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

  function allCategoryBatches() {
    return Array.isArray(appData && appData.batches) ? appData.batches : [];
  }

  function visibleGuideBatches() {
    return typeof getVocabularyLessonVisibleBatches === 'function'
      ? getVocabularyLessonVisibleBatches(appData, currentUser)
      : allCategoryBatches();
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
      categories: group.categories.map(category => ({ ...category, words: category.words.slice() }))
    }));
    const groupById = new Map(groups.map(group => [group.id, group]));
    const categoryById = new Map();
    groups.forEach(group => group.categories.forEach(category => categoryById.set(category.id, category)));
    allCategoryBatches().forEach(batch => {
      (Array.isArray(batch.categoryAssignments) ? batch.categoryAssignments : []).forEach(rawAssignment => {
        const assignment = normalizeCategoryAssignment(rawAssignment);
        if (!assignment) return;
        let group = groupById.get(assignment.groupId);
        if (!group) {
          group = { id: assignment.groupId, name: assignment.groupName, description: assignment.groupDescription, categories: [] };
          groups.push(group);
          groupById.set(group.id, group);
        }
        let category = categoryById.get(assignment.categoryId);
        if (!category) {
          category = { id: assignment.categoryId, name: assignment.categoryName, icon: assignment.icon, words: [] };
          group.categories.push(category);
          categoryById.set(category.id, category);
        }
        mergeCategoryWords(category, assignment.words);
      });
    });
    return { schemaVersion: 1, source: categoryRegistry.source, groups };
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

  function masterCategoryCards() {
    const byMatchKey = new Map();
    const masterCards = appData && appData.masterCards && typeof appData.masterCards === 'object'
      ? Object.values(appData.masterCards)
      : [];
    masterCards.forEach(card => {
      const matchKey = normalizeCategoryWord(getVocabularyLessonCardWord(card));
      if (matchKey && !byMatchKey.has(matchKey)) byMatchKey.set(matchKey, card);
    });
    if (byMatchKey.size) return byMatchKey;
    allCategoryBatches().forEach(batch => {
      (Array.isArray(batch.cards) ? batch.cards : []).forEach(card => {
        const matchKey = normalizeCategoryWord(getVocabularyLessonCardWord(card));
        if (matchKey && !byMatchKey.has(matchKey)) byMatchKey.set(matchKey, card);
      });
    });
    return byMatchKey;
  }

  function schoolCategoryGroup() {
    const grades = ['4', '7'].map(grade => ({
      id: `school-grade-${grade}`,
      name: grade === '4' ? '四年级' : '七年级',
      grade,
      categories: []
    }));
    const gradeById = new Map(grades.map(item => [item.grade, item]));
    visibleGuideBatches().forEach(batch => {
      const meta = schoolGuideMeta(batch);
      if (!meta || !Array.isArray(batch.cards) || !batch.cards.length) return;
      gradeById.get(meta.grade).categories.push({
        id: `school-${String(batch.id)}`,
        name: meta.date,
        icon: '🏫',
        cards: batch.cards.slice(),
        schoolMeta: meta,
        sourceBatchId: String(batch.id)
      });
    });
    grades.forEach(grade => grade.categories.sort((left, right) => (
      String(right.schoolMeta.date).localeCompare(String(left.schoolMeta.date))
      || String(right.sourceBatchId).localeCompare(String(left.sourceBatchId))
    )));
    return {
      id: 'school',
      name: '校内词汇',
      description: '按年级和日期整理。',
      categories: grades.flatMap(grade => grade.categories),
      schoolGrades: grades
    };
  }

  function availableCategoryGroups() {
    const cardIndex = masterCategoryCards();
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

    groups.push(schoolCategoryGroup());
    const unclassified = [];
    cardIndex.forEach((card, matchKey) => {
      if (!matchedKeys.has(matchKey)) unclassified.push(card);
    });
    unclassified.sort((left, right) => String(getVocabularyLessonCardWord(left))
      .localeCompare(String(getVocabularyLessonCardWord(right)), 'en'));
    if (unclassified.length) {
      groups.push({
        id: 'unclassified',
        name: '未分类',
        description: '暂未整理进主题或功能分类的单词。',
        categories: [{ id: 'unclassified', name: '未分类', icon: '🗂️', cards: unclassified }]
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

  function makeVirtualCategoryBatch(category) {
    const cards = category.cards.slice();
    return {
      id: `${VIRTUAL_BATCH_PREFIX}${category.id}`,
      name: category.name,
      bookPurpose: 'common',
      vocabularyLessonTransient: true,
      vocabularyLessonGroupSize: category.id === 'unclassified' ? Math.max(1, cards.length) : undefined,
      cards
    };
  }

  function groupConfigForCategory(category) {
    if (!window.VocabularyLessonGroups) return { groups: [] };
    const batch = makeVirtualCategoryBatch(category);
    return window.VocabularyLessonGroups.reconcileVocabularyLessonGroups(
      batch,
      null,
      batch.vocabularyLessonGroupSize || window.VocabularyLessonGroups.GROUP_SIZE || 20
    );
  }

  function renderCategoryCard(category) {
    const encodedId = encodeURIComponent(category.id);
    const groups = groupConfigForCategory(category).groups;
    const icon = `<span class="vocabulary-lesson-category-icon" aria-hidden="true">${escapeCategoryHtml(category.icon)}</span>`;
    const label = `<span class="vocabulary-lesson-category-label"><strong>${escapeCategoryHtml(category.name)}</strong><span class="vocabulary-lesson-category-count">${category.cards.length} 词</span></span>`;
    if (groups.length <= 1) {
      const group = groups[0];
      return `<article class="vocabulary-lesson-category-card" data-category-id="${escapeCategoryHtml(category.id)}">
        <button class="vocabulary-lesson-category-button" type="button" data-group-id="${escapeCategoryHtml(group && group.id)}" onclick="selectVocabularyLessonCategoryGroup(decodeURIComponent('${encodedId}'), 0)">
          ${icon}${label}
          <span class="vocabulary-lesson-category-check" aria-hidden="true">✓</span>
          <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>
        </button>
      </article>`;
    }
    return `<article class="vocabulary-lesson-category-card" data-category-id="${escapeCategoryHtml(category.id)}">
      <div class="vocabulary-lesson-category-heading">
        ${icon}
        <div class="vocabulary-lesson-category-content">
          ${label}
          <div class="vocabulary-lesson-inline-groups">
            ${groups.map((group, index) => `<button type="button" data-group-id="${escapeCategoryHtml(group.id)}" onclick="selectVocabularyLessonCategoryGroup(decodeURIComponent('${encodedId}'), ${index})"><span>第${index + 1}组 · ${group.wordKeys.length}词</span><span class="vocabulary-lesson-group-check" aria-hidden="true">✓</span></button>`).join('')}
          </div>
        </div>
        <span class="vocabulary-lesson-category-check" aria-hidden="true">✓</span>
      </div>
    </article>`;
  }

  function renderRegularGroup(group) {
    return `<section class="vocabulary-lesson-category-group" data-guide-group="${escapeCategoryHtml(group.id)}" aria-labelledby="vocabularyCategoryGroup-${escapeCategoryHtml(group.id)}">
      <header><h2 id="vocabularyCategoryGroup-${escapeCategoryHtml(group.id)}">${escapeCategoryHtml(group.name)}</h2>${group.description ? `<p>${escapeCategoryHtml(group.description)}</p>` : ''}</header>
      <div class="vocabulary-lesson-category-grid">${group.categories.map(renderCategoryCard).join('')}</div>
    </section>`;
  }

  function renderSchoolGroup(group) {
    return `<section class="vocabulary-lesson-category-group vocabulary-lesson-school-group" data-guide-group="school" aria-labelledby="vocabularyCategoryGroup-school">
      <header><h2 id="vocabularyCategoryGroup-school">${escapeCategoryHtml(group.name)}</h2><p>${escapeCategoryHtml(group.description)}</p></header>
      <div class="vocabulary-lesson-school-grades">
        ${group.schoolGrades.map(grade => `<section class="vocabulary-lesson-school-grade" data-school-grade="${grade.grade}">
          <h3>${escapeCategoryHtml(grade.name)}</h3>
          <div class="vocabulary-lesson-category-grid">${grade.categories.length ? grade.categories.map(renderCategoryCard).join('') : '<p class="vocabulary-lesson-school-empty">暂无内容</p>'}</div>
        </section>`).join('')}
      </div>
    </section>`;
  }

  function renderCategorySelection() {
    if (typeof setVocabularyLessonSelectionRoute === 'function') setVocabularyLessonSelectionRoute('categories');
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
    if (topbarTitle) topbarTitle.textContent = '新词导览';
    if (title) title.textContent = '选择今天要讲的词汇';
    if (copy) copy.textContent = '按主题、功能和校内内容选择；完成的分组会自动移到最后。';
    if (icon) icon.textContent = '🗂️';
    installSelectionBackButton(closeVocabularyReviewList);

    if (!categoryRegistryLoaded) {
      list.innerHTML = '<p class="vocabulary-lesson-category-loading">正在整理分类……</p>';
      if (empty) empty.hidden = true;
      loadVocabularyLessonCategories().then(renderCategorySelection);
      return;
    }
    const groups = availableCategoryGroups();
    list.className = 'vocabulary-lesson-book-list vocabulary-lesson-category-list';
    list.innerHTML = groups.map(group => group.id === 'school' ? renderSchoolGroup(group) : renderRegularGroup(group)).join('');
    if (empty) {
      empty.textContent = '分类索引暂时无法读取，请刷新后重试。';
      empty.hidden = groups.length > 0;
    }
    const sharedAdmin = document.getElementById('vocabularyLessonSharedAdmin');
    if (sharedAdmin) sharedAdmin.hidden = true;
    if (typeof window.decorateVocabularyLessonCategoryProgress === 'function') window.decorateVocabularyLessonCategoryProgress();
  }

  function installSelectionBackButton(handler) {
    const button = document.querySelector('#screenVocabularyReviewList .back-btn');
    if (button) button.onclick = handler;
  }

  function openVocabularyLessonCategorySelection() {
    if (typeof clearVocabularyLessonTransientState === 'function') clearVocabularyLessonTransientState();
    renderCategorySelection();
    showScreen('screenVocabularyReviewList');
  }

  function closeVocabularyLessonCategorySelection() {
    if (typeof clearVocabularyLessonTransientState === 'function') clearVocabularyLessonTransientState();
    closeVocabularyReviewList();
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
    renderVocabularyLessonBookSelection = renderCategorySelection;
    renderVocabularyLesson = function renderVocabularyLessonWithCategoryTitle() {
      originalRenderVocabularyLesson();
      const title = document.getElementById('vocabularyLessonModeTitle');
      if (title && vocabularyLessonState.categoryName && vocabularyLessonState.mode === 'teaching') title.textContent = vocabularyLessonState.categoryName;
    };
    window.loadVocabularyLessonCategories = loadVocabularyLessonCategories;
    window.selectVocabularyLessonCategory = selectVocabularyLessonCategory;
    window.normalizeVocabularyCategoryWord = normalizeCategoryWord;
    window.normalizeVocabularyCategoryAssignment = normalizeCategoryAssignment;
    window.getVocabularyLessonEffectiveCategoryRegistry = effectiveCategoryRegistry;
    window.getVocabularyLessonCategoryById = categoryById;
    window.getVocabularyLessonSchoolGuideMeta = schoolGuideMeta;
    window.makeVocabularyLessonVirtualCategoryBatch = makeVirtualCategoryBatch;
    window.getVocabularyLessonCategoryGroupConfig = groupConfigForCategory;
    window.renderVocabularyLessonCategorySelection = renderCategorySelection;
    window.openVocabularyLessonCategorySelection = openVocabularyLessonCategorySelection;
    window.closeVocabularyLessonCategorySelection = closeVocabularyLessonCategorySelection;
    window.getVocabularyLessonAvailableCategoryGroups = availableCategoryGroups;
    loadVocabularyLessonCategories().then(() => {
      if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) renderCategorySelection();
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
