(function installVocabularyLessonTask016() {
  const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : window;
  if (runtimeRoot.__vocabularyLessonTask016Bootstrapped) return;
  runtimeRoot.__vocabularyLessonTask016Bootstrapped = true;
  const CIRCLED_BATCH_LABELS = ['①', '②', '③', '④'];
  const ACCESSIBLE_BATCH_LABELS = ['第一组', '第二组', '第三组', '第四组'];
  let groupCore = typeof globalThis !== 'undefined' ? globalThis.VocabularyLessonGroups : null;
  let installed = false;
  let taughtState = typeof normalizeVocabularyLessonTaughtState === 'function'
    ? normalizeVocabularyLessonTaughtState(null)
    : { version: 1, groups: {}, migrations: {} };

  function playerReady() {
    return !!groupCore
      && typeof installVocabularyLessonShell === 'function'
      && typeof renderVocabularyLesson === 'function'
      && typeof vocabularyLessonState !== 'undefined';
  }

  function clampIndex(value, length) {
    if (!length) return 0;
    const index = Math.trunc(Number(value));
    return Number.isFinite(index) ? Math.max(0, Math.min(index, length - 1)) : 0;
  }

  function isTransientBatch(batch) {
    if (typeof isVocabularyLessonVirtualBatch === 'function') return isVocabularyLessonVirtualBatch(batch);
    return Boolean(batch && (
      batch.vocabularyLessonTransient === true
      || String(batch.id || '').startsWith('vocabulary-category:')
    ));
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

  async function loadTaughtState(options) {
    try {
      if (typeof loadVocabularyLessonTaughtState !== 'function') return taughtState;
      taughtState = await loadVocabularyLessonTaughtState(options);
    } catch (error) {
      console.warn('Vocabulary lesson taught state load failed', error);
      if (!options || options.silent !== true) {
        if (typeof showStorageError === 'function') showStorageError(error);
      }
    }
    return taughtState;
  }

  function activeGroupConfig() {
    const config = vocabularyLessonState.groupConfig;
    return config && Array.isArray(config.groups)
      ? config.groups[vocabularyLessonState.batchIndex] || null
      : null;
  }

  function getStoredGroupConfig(batch, data = appData) {
    const registry = data && data.vocabularyLessonGroups;
    return registry && registry[String(batch && batch.id || '')];
  }

  function deriveGroupConfig(batch, data = appData) {
    const transientGroupSize = batch && batch.vocabularyLessonTransient
      ? Math.max(0, Math.trunc(Number(batch.vocabularyLessonGroupSize)) || 0)
      : 0;
    return groupCore.reconcileVocabularyLessonGroups(
      batch,
      getStoredGroupConfig(batch, data),
      transientGroupSize || groupCore.GROUP_SIZE
    );
  }

  function completionLabel(group) {
    const taught = typeof isVocabularyLessonGroupTaught === 'function'
      && group
      && isVocabularyLessonGroupTaught(taughtState, group.id, group.wordKeys);
    return taught
      ? '<span class="vocabulary-lesson-group-completed is-teacher">已授课</span>'
      : '<span class="vocabulary-lesson-group-completed is-teacher" aria-hidden="true"></span>';
  }

  function firstUntaughtGroupIndex(config) {
    if (!config || !config.groups.length) return 0;
    const index = config.groups.findIndex(group => (
      typeof isVocabularyLessonGroupTaught !== 'function'
      || !isVocabularyLessonGroupTaught(taughtState, group.id, group.wordKeys)
    ));
    return index >= 0 ? index : 0;
  }

  function ensureTask016Styles() {
    if (!document.getElementById('vocabularyLessonTask016Styles')) {
      const link = document.createElement('link');
      link.id = 'vocabularyLessonTask016Styles';
      link.rel = 'stylesheet';
      link.href = 'styles-vocabulary-lesson-016.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('vocabularyLessonGroupsStyles')) {
      const link = document.createElement('link');
      link.id = 'vocabularyLessonGroupsStyles';
      link.rel = 'stylesheet';
      link.href = 'styles-vocabulary-lesson-groups.css';
      document.head.appendChild(link);
    }
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

  function getVisibleVocabularyLessonCurrentTask(books) {
    if (typeof getTodayTaskBatch !== 'function') return null;
    const currentTask = getTodayTaskBatch();
    if (!currentTask) return null;
    return books.find(batch => String(batch.id) === String(currentTask.id)) || null;
  }

  function renderBookGroups(batch, config, isCurrent, isLatest) {
    const stateClass = isCurrent ? ' is-current' : (isLatest ? ' is-latest' : '');
    const statusBadge = isCurrent
      ? '<span class="vocabulary-lesson-status-badge">当前</span>'
      : (isLatest ? '<span class="vocabulary-lesson-status-badge">最新</span>' : '<span></span>');
    const wordCount = groupCore.collectBookWordKeys(batch).length;
    if (config.groups.length <= 1) {
      const group = config.groups[0];
      return `
        <button class="vocabulary-lesson-book-button${stateClass}" type="button" onclick="selectVocabularyLessonGroup(decodeURIComponent('${encodeURIComponent(String(batch.id))}'), 0)">
          <span aria-hidden="true">${isCurrent ? '🌞' : '📚'}</span>
          <span class="vocabulary-lesson-book-name"><span class="vocabulary-lesson-book-title">${escapeVocabularyLessonHtml(batch.name || '未命名单词本')}</span><small>${wordCount}词</small></span>
          ${statusBadge}
          ${group ? completionLabel(group) : ''}
          <span class="vocabulary-lesson-book-arrow" aria-hidden="true">›</span>
        </button>`;
    }
    return `
      <section class="vocabulary-lesson-book-group${stateClass}">
        <header>
          <span aria-hidden="true">${isCurrent ? '🌞' : '📚'}</span>
          <strong><span class="vocabulary-lesson-book-title">${escapeVocabularyLessonHtml(batch.name || '未命名单词本')}</span><small>${wordCount}词</small></strong>
          ${statusBadge}
        </header>
        <div class="vocabulary-lesson-group-list">
          ${config.groups.map((group, index) => `
            <button type="button" onclick="selectVocabularyLessonGroup(decodeURIComponent('${encodeURIComponent(String(batch.id))}'), ${index})">
              <span>第${index + 1}组</span>
              <small>${group.wordKeys.length}词</small>
              ${completionLabel(group)}
              <b aria-hidden="true">›</b>
            </button>`).join('')}
        </div>
      </section>`;
  }

  function renderTask016BookSelection() {
    installVocabularyLessonShell();
    ensureTask016Styles();
    const list = document.getElementById('vocabularyLessonBookList');
    const empty = document.getElementById('vocabularyLessonBookEmpty');
    if (!list) return;
    list.className = 'vocabulary-lesson-book-list';

    const visibleBooks = getVocabularyLessonVisibleBatches(appData, currentUser);
    const newestFirst = visibleBooks.slice().sort(compareVocabularyLessonBatchesNewestFirst);
    const currentTask = getVisibleVocabularyLessonCurrentTask(newestFirst);
    const primary = currentTask || newestFirst[0] || null;
    const books = primary
      ? [primary, ...newestFirst.filter(batch => String(batch.id) !== String(primary.id))]
      : newestFirst;
    const latest = newestFirst[0] || null;

    vocabularyLessonState.books = books;
    list.innerHTML = books.map(batch => renderBookGroups(
      batch,
      deriveGroupConfig(batch),
      !!(currentTask && String(currentTask.id) === String(batch.id)),
      !!(latest && String(latest.id) === String(batch.id))
    )).join('');
    if (empty) empty.hidden = books.length > 0;
    renderVocabularyLessonSharedAdmin();
  }

  function circledGroupLabel(index) {
    if (CIRCLED_BATCH_LABELS[index]) return CIRCLED_BATCH_LABELS[index];
    const codePoint = 0x2460 + index;
    return index < 20 ? String.fromCodePoint(codePoint) : String(index + 1);
  }

  function accessibleGroupLabel(index) {
    return ACCESSIBLE_BATCH_LABELS[index] || `第${index + 1}组`;
  }

  function renderTask016QuickNav() {
    ensureTask016Shell();
    const nav = document.getElementById('vocabularyLessonQuickNav');
    if (!nav) return;
    const activeBatch = clampIndex(vocabularyLessonState.batchIndex, vocabularyLessonState.batches.length);
    const hasHardWords = vocabularyLessonState.words.some(item => vocabularyLessonState.hardWords.has(item.key));
    const batchButtons = vocabularyLessonState.batches.map((items, index) => {
      const available = Boolean(items && items.length);
      const selected = available && index === activeBatch;
      return `<button type="button" class="vocabulary-lesson-quick-button batch${selected ? ' is-active' : ''}" onclick="jumpVocabularyLessonBatch(${index})" aria-label="${accessibleGroupLabel(index)}" aria-current="${selected ? 'step' : 'false'}" ${available ? '' : 'disabled'}>${circledGroupLabel(index)}</button>`;
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
    // Legacy limit was target >= 4; groups are now dynamic.
    if (target < 0 || target >= vocabularyLessonState.batches.length || !vocabularyLessonState.batches[target]?.length) return false;
    ensureProgressState();
    vocabularyLessonState.batchIndex = target;
    vocabularyLessonState.lastTeachingBatchIndex = target;
    vocabularyLessonState.wordIndex = 0;
    vocabularyLessonState.mode = 'teaching';
    vocabularyLessonState.revealed = true;
    vocabularyLessonState.reviewScrollTop = 0;
    renderVocabularyLesson();
    return true;
  }

  function openVocabularyLessonHardWordsFromNav() {
    startVocabularyLessonHardWordReview();
  }

  function openVocabularyLessonRandomFromNav() {
    startVocabularyLessonRandomReview(false);
  }

  async function selectVocabularyLessonGroup(batchOrId, requestedGroupIndex) {
    await loadTaughtState({ fresh: false, silent: true });
    const batch = isTransientBatch(batchOrId)
      ? batchOrId
      : selectVocabularyLessonBatch(appData, currentUser, batchOrId);
    if (!batch) return false;
    // Opening the guide is a viewing action. Derive missing grouping in memory
    // and persist only after the teacher explicitly marks a group as taught.
    const config = deriveGroupConfig(batch);
    currentBatchId = isTransientBatch(batch) ? null : String(batch.id);
    vocabularyLessonState.batch = batch;
    vocabularyLessonState.words = buildVocabularyLessonWords(batch, vocabularyLessonVisualRegistry);
    vocabularyLessonState.groupConfig = config;
    vocabularyLessonState.batches = groupCore.materializeVocabularyLessonGroups(vocabularyLessonState.words, config);
    const fallback = firstUntaughtGroupIndex(config);
    const hasRequestedGroup = requestedGroupIndex !== null
      && requestedGroupIndex !== undefined
      && requestedGroupIndex !== ''
      && Number.isFinite(Number(requestedGroupIndex));
    const target = hasRequestedGroup
      ? clampIndex(requestedGroupIndex, vocabularyLessonState.batches.length)
      : fallback;
    vocabularyLessonState.batchPositions = vocabularyLessonState.batches.map(() => 0);
    vocabularyLessonState.lastTeachingBatchIndex = target;
    vocabularyLessonState.batchIndex = target;
    vocabularyLessonState.wordIndex = 0;
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
    return true;
  }

  async function sealCurrentGroupInMain() {
    const batch = vocabularyLessonState.batch;
    const group = activeGroupConfig();
    if (!batch || !group || typeof updateMainDataSafely !== 'function') return false;
    if (isTransientBatch(batch)) return true;
    const alreadySealed = deriveGroupConfig(batch).groups
      .find(item => item.id === group.id)?.sealed === true;
    if (alreadySealed) return true;
    const saved = await updateMainDataSafely(data => {
      const remoteBatch = (Array.isArray(data.batches) ? data.batches : [])
        .find(item => String(item && item.id || '') === String(batch.id));
      if (!remoteBatch) return false;
      const reconciled = groupCore.reconcileVocabularyLessonGroups(
        remoteBatch,
        getStoredGroupConfig(remoteBatch, data),
        groupCore.GROUP_SIZE
      );
      const sealed = groupCore.sealVocabularyLessonGroup(reconciled, group.id);
      if (!sealed.changed) return false;
      if (!data.vocabularyLessonGroups || typeof data.vocabularyLessonGroups !== 'object') data.vocabularyLessonGroups = {};
      data.vocabularyLessonGroups[String(remoteBatch.id)] = sealed.config;
      return true;
    });
    vocabularyLessonState.groupConfig = deriveGroupConfig(vocabularyLessonState.batch);
    if (saved) return true;
    return vocabularyLessonState.groupConfig.groups
      .find(item => item.id === group.id)?.sealed === true;
  }

  async function completeCurrentGroup() {
    const group = activeGroupConfig();
    if (!group || typeof saveVocabularyLessonTaughtGroup !== 'function') return false;
    if (typeof isVocabularyLessonGroupTaught === 'function'
      && isVocabularyLessonGroupTaught(taughtState, group.id, group.wordKeys)) return true;

    const sealed = await sealCurrentGroupInMain();
    if (!sealed) return false;
    try {
      taughtState = await saveVocabularyLessonTaughtGroup({
        groupId: group.id,
        wordKeys: group.wordKeys,
        taughtAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.warn('Vocabulary lesson taught state save failed', error);
      if (typeof showStorageError === 'function') showStorageError(error);
      return false;
    }
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
      const title = document.getElementById('vocabularyLessonModeTitle');
      if (title && vocabularyLessonState.mode === 'teaching') title.textContent = '新词导览';
      const legacyChange = document.getElementById('vocabularyLessonChangeButton');
      if (legacyChange) legacyChange.hidden = true;
      const next = document.querySelector('.vocabulary-lesson-next-batch');
      if (next) {
        const group = activeGroupConfig();
        const alreadyTaught = group && typeof isVocabularyLessonGroupTaught === 'function'
          && isVocabularyLessonGroupTaught(taughtState, group.id, group.wordKeys);
        next.textContent = vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1
          ? `${alreadyTaught ? '本组已授课' : '标记本组已授课'}并进入下一组 →`
          : `${alreadyTaught ? '本组已授课' : '标记本组已授课'} →`;
      }
    };

    renderVocabularyLessonBookSelection = renderTask016BookSelection;

    const baseOpenList = openVocabularyReviewList;
    openVocabularyReviewList = function openVocabularyReviewListTask016() {
      const result = baseOpenList();
      loadTaughtState({ fresh: true, silent: true }).then(() => {
        if (!document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) return;
        if (typeof refreshVocabularyLessonSelectionRoute === 'function') refreshVocabularyLessonSelectionRoute();
        else renderVocabularyLessonBookSelection();
      });
      return result;
    };

    selectVocabularyLessonBook = function selectVocabularyLessonBookTask016(batchId) {
      return selectVocabularyLessonGroup(batchId, null);
    };

    const baseStartReview = startVocabularyReview;
    startVocabularyReview = function startVocabularyReviewTask016(index = 0) {
      if (vocabularyLessonState.batch) {
        const groupIndex = Math.floor(Math.max(0, Number(index) || 0) / groupCore.GROUP_SIZE);
        return selectVocabularyLessonGroup(vocabularyLessonState.batch.id, groupIndex);
      }
      const batch = selectVocabularyLessonBatch(appData, currentUser, currentBatchId);
      if (batch) return selectVocabularyLessonGroup(batch.id, 0);
      return baseStartReview(index);
    };

    continueVocabularyLessonAfterBatchReview = async function continueVocabularyLessonAfterBatchReviewTask016() {
      const completed = await completeCurrentGroup();
      if (!completed) return;
      if (vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1) {
        vocabularyLessonState.batchIndex += 1;
        ensureProgressState();
        vocabularyLessonState.lastTeachingBatchIndex = vocabularyLessonState.batchIndex;
        vocabularyLessonState.wordIndex = 0;
        vocabularyLessonState.reviewScrollTop = 0;
        vocabularyLessonState.mode = 'teaching';
        vocabularyLessonState.revealed = true;
      } else {
        vocabularyLessonState.mode = 'finalMenu';
      }
      renderVocabularyLesson();
    };

    window.selectVocabularyLessonGroup = selectVocabularyLessonGroup;
    window.selectVocabularyLessonVirtualBatch = function selectVocabularyLessonVirtualBatch(batch, groupIndex) {
      if (!isTransientBatch(batch)) return false;
      return selectVocabularyLessonGroup(batch, groupIndex);
    };
    window.jumpVocabularyLessonBatch = jumpVocabularyLessonBatch;
    window.openVocabularyLessonHardWordsFromNav = openVocabularyLessonHardWordsFromNav;
    window.openVocabularyLessonRandomFromNav = openVocabularyLessonRandomFromNav;

    ensureTask016Shell();
    if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) {
      loadTaughtState({ fresh: true, silent: true }).then(() => {
        if (typeof refreshVocabularyLessonSelectionRoute === 'function') {
          refreshVocabularyLessonSelectionRoute();
        } else {
          renderVocabularyLessonBookSelection();
        }
      });
    }
    if (document.getElementById('screenVocabularyReviewPlayer')?.classList.contains('active')) {
      renderVocabularyLesson();
    }
    window.addEventListener('vocabulary-lesson-taught-updated', event => {
      if (event && event.detail && event.detail.state) taughtState = event.detail.state;
      if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) {
        refreshVocabularyLessonSelectionRoute?.();
      }
      if (document.getElementById('screenVocabularyReviewPlayer')?.classList.contains('active')) {
        renderVocabularyLesson();
      }
    });
    return true;
  }

  function waitForPlayer() {
    if (installOverrides()) return;
    window.setTimeout(waitForPlayer, 0);
  }

  function loadGroupCore() {
    if (groupCore) {
      waitForPlayer();
      return;
    }
    const existing = document.getElementById('vocabularyLessonGroupsCore');
    if (existing) {
      existing.addEventListener('load', () => {
        groupCore = globalThis.VocabularyLessonGroups;
        waitForPlayer();
      }, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'vocabularyLessonGroupsCore';
    script.src = 'js/vocabularyLessonGroups.js';
    script.async = false;
    script.onload = () => {
      groupCore = globalThis.VocabularyLessonGroups;
      waitForPlayer();
    };
    document.head.appendChild(script);
  }

  loadGroupCore();
})();
