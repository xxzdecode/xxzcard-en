// USER SWITCHING + PIN
// ══════════════════════════════════════
function switchUser(user) {
  if (user === 'teacher') {
    if (currentUser === 'teacher') return;
    if (!appData.pin) {
      pinMode = 'set1'; pinBuffer = ''; pinTemp = '';
      document.getElementById('pinTitle').textContent = '👩‍🏫 设置老师密码';
      document.getElementById('pinSub').textContent = '首次使用，请设置4位密码';
      document.getElementById('pinError').textContent = '';
      renderPinDots();
      document.getElementById('modalPin').classList.add('show');
    } else {
      pinMode = 'verify'; pinBuffer = '';
      document.getElementById('pinTitle').textContent = '👩‍🏫 老师模式';
      document.getElementById('pinSub').textContent = '请输入4位密码';
      document.getElementById('pinError').textContent = '';
      renderPinDots();
      document.getElementById('modalPin').classList.add('show');
    }
  } else {
    resetStudentRuntimeView();
    currentUser = user;
    localStorage.setItem('wc_user', user);
    document.body.classList.remove('is-teacher');
    updateUserBar();
    showScreen('screenHome');
    loadHome();
  }
}
function renderPinDots() {
  const disp = document.getElementById('pinDisplay');
  disp.innerHTML = '';
  for (let i=0;i<4;i++) {
    const d = document.createElement('div');
    d.className = 'pin-dot' + (i < pinBuffer.length ? ' filled' : '');
    disp.appendChild(d);
  }
}
function pinInput(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  renderPinDots();
  if (pinBuffer.length === 4) {
    setTimeout(async () => {
      if (pinMode === 'verify') {
        if (pinBuffer === appData.pin) {
          resetStudentRuntimeView();
          document.getElementById('modalPin').classList.remove('show');
          currentUser = 'teacher'; localStorage.setItem('wc_user','teacher');
          document.body.classList.add('is-teacher'); updateUserBar(); showScreen('screenHome'); await loadHome();
        } else {
          document.getElementById('pinError').textContent = '密码错误，请重试';
          pinBuffer = ''; renderPinDots();
        }
      } else if (pinMode === 'set1') {
        pinTemp = pinBuffer; pinBuffer = ''; pinMode = 'set2';
        document.getElementById('pinSub').textContent = '再输一次确认密码';
        document.getElementById('pinError').textContent = ''; renderPinDots();
      } else if (pinMode === 'set2') {
        if (pinBuffer === pinTemp) {
          appData.pin = pinBuffer; await saveData(appData);
          resetStudentRuntimeView();
          document.getElementById('modalPin').classList.remove('show');
          currentUser = 'teacher'; localStorage.setItem('wc_user','teacher');
          document.body.classList.add('is-teacher'); updateUserBar(); showScreen('screenHome'); await loadHome();
        } else {
          document.getElementById('pinError').textContent = '两次输入不一致，重新开始';
          pinBuffer = ''; pinTemp = ''; pinMode = 'set1';
          document.getElementById('pinSub').textContent = '首次使用，请设置4位密码';
          renderPinDots();
        }
      }
    }, 120);
  }
}
function pinDel() { pinBuffer = pinBuffer.slice(0,-1); renderPinDots(); document.getElementById('pinError').textContent = ''; }
function cancelPin() { document.getElementById('modalPin').classList.remove('show'); pinBuffer = ''; }

function updateUserBar() {
  ['Teacher','Sister','Brother'].forEach(u => { document.getElementById('uBtn'+u).className = 'user-btn'; });
  const map = {teacher:'Teacher',sister:'Sister',brother:'Brother'};
  const cls = {teacher:'active-teacher',sister:'active-sister',brother:'active-brother'};
  document.getElementById('uBtn'+map[currentUser]).className = 'user-btn '+cls[currentUser];
  const names = {teacher:'👩‍🏫 老师模式',sister:'👧 姐姐模式',brother:'👦 弟弟模式'};
  document.getElementById('homeSubtitle').textContent = isTeacher() ? '选择一个单词本开始管理' : '完成今天的小挑战';
  const modeBadge = document.getElementById('currentModeBadge');
  if (modeBadge) modeBadge.textContent = '当前：' + names[currentUser];
}

function closeAllModals() {
  ['modalRename','modalSync','modalPin','modalPush','modalWordSelector','modalEdit','modalStudentWordCard'].forEach(id => {
    document.getElementById(id).classList.remove('show');
  });
}

function resetStudentRuntimeView() {
  closeAllModals();
  activeTask = null;
  activeTaskDeck = [];
  activeTaskAllCards = [];
  activeTaskReturn = 'home';
  studyDeck = [];
  studyIsGlobal = false;
  studyMode = '';
  dqQuestions = [];
  dqIndex = 0;
  dqCorrect = 0;
  dqWrongList = [];
  dqSelectedOpt = null;
  reviewSteps = [];
  reviewIndex = 0;
  reviewWrongCards = [];
  reviewRound = 1;
  reviewMatchSelection = null;
  reviewMatchPairsDone = 0;
  reviewMatchLocked = false;
  const editPanel = document.getElementById('editPanel');
  const editBtn = document.getElementById('editPanelToggle');
  if (editPanel) editPanel.classList.remove('open');
  if (editBtn) editBtn.classList.remove('active');
}

// ══════════════════════════════════════
