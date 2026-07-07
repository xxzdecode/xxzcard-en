// MERGE PRACTICE
// ══════════════════════════════════════
async function showMergeSelect() {
  mergeSelected = new Set();
  const batches = visibleBatches();
  const list = document.getElementById('mergeList');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-light);font-size:13px">加载中…</div>';
  showScreen('screenMerge');
  const urecMap = {};
  await Promise.all(batches.map(async b => { urecMap[b.id] = await loadUserBatch(b.id); }));
  list.innerHTML = '';
  batches.forEach(batch => {
    const urec = urecMap[batch.id] || {known:[],unknown:[]};
    const item = document.createElement('div');
    item.className = 'merge-item';
    item.dataset.id = batch.id;
    item.innerHTML = `
      <div class="merge-check" id="mc_${batch.id}">✓</div>
      <div class="merge-info">
        <div class="merge-name">${batch.name}</div>
        <div class="merge-meta">${batch.cards.length} 词 · ✅${urec.known.length} ❌${urec.unknown.length}</div>
      </div>`;
    item.addEventListener('click', () => toggleMergeItem(batch.id));
    list.appendChild(item);
  });
  updateMergeBtn();
}

function toggleMergeItem(id) {
  if (mergeSelected.has(id)) mergeSelected.delete(id);
  else mergeSelected.add(id);
  const item = document.querySelector(`.merge-item[data-id="${id}"]`);
  item.classList.toggle('selected', mergeSelected.has(id));
  updateMergeBtn();
}

function updateMergeBtn() {
  const btn = document.getElementById('mergeStartBtn');
  const todayBtn = document.getElementById('mergeTodayBtn');
  const n = mergeSelected.size;
  if (isTeacher()) {
    if (todayBtn) todayBtn.style.display = '';
    if (n < 1) {
      btn.disabled = true;
      btn.textContent = '至少选择 1 个单词本';
      if (todayBtn) todayBtn.disabled = true;
    } else {
      btn.disabled = false;
      btn.textContent = `应用到明天（${n} 个）`;
      if (todayBtn) {
        todayBtn.disabled = false;
        todayBtn.textContent = `应用到今天（${n} 个）`;
      }
    }
    return;
  }
  if (todayBtn) todayBtn.style.display = 'none';
  if (n < 1) { btn.disabled = true; btn.textContent = '至少选 1 个单词本'; }
  else { btn.disabled = false; btn.textContent = `合并 ${n} 个单词本，开始练习 →`; }
}

async function smartPick15(batches) {
  let unknown = [], newCards = [], known = [];
  await Promise.all(batches.map(async batch => {
    const urec = await loadUserBatch(batch.id);
    batch.cards.forEach(c => {
      const tagged = {...c, _batchId: batch.id};
      const word = getCardWord(c);
      if (urec.unknown.includes(word)) unknown.push(tagged);
      else if (!urec.known.includes(word)) newCards.push(tagged);
      else known.push(tagged);
    });
  }));
  unknown = unknown.sort(() => Math.random()-0.5);
  newCards = newCards.sort(() => Math.random()-0.5);
  known = known.sort(() => Math.random()-0.5);
  let result = [...unknown];
  if (result.length < 15) result.push(...newCards.slice(0, 15-result.length));
  if (result.length < 15) result.push(...known.slice(0, 15-result.length));
  return result.slice(0,15);
}

async function startMergeStudy() {
  const ids = Array.from(mergeSelected);
  mergeSourceBatches = ids.map(id => appData.batches.find(b => String(b.id)===String(id))).filter(Boolean);
  const deck = await smartPick15(mergeSourceBatches);
  if (deck.length === 0) { alert('这些单词本里没有单词哦！'); return; }
  showMergeMenu(deck);
}

