(function installWordCardPerformance() {
  'use strict';

  const recordCache = new Map();
  let mainRefreshPromise = null;

  function normalizeRecord(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      known: Array.isArray(source.known) ? source.known.slice() : [],
      unknown: Array.isArray(source.unknown) ? source.unknown.slice() : []
    };
  }

  function recordKey(batchId) {
    return `${currentUser}_${String(batchId)}`;
  }

  function readCachedRecord(batchId) {
    const key = recordKey(batchId);
    if (recordCache.has(key)) return normalizeRecord(recordCache.get(key));
    const mirrored = typeof getMirrorValue === 'function' ? getMirrorValue(key) : null;
    const record = normalizeRecord(mirrored);
    recordCache.set(key, record);
    return normalizeRecord(record);
  }

  function refreshRecordInBackground(batchId, onUpdate) {
    if (typeof sbGetRemote !== 'function') return Promise.resolve(null);
    const id = String(batchId);
    const key = recordKey(id);
    return Promise.resolve()
      .then(() => sbGetRemote(key))
      .then(remote => {
        if (!remote || typeof remote !== 'object') return null;
        const record = normalizeRecord(remote);
        recordCache.set(key, record);
        if (String(currentBatchId || '') === id) currentUserRec = normalizeRecord(record);
        if (typeof onUpdate === 'function') onUpdate(record);
        return record;
      })
      .catch(error => {
        console.warn('word-card record refresh skipped', error && (error.message || error));
        return null;
      });
  }

  function refreshMainInBackground(onUpdate) {
    if (typeof sbGetRemote !== 'function') return Promise.resolve(null);
    if (!mainRefreshPromise) {
      mainRefreshPromise = Promise.resolve()
        .then(() => sbGetRemote('main'))
        .then(remote => {
          if (!remote || typeof remote !== 'object') return null;
          if (typeof normalizeAppData === 'function') normalizeAppData(remote);
          appData = remote;
          if (typeof setMainSnapshot === 'function') setMainSnapshot(appData);
          return appData;
        })
        .catch(error => {
          console.warn('word-card main refresh skipped', error && (error.message || error));
          return null;
        })
        .finally(() => { mainRefreshPromise = null; });
    }
    return mainRefreshPromise.then(data => {
      if (data && typeof onUpdate === 'function') onUpdate(data);
      return data;
    });
  }

  function renderTeacherWordCardsFast() {
    if (typeof isTeacher === 'function' && !isTeacher()) return;
    const list = document.getElementById('batchList');
    if (!list) return;
    const filterState = getBookPurposeFilterState('teacherCommonBookFilter', 'teacherSupportBookFilter');
    const batches = filterBatchesByBookPurpose(
      getVisibleBatchesNewestFirst(),
      filterState.showCommon,
      filterState.showSupport
    );

    list.innerHTML = '';
    if (!batches.length) {
      list.innerHTML = !filterState.showCommon && !filterState.showSupport
        ? '<div class="empty-state"><div class="empty-emoji">📚</div><p>当前没有选择要显示的单词本类型</p></div>'
        : '<div class="empty-state"><div class="empty-emoji">📭</div><p>当前类型下还没有单词本</p></div>';
    } else {
      batches.forEach(batch => {
        const bookPurpose = getBookPurpose(batch);
        const record = readCachedRecord(batch.id);
        const item = document.createElement('div');
        item.className = 'batch-item';
        const safeId = String(batch.id).replace(/'/g, "\\'");
        const delBtn = `<button class="batch-delete" onclick="event.stopPropagation();deleteBatch('${safeId}')">🗑</button>`;
        let pushTagsHTML = '';
        if (batch.sharedWith && batch.sharedWith.length > 0) {
          pushTagsHTML = '<div class="push-tags">'
            + (batch.sharedWith.includes('sister') ? '<span class="push-tag sister">👧姐姐</span>' : '')
            + (batch.sharedWith.includes('brother') ? '<span class="push-tag brother">👦弟弟</span>' : '')
            + '</div>';
        }
        const safeName = typeof escapeHtml === 'function' ? escapeHtml(batch.name) : batch.name;
        item.innerHTML = `
          <span class="batch-icon">${bookPurpose === 'support' ? '🧩' : '📚'}</span>
          <div class="batch-info">
            <div class="batch-name">${safeName}</div>
            <div class="batch-meta">${batch.cards.length} 个单词 · ✅${record.known.length} ❌${record.unknown.length}</div>
            ${pushTagsHTML}
          </div>
          <span class="batch-arrow">›</span>
          ${delBtn}`;
        item.addEventListener('click', () => openBatch(batch.id));
        list.appendChild(item);
      });
    }

    const mergeEntryBtn = document.getElementById('mergeEntryBtn');
    if (mergeEntryBtn) mergeEntryBtn.style.display = appData.batches.length >= 1 ? 'flex' : 'none';
  }

  function renderBatchDetailFast() {
    const batch = getCurrentBatch();
    if (!batch) return false;
    const record = currentUserRec && typeof currentUserRec === 'object'
      ? normalizeRecord(currentUserRec)
      : readCachedRecord(currentBatchId);
    currentUserRec = record;

    document.getElementById('editPanel')?.classList.remove('open');
    document.getElementById('editPanelToggle')?.classList.remove('active');
    const editPanel = document.getElementById('editPanel');
    const editToggle = document.getElementById('editPanelToggle');
    if (editPanel) editPanel.style.display = isTeacher() ? '' : 'none';
    if (editToggle) editToggle.style.display = isTeacher() ? '' : 'none';
    document.getElementById('detailTitle')?.classList.remove('tap-editable');

    const title = document.getElementById('detailTitle');
    if (title) title.textContent = batch.name;
    const total = document.getElementById('dStatTotal');
    const known = document.getElementById('dStatKnown');
    const unknown = document.getElementById('dStatUnknown');
    if (total) total.textContent = String(batch.cards.length);
    if (known) known.textContent = String(record.known.length);
    if (unknown) unknown.textContent = String(record.unknown.length);

    const dailyBtn = document.getElementById('btnDailyQuiz');
    if (dailyBtn) dailyBtn.disabled = batch.cards.length === 0;
    if (typeof updateDetailChallengeStatus === 'function') {
      Promise.resolve(updateDetailChallengeStatus(batch.id)).catch(() => {});
    }
    if (typeof updatePushSubLabel === 'function') updatePushSubLabel();

    const chipList = document.getElementById('wordChipList');
    if (!chipList) return true;
    chipList.innerHTML = '';
    chipList.classList.remove('collapsed');
    studentWordCards = batch.cards;
    batch.cards.forEach((card, idx) => {
      normalizeCardDictionary(card);
      const word = getCardWord(card);
      const chip = document.createElement('div');
      chip.className = record.known.includes(word)
        ? 'word-chip known'
        : record.unknown.includes(word)
          ? 'word-chip unknown'
          : 'word-chip';
      chip.textContent = word;
      chip.addEventListener('click', () => openBatchWordCard(idx));
      chipList.appendChild(chip);
    });
    return true;
  }

  function resetWordCardSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (input) input.value = '';
    if (results) {
      results.style.display = 'none';
      results.innerHTML = '';
    }
  }

  window.refreshTeacherWordCards = async function refreshTeacherWordCardsFast() {
    renderTeacherWordCardsFast();
    refreshMainInBackground(() => {
      if (document.getElementById('screenTeacherWordCards')?.classList.contains('active')) renderTeacherWordCardsFast();
    });
  };

  window.openTeacherWordCards = async function openTeacherWordCardsFast() {
    if (!isTeacher()) return;
    showScreen('screenTeacherWordCards');
    renderTeacherWordCardsFast();
    refreshMainInBackground(() => {
      if (document.getElementById('screenTeacherWordCards')?.classList.contains('active')) renderTeacherWordCardsFast();
    });
  };

  window.openWordCards = function openWordCardsFast() {
    resetWordCardSearch();
    renderWordCardBatchList();
    showScreen('screenWordCards');
    refreshMainInBackground(() => {
      if (document.getElementById('screenWordCards')?.classList.contains('active')) renderWordCardBatchList();
    });
  };

  window.openBatch = async function openBatchFast(id) {
    studyIsGlobal = false;
    resultContext = '';
    currentBatchId = String(id);
    currentUserRec = readCachedRecord(currentBatchId);
    if (!renderBatchDetailFast()) return;
    showScreen('screenDetail');
    refreshRecordInBackground(currentBatchId, () => {
      if (document.getElementById('screenDetail')?.classList.contains('active')) renderBatchDetailFast();
    });
  };

  window.loadDetail = async function loadDetailFast() {
    if (!currentBatchId) return;
    if (!currentUserRec || typeof currentUserRec !== 'object') currentUserRec = readCachedRecord(currentBatchId);
    renderBatchDetailFast();
    refreshRecordInBackground(currentBatchId, () => {
      if (document.getElementById('screenDetail')?.classList.contains('active')) renderBatchDetailFast();
    });
  };

  window.openBatchWordCard = async function openBatchWordCardFast(idx) {
    const batch = getCurrentBatch();
    if (!batch || !batch.cards[idx]) return;
    currentUserRec = currentUserRec && typeof currentUserRec === 'object'
      ? normalizeRecord(currentUserRec)
      : readCachedRecord(currentBatchId);
    studyIsGlobal = false;
    studyMode = 'dictionary';
    resultContext = '';
    studyDeck = [...batch.cards];
    studyCurrent = idx;
    studyFlipped = true;
    document.getElementById('modeLabel').textContent = '👀 查看单词';
    showScreen('screenStudy');
    renderStudyCard();
    setFlipped(true);
    refreshRecordInBackground(currentBatchId);
  };

  window.openDictionaryResult = async function openDictionaryResultFast(batchId, cardIdx) {
    resetWordCardSearch();
    studyIsGlobal = false;
    studyMode = 'dictionary';
    resultContext = 'word-card-page';
    currentBatchId = String(batchId);
    currentUserRec = readCachedRecord(currentBatchId);
    const batch = getCurrentBatch();
    if (!batch || !batch.cards[cardIdx]) return;
    studyDeck = [batch.cards[cardIdx]];
    studyCurrent = 0;
    studyFlipped = true;
    document.getElementById('modeLabel').textContent = '🔍 字典搜索';
    showScreen('screenStudy');
    renderStudyCard();
    setFlipped(true);
    refreshRecordInBackground(currentBatchId);
  };

  window.jumpToWordLink = async function jumpToWordLinkFast(batchId, cardIdx) {
    currentBatchId = String(batchId);
    currentUserRec = readCachedRecord(currentBatchId);
    const batch = getCurrentBatch();
    if (!batch || !batch.cards[cardIdx]) return;
    studyDeck = [batch.cards[cardIdx]];
    studyCurrent = 0;
    studyFlipped = true;
    document.getElementById('modeLabel').textContent = '🔗 ' + getCardWord(batch.cards[cardIdx]);
    renderStudyCard();
    setFlipped(true);
    refreshRecordInBackground(currentBatchId);
  };

  window.startStudy = async function startStudyFast(mode) {
    studyIsGlobal = false;
    resultContext = '';
    studyMode = mode;
    const batch = getCurrentBatch();
    if (!batch) return;
    currentUserRec = readCachedRecord(currentBatchId);
    if (mode === 'all') {
      studyDeck = [...batch.cards];
      document.getElementById('modeLabel').textContent = '📖 全部学习';
    } else if (mode === 'shuffle') {
      studyDeck = [...batch.cards].sort(() => Math.random() - 0.5);
      document.getElementById('modeLabel').textContent = '🔀 随机模式';
    } else if (mode === 'pool') {
      studyDeck = batch.cards
        .filter(card => currentUserRec.unknown.includes(getCardWord(card)))
        .sort(() => Math.random() - 0.5);
      document.getElementById('modeLabel').textContent = '💪 生词池';
    }
    studyCurrent = 0;
    studyFlipped = false;
    showScreen('screenStudy');
    renderStudyCard();
    refreshRecordInBackground(currentBatchId);
  };

  window.refreshWordCardMainData = refreshMainInBackground;
  window.__WORD_CARD_PERFORMANCE_READY__ = true;
})();
