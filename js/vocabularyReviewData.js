const VOCABULARY_LESSON_VISUAL_REGISTRY_URL = 'data/vocabularyLessonVisuals.json';
const VOCABULARY_LESSON_SCENE_PLACEHOLDER = 'assets/vocabulary-lessons/scene-placeholder.svg';
const VOCABULARY_LESSON_SUPPORTED_VISUAL_TYPES = Object.freeze(['scene', 'compound', 'concept', 'emoji']);
const VOCABULARY_LESSON_BATCH_SIZE = 10;
const VOCABULARY_LESSON_RANDOM_SIZE = 10;

let vocabularyLessonVisualRegistry = { schemaVersion: 2, lessons: [] };
let vocabularyLessonVisualRegistryPromise = null;

function normalizeVocabularyLessonWord(word) {
  return String(word || '').trim().toLowerCase();
}

function cloneVocabularyLessonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeVocabularyLessonLine(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const phrase = value.phrase || value.collocation || value.word || value.en || value.text || '';
  const meaning = value.meaning || value.zh || value.translation || '';
  if (phrase && meaning) return `${phrase}｜${meaning}`;
  return String(phrase || meaning || '').trim();
}

function normalizeVocabularyLessonLines(values, limit = 3) {
  const source = Array.isArray(values) ? values : (values ? [values] : []);
  return source
    .map(normalizeVocabularyLessonLine)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, limit);
}

function getVocabularyLessonCardWord(card) {
  if (typeof getCardWord === 'function') return getCardWord(card);
  return String(card && (card.word || card.en) || '').trim();
}

function getVocabularyLessonCardMeaning(card) {
  if (typeof getCardMeaning === 'function') return getCardMeaning(card);
  return String(card && (card.meaning || card.zh) || '').trim();
}

function getVocabularyLessonBatchDate(batch) {
  if (!batch || typeof batch !== 'object') return '';
  return String(batch.sortDate || batch.date || batch.createdAt || batch.updatedAt || '').trim();
}

function compareVocabularyLessonBatchesNewestFirst(a, b) {
  if (typeof compareBatchesNewestFirst === 'function') return compareBatchesNewestFirst(a, b);
  const dateCmp = getVocabularyLessonBatchDate(b).localeCompare(getVocabularyLessonBatchDate(a));
  if (dateCmp) return dateCmp;
  return Number(b && b.id || 0) - Number(a && a.id || 0);
}

function getVocabularyLessonVisibleBatches(data, user) {
  const batches = Array.isArray(data && data.batches) ? data.batches : [];
  const role = String(user || '');
  return batches
    .filter(batch => Array.isArray(batch && batch.cards) && batch.cards.length > 0)
    .filter(batch => role === 'teacher' || (Array.isArray(batch.sharedWith) && batch.sharedWith.includes(role)))
    .slice()
    .sort(compareVocabularyLessonBatchesNewestFirst);
}

function selectVocabularyLessonBatch(data, user, preferredId) {
  const batches = getVocabularyLessonVisibleBatches(data, user);
  if (!batches.length) return null;
  const preferred = batches.find(batch => String(batch.id) === String(preferredId || ''));
  if (preferred) return preferred;
  if (typeof getTodayTaskBatch === 'function') {
    const todayBatch = getTodayTaskBatch();
    const visibleTodayBatch = todayBatch && batches.find(batch => String(batch.id) === String(todayBatch.id));
    if (visibleTodayBatch) return visibleTodayBatch;
  }
  return batches[0];
}

function chunkVocabularyLessonItems(items, size = VOCABULARY_LESSON_BATCH_SIZE) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeSize = Math.max(1, Math.trunc(Number(size)) || VOCABULARY_LESSON_BATCH_SIZE);
  const chunks = [];
  for (let index = 0; index < safeItems.length; index += safeSize) {
    chunks.push(safeItems.slice(index, index + safeSize));
  }
  return chunks;
}

function shuffleVocabularyLessonItems(items, random = Math.random) {
  const shuffled = Array.isArray(items) ? items.slice() : [];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createVocabularyLessonRandomBatch(items, remainingKeys, size = VOCABULARY_LESSON_RANDOM_SIZE, random = Math.random) {
  const source = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!source.length) return { items: [], remainingKeys: [] };
  const byKey = new Map(source.map(item => [normalizeVocabularyLessonWord(item.word), item]));
  let pool = Array.isArray(remainingKeys)
    ? remainingKeys.filter(key => byKey.has(normalizeVocabularyLessonWord(key))).map(normalizeVocabularyLessonWord)
    : [];
  if (!pool.length) pool = shuffleVocabularyLessonItems(Array.from(byKey.keys()), random);

  const targetSize = Math.min(Math.max(1, Math.trunc(Number(size)) || VOCABULARY_LESSON_RANDOM_SIZE), source.length);
  const pickedKeys = [];
  while (pickedKeys.length < targetSize) {
    if (!pool.length) {
      const refill = shuffleVocabularyLessonItems(
        Array.from(byKey.keys()).filter(key => !pickedKeys.includes(key)),
        random
      );
      if (!refill.length) break;
      pool = refill;
    }
    const next = pool.shift();
    if (!pickedKeys.includes(next)) pickedKeys.push(next);
  }

  return {
    items: pickedKeys.map(key => byKey.get(key)).filter(Boolean),
    remainingKeys: pool
  };
}

function validateVocabularyLessonRegistry(registry) {
  if (!registry || registry.schemaVersion !== 2 || !Array.isArray(registry.lessons)) {
    return { schemaVersion: 2, lessons: [] };
  }
  const lessons = registry.lessons
    .filter(lesson => lesson && typeof lesson.lessonId === 'string' && Array.isArray(lesson.items))
    .map(lesson => ({
      lessonId: lesson.lessonId,
      sourceWordbook: String(lesson.sourceWordbook || ''),
      status: String(lesson.status || ''),
      items: lesson.items.filter(item => item && VOCABULARY_LESSON_SUPPORTED_VISUAL_TYPES.includes(item.visualType))
    }));
  return { schemaVersion: 2, lessons };
}

