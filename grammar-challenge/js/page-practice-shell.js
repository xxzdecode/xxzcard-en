(function bootGrammarPagePractice() {
  'use strict';

  const loaderScript = document.currentScript;
  const practicePath = loaderScript && loaderScript.dataset.practicePath;
  const embedded = loaderScript && loaderScript.dataset.embedded === '1';
  const core = window.GrammarPagePracticeCore;

  if (!practicePath || !core) {
    renderFatalError('语法挑战交互组件没有正确加载。');
    return;
  }

  const practiceUrl = new URL(practicePath, window.location.href);
  const preloadedConfig = window.__GRAMMAR_PAGE_PRACTICE_CONFIG__;
  delete window.__GRAMMAR_PAGE_PRACTICE_CONFIG__;

  const configPromise = preloadedConfig
    ? Promise.resolve(preloadedConfig)
    : fetch(practiceUrl.href, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`练习页面加载失败（${response.status}）`);
        return response.text();
      })
      .then(source => parsePracticeConfig(source));

  configPromise
    .then(config => mountPractice(config, practiceUrl))
    .catch(error => {
      console.error(error);
      renderFatalError(error && error.message ? error.message : '练习页面加载失败。');
    });

  function renderFatalError(message) {
    document.body.innerHTML = `
      <main class="error-card">
        <h1>练习没有打开</h1>
        <p>${escapeHtml(message)}</p>
        <button class="action" id="retryPracticeButton" type="button">重新打开</button>
      </main>`;
    document.getElementById('retryPracticeButton')?.addEventListener('click', () => window.location.reload());
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parsePracticeConfig(source) {
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const data = parsed.getElementById('practice-data');
    if (!data) throw new Error('正式练习缺少 practice-data。');
    const config = JSON.parse(data.textContent || 'null');
    if (!config || !Array.isArray(config.questions) || config.questions.length === 0) {
      throw new Error('正式练习题目数据无效。');
    }
    return config;
  }

  function mountPractice(config, sourceUrl) {
    const challengeMode = config.interactionMode === 'challenge-locked';
    const state = {
      round: [],
      index: 0,
      interaction: core.createInteractionState(),
      solved: [],
      revealed: [],
      attempts: [],
      firstTry: [],
      wrongEver: []
    };

    document.title = config.title || '语法挑战';
    document.body.innerHTML = `
      <div class="practice-app" id="practiceApp">
        <header class="practice-header">
          <h1 id="pageTitle"></h1>
          <div class="knowledge-strip" id="knowledgeStrip" aria-label="知识摘要"></div>
          <div class="header-actions">
            <span class="progress" id="progressText" aria-live="polite"></span>
            <button class="action" id="newRoundButton" type="button">重新开始</button>
          </div>
        </header>
        <main class="practice-stage">
          <section class="question-card" aria-live="polite">
            <p class="category" id="categoryText"></p>
            <div class="prompt-context">
              <div class="source-line" id="sourceLine" hidden></div>
              <h2 class="prompt" id="promptText"></h2>
              <div class="rule-line" id="ruleLine" hidden></div>
            </div>
            <div class="options" id="options"></div>
            <div class="answer-zone" id="answerZone" hidden></div>
            <div class="question-actions">
              <button class="action" id="checkButton" type="button">检查答案</button>
              <button class="action secondary" id="showAnswerButton" type="button">显示答案</button>
              <button class="action secondary" id="nextButton" type="button" disabled>下一题</button>
            </div>
          </section>
        </main>
        <footer class="feedback" id="feedback" aria-live="polite">△ 请选择答案。</footer>
      </div>
      <dialog class="completion" id="completionDialog" data-complete="false">
        <h2 id="completionTitle">本轮完成</h2>
        <p id="completionText"></p>
        <button class="action" id="restartButton" type="button">重新开始</button>
        <button class="action secondary" id="continueButton" type="button" hidden>完成</button>
      </dialog>`;

    const ui = {
      title: byId('pageTitle'),
      knowledge: byId('knowledgeStrip'),
      progress: byId('progressText'),
      category: byId('categoryText'),
      source: byId('sourceLine'),
      prompt: byId('promptText'),
      rule: byId('ruleLine'),
      options: byId('options'),
      answerZone: byId('answerZone'),
      check: byId('checkButton'),
      show: byId('showAnswerButton'),
      next: byId('nextButton'),
      feedback: byId('feedback'),
      dialog: byId('completionDialog'),
      completionTitle: byId('completionTitle'),
      completion: byId('completionText'),
      continueButton: byId('continueButton')
    };

    function byId(id) {
      return document.getElementById(id);
    }

    function shuffle(items) {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
      }
      return result;
    }

    function buildRound() {
      const round = config.round || {};
      const size = Math.max(1, Number(round.size) || config.questions.length);
      if (round.shuffle === false) return config.questions.slice(0, size);
      if (Array.isArray(round.groups)) {
        return round.groups.flatMap(group => {
          const ids = new Set(group.ids || []);
          let items = config.questions.filter(question => ids.has(question.id));
          if (group.shuffle !== false) items = shuffle(items);
          return items;
        }).slice(0, size);
      }
      if (round.quotas && typeof round.quotas === 'object') {
        const picked = [];
        Object.entries(round.quotas).forEach(([category, count]) => {
          picked.push(...shuffle(config.questions.filter(question => question.category === category)).slice(0, Number(count) || 0));
        });
        return shuffle(picked).slice(0, size);
      }
      return shuffle(config.questions).slice(0, size);
    }

    function answerIndices(question) {
      const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
      const used = new Set();
      return answers.map(value => {
        if (typeof value === 'number') return value;
        const index = question.options.findIndex((option, optionIndex) => option === value && !used.has(optionIndex));
        if (index >= 0) used.add(index);
        return index;
      }).filter(index => index >= 0);
    }

    function answerValues(question) {
      return answerIndices(question).map(index => question.options[index]);
    }

    function expectedAssignments(question) {
      return question.answerMap || {};
    }

    function selectedValues(question) {
      return state.interaction.selected.map(index => question.options[index]);
    }

    function isCorrect(question) {
      if (question.type === 'classify') {
        const expected = expectedAssignments(question);
        return question.options.every(option => state.interaction.assignments[option] === expected[option]);
      }
      const selected = selectedValues(question);
      const answers = answerValues(question);
      if (question.type === 'order') {
        const indices = answerIndices(question);
        return state.interaction.selected.length === indices.length
          && state.interaction.selected.every((value, index) => value === indices[index]);
      }
      if (question.type === 'multi') {
        return selected.length === answers.length && selected.every(value => answers.includes(value));
      }
      return selected.length === 1 && selected[0] === answers[0];
    }

    function completeAnswer(question) {
      if (question.type === 'classify') {
        return Object.entries(expectedAssignments(question))
          .map(([option, target]) => `${option} → ${target}`)
          .join('；');
      }
      return question.answerDisplay || answerValues(question).join(question.type === 'order' ? ' ' : '、');
    }

    function hasResponse(question) {
      if (question.type === 'classify') return question.options.every(option => state.interaction.assignments[option]);
      return state.interaction.selected.length > 0;
    }

    function feedback(type, message) {
      ui.feedback.className = `feedback ${type || ''}`.trim();
      ui.feedback.textContent = `${type === 'correct' ? '✓' : type === 'wrong' ? '×' : '△'} ${message}`;
    }

    function currentQuestion() {
      return state.round[state.index];
    }

    function currentSolved() {
      return Boolean(state.solved[state.index]);
    }

    function updateNextState(question) {
      if (!challengeMode) return;
      ui.next.disabled = core.isFrozen(state.interaction, currentSolved())
        || !core.canSubmit(question, state.interaction);
    }

    function unsubmittedMessage(question) {
      if (question.type === 'multi') return '可以继续勾选或取消；选好后点击“下一题”确认。';
      if (question.type === 'order') return core.canSubmit(question, state.interaction)
        ? '顺序仍可调整；点击“下一题”确认。'
        : '请继续选择全部词块，确认前可以取消并重排。';
      if (question.type === 'classify') return core.canSubmit(question, state.interaction)
        ? '分类仍可调整；点击“下一题”确认。'
        : '继续选择词卡并分配；确认前可以重新分类。';
      return '答案仍可修改；点击“下一题”确认。';
    }

    function updateAnswerZone(question) {
      if (question.type === 'order') {
        ui.answerZone.textContent = state.interaction.selected.length
          ? selectedValues(question).join(' ')
          : '按顺序点击词块，句子会在这里组成。';
        return;
      }
      if (question.type !== 'classify') return;

      const zone = document.createElement('div');
      zone.className = 'classify-zone';
      const hint = document.createElement('div');
      hint.textContent = state.interaction.activeOption === null
        ? '先点词卡，再点目标区。'
        : `已选：${question.options[state.interaction.activeOption]}，请选择目标区。`;
      const targets = document.createElement('div');
      targets.className = 'classify-targets';

      question.targets.forEach(target => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'classify-target';
        button.dataset.target = target;
        button.disabled = core.isFrozen(state.interaction, currentSolved());
        const assigned = question.options.filter(option => state.interaction.assignments[option] === target);
        button.textContent = target;
        const values = document.createElement('span');
        values.textContent = assigned.length ? assigned.join(' · ') : '点击放入';
        button.appendChild(values);
        button.addEventListener('click', () => {
          if (!core.assignActiveOption(question, state.interaction, target, currentSolved())) return;
          updateAnswerZone(question);
          renderOptionStates(question);
          updateNextState(question);
          feedback('', challengeMode ? unsubmittedMessage(question) : (hasResponse(question) ? '分类完成，可以检查答案。' : '继续选择词卡并放入目标区。'));
        });
        targets.appendChild(button);
      });
      zone.append(hint, targets);
      ui.answerZone.replaceChildren(zone);
    }

    function renderOptionStates(question) {
      ui.options.querySelectorAll('.option').forEach(item => {
        const index = Number(item.dataset.optionIndex);
        const picked = question.type === 'classify'
          ? state.interaction.activeOption === index
          : state.interaction.selected.includes(index);
        item.setAttribute('aria-pressed', String(picked));
        item.classList.toggle('order-picked', question.type === 'order' && picked);
        item.disabled = core.isFrozen(state.interaction, currentSolved());
      });
    }

    function renderQuestion() {
      const question = currentQuestion();
      state.interaction = core.createInteractionState();
      ui.progress.textContent = `第 ${state.index + 1} / ${state.round.length} 题`;
      ui.category.textContent = question.categoryLabel || question.category || '';
      ui.prompt.textContent = question.prompt || '';
      ui.source.hidden = !question.source;
      ui.source.textContent = question.source || '';
      ui.rule.hidden = !question.rule;
      ui.rule.textContent = question.rule || '';
      ui.answerZone.hidden = !['order', 'classify'].includes(question.type);
      ui.options.classList.toggle('order-options', question.type === 'order');
      ui.options.classList.toggle('classify-options', question.type === 'classify');
      ui.options.replaceChildren(...question.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option';
        button.dataset.optionIndex = String(index);
        button.setAttribute('aria-pressed', 'false');
        button.textContent = option;
        button.addEventListener('click', () => {
          if (!core.selectOption(question, state.interaction, index, currentSolved())) return;
          renderOptionStates(question);
          updateAnswerZone(question);
          updateNextState(question);
          if (question.type === 'classify') {
            feedback('', `已选择 ${option}，请点击目标区。`);
          } else if (challengeMode) {
            feedback('', unsubmittedMessage(question));
          } else {
            feedback('', '已选择，点击“检查答案”。');
          }
        });
        return button;
      }));
      updateAnswerZone(question);
      ui.next.hidden = false;
      ui.next.disabled = true;
      ui.check.hidden = challengeMode;
      ui.show.hidden = challengeMode;
      ui.check.disabled = false;
      ui.show.disabled = false;
      feedback('', question.type === 'multi'
        ? '请选择全部正确答案。'
        : question.type === 'order'
          ? '请按正确语序点击全部词块。'
          : question.type === 'classify'
            ? '先点词卡，再点目标区。'
            : '请选择答案。');
      disarmRecordCapture();
    }

    function startRound() {
      state.round = buildRound();
      state.index = 0;
      state.solved = Array(state.round.length).fill(false);
      state.revealed = Array(state.round.length).fill(false);
      state.attempts = Array(state.round.length).fill(0);
      state.firstTry = Array(state.round.length).fill(false);
      state.wrongEver = Array(state.round.length).fill(false);
      ui.dialog.dataset.complete = 'false';
      if (ui.dialog.open) ui.dialog.close();
      renderQuestion();
    }

    function checkAnswer() {
      const question = currentQuestion();
      if (!hasResponse(question)) return feedback('wrong', '请先完成作答。');
      if (currentSolved()) return;
      state.attempts[state.index] += 1;
      if (isCorrect(question)) {
        state.solved[state.index] = true;
        state.firstTry[state.index] = state.attempts[state.index] === 1 && !state.revealed[state.index];
        ui.options.querySelectorAll('.option').forEach(item => {
          if (answerValues(question).includes(item.textContent)) item.classList.add('correct-option');
        });
        feedback('correct', `${question.correctFeedback || '正确。'} ${question.explanation || ''}`.trim());
        ui.check.disabled = true;
        ui.show.disabled = true;
        ui.next.disabled = false;
      } else {
        state.wrongEver[state.index] = true;
        state.interaction.selected.forEach(index => {
          ui.options.querySelector(`[data-option-index="${index}"]`)?.classList.add('wrong-option');
        });
        feedback('wrong', question.wrongFeedback || '再看规则，你可以继续修改。');
        if (question.type !== 'classify') state.interaction.selected = [];
        renderOptionStates(question);
        updateAnswerZone(question);
      }
    }

    function showAnswer() {
      const question = currentQuestion();
      state.revealed[state.index] = true;
      state.solved[state.index] = true;
      feedback('correct', `答案：${completeAnswer(question)}。${question.explanation || ''}`);
      if (question.type === 'classify') {
        state.interaction.assignments = { ...expectedAssignments(question) };
        ui.answerZone.hidden = false;
        updateAnswerZone(question);
        renderOptionStates(question);
      } else {
        ui.answerZone.hidden = false;
        ui.answerZone.textContent = completeAnswer(question);
      }
      ui.options.querySelectorAll('.option').forEach(item => {
        if (answerValues(question).includes(item.textContent)) item.classList.add('correct-option');
      });
      ui.check.disabled = true;
      ui.show.disabled = true;
      ui.next.disabled = false;
    }

    function nextQuestion() {
      if (state.index + 1 < state.round.length) {
        state.index += 1;
        renderQuestion();
      } else {
        showCompletion();
      }
    }

    function showCompletion() {
      const first = state.firstTry.filter(Boolean).length;
      const final = state.solved.filter(Boolean).length;
      const wrongIds = state.round.filter((_, index) => state.wrongEver[index]).map(question => question.id);
      ui.completionTitle.textContent = config.completionTitle || (challengeMode ? '挑战完成' : '本轮完成');
      ui.completion.textContent = challengeMode
        ? `${config.completion || '本轮完成。'} 正确 ${first} / ${state.round.length}。错题题号：${wrongIds.length ? wrongIds.join('、') : '无'}。`
        : `${config.completion || '本轮完成。'} 首次正确 ${first} / ${state.round.length}，最终正确 ${final} / ${state.round.length}。错题题号：${wrongIds.length ? wrongIds.join('、') : '无'}。`;
      ui.dialog.dataset.complete = 'true';
      if (typeof ui.dialog.showModal === 'function') ui.dialog.showModal();
      else ui.dialog.setAttribute('open', '');
    }

    function installPracticeData() {
      let node = document.getElementById('practice-data');
      if (!node) {
        node = document.createElement('script');
        node.id = 'practice-data';
        node.type = 'application/json';
        document.body.appendChild(node);
      }
      node.textContent = JSON.stringify(config);
    }

    function notifyParentFrameReload() {
      try {
        if (window.frameElement) window.frameElement.dispatchEvent(new Event('load'));
      } catch (_) {}
    }

    function armRecordCapture() {
      installPracticeData();
      notifyParentFrameReload();
    }

    function disarmRecordCapture() {
      document.getElementById('practice-data')?.remove();
      notifyParentFrameReload();
    }

    function submitChallenge() {
      const question = currentQuestion();
      if (!core.beginSubmit(question, state.interaction, currentSolved())) return;

      // Records attach only at the formal confirmation point, so changing an
      // option before “下一题” never creates a scored history entry.
      armRecordCapture();
      ui.next.disabled = true;
      renderOptionStates(question);
      updateAnswerZone(question);

      state.solved[state.index] = true;
      state.attempts[state.index] = 1;
      const correct = isCorrect(question);
      state.firstTry[state.index] = correct;
      state.wrongEver[state.index] = !correct;

      if (question.type !== 'classify') {
        ui.options.querySelectorAll('.option').forEach(item => {
          const index = Number(item.dataset.optionIndex);
          if (answerValues(question).includes(item.textContent)) item.classList.add('correct-option');
          else if (state.interaction.selected.includes(index)) item.classList.add('wrong-option');
        });
      }

      const message = correct
        ? `${question.correctFeedback || '正确。'} ${question.explanation || ''}`.trim()
        : `${question.wrongFeedback || '这次没有选对。'} 正确答案：${completeAnswer(question)}。${question.explanation || ''}`.trim();
      feedback(correct ? 'correct' : 'wrong', message);

      window.setTimeout(() => {
        if (state.index + 1 < state.round.length) {
          disarmRecordCapture();
          window.setTimeout(() => {
            state.index += 1;
            renderQuestion();
          }, 24);
        } else {
          showCompletion();
        }
      }, Number(config.feedbackDelayMs || 1000));
    }

    ui.title.textContent = config.title || '语法挑战';
    ui.knowledge.replaceChildren(...(Array.isArray(config.knowledge) ? config.knowledge : []).map(text => {
      const chip = document.createElement('span');
      chip.className = 'knowledge-chip';
      chip.textContent = text;
      return chip;
    }));
    byId('newRoundButton').hidden = challengeMode;
    byId('newRoundButton').addEventListener('click', startRound);
    byId('restartButton').addEventListener('click', startRound);
    byId('restartButton').textContent = config.restartLabel || (challengeMode ? '重新挑战' : '重新练习');
    if (config.continueLabel) {
      ui.continueButton.hidden = false;
      ui.continueButton.textContent = config.continueLabel;
      ui.continueButton.addEventListener('click', () => {
        if (config.continueHref) {
          window.location.href = new URL(config.continueHref, sourceUrl).href;
        } else if (embedded) {
          window.parent.postMessage({ type: 'grammar-challenge-navigation', target: 'directory' }, window.location.origin);
        } else if (ui.dialog.open) {
          ui.dialog.close();
        }
      });
    }
    ui.check.addEventListener('click', checkAnswer);
    ui.show.addEventListener('click', showAnswer);
    ui.next.addEventListener('click', challengeMode ? submitChallenge : nextQuestion);

    window.__LESSON_PREP_QA__ = {
      state: () => {
        const question = currentQuestion();
        return {
          mode: challengeMode ? 'challenge-locked' : 'practice',
          index: state.index,
          total: state.round.length,
          complete: ui.dialog.dataset.complete === 'true',
          id: question && question.id,
          type: question && question.type,
          order: state.round.map(item => item.id),
          selected: [...state.interaction.selected],
          assignments: { ...state.interaction.assignments },
          activeOption: state.interaction.activeOption,
          locked: state.interaction.locked,
          judging: state.interaction.judging,
          canSubmit: core.canSubmit(question, state.interaction)
        };
      },
      selectOption: index => {
        const question = currentQuestion();
        core.selectOption(question, state.interaction, Number(index), currentSolved());
        renderOptionStates(question);
        updateAnswerZone(question);
        updateNextState(question);
      },
      assign: (option, target) => {
        const question = currentQuestion();
        const index = question.options.indexOf(option);
        if (index < 0) return;
        core.selectOption(question, state.interaction, index, currentSolved());
        core.assignActiveOption(question, state.interaction, target, currentSolved());
        renderOptionStates(question);
        updateAnswerZone(question);
        updateNextState(question);
      },
      selectWrong: () => {
        const question = currentQuestion();
        if (question.type === 'classify') {
          state.interaction.assignments = Object.fromEntries(question.options.map(option => {
            const expected = expectedAssignments(question)[option];
            return [option, question.targets.find(target => target !== expected) || question.targets[0]];
          }));
        } else {
          const correct = new Set(answerIndices(question));
          const wrongIndex = question.options.findIndex((_, index) => !correct.has(index));
          state.interaction.selected = wrongIndex >= 0 ? [wrongIndex] : [];
        }
        renderOptionStates(question);
        updateAnswerZone(question);
        updateNextState(question);
      },
      solveCurrent: () => {
        const question = currentQuestion();
        if (question.type === 'classify') state.interaction.assignments = { ...expectedAssignments(question) };
        else state.interaction.selected = answerIndices(question);
        renderOptionStates(question);
        updateAnswerZone(question);
        updateNextState(question);
      },
      submit: submitChallenge,
      restart: startRound
    };

    startRound();
  }
})();
