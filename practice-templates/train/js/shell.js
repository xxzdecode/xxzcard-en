(function () {
  "use strict";

  const practice = window.PRACTICE_DATA;
  if (!practice || !Array.isArray(practice.questions) || practice.questions.length === 0) {
    throw new Error("PRACTICE_DATA.questions must contain at least one question.");
  }

  const meta = practice.meta || {};
  const feedback = practice.feedback || {};
  const completionCopy = practice.completion || {};
  const questions = practice.questions;

  questions.forEach((question, index) => {
    const initialOrder = question && question.initialOrder;
    const correctOrder = question && question.correctOrder;
    if (!Array.isArray(initialOrder) || !Array.isArray(correctOrder) || initialOrder.length !== correctOrder.length) {
      throw new Error(`Question ${index + 1} must provide matching initialOrder and correctOrder arrays.`);
    }
  });

  const state = {
    index: 0,
    answers: createAnswers()
  };

  let componentFactory = null;
  let game = null;
  let elements = null;

  function createAnswers() {
    return questions.map((question) => ({
      order: [...question.initialOrder],
      solved: false,
      attempts: 0
    }));
  }

  function currentQuestion() {
    return questions[state.index];
  }

  function currentAnswer() {
    return state.answers[state.index];
  }

  function solvedCount() {
    return state.answers.filter((answer) => answer.solved).length;
  }

  function interpolate(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }

  function setMultilineText(element, value) {
    element.replaceChildren();
    String(value || "").split("\n").forEach((line, index) => {
      if (index > 0) element.appendChild(document.createElement("br"));
      element.appendChild(document.createTextNode(line));
    });
  }

  function setFeedback(type, title, detail, rule) {
    elements.resultStrip.classList.remove("correct", "wrong");
    if (type === "correct") {
      elements.resultStrip.classList.add("correct");
      elements.feedbackIcon.textContent = "✓";
    } else if (type === "wrong") {
      elements.resultStrip.classList.add("wrong");
      elements.feedbackIcon.textContent = "×";
    } else {
      elements.feedbackIcon.textContent = "△";
    }
    elements.feedbackTitle.textContent = title || "";
    elements.feedbackDetail.textContent = detail || "";
    elements.ruleAfter.textContent = rule ?? feedback.defaultRule ?? "";
  }

  function renderDots() {
    elements.dots.innerHTML = "";
    questions.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.className = "dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `第 ${index + 1} 题`);
      dot.classList.toggle("active", index === state.index);
      dot.classList.toggle("done", state.answers[index].solved);
      dot.addEventListener("click", () => {
        state.index = index;
        render();
      });
      elements.dots.appendChild(dot);
    });
  }

  function render() {
    const question = currentQuestion();
    const answer = currentAnswer();

    elements.instruction.textContent = question.instruction || "";
    elements.stationName.textContent = question.station || `第 ${state.index + 1} 站`;
    elements.sentenceType.textContent = question.type || "";
    elements.progressNumber.textContent = `${state.index + 1}/${questions.length}`;
    elements.progressRing.style.setProperty(
      "--p",
      `${((state.index + 1) / questions.length) * 100}%`
    );
    elements.scoreText.textContent = `已完成 ${solvedCount()} / ${questions.length}`;

    game.renderQuestion(question, answer);
    renderDots();

    elements.prevBtn.disabled = state.index === 0;
    elements.nextBtn.textContent = state.index === questions.length - 1 ? "完成 →" : "下一题 →";
    elements.checkBtn.disabled = answer.solved;
    elements.resetBtn.disabled = answer.solved;

    if (answer.solved) {
      setFeedback(
        "correct",
        question.successTitle || "排列正确！",
        question.solvedDetail || feedback.solvedDetail || "",
        question.explanation || feedback.defaultRule || ""
      );
    } else {
      setFeedback(
        "neutral",
        question.idleTitle || feedback.idleTitle || "",
        question.idleDetail || feedback.idleDetail || ""
      );
    }
  }

  function checkAnswer() {
    const question = currentQuestion();
    const answer = currentAnswer();
    answer.attempts += 1;

    const result = game.check(question, answer);
    if (result.correct) {
      answer.solved = true;
      game.renderQuestion(question, answer);
      elements.scoreText.textContent = `已完成 ${solvedCount()} / ${questions.length}`;
      renderDots();
      elements.checkBtn.disabled = true;
      elements.resetBtn.disabled = true;

      setFeedback(
        "correct",
        question.successTitle || "排列正确！",
        question.successDetail || feedback.correctDetail || "",
        question.explanation || feedback.defaultRule || ""
      );
      game.playCorrectAnimation();
      return;
    }

    const detail = answer.attempts >= 2
      ? question.hint || feedback.firstWrongDetail || ""
      : feedback.firstWrongDetail || "";

    setFeedback(
      "wrong",
      question.wrongTitle || feedback.wrongTitle || "顺序还不对，再检查一下。",
      detail,
      question.wrongRule || feedback.wrongRule || feedback.defaultRule || ""
    );
    game.playWrongAnimation();
  }

  function resetCurrent() {
    const answer = currentAnswer();
    if (answer.solved) return;
    game.reset(currentQuestion(), answer);
    answer.attempts = 0;
    render();
  }

  function goNext() {
    if (state.index < questions.length - 1) {
      state.index += 1;
      render();
      return;
    }

    const count = solvedCount();
    const values = { count, total: questions.length };
    const template = count === questions.length
      ? completionCopy.success
      : completionCopy.incomplete;
    elements.completionText.textContent = interpolate(template, values);
    elements.completion.classList.add("show");
  }

  function restartAll() {
    state.index = 0;
    state.answers = createAnswers();
    elements.completion.classList.remove("show");
    render();
  }

  function bindShellControls() {
    elements.prevBtn.addEventListener("click", () => {
      if (state.index > 0) {
        state.index -= 1;
        render();
      }
    });
    elements.nextBtn.addEventListener("click", goNext);
    elements.checkBtn.addEventListener("click", checkAnswer);
    elements.resetBtn.addEventListener("click", resetCurrent);
    document.getElementById("returnBtn").addEventListener("click", () => {
      elements.completion.classList.remove("show");
    });
    document.getElementById("restartBtn").addEventListener("click", restartAll);
  }

  function getElements() {
    return {
      playground: document.getElementById("playground"),
      practiceTitle: document.getElementById("practiceTitle"),
      practiceSubtitle: document.getElementById("practiceSubtitle"),
      progressText: document.getElementById("progressText"),
      instruction: document.getElementById("instruction"),
      stationName: document.getElementById("stationName"),
      sentenceType: document.getElementById("sentenceType"),
      progressNumber: document.getElementById("progressNumber"),
      progressRing: document.getElementById("progressRing"),
      scoreText: document.getElementById("scoreText"),
      resultStrip: document.getElementById("resultStrip"),
      feedbackIcon: document.getElementById("feedbackIcon"),
      feedbackTitle: document.getElementById("feedbackTitle"),
      feedbackDetail: document.getElementById("feedbackDetail"),
      ruleAfter: document.getElementById("ruleAfter"),
      dots: document.getElementById("dots"),
      prevBtn: document.getElementById("prevBtn"),
      nextBtn: document.getElementById("nextBtn"),
      checkBtn: document.getElementById("checkBtn"),
      resetBtn: document.getElementById("resetBtn"),
      completion: document.getElementById("completion"),
      completionEmoji: document.getElementById("completionEmoji"),
      completionTitle: document.getElementById("completionTitle"),
      completionText: document.getElementById("completionText")
    };
  }

  function configureShellCopy() {
    document.title = meta.documentTitle || document.title;
    elements.practiceTitle.textContent = meta.title || "";
    elements.practiceSubtitle.textContent = meta.subtitle || "";
    setMultilineText(elements.progressText, meta.progressLabel || "");
    elements.completionEmoji.textContent = completionCopy.emoji || "";
    elements.completionTitle.textContent = completionCopy.title || "";
  }

  function registerPlaygroundComponent(factory) {
    componentFactory = factory;
  }

  function initialize() {
    if (typeof componentFactory !== "function") {
      throw new Error("No playground component has been registered.");
    }

    elements = getElements();
    configureShellCopy();
    game = componentFactory({
      setFeedback,
      getCurrentAnswer: currentAnswer,
      practice
    });
    game.mount(elements.playground);
    bindShellControls();
    render();
  }

  window.PracticeShell = { registerPlaygroundComponent };
  window.addEventListener("DOMContentLoaded", initialize);
}());
