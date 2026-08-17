(function installVocabularyLessonTask016() {
  const runtimeRoot = typeof globalThis !== 'undefined' ? globalThis : window;
  if (runtimeRoot.__vocabularyLessonTask016Bootstrapped) return;
  runtimeRoot.__vocabularyLessonTask016Bootstrapped = true;
  const PROGRESS_KEY_PREFIX = 'wc_vocabulary_lesson_position_v1:';
  const CLOUD_PROGRESS_KEY_PREFIX = 'vocab_lesson_progress_v1_';
  const CIRCLED_BATCH_LABELS = ['①', '②', '③', '④'];
  const ACCESSIBLE_BATCH_LABELS = ['第一组', '第二组', '第三组', '第四组'];
  let groupCore = typeof globalThis !== 'undefined' ? globalThis.VocabularyLessonGroups : null;
  let installed = false;
  let cloudProgressByUser = Object.create(null);
  let cloudProgressLoaded = new Set();
  let cloudSaveTimers = Object.create(null);

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

  function currentStudentUser() {
    const user = String(typeof currentUser === 'undefined' ? '' : currentUser);
    return user === 'sister' || user === 'brother' ? user : '';
  }

  function cloudProgressKey(user) {
    return `${CLOUD_PROGRESS_KEY_PREFIX}${user}`;
  }

  function getProgressStorageKey(batch = vocabularyLessonState.batch) {
    const user = encodeURIComponent(String(typeof currentUser === 'undefined' ? '' : currentUser));
    const batchId = encodeURIComponent(String(batch && batch.id || 'none'));
    return `${PROGRESS_KEY_PREFIX}${user}:${batchId}`;
  }

  function isTransientBatch(batch) {
    if (typeof isVocabularyLessonVirtualBatch === 'function') return isVocabularyLessonVirtualBatch(batch);
    return Boolean(batch && (
      batch.vocabularyLessonTransient === true
      || String(batch.id || '').startsWith('vocabulary-category:')
    ));
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
      if (!raw || raw.version !== 1) return fallback;
      const positions = vocabularyLessonState.batches.map((items, index) => {
        return clampIndex(Array.isArray(raw.batchPositions) ? raw.batchPositions[index] : 0, items.length);
      });
      const lastTeachingBatchIndex = clampIndex(raw.lastTeachingBatchIndex, vocabularyLessonState.batches.length);
      return {
        batchIndex: clampIndex(raw.batchIndex, vocabularyLessonState.batches.length),
        lastTeachingBatchIndex,
        batchPositions: positions,
        raw
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
    if (!vocabularyLessonState.batch || isTransientBatch(vocabularyLessonState.batch) || !vocabularyLessonState.batches.length) return;
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
    saveCurrentCloudPosition();
  }

  function progressForUser(user) {
    if (!cloudProgressByUser[user]) {
      cloudProgressByUser[user] = groupCore.defaultVocabularyLessonProgress();
    }
    return cloudProgressByUser[user];
  }

  async function loadCloudProgress(user) {
    if (!user || cloudProgressLoaded.has(user)) return progressForUser(user);
    try {
      const stored = typeof sbGet === 'function' ? await sbGet(cloudProgressKey(user)) : null;
      cloudProgressByUser[user] = groupCore.normalizeVocabularyLessonProgress(stored);
    } catch (error) {
      console.warn('Vocabulary lesson progress load failed', error);
      cloudProgressByUser[user] = groupCore.defaultVocabularyLessonProgress();
    }
    cloudProgressLoaded.add(user);
    return cloudProgressByUser[user];
  }

  async function loadRelevantCloudProgress() {
    const student = currentStudentUser();
    if (student) return loadCloudProgress(student);
    if (typeof isTeacher === 'function' && isTeacher()) {
      await Promise.all([loadCloudProgress('sister'), loadCloudProgress('brother')]);
    }
    return null;
  }

  async function saveCloudProgressNow(user) {
    if (!user || typeof sbSet !== 'function') return false;
    try {
      await sbSet(cloudProgressKey(user), groupCore.normalizeVocabularyLessonProgress(progressForUser(user)));
      return true;
    } catch (error) {
      console.warn('Vocabulary lesson progress save failed', error);
      if (typeof showStorageError === 'function') showStorageError(error);
      return false;
    }
  }

  function queueCloudProgressSave(user) {
    if (!user) return;
    window.clearTimeout(cloudSaveTimers[user]);
    cloudSaveTimers[user] = window.setTimeout(() => {
      cloudSaveTimers[user] = null;
      saveCloudProgressNow(user);
    }, 450);
  }

  function activeGroupConfig() {
    const config = vocabularyLessonState.groupConfig;
    return config && Array.isArray(config.groups)
      ? config.groups[vocabularyLessonState.batchIndex] || null
      : null;
  }

  function saveCurrentCloudPosition() {
    const user = currentStudentUser();
    const group = activeGroupConfig();
    if (!user || !group || !vocabularyLessonState.batch || isTransientBatch(vocabularyLessonState.batch)) return;
    const current = progressForUser(user);
    cloudProgressByUser[user] = groupCore.updateVocabularyLessonGroupPosition(current, {
      groupId: group.id,
      wordIndex: vocabularyLessonState.wordIndex,
      updatedAt: new Date().toISOString()
    });
    queueCloudProgressSave(user);
  }

  function getStoredGroupConfig(batch, data = appData) {
    const registry = data && data.vocabularyLessonGroups;
    return registry && registry[String(batch && batch.id || '')];
  }

  function deriveGroupConfig(batch, data = appData) {
    return groupCore.reconcileVocabularyLessonGroups(
      batch,
      getStoredGroupConfig(batch, data),
      groupCore.GROUP_SIZE
    );
  }

  function completionLabel(groupId) {
    const student = currentStudentUser();
    if (student) {
      return groupCore.isVocabularyLessonGroupCompleted(progressForUser(student), groupId)
        ? '<span class="vocabulary-lesson-group-completed">已完成</span>'
        : '<span class="vocabulary-lesson-group-completed" aria-hidden="true"></span>';
    }
    if (typeof isTeacher === 'function' && isTeacher()) {
      const sister = groupCore.isVocabularyLessonGroupCompleted(progressForUser('sister'), groupId);
      const brother = groupCore.isVocabularyLessonGroupCompleted(progressForUser('brother'), groupId);
      const labels = [sister ? '姐姐✓' : '', brother ? '弟弟✓' : ''].filter(Boolean);
      return labels.length
        ? `<span class="vocabulary-lesson-group-completed is-teacher">${labels.join(' · ')}</span>`
        : '<span class="vocabulary-lesson-group-completed is-teacher" aria-hidden="true"></span>';
    }
    return '<span class="vocabulary-lesson-group-completed" aria-hidden="true"></span>';
  }

  function firstIncompleteGroupIndex(config, user) {
    if (!config || !config.groups.length) return 0;
    if (!user) return 0;
    const progress = progressForUser(user);
    const active = config.groups
      .map((group, index) => ({ index, entry: progress.groups[group.id] }))
      .filter(item => item.entry && item.entry.status !== 'completed' && item.entry.updatedAt)
      .sort((a, b) => String(b.entry.updatedAt).localeCompare(String(a.entry.updatedAt)))[0];
    if (active) return active.index;
    const index = config.groups.findIndex(group => !groupCore.isVocabularyLessonGroupCompleted(progress, group.id));
    return index >= 0 ? index : 0;
  }

  async function migrateLegacyProgressForBook(batch, config, materialized) {
    const user = currentStudentUser();
    if (!user || !batch || !config || isTransientBatch(batch)) return;
    const progress = progressForUser(user);
    const migrationKey = String(batch.id);
    if (progress.migrations[migrationKey]) return;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(getProgressStorageKey(batch)) || 'null'); } catch (_) {}
    const migrated = groupCore.migrateLegacyVocabularyLessonProgress(
      raw,
      materialized.map(items => items.length),
      groupCore.LEGACY_BATCH_SIZE
    );
    if (migrated && config.groups[migrated.groupIndex]) {
      cloudProgressByUser[user] = groupCore.updateVocabularyLessonGroupPosition(progress, {
        groupId: config.groups[migrated.groupIndex].id,
        wordIndex: migrated.wordIndex,
        updatedAt: new Date().toISOString()
      });
    }
    progressForUser(user).migrations[migrationKey] = 'legacy-v1-to-groups-v1';
    await saveCloudProgressNow(user);
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
          ${group ? completionLabel(group.id) : ''}
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
              ${completionLabel(group.id)}
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
    saveVocabularyLessonProgress();
    ensureProgressState();
    vocabularyLessonState.batchIndex = target;
    vocabularyLessonState.lastTeachingBatchIndex = target;
    const group = vocabularyLessonState.groupConfig && vocabularyLessonState.groupConfig.groups[target];
    const user = currentStudentUser();
    const savedGroup = user && group ? progressForUser(user).groups[group.id] : null;
    const savedPosition = user
      ? savedGroup && savedGroup.wordIndex
      : vocabularyLessonState.batchPositions[target];
    vocabularyLessonState.wordIndex = clampIndex(
      savedPosition,
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

  async function selectVocabularyLessonGroup(batchOrId, requestedGroupIndex) {
    saveVocabularyLessonProgress();
    await loadRelevantCloudProgress();
    const batch = isTransientBatch(batchOrId)
      ? batchOrId
      : selectVocabularyLessonBatch(appData, currentUser, batchOrId);
    if (!batch) return false;
    // Opening the guide is a viewing action. Derive any missing grouping in
    // memory and defer the global `main` write until the student completes a
    // group, where sealCurrentGroupInMain() persists the stable grouping.
    const config = deriveGroupConfig(batch);
    currentBatchId = isTransientBatch(batch) ? null : String(batch.id);
    vocabularyLessonState.batch = batch;
    vocabularyLessonState.words = buildVocabularyLessonWords(batch, vocabularyLessonVisualRegistry);
    vocabularyLessonState.groupConfig = config;
    vocabularyLessonState.batches = groupCore.materializeVocabularyLessonGroups(vocabularyLessonState.words, config);
    const localProgress = isTransientBatch(batch) ? defaultProgressState() : readVocabularyLessonProgress();
    await migrateLegacyProgressForBook(batch, config, vocabularyLessonState.batches);

    const user = currentStudentUser();
    const fallback = user
      ? firstIncompleteGroupIndex(config, user)
      : clampIndex(localProgress.lastTeachingBatchIndex, vocabularyLessonState.batches.length);
    const hasRequestedGroup = requestedGroupIndex !== null
      && requestedGroupIndex !== undefined
      && requestedGroupIndex !== ''
      && Number.isFinite(Number(requestedGroupIndex));
    const target = hasRequestedGroup
      ? clampIndex(requestedGroupIndex, vocabularyLessonState.batches.length)
      : fallback;
    const group = config.groups[target];
    const groupProgress = user && group ? progressForUser(user).groups[group.id] : null;

    vocabularyLessonState.batchPositions = vocabularyLessonState.batches.map((items, index) => {
      const entry = user && config.groups[index] ? progressForUser(user).groups[config.groups[index].id] : null;
      const position = user ? entry && entry.wordIndex : localProgress.batchPositions[index];
      return clampIndex(position, items.length);
    });
    vocabularyLessonState.lastTeachingBatchIndex = target;
    vocabularyLessonState.batchIndex = target;
    const selectedPosition = user
      ? groupProgress && groupProgress.wordIndex
      : localProgress.batchPositions[target];
    vocabularyLessonState.wordIndex = clampIndex(selectedPosition, vocabularyLessonState.batches[target].length);
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
    const user = currentStudentUser();
    const group = activeGroupConfig();
    if (!user || !group || isTransientBatch(vocabularyLessonState.batch)) return true;
    const progress = progressForUser(user);
    if (groupCore.isVocabularyLessonGroupCompleted(progress, group.id)) return true;

    const sealed = await sealCurrentGroupInMain();
    if (!sealed) return false;
    const completedAt = new Date().toISOString();
    const today = groupCore.localDateKey(new Date());
    const result = groupCore.markVocabularyLessonGroupCompleted(progress, {
      groupId: group.id,
      wordKeys: group.wordKeys,
      completedAt,
      eligibleDate: groupCore.addLocalDays(today, 1)
    });
    cloudProgressByUser[user] = result.progress;
    return saveCloudProgressNow(user);
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
        next.textContent = vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1
          ? '完成本组并进入下一组 →'
          : '完成本组 →';
      }
    };

    renderVocabularyLessonBookSelection = renderTask016BookSelection;

    const baseOpenList = openVocabularyReviewList;
    openVocabularyReviewList = async function openVocabularyReviewListTask016() {
      await loadRelevantCloudProgress();
      return baseOpenList();
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

    continueVocabularyLessonAfterBatchReview = async function continueVocabularyLessonAfterBatchReviewTask016() {
      saveVocabularyLessonProgress();
      const completed = await completeCurrentGroup();
      if (!completed) return;
      if (vocabularyLessonState.batchIndex < vocabularyLessonState.batches.length - 1) {
        vocabularyLessonState.batchIndex += 1;
        ensureProgressState();
        vocabularyLessonState.lastTeachingBatchIndex = vocabularyLessonState.batchIndex;
        const nextGroup = activeGroupConfig();
        const user = currentStudentUser();
        const nextProgress = user && nextGroup ? progressForUser(user).groups[nextGroup.id] : null;
        const nextPosition = user
          ? nextProgress && nextProgress.wordIndex
          : vocabularyLessonState.batchPositions[vocabularyLessonState.batchIndex];
        vocabularyLessonState.wordIndex = clampIndex(
          nextPosition,
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

    window.selectVocabularyLessonGroup = selectVocabularyLessonGroup;
    window.selectVocabularyLessonVirtualBatch = function selectVocabularyLessonVirtualBatch(batch, groupIndex) {
      if (!isTransientBatch(batch)) return false;
      return selectVocabularyLessonGroup(batch, groupIndex);
    };
    window.jumpVocabularyLessonBatch = jumpVocabularyLessonBatch;
    window.openVocabularyLessonHardWordsFromNav = openVocabularyLessonHardWordsFromNav;
    window.openVocabularyLessonRandomFromNav = openVocabularyLessonRandomFromNav;
    window.getVocabularyLessonProgressStorageKey = getProgressStorageKey;
    window.addEventListener('beforeunload', saveVocabularyLessonProgress);

    ensureTask016Shell();
    if (document.getElementById('screenVocabularyReviewList')?.classList.contains('active')) {
      loadRelevantCloudProgress().then(() => {
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
