(function createGrammarChallengeShell() {
  'use strict';

  const elements = {};
  const screenIds = ['loadingScreen', 'challengeScreen', 'reviewScreen', 'resultScreen', 'errorScreen'];
  let practice = null;
  let state = createFreshState();

  function byId(id) {
    return document.getElementById(id);
  }

  function createFreshState() {
    return { currentIndex: 0, answers: {}, flaggedIds: new Set(), submitted: false };
  }

  function showScreen(id) {
    screenIds.forEach(screenId => {
      const screen = byId(screenId);
      if (screen) screen.hidden = screenId !== id;
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function sortedCatalog() {
    const catalog = Array.isArray(window.GRAMMAR_CHALLENGE_CATALOG)
      ? window.GRAMMAR_CHALLENGE_CATALOG
      : [];
    return [...catalog].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function requestedPractice() {
    const catalog = sortedCatalog();
    const requestedId = new URLSearchParams(window.location.search).get('practice');
    if (requestedId) return catalog.find(item => item.id === requestedId) || null;
    return catalog[0] || null;
  }

  function loadPracticeScript(entry) {
    return new Promise((resolve, reject) => {
      if (!entry || !entry.dataPath) {
        reject(new Error('目录中缺少练习数据路径。'));
        return;
      }
      delete window.GRAMMAR_CHALLENGE_PRACTICE;
      const script = document.createElement('script');
      script.src = entry.dataPath;
      script.onload = () => resolve(window.GRAMMAR_CHALLENGE_PRACTICE);
      script.onerror = () => reject(new Error('练习数据文件加载失败。'));
      document.head.appendChild(script);
    });
  }

  function validatePractice(value, entry) {
    if (!value || typeof value !== 'object') throw new Error('练习数据格式不正确。');
    if (value.id !== entry.id) throw new Error('练习 ID 与目录登记不一致。');
    if (!Array.isArray(value.questions) || value.questions.length === 0) throw new Error('这份练习没有题目。');
    const ids = new Set();
    value.questions.forEach(question => {
      if (!question.id || ids.has(question.id)) throw new Error('题目 ID 缺失或重复。');
      ids.add(question.id);
      if (!['choice', 'order', 'text'].includes(question.type)) throw new Error(`不支持的题型：${question.type}`);
    });
    return value;
  }

  function currentQuestion() {
    return practice.questions[state.currentIndex];
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('en')
      .replace(/[’‘]/g, "'")
      .replace(/[\p{P}\p{S}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function equalStringArrays(first, second, ignoreOrder) {
    if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return false;
    const left = first.map(normalizeText);
    const right = second.map(normalizeText);
    if (ignoreOrder) {
      left.sort();
      right.sort();
    }
    return left.every((value, index) => value === right[index]);
  }

  function isAnswered(question) {
    const answer = state.answers[question.id];
    if (question.type === 'choice' || question.type === 'order') return Array.isArray(answer) && answer.length > 0;
    if (question.type === 'text') {
      return question.fields.every((field, index) => normalizeText(answer && answer[index]));
    }
    return false;
  }

  function isCorrect(question) {
    const answer = state.answers[question.id];
    if (question.type === 'choice') {
      return equalStringArrays(answer, question.correctAnswer, question.mode === 'multiple');
    }
    if (question.type === 'order') return equalStringArrays(answer, question.correctAnswer, false);
    if (question.type === 'text') {
      return question.fields.every((field, index) => {
        const normalized = normalizeText(answer && answer[index]);
        return field.acceptedAnswers.some(accepted => normalizeText(accepted) === normalized);
      });
    }
    return false;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function updateAnswer(questionId, value) {
    state.answers[questionId] = value;
    renderDots(elements.questionDots, true, false);
  }

  function renderChoice(host, question) {
    const options = createElement('div', 'options');
    const selectedAnswers = Array.isArray(state.answers[question.id]) ? state.answers[question.id] : [];
    question.options.forEach((option, index) => {
      const selected = selectedAnswers.includes(option);
      const button = createElement('button', `option${selected ? ' selected' : ''}`);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(selected));
      const mark = createElement('span', 'choice-mark', question.mode === 'multiple' ? (selected ? '✓' : '□') : String.fromCharCode(65 + index));
      const text = createElement('span', '', option);
      button.append(mark, text);
      button.addEventListener('click', () => {
        if (question.mode === 'multiple') {
          const next = [...selectedAnswers];
          const selectedIndex = next.indexOf(option);
          if (selectedIndex >= 0) next.splice(selectedIndex, 1);
          else next.push(option);
          updateAnswer(question.id, next);
        } else {
          updateAnswer(question.id, [option]);
        }
        renderQuestion();
      });
      options.appendChild(button);
    });
    host.appendChild(options);
  }

  function renderOrder(host, question) {
    const selected = Array.isArray(state.answers[question.id]) ? state.answers[question.id] : [];
    const board = createElement('div', 'sort-board');
    const answerLabel = createElement('div', 'sort-label', '答题区');
    const answerLane = createElement('div', 'answer-lane');
    if (selected.length === 0) answerLane.appendChild(createElement('span', 'empty-lane', '点击下方词块开始排序'));
    selected.forEach((token, index) => {
      const button = createElement('button', 'word-token', token);
      button.type = 'button';
      button.title = '点一下移回词块库';
      button.addEventListener('click', () => {
        const next = [...selected];
        next.splice(index, 1);
        updateAnswer(question.id, next);
        renderQuestion();
      });
      answerLane.appendChild(button);
    });
    const tools = createElement('div', 'sort-tools');
    const clearButton = createElement('button', 'tiny-button', '清空重排');
    clearButton.type = 'button';
    clearButton.addEventListener('click', () => {
      updateAnswer(question.id, []);
      renderQuestion();
    });
    tools.appendChild(clearButton);
    const bankLabel = createElement('div', 'sort-label', '词块库');
    const bank = createElement('div', 'token-bank');
    const remaining = [...question.tokens];
    selected.forEach(token => {
      const index = remaining.indexOf(token);
      if (index >= 0) remaining.splice(index, 1);
    });
    remaining.forEach(token => {
      const button = createElement('button', 'word-token', token);
      button.type = 'button';
      button.addEventListener('click', () => {
        updateAnswer(question.id, [...selected, token]);
        renderQuestion();
      });
      bank.appendChild(button);
    });
    board.append(answerLabel, answerLane, tools, bankLabel, bank);
    host.appendChild(board);
  }

  function renderTextFields(host, question) {
    const fields = createElement('div', 'input-fields');
    const values = state.answers[question.id] || {};
    question.fields.forEach((field, index) => {
      const wrapper = createElement('label', 'input-field');
      wrapper.appendChild(createElement('span', 'field-label', field.label));
      const input = createElement('textarea', 'answer-input');
      input.rows = 2;
      input.autocomplete = 'off';
      input.autocapitalize = 'sentences';
      input.spellcheck = true;
      input.placeholder = field.placeholder || '输入答案';
      input.value = values[index] || '';
      input.addEventListener('input', () => {
        state.answers[question.id] = { ...(state.answers[question.id] || {}), [index]: input.value };
        renderDots(elements.questionDots, true, false);
      });
      wrapper.appendChild(input);
      fields.appendChild(wrapper);
    });
    host.appendChild(fields);
  }

  function renderQuestion() {
    const question = currentQuestion();
    const total = practice.questions.length;
    elements.sectionName.textContent = question.section;
    elements.questionCount.textContent = `第 ${state.currentIndex + 1} / ${total} 题`;
    elements.questionPosition.textContent = `${state.currentIndex + 1}/${total}`;
    elements.progressFill.style.width = `${((state.currentIndex + 1) / total) * 100}%`;
    elements.previousButton.disabled = state.currentIndex === 0;
    elements.nextButton.textContent = state.currentIndex === total - 1 ? '提交检查' : '下一题';
    const flagged = state.flaggedIds.has(question.id);
    elements.flagButton.classList.toggle('active', flagged);
    elements.flagButton.setAttribute('aria-pressed', String(flagged));
    elements.flagButton.textContent = flagged ? '★ 已标记' : '☆ 标记不确定';

    const host = elements.questionContent;
    host.innerHTML = '';
    host.appendChild(createElement('span', 'type-label', question.label));
    host.appendChild(createElement('h1', 'question-title', question.prompt));
    if (question.hint) host.appendChild(createElement('p', 'hint', question.hint));
    if (question.sentence) host.appendChild(createElement('div', 'sentence-box', question.sentence));
    if (question.type === 'choice') renderChoice(host, question);
    if (question.type === 'order') renderOrder(host, question);
    if (question.type === 'text') renderTextFields(host, question);
    renderDots(elements.questionDots, true, true);
    host.scrollTop = 0;
  }

  function renderDots(container, showCurrent, centerCurrent) {
    container.innerHTML = '';
    practice.questions.forEach((question, index) => {
      const dot = createElement('button', 'question-dot');
      const answered = isAnswered(question);
      const flagged = state.flaggedIds.has(question.id);
      const current = showCurrent && index === state.currentIndex;
      dot.type = 'button';
      if (answered) dot.classList.add('answered');
      if (flagged) dot.classList.add('flagged');
      if (current) dot.classList.add('current');
      dot.setAttribute('aria-label', `第 ${index + 1} 题，${answered ? '已作答' : '未作答'}${flagged ? '，已标记不确定' : ''}`);
      dot.addEventListener('click', () => {
        state.currentIndex = index;
        showScreen('challengeScreen');
        renderQuestion();
      });
      container.appendChild(dot);
    });
    requestAnimationFrame(() => {
      container.classList.toggle('has-overflow', container.scrollWidth > container.clientWidth + 2);
      if (centerCurrent) container.querySelector('.question-dot.current')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  function goPrevious() {
    if (state.currentIndex === 0) return;
    state.currentIndex -= 1;
    renderQuestion();
  }

  function goNext() {
    if (state.currentIndex < practice.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      return;
    }
    renderReview();
  }

  function toggleFlag() {
    const id = currentQuestion().id;
    if (state.flaggedIds.has(id)) state.flaggedIds.delete(id);
    else state.flaggedIds.add(id);
    renderQuestion();
  }

  function renderReview() {
    const answered = practice.questions.filter(isAnswered).length;
    const missing = practice.questions.length - answered;
    elements.answeredCount.textContent = answered;
    elements.unansweredCount.textContent = missing;
    elements.flaggedCount.textContent = state.flaggedIds.size;
    elements.missingMessage.textContent = missing > 0 ? `还有 ${missing} 道题没有作答，可以返回补答后再提交。` : '全部题目都已作答，可以提交。';
    renderDots(elements.reviewDots, false, false);
    showScreen('reviewScreen');
  }

  function formatUserAnswer(question) {
    const answer = state.answers[question.id];
    if (!isAnswered(question)) return '未作答';
    if (question.type === 'choice') return answer.join(' / ');
    if (question.type === 'order') return answer.join(' ');
    return question.fields.map((field, index) => `${field.label}：${answer[index] || '未作答'}`).join('\n');
  }

  function formatCorrectAnswer(question) {
    if (question.type === 'choice') return question.correctAnswer.join(' / ');
    if (question.type === 'order') return question.correctAnswer.join(' ');
    return question.fields.map(field => `${field.label}：${field.displayAnswer}`).join('\n');
  }

  function addReviewLine(card, labelText, valueText) {
    const paragraph = createElement('p');
    paragraph.append(createElement('span', 'label', labelText), createElement('span', 'answer', valueText));
    card.appendChild(paragraph);
  }

  function renderSkills() {
    elements.skillGrid.innerHTML = '';
    const points = Array.isArray(practice.knowledgePoints) ? practice.knowledgePoints : [];
    points.forEach(point => {
      const related = practice.questions.filter(question => question.knowledgePoints.includes(point));
      if (related.length === 0) return;
      const correct = related.filter(isCorrect).length;
      const percent = Math.round((correct / related.length) * 100);
      const card = createElement('div', 'skill-card');
      const heading = createElement('div', 'skill-heading');
      heading.append(createElement('span', '', point), createElement('span', '', `${correct} / ${related.length}`));
      const track = createElement('div', 'skill-track');
      const fill = createElement('div', 'skill-fill');
      fill.style.width = `${percent}%`;
      track.appendChild(fill);
      card.append(heading, track);
      elements.skillGrid.appendChild(card);
    });
  }

  function renderWrongAnswers() {
    elements.wrongList.innerHTML = '';
    const wrongQuestions = practice.questions.filter(question => !isCorrect(question));
    if (wrongQuestions.length === 0) {
      elements.wrongList.appendChild(createElement('div', 'empty-wrong', '全部答对，没有错题需要复盘。'));
      return;
    }
    wrongQuestions.forEach(question => {
      const card = createElement('article', 'wrong-card');
      const number = practice.questions.indexOf(question) + 1;
      card.appendChild(createElement('h3', '', `第 ${number} 题 · ${question.label}`));
      addReviewLine(card, '原题：', question.sentence || question.prompt);
      addReviewLine(card, '我的答案：', formatUserAnswer(question));
      addReviewLine(card, '正确答案：', formatCorrectAnswer(question));
      card.appendChild(createElement('div', 'reason-box', question.explanation));
      elements.wrongList.appendChild(card);
    });
  }

  function submitPractice() {
    const missing = practice.questions.filter(question => !isAnswered(question)).length;
    if (missing > 0 && !window.confirm(`还有 ${missing} 道题没有作答。仍然提交吗？`)) return;
    state.submitted = true;
    const correct = practice.questions.filter(isCorrect).length;
    const score = Math.round((correct / practice.questions.length) * 100);
    elements.scoreText.textContent = score;
    elements.scoreRing.style.setProperty('--score-angle', `${score * 3.6}deg`);
    elements.correctMeta.textContent = `答对 ${correct} / ${practice.questions.length}`;
    elements.accuracyMeta.textContent = `正确率 ${score}%`;
    elements.resultTitle.textContent = score >= 90 ? '句子侦探很厉害！' : score >= 70 ? '这次挑战完成得不错' : '再慢一点找线索';
    elements.resultMessage.textContent = score >= 90
      ? '你能看清句子主干，也能选对句型变化方法。'
      : score >= 70
        ? '基础已经掌握，看看错题里的关键提醒会更稳。'
        : '先判断句型，再决定怎么变化。找到主语和谓语后会更简单。';
    renderSkills();
    renderWrongAnswers();
    showScreen('resultScreen');
  }

  function resetPractice() {
    state = createFreshState();
    showScreen('challengeScreen');
    renderQuestion();
  }

  function navigateOutside(target) {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'grammar-challenge-navigation', target }, window.location.origin === 'null' ? '*' : window.location.origin);
      return;
    }
    window.location.href = '../index.html';
  }

  function bindEvents() {
    elements.exitChallengeButton.addEventListener('click', () => navigateOutside('directory'));
    elements.previousButton.addEventListener('click', goPrevious);
    elements.nextButton.addEventListener('click', goNext);
    elements.flagButton.addEventListener('click', toggleFlag);
    elements.backToQuestionButton.addEventListener('click', () => {
      showScreen('challengeScreen');
      renderQuestion();
    });
    elements.continueButton.addEventListener('click', () => {
      const firstMissing = practice.questions.findIndex(question => !isAnswered(question));
      if (firstMissing >= 0) state.currentIndex = firstMissing;
      showScreen('challengeScreen');
      renderQuestion();
    });
    elements.submitButton.addEventListener('click', submitPractice);
    elements.retryButton.addEventListener('click', resetPractice);
    elements.directoryButton.addEventListener('click', () => navigateOutside('directory'));
    elements.homeButton.addEventListener('click', () => navigateOutside('home'));
    elements.errorDirectoryButton.addEventListener('click', () => navigateOutside('directory'));
  }

  function cacheElements() {
    [
      'exitChallengeButton', 'challengeTitle', 'challengeDate', 'questionPosition', 'sectionName', 'questionCount',
      'practiceTip', 'progressFill', 'questionDots', 'questionContent', 'previousButton', 'flagButton', 'nextButton',
      'backToQuestionButton', 'answeredCount', 'unansweredCount', 'flaggedCount', 'reviewDots', 'missingMessage',
      'continueButton', 'submitButton', 'scoreRing', 'scoreText', 'resultTitle', 'resultMessage', 'correctMeta',
      'accuracyMeta', 'skillGrid', 'wrongList', 'retryButton', 'directoryButton', 'homeButton', 'errorDirectoryButton'
    ].forEach(id => { elements[id] = byId(id); });
  }

  async function initialize() {
    cacheElements();
    bindEvents();
    if (new URLSearchParams(window.location.search).get('embedded') === '1') {
      document.body.classList.add('embedded');
    }
    try {
      const entry = requestedPractice();
      if (!entry) throw new Error('目录中没有这份练习。');
      practice = validatePractice(await loadPracticeScript(entry), entry);
      document.title = `${practice.date}｜${practice.title}`;
      elements.challengeTitle.textContent = practice.title;
      elements.challengeDate.textContent = practice.date;
      elements.practiceTip.textContent = practice.studentTip || '';
      elements.practiceTip.hidden = !practice.studentTip;
      showScreen('challengeScreen');
      renderQuestion();
    } catch (error) {
      byId('errorMessage').textContent = error instanceof Error ? error.message : '无法打开这份练习。';
      showScreen('errorScreen');
    }
  }

  initialize();
})();
