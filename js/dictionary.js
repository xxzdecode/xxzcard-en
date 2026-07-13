// DICTIONARY HELPERS
// Stores light dictionary metadata and renders only knowledge points that are enabled.

const LEARNED_KNOWLEDGE_KEYS = ['prefix-negative'];

const KNOWLEDGE_LIBRARY = {
  'prefix-negative': { label: '否定前缀', hint: 'in / un / dis 表示“不、否定”' },
  'suffix-ing-adjective': { label: 'ing 形容词', hint: 'ing 可以表示“令人……的”' },
  'past-irregular': { label: '不规则过去式', hint: '过去式不是直接加 -ed' },
  'plural-irregular': { label: '不规则复数', hint: '复数形式比较特别' }
};

// Update this list when the teacher says which phonemes have been learned.
const LEARNED_PHONEMES = [
  // 短元音
  '/ɪ/', '/e/', '/æ/', '/ʌ/', '/ɒ/', '/ʊ/', '/ə/',

  // 长元音
  '/iː/', '/ɑː/', '/ɔː/', '/uː/', '/ɜː/',

  // 双元音
  '/eɪ/', '/aɪ/', '/ɔɪ/', '/aʊ/', '/əʊ/', '/ɪə/', '/eə/', '/ʊə/',

  // 爆破音
  '/p/', '/b/', '/t/', '/d/', '/k/', '/ɡ/',

  // 摩擦音
  '/f/', '/v/', '/θ/', '/ð/', '/s/', '/z/', '/ʃ/', '/ʒ/', '/h/',

  // 破擦音
  '/tʃ/', '/dʒ/',

  // 鼻音
  '/m/', '/n/', '/ŋ/',

  // 近音
  '/l/', '/r/', '/j/', '/w/'
];

const PHONEME_GROUPS = [
  {
    title: '短元音',
    phonemes: ['/ɪ/', '/e/', '/æ/', '/ʌ/', '/ɒ/', '/ʊ/', '/ə/']
  },
  {
    title: '长元音',
    phonemes: ['/iː/', '/ɑː/', '/ɔː/', '/uː/', '/ɜː/']
  },
  {
    title: '双元音',
    phonemes: ['/eɪ/', '/aɪ/', '/ɔɪ/', '/aʊ/', '/əʊ/', '/ɪə/', '/eə/', '/ʊə/']
  },
  {
    title: '爆破音',
    phonemes: ['/p/', '/b/', '/t/', '/d/', '/k/', '/ɡ/']
  },
  {
    title: '摩擦音',
    phonemes: ['/f/', '/v/', '/θ/', '/ð/', '/s/', '/z/', '/ʃ/', '/ʒ/', '/h/']
  },
  {
    title: '破擦音',
    phonemes: ['/tʃ/', '/dʒ/']
  },
  {
    title: '鼻音',
    phonemes: ['/m/', '/n/', '/ŋ/']
  },
  {
    title: '近音',
    phonemes: ['/l/', '/r/', '/j/', '/w/']
  }
];

