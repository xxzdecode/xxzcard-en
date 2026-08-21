const FEATURE_GROUPS = {
  adventurePlayer: [
    'js/vocabularyAdventureCore.js',
    'js/vocabularyAdventure.js',
    'js/vocabularyAdventureReview.js',
    'js/vocabularyAdventurePlayer.js'
  ],
  adventureChallenge: [
    'js/vocabularyAdventureCore.js',
    'js/vocabularyAdventure.js',
    'js/vocabularyAdventureReview.js',
    'js/vocabularyAdventureChallenge.js'
  ],
  adventureVisual: ['js/vocabularyAdventureVisualV2.js'],
  grammarChallenge: ['grammar-challenge/data/catalog.js', 'js/grammarChallenges.js'],
  grammarAdaptive: ['grammar-challenge/data/question-bank.js', 'js/grammarAdaptiveChallenge.js'],
  themeQuiz: ['js/themeQuizzes.js'],
  courseware: ['js/courseware-data.js', 'js/courseware.js'],
  grammarLibrary: ['js/grammarLibrary.js'],
  wrongAnswerOrganizer: ['js/wrongAnswerOrganizer.js'],
  teacherTools: [
    'js/dictionary.js',
    'js/batch.js',
    'js/import.js',
    'js/tasks.js',
    'js/review.js',
    'js/study.js',
    'js/quiz.js',
    'js/questionTypes.js',
    'js/taskEngine.js',
    'js/merge.js',
    'js/wordDedupe.js',
    'js/wordCardPerformance.js',
    'js/wordCardStudySafety.js'
  ],
  vocabularyReview: [
    'js/vocabularyReviewData.js',
    'js/vocabularyReview.js',
    'js/vocabularyLessonGroups.js',
    'js/vocabularyLessonTaught.js',
    'js/vocabularyLesson016.js',
    'js/vocabularyLessonCategories.js'
  ],
  vocabularyScreening: ['js/vocabularyScreeningData.js', 'js/vocabularyScreening.js']
};

const loadedFeatureScripts = new Set();
const featureScriptPromises = new Map();
const independentFeatureScriptPromises = new Map();
const featureGroupPromises = new Map();

const VOCABULARY_COPY_LIST_STUDENTS = Object.freeze([
  { user: 'sister', name: '姐姐', stateKey: 'vocab_adventure_v1_sister' },
  { user: 'brother', name: '弟弟', stateKey: 'vocab_adventure_v1_brother' }
]);

function replaceChildrenCompat(node, ...children) {
  if (!node) return;
  if (typeof node.replaceChildren === 'function') {
    node.replaceChildren(...children);
    return;
  }
  while (node.firstChild) node.removeChild(node.firstChild);
  children.forEach(child => {
    if (child) node.appendChild(child);
  });
}

function vocabularyCopyListDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function vocabularyCopyListWords(items) {
  const result = [];
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach(item => {
    const word = String(item && (item.word || item.wordKey) || '').trim();
    const key = word.toLocaleLowerCase().replace(/\s+/g, ' ');
    if (!word || seen.has(key)) return;
    seen.add(key);
    result.push({
      word,
      status: item && item.status === 'completed' ? 'completed' : 'pending',
      result: item && ['D', 'H', 'F'].includes(item.result) ? item.result : ''
    });
  });
  return result;
}

function vocabularyCopyListSection(lines, title, words) {
  lines.push(title);
  if (!words.length) {
    lines.push('（无）', '');
    return;
  }
  words.forEach((item, index) => lines.push(`${index + 1}. ${item.word}`));
  lines.push('');
}

