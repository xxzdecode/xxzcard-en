(function bootGrammarPagePractice() {
  'use strict';

  const loader = document.currentScript;
  const practicePath = loader && loader.dataset.practicePath;
  const core = window.GrammarPagePracticeCore;
  const practiceUrl = practicePath ? new URL(practicePath, window.location.href) : null;
  const config = window.__GRAMMAR_PAGE_PRACTICE_CONFIG__;
  delete window.__GRAMMAR_PAGE_PRACTICE_CONFIG__;

  if (!practiceUrl || !core || !config || config.interactionMode !== 'challenge-locked' || !Array.isArray(config.questions)) {
    document.body.innerHTML = '<main class="error-card"><h1>练习没有打开</h1><p>语法挑战交互组件没有正确加载。</p></main>';
    return;
  }

  // 兼容旧浏览器测试的“页面已就绪”探针；不提供 questions，避免确认前建立历史捕获模型。
  window.GRAMMAR_CHALLENGE_PRACTICE = { runtime: 'page-practice-shared' };
  mount(config, practiceUrl);

  function mount(settings, sourceUrl) {
    const adaptiveSession = settings.adaptiveSession && settings.adaptiveSession.enabled === true
      ? settings.adaptiveSession
      : null;
    document.body.classList.toggle('adaptive-challenge', Boolean(adaptiveSession));
    const state = {
      round: [],
      index: 0,
      interaction: core.createInteractionState(),
      solved: [],
      firstTry: [],
      wrongEver: [],
      saving: false,
      pendingAdaptive: null
    };
    let transitionTimer = null;

    document.title = settings.title || '语法挑战';
    document.body.innerHTML = `
      <div class="practice-app" id="practiceApp">
        <header class="practice-header">
          <h1 id="pageTitle"></h1>
          <div class="knowledge-strip" id="knowledgeStrip" aria-label="知识摘要"></div>
          <div class="header-actions">
            <span class="progress" id="progressText" aria-live="polite"></span>
            <button class="action" id="newRoundButton" type="button" hidden>重新开始</button>
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
              <button class="action" id="checkButton" type="button" hidden>检查答案</button>
              <button class="action secondary" id="showAnswerButton" type="button" hidden>显示答案</button>
              <button class="action secondary" id="nextButton" type="button" disabled>下一题</button>
            </div>
          </section>
        </main>
        <footer class="feedback" id="feedback" aria-live="polite">△ 请选择答案。</footer>
      </div>
      <dialog class="completion" id="completionDialog" data-complete="false">
        <h2 id="completionTitle">挑战完成</h2>
        <p id="completionText"></p>
        <button class="action" id="restartButton" type="button">重新挑战</button>
        <button class="action secondary" id="continueButton" type="button" hidden>完成</button>
      </dialog>`;

    const ui = Object.fromEntries([
      ['title', 'pageTitle'], ['knowledge', 'knowledgeStrip'], ['progress', 'progressText'],
      ['category', 'categoryText'], ['source', 'sourceLine'], ['prompt', 'promptText'],
      ['rule', 'ruleLine'], ['options', 'options'], ['answerZone', 'answerZone'],
      ['next', 'nextButton'], ['feedback', 'feedback'], ['dialog', 'completionDialog'],
      ['completionTitle', 'completionTitle'], ['completion', 'completionText'],
      ['continueButton', 'continueButton']
    ].map(([name, id]) => [name, document.getElementById(id)]));

    function shuffle(items) {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [result[index], result[swap]] = [result[swap], result[index]];
      }
      return result;
    }

    function buildRound() {
      const round = settings.round || {};
      const size = Math.max(1, Number(round.size) || settings.questions.length);
      if (round.shuffle === false) return settings.questions.slice(0, size);
      if (Array.isArray(round.groups)) {
        return round.groups.flatMap(group => {
          const ids = new Set(group.ids || []);
          const questions = settings.questions.filter(question => ids.has(question.id));
          return group.shuffle === false ? questions : shuffle(questions);
        }).slice(0, size);
      }
      if (round.quotas && typeof round.quotas === 'object') {
        const picked = [];
        Object.entries(round.quotas).forEach(([category, count]) => {
          picked.push(...shuffle(settings.questions.filter(question => question.category === category)).slice(0, Number(count) || 0));
        });
        return shuffle(picked).slice(0, size);
      }
      return shuffle(settings.questions).slice(0, size);
    }

    function question() {
      return state.round[state.index];
    }

    function solved() {
      return Boolean(state.solved[state.index]);
    }

    function answerIndices(item) {
      const values = Array.isArray(item.answer) ? item.answer : [item.answer];
      const used = new Set();
      return values.map(value => {
        if (typeof value === 'number') return value;
        const index = item.options.findIndex((option, optionIndex) => option === value && !used.has(optionIndex));
        if (index >= 0) used.add(index);
        return index;
      }).filter(index => index >= 0);
    }

    function answerValues(item) {
      return answerIndices(item).map(index => item.options[index]);
    }

    function expectedAssignments(item) {
      return item.answerMap || {};
    }

    function selectedValues(item) {
      return state.interaction.selected.map(index => item.options[index]);
    }

    function isCorrect(item) {
      if (item.type === 'classify') {
        const expected = expectedAssignments(item);
        return item.options.every(option => state.interaction.assignments[option] === expected[option]);
      }
      if (item.type === 'order') {
        const expected = answerIndices(item);
        return state.interaction.selected.length === expected.length
          && state.interaction.selected.every((value, index) => value === expected[index]);
      }
      const selected = selectedValues(item);
      const expected = answerValues(item);
      if (item.type === 'multi') return selected.length === expected.length && selected.every(value => expected.includes(value));
      return selected.length === 1 && selected[0] === expected[0];
    }

    function completeAnswer(item) {
      if (item.type === 'classify') {
        return Object.entries(expectedAssignments(item)).map(([option, target]) => `${option} → ${target}`).join('；');
      }
      return item.answerDisplay || answerValues(item).join(item.type === 'order' ? ' ' : '、');
    }

    function feedback(type, message) {
      ui.feedback.className = `feedback ${type || ''}`.trim();
      ui.feedback.textContent = `${type === 'correct' ? '✓' : type === 'wrong' ? '×' : '△'} ${message}`;
    }

    function promptFor(item) {
      if (item.type === 'multi') return '可以继续勾选或取消；选好后点击“下一题”确认。';
      if (item.type === 'order') return core.canSubmit(item, state.interaction)
        ? '顺序仍可调整；点击“下一题”确认。'
        : '请继续选择全部词块，确认前可以取消并重排。';
      if (item.type === 'classify') return core.canSubmit(item, state.interaction)
        ? '分类仍可调整；点击“下一题”确认。'
        : '继续选择词卡并分配；确认前可以重新分类。';
      return '答案仍可修改；点击“下一题”确认。';
    }

    function updateNext(item) {
      ui.next.disabled = core.isFrozen(state.interaction, solved()) || !core.canSubmit(item, state.interaction);
    }

    function renderOptionStates(item) {
      ui.options.querySelectorAll('.option').forEach(button => {
        const index = Number(button.dataset.optionIndex);
        const option = item.options[index];
        const selected = item.type === 'classify'
          ? state.interaction.activeOption === index
          : state.interaction.selected.includes(index);
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('order-picked', item.type === 'order' && selected);
        button.classList.toggle('assigned-option', item.type === 'classify' && Boolean(state.interaction.assignments[option]));
        button.disabled = core.isFrozen(state.interaction, solved());
      });
    }

    function renderAnswerZone(item) {
      if (item.type === 'order') {
        ui.answerZone.textContent = state.interaction.selected.length
          ? selectedValues(item).join(' ')
          : '按顺序点击词块，句子会在这里组成。';
        return;
      }
      if (item.type !== 'classify') return;

      const zone = document.createElement('div');
      zone.className = 'classify-zone';
      const hint = document.createElement('div');
      hint.textContent = state.interaction.activeOption === null
        ? '先点词卡，再点目标区。'
        : `已选：${item.options[state.interaction.activeOption]}，请选择目标区。`;
      const targets = document.createElement('div');
      targets.className = 'classify-targets';
      item.targets.forEach(target => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'classify-target';
        button.dataset.target = target;
        button.disabled = core.isFrozen(state.interaction, solved());
        button.textContent = target;
        const assigned = document.createElement('span');
        const values = item.options.filter(option => state.interaction.assignments[option] === target);
        assigned.textContent = values.length ? values.join(' · ') : '点击放入';
        button.appendChild(assigned);
        button.addEventListener('click', () => {
          if (!core.assignActiveOption(item, state.interaction, target, solved())) return;
          renderAnswerZone(item);
          renderOptionStates(item);
          updateNext(item);
          feedback('', promptFor(item));
        });
        targets.appendChild(button);
      });
      zone.append(hint, targets);
      ui.answerZone.replaceChildren(zone);
    }

    function removePracticeData(notify) {
      document.getElementById('practice-data')?.remove();
      if (notify) notifyFrameLoad();
    }

    function installPracticeData() {
      let node = document.getElementById('practice-data');
      if (!node) {
        node = document.createElement('script');
        node.id = 'practice-data';
        node.type = 'application/json';
        document.body.appendChild(node);
      }
      node.textContent = JSON.stringify(settings);
    }

    function notifyFrameLoad() {
      try {
        if (window.frameElement) window.frameElement.dispatchEvent(new Event('load'));
      } catch (_) {}
    }

    function armRecordCapture() {
      installPracticeData();
      notifyFrameLoad();
    }

    function renderQuestion(notifyRecordWatcher) {
      const item = question();
      state.interaction = core.createInteractionState();
      removePracticeData(Boolean(notifyRecordWatcher));
      ui.progress.textContent = `第 ${state.index + 1} / ${state.round.length} 题`;
      ui.category.textContent = item.categoryLabel || item.category || '';
      ui.prompt.textContent = item.prompt || '';
      ui.source.hidden = !item.source;
      ui.source.textContent = item.source || '';
      ui.rule.hidden = !item.rule;
      ui.rule.textContent = item.rule || '';
      ui.answerZone.hidden = !['order', 'classify'].includes(item.type);
      ui.options.classList.toggle('order-options', item.type === 'order');
      ui.options.classList.toggle('classify-options', item.type === 'classify');
      ui.options.replaceChildren(...item.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option';
        button.dataset.optionIndex = String(index);
        button.setAttribute('aria-pressed', 'false');
        button.textContent = option;
        button.addEventListener('click', () => {
          if (!core.selectOption(item, state.interaction, index, solved())) return;
          renderOptionStates(item);
          renderAnswerZone(item);
          updateNext(item);
          feedback('', item.type === 'classify' ? `已选择 ${option}，请点击目标区。` : promptFor(item));
        });
        return button;
      }));
      renderAnswerZone(item);
      ui.next.textContent = '下一题';
      ui.next.disabled = true;
      feedback('', item.type === 'multi'
        ? '请选择全部正确答案。'
        : item.type === 'order'
          ? '请按正确语序点击全部词块。'
          : item.type === 'classify'
            ? '先点词卡，再点目标区。'
            : '请选择答案。');
    }

    function showCompletion() {
      const correct = state.firstTry.filter(Boolean).length;
      const wrongIds = state.round.filter((_, index) => state.wrongEver[index]).map(item => item.id);
      ui.completionTitle.textContent = settings.completionTitle || '挑战完成';
      ui.completion.textContent = `${settings.completion || '本轮完成。'} 正确 ${correct} / ${state.round.length}。错题题号：${wrongIds.length ? wrongIds.join('、') : '无'}。`;
      ui.dialog.dataset.complete = 'true';
      if (typeof ui.dialog.showModal === 'function') ui.dialog.showModal();
      else ui.dialog.setAttribute('open', '');
    }

    function scheduleAdvance() {
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        if (state.index + 1 >= state.round.length) {
          showCompletion();
          return;
        }
        removePracticeData(true);
        state.index += 1;
        renderQuestion(false);
      }, Number(settings.feedbackDelayMs || 1000));
    }

    async function persistAdaptiveResult() {
      const pending = state.pendingAdaptive;
      if (!pending) return;
      const adaptive = Boolean(adaptiveSession);
      if (!adaptive) {
        state.pendingAdaptive = null;
        scheduleAdvance();
        return;
      }
      let bridge = null;
      try { bridge = window.parent && window.parent.recordAdaptiveGrammarAnswer; } catch (_) {}
      if (typeof bridge !== 'function') {
        feedback('wrong', '题目记录组件尚未准备好，请点击“重试保存”。');
        ui.next.textContent = '重试保存';
        ui.next.disabled = false;
        return;
      }
      state.saving = true;
      ui.next.disabled = true;
      try {
        const result = await bridge({
          questionId: pending.questionId,
          correct: pending.correct,
          answeredAt: pending.answeredAt
        });
        if (result && Array.isArray(result.questions) && result.questions.length === state.round.length) {
          result.questions.forEach((question, index) => {
            if (index > state.index) state.round[index] = question;
          });
          settings.questions = [...state.round];
          settings.adaptiveSession.cursor = result.session && Number(result.session.cursor) || state.index + 1;
          settings.adaptiveSession.results = result.session && Array.isArray(result.session.items)
            ? result.session.items.map(item => item.firstTryCorrect)
            : settings.adaptiveSession.results;
        }
        state.pendingAdaptive = null;
        ui.next.textContent = '下一题';
        scheduleAdvance();
      } catch (error) {
        console.warn('Unable to save adaptive grammar answer', error);
        feedback('wrong', '本题尚未保存，请检查网络后点击“重试保存”。');
        ui.next.textContent = '重试保存';
        ui.next.disabled = false;
      } finally {
        state.saving = false;
      }
    }

    async function submit() {
      if (state.saving) return;
      if (state.pendingAdaptive) {
        await persistAdaptiveResult();
        return;
      }
      const item = question();
      if (!core.beginSubmit(item, state.interaction, solved())) return;

      state.solved[state.index] = true;
      ui.next.disabled = true;
      renderOptionStates(item);
      renderAnswerZone(item);

      const correct = isCorrect(item);
      state.firstTry[state.index] = correct;
      state.wrongEver[state.index] = !correct;

      if (item.type !== 'classify') {
        ui.options.querySelectorAll('.option').forEach(button => {
          const index = Number(button.dataset.optionIndex);
          if (answerValues(item).includes(button.textContent)) button.classList.add('correct-option');
          else if (state.interaction.selected.includes(index)) button.classList.add('wrong-option');
        });
      }

      const message = correct
        ? `${item.correctFeedback || '正确。'} ${item.explanation || ''}`.trim()
        : `${item.wrongFeedback || '这次没有选对。'} 正确答案：${completeAnswer(item)}。${item.explanation || ''}`.trim();
      feedback(correct ? 'correct' : 'wrong', message);

      // 锁定、判分和最终界面状态完成后，才允许历史监听器读取一次最终答案。
      armRecordCapture();
      state.pendingAdaptive = {
        questionId: item.id,
        correct,
        answeredAt: new Date().toISOString()
      };
      await persistAdaptiveResult();
    }

    function startRound() {
      window.clearTimeout(transitionTimer);
      removePracticeData(true);
      state.round = buildRound();
      settings.questions = [...state.round];
      const cursor = adaptiveSession ? Math.max(0, Math.min(state.round.length, Number(adaptiveSession.cursor) || 0)) : 0;
      const results = adaptiveSession && Array.isArray(adaptiveSession.results) ? adaptiveSession.results : [];
      state.index = cursor;
      state.solved = state.round.map((_, index) => index < cursor);
      state.firstTry = state.round.map((_, index) => typeof results[index] === 'boolean' ? results[index] : false);
      state.wrongEver = state.round.map((_, index) => index < cursor && results[index] === false);
      state.saving = false;
      state.pendingAdaptive = null;
      ui.dialog.dataset.complete = 'false';
      if (ui.dialog.open) ui.dialog.close();
      if (cursor >= state.round.length) showCompletion();
      else renderQuestion(false);
    }

    ui.title.textContent = settings.title || '语法挑战';
    ui.knowledge.replaceChildren(...(Array.isArray(settings.knowledge) ? settings.knowledge : []).map(text => {
      const chip = document.createElement('span');
      chip.className = 'knowledge-chip';
      chip.textContent = text;
      return chip;
    }));
    const restartButton = document.getElementById('restartButton');
    restartButton.textContent = settings.restartLabel || '重新挑战';
    restartButton.hidden = Boolean(adaptiveSession);
    restartButton.addEventListener('click', startRound);
    if (settings.continueLabel) {
      ui.continueButton.hidden = false;
      ui.continueButton.textContent = settings.continueLabel;
      ui.continueButton.addEventListener('click', () => {
        if (settings.continueHref) window.location.href = new URL(settings.continueHref, sourceUrl).href;
        else if (ui.dialog.open) ui.dialog.close();
      });
    }
    ui.next.addEventListener('click', submit);

    window.__LESSON_PREP_QA__ = {
      state: () => {
        const item = question();
        return {
          mode: 'challenge-locked',
          index: state.index,
          total: state.round.length,
          complete: ui.dialog.dataset.complete === 'true',
          id: item && item.id,
          type: item && item.type,
          order: state.round.map(entry => entry.id),
          selected: [...state.interaction.selected],
          assignments: { ...state.interaction.assignments },
          activeOption: state.interaction.activeOption,
          locked: state.interaction.locked,
          judging: state.interaction.judging,
          canSubmit: core.canSubmit(item, state.interaction)
        };
      },
      selectOption: index => {
        const item = question();
        core.selectOption(item, state.interaction, Number(index), solved());
        renderOptionStates(item);
        renderAnswerZone(item);
        updateNext(item);
      },
      assign: (option, target) => {
        const item = question();
        const index = item.options.indexOf(option);
        if (index < 0) return;
        core.selectOption(item, state.interaction, index, solved());
        core.assignActiveOption(item, state.interaction, target, solved());
        renderOptionStates(item);
        renderAnswerZone(item);
        updateNext(item);
      },
      selectWrong: () => {
        const item = question();
        if (item.type === 'classify') {
          state.interaction.assignments = Object.fromEntries(item.options.map(option => {
            const expected = expectedAssignments(item)[option];
            return [option, item.targets.find(target => target !== expected) || item.targets[0]];
          }));
        } else if (item.type === 'order') {
          state.interaction.selected = [...answerIndices(item)].reverse();
        } else if (item.type === 'multi') {
          const expected = new Set(answerIndices(item));
          const wrong = item.options.findIndex((_, index) => !expected.has(index));
          state.interaction.selected = wrong >= 0 ? [wrong] : [];
        } else {
          const expected = new Set(answerIndices(item));
          const wrong = item.options.findIndex((_, index) => !expected.has(index));
          state.interaction.selected = wrong >= 0 ? [wrong] : [];
        }
        renderOptionStates(item);
        renderAnswerZone(item);
        updateNext(item);
      },
      solveCurrent: () => {
        const item = question();
        if (item.type === 'classify') state.interaction.assignments = { ...expectedAssignments(item) };
        else state.interaction.selected = answerIndices(item);
        renderOptionStates(item);
        renderAnswerZone(item);
        updateNext(item);
      },
      submit,
      restart: startRound
    };

    startRound();
  }
})();
