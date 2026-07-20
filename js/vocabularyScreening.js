// Student-only one-pass vocabulary screening.
// Results are stored separately per student and batch, then derived into:
// 1) a cumulative known-word library, and 2) a student-visible wordbook of wrong answers.

let vocabularyScreeningBatch = null;
let vocabularyScreeningRecord = null;
let vocabularyScreeningOptions = [];
let vocabularyScreeningLocked = false;

function normalizeVocabularyScreeningWord(value) {
  return String(value || '').trim().toLocaleLowerCase('en');
}

function getVocabularyScreeningBatch(batchId) {
  return VOCABULARY_SCREENING_BATCHES.find(batch => batch.id === batchId) || null;
}

function vocabularyScreeningRecordKey(student, batchId) {
  return `vocabulary_screening_${student}_${batchId}`;
}

function vocabularyKnownLibraryKey(student) {
  return `vocabulary_known_${student}`;
}

function shuffledVocabularyScreeningWords(words, random = Math.random) {
  const result = [...words];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function makeVocabularyScreeningRecord(batch, student, now = new Date(), random = Math.random) {
  return {
    schemaVersion: 1,
    batchId: batch.id,
    title: batch.title,
    student,
    startedAt: now.toISOString(),
    completedAt: '',
    questionOrder: shuffledVocabularyScreeningWords(
      batch.words.map(item => normalizeVocabularyScreeningWord(item.word)),
      random
    ),
    answers: {},
    knownWords: [],
    unknownWords: [],
    wordbookId: '',
    wordbookName: '',
    derivedAt: ''
  };
}

function normalizeVocabularyScreeningRecord(record, batch, student) {
  if (!record || typeof record !== 'object' || record.batchId !== batch.id || record.student !== student) {
    return null;
  }
  if (!Array.isArray(record.questionOrder) || record.questionOrder.length !== batch.words.length) return null;
  if (!record.answers || typeof record.answers !== 'object' || Array.isArray(record.answers)) record.answers = {};
  if (!Array.isArray(record.knownWords)) record.knownWords = [];
  if (!Array.isArray(record.unknownWords)) record.unknownWords = [];
  ['completedAt', 'wordbookId', 'wordbookName', 'derivedAt'].forEach(field => {
    if (typeof record[field] !== 'string') record[field] = '';
  });
  return record;
}

function getVocabularyScreeningWord(batch, word) {
  const key = normalizeVocabularyScreeningWord(word);
  return batch.words.find(item => normalizeVocabularyScreeningWord(item.word) === key) || null;
}

function nextVocabularyScreeningWord(record) {
  return record.questionOrder.find(word => !Object.prototype.hasOwnProperty.call(record.answers, word)) || '';
}

function answerVocabularyScreeningRecord(record, batch, word, selectedMeaning, now = new Date()) {
  if (record.completedAt) return false;
  const item = getVocabularyScreeningWord(batch, word);
  const key = normalizeVocabularyScreeningWord(word);
  if (!item || Object.prototype.hasOwnProperty.call(record.answers, key)) return false;
  const correct = String(selectedMeaning) === String(item.meaning);
  record.answers[key] = {
    selectedMeaning: String(selectedMeaning),
    correct,
    answeredAt: now.toISOString()
  };
  record.knownWords = record.questionOrder.filter(candidate => record.answers[candidate]?.correct === true);
  record.unknownWords = record.questionOrder.filter(candidate => record.answers[candidate]?.correct === false);
  if (Object.keys(record.answers).length === record.questionOrder.length) record.completedAt = now.toISOString();
  return correct;
}

function makeVocabularyMeaningOptions(item, allItems, count = 4, random = Math.random) {
  const meanings = [];
  const seen = new Set([item.meaning]);
  shuffledVocabularyScreeningWords(allItems, random).forEach(candidate => {
    const meaning = String(candidate.meaning || '').trim();
    if (!meaning || seen.has(meaning) || meanings.length >= count - 1) return;
    seen.add(meaning);
    meanings.push(meaning);
  });
  if (meanings.length !== count - 1) return [];
  return shuffledVocabularyScreeningWords([item.meaning, ...meanings], random);
}

function vocabularyScreeningDateParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { iso: `${year}-${month}-${day}`, monthDay: `${month}.${day}` };
}