function buildVocabularyCopyListText(student, state) {
  const session = state && state.session && typeof state.session === 'object'
    ? state.session
    : null;
  const screeningItems = session && Array.isArray(session.plan)
    ? session.plan.filter(item => item && item.phase === 'screening')
    : [];
  const words = vocabularyCopyListWords(screeningItems);
  const sessionDate = session && typeof session.date === 'string' && session.date
    ? session.date
    : '';
  const exportDate = vocabularyCopyListDate(new Date());
  const completedCount = words.filter(item => item.status === 'completed').length;
  const lines = [
    `${student.name}摸底抄写词单`,
    `摸底日期：${sessionDate || '暂无'}`,
    `导出日期：${exportDate}`,
    `摸底总词数：${words.length}`,
    `已作答：${completedCount}`,
    `尚未作答：${Math.max(0, words.length - completedCount)}`,
    '',
    '说明：本文件包含该次摸底计划中的全部单词，并按答题结果分组。',
    ''
  ];

  if (!words.length) {
    lines.push('暂无摸底数据。', `请先让${student.name}进入“词汇探险”完成摸底。`, '');
    return lines.join('\r\n');
  }

  vocabularyCopyListSection(
    lines,
    '一、未答对（F）',
    words.filter(item => item.status === 'completed' && item.result === 'F')
  );
  vocabularyCopyListSection(
    lines,
    '二、提示后答对（H）',
    words.filter(item => item.status === 'completed' && item.result === 'H')
  );
  vocabularyCopyListSection(
    lines,
    '三、第一次答对（D）',
    words.filter(item => item.status === 'completed' && item.result === 'D')
  );
  vocabularyCopyListSection(
    lines,
    '四、尚未作答',
    words.filter(item => item.status !== 'completed' || !item.result)
  );

  return lines.join('\r\n');
}

