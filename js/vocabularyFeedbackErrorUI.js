(function vocabularyFeedbackErrorUIModule(root, factory) {
  const api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof document !== 'undefined') root.VocabularyFeedbackErrorUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVocabularyFeedbackErrorUI(root) {
  'use strict';

  const AUTO_ADVANCE_MS = 720;
  const TEACHING_DELAY_MS = 520;
  const STYLE_ID = 'vocabularyFeedbackTeachingStyles';
  const INTERNAL_COPY = /(?:已记录为|第一次就答对|提示后答对|明天会更快|间隔保持|使用较弱|待加强|\bD\b|\bH\b|\bF\b)/i;
  const state = {
    saveWrapped: false,
    observers: new Map(),
    handled: new Set(),
    nextActions: new Map(),
    sequence: 0,
    adventureToken: 0,
    challengeToken: 0
  };

  function text(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function clone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeWord(value) {
    return text(value).split('/')[0].toLocaleLowerCase();
  }

  function slugWord(value) {
    return normalizeWord(value)
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function firstMeaning(card) {
    return text(card && (card.meaning || card.zh || card.chinese || card.definition));
  }

  function itemText(item) {
    if (typeof item === 'string') return text(item);
    if (!item || typeof item !== 'object') return '';
    return [item.phrase, item.form, item.word, item.label, item.meaning]
      .filter(Boolean)
      .map(text)
      .filter(Boolean)
      .join(' · ');
  }

  function exampleText(item) {
    if (typeof item === 'string') return text(item);
    if (!item || typeof item !== 'object') return '';
    return text(item.example || item.sentence);
  }

  function firstArrayText(value, formatter) {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    for (const item of values) {
      const result = formatter(item);
      if (result) return result;
    }
    return '';
  }

  function allCards(env) {
    const host = env || root;
    const data = host.appData;
    const cards = [];
    const seen = new Set();
    const add = card => {
      if (!card || typeof card !== 'object') return;
      const key = normalizeWord(card.word || card.term || card.english);
      if (!key || seen.has(key)) return;
      seen.add(key);
      cards.push(card);
    };
    const master = data && data.masterCards;
    if (Array.isArray(master)) master.forEach(add);
    else if (master && typeof master === 'object') Object.values(master).forEach(add);
    (Array.isArray(data && data.batches) ? data.batches : []).forEach(batch => {
      (Array.isArray(batch && batch.cards) ? batch.cards : []).forEach(add);
    });
    return cards;
  }

  function findCardByWord(word, env) {
    const key = normalizeWord(word);
    if (!key) return null;
    return allCards(env).find(card => (
      normalizeWord(card.word || card.term || card.english) === key
    )) || null;
  }

  function getLessonAssets(env) {
    const host = env || root;
    const sources = [
      host.VOCABULARY_LESSON_ASSETS,
      host.self && host.self.VOCABULARY_LESSON_ASSETS,
      root.VOCABULARY_LESSON_ASSETS
    ];
    return sources.find(Array.isArray) || [];
  }

  function formalImageForWord(word, env) {
    const slug = slugWord(word);
    if (!slug) return '';
    const matcher = new RegExp(
      '/' + escapeRegExp(slug) + '\\.(?:webp|png|jpe?g|svg)(?:\\?|$)',
      'i'
    );
    const assets = getLessonAssets(env).filter(path => (
      typeof path === 'string' && matcher.test(path)
    ));
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
    const safe = card && typeof card === 'object' ? card : {};
    const word = safe.word || safe.term || safe.english || '';
    const image = directImage(safe) || formalImageForWord(word, env);
    if (image) return { kind: 'image', value: image };
    const emoji = text(safe.emoji || safe.icon);
    if (emoji) return { kind: 'emoji', value: emoji };
    return { kind: 'placeholder', value: '◇' };
  }

  function correctAnswerText(question) {
    if (!question || typeof question !== 'object') return '';
    if (question.interaction === 'choice' || Array.isArray(question.options)) {
      const option = (Array.isArray(question.options) ? question.options : [])[Number(question.correctIndex)];
      return text(option && option.label);
    }
    if (question.interaction === 'input') return text(question.fullAnswer || question.answer);
    if (question.interaction === 'order') {
      const tokenMap = new Map(
        (Array.isArray(question.tokens) ? question.tokens : []).map(token => [token.id, token.label])
      );
      const labels = (Array.isArray(question.answer) ? question.answer : [])
        .map(id => tokenMap.get(id) || '');
      return question.questionType === 'letterOrder' ? labels.join('') : labels.join(' ');
    }
    return text(question.fullAnswer || question.answer);
  }

  function userAnswerText(question, answer) {
    if (!question || typeof question !== 'object') return text(answer);
    if (question.interaction === 'choice' || Array.isArray(question.options)) {
      const option = (Array.isArray(question.options) ? question.options : [])[Number(answer)];
      return text(option && option.label);
    }
    if (question.interaction === 'order') {
      const tokenMap = new Map(
        (Array.isArray(question.tokens) ? question.tokens : []).map(token => [token.id, token.label])
      );
      const labels = (Array.isArray(answer) ? answer : []).map(id => tokenMap.get(id) || '');
      return question.questionType === 'letterOrder' ? labels.join('') : labels.join(' ');
    }
    return text(answer);
  }

  function buildTeachingModel(card, options, env) {
    const safeCard = card && typeof card === 'object' ? card : {};
    const settings = options && typeof options === 'object' ? options : {};
    const word = text(safeCard.word || safeCard.term || safeCard.english || settings.word);
    const meaning = firstMeaning(safeCard) || text(settings.meaning);
    return {
      source: settings.source === 'challenge' ? 'challenge' : 'adventure',
      title: settings.title || (settings.source === 'challenge'
        ? '这道题的正确答案'
        : '再认识一次这个词'),
      word,
      meaning,
      phonetic: text(safeCard.phonetic || safeCard.ipa),
      pos: text(safeCard.pos || safeCard.partOfSpeech),
      correctAnswer: text(settings.correctAnswer),
      userAnswer: text(settings.userAnswer),
      collocation: firstArrayText(safeCard.collocations || safeCard.phrases, itemText),
      example: firstArrayText(safeCard.collocations, exampleText)
        || firstArrayText(safeCard.examples || safeCard.example, exampleText),
      irregular: firstArrayText(safeCard.irregularForms || safeCard.forms, itemText),
      tip: text(safeCard.tip || safeCard.memoryTip || safeCard.mnemonic),
      visual: chooseVisual({ ...safeCard, word }, env)
    };
  }

  function visualHtml(model) {
    const meaning = model.meaning
      ? `<p class="vte-visual-meaning">${escapeHtml(model.meaning)}</p>`
      : '';
    if (model.visual.kind === 'image') {
      return `<div class="vte-visual-media" data-vte-fallback="${escapeHtml(model.word)}"><img data-vte-image src="${escapeHtml(model.visual.value)}" alt="${escapeHtml(model.word)}"></div>${meaning}`;
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
      <section class="vte-visual-panel">${visualHtml(model)}</section>
      <section class="vte-info-panel">
        <header class="vte-heading">
          <div>
            <p class="vte-kicker">${escapeHtml(model.title)}</p>
            <h2 id="vteTitle">${escapeHtml(model.word || model.correctAnswer)}</h2>
            <div class="vte-meta">${model.phonetic ? `<span>${escapeHtml(model.phonetic)}</span>` : ''}${model.pos ? `<span>${escapeHtml(model.pos)}</span>` : ''}</div>
          </div>
          <button type="button" class="vte-speak" data-vte-speak aria-label="播放发音">🔊</button>
        </header>
        ${model.meaning ? `<p class="vte-meaning">${escapeHtml(model.meaning)}</p>` : ''}
        <div class="vte-answer-grid">
          <div class="vte-answer is-correct"><span class="vte-mark">✓</span><div><small>正确答案</small><strong>${escapeHtml(model.correctAnswer || model.word)}</strong></div></div>
          <div class="vte-answer is-wrong"><span class="vte-mark">×</span><div><small>刚才的答案</small><strong>${escapeHtml(model.userAnswer || '未完成')}</strong></div></div>
        </div>
        <div class="vte-teaching-points">${model.collocation ? `<p><strong>固定搭配</strong><span>${escapeHtml(model.collocation)}</span></p>` : ''}${model.example ? `<p><strong>例句</strong><span>${escapeHtml(model.example)}</span></p>` : ''}</div>
        ${optional ? `<details class="vte-more"><summary>再看一点</summary>${optional}</details>` : ''}
        <button type="button" class="vte-next" data-vte-action="${escapeHtml(actionKey)}">下一题</button>
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
    const settings = options || {};
    const actionKey = `${settings.source || 'adventure'}-${++state.sequence}`;
    const model = buildTeachingModel(card, settings, root);
    state.nextActions.set(actionKey, createOneShot(() => {
      state.nextActions.delete(actionKey);
      if (typeof settings.onNext === 'function') settings.onNext();
    }));
    container.innerHTML = renderTeachingHtml(model, actionKey);
    container.dataset.mode = 'error-teaching';

    container.querySelector('[data-vte-speak]')?.addEventListener('click', () => speak(model.word));
    const nextButton = container.querySelector('[data-vte-action]');
    nextButton?.addEventListener('click', () => advance(actionKey, nextButton));
    container.querySelector('[data-vte-image]')?.addEventListener(
      'error',
      event => handleImageError(event.currentTarget),
      { once: true }
    );
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
    if (!image || !image.parentElement) return;
    const holder = image.parentElement;
    const card = findCardByWord(holder.dataset.vteFallback || '', root);
    const emoji = text(card && card.emoji);
    holder.className = `vte-visual-media ${emoji ? 'is-emoji' : 'is-placeholder'}`;
    holder.innerHTML = emoji ? escapeHtml(emoji) : '<span>◇</span><small>WORD</small>';
  }

  function speak(word) {
    if (!word) return;
    if (typeof root.speakEnglish === 'function') root.speakEnglish(word);
    else if (typeof root.speakWord === 'function') root.speakWord(word);
  }

  function selectedChoiceIndex(snapshot) {
    if (!snapshot || !root.document) return null;
    const host = root.document.createElement('div');
    host.innerHTML = snapshot;
    const buttons = [...host.querySelectorAll('.vocabulary-adventure-options button')];
    const selected = buttons.findIndex(button => button.classList.contains('is-selected'));
    if (selected >= 0) return selected;
    const wrong = buttons.findIndex(button => button.classList.contains('is-wrong'));
    if (wrong >= 0) return wrong;
    const correct = buttons.findIndex(button => button.classList.contains('is-correct'));
    return correct >= 0 ? correct : null;
  }

  function matchingQuestionContext(candidate, item) {
    return candidate && candidate.question
      && normalizeWord(candidate.question.wordKey) === normalizeWord(item.wordKey)
      ? candidate
      : null;
  }

  function extractSavedResult(nextState, context) {
    const source = nextState && typeof nextState === 'object' ? nextState : {};
    const settings = context && typeof context === 'object' ? context : {};
    const challenge = source.challengeSession;
    if (challenge && Array.isArray(challenge.items) && Number(challenge.cursor) > 0) {
      const item = challenge.items[Number(challenge.cursor) - 1];
      if (item && item.status === 'answered') {
        const question = clone(item.question) || {};
        return {
          mode: 'challenge',
          fingerprint: `challenge|${challenge.date}|${challenge.attemptIndex}|${challenge.cursor}`,
          wordKey: item.wordKey,
          question,
          answer: clone(item.userAnswer),
          correct: item.correct === true,
          correctAnswer: correctAnswerText(question),
          userAnswer: userAnswerText(question, item.userAnswer),
          completed: challenge.status === 'completed',
          snapshot: settings.snapshot || ''
        };
      }
    }

    const session = source.session;
    if (!session || !Array.isArray(session.plan) || Number(session.cursor) <= 0) return null;
    const item = session.plan[Number(session.cursor) - 1];
    if (!item || item.status !== 'completed') return null;

    const result = item.result
      || (source.words && source.words[item.wordKey] && source.words[item.wordKey].lastResult)
      || '';
    const grade = matchingQuestionContext(settings.gradeContext, item);
    const displayed = matchingQuestionContext(settings.questionContext, item);
    const questionSource = item.phase === 'screening'
      ? ((displayed && displayed.question) || (grade && grade.question))
      : ((grade && grade.question) || (displayed && displayed.question));
    const question = clone(questionSource || {});
    const inferred = settings.selectedAnswer != null
      ? settings.selectedAnswer
      : selectedChoiceIndex(settings.snapshot);
    const answer = grade && item.phase !== 'screening' ? clone(grade.answer) : inferred;
    return {
      mode: 'adventure',
      fingerprint: `adventure|${session.date}|${session.cursor}|${item.wordKey}|${result}`,
      wordKey: item.wordKey,
      question,
      answer,
      result,
      correct: result !== 'F',
      correctAnswer: correctAnswerText(question),
      userAnswer: userAnswerText(question, answer),
      completed: session.completed === true,
      snapshot: settings.snapshot || ''
    };
  }

  function feedbackElements(mode) {
    const challenge = mode === 'challenge';
    return {
      body: root.document.getElementById(
        challenge ? 'vocabularyAdventureChallengeBody' : 'vocabularyAdventureBody'
      ),
      text: root.document.getElementById(
        challenge ? 'vocabularyAdventureChallengeFeedbackText' : 'vocabularyAdventureFeedbackText'
      ),
      action: root.document.getElementById(
        challenge ? 'vocabularyAdventureChallengeAction' : 'vocabularyAdventureAction'
      )
    };
  }

  function setFeedback(mode, message, tone) {
    const elements = feedbackElements(mode);
    if (elements.text) {
      elements.text.textContent = message || '';
      elements.text.dataset.tone = tone || '';
    }
    if (elements.action) {
      elements.action.hidden = true;
      elements.action.onclick = null;
    }
  }

  function decorateQuestion(body, detail) {
    if (!body) return;
    const question = detail.question || {};
    const interaction = question.interaction || (Array.isArray(question.options) ? 'choice' : '');
    body.querySelectorAll('button,input').forEach(control => { control.disabled = true; });

    if (interaction === 'choice') {
      const buttons = [...body.querySelectorAll('.vocabulary-adventure-options button')];
      const selectedIndex = Number(detail.answer);
      buttons.forEach((button, index) => {
        button.classList.remove('is-selected', 'is-correct', 'is-wrong');
        if (index === Number(question.correctIndex)) button.classList.add('is-correct');
        if (!detail.correct && index === selectedIndex && index !== Number(question.correctIndex)) {
          button.classList.add('is-wrong');
        }
      });
    } else if (interaction === 'input') {
      body.querySelectorAll('input').forEach(input => {
        input.classList.add(detail.correct ? 'vte-answer-correct' : 'vte-answer-wrong');
      });
    } else if (interaction === 'order') {
      body.querySelectorAll('.vocabulary-adventure-order-answer').forEach(node => {
        node.classList.add(detail.correct ? 'vte-answer-correct' : 'vte-answer-wrong');
      });
    }
    body.dataset.mode = 'question-feedback';
    root.VocabularyPracticeUI?.syncOptionStates?.(body);
  }

  function restoreQuestion(detail) {
    const elements = feedbackElements(detail.mode);
    if (!elements.body || !detail.snapshot) return elements.body;
    elements.body.innerHTML = detail.snapshot;
    decorateQuestion(elements.body, detail);
    return elements.body;
  }

  function applyCorrect(detail) {
    restoreQuestion(detail);
    setFeedback(detail.mode, '✓ 回答正确', 'direct');
    const tokenName = detail.mode === 'challenge' ? 'challengeToken' : 'adventureToken';
    const token = ++state[tokenName];
    root.setTimeout(() => {
      if (token !== state[tokenName]) return;
      if (detail.mode === 'challenge') root.nextVocabularyAdventureChallenge?.();
      else root.nextVocabularyAdventure?.();
    }, AUTO_ADVANCE_MS);
  }

  function applyWrong(detail) {
    const body = restoreQuestion(detail);
    setFeedback(detail.mode, '× 回答错误，看看正确答案', 'failed');
    const tokenName = detail.mode === 'challenge' ? 'challengeToken' : 'adventureToken';
    const token = ++state[tokenName];
    root.setTimeout(() => {
      if (token !== state[tokenName] || !body || !body.isConnected) return;
      const card = findCardByWord(detail.wordKey, root) || {
        word: detail.wordKey,
        meaning: ''
      };
      mount(body, card, {
        source: detail.mode,
        title: detail.mode === 'challenge'
          ? '这道题的正确答案'
          : '再认识一次这个词',
        correctAnswer: detail.correctAnswer || text(card.word),
        userAnswer: detail.userAnswer,
        onNext: () => {
          if (detail.mode === 'challenge') root.nextVocabularyAdventureChallenge?.();
          else root.nextVocabularyAdventure?.();
        }
      });
      setFeedback(detail.mode, '', '');
    }, TEACHING_DELAY_MS);
  }

  function applySavedResult(detail) {
    if (!detail || state.handled.has(detail.fingerprint)) return;
    state.handled.add(detail.fingerprint);
    root.setTimeout(() => {
      if (detail.correct) applyCorrect(detail);
      else applyWrong(detail);
    }, 0);
  }

  function selectedAnswerForMode(isChallenge) {
    const selection = root.__vocabularyPracticeLastSelection;
    if (!selection) return null;
    const expected = isChallenge ? 'challenge' : 'adventure';
    return selection.mode === expected ? selection.index : null;
  }

  function wrapSaveFunction() {
    if (state.saveWrapped || typeof root.saveCurrentVocabularyAdventureState !== 'function') return;
    const original = root.saveCurrentVocabularyAdventureState;
    if (original.__vteWrapped) {
      state.saveWrapped = true;
      return;
    }

    const wrapped = async function saveCurrentVocabularyAdventureStateWithFeedback(nextState, ...args) {
      const isChallenge = !!(
        nextState && nextState.challengeSession && Number(nextState.challengeSession.cursor) > 0
      );
      const body = root.document.getElementById(
        isChallenge ? 'vocabularyAdventureChallengeBody' : 'vocabularyAdventureBody'
      );
      const detail = extractSavedResult(nextState, {
        snapshot: body ? body.innerHTML : '',
        selectedAnswer: selectedAnswerForMode(isChallenge),
        gradeContext: clone(root.__vocabularyFeedbackGradeContext),
        questionContext: clone(root.__vocabularyFeedbackQuestionContext)
      });
      const saved = await original.call(this, nextState, ...args);
      if (saved !== false && detail) applySavedResult(detail);
      return saved;
    };
    wrapped.__vteWrapped = true;
    wrapped.__vteOriginal = original;
    root.saveCurrentVocabularyAdventureState = wrapped;
    try { saveCurrentVocabularyAdventureState = wrapped; } catch (_) {}
    state.saveWrapped = true;
  }

  function sanitizeAdventureBody() {
    const body = root.document.getElementById('vocabularyAdventureBody');
    if (!body) return;
    const summary = body.querySelector('.vocabulary-adventure-summary');
    if (summary && summary.querySelector('.vocabulary-adventure-summary-grid')) {
      summary.innerHTML = '<div class="vocabulary-adventure-terminal-icon">✅</div><h2>今天的词汇探险完成了</h2><p>今天的学习记录已经保存。</p>';
    }
    const feedback = root.document.getElementById('vocabularyAdventureFeedbackText');
    if (feedback && INTERNAL_COPY.test(feedback.textContent || '')) {
      feedback.textContent = '继续完成今天的词汇探险';
      feedback.dataset.tone = '';
    }
  }

  function observeBody(id) {
    const body = root.document.getElementById(id);
    if (!body || state.observers.has(id) || typeof root.MutationObserver !== 'function') return;
    const observer = new root.MutationObserver(() => {
      if (id === 'vocabularyAdventureBody') sanitizeAdventureBody();
    });
    observer.observe(body, { childList: true, subtree: true, characterData: true });
    state.observers.set(id, observer);
  }

  function installStyles() {
    if (!root.document || root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .vte-answer-correct{background:#e5f6e9!important;border:2px solid #8dcba0!important;color:#276746!important}
      .vte-answer-wrong{background:#fff0ed!important;border:2px solid #e4a49b!important;color:#a84646!important}
      .vte-shell{width:100%;height:100%;min-height:0;display:grid;grid-template-columns:minmax(280px,43%) minmax(0,57%);gap:clamp(14px,2vw,26px);padding:clamp(14px,2vw,24px);border-radius:26px;background:#fffdf9;color:#514b50;box-shadow:0 16px 40px rgba(104,83,92,.12);overflow:hidden}
      .vte-visual-panel{min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;border-radius:22px;background:linear-gradient(145deg,#f2f8ee,#fff4e8)}
      .vte-visual-media{width:100%;height:min(42dvh,340px);min-height:180px;display:grid;place-items:center;border-radius:20px;overflow:hidden;background:#edf5ea}
      .vte-visual-media img{width:100%;height:100%;object-fit:cover;display:block}
      .vte-visual-media.is-emoji{font-size:clamp(74px,12vw,148px);background:linear-gradient(145deg,#e7f5eb,#fff3df)}
      .vte-visual-media.is-placeholder{gap:2px;color:#8aa899;background:repeating-linear-gradient(135deg,#edf5ef,#edf5ef 18px,#e7f0ea 18px,#e7f0ea 36px)}
      .vte-visual-media.is-placeholder span{font-size:86px;line-height:1}
      .vte-visual-media.is-placeholder small{font-weight:900;letter-spacing:.24em}
      .vte-visual-meaning{margin:0;font-size:clamp(16px,1.7vw,22px);font-weight:800;text-align:center;color:#637064}
      .vte-info-panel{min-width:0;min-height:0;display:flex;flex-direction:column;gap:12px;padding:4px 4px 2px;overflow:auto}
      .vte-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .vte-kicker{margin:0;color:#5d9174;font-weight:900;font-size:clamp(15px,1.5vw,20px)}
      .vte-heading h2{margin:2px 0 0;font-size:clamp(32px,4.4vw,58px);line-height:1;color:#423c42;overflow-wrap:anywhere}
      .vte-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .vte-meta span{padding:4px 10px;border-radius:999px;background:#f0eee8;font-weight:700;color:#706a70}
      .vte-speak{width:54px;height:54px;min-width:54px;border-radius:50%;border:0;background:#dff1e5;font-size:24px;cursor:pointer}
      .vte-meaning{margin:0;font-size:clamp(18px,2vw,26px);font-weight:800}
      .vte-answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .vte-answer{min-width:0;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;border:2px solid}
      .vte-answer.is-correct{background:#e7f7eb;border-color:#8dcea1;color:#286848}
      .vte-answer.is-wrong{background:#fff0ed;border-color:#e2a19a;color:#a44848}
      .vte-mark{font-size:30px;font-weight:1000}
      .vte-answer small{display:block;font-weight:700;opacity:.74}
      .vte-answer strong{display:block;font-size:clamp(16px,1.8vw,23px);overflow-wrap:anywhere}
      .vte-teaching-points{display:grid;gap:8px}
      .vte-teaching-points p,.vte-more p{margin:0;padding:10px 12px;border-radius:14px;background:#f8f5ef;display:grid;grid-template-columns:minmax(76px,auto) 1fr;gap:10px}
      .vte-teaching-points strong,.vte-more strong{color:#5d765f}
      .vte-teaching-points span,.vte-more span{overflow-wrap:anywhere}
      .vte-more{border:1px solid #e6ded4;border-radius:14px;padding:8px 10px}
      .vte-more summary{cursor:pointer;font-weight:800}
      .vte-next{margin-top:auto;align-self:flex-end;min-width:170px;min-height:54px;padding:10px 26px;border:0;border-radius:999px;background:#98c9a8;color:#fff;font-size:19px;font-weight:900;box-shadow:0 8px 18px rgba(80,135,96,.22);cursor:pointer}
      .vte-next:disabled{opacity:.55;cursor:default}
      @media (max-width:700px){.vte-shell{height:auto;min-height:100%;grid-template-columns:1fr;overflow:auto}.vte-visual-media{height:240px;min-height:180px}.vte-answer-grid{grid-template-columns:1fr}.vte-next{width:100%;align-self:stretch}.vte-info-panel{overflow:visible}}
      @media (orientation:landscape) and (max-height:560px){.vte-shell{padding:10px;gap:10px;border-radius:18px}.vte-visual-media{height:calc(100dvh - 170px);min-height:150px}.vte-info-panel{gap:7px}.vte-heading h2{font-size:34px}.vte-answer{padding:8px 10px}.vte-teaching-points p{padding:7px 9px}.vte-next{min-height:46px}}
    `;
    root.document.head.appendChild(style);
  }

  function install() {
    if (!root.document) return;
    installStyles();
    wrapSaveFunction();
    observeBody('vocabularyAdventureBody');
    observeBody('vocabularyAdventureChallengeBody');
    sanitizeAdventureBody();
  }

  function afterFeatureGroup() {
    install();
    wrapSaveFunction();
  }

  return Object.freeze({
    AUTO_ADVANCE_MS,
    TEACHING_DELAY_MS,
    escapeHtml,
    normalizeWord,
    slugWord,
    chooseVisual,
    correctAnswerText,
    userAnswerText,
    buildTeachingModel,
    renderTeachingHtml,
    createOneShot,
    extractSavedResult,
    mount,
    advance,
    handleImageError,
    speak,
    install,
    afterFeatureGroup
  });
});