function makeVocabularyScreeningCard(item) {
  return {
    word: item.word,
    meaning: item.meaning,
    pos: item.pos || '',
    phonetic: item.phonetic || '',
    emoji: '📝',
    morphology: [],
    collocations: [],
    irregularForms: [],
    synonyms: [],
    wordFamily: [],
    tip: ''
  };
}

function makeVocabularyScreeningWordbook(batch, record) {
  if (!record.completedAt || record.unknownWords.length === 0) return null;
  const date = vocabularyScreeningDateParts(record.completedAt);
  const cards = record.unknownWords
    .map(word => getVocabularyScreeningWord(batch, word))
    .filter(Boolean)
    .map(makeVocabularyScreeningCard);
  return {
    id: `screening-${batch.id}-${record.student}`,
    date: date.iso,
    name: `${date.monthDay}｜${batch.title}`,
    cards,
    sharedWith: [record.student],
    screening: {
      schemaVersion: 1,
      sourceBatchId: batch.id,
      student: record.student,
      completedAt: record.completedAt
    }
  };
}

function mergeVocabularyKnownLibrary(existing, batch, record, now = new Date()) {
  const library = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? JSON.parse(JSON.stringify(existing))
    : { schemaVersion: 1, student: record.student, words: [], updatedAt: '' };
  if (!Array.isArray(library.words)) library.words = [];
  const existingWords = new Set(library.words.map(item => normalizeVocabularyScreeningWord(item.word)));
  record.knownWords.forEach(word => {
    const item = getVocabularyScreeningWord(batch, word);
    if (!item || existingWords.has(word)) return;
    library.words.push({
      word: item.word,
      meaning: item.meaning,
      pos: item.pos || '',
      firstKnownAt: record.completedAt,
      sourceBatchId: batch.id
    });
    existingWords.add(word);
  });
  library.schemaVersion = 1;
  library.student = record.student;
  library.updatedAt = now.toISOString();
  return library;
}

async function saveVocabularyScreeningRecord(record) {
  try {
    if (!canWriteCloudData()) return false;
    await sbSet(vocabularyScreeningRecordKey(record.student, record.batchId), record);
    return true;
  } catch (error) {
    showStorageError(error);
    return false;
  }
}

async function appendVocabularyScreeningWordbook(wordbook) {
  const fresh = await sbGetRemote('main');
  if (!fresh || !Array.isArray(fresh.batches)) {
    throw storageError('MAIN_CONFLICT', 'main is unavailable');
  }
  normalizeAppData(fresh);

  const existing = fresh.batches.find(item => String(item.id) === wordbook.id);
  if (existing) {
    appData = fresh;
    setMainSnapshot(appData);
    return true;
  }

  const nextData = cloneForStorage(fresh);
  nextData.batches.push(wordbook);
  setMainSnapshot(fresh);
  if (!await saveData(nextData)) return false;
  appData = nextData;
  return true;
}

async function deriveVocabularyScreeningLibraries(batch, record) {
  if (!record.completedAt) return false;
  try {
    const knownKey = vocabularyKnownLibraryKey(record.student);
    const knownLibrary = mergeVocabularyKnownLibrary(await sbGet(knownKey), batch, record);
    await sbSet(knownKey, knownLibrary);

    const wordbook = makeVocabularyScreeningWordbook(batch, record);
    if (wordbook) {
      if (!await appendVocabularyScreeningWordbook(wordbook)) return false;
      record.wordbookId = wordbook.id;
      record.wordbookName = wordbook.name;
    } else {
      record.wordbookId = 'none';
      record.wordbookName = '';
    }
    record.derivedAt = new Date().toISOString();
    return await saveVocabularyScreeningRecord(record);
  } catch (error) {
    showStorageError(error);
    return false;
  }
}