const PHONEME_INFO = {
  // 短元音
  '/ɪ/': { spellings: ['ui', 'y', 'i'] },
  '/e/': { spellings: ['ea', 'e'] },
  '/æ/': { spellings: ['a'] },
  '/ʌ/': { spellings: ['ou', 'u', 'o'] },
  '/ɒ/': { spellings: ['wha', 'wa', 'o'] },
  '/ʊ/': { spellings: ['oul', 'oo', 'u'] },
  '/ə/': { spellings: ['er', 'or', 'ar', 'a', 'e', 'o'] },

  // 长元音
  '/iː/': { spellings: ['eer', 'ere', 'ee', 'ea', 'ie', 'ey', 'e', 'y', 'i'] },
  '/ɑː/': { spellings: ['ar', 'a'] },
  '/ɔː/': { spellings: ['oor', 'our', 'or', 'aw', 'au', 'al'] },
  '/uː/': { spellings: ['oo', 'ue', 'ew', 'ou', 'u', 'o'] },
  '/ɜː/': { spellings: ['ear', 'eer', 'ir', 'ur', 'er'] },

  // 双元音
  '/eɪ/': { spellings: ['eigh', 'ai', 'ay', 'ey', 'a'] },
  '/aɪ/': { spellings: ['igh', 'ie', 'i', 'y'] },
  '/ɔɪ/': { spellings: ['oi', 'oy'] },
  '/aʊ/': { spellings: ['ou', 'ow'] },
  '/əʊ/': { spellings: ['oa', 'ow', 'oe', 'o'] },
  '/ɪə/': { spellings: ['ear', 'eer', 'ere', 'ea'] },
  '/eə/': { spellings: ['air', 'are', 'ear', 'ere'] },
  '/ʊə/': { spellings: ['ure', 'oor'] },

  // 辅音
  '/p/': { spellings: ['pp', 'p'] },
  '/b/': { spellings: ['bb', 'b'] },
  '/t/': { spellings: ['tt', 'ed', 't'] },
  '/d/': { spellings: ['dd', 'ed', 'd'] },
  '/k/': { spellings: ['ck', 'ch', 'qu', 'k', 'c', 'x'] },
  '/ɡ/': { spellings: ['gg', 'gu', 'g'] },
  '/f/': { spellings: ['ph', 'ff', 'f'] },
  '/v/': { spellings: ['ve', 'v', 'f'] },
  '/θ/': { spellings: ['th'] },
  '/ð/': { spellings: ['th'] },
  '/s/': { spellings: ['ss', 'ce', 'ci', 'c', 's'] },
  '/z/': { spellings: ['zz', 'se', 's', 'z'] },
  '/ʃ/': { spellings: ['sh', 'ch', 'ti', 'ci', 's'] },
  '/ʒ/': { spellings: ['s'] },
  '/h/': { spellings: ['wh', 'h'] },
  '/tʃ/': { spellings: ['ture', 'tch', 'ch'] },
  '/dʒ/': { spellings: ['dge', 'dg', 'ge', 'j', 'g'] },
  '/m/': { spellings: ['mm', 'mb', 'm'] },
  '/n/': { spellings: ['kn', 'nn', 'n'] },
  '/ŋ/': { spellings: ['ng', 'n'] },
  '/l/': { spellings: ['ll', 'le', 'l'] },
  '/r/': { spellings: ['wr', 'rr', 'r'] },
  '/j/': { spellings: ['y', 'u'] },
  '/w/': { spellings: ['wh', 'qu', 'w'] }
};

const PHONEME_INVENTORY = [
  '/iː/', '/ɪ/', '/e/', '/æ/', '/ɑː/', '/ɒ/', '/ɔː/', '/ʊ/', '/uː/', '/ʌ/', '/ɜː/', '/ə/',
  '/eɪ/', '/aɪ/', '/ɔɪ/', '/aʊ/', '/əʊ/', '/ɪə/', '/eə/', '/ʊə/',
  '/p/', '/b/', '/t/', '/d/', '/k/', '/ɡ/', '/f/', '/v/', '/θ/', '/ð/', '/s/', '/z/',
  '/ʃ/', '/ʒ/', '/tʃ/', '/dʒ/', '/h/', '/m/', '/n/', '/ŋ/', '/l/', '/r/', '/j/', '/w/'
];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function normalizeWord(value) {
  return String(value || '').toLowerCase().trim();
}

function getCardWord(card) {
  const word = String((card && card.word) || '').trim();
  return word || String((card && card.en) || '').trim();
}

function getCardMeaning(card) {
  const meaning = String((card && card.meaning) || '').trim();
  return meaning || String((card && card.zh) || '').trim();
}

