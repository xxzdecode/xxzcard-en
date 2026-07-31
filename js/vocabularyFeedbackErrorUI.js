(function vocabularyFeedbackErrorUIModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') {
    root.VocabularyErrorTeaching = api;
    api.install();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyFeedbackErrorUI(root) {
  'use strict';

  const AUTO_ADVANCE_MS = 720;
  const CHILD_INTERNAL_COPY = /(?:\b[DHＦF]\b|已记录为|第一次就答对|提示后答对|明天会更快|间隔保持|使用较弱|待加强)/i;
  const state = {
    installed: false,
    observer: null,
    timer: null,
    nextActions: new Map(),
    sequence: 0,
    challengeAdvanceToken: 0,
    adventureAdvanceToken: 0,
    pendingChallengeWrong: null
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeWord(value) {
    return String(value || '').split('/')[0].trim().toLocaleLowerCase();
  }

  function slugWord(value) {
    return normalizeWord(value)
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function firstMeaning(card) {
    return String(card && (card.meaning || card.zh || card.chinese || card.definition) || '').trim();
  }

  function itemText(item) {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return '';
    return [item.phrase, item.form, item.word, item.label, item.meaning]
      .filter(Boolean)
      .map(value => String(value).trim())
      .filter(Boolean)
      .join(' · ');
  }

  function exampleText(item) {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return '';
    return String(item.example || item.sentence || '').trim();
  }

  function firstArrayText(value, formatter) {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    for (const item of values) {
      const text = formatter(item);
      if (text) return text;
    }
    return '';
  }

  function getLessonAssets(env) {
    const candidates = [
      env && env.VOCABULARY_LESSON_ASSETS,
      env && env.self && env.self.VOCABULARY_LESSON_ASSETS,
      root && root.VOCABULARY_LESSON_ASSETS
    ];
    return candidates.find(Array.isArray) || [];
  }

  function formalImageForWord(word, env) {
    const slug = slugWord(word);
    if (!slug) return '';
    const matcher = new RegExp('/' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.(?:webp|png|jpe?g|svg)(?:\\?|$)', 'i');
    const assets = getLessonAssets(env).filter(path => typeof path === 'string' && matcher.test(path));
    return assets.find(path => !/-thumb\./i.test(path)) || assets[0] || '';
  }

  function directImage(card) {
    if (!card || typeof card !== 'object') return '';
    return [
      card.image,
      card.imageUrl,
      card.imageURL,
      card.imagePath,
      card.visualImage,
      card.lessonImage,
      card.picture,
      card.photo
    ].find(value => typeof value === 'string' && value.trim()) || '';
  }

  function chooseVisual(card, env) {
    const safeCard = card && typeof card === 'object' ? card : {};
    const word = safeCard.word || safeCard.term || safeCard.english || '';
    const image = directImage(safeCard) || formalImageForWord(word, env);
    if (image) return { kind: 'image', value: image };
    const emoji = String(safeCard.emoji || safeCard.icon || '').trim();
    if (emoji) return { kind: 'emoji', value: emoji };
    return { kind: 'placeholder', value: '◇' };
  }

  function buildTeachingModel(card, options, env) {
    const safeCard = card && typeof card === 'object' ? card : {};
    const word = String(safeCard.word || safeCard.term || safeCard.english || options.word || '').trim();
    const meaning = firstMeaning(safeCard) || String(options.meaning || '').trim();
    const collocation = firstArrayText(safeCard.collocations || safeCard.phrases, itemText);
    const example = firstArrayText(safeCard.collocations, exampleText)
      || firstArrayText(safeCard.examples || safeCard.example, exampleText);
    const irregular = firstArrayText(safeCard.irregularForms || safeCard.forms, itemText);
    const tip = String(safeCard.tip || safeCard.memoryTip || safeCard.mnemonic || '').trim();
    return {
      source: options.source === 'challenge' ? 'challenge' : 'adventure',
      title: options.title || (options.source === 'challenge' ? '这道题的正确答案' : '再认识一次这个词'),
      word,
      meaning,
      phonetic: String(safeCard.phonetic || safeCard.ipa || '').trim(),
      pos: String(safeCard.pos || safeCard.partOfSpeech || '').trim(),
      correctAnswer: String(options.correctAnswer == null ? '' : options.correctAnswer).trim(),
      userAnswer: String(options.userAnswer == null ? '' : options.userAnswer).trim(),
      collocation,
      example,
      irregular,
      tip,
      visual: chooseVisual({ ...safeCard, word }, env)
    };
  }

  function visualHtml(model) {
    const meaning = model.meaning ? `<p class="vte-visual-meaning">${escapeHtml(model.meaning)}</p>` : '';
    if (model.visual.kind === 'image') {
      return `<div class="vte-visual-media" data-vte-fallback="${escapeHtml(model.word)}">
        <img src="${escapeHtml(model.visual.value)}" alt="${escapeHtml(model.word)}" onerror="VocabularyErrorTeaching.handleImageError(this)">
      </div>${meaning}`;
    }
    if (model.visual.kind === 'emoji') {
      return `<div class="vte-visual-media is-emoji" aria-label="${escapeHtml(model.word)}">${escapeHtml(model.visual.value)}</div>${meaning}`;
    }
    return `<div class="vte-visual-media is-placeholder" aria-label="暂无图片"><span>◇</span><small>WORD</small></div>${meaning}`;
  }

  function renderTeachingHtml(model, actionKey) {
    const optional = [
      model.irregular ? `<p><strong>词形变化</strong><span>${escapeHtml(model.irregular)}</span></p>` : '',
      model.tip ? `<p><strong>记忆提示</strong><span>${escapeHtml(model.tip)}</span></p>` : ''
    ].filter(Boolean).join('');
    return `<article class="vte-shell vte-shell--${escapeHtml(model.source)}" aria-labelledby="vteTitle">
      <section class="vte-visual-panel">
        ${visualHtml(model)}
      </section>
      <section class="vte-info-panel">
        <header class="vte-heading">
          <div>
            <p class="vte-kicker">${escapeHtml(model.title)}</p>
            <h2 id="vteTitle">${escapeHtml(model.word || model.correctAnswer)}</h2>
            <div class="vte-meta">
              ${model.phonetic ? `<span>${escapeHtml(model.phonetic)}</span>` : ''}
              ${model.pos ? `<span>${escapeHtml(model.pos)}</span>` : ''}
            </div>
          </div>
          <button type="button" class="vte-speak" onclick="VocabularyErrorTeaching.speak('${escapeHtml(model.word)}')" aria-label="播放发音">🔊</button>
        </header>
        ${model.meaning ? `<p class="vte-meaning">${escapeHtml(model.meaning)}</p>` : ''}
        <div class="vte-answer-grid">
          <div class="vte-answer is-correct"><span class="vte-mark">✓</span><div><small>正确答案</small><strong>${escapeHtml(model.correctAnswer || model.word)}</strong></div></div>
          <div class="vte-answer is-wrong"><span class="vte-mark">×</span><div><small>刚才的答案</small><strong>${escapeHtml(model.userAnswer || '未完成')}</strong></div></div>
        </div>
        <div class="vte-teaching-points">
          ${model.collocation ? `<p><strong>固定搭配</strong><span>${escapeHtml(model.collocation)}</span></p>` : ''}
          ${model.example ? `<p><strong>例句</strong><span>${escapeHtml(model.example)}</span></p>` : ''}
        </div>
        ${optional ? `<details class="vte-more"><summary>再看一点</summary>${optional}</details>` : ''}
        <button type="button" class="vte-next" data-vte-action="${escapeHtml(actionKey)}" onclick="VocabularyErrorTeaching.advance('${escapeHtml(actionKey)}', this)">下一题</button>
      </section>
    </article>`;
  }

  function createOneShot(callback) {
    let used = false;
    return function runOnce() {
      if (used) return false;
      used = true;
      callback();
      return true;
    };
  }

  function mount(container, card, options) {
    if (!container) return null;
    const actionKey = `${options.source || 'adventure'}-${++state.sequence}`;
    const model = buildTeachingModel(card, options || {}, root);
    state.nextActions.set(actionKey, createOneShot(() => {
      state.nextActions.delete(actionKey);
      if (typeof options.onNext === 'function') options.onNext();
    }));
    container.innerHTML = renderTeachingHtml(model, actionKey);
    if (container.dataset) container.dataset.mode = 'error-teaching';
    return model;
  }

  function advance(actionKey, button) {
    const action = state.nextActions.get(actionKey);
    if (!action) return false;
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    return action();
  }

  function handleImageError(image) {
    if (!image) return;
    const holder = image.parentElement;
    if (!holder) return;
    const word = holder.dataset.vteFallback || '';
    const card = findCardByWord(word);
    const emoji = String(card && card.emoji || '').trim();
    holder.className = `vte-visual-media ${emoji ? 'is-emoji' : 'is-placeholder'}`;
    holder.innerHTML = emoji ? escapeHtml(emoji) : '<span>◇</span><small>WORD</small>';
  }

  function speak(word) {
    if (!word) return;
    if (typeof root.speakEnglish === 'function') root.speakEnglish(word);
    else if (typeof root.speakWord === 'function') root.speakWord(word);
  }

  function allCards() {
    const cards = [];
    const seen = new Set();
    const add = card => {
      if (!card || typeof card !== 'object') return;
      const word = card.word || card.term || card.english;
      const key = normalizeWord(word);
      if (!key || seen.has(card)) return;
      seen.add(card);
      cards.push(card);
    };
    const data = root.appData;
    const master = data && data.masterCards;
    if (Array.isArray(master)) master.forEach(add);
    else if (master && typeof master === 'object') Object.values(master).forEach(add);
    (Array.isArray(data && data.batches) ? data.batches : []).forEach(batch => {
      (Array.isArray(batch && batch.cards) ? batch.cards : []).forEach(add);
    });
    return cards;
  }

  function findCardByWord(word) {
    const key = normalizeWord(word);
    if (!key) return null;
    return allCards().find(card => normalizeWord(card.word || card.term || card.english) === key) || null;
  }

  function parseAdventureResultCard(body) {
    if (!body) return null;
    const wordNode = body.querySelector('.vocabulary-adventure-full-card h2');
    if (wordNode) return findCardByWord(wordNode.textContent) || {
      word: wordNode.textContent,
      meaning: body.querySelector('.vocabulary-adventure-card-heading p')?.textContent || '',
      phonetic: body.querySelector('.vocabulary-adventure-card-heading small')?.textContent || '',
      emoji: body.querySelector('.vocabulary-adventure-card-emoji')?.textContent || ''
    };
    const summary = body.querySelector('.vocabulary-adventure-result p')?.textContent || '';
    const parts = summary.split('·').map(part => part.trim());
    return findCardByWord(parts[0]) || { word: parts[0] || '', meaning: parts.slice(1).join(' · ') };
  }

  function setAdventureFeedback(message, tone) {
    const feedback = document.getElementById('vocabularyAdventureFeedbackText');
    const action = document.getElementById('vocabularyAdventureAction');
    if (feedback) {
      feedback.textContent = message;
      feedback.dataset.tone = tone || '';
    }
    if (action) {
      action.hidden = true;
      action.onclick = null;
    }
  }

  function decorateAdventureSnapshot(body, snapshot, card, selectedText, correct) {
    if (!body) return;
    body.innerHTML = snapshot;
    body.dataset.mode = 'question-feedback';
    const buttons = [...body.querySelectorAll('.vocabulary-adventure-options button')];
    buttons.forEach(button => {
      button.disabled = true;
      const label = button.textContent.trim();
      if (label === selectedText && !correct) button.classList.add('is-wrong');
      if (card && [card.word, firstMeaning(card)].map(String).map(value => value.trim()).includes(label)) {
        button.classList.add('is-correct');
      }
    });
    const input = body.querySelector('.vocabulary-adventure-input-row input');
    if (input) input.classList.add(correct ? 'vte-answer-correct' : 'vte-answer-wrong');
    const answer = body.querySelector('.vocabulary-adventure-order-answer, .review-answer-box');
    if (answer) answer.classList.add(correct ? 'vte-answer-correct' : 'vte-answer-wrong');
  }

  function scheduleAdventureNext() {
    const token = ++state.adventureAdvanceToken;
    root.setTimeout(() => {
      if (token !== state.adventureAdvanceToken) return;
      if (typeof root.nextVocabularyAdventure === 'function') root.nextVocabularyAdventure();
    }, AUTO_ADVANCE_MS);
  }

  function selectedAdventureText(selector, index) {
    const buttons = [...document.querySelectorAll(selector)];
    return buttons[Number(index)]?.textContent?.trim() || '';
  }

  function adventureUserAnswer(kind, args) {
    if (kind === 'screening') return selectedAdventureText('#vocabularyAdventureOptions button', args[0]);
    if (kind === 'choice') return selectedAdventureText('#vocabularyAdventureReviewOptions button', args[0]);
    if (kind === 'input') return document.getElementById('vocabularyAdventureReviewInput')?.value?.trim() || '';
    if (kind === 'order') {
      return [...document.querySelectorAll('.vocabulary-adventure-order-answer span')].map(node => node.textContent.trim()).join(' ');
    }
    if (kind === 'match') return '配对未完成';
    return '';
  }

  function inferCorrectChoice(snapshot, card) {
    if (!snapshot || !card) return card && card.word || '';
    const host = document.createElement('div');
    host.innerHTML = snapshot;
    const labels = [...host.querySelectorAll('.vocabulary-adventure-options button')].map(button => button.textContent.trim());
    const choices = [String(card.word || '').trim(), firstMeaning(card)].filter(Boolean);
    return choices.find(choice => labels.includes(choice)) || choices[0] || '';
  }

  function finishAdventureHook(kind, snapshot, userAnswer) {
    const body = document.getElementById('vocabularyAdventureBody');
    const result = body && body.querySelector('.vocabulary-adventure-result');
    if (!result) {
      const hint = body && body.querySelector('.vocabulary-adventure-hint:not([hidden])');
      if (hint) setAdventureFeedback('× 这次不对，看看提示，再试一次', 'failed');
      return;
    }
    const card = parseAdventureResultCard(body) || {};
    if (result.classList.contains('is-failed')) {
      mount(body, card, {
        source: 'adventure',
        title: '再认识一次这个词',
        correctAnswer: kind === 'screening' || kind === 'choice' ? inferCorrectChoice(snapshot, card) : card.word,
        userAnswer,
        onNext: () => root.nextVocabularyAdventure?.()
      });
      setAdventureFeedback('', '');
      return;
    }
    decorateAdventureSnapshot(body, snapshot, card, userAnswer, true);
    setAdventureFeedback('✓ 回答正确', 'direct');
    scheduleAdventureNext();
  }

  function wrapAdventureFunction(name, kind) {
    const original = root[name];
    if (typeof original !== 'function' || original.__vteWrapped) return;
    const wrapped = async function wrappedAdventureFunction(...args) {
      const body = document.getElementById('vocabularyAdventureBody');
      const userAnswer = adventureUserAnswer(kind, args);
      const pending = original.apply(this, args);
      const snapshot = body ? body.innerHTML : '';
      const value = await Promise.resolve(pending);
      finishAdventureHook(kind, snapshot, userAnswer);
      return value;
    };
    wrapped.__vteWrapped = true;
    wrapped.__vteOriginal = original;
    root[name] = wrapped;
  }

  function installAdventureHooks() {
    wrapAdventureFunction('answerVocabularyAdventure', 'screening');
    wrapAdventureFunction('answerVocabularyAdventureReviewChoice', 'choice');
    wrapAdventureFunction('submitVocabularyAdventureReviewInput', 'input');
    wrapAdventureFunction('submitVocabularyAdventureReviewOrder', 'order');
    wrapAdventureFunction('selectVocabularyAdventureMatchCard', 'match');
  }

  function challengeUserAnswer(q) {
    const selected = document.querySelector('.dq-opt.selected, .dq-opt.wrong-ans');
    if (selected) return selected.textContent.trim();
    const slots = [...document.querySelectorAll('.letter-slot')].map(node => node.textContent.trim()).join('');
    if (slots) return slots;
    const answerBox = document.getElementById('dqOrderAnswer');
    if (answerBox) return answerBox.textContent.trim().replace(/\s+/g, ' ');
    return q && q.picked || '';
  }

  function challengeCorrectAnswer(q) {
    return String(q && q.answer || '').trim();
  }

  function showChallengeSaveFailure(q, userAnswer, error) {
    const wrap = document.getElementById('dqWrap');
    if (!wrap) return;
    wrap.innerHTML = `<div class="vte-save-error"><strong>答题结果尚未保存</strong><p>${escapeHtml(error && error.message || '请检查网络后重试。')}</p><button type="button" onclick="VocabularyErrorTeaching.retryChallengeWrong()">重新保存</button></div>`;
    state.pendingChallengeWrong = { q, userAnswer };
  }

  function showChallengeError(q, userAnswer) {
    const wrap = document.getElementById('dqWrap');
    if (!wrap) return;
    mount(wrap, q.card || {}, {
      source: 'challenge',
      title: '这道题的正确答案',
      correctAnswer: challengeCorrectAnswer(q),
      userAnswer,
      onNext: () => root.nextDQ?.()
    });
  }

  async function persistChallengeWrong(q, userAnswer) {
    try {
      const result = typeof root.markCardUnknown === 'function' ? root.markCardUnknown(q.card) : true;
      const saved = await Promise.resolve(result);
      if (saved === false) throw new Error('保存失败，当前题不会前进。');
      showChallengeError(q, userAnswer);
    } catch (error) {
      showChallengeSaveFailure(q, userAnswer, error);
    }
  }

  function retryChallengeWrong() {
    const pending = state.pendingChallengeWrong;
    if (!pending) return;
    state.pendingChallengeWrong = null;
    persistChallengeWrong(pending.q, pending.userAnswer);
  }

  function scheduleChallengeNext() {
    const token = ++state.challengeAdvanceToken;
    root.setTimeout(() => {
      if (token !== state.challengeAdvanceToken) return;
      if (typeof root.nextDQ === 'function') root.nextDQ();
    }, AUTO_ADVANCE_MS);
  }

  function installChallengeHook() {
    const current = root.applyQuestionResult;
    if (typeof current !== 'function' || current.__vteWrapped) return;
    const wrapped = function applyTeachingQuestionResult(q, correct) {
      const confirm = document.getElementById('dqConfirmBtn');
      const next = document.getElementById('dqNextBtn');
      const feedback = document.getElementById('dqFeedback');
      if (confirm) confirm.style.display = 'none';
      if (next) next.style.display = 'none';
      if (correct) {
        if (typeof dqCorrect !== 'undefined') dqCorrect += 1;
        if (feedback) {
          feedback.className = 'dq-feedback correct-fb';
          feedback.textContent = '✓ 回答正确';
        }
        document.querySelectorAll('#dqOrderAnswer, .letter-slots').forEach(node => node.classList.add('vte-answer-correct'));
        scheduleChallengeNext();
        return;
      }
      const userAnswer = challengeUserAnswer(q);
      if (typeof dqWrongList !== 'undefined') dqWrongList.push(q.card);
      if (feedback) feedback.textContent = '';
      persistChallengeWrong(q, userAnswer);
    };
    wrapped.__vteWrapped = true;
    wrapped.__vteOriginal = current;
    root.applyQuestionResult = wrapped;
  }

  function sanitizeChildFacingText() {
    const body = document.getElementById('vocabularyAdventureBody');
    if (body) {
      const summary = body.querySelector('.vocabulary-adventure-summary');
      if (summary && summary.querySelector('.vocabulary-adventure-summary-grid')) {
        summary.innerHTML = '<div class="vocabulary-adventure-terminal-icon">✅</div><h2>今天的词汇探险完成了</h2><p>今天的学习记录已经保存。</p>';
      }
      body.querySelectorAll('h2, p, span, strong, small').forEach(node => {
        if (!CHILD_INTERNAL_COPY.test(node.textContent || '')) return;
        if (node.closest('.vte-shell')) return;
        if (/基础意义确认/.test(node.textContent || '')) node.textContent = '再确认一次这个词的意思';
      });
    }
    const feedback = document.getElementById('vocabularyAdventureFeedbackText');
    if (feedback && CHILD_INTERNAL_COPY.test(feedback.textContent || '')) {
      feedback.textContent = '继续完成今天的词汇探险';
      feedback.dataset.tone = '';
    }
  }

  function injectStyles() {
    if (document.getElementById('vocabularyFeedbackErrorUIStyles')) return;
    const style = document.createElement('style');
    style.id = 'vocabularyFeedbackErrorUIStyles';
    style.textContent = `
      .vocabulary-adventure-options button.is-correct::after,.dq-opt.correct-ans::after{content:'✓';margin-left:.55em;font-weight:900;color:#267a52}
      .vocabulary-adventure-options button.is-wrong::after,.dq-opt.wrong-ans::after{content:'×';margin-left:.55em;font-weight:900;color:#b84b4b}
      .vte-answer-correct{background:#e5f6e9!important;border:2px solid #8dcba0!important;color:#276746!important}
      .vte-answer-wrong{background:#fff0ed!important;border:2px solid #e4a49b!important;color:#a84646!important}
      .vte-shell{width:100%;height:100%;min-height:0;display:grid;grid-template-columns:minmax(280px,43%) minmax(0,57%);gap:clamp(14px,2vw,26px);padding:clamp(14px,2vw,24px);border-radius:26px;background:#fffdf9;color:#514b50;box-shadow:0 16px 40px rgba(104,83,92,.12);overflow:hidden}
      .vte-visual-panel{min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;border-radius:22px;background:linear-gradient(145deg,#f2f8ee,#fff4e8)}
      .vte-visual-media{width:100%;height:min(42dvh,340px);min-height:180px;display:grid;place-items:center;border-radius:20px;overflow:hidden;background:#edf5ea}
      .vte-visual-media img{width:100%;height:100%;object-fit:cover;display:block}
      .vte-visual-media.is-emoji{font-size:clamp(74px,12vw,148px);background:linear-gradient(145deg,#e7f5eb,#fff3df)}
      .vte-visual-media.is-placeholder{gap:2px;color:#8aa899;background:repeating-linear-gradient(135deg,#edf5ef,#edf5ef 18px,#e7f0ea 18px,#e7f0ea 36px)}
      .vte-visual-media.is-placeholder span{font-size:86px;line-height:1}.vte-visual-media.is-placeholder small{font-weight:900;letter-spacing:.24em}
      .vte-visual-meaning{margin:0;font-size:clamp(16px,1.7vw,22px);font-weight:800;text-align:center;color:#637064}
      .vte-info-panel{min-width:0;min-height:0;display:flex;flex-direction:column;gap:12px;padding:4px 4px 2px;overflow:auto}
      .vte-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.vte-kicker{margin:0;color:#5d9174;font-weight:900;font-size:clamp(15px,1.5vw,20px)}
      .vte-heading h2{margin:2px 0 0;font-size:clamp(32px,4.4vw,58px);line-height:1;color:#423c42;overflow-wrap:anywhere}.vte-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.vte-meta span{padding:4px 10px;border-radius:999px;background:#f0eee8;font-weight:700;color:#706a70}
      .vte-speak{width:54px;height:54px;min-width:54px;border-radius:50%;border:0;background:#dff1e5;font-size:24px;cursor:pointer}.vte-meaning{margin:0;font-size:clamp(18px,2vw,26px);font-weight:800}
      .vte-answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vte-answer{min-width:0;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;border:2px solid}.vte-answer.is-correct{background:#e7f7eb;border-color:#8dcea1;color:#286848}.vte-answer.is-wrong{background:#fff0ed;border-color:#e2a19a;color:#a44848}.vte-mark{font-size:30px;font-weight:1000}.vte-answer small{display:block;font-weight:700;opacity:.74}.vte-answer strong{display:block;font-size:clamp(16px,1.8vw,23px);overflow-wrap:anywhere}
      .vte-teaching-points{display:grid;gap:8px}.vte-teaching-points p,.vte-more p{margin:0;padding:10px 12px;border-radius:14px;background:#f8f5ef;display:grid;grid-template-columns:minmax(76px,auto) 1fr;gap:10px}.vte-teaching-points strong,.vte-more strong{color:#5d765f}.vte-teaching-points span,.vte-more span{overflow-wrap:anywhere}.vte-more{border:1px solid #e6ded4;border-radius:14px;padding:8px 10px}.vte-more summary{cursor:pointer;font-weight:800}
      .vte-next{margin-top:auto;align-self:flex-end;min-width:170px;min-height:54px;padding:10px 26px;border:0;border-radius:999px;background:#98c9a8;color:#fff;font-size:19px;font-weight:900;box-shadow:0 8px 18px rgba(80,135,96,.22);cursor:pointer}.vte-next:disabled{opacity:.55;cursor:default}
      .vte-save-error{margin:auto;max-width:560px;padding:28px;border-radius:22px;background:#fffdf9;border:2px solid #e6b1a8;text-align:center}.vte-save-error strong{font-size:24px}.vte-save-error button{min-height:48px;padding:8px 22px;border:0;border-radius:999px;background:#98c9a8;color:white;font-weight:900}
      @media (max-width:700px){.vte-shell{height:auto;min-height:100%;grid-template-columns:1fr;overflow:auto}.vte-visual-media{height:240px;min-height:180px}.vte-answer-grid{grid-template-columns:1fr}.vte-next{width:100%;align-self:stretch}.vte-info-panel{overflow:visible}}
      @media (orientation:landscape) and (max-height:560px){.vte-shell{padding:10px;gap:10px;border-radius:18px}.vte-visual-media{height:calc(100dvh - 170px);min-height:150px}.vte-info-panel{gap:7px}.vte-heading h2{font-size:34px}.vte-answer{padding:8px 10px}.vte-teaching-points p{padding:7px 9px}.vte-next{min-height:46px}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    if (typeof document === 'undefined') return;
    injectStyles();
    installAdventureHooks();
    installChallengeHook();
    sanitizeChildFacingText();
    if (!state.observer) {
      state.observer = new MutationObserver(() => {
        installAdventureHooks();
        installChallengeHook();
        sanitizeChildFacingText();
      });
      state.observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }
    if (!state.timer) {
      state.timer = root.setInterval(() => {
        installAdventureHooks();
        installChallengeHook();
      }, 500);
    }
    state.installed = true;
  }

  return {
    escapeHtml,
    normalizeWord,
    slugWord,
    chooseVisual,
    buildTeachingModel,
    renderTeachingHtml,
    createOneShot,
    mount,
    advance,
    handleImageError,
    speak,
    retryChallengeWrong,
    install
  };
});