function resetVocabularyScreeningRuntime() {
  vocabularyScreeningBatch = null;
  vocabularyScreeningRecord = null;
  vocabularyScreeningOptions = [];
  vocabularyScreeningLocked = false;
}

async function openVocabularyScreening() {
  if (isTeacher()) return;
  resetVocabularyScreeningRuntime();
  showScreen('screenVocabularyScreening');
  await renderVocabularyScreeningBatchList();
}

async function renderVocabularyScreeningBatchList() {
  const list = document.getElementById('vocabularyScreeningBatchList');
  const player = document.getElementById('vocabularyScreeningPlayer');
  const summary = document.getElementById('vocabularyScreeningSummary');
  if (!list || !player || !summary) return;
  player.hidden = true;
  summary.hidden = true;
  list.hidden = false;
  list.innerHTML = '<div class="vocabulary-screening-loading">正在读取检测记录……</div>';
  const rows = await Promise.all(VOCABULARY_SCREENING_BATCHES.map(async batch => ({
    batch,
    record: normalizeVocabularyScreeningRecord(
      await sbGet(vocabularyScreeningRecordKey(currentUser, batch.id)), batch, currentUser
    )
  })));
  list.innerHTML = rows.map(({ batch, record }) => {
    const answered = record ? Object.keys(record.answers).length : 0;
    const state = record?.completedAt ? '已完成' : answered ? `继续 ${answered}/${batch.words.length}` : `${batch.words.length} 词`;
    return `<button class="vocabulary-screening-batch" onclick="startVocabularyScreening('${escapeJs(batch.id)}')">
      <span><strong>${escapeHtml(batch.title)}</strong><small>每批只检测一次，自动保存进度</small></span>
      <em>${state} ›</em>
    </button>`;
  }).join('');
}

async function startVocabularyScreening(batchId) {
  if (isTeacher() || !canWriteCloudData()) return;
  const batch = getVocabularyScreeningBatch(batchId);
  if (!batch) return;
  vocabularyScreeningBatch = batch;
  let record = normalizeVocabularyScreeningRecord(
    await sbGet(vocabularyScreeningRecordKey(currentUser, batch.id)), batch, currentUser
  );
  if (!record) {
    record = makeVocabularyScreeningRecord(batch, currentUser);
    if (!await saveVocabularyScreeningRecord(record)) return;
  }
  vocabularyScreeningRecord = record;
  document.getElementById('vocabularyScreeningBatchList').hidden = true;
  if (record.completedAt) {
    if (!record.derivedAt) await deriveVocabularyScreeningLibraries(batch, record);
    renderVocabularyScreeningResult();
    return;
  }
  document.getElementById('vocabularyScreeningSummary').hidden = true;
  document.getElementById('vocabularyScreeningPlayer').hidden = false;
  renderVocabularyScreeningQuestion();
}

function renderVocabularyScreeningQuestion() {
  if (!vocabularyScreeningBatch || !vocabularyScreeningRecord) return;
  const word = nextVocabularyScreeningWord(vocabularyScreeningRecord);
  if (!word) {
    renderVocabularyScreeningResult();
    return;
  }
  const item = getVocabularyScreeningWord(vocabularyScreeningBatch, word);
  vocabularyScreeningOptions = makeVocabularyMeaningOptions(item, vocabularyScreeningBatch.words);
  vocabularyScreeningLocked = false;
  const answered = Object.keys(vocabularyScreeningRecord.answers).length;
  const total = vocabularyScreeningBatch.words.length;
  document.getElementById('vocabularyScreeningTitle').textContent = vocabularyScreeningBatch.title;
  document.getElementById('vocabularyScreeningProgressText').textContent = `${answered + 1} / ${total}`;
  document.getElementById('vocabularyScreeningProgressFill').style.width = `${(answered / total) * 100}%`;
  document.getElementById('vocabularyScreeningWord').textContent = item.word;
  document.getElementById('vocabularyScreeningFeedback').textContent = '';
  document.getElementById('vocabularyScreeningOptions').innerHTML = vocabularyScreeningOptions.map((meaning, index) => (
    `<button type="button" onclick="answerVocabularyScreening(${index})">${escapeHtml(meaning)}</button>`
  )).join('');
}

