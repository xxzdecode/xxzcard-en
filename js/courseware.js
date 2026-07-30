// TEACHER CLASSROOM PRACTICE
// Keep COURSEWARE_ITEMS as a compatibility alias for historical data files.
const CLASSROOM_PRACTICE_ITEMS = Array.isArray(window.CLASSROOM_PRACTICE_ITEMS)
  ? window.CLASSROOM_PRACTICE_ITEMS
  : (Array.isArray(window.COURSEWARE_ITEMS) ? window.COURSEWARE_ITEMS : []);
const COURSEWARE_ITEMS = CLASSROOM_PRACTICE_ITEMS;

const COURSEWARE_ICONS = {
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15M8 7h8M8 11h6"/>',
  screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'
};

let activeCoursewareId = '';
let coursewareCompletionObserver = null;
let studentCoursewareCompletionSaving = false;

const STUDENT_CLASSROOM_PRACTICE_KEY_PREFIX = 'classroom_practice_daily_v1_';

function studentClassroomPracticeDate() {
  if (typeof todayISO === 'function') return todayISO();
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function studentClassroomPracticeKey(user) {
  return STUDENT_CLASSROOM_PRACTICE_KEY_PREFIX + (user === 'brother' ? 'brother' : 'sister');
}

async function loadStudentClassroomPracticeRecord(user, date) {
  const student = user || currentUser;
  if (!['sister', 'brother'].includes(student)) return null;
  const records = await sbGet(studentClassroomPracticeKey(student));
  const record = records && typeof records === 'object'
    ? records[date || studentClassroomPracticeDate()]
    : null;
  return record && typeof record === 'object' ? record : null;
}

async function saveStudentClassroomPracticeRecord(record) {
  if (isTeacher() || !canWriteCloudData()) return false;
  const key = studentClassroomPracticeKey(currentUser);
  const records = await sbGet(key);
  const next = records && typeof records === 'object' ? records : {};
  next[studentClassroomPracticeDate()] = record;
  try {
    await sbSet(key, next);
    return true;
  } catch (error) {
    showStorageError(error);
    return false;
  }
}

function renderCoursewareIcon(icon) {
  const paths = COURSEWARE_ICONS[icon] || COURSEWARE_ICONS.book;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function coursewareAvailability(item, record) {
  if (isTeacher() || !record) return { disabled: false, label: '' };
  if (record.practiceId !== item.id) return { disabled: true, label: '今日已安排其他练习' };
  if (record.status === 'completed') return { disabled: true, label: '今日已完成' };
  return { disabled: false, label: '继续今日练习' };
}

function renderCoursewareList(studentRecord) {
  const list = document.getElementById('coursewareList');
  if (!list) return;
  if (COURSEWARE_ITEMS.length === 0) {
    list.innerHTML = '<div class="courseware-empty">还没有随堂练习</div>';
    return;
  }
  list.innerHTML = COURSEWARE_ITEMS.map(item => {
    const availability = coursewareAvailability(item, studentRecord);
    return `
    <button class="game-entry${availability.disabled ? ' game-entry--daily-locked' : ''}" type="button"
      onclick="openCourseware('${item.id}')" aria-label="${item.title}，${item.description}${availability.label ? `，${availability.label}` : ''}"
      ${availability.disabled ? 'disabled' : ''}>
      <span class="game-entry__icon game-entry__icon--${item.tone}" aria-hidden="true">
        ${renderCoursewareIcon(item.icon)}
      </span>
      <span class="game-entry__content">
        <span class="game-entry__title">${item.title}</span>
        <span class="game-entry__description">${item.description}</span>
        ${availability.label ? `<span class="game-entry__daily-status">${availability.label}</span>` : ''}
      </span>
    </button>
  `;
  }).join('');
}

async function openCoursewareList() {
  if (!isTeacher() && typeof window.openStudentClassroomPractice === 'function') {
    return window.openStudentClassroomPractice();
  }
  const studentRecord = isTeacher() ? null : await loadStudentClassroomPracticeRecord();
  const listTitle = document.getElementById('coursewareListTitle');
  const bookTitle = document.getElementById('coursewareBookTitle');
  if (listTitle) listTitle.textContent = isTeacher() ? '随堂练习' : '今日随堂练习';
  if (bookTitle) {
    bookTitle.textContent = isTeacher()
      ? '随堂练习目录'
      : studentRecord && studentRecord.status === 'completed'
        ? '今天已经完成'
        : studentRecord
          ? '继续今天的练习'
          : '正在读取今日安排';
  }
  renderCoursewareList(studentRecord);
  showScreen('screenCourseware');
}

async function openCourseware(id) {
  const item = COURSEWARE_ITEMS.find(entry => entry.id === id);
  if (!item) return;
  if (!isTeacher()) {
    const route = typeof window.getDailyLearningRoute === 'function'
      ? window.getDailyLearningRoute()
      : null;
    const assigned = route && route.classroomPractice;
    if (assigned && assigned.id && assigned.id !== item.id) {
      alert('这不是今天安排的随堂练习，请从首页重新进入。');
      return;
    }

    let record = await loadStudentClassroomPracticeRecord();
    if (record && record.status === 'completed') {
      alert('今天的随堂练习已经完成，明天再来完成新的练习吧！');
      return;
    }
    if (record && record.practiceId !== id) {
      alert('今天已经安排了其他随堂练习，一天只能完成一项。');
      return;
    }
    if (!record) {
      record = {
        practiceId: item.id,
        lessonKey: assigned && assigned.lessonKey ? assigned.lessonKey : '',
        routeUpdatedAt: route && route.updatedAt ? route.updatedAt : '',
        title: item.title,
        status: 'started',
        startedAt: new Date().toISOString(),
        completedAt: ''
      };
      if (!await saveStudentClassroomPracticeRecord(record)) return;
    }
  }
  const title = document.getElementById('coursewareTitle');
  const frame = document.getElementById('coursewareFrame');
  activeCoursewareId = id;
  if (title) title.textContent = item.title;
  if (frame) {
    frame.onload = handleCoursewareFrameLoad;
    frame.src = item.path;
  }
  document.body.classList.add('courseware-open');
  showScreen('screenCoursewarePlayer');
}

function coursewareDocumentIsComplete(doc) {
  const dialog = doc && doc.getElementById('completionDialog');
  if (dialog) {
    if (dialog.dataset && dialog.dataset.complete === 'true') return true;
    if ((!dialog.hasAttribute('data-complete')) && (dialog.open || dialog.hasAttribute('open'))) return true;
  }
  const finishTitle = doc && doc.querySelector('.finish h2');
  return Boolean(finishTitle && finishTitle.textContent.includes('全部完成'));
}

async function markStudentCoursewareCompleted() {
  if (isTeacher() || studentCoursewareCompletionSaving || !activeCoursewareId) return;
  const completedCoursewareId = activeCoursewareId;
  studentCoursewareCompletionSaving = true;
  try {
    const record = await loadStudentClassroomPracticeRecord();
    if (record && record.practiceId === completedCoursewareId && record.status !== 'completed') {
      await saveStudentClassroomPracticeRecord({
        ...record,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    }
  } finally {
    studentCoursewareCompletionSaving = false;
  }
}

function handleCoursewareFrameLoad() {
  if (coursewareCompletionObserver) coursewareCompletionObserver.disconnect();
  coursewareCompletionObserver = null;
  if (isTeacher()) return;
  const frame = document.getElementById('coursewareFrame');
  const doc = frame && frame.contentDocument;
  if (!doc) return;
  ['newRoundButton', 'restartButton', 'retryButton'].forEach(id => {
    const button = doc.getElementById(id);
    if (button) {
      button.disabled = true;
      button.hidden = true;
    }
  });
  const check = () => {
    if (!coursewareDocumentIsComplete(doc)) return;
    if (coursewareCompletionObserver) coursewareCompletionObserver.disconnect();
    coursewareCompletionObserver = null;
    markStudentCoursewareCompleted();
  };
  check();
  if (typeof MutationObserver === 'function' && !coursewareDocumentIsComplete(doc)) {
    coursewareCompletionObserver = new MutationObserver(check);
    coursewareCompletionObserver.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-complete', 'open']
    });
  }
}

async function closeCourseware() {
  const frame = document.getElementById('coursewareFrame');
  if (coursewareCompletionObserver) coursewareCompletionObserver.disconnect();
  coursewareCompletionObserver = null;
  activeCoursewareId = '';
  if (frame) {
    frame.onload = null;
    frame.src = 'about:blank';
  }
  document.body.classList.remove('courseware-open');
  if (isTeacher()) {
    await openCoursewareList();
    return;
  }
  showScreen('screenHome');
  await loadHome();
}

function closeCoursewareList() {
  showScreen('screenHome');
  loadHome();
}
