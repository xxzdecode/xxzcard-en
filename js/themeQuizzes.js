const THEME_QUIZZES = [
  {
    id: 'third-person-sort',
    page: '01',
    title: '三单变位分类',
    description: '给动词加对的 s / es 形式',
    icon: 'letters',
    tone: 'blue',
    path: 'quizzes/三单变形练习.html'
  },
  {
    id: 'y-adjective-sort',
    page: '02',
    title: '加 -y 形容词变形分类',
    description: '判断词尾变化并组成形容词',
    icon: 'sparkles',
    tone: 'purple',
    path: 'quizzes/加y形容词变形分类练习.html'
  },
  {
    id: 'comparison-sort',
    page: '03',
    title: '比较级和最高级分类',
    description: '判断比较级和最高级的拼写变化',
    icon: 'chart',
    tone: 'green',
    path: 'quizzes/comparison-sort.html'
  },
  {
    id: 'er-job-match',
    title: '加 -er 的职业单词配对',
    description: '把动作词与对应职业名称配对',
    icon: 'briefcase',
    tone: 'orange',
    path: 'quizzes/加er的职业单词配对练习.html'
  },
  {
    id: 'syllable-phonics',
    title: '拆音节自然拼读',
    description: '拆分音节并练习自然拼读',
    icon: 'blocks',
    tone: 'green',
    path: 'quizzes/拆音节自然拼读练习.html'
  },
  {
    id: 'question-word-match',
    title: '特殊疑问词配对',
    description: '把疑问词与对应问句含义配对',
    icon: 'question',
    tone: 'blue',
    path: 'quizzes/特殊疑问词配对练习.html'
  }
];

const THEME_QUIZ_ICONS = {
  letters: '<text x="12" y="14.5" text-anchor="middle" font-size="8.5" font-weight="800" fill="currentColor">Abc</text>',
  briefcase: '<path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7M4.5 9.5h15v8.2A2.3 2.3 0 0 1 17.2 20H6.8a2.3 2.3 0 0 1-2.3-2.3V9.5Zm0 3.2c4.8 2.3 10.2 2.3 15 0M10 14h4"/>',
  sparkles: '<path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Zm6 9 .8 2.2L21 15l-2.2.8L18 18l-.8-2.2L15 15l2.2-.8L18 12ZM6.5 13l1 2.7 2.7 1-2.7 1-1 2.8-1-2.8-2.7-1 2.7-1 1-2.7Z"/>',
  blocks: '<rect x="3.5" y="6" width="5" height="5" rx="1"/><rect x="9.5" y="6" width="5" height="5" rx="1"/><rect x="15.5" y="6" width="5" height="5" rx="1"/><path d="M5 16h14M8 13.5 5 16l3 2.5M16 13.5l3 2.5-3 2.5"/>',
  question: '<path d="M9.4 8.7a3 3 0 1 1 4.9 2.3c-1.3.9-2.3 1.5-2.3 3M12 18h.01"/><path d="M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Z"/>',
  chart: '<path d="M5 19V9m7 10V5m7 14v-7M3 19h18"/>'
};

const PRACTICE_LIBRARY_VERSION = 1;
const PRACTICE_LIBRARY_QUIZ_IDS = new Set([
  'third-person-sort',
  'y-adjective-sort',
  'comparison-sort'
]);
let activeThemeQuizId = '';

function parsePracticeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function cleanPracticeMorphology(value) {
  return parsePracticeArray(value).map(item => {
    if (!item || typeof item !== 'object') return null;
    const part = String(item.part || '').trim();
    const meaning = String(item.meaning || '').trim();
    const knowledgeKey = String(item.knowledgeKey || '').trim();
    return part || meaning || knowledgeKey ? { part, meaning, knowledgeKey } : null;
  }).filter(Boolean);
}

function cleanPracticeIrregularForms(value) {
  return parsePracticeArray(value).map(item => {
    if (!item || typeof item !== 'object') return null;
    const label = String(item.label || '').trim();
    const form = String(item.form || '').trim();
    return label && form ? { label, form } : null;
  }).filter(Boolean);
}