function downloadVocabularyCopyList(filename, text) {
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportVocabularyAdventureCopyLists() {
  const button = document.getElementById('exportVocabularyCopyListsButton');
  const label = button && button.querySelector('span');
  const originalLabel = label ? label.textContent : '';
  if (button) button.disabled = true;
  if (label) label.textContent = '导出中';

  try {
    if (typeof sbGet !== 'function') throw new Error('暂时无法读取摸底数据');
    const records = await Promise.all(VOCABULARY_COPY_LIST_STUDENTS.map(async student => ({
      student,
      state: await sbGet(student.stateKey)
    })));

    records.forEach(({ student, state }) => {
      const sessionDate = state && state.session && state.session.date
        ? String(state.session.date)
        : vocabularyCopyListDate(new Date());
      const filename = `${student.name}_摸底抄写词单_${sessionDate}.txt`;
      downloadVocabularyCopyList(filename, buildVocabularyCopyListText(student, state));
    });
  } catch (error) {
    console.error(error);
    alert(error && error.message ? error.message : '导出失败，请检查网络后重试。');
  } finally {
    if (button) button.disabled = false;
    if (label) label.textContent = originalLabel || '导出词单';
  }
}

function installVocabularyCopyListExportButton() {
  const nav = document.querySelector('.teacher-home-nav');
  if (!nav || document.getElementById('exportVocabularyCopyListsButton')) return;
  nav.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bottom-feature-nav__item';
  button.id = 'exportVocabularyCopyListsButton';
  button.setAttribute('aria-label', '导出姐姐和弟弟的摸底抄写词单');
  button.innerHTML = `
    <svg class="bottom-feature-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v4h4M9 12h6M9 16h6" />
      <path d="M12 8v6m-2 -2l2 2 2 -2" />
    </svg>
    <span>导出词单</span>`;
  button.addEventListener('click', exportVocabularyAdventureCopyLists);
  nav.appendChild(button);
}

function loadFeatureScript(src) {
  if (loadedFeatureScripts.has(src)) return Promise.resolve();
  if (featureScriptPromises.has(src)) return featureScriptPromises.get(src);
  if (independentFeatureScriptPromises.has(src)) return independentFeatureScriptPromises.get(src);

  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  featureScriptPromises.set(src, promise);

  let script = null;
  let settled = false;
  let timeout = 0;

  const finish = (error = null) => {
    if (settled) return;
    settled = true;
    if (timeout) window.clearTimeout(timeout);
    if (script) {
      script.onload = null;
      script.onerror = null;
    }
    if (featureScriptPromises.get(src) === promise) {
      featureScriptPromises.delete(src);
    }
    if (error) {
      if (script) script.remove();
      rejectPromise(error);
      return;
    }
    loadedFeatureScripts.add(src);
    resolvePromise();
  };

  try {
    script = document.createElement('script');
    timeout = window.setTimeout(() => {
      finish(new Error(`功能资源加载超时：${src}`));
    }, 10000);
    script.src = src;
    script.async = false;
    script.dataset.featureSource = src;
    script.onload = () => finish();
    script.onerror = () => finish(new Error(`功能资源加载失败：${src}`));
    document.head.appendChild(script);
  } catch (error) {
    finish(error instanceof Error ? error : new Error(`功能资源加载失败：${src}`));
  }

  return promise;
}

function loadIndependentFeatureScript(src) {
  if (loadedFeatureScripts.has(src)) return Promise.resolve();
  if (featureScriptPromises.has(src)) return featureScriptPromises.get(src);
  if (independentFeatureScriptPromises.has(src)) return independentFeatureScriptPromises.get(src);

  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  independentFeatureScriptPromises.set(src, promise);

  const script = document.createElement('script');
  let settled = false;
  let timeout = 0;
  const finish = error => {
    if (settled) return;
    settled = true;
    if (timeout) window.clearTimeout(timeout);
    script.onload = null;
    script.onerror = null;
    independentFeatureScriptPromises.delete(src);
    if (error) {
      script.remove();
      rejectPromise(error);
      return;
    }
    loadedFeatureScripts.add(src);
    resolvePromise();
  };
  try {
    script.src = src;
    script.async = true;
    script.dataset.featureSource = src;
    script.dataset.loadingMode = 'independent';
    script.onload = () => finish();
    script.onerror = () => finish(new Error(`独立功能资源加载失败：${src}`));
    timeout = window.setTimeout(() => finish(new Error(`独立功能资源加载超时：${src}`)), 10000);
    document.head.appendChild(script);
  } catch (error) {
    finish(error instanceof Error ? error : new Error(`独立功能资源加载失败：${src}`));
  }
  return promise;
}

function loadFeatureGroup(group) {
  if (featureGroupPromises.has(group)) return featureGroupPromises.get(group);
  const sources = FEATURE_GROUPS[group] || [];
  const promise = sources.reduce(
    (chain, src) => chain.then(() => loadFeatureScript(src)),
    Promise.resolve()
  ).catch(error => {
    featureGroupPromises.delete(group);
    throw error;
  });
  featureGroupPromises.set(group, promise);
  return promise;
}

function loadAdventureVisualEnhancement() {
  return loadFeatureGroup('adventureVisual').catch(error => {
    console.warn('adventure visual enhancement skipped', error && (error.message || error));
    return null;
  });
}

function setVocabularyAdventureEntryState(state, error = null) {
  const entry = document.getElementById('vocabularyAdventurePreviewEntry');
  const status = document.getElementById('vocabularyAdventureHomeStatus');
  const notice = document.getElementById('studentHomeNotice');
  const isLoading = state === 'loading';
  const isError = state === 'error';

  if (entry) {
    entry.dataset.entryState = state;
    if (isLoading) entry.setAttribute('aria-busy', 'true');
    else entry.removeAttribute('aria-busy');
  }
  if (status) {
    if (isLoading) status.textContent = '正在打开…';
    if (isError) status.textContent = '点击重试';
  }
  if (!notice) return;

  replaceChildrenCompat(notice);
  if (!isLoading && !isError) {
    notice.hidden = true;
    return;
  }

  const message = document.createElement('span');
  message.textContent = isLoading
    ? '正在打开词汇探险…'
    : '词汇探险暂时无法打开，请重试。';
  notice.appendChild(message);

  if (isError) {
    const detail = error && error.message ? ` ${error.message}` : '';
    notice.setAttribute('aria-label', `词汇探险加载失败。${detail}`.trim());
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新打开';
    retry.addEventListener('click', () => window.openVocabularyAdventure());
    notice.appendChild(retry);
  } else {
    notice.removeAttribute('aria-label');
  }
  notice.hidden = false;
}

function installLazyFeatureHandler(name, group) {
  let resolvedHandler = null;
  let launchPromise = null;
  const keepsLazyEntry = group === 'adventurePlayer' || group === 'adventureChallenge';

  function captureResolvedHandler(lazyHandler) {
    const handler = window[name];
    if (typeof handler === 'function' && handler !== lazyHandler) {
      resolvedHandler = handler;
    }
    return resolvedHandler;
  }

  const lazyHandler = (...args) => {
    if (launchPromise) return launchPromise;
    if (group === 'adventurePlayer') setVocabularyAdventureEntryState('loading');

    launchPromise = (async () => {
      try {
        if (!resolvedHandler || keepsLazyEntry) {
          await loadFeatureGroup(group);
        }
        if (!resolvedHandler) {
          const handler = captureResolvedHandler(lazyHandler);
          if (typeof handler !== 'function' || handler === lazyHandler) {
            throw new Error(`功能入口未就绪：${name}`);
          }
        }
        const result = await resolvedHandler(...args);
        if (group === 'adventurePlayer') {
          setVocabularyAdventureEntryState('ready');
          loadAdventureVisualEnhancement();
        }
        return result;
      } catch (error) {
        captureResolvedHandler(lazyHandler);
        console.error(error);
        if (group === 'adventurePlayer') {
          setVocabularyAdventureEntryState('error', error);
        } else {
          const detail = error && error.message ? error.message : '未知错误';
          alert(`功能加载失败：${detail}\n请检查网络后重试。`);
        }
        return null;
      } finally {
        if (keepsLazyEntry) window[name] = lazyHandler;
        launchPromise = null;
      }
    })();

    return launchPromise;
  };
  window[name] = lazyHandler;
}

[
  ['openVocabularyAdventure', 'adventurePlayer'],
  ['openVocabularyAdventureChallenge', 'adventureChallenge'],
  ['openGrammarChallengeList', 'grammarChallenge'],
  ['openThemeQuizList', 'themeQuiz'],
  ['openCoursewareList', 'courseware'],
  ['openGrammarLibrary', 'grammarLibrary'],
  ['openWrongAnswerOrganizer', 'wrongAnswerOrganizer'],
  ['openLatestWrongAnswerPaper', 'wrongAnswerOrganizer'],
  ['openWordCards', 'teacherTools'],
  ['openPhonemeTraining', 'teacherTools'],
  ['openVocabularyReviewList', 'vocabularyReview'],
  ['openVocabularyScreening', 'vocabularyScreening']
].forEach(([name, group]) => installLazyFeatureHandler(name, group));

window.exportVocabularyAdventureCopyLists = exportVocabularyAdventureCopyLists;
window.loadIndependentFeatureScript = loadIndependentFeatureScript;

let teacherDashboardSummaryRefreshPromise = null;
function refreshTeacherDashboardSummaries() {
  if (typeof isTeacher === 'function' && !isTeacher()) return Promise.resolve(null);
  if (teacherDashboardSummaryRefreshPromise) return teacherDashboardSummaryRefreshPromise;
  teacherDashboardSummaryRefreshPromise = loadIndependentFeatureScript('js/teacherDashboardSummaries.js')
    .then(() => window.TeacherDashboardSummaries?.refresh?.())
    .catch(error => {
      console.warn('teacher dashboard summaries unavailable', error && (error.message || error));
      ['teacherLatestPracticeSummary', 'teacherKnowledgeSummary'].forEach(id => {
        const panel = document.getElementById(id);
        if (!panel) return;
        panel.dataset.state = 'unavailable';
        panel.setAttribute('aria-busy', 'false');
      });
      return null;
    })
    .finally(() => {
      teacherDashboardSummaryRefreshPromise = null;
    });
  return teacherDashboardSummaryRefreshPromise;
}
window.refreshTeacherDashboardSummaries = refreshTeacherDashboardSummaries;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installVocabularyCopyListExportButton, { once: true });
} else {
  installVocabularyCopyListExportButton();
}
