const FEATURE_GROUPS = {
  adventure: [
    'js/vocabularyAdventureCore.js',
    'js/vocabularyAdventure.js',
    'js/vocabularyAdventureReview.js',
    'js/vocabularyAdventurePlayer.js',
    'js/vocabularyAdventureChallenge.js',
    'js/vocabularyAdventureVisualV2.js'
  ],
  grammarChallenge: ['grammar-challenge/data/catalog.js', 'js/grammarChallenges.js'],
  themeQuiz: ['js/themeQuizzes.js'],
  courseware: ['js/courseware-data.js', 'js/courseware.js'],
  grammarLibrary: ['js/grammarLibrary.js'],
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
    'js/wordDedupe.js'
  ],
  vocabularyReview: [
    'js/vocabularyReviewData.js',
    'js/vocabularyReview.js',
    'js/vocabularyLesson016.js',
    'js/vocabularyLessonCategories.js'
  ],
  vocabularyScreening: ['js/vocabularyScreeningData.js', 'js/vocabularyScreening.js']
};

const loadedFeatureScripts = new Set();
const featureGroupPromises = new Map();

const VOCABULARY_COPY_LIST_STUDENTS = Object.freeze([
  { user: 'sister', name: '姐姐', stateKey: 'vocab_adventure_v1_sister' },
  { user: 'brother', name: '弟弟', stateKey: 'vocab_adventure_v1_brother' }
]);

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
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => {
      loadedFeatureScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`功能资源加载失败：${src}`));
    document.head.appendChild(script);
  });
}

function loadFeatureGroup(group) {
  if (featureGroupPromises.has(group)) return featureGroupPromises.get(group);
  const sources = FEATURE_GROUPS[group] || [];
  const promise = sources.reduce(
    (chain, src) => chain.then(() => loadFeatureScript(src)),
    Promise.resolve()
  );
  featureGroupPromises.set(group, promise);
  return promise;
}

function installLazyFeatureHandler(name, group) {
  const lazyHandler = async (...args) => {
    try {
      await loadFeatureGroup(group);
      const handler = window[name];
      if (typeof handler !== 'function' || handler === lazyHandler) {
        throw new Error(`功能入口未就绪：${name}`);
      }
      return await handler(...args);
    } catch (error) {
      console.error(error);
      alert('功能加载失败，请检查网络后重试。');
    }
  };
  window[name] = lazyHandler;
}

[
  ['openVocabularyAdventure', 'adventure'],
  ['openVocabularyAdventureChallenge', 'adventure'],
  ['openGrammarChallengeList', 'grammarChallenge'],
  ['openThemeQuizList', 'themeQuiz'],
  ['openCoursewareList', 'courseware'],
  ['openGrammarLibrary', 'grammarLibrary'],
  ['openWordCards', 'teacherTools'],
  ['openPhonemeTraining', 'teacherTools'],
  ['openVocabularyReviewList', 'vocabularyReview'],
  ['openVocabularyScreening', 'vocabularyScreening']
].forEach(([name, group]) => installLazyFeatureHandler(name, group));

window.exportVocabularyAdventureCopyLists = exportVocabularyAdventureCopyLists;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installVocabularyCopyListExportButton, { once: true });
} else {
  installVocabularyCopyListExportButton();
}

const warmAdventure = () => loadFeatureGroup('adventure')
  .then(() => loadHome())
  .catch(error => console.warn('adventure preload skipped', error.message || error));

if (typeof requestIdleCallback === 'function') requestIdleCallback(warmAdventure, { timeout: 1800 });
else setTimeout(warmAdventure, 900);