function sanitizePracticeCard(card) {
  if (!card || typeof card !== 'object') return null;
  const clone = {
    word: typeof card.word === 'string' ? card.word : '',
    meaning: typeof card.meaning === 'string' ? card.meaning : '',
    pos: typeof card.pos === 'string' ? card.pos : '',
    morphology: cleanPracticeMorphology(card.morphology),
    irregularForms: cleanPracticeIrregularForms(card.irregularForms)
  };
  const normalized = typeof normalizeEnglishCard === 'function' ? normalizeEnglishCard(clone) : clone;
  const word = typeof getCardWord === 'function' ? getCardWord(normalized) : normalized.word;
  const meaning = typeof getCardMeaning === 'function' ? getCardMeaning(normalized) : normalized.meaning;
  const key = typeof normalizeWord === 'function' ? normalizeWord(word) : String(word || '').toLowerCase().trim();
  if (!key) return null;
  return {
    word: String(word || '').trim(),
    meaning: String(meaning || '').trim(),
    pos: String(normalized.pos || '').trim(),
    morphology: cleanPracticeMorphology(normalized.morphology),
    irregularForms: cleanPracticeIrregularForms(normalized.irregularForms)
  };
}

function practiceCardDetailScore(card) {
  return card.morphology.length * 2 + card.irregularForms.length * 2 + (card.meaning ? 1 : 0) + (card.pos ? 1 : 0);
}

function getPracticeLibraryCards() {
  let batches = [];
  try {
    batches = typeof visibleBatches === 'function' ? visibleBatches() : [];
  } catch (_) {
    batches = [];
  }
  const byWord = new Map();
  (Array.isArray(batches) ? batches : []).forEach(batch => {
    (Array.isArray(batch && batch.cards) ? batch.cards : []).forEach(rawCard => {
      const card = sanitizePracticeCard(rawCard);
      if (!card) return;
      const key = typeof normalizeWord === 'function' ? normalizeWord(card.word) : card.word.toLowerCase();
      const existing = byWord.get(key);
      if (!existing || practiceCardDetailScore(card) > practiceCardDetailScore(existing)) byWord.set(key, card);
    });
  });
  return [...byWord.values()];
}

function isAllowedPracticeOrigin(origin) {
  if (window.location.protocol === 'file:') return origin === 'null';
  return origin === window.location.origin;
}

function sendPracticeLibrary(quizId) {
  if (!PRACTICE_LIBRARY_QUIZ_IDS.has(quizId)) return;
  const frame = document.getElementById('themeQuizFrame');
  if (!frame || !frame.contentWindow || activeThemeQuizId !== quizId) return;
  try {
    frame.contentWindow.postMessage({
      type: 'practice-library',
      version: PRACTICE_LIBRARY_VERSION,
      quizId,
      cards: getPracticeLibraryCards()
    }, window.location.protocol === 'file:' ? '*' : window.location.origin);
  } catch (_) {}
}

window.addEventListener('message', event => {
  const frame = document.getElementById('themeQuizFrame');
  if (!frame || event.source !== frame.contentWindow || !isAllowedPracticeOrigin(event.origin)) return;
  const message = event.data;
  if (!message || message.type !== 'practice-data-request' || message.quizId !== activeThemeQuizId) return;
  sendPracticeLibrary(message.quizId);
});

function renderThemeQuizIcon(icon) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${THEME_QUIZ_ICONS[icon] || THEME_QUIZ_ICONS.letters}</svg>`;
}

function renderThemeQuizList() {
  const list = document.getElementById('themeQuizList');
  if (!list) return;
  list.innerHTML = THEME_QUIZZES.map(quiz => `
    <button class="game-entry" type="button" onclick="openThemeQuiz('${quiz.id}')" aria-label="${quiz.title}，${quiz.description}">
      <span class="game-entry__icon game-entry__icon--${quiz.tone}" aria-hidden="true">
        ${renderThemeQuizIcon(quiz.icon)}
      </span>
      <span class="game-entry__content">
        <span class="game-entry__title">${quiz.title}</span>
        <span class="game-entry__description">${quiz.description}</span>
      </span>
    </button>
  `).join('');
}

function openThemeQuizList() {
  if (isTeacher()) return;
  renderThemeQuizList();
  showScreen('screenThemeQuizzes');
}

function openThemeQuiz(id) {
  const quiz = THEME_QUIZZES.find(item => item.id === id);
  if (!quiz) return;
  const title = document.getElementById('themeQuizTitle');
  const frame = document.getElementById('themeQuizFrame');
  activeThemeQuizId = id;
  if (title) title.textContent = quiz.title;
  if (frame) {
    frame.onload = () => sendPracticeLibrary(id);
    frame.src = quiz.path;
  }
  document.body.classList.add('theme-quiz-open');
  showScreen('screenThemeQuizPlayer');
}

function closeThemeQuiz() {
  const frame = document.getElementById('themeQuizFrame');
  activeThemeQuizId = '';
  if (frame) {
    frame.onload = null;
    frame.src = 'about:blank';
  }
  document.body.classList.remove('theme-quiz-open');
  showScreen('screenThemeQuizzes');
}
