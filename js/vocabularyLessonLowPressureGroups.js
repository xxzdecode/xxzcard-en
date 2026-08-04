(function vocabularyLessonLowPressureGroupsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyLessonLowPressureGroups() {
  'use strict';

  const ROUND_SIZE = 10;
  const CATEGORY_BATCH_PREFIX = 'vocabulary-category:';
  const PROGRESS_KEY_PREFIX = 'vocab_lesson_progress_v1_';
  const STYLE_ID = 'vocabularyLessonLowPressureGroupsStyles';

  function clamp(value, min, max) {
    const number = Math.trunc(Number(value));
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function roundOffset(wordIndex, size = ROUND_SIZE) {
    const safeSize = Math.max(1, Math.trunc(Number(size)) || ROUND_SIZE);
    return Math.floor(Math.max(0, Math.trunc(Number(wordIndex)) || 0) / safeSize) * safeSize;
  }

  function sliceRound(items, wordIndex, size = ROUND_SIZE) {
    const source = Array.isArray(items) ? items : [];
    const offset = roundOffset(wordIndex, size);
    return source.slice(offset, offset + size);
  }

  function normalizeProgressEntry(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      status: source.status === 'completed' ? 'completed' : 'active',
      wordIndex: Math.max(0, Math.trunc(Number(source.wordIndex)) || 0)
    };
  }

  function completedWordCount(config, progressValue) {
    const groups = Array.isArray(config && config.groups) ? config.groups : [];
    const progress = progressValue && typeof progressValue === 'object' ? progressValue : {};
    return groups.reduce((sum, group) => {
      const entry = normalizeProgressEntry(progress.groups && progress.groups[group.id]);
      return sum + (entry.status === 'completed' ? group.wordKeys.length : 0);
    }, 0);
  }

  function firstIncompleteGroupIndex(config, progressValue) {
    const groups = Array.isArray(config && config.groups) ? config.groups : [];
    const progress = progressValue && typeof progressValue === 'object' ? progressValue : {};
    const active = groups
      .map((group, index) => ({ index, entry: normalizeProgressEntry(progress.groups && progress.groups[group.id]) }))
      .find(item => item.entry.status !== 'completed' && item.entry.wordIndex > 0);
    if (active) return active.index;
    const incomplete = groups.findIndex(group => normalizeProgressEntry(progress.groups && progress.groups[group.id]).status !== 'completed');
    return incomplete >= 0 ? incomplete : 0;
  }

  function groupProgressLabel(group, progressValue) {
    const total = Array.isArray(group && group.wordKeys) ? group.wordKeys.length : 0;
    const progress = progressValue && typeof progressValue === 'object' ? progressValue : {};
    const entry = normalizeProgressEntry(progress.groups && group && progress.groups[group.id]);
    if (!total) return '0/0';
    if (entry.status === 'completed') return `${total}/${total}`;
    const seen = entry.wordIndex > 0 ? Math.min(total, entry.wordIndex + 1) : 0;
    return `${seen}/${total}`;
  }

  function install(root) {
    if (root.__vocabularyLessonLowPressureGroupsInstalled) return false;

    const ready = () => Boolean(
      root.VocabularyLessonGroups
      && typeof root.getVocabularyLessonCategoryById === 'function'
      && typeof root.makeVocabularyLessonVirtualCategoryBatch === 'function'
      && typeof root.renderVocabularyLessonCategorySelection === 'function'
      && typeof root.selectVocabularyLessonGroup === 'function'
      && typeof root.renderVocabularyLesson === 'function'
      && typeof root.vocabularyLessonCurrentItems === 'function'
      && typeof root.vocabularyLessonCurrentIndex === 'function'
      && typeof root.continueVocabularyLessonAfterBatchReview === 'function'
      && typeof root.changeVocabularyReviewWord === 'function'
      && typeof root.closeVocabularyReviewPlayer === 'function'
      && typeof root.jumpVocabularyLessonBatch === 'function'
      && typeof root.sbGet === 'function'
      && typeof root.sbSet === 'function'
      && typeof root.showScreen === 'function'
      && typeof vocabularyLessonState !== 'undefined'
    );

    const wait = () => {
      if (!ready()) {
        root.setTimeout(wait, 0);
        return;
      }
      applyOverrides();
    };

    function applyOverrides() {
      if (root.__vocabularyLessonLowPressureGroupsInstalled) return;
      root.__vocabularyLessonLowPressureGroupsInstalled = true;
      ensureStyles();

      const baseRenderSelection = root.renderVocabularyLessonCategorySelection;
      const baseRenderLesson = root.renderVocabularyLesson;
      const baseSelectCategory = root.selectVocabularyLessonCategory;
      const baseCurrentItems = root.vocabularyLessonCurrentItems;
      const baseCurrentIndex = root.vocabularyLessonCurrentIndex;
      const baseChangeWord = root.changeVocabularyReviewWord;
      const baseContinueAfterReview = root.continueVocabularyLessonAfterBatchReview;
      const baseClosePlayer = root.closeVocabularyReviewPlayer;
      const baseJumpGroup = root.jumpVocabularyLessonBatch;
      const baseRenderImageWall = root.renderVocabularyLessonImageWall;
      const baseOpenReviewDetail = root.openVocabularyLessonBatchReviewDetail;

      let activeCategory = null;
      let virtualBatch = null;
      let progressCache = null;
      let positionSaveTimer = 0;

      function lessonState() {
        return typeof vocabularyLessonState === 'undefined' ? null : vocabularyLessonState;
      }

      function currentUserValue() {
        return typeof currentUser === 'undefined' ? '' : currentUser;
      }

      function isStudent() {
        const user = currentUserValue();
        return user === 'sister' || user === 'brother';
      }

      function isCategoryMode() {
        const state = lessonState();
        return Boolean(activeCategory && state && state.categoryId === activeCategory.id);
      }

      function progressKey() {
        return `${PROGRESS_KEY_PREFIX}${currentUserValue()}`;
      }

      async function loadProgress(force = false) {
        if (!isStudent()) return root.VocabularyLessonGroups.defaultVocabularyLessonProgress();
        if (!force && progressCache) return progressCache;
        try {
          progressCache = root.VocabularyLessonGroups.normalizeVocabularyLessonProgress(await root.sbGet(progressKey()));
        } catch (error) {
          console.warn('Vocabulary category progress load failed', error);
          progressCache = root.VocabularyLessonGroups.defaultVocabularyLessonProgress();
        }
        return progressCache;
      }

      async function saveProgress(progress) {
        if (!isStudent()) return true;
        progressCache = root.VocabularyLessonGroups.normalizeVocabularyLessonProgress(progress);
        try {
          await root.sbSet(progressKey(), progressCache);
          return true;
        } catch (error) {
          console.warn('Vocabulary category progress save failed', error);
          if (typeof root.showStorageError === 'function') root.showStorageError(error);
          return false;
        }
      }

      function ensureVirtualBatch(category) {
        if (virtualBatch && virtualBatch.id === `${CATEGORY_BATCH_PREFIX}${category.id}`) return virtualBatch;
        removeVirtualBatch();
        virtualBatch = root.makeVocabularyLessonVirtualCategoryBatch(category);
        return virtualBatch;
      }

      function removeVirtualBatch() {
        virtualBatch = null;
      }

      function resetCategoryRuntime() {
        root.clearTimeout(positionSaveTimer);
        positionSaveTimer = 0;
        activeCategory = null;
        virtualBatch = null;
        progressCache = null;
      }

      function groupConfigForCategory(category) {
        const batch = root.makeVocabularyLessonVirtualCategoryBatch(category);
        return root.VocabularyLessonGroups.reconcileVocabularyLessonGroups(batch, null, root.VocabularyLessonGroups.GROUP_SIZE || 20);
      }

      function currentGroupItems() {
        const state = lessonState();
        return Array.isArray(state.batches && state.batches[state.batchIndex])
          ? state.batches[state.batchIndex]
          : [];
      }

      function currentRoundItems() {
        const state = lessonState();
        return sliceRound(currentGroupItems(), state.wordIndex, ROUND_SIZE);
      }

      function currentRoundOffset() {
        const state = lessonState();
        return roundOffset(state.wordIndex, ROUND_SIZE);
      }

      function relativeWordIndex() {
        const state = lessonState();
        return Math.max(0, state.wordIndex - currentRoundOffset());
      }

      function setAbsoluteWordIndex(index) {
        const items = currentGroupItems();
        const state = lessonState();
        state.wordIndex = clamp(index, 0, Math.max(0, items.length - 1));
      }

      function queueCurrentPositionSave() {
        if (!isCategoryMode() || !isStudent()) return;
        root.clearTimeout(positionSaveTimer);
        positionSaveTimer = root.setTimeout(async () => {
          const state = lessonState();
          const group = state.groupConfig && state.groupConfig.groups[state.batchIndex];
          if (!group) return;
          const progress = await loadProgress(true);
          const next = root.VocabularyLessonGroups.updateVocabularyLessonGroupPosition(progress, {
            groupId: group.id,
            wordIndex: state.wordIndex,
            updatedAt: new Date().toISOString()
          });
          await saveProgress(next);
        }, 250);
      }

      function installCategoryBackButton(handler) {
        const button = document.querySelector('#screenVocabularyReviewList .back-btn');
        if (!button) return;
        button.onclick = handler;
      }

      async function decorateCategoryProgress() {
        const progress = await loadProgress();
        document.querySelectorAll('.vocabulary-lesson-category-button').forEach(button => {
          const onclick = button.getAttribute('onclick') || '';
          const match = /selectVocabularyLessonCategory\(decodeURIComponent\('([^']+)'\)\)/.exec(onclick);
          if (!match) return;
          const categoryId = decodeURIComponent(match[1]);
          const category = root.getVocabularyLessonCategoryById(categoryId);
          if (!category) return;
          const config = groupConfigForCategory(category);
          const total = category.cards.length;
          const completed = completedWordCount(config, progress);
          let counter = button.querySelector('.vocabulary-lesson-category-progress');
          if (!counter) {
            counter = document.createElement('span');
            counter.className = 'vocabulary-lesson-category-progress';
            const arrow = button.querySelector('.vocabulary-lesson-book-arrow');
            button.insertBefore(counter, arrow || null);
          }
          counter.textContent = `${completed}/${total}`;
        });
      }

      async function renderCategoryGroups() {
        if (!activeCategory) return;
        const state = lessonState();
        const progress = await loadProgress(true);
        const config = state.groupConfig || groupConfigForCategory(activeCategory);
        const defaultIndex = firstIncompleteGroupIndex(config, progress);
        const list = document.getElementById('vocabularyLessonBookList');
        const title = document.getElementById('vocabularyLessonSelectionTitle');
        const copy = title && title.parentElement ? title.parentElement.querySelector('p') : null;
        const icon = document.querySelector('.vocabulary-lesson-selection-icon');
        const topbarTitle = document.querySelector('#screenVocabularyReviewList .topbar-title');
        const selectionCopy = document.querySelector('#screenVocabularyReviewList .vocabulary-lesson-selection-copy');
        const empty = document.getElementById('vocabularyLessonBookEmpty');
        if (!list) return;

        if (topbarTitle) topbarTitle.textContent = activeCategory.name;
        if (selectionCopy) selectionCopy.hidden = true;
        if (title) title.textContent = '';
        if (copy) copy.textContent = '';
        if (icon) icon.textContent = '';
        if (empty) empty.hidden = true;

        list.className = 'vocabulary-lesson-book-list vocabulary-lesson-category-group-picker';
        list.innerHTML = config.groups.map((group, index) => {
          const completed = root.VocabularyLessonGroups.isVocabularyLessonGroupCompleted(progress, group.id);
          const selected = index === defaultIndex;
          return `
            <button type="button" class="vocabulary-lesson-category-group-row${selected ? ' is-default' : ''}" onclick="openVocabularyLessonCategoryGroup(${index})">
              <span class="vocabulary-lesson-category-group-name">第${index + 1}组</span>
              <small>${groupProgressLabel(group, progress)}</small>
              <span class="vocabulary-lesson-category-group-status">${completed ? '已通关' : ''}</span>
            </button>`;
        }).join('');
        installCategoryBackButton(root.closeVocabularyLessonCategoryGroups);
        document.body.classList.remove('vocabulary-review-open');
        root.showScreen('screenVocabularyReviewList');
      }

      async function openCategoryGroup(index) {
        if (!activeCategory) return false;
        const batch = ensureVirtualBatch(activeCategory);
        const opened = typeof root.selectVocabularyLessonVirtualBatch === 'function'
          ? await root.selectVocabularyLessonVirtualBatch(batch, index)
          : await root.selectVocabularyLessonGroup(batch, index);
        if (!opened) return false;
        const state = lessonState();
        state.categoryId = activeCategory.id;
        state.categoryName = activeCategory.name;
        const progress = await loadProgress(true);
        const group = state.groupConfig && state.groupConfig.groups[index];
        if (group && root.VocabularyLessonGroups.isVocabularyLessonGroupCompleted(progress, group.id)) {
          state.wordIndex = 0;
        }
        queueCurrentPositionSave();
        root.renderVocabularyLesson();
        return true;
      }

      async function openCategory(categoryId) {
        if (typeof root.loadVocabularyLessonCategories === 'function') {
          await root.loadVocabularyLessonCategories();
        }
        const category = root.getVocabularyLessonCategoryById(String(categoryId || ''));
        if (!category || !category.cards || !category.cards.length) return false;
        activeCategory = category;
        const batch = ensureVirtualBatch(category);
        await loadProgress(true);
        const opened = typeof root.selectVocabularyLessonVirtualBatch === 'function'
          ? await root.selectVocabularyLessonVirtualBatch(batch, null)
          : await root.selectVocabularyLessonGroup(batch, null);
        if (!opened) return false;
        const state = lessonState();
        state.categoryId = category.id;
        state.categoryName = category.name;
        await renderCategoryGroups();
        return true;
      }

      function closeCategoryGroups() {
        if (typeof root.clearVocabularyLessonTransientState === 'function') {
          root.clearVocabularyLessonTransientState();
        } else {
          resetCategoryRuntime();
        }
        const copy = document.querySelector('#screenVocabularyReviewList .vocabulary-lesson-selection-copy');
        if (copy) copy.hidden = false;
        baseRenderSelection();
        installCategoryBackButton(root.closeVocabularyLessonCategorySelection || root.closeVocabularyReviewList);
        decorateCategoryProgress();
        root.showScreen('screenVocabularyReviewList');
      }

      function renderLowPressureQuickNav() {
        const state = lessonState();
        if (!isCategoryMode() || state.mode !== 'teaching') return;
        const nav = document.getElementById('vocabularyLessonQuickNav');
        if (!nav) return;
        nav.classList.add('is-category-groups');
        nav.innerHTML = state.batches.map((items, index) => {
          const selected = index === state.batchIndex;
          const group = state.groupConfig && state.groupConfig.groups[index];
          const completed = progressCache && group
            ? root.VocabularyLessonGroups.isVocabularyLessonGroupCompleted(progressCache, group.id)
            : false;
          return `<button type="button" class="vocabulary-lesson-quick-button batch${completed ? ' is-completed' : ''}${selected ? ' is-active' : ''}" onclick="jumpVocabularyLessonBatch(${index})" aria-current="${selected ? 'step' : 'false'}">第${index + 1}组</button>`;
        }).join('');
      }

      function renderClickableDots() {
        const state = lessonState();
        if (!isCategoryMode() || state.mode !== 'teaching') return;
        const progress = document.getElementById('vocabularyLessonBatchDots');
        if (!progress) return;
        const items = currentRoundItems();
        const relative = relativeWordIndex();
        progress.hidden = false;
        progress.innerHTML = items.map((_, index) => {
          const className = index < relative ? ' is-past' : index === relative ? ' is-current' : '';
          return `<button type="button" class="vocabulary-lesson-batch-dot${className}" onclick="jumpVocabularyLessonRoundWord(${index})" aria-label="切换到这个单词"></button>`;
        }).join('');
      }

      function applyLowPressureLessonChrome() {
        if (!isCategoryMode()) return;
        const title = document.getElementById('vocabularyLessonModeTitle');
        const state = lessonState();
        if (title && state.mode === 'teaching') title.textContent = activeCategory.name;
        const change = document.getElementById('vocabularyLessonChangeButton');
        if (change) change.hidden = true;
        renderLowPressureQuickNav();
        renderClickableDots();
      }

      function jumpRoundWord(relativeIndex) {
        if (!isCategoryMode()) return false;
        const items = currentRoundItems();
        const relative = clamp(relativeIndex, 0, Math.max(0, items.length - 1));
        setAbsoluteWordIndex(currentRoundOffset() + relative);
        const state = lessonState();
        state.mode = 'teaching';
        state.revealed = true;
        queueCurrentPositionSave();
        root.renderVocabularyLesson();
        return true;
      }

      async function markCurrentCategoryGroupCompleted() {
        if (!isCategoryMode() || !isStudent()) return true;
        const state = lessonState();
        const config = state.groupConfig;
        const group = config && config.groups[state.batchIndex];
        if (!group) return false;
        const progress = await loadProgress(true);
        const result = root.VocabularyLessonGroups.markVocabularyLessonGroupCompleted(progress, {
          groupId: group.id,
          wordKeys: group.wordKeys,
          completedAt: new Date().toISOString(),
          eligibleDate: root.VocabularyLessonGroups.addLocalDays(
            root.VocabularyLessonGroups.localDateKey(new Date()),
            1
          )
        });
        return saveProgress(result.progress);
      }

      root.selectVocabularyLessonCategory = openCategory;
      root.openVocabularyLessonCategoryGroup = openCategoryGroup;
      root.closeVocabularyLessonCategoryGroups = closeCategoryGroups;
      root.jumpVocabularyLessonRoundWord = jumpRoundWord;
      root.decorateVocabularyLessonCategoryProgress = decorateCategoryProgress;
      root.resetVocabularyLessonCategoryRuntime = resetCategoryRuntime;

      root.vocabularyLessonCurrentItems = function vocabularyLessonCurrentItemsLowPressure() {
        if (!isCategoryMode()) return baseCurrentItems();
        const state = lessonState();
        if (state.mode === 'randomReview' || state.mode === 'hardWordReview') {
          return baseCurrentItems();
        }
        return currentRoundItems();
      };

      root.vocabularyLessonCurrentIndex = function vocabularyLessonCurrentIndexLowPressure() {
        if (!isCategoryMode()) return baseCurrentIndex();
        const state = lessonState();
        if (state.mode === 'batchReviewDetail') {
          return state.reviewDetailIndex;
        }
        if (state.mode === 'randomReview') return state.randomIndex;
        return relativeWordIndex();
      };

      root.renderVocabularyLessonImageWall = function renderVocabularyLessonImageWallLowPressure(main, footer) {
        if (!isCategoryMode()) return baseRenderImageWall(main, footer);
        const items = currentRoundItems();
        main.innerHTML = `<section class="vocabulary-lesson-image-wall" id="vocabularyLessonImageWall" aria-label="图片回顾">${items.map((item, index) => `<button type="button" class="vocabulary-lesson-image-tile" onclick="openVocabularyLessonBatchReviewDetail(${index})" aria-label="查看这张图片">${root.renderVocabularyLessonVisual(item, true)}</button>`).join('')}</section>`;
        const groupItems = currentGroupItems();
        const hasNextRound = currentRoundOffset() + ROUND_SIZE < groupItems.length;
        footer.innerHTML = `<button type="button" class="vocabulary-lesson-footer-button primary vocabulary-lesson-next-batch" onclick="continueVocabularyLessonAfterBatchReview()">${hasNextRound ? '继续 →' : '完成本组 →'}</button>`;
      };

      root.openVocabularyLessonBatchReviewDetail = function openVocabularyLessonBatchReviewDetailLowPressure(index) {
        if (!isCategoryMode()) return baseOpenReviewDetail(index);
        const items = currentRoundItems();
        if (!items[index]) return;
        const state = lessonState();
        state.mode = 'batchReviewDetail';
        state.reviewDetailIndex = index;
        state.revealed = true;
        root.renderVocabularyLesson();
      };

      root.renderVocabularyLesson = function renderVocabularyLessonLowPressure() {
        const result = baseRenderLesson();
        applyLowPressureLessonChrome();
        return result;
      };

      root.changeVocabularyReviewWord = function changeVocabularyReviewWordLowPressure(delta) {
        const state = lessonState();
        if (!isCategoryMode() || state.mode !== 'teaching') {
          return baseChangeWord(delta);
        }
        const direction = Number(delta) < 0 ? -1 : 1;
        const items = currentRoundItems();
        const relative = relativeWordIndex();
        if (direction < 0) {
          if (relative > 0) setAbsoluteWordIndex(state.wordIndex - 1);
          queueCurrentPositionSave();
          root.renderVocabularyLesson();
          return;
        }
        if (relative < items.length - 1) {
          setAbsoluteWordIndex(state.wordIndex + 1);
          queueCurrentPositionSave();
          root.renderVocabularyLesson();
          return;
        }
        state.mode = 'batchReview';
        state.reviewScrollTop = 0;
        root.renderVocabularyLesson();
      };

      root.continueVocabularyLessonAfterBatchReview = async function continueVocabularyLessonAfterBatchReviewLowPressure() {
        if (!isCategoryMode()) return baseContinueAfterReview();
        const items = currentGroupItems();
        const nextOffset = currentRoundOffset() + ROUND_SIZE;
        if (nextOffset < items.length) {
          setAbsoluteWordIndex(nextOffset);
          const state = lessonState();
          state.mode = 'teaching';
          state.revealed = true;
          state.reviewScrollTop = 0;
          queueCurrentPositionSave();
          root.renderVocabularyLesson();
          return;
        }
        const completed = await markCurrentCategoryGroupCompleted();
        if (!completed) return;
        await renderCategoryGroups();
      };

      root.jumpVocabularyLessonBatch = function jumpVocabularyLessonBatchLowPressure(index) {
        if (!isCategoryMode()) return baseJumpGroup(index);
        return openCategoryGroup(index);
      };

      root.closeVocabularyReviewPlayer = function closeVocabularyReviewPlayerLowPressure() {
        if (!isCategoryMode()) return baseClosePlayer();
        return renderCategoryGroups();
      };

      if (typeof baseSelectCategory === 'function') {
        root.__baseSelectVocabularyLessonCategory = baseSelectCategory;
      }

    }

    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .vocabulary-lesson-category-button {
          grid-template-columns: auto minmax(0, 1fr) auto auto;
        }
        .vocabulary-lesson-category-progress {
          color: #cfbfdc;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: .2px;
          white-space: nowrap;
        }
        .vocabulary-lesson-category-group-picker {
          display: grid;
          gap: 12px;
        }
        .vocabulary-lesson-category-group-row {
          width: 100%;
          min-height: 66px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border: 1px solid var(--vl-line);
          border-radius: 18px;
          background: #fff;
          color: var(--vl-ink);
          box-shadow: none;
          text-align: left;
        }
        .vocabulary-lesson-category-group-row.is-default {
          border-color: #bfe2d7;
          background: #fcfffe;
        }
        .vocabulary-lesson-category-group-name {
          font-size: 19px;
          font-weight: 800;
        }
        .vocabulary-lesson-category-group-row small {
          color: #c5bdc3;
          font-size: 12px;
          font-weight: 400;
        }
        .vocabulary-lesson-category-group-status {
          min-width: 48px;
          color: #70a091;
          font-size: 13px;
          font-weight: 600;
          text-align: right;
        }
        .vocabulary-lesson-quick-nav.is-category-groups {
          justify-content: center;
          gap: 8px;
          overflow-x: auto;
        }
        .vocabulary-lesson-quick-nav.is-category-groups .vocabulary-lesson-quick-button.batch {
          flex: 0 0 auto;
          min-width: 86px;
          padding-inline: 14px;
          font-size: 14px;
          line-height: 1;
        }
        .vocabulary-lesson-quick-nav.is-category-groups .vocabulary-lesson-quick-button.batch.is-completed:not(.is-active) {
          color: var(--vl-mint-deep);
          background: var(--vl-mint-soft);
        }
        .vocabulary-lesson-batch-dot {
          padding: 0;
          appearance: none;
          cursor: pointer;
        }
        @media (orientation: landscape) and (max-height: 650px) {
          .vocabulary-lesson-category-group-row { min-height: 58px; }
          .vocabulary-lesson-quick-nav.is-category-groups .vocabulary-lesson-quick-button.batch {
            min-width: 78px;
            font-size: 13px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    wait();
    return true;
  }

  return {
    ROUND_SIZE,
    roundOffset,
    sliceRound,
    completedWordCount,
    firstIncompleteGroupIndex,
    groupProgressLabel,
    install
  };
});