async function loadVocabularyLessonVisualRegistry(force = false) {
  if (!force && vocabularyLessonVisualRegistryPromise) return vocabularyLessonVisualRegistryPromise;
  if (typeof fetch !== 'function') return vocabularyLessonVisualRegistry;
  vocabularyLessonVisualRegistryPromise = fetch(VOCABULARY_LESSON_VISUAL_REGISTRY_URL, { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`visual registry HTTP ${response.status}`);
      return response.json();
    })
    .then(registry => {
      vocabularyLessonVisualRegistry = validateVocabularyLessonRegistry(registry);
      return vocabularyLessonVisualRegistry;
    })
    .catch(error => {
      console.warn('Vocabulary lesson visual registry unavailable; using card emoji fallbacks.', error);
      vocabularyLessonVisualRegistry = { schemaVersion: 2, lessons: [] };
      return vocabularyLessonVisualRegistry;
    });
  return vocabularyLessonVisualRegistryPromise;
}

function findVocabularyLessonVisual(word, batch, registry = vocabularyLessonVisualRegistry) {
  const key = normalizeVocabularyLessonWord(word);
  if (!key) return null;
  const lessons = Array.isArray(registry && registry.lessons) ? registry.lessons : [];
  const batchName = String(batch && batch.name || '').trim();
  const preferred = lessons.filter(lesson => lesson.sourceWordbook && lesson.sourceWordbook === batchName);
  const ordered = [...preferred, ...lessons.filter(lesson => !preferred.includes(lesson))];
  for (const lesson of ordered) {
    const item = lesson.items.find(candidate => normalizeVocabularyLessonWord(candidate.word) === key);
    if (item) return { ...cloneVocabularyLessonValue(item), lessonId: lesson.lessonId };
  }
  return null;
}

function fallbackVocabularyLessonVisual(card) {
  const emoji = String(card && card.emoji || '').trim();
  return {
    visualType: 'emoji',
    emoji: emoji || '✨'
  };
}

function buildVocabularyLessonItem(card, batch, registry = vocabularyLessonVisualRegistry) {
  const word = getVocabularyLessonCardWord(card);
  const visual = findVocabularyLessonVisual(word, batch, registry) || fallbackVocabularyLessonVisual(card);
  const visualCollocations = normalizeVocabularyLessonLines(visual.collocations, 3);
  const cardCollocations = normalizeVocabularyLessonLines(card && card.collocations, 3);
  const collocations = visualCollocations.length ? visualCollocations : cardCollocations;
  const teacherNote = String(visual.teacherNote || (card && card.tip) || '').trim();
  const confusionNote = String(visual.confusionNote || '').trim();
  const visualType = VOCABULARY_LESSON_SUPPORTED_VISUAL_TYPES.includes(visual.visualType)
    ? visual.visualType
    : 'emoji';

  return {
    word,
    key: normalizeVocabularyLessonWord(word),
    phonetic: String(card && card.phonetic || '').trim(),
    meaning: getVocabularyLessonCardMeaning(card),
    visualType,
    image: String(visual.image || visual.mainImage || '').trim(),
    thumbnail: String(visual.thumbnail || '').trim(),
    focalPoint: String(visual.focalPoint || '50% 50%'),
    parts: Array.isArray(visual.parts) ? visual.parts.map(String).slice(0, 4) : [],
    relation: String(visual.relation || '＋'),
    concept: visual.concept && typeof visual.concept === 'object' ? cloneVocabularyLessonValue(visual.concept) : null,
    emoji: String(visual.emoji || (card && card.emoji) || '✨'),
    collocations,
    teacherNote,
    confusionNote,
    lessonId: visual.lessonId || ''
  };
}

function buildVocabularyLessonWords(batch, registry = vocabularyLessonVisualRegistry) {
  const cards = Array.isArray(batch && batch.cards) ? batch.cards : [];
  const seen = new Set();
  return cards
    .map(card => buildVocabularyLessonItem(card, batch, registry))
    .filter(item => item.word && !seen.has(item.key) && seen.add(item.key));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VOCABULARY_LESSON_SUPPORTED_VISUAL_TYPES,
    VOCABULARY_LESSON_BATCH_SIZE,
    VOCABULARY_LESSON_RANDOM_SIZE,
    normalizeVocabularyLessonWord,
    normalizeVocabularyLessonLines,
    getVocabularyLessonVisibleBatches,
    selectVocabularyLessonBatch,
    chunkVocabularyLessonItems,
    shuffleVocabularyLessonItems,
    createVocabularyLessonRandomBatch,
    validateVocabularyLessonRegistry,
    findVocabularyLessonVisual,
    buildVocabularyLessonItem,
    buildVocabularyLessonWords
  };
}

if (typeof document !== 'undefined') {
  const loadVocabularyLessonUxPatch = () => {
    if (!document.getElementById('vocabularyLessonUxPatchStyles')) {
      const link = document.createElement('link');
      link.id = 'vocabularyLessonUxPatchStyles';
      link.rel = 'stylesheet';
      link.href = 'styles-vocabulary-lesson-patch.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('vocabularyLessonUxPatchScript')) {
      const script = document.createElement('script');
      script.id = 'vocabularyLessonUxPatchScript';
      script.src = 'js/vocabularyLessonUxPatch.js';
      document.body.appendChild(script);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadVocabularyLessonUxPatch, { once: true });
  } else {
    loadVocabularyLessonUxPatch();
  }
}
