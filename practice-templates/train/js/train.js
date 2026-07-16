(function () {
  "use strict";

  function createTrainGame(shell) {
    let carsEl = null;
    let trainShell = null;
    let question = null;
    let answer = null;
    let selectedPart = null;

    function arraysEqual(a, b) {
      return a.length === b.length && a.every((value, index) => value === b[index]);
    }

    function escapeHtml(text) {
      return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function selectCar(part) {
      if (answer.solved) return;
      selectedPart = selectedPart === part ? null : part;
      carsEl.querySelectorAll(".car-wrap").forEach((node) => {
        node.classList.toggle("selected", node.dataset.part === selectedPart);
      });
    }

    function addPointerSorting(car) {
      let pointerId = null;
      let startX = 0;
      let startIndex = -1;
      let targetIndex = -1;
      let moved = false;
      let containerRect = null;
      let startRect = null;

      function slots() {
        return [...carsEl.querySelectorAll(".car-slot")];
      }

      function clearSlotPreview() {
        slots().forEach((slot) => {
          slot.classList.remove("origin-slot", "drop-target");
          slot.style.transform = "";
        });
      }

      function showSlotPreview() {
        const allSlots = slots();
        clearSlotPreview();
        allSlots[startIndex]?.classList.add("origin-slot");
        allSlots[targetIndex]?.classList.add("drop-target");

        if (targetIndex > startIndex) {
          for (let index = startIndex + 1; index <= targetIndex; index += 1) {
            allSlots[index].style.transform = "translateX(-10%)";
          }
        } else if (targetIndex < startIndex) {
          for (let index = targetIndex; index < startIndex; index += 1) {
            allSlots[index].style.transform = "translateX(10%)";
          }
        }
      }

      car.addEventListener("pointerdown", (event) => {
        if (answer.solved) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const slot = car.closest(".car-slot");
        if (!slot) return;

        pointerId = event.pointerId;
        startX = event.clientX;
        startIndex = Number(slot.dataset.index);
        targetIndex = startIndex;
        moved = false;
        containerRect = carsEl.getBoundingClientRect();
        startRect = car.getBoundingClientRect();

        car.setPointerCapture(pointerId);
        car.classList.add("dragging");
        selectCar(car.dataset.part);
        showSlotPreview();
        event.preventDefault();
      });

      car.addEventListener("pointermove", (event) => {
        if (pointerId !== event.pointerId || answer.solved) return;

        const rawDx = event.clientX - startX;
        if (Math.abs(rawDx) > 6) moved = true;

        const minDx = containerRect.left - startRect.left;
        const maxDx = containerRect.right - startRect.right;
        const boundedDx = Math.max(minDx, Math.min(maxDx, rawDx));
        car.style.transform = `translateX(${boundedDx}px) translateY(-12px) scale(1.035)`;

        const boundedX = Math.max(
          containerRect.left + 1,
          Math.min(containerRect.right - 1, event.clientX)
        );
        const relativeX = boundedX - containerRect.left;
        const nextTarget = Math.max(
          0,
          Math.min(answer.order.length - 1, Math.floor(relativeX / (containerRect.width / answer.order.length)))
        );

        if (nextTarget !== targetIndex) {
          targetIndex = nextTarget;
          showSlotPreview();
        }
      });

      function finish(event) {
        if (pointerId !== event.pointerId) return;

        car.releasePointerCapture?.(pointerId);
        car.classList.remove("dragging");
        car.style.transform = "";
        pointerId = null;

        const changedSlot = moved && targetIndex !== startIndex;
        if (changedSlot) {
          const [part] = answer.order.splice(startIndex, 1);
          answer.order.splice(targetIndex, 0, part);

          car.dataset.suppressClick = "true";
          window.setTimeout(() => {
            car.dataset.suppressClick = "false";
          }, 80);

          renderCars();
          shell.setFeedback(
            "neutral",
            `车厢已进入第 ${targetIndex + 1} 个车位。`,
            "每节车厢只会落在固定车位中，可以继续调整。"
          );
          return;
        }

        clearSlotPreview();
        if (moved) {
          car.dataset.suppressClick = "true";
          window.setTimeout(() => {
            car.dataset.suppressClick = "false";
          }, 80);
          shell.setFeedback(
            "neutral",
            "车厢回到了原来的车位。",
            "拖到另一个车位的中间再松手即可换位。"
          );
        }
      }

      car.addEventListener("pointerup", finish);
      car.addEventListener("pointercancel", finish);
    }

    function makeCar(part) {
      const wrap = document.createElement("div");
      wrap.className = "car-wrap";
      wrap.dataset.part = part;
      wrap.setAttribute("role", "button");
      wrap.setAttribute("tabindex", "0");
      wrap.setAttribute("aria-label", `车厢：${part}`);
      wrap.innerHTML = `
        <div class="car-body">
          <div class="car-window" aria-hidden="true"></div>
          <span class="car-word">${escapeHtml(part)}</span>
        </div>
        <div class="car-wheel left"></div>
        <div class="car-wheel right"></div>
        <div class="car-hook" aria-hidden="true"></div>
      `;

      wrap.addEventListener("click", () => {
        if (wrap.dataset.suppressClick === "true") return;
        selectCar(part);
      });
      wrap.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCar(part);
        }
      });
      addPointerSorting(wrap);
      return wrap;
    }

    function updateTrainScale() {
      const partCount = answer.order.length;
      const totalCharacters = answer.order.reduce((sum, part) => sum + String(part).length, 0);
      const longestPart = Math.max(...answer.order.map((part) => String(part).length));
      let scale = 1;

      if (partCount >= 7 || totalCharacters >= 58 || longestPart >= 18) {
        scale = 0.72;
      } else if (partCount >= 6 || totalCharacters >= 46 || longestPart >= 15) {
        scale = 0.80;
      } else if (partCount >= 5 || totalCharacters >= 36 || longestPart >= 12) {
        scale = 0.88;
      } else if (partCount >= 4 || totalCharacters >= 28) {
        scale = 0.94;
      }

      trainShell.style.setProperty("--train-scale", String(scale));
      trainShell.classList.toggle("compact", scale <= 0.88);
      trainShell.classList.toggle("ultra-compact", scale <= 0.76);
    }

    function renderCars() {
      carsEl.innerHTML = "";
      carsEl.style.setProperty("--car-count", answer.order.length);

      answer.order.forEach((part, index) => {
        const slot = document.createElement("div");
        slot.className = "car-slot";
        slot.dataset.index = String(index);
        slot.setAttribute("aria-label", `第 ${index + 1} 个车位`);

        const car = makeCar(part);
        if (part === selectedPart) car.classList.add("selected");
        slot.appendChild(car);
        carsEl.appendChild(slot);
      });

      trainShell.classList.toggle("correct", answer.solved);
      updateTrainScale();
    }

    function mount(container) {
      container.innerHTML = `
        <section class="railway-scene" aria-label="火车排序练习区">
          <div class="station" aria-hidden="true">
            <span class="station-label"></span>
          </div>
          <div class="bush b1" aria-hidden="true"></div>
          <div class="bush b2" aria-hidden="true"></div>
          <div class="track-wrap">
            <div class="track" aria-hidden="true"><div class="sleepers"></div></div>
            <div class="train-shell" id="trainShell">
              <div class="engine" aria-label="火车头">
                <div class="smoke s1"></div>
                <div class="smoke s2"></div>
                <div class="smoke s3"></div>
                <div class="engine-body">
                  <div class="engine-cabin"></div>
                  <div class="engine-window"></div>
                  <div class="engine-boiler"></div>
                  <div class="engine-front"></div>
                  <div class="chimney"></div>
                  <div class="engine-light"></div>
                  <div class="cowcatcher"></div>
                </div>
                <div class="wheel w1"></div>
                <div class="wheel w2"></div>
              </div>
              <div class="coupler" aria-hidden="true"></div>
              <div class="cars" id="cars" aria-label="可拖动车厢"></div>
            </div>
          </div>
          <div class="drag-help">☝️ 每节车厢都有固定车位：按住车厢，拖到另一个车位后松手</div>
        </section>
      `;
      carsEl = container.querySelector("#cars");
      trainShell = container.querySelector("#trainShell");
      container.querySelector(".station-label").textContent = shell.practice.meta?.stationLabel || "";
    }

    function renderQuestion(nextQuestion, nextAnswer) {
      question = nextQuestion;
      answer = nextAnswer;
      selectedPart = answer.order.includes(selectedPart) ? selectedPart : null;
      trainShell.classList.remove("shake", "depart");
      renderCars();
    }

    function check(nextQuestion, nextAnswer) {
      nextAnswer.order = [...carsEl.querySelectorAll(".car-wrap")].map((node) => node.dataset.part);
      answer = nextAnswer;
      question = nextQuestion;
      if (!arraysEqual(answer.order, question.correctOrder)) return { correct: false };
      selectedPart = null;
      renderCars();
      return { correct: true };
    }

    function reset(nextQuestion, nextAnswer) {
      const shifted = [...nextQuestion.initialOrder];
      if (arraysEqual(shifted, nextAnswer.order)) shifted.push(shifted.shift());
      if (arraysEqual(shifted, nextQuestion.correctOrder)) shifted.reverse();
      nextAnswer.order = shifted;
      selectedPart = null;
    }

    function playCorrectAnimation() {
      trainShell.classList.remove("depart");
      void trainShell.offsetWidth;
      trainShell.classList.add("depart");
    }

    function playWrongAnimation() {
      trainShell.classList.remove("shake");
      void trainShell.offsetWidth;
      trainShell.classList.add("shake");
    }

    return {
      mount,
      renderQuestion,
      check,
      reset,
      playCorrectAnimation,
      playWrongAnimation
    };
  }

  window.PracticeShell.registerPlaygroundComponent(createTrainGame);
}());