async function answerVocabularyScreening(optionIndex) {
  if (vocabularyScreeningLocked || !vocabularyScreeningRecord || !vocabularyScreeningBatch) return;
  const selected = vocabularyScreeningOptions[optionIndex];
  const word = nextVocabularyScreeningWord(vocabularyScreeningRecord);
  if (selected === undefined || !word) return;
  vocabularyScreeningLocked = true;
  const before = cloneForStorage(vocabularyScreeningRecord);
  const correct = answerVocabularyScreeningRecord(
    vocabularyScreeningRecord, vocabularyScreeningBatch, word, selected
  );
  const item = getVocabularyScreeningWord(vocabularyScreeningBatch, word);
  const buttons = [...document.querySelectorAll('#vocabularyScreeningOptions button')];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (vocabularyScreeningOptions[index] === item.meaning) button.classList.add('correct');
    else if (index === optionIndex) button.classList.add('wrong');
  });
  document.getElementById('vocabularyScreeningFeedback').textContent = correct
    ? '答对了，已加入已知词库。'
    : `已记录为生词。正确意思：${item.meaning}`;
  if (!await saveVocabularyScreeningRecord(vocabularyScreeningRecord)) {
    vocabularyScreeningRecord = before;
    renderVocabularyScreeningQuestion();
    return;
  }
  if (vocabularyScreeningRecord.completedAt) {
    await deriveVocabularyScreeningLibraries(vocabularyScreeningBatch, vocabularyScreeningRecord);
    renderVocabularyScreeningResult();
    return;
  }
  setTimeout(renderVocabularyScreeningQuestion, 750);
}

function renderVocabularyScreeningResult() {
  if (!vocabularyScreeningRecord || !vocabularyScreeningBatch) return;
  document.getElementById('vocabularyScreeningPlayer').hidden = true;
  const summary = document.getElementById('vocabularyScreeningSummary');
  summary.hidden = false;
  const derived = !!vocabularyScreeningRecord.derivedAt;
  const unknownCount = vocabularyScreeningRecord.unknownWords.length;
  summary.innerHTML = `
    <div class="vocabulary-screening-result-icon">${derived ? '✅' : '⏳'}</div>
    <h2>${escapeHtml(vocabularyScreeningBatch.title)}检测完成</h2>
    <div class="vocabulary-screening-result-counts">
      <span><strong>${vocabularyScreeningRecord.knownWords.length}</strong>认识</span>
      <span><strong>${unknownCount}</strong>不认识</span>
    </div>
    <p>${derived
      ? (unknownCount ? `生词本已生成：${escapeHtml(vocabularyScreeningRecord.wordbookName)}` : '这批词全部认识，没有生成生词本。')
      : '检测结果已保存，词库整理尚未完成。联网后可重试。'}</p>
    ${derived ? '' : '<button class="primary-btn" onclick="retryVocabularyScreeningDerivation()">重新整理词库</button>'}
    <button class="secondary-btn" onclick="closeVocabularyScreening()">返回首页</button>`;
}

async function retryVocabularyScreeningDerivation() {
  if (!vocabularyScreeningRecord || !vocabularyScreeningBatch) return;
  await deriveVocabularyScreeningLibraries(vocabularyScreeningBatch, vocabularyScreeningRecord);
  renderVocabularyScreeningResult();
}

function closeVocabularyScreening() {
  resetVocabularyScreeningRuntime();
  showScreen('screenHome');
  loadHome();
}