// a small in-page menu to pick merge study mode
function showMergeMenu(deck) {
  // reuse screenMerge area with an overlay card
  const list = document.getElementById('mergeList');
  list.innerHTML = `
    <div style="background:var(--white);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow)">
      <div style="font-size:15px;font-weight:800;color:var(--text-dark);margin-bottom:4px">选择练习方式</div>
      <div style="font-size:12px;color:var(--text-light);margin-bottom:16px">已从 ${mergeSelected.size} 个单词本智能抽取 ${deck.length} 张卡</div>
      <div style="display:flex;flex-direction:column;gap:9px">
        <button class="menu-btn shuffle" onclick="startMergeMode('shuffle', event)" style="width:100%">
          <span class="mi">🔀</span><span class="mt">随机学习<span class="ms">打乱顺序刷</span></span>
        </button>
        <button class="menu-btn pool" onclick="startMergeMode('pool', event)" style="width:100%">
          <span class="mi">💪</span><span class="mt">生词优先<span class="ms">已按生词→新词→熟词排序</span></span>
        </button>
        <button class="menu-btn daily-quiz" onclick="startMergeDailyQuiz(event)" style="width:100%">
          <span class="mi">📝</span><span class="mt">综合测验<span class="ms">智能五型题随机出现</span></span>
        </button>
      </div>
    </div>`;
  document.getElementById('mergeStartBar').style.display = 'none';
  // store deck globally
  window._mergeDeck = deck;
}

async function startMergeMode(mode, e) {
  if (e) e.stopPropagation();
  studyIsGlobal = false;
  studyMode = mode;
  const deck = window._mergeDeck;
  document.getElementById('mergeStartBar').style.display = '';
  currentBatchId = mergeSourceBatches[0].id;
  currentUserRec = await loadUserBatch(currentBatchId);
  if (mode === 'shuffle') { studyDeck = [...deck].sort(() => Math.random()-0.5); document.getElementById('modeLabel').textContent = '🔀 合并·随机'; }
  else if (mode === 'pool') { studyDeck = [...deck]; document.getElementById('modeLabel').textContent = '🔀 合并·生词优先'; }
  studyCurrent = 0; studyFlipped = false;
  showScreen('screenStudy');
  renderStudyCard();
}

function startMergeDailyQuiz(e) {
  if (e) e.stopPropagation();
  resultContext = 'merge-daily';
  document.getElementById('mergeStartBar').style.display = '';
  const deck = window._mergeDeck;
  // build all cards pool from all selected batches
  const allCards = mergeSourceBatches.flatMap(b => b.cards);
  // For merge daily, use deck as the question cards
  dqQuestions = deck.map(card => makeDailyQuestion(card, allCards.length > 4 ? allCards : deck));
  dqIndex = 0; dqCorrect = 0; dqWrongList = []; dqSelectedOpt = null;
  showScreen('screenDailyQuiz'); renderDQQuestion();
}

// ══════════════════════════════════════
// RESULT
// ══════════════════════════════════════
function showResult(correct, total, wrongList) {
  const wrong = total - correct;
  const pct = Math.round((correct/total)*100);
  document.getElementById('resCorrect').textContent = correct;
  document.getElementById('resWrong').textContent = wrong;
  document.getElementById('resultEmoji').textContent = pct>=80?'🏆':pct>=60?'👏':'💪';
  document.getElementById('resultTitle').textContent = pct>=80?'太厉害了！':pct>=60?'不错，继续加油！':'再练练，你可以的！';
  document.getElementById('resultSub').textContent = `答对 ${correct}/${total} 题（${pct}%）`;
  const wr = document.getElementById('wrongReview');
  const wl = document.getElementById('wrongList');
  if (wrongList.length > 0) {
    wr.style.display = 'block';
    wl.innerHTML = wrongList.map(c=>`<div class="wrong-item"><span class="wrong-en">${getCardWord(c)}</span><span class="wrong-zh">${getCardMeaning(c)}</span></div>`).join('');
  } else { wr.style.display = 'none'; }
  // adjust back button based on context
  const backBtn = document.getElementById('resultBackBtn');
  if (resultContext === 'task-challenge') {
    backBtn.textContent = activeTaskReturn === 'detail' ? '← 返回单词卡' : '← 返回首页';
    backBtn.onclick = () => finishTaskToSource();
  } else if (resultContext === 'merge-daily' || resultContext === 'global-daily') {
    backBtn.textContent = '← 返回首页';
    backBtn.onclick = () => { showScreen('screenHome'); loadHome(); };
  } else {
    backBtn.textContent = '← 返回单词卡';
    backBtn.onclick = () => goDetail();
  }
  showScreen('screenResult');
}

function retryResult() {
  if (resultContext === 'task-challenge' && activeTask) startChallengeTask(activeTask);
  else if (resultContext === 'daily') startDailyQuiz();
  else if (resultContext === 'merge-daily') startMergeDailyQuiz(null);
  else if (resultContext === 'global-daily') startGlobalDailyQuiz();
  else { showScreen('screenHome'); loadHome(); }
}

// ══════════════════════════════════════