function getCardKey(card) {
  return normalizeWord(getCardWord(card));
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function parseListField(value) {
  if (!value) return [];
  const parsed = parseJsonField(value, null);
  if (Array.isArray(parsed)) return parsed;
  return String(value).split(/[;；\n]/).map(x => x.trim()).filter(Boolean);
}

function parsePairsField(value) {
  if (!value) return [];
  const parsed = parseJsonField(value, null);
  if (Array.isArray(parsed)) return parsed;
  return String(value).split(/[;；\n]/).map(item => {
    const parts = item.split('|').map(x => x.trim());
    return parts[0] ? { phrase: parts[0], example: parts[1] || '' } : null;
  }).filter(Boolean);
}

function parseWordFamilyField(value) {
  if (!value) return [];
  const parsed = parseJsonField(value, null);
  if (Array.isArray(parsed)) return parsed;
  return String(value).split(/[;；\n]/).map(item => {
    const parts = item.split('|').map(x => x.trim());
    return parts[0] ? { word: parts[0], pos: parts[1] || '', meaning: parts[2] || '' } : null;
  }).filter(Boolean);
}

function normalizePhoneme(value) {
  let text = String(value || '').trim();
  if (!text) return '';
  text = text.replace(/^\/|\/$/g, '');
  text = text.replace(/:/g, 'ː');
  text = text.replace(/ɛ/g, 'e');
  text = text.replace(/ɝ/g, 'ɜː');
  text = text.replace(/ɚ/g, 'ə');
  if (text === 'oʊ' || text === 'o') text = 'əʊ';
  if (text === 'g') text = 'ɡ';
  return `/${text}/`;
}

function parsePhonemeField(value) {
  if (!value) return [];
  const parsed = parseJsonField(value, null);
  const raw = Array.isArray(parsed) ? parsed : String(value).split(/[;；,\n]/);
  return [...new Set(raw.map(normalizePhoneme).filter(Boolean))];
}

function normalizePhoneticText(value) {
  let text = String(value || '')
    .replace(/[\/\[\]\s]/g, '')
    .replace(/[ˈˌ']/g, '')
    .replace(/:/g, 'ː')
    .replace(/ɛ/g, 'e')
    .replace(/ɝ/g, 'ɜː')
    .replace(/ɚ/g, 'ə')
    .replace(/g/g, 'ɡ')
    .trim();
  text = text
    .replace(/oʊ/g, 'əʊ')
    .replace(/o/g, 'əʊ');
  return text;
}

function phonemeText(symbol) {
  return normalizePhoneme(symbol).replace(/^\/|\/$/g, '');
}

function extractPhonemesFromPhonetic(phonetic) {
  const text = normalizePhoneticText(phonetic);
  if (!text) return [];

  const candidates = [...new Set(PHONEME_INVENTORY
    .concat(LEARNED_PHONEMES)
    .map(normalizePhoneme)
    .filter(Boolean))]
    .map(symbol => ({ symbol, text: phonemeText(symbol) }))
    .filter(item => item.text)
    .sort((a, b) => b.text.length - a.text.length);

  const found = [];
  let i = 0;

  while (i < text.length) {
    const hit = candidates.find(item => text.startsWith(item.text, i));
    if (hit) {
      found.push(hit.symbol);
      i += hit.text.length;
    } else {
      i += 1;
    }
  }

  return [...new Set(found)];
}

function getCardTrainingPhonemes(card) {
  normalizeCardDictionary(card);

  const fromField = Array.isArray(card.phonemes)
    ? card.phonemes.map(normalizePhoneme).filter(Boolean)
    : [];

  const fromPhonetic = extractPhonemesFromPhonetic(card.phonetic);

  return [...new Set([...fromField, ...fromPhonetic])];
}

function parseArrayField(value) {
  return Array.isArray(value) ? value : parseJsonField(value, []);
}

function getConfiguredPhonemeLibrary() {
  const learnedSet = new Set(LEARNED_PHONEMES.map(normalizePhoneme).filter(Boolean));
  const symbols = [...new Set([...PHONEME_INVENTORY, ...learnedSet].map(normalizePhoneme).filter(Boolean))];
  return symbols.map(symbol => ({ symbol, learned: learnedSet.has(symbol) }));
}

function normalizeCardDictionary(card) {
  return normalizeEnglishCard(card);
}

function normalizeEnglishCard(card) {
  if (!card) return card;
  const word = getCardWord(card);
  const meaning = getCardMeaning(card);
  card.word = word;
  card.en = word;
  card.meaning = meaning;
  card.zh = meaning;
  card.pos = typeof card.pos === 'string' ? card.pos : '';
  card.phonetic = typeof card.phonetic === 'string' ? card.phonetic : (typeof card.ph === 'string' ? card.ph : '');
  card.emoji = typeof card.emoji === 'string' ? card.emoji : '';
  card.tip = typeof card.tip === 'string' ? card.tip : '';
  card.morphology = parseArrayField(card.morphology);
  if (!Array.isArray(card.synonyms)) card.synonyms = parseListField(card.synonyms);
  if (!Array.isArray(card.collocations)) card.collocations = parsePairsField(card.collocations);
  if (!Array.isArray(card.examples)) card.examples = parseListField(card.examples);
  card.irregularForms = parseArrayField(card.irregularForms);
  if (!Array.isArray(card.wordFamily)) card.wordFamily = parseWordFamilyField(card.wordFamily);
  if (!Array.isArray(card.phonemes)) card.phonemes = parsePhonemeField(card.phonemes);
  else card.phonemes = parsePhonemeField(card.phonemes);
  if (!Array.isArray(card.morphology)) card.morphology = [];
  if (!Array.isArray(card.irregularForms)) card.irregularForms = [];
  return card;
}

function normalizePhonemeLibrary(data) {
  if (!data) return;
  const configured = getConfiguredPhonemeLibrary();
  const existingBySymbol = new Map((Array.isArray(data.phonemeLibrary) ? data.phonemeLibrary : [])
    .map(item => {
      const symbol = normalizePhoneme(item.symbol || item.phoneme || item);
      return symbol ? [symbol, item] : null;
    })
    .filter(Boolean));
  data.phonemeLibrary = configured.map(item => ({
    ...existingBySymbol.get(item.symbol),
    symbol: item.symbol,
    learned: item.learned
  }));
}

function normalizeAllCards() {
  (appData.batches || []).forEach(batch => (batch.cards || []).forEach(normalizeCardDictionary));
}

function isKnowledgeVisible(key) {
  return !key || LEARNED_KNOWLEDGE_KEYS.includes(key);
}

function getVisibleMorphology(card) {
  normalizeCardDictionary(card);
  return (card.morphology || []).filter(item => isKnowledgeVisible(item.knowledgeKey));
}

function getHiddenMorphologyCount(card) {
  normalizeCardDictionary(card);
  return (card.morphology || []).filter(item => item.knowledgeKey && !isKnowledgeVisible(item.knowledgeKey)).length;
}

function buildWordIndex() {
  const index = new Map();
  visibleBatches().forEach(batch => {
    (batch.cards || []).forEach((card, idx) => {
      const key = getCardKey(card);
      if (key && !index.has(key)) index.set(key, { batchId: batch.id, cardIdx: idx, card });
    });
  });
  return index;
}

function findWordHit(word) {
  return buildWordIndex().get(normalizeWord(word));
}

function linkifyEnglish(text, currentWord) {
  const wordIndex = buildWordIndex();
  const re = /[A-Za-z][A-Za-z'-]*/g;
  let result = '';
  let last = 0;
  let match;
  while ((match = re.exec(String(text || ''))) !== null) {
    result += escapeHtml(String(text || '').slice(last, match.index));
    const token = match[0];
    const key = normalizeWord(token);
    const hit = wordIndex.get(key);
    if (hit && key !== normalizeWord(currentWord)) {
      result += `<span class="word-link" data-batch="${escapeHtml(hit.batchId)}" data-idx="${hit.cardIdx}">${escapeHtml(token)}</span>`;
    } else {
      result += escapeHtml(token);
    }
    last = match.index + token.length;
  }
  return result + escapeHtml(String(text || '').slice(last));
}

function renderDictionaryExampleHtml(example, currentWord) {
  const parts = String(example || '').split('/').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `<div class="example-box"><div class="example-en">${linkifyEnglish(parts.slice(0, -1).join(' / '), currentWord)}</div><div class="example-zh">${escapeHtml(parts[parts.length - 1])}</div></div>`;
  }
  return `<div class="example-box"><div class="example-en">${linkifyEnglish(example, currentWord)}</div></div>`;
}

function renderBasicMeaningHtml(card) {
  normalizeEnglishCard(card);
  const meta = [card.pos, card.phonetic].filter(Boolean);
  return `
    <section class="card-section basic-meaning">
      <div class="sec-label">释义</div>
      <div class="meaning-text">${escapeHtml(getCardMeaning(card)).replace(/\n/g,'<br>')}</div>
      ${meta.length ? `<div class="meaning-meta">${meta.map(escapeHtml).join(' · ')}</div>` : ''}
    </section>`;
}

function renderMorphologyHtml(card) {
  normalizeEnglishCard(card);
  const morphology = (card.morphology || []).slice(0, 4);
  if (!morphology.length) return '';
  let html = '<section class="card-section"><div class="sec-label">词缀 / 词尾</div><div class="morph-box"><div class="morph-word-row">';
  morphology.forEach((part, idx) => {
    if (idx > 0) html += '<span class="morph-plus">+</span>';
    html += `<span class="morph-token"><span class="morph-part">${escapeHtml(part.part || '')}</span><span class="morph-note">${escapeHtml(part.meaning || '')}</span></span>`;
  });
  html += '</div>';
  const explanation = morphology.map(x => x.explanation).filter(Boolean)[0];
  if (explanation) html += `<div class="morph-explain">${escapeHtml(explanation)}</div>`;
  html += '</div></section>';
  return html;
}

function renderSynonymLabel(item) {
  if (typeof item === 'string') return { word: item, meaning: '' };
  return { word: item.word || item.en || '', meaning: item.meaning || item.zh || '' };
}

function renderWordFamilyLabel(item) {
  if (typeof item === 'string') return { word: item, pos: '', meaning: '' };
  return { word: item.word || item.en || '', pos: item.pos || '', meaning: item.meaning || item.zh || '' };
}

function renderMoreContentHtml(card) {
  normalizeEnglishCard(card);
  const collocations = (card.collocations || []).slice(0, 4);
  const irregularForms = (card.irregularForms || []).slice(0, 4);
  const synonyms = (card.synonyms || []).slice(0, 5).map(renderSynonymLabel).filter(x => x.word);
  const wordFamily = (card.wordFamily || []).slice(0, 5).map(renderWordFamilyLabel).filter(x => x.word);
  const hasMore = collocations.length || irregularForms.length || synonyms.length || wordFamily.length || card.tip;
  if (!hasMore) return '';

  let body = '';
  if (collocations.length) {
    body += '<div class="more-section"><div class="sec-label">固定搭配</div><div class="colloc-list">';
    collocations.forEach(item => {
      body += `<div class="colloc-item"><div class="colloc-phrase">${linkifyEnglish(item.phrase || '', getCardWord(card))}</div>`;
      if (item.example) body += `<div class="colloc-example">${linkifyEnglish(item.example, getCardWord(card))}</div>`;
      body += '</div>';
    });
    body += '</div></div>';
  }
  if (irregularForms.length) {
    body += '<div class="more-section"><div class="sec-label">特殊形式</div><div class="irregular-list">';
    irregularForms.forEach(item => {
      body += `<div class="irregular-item"><span>${escapeHtml(item.label || item.type || '形式')}</span><strong>${escapeHtml(item.form || item.meaning || '')}</strong></div>`;
    });
    body += '</div></div>';
  }
  if (synonyms.length) {
    body += '<div class="more-section"><div class="sec-label">同义词</div><div class="synonym-row">';
    synonyms.forEach(item => {
      const hit = findWordHit(item.word);
      const cls = hit ? 'synonym-chip word-link' : 'synonym-chip';
      const attrs = hit ? ` data-batch="${escapeHtml(hit.batchId)}" data-idx="${hit.cardIdx}"` : '';
      body += `<span class="${cls}"${attrs}>${escapeHtml(item.word)}${item.meaning ? `<small>${escapeHtml(item.meaning)}</small>` : ''}</span>`;
    });
    body += '</div></div>';
  }
  if (wordFamily.length) {
    body += '<div class="more-section"><div class="sec-label">词族</div><div class="word-family-list">';
    wordFamily.forEach(item => {
      body += `<div class="word-family-item"><strong>${escapeHtml(item.word)}</strong>${item.pos ? `<span>${escapeHtml(item.pos)}</span>` : ''}${item.meaning ? `<em>${escapeHtml(item.meaning)}</em>` : ''}</div>`;
    });
    body += '</div></div>';
  }
  if (card.tip) {
    body += `<div class="more-section"><div class="sec-label">小知识</div><div class="tip-box"><div class="tip-text">${escapeHtml(card.tip).replace(/\n/g,'<br>')}</div></div></div>`;
  }

  return `<details class="more-details" open><summary>📚 更多内容</summary><div class="more-content">${body}</div></details>`;
}

function renderLegacyContentHtml(card) {
  normalizeEnglishCard(card);
  let html = '';
  if (card.note) {
    html += `<div class="note-box legacy-box"><div class="note-text">${escapeHtml(card.note).replace(/\n/g,'<br>')}</div></div>`;
  }
  if (card.ex) {
    html += `<div class="legacy-box"><div class="sec-label">旧例句</div>${renderDictionaryExampleHtml(card.ex, getCardWord(card))}</div>`;
  }
  return html;
}

function renderEnglishCardBackHtml(card, options) {
  normalizeEnglishCard(card);
  const opts = options || {};
  return [
    renderBasicMeaningHtml(card),
    renderMorphologyHtml(card),
    renderMoreContentHtml(card),
    opts.includeLegacy ? renderLegacyContentHtml(card) : '',
    opts.answerNote ? `<div class="review-answer-note">正确答案：${escapeHtml(getCardWord(card))} / ${escapeHtml(getCardMeaning(card))}</div>` : ''
  ].filter(Boolean).join('');
}

function renderDictionaryHtml(card) {
  normalizeCardDictionary(card);
  const synonyms = card.synonyms || [];
  const collocations = card.collocations || [];
  const examples = card.examples || [];
  const irregularForms = card.irregularForms || [];
  let html = '';

  if (synonyms.length) {
    html += '<div><div class="sec-label">同义词</div><div class="synonym-row">';
    synonyms.forEach(item => {
      const synonym = renderSynonymLabel(item);
      const hit = findWordHit(synonym.word);
      const cls = hit ? 'synonym-chip word-link' : 'synonym-chip';
      const attrs = hit ? ` data-batch="${escapeHtml(hit.batchId)}" data-idx="${hit.cardIdx}"` : '';
      html += `<span class="${cls}"${attrs}>${escapeHtml(synonym.word)}${synonym.meaning ? `<small>${escapeHtml(synonym.meaning)}</small>` : ''}</span>`;
    });
    html += '</div></div>';
  }

  if (collocations.length) {
    html += '<div><div class="sec-label">固定搭配</div><div class="colloc-list">';
    collocations.forEach(item => {
      html += `<div class="colloc-item"><div class="colloc-phrase">${linkifyEnglish(item.phrase, getCardWord(card))}</div>`;
      if (item.example) html += `<div class="colloc-example">${linkifyEnglish(item.example, getCardWord(card))}</div>`;
      html += '</div>';
    });
    html += '</div></div>';
  }

  if (examples.length) {
    html += '<div><div class="sec-label">更多例句</div><div class="extra-example-list">';
    examples.forEach(example => { html += renderDictionaryExampleHtml(example, getCardWord(card)); });
    html += '</div></div>';
  }

  if (irregularForms.length) {
    html += '<div><div class="sec-label">特殊形式</div><div class="irregular-list">';
    irregularForms.forEach(item => {
      html += `<div class="irregular-item"><span>${escapeHtml(item.label || item.type || '形式')}</span><strong>${escapeHtml(item.form || item.meaning || '')}</strong>${item.note ? `<em>${escapeHtml(item.note)}</em>` : ''}</div>`;
    });
    html += '</div></div>';
  }

  return html;
}

function findDuplicateCards(cards) {
  const seen = new Map();
  const duplicates = [];
  cards.forEach(card => {
    const key = getCardKey(card);
    if (!key) return;
    if (seen.has(key)) duplicates.push(getCardWord(card));
    else seen.set(key, true);
  });
  return [...new Set(duplicates)];
}

function doDictionarySearch(query) {
  const res = document.getElementById('searchResults');
  if (!res) return;
  const q = normalizeWord(query);
  if (!q) {
    res.style.display = 'none';
    res.innerHTML = '';
    return;
  }
  const hits = [];
  visibleBatches().forEach(batch => {
    (batch.cards || []).forEach((card, idx) => {
      normalizeCardDictionary(card);
      const haystack = [
        getCardWord(card), card.word, card.en, getCardMeaning(card), card.zh, card.meaning, card.pos, card.phonetic, card.note, card.tip, card.ex,
        ...(card.synonyms || []).map(x => typeof x === 'string' ? x : `${x.word || ''} ${x.meaning || ''}`),
        ...(card.wordFamily || []).map(x => typeof x === 'string' ? x : `${x.word || ''} ${x.meaning || ''}`),
        ...(card.collocations || []).map(x => `${x.phrase} ${x.example || ''}`),
        ...(card.examples || []),
        ...(card.irregularForms || []).map(x => `${x.label || ''} ${x.type || ''} ${x.form || ''} ${x.meaning || ''} ${x.note || ''}`),
        ...(card.phonemes || [])
      ].join(' ').toLowerCase();
      const en = getCardKey(card);
      const score = en.startsWith(q) ? 0 : en.includes(q) ? 1 : haystack.includes(q) ? 2 : 99;
      if (score < 99) hits.push({ batch, card, idx, score });
    });
  });
  hits.sort((a, b) => a.score - b.score);
  res.style.display = 'flex';
  if (!hits.length) {
    res.innerHTML = '<div class="search-empty">没有找到相关单词</div>';
    return;
  }
  res.innerHTML = hits.slice(0, 8).map(hit => `
    <button class="sr-item" onclick="openDictionaryResult('${escapeJs(hit.batch.id)}',${hit.idx})">
      <span class="sr-word">${escapeHtml(getCardWord(hit.card))}</span>
      <span class="sr-zh">${escapeHtml(getCardMeaning(hit.card))}</span>
      <span class="sr-book">${escapeHtml(hit.batch.name || '')}</span>
    </button>
  `).join('');
}

async function openDictionaryResult(batchId, cardIdx) {
  const input = document.getElementById('searchInput');
  const res = document.getElementById('searchResults');
  if (input) input.value = '';
  if (res) res.style.display = 'none';
  studyIsGlobal = false;
  studyMode = 'dictionary';
  resultContext = 'word-card-page';
  currentBatchId = String(batchId);
  currentUserRec = await loadUserBatch(currentBatchId);
  const batch = getCurrentBatch();
  if (!batch || !batch.cards[cardIdx]) return;
  studyDeck = [batch.cards[cardIdx]];
  studyCurrent = 0;
  studyFlipped = true;
  document.getElementById('modeLabel').textContent = '🔍 字典搜索';
  showScreen('screenStudy');
  renderStudyCard();
  setFlipped(true);
}

async function jumpToWordLink(batchId, cardIdx) {
  currentBatchId = String(batchId);
  currentUserRec = await loadUserBatch(currentBatchId);
  const batch = getCurrentBatch();
  if (!batch || !batch.cards[cardIdx]) return;
  studyDeck = [batch.cards[cardIdx]];
  studyCurrent = 0;
  studyFlipped = true;
  document.getElementById('modeLabel').textContent = '🔗 ' + getCardWord(batch.cards[cardIdx]);
  renderStudyCard();
  setFlipped(true);
}

function speakEnglish(text) {
  const word = String(text || '').split('/')[0].trim();
  if (!word || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function getLearnedPhonemes() {
  normalizePhonemeLibrary(appData);
  return (appData.phonemeLibrary || []).filter(item => item.learned);
}

function buildPhonemeGroups() {
  const groups = new Map(getLearnedPhonemes().map(item => [item.symbol, []]));
  visibleBatches().forEach(batch => {
    (batch.cards || []).forEach((card, cardIdx) => {
      normalizeCardDictionary(card);
      getCardTrainingPhonemes(card).forEach(symbol => {
        if (!groups.has(symbol)) return;
        groups.get(symbol).push({ card, batch, cardIdx });
      });
    });
  });
  return groups;
}

let currentPhonemeSymbol = '';

function getLearnedPhonemeSet() {
  return new Set(getLearnedPhonemes().map(item => item.symbol));
}

function setPhonemeTrainingTitle(text) {
  const title = document.getElementById('phonemeTrainingTitle');
  if (title) title.textContent = text || '音标训练';
}

function handlePhonemeBack() {
  if (currentPhonemeSymbol) {
    renderPhonemeTraining();
    return;
  }
  showScreen('screenHome');
  loadHome();
}

function getPhonemeSpellings(symbol) {
  const info = PHONEME_INFO[normalizePhoneme(symbol)];
  return info && Array.isArray(info.spellings) ? info.spellings : [];
}

function findBestSpelling(word, spellings) {
  const lower = String(word || '').toLowerCase();
  const sorted = [...spellings].sort((a, b) => b.length - a.length);
  return sorted.find(spelling => lower.includes(String(spelling).toLowerCase())) || '';
}

function groupWordsBySpelling(symbol, words) {
  const spellings = getPhonemeSpellings(symbol);
  const groups = spellings.map(spelling => ({ spelling, words: [] }));
  const other = { spelling: '其他', words: [] };

  words.forEach(item => {
    const word = getCardWord(item.card);
    const best = findBestSpelling(word, spellings);
    if (!best) {
      other.words.push({ ...item, spelling: '' });
      return;
    }

    const group = groups.find(g => g.spelling === best);
    if (group) group.words.push({ ...item, spelling: best });
  });

  groups.forEach(group => {
    const target = group.spelling.toLowerCase();
    group.words.sort((a, b) => {
      const wordA = getCardWord(a.card).toLowerCase();
      const wordB = getCardWord(b.card).toLowerCase();
      const positionDiff = wordA.indexOf(target) - wordB.indexOf(target);
      if (positionDiff) return positionDiff;
      const lengthDiff = wordA.length - wordB.length;
      if (lengthDiff) return lengthDiff;
      return wordA < wordB ? -1 : wordA > wordB ? 1 : 0;
    });
  });
  other.words.sort((a, b) => {
    const wordA = getCardWord(a.card).toLowerCase();
    const wordB = getCardWord(b.card).toLowerCase();
    return wordA < wordB ? -1 : wordA > wordB ? 1 : 0;
  });

  const filled = groups.filter(group => group.words.length);
  if (other.words.length) filled.push(other);
  return filled;
}

function renderHighlightedWord(word, spelling) {
  const raw = String(word || '');
  const target = String(spelling || '');
  if (!raw || !target) return escapeHtml(raw);

  const lower = raw.toLowerCase();
  const idx = lower.indexOf(target.toLowerCase());
  if (idx < 0) return escapeHtml(raw);

  return [
    escapeHtml(raw.slice(0, idx)),
    `<span class="phoneme-highlight">${escapeHtml(raw.slice(idx, idx + target.length))}</span>`,
    escapeHtml(raw.slice(idx + target.length))
  ].join('');
}

function renderWordCardBatchList() {
  const list = document.getElementById('wordCardBatchList');
  if (!list) return;
  const batches = getVisibleBatchesNewestFirst();
  list.innerHTML = '';
  if (!batches.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-emoji">🔒</div><p>暂无推送的单词卡<br>等老师推送后就可以查看啦</p></div>';
    return;
  }
  batches.forEach(batch => {
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.innerHTML = `
      <span class="batch-icon">📚</span>
      <div class="batch-info">
        <div class="batch-name">${escapeHtml(batch.name)}</div>
        <div class="batch-meta">${batch.cards.length} 个单词</div>
      </div>
      <span class="batch-arrow">›</span>`;
    item.addEventListener('click', () => openBatch(batch.id));
    list.appendChild(item);
  });
}

function openWordCards() {
  const input = document.getElementById('searchInput');
  const res = document.getElementById('searchResults');
  if (input) input.value = '';
  if (res) {
    res.style.display = 'none';
    res.innerHTML = '';
  }
  renderWordCardBatchList();
  showScreen('screenWordCards');
}

function renderPhonemeTraining() {
  const list = document.getElementById('phonemeList');
  if (!list) return;
  currentPhonemeSymbol = '';
  setPhonemeTrainingTitle('音标训练');

  const learnedSet = getLearnedPhonemeSet();

  const rows = PHONEME_GROUPS.map(group => {
    const phonemes = group.phonemes
      .map(normalizePhoneme)
      .filter(symbol => learnedSet.has(symbol));

    if (!phonemes.length) return '';

    return `
      <div class="phoneme-home-row">
        <div class="phoneme-home-category">${escapeHtml(group.title)}</div>
        <div class="phoneme-home-buttons">
          ${phonemes.map(symbol => `
            <button class="phoneme-home-btn" onclick="openPhonemeDetail('${escapeJs(symbol)}')">
              ${escapeHtml(symbol)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  list.innerHTML = rows || '<div class="phoneme-empty">还没有标记为已学的音标</div>';
}

function openPhonemeDetail(symbol) {
  const list = document.getElementById('phonemeList');
  if (!list) return;

  const normalizedSymbol = normalizePhoneme(symbol);
  currentPhonemeSymbol = normalizedSymbol;
  setPhonemeTrainingTitle(normalizedSymbol);

  const groups = buildPhonemeGroups();
  const words = groups.get(normalizedSymbol) || [];
  const spellingGroups = groupWordsBySpelling(normalizedSymbol, words);

  if (!spellingGroups.length) {
    list.innerHTML = `
      <div class="phoneme-detail-card">
        <div class="phoneme-detail-symbol">${escapeHtml(normalizedSymbol)}</div>
        <div class="phoneme-empty">还没有匹配到例词</div>
      </div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="phoneme-detail-card">
      <div class="phoneme-detail-symbol">${escapeHtml(normalizedSymbol)}</div>
      <div class="phoneme-detail-hint">常见拼写和我们见过的词</div>

      <div class="phoneme-spelling-table">
        ${spellingGroups.map(group => `
          <div class="phoneme-spelling-row">
            <div class="phoneme-spelling-cell">${escapeHtml(group.spelling)}</div>
            <div class="phoneme-word-chip-list">
              ${group.words.map(({ card, spelling, batch, cardIdx }) => `
                <button
                  class="phoneme-word-chip"
                  data-batch="${escapeHtml(batch.id)}"
                  data-idx="${cardIdx}"
                  onclick="speakEnglish('${escapeJs(getCardWord(card))}')"
                >
                  <span class="phoneme-word-en">${renderHighlightedWord(getCardWord(card), spelling)}</span>
                  <span class="phoneme-word-zh">${escapeHtml(getCardMeaning(card))}</span>
                  <span class="phoneme-sound">🔊</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openPhonemeTraining() {
  renderPhonemeTraining();
  showScreen('screenPhonemeTraining');
}
