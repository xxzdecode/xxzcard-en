// TEACHER COURSEWARE
// Add a standalone HTML file and one item here to publish future courseware.
// Required fields: id, title, description, icon, tone, path.
const COURSEWARE_ITEMS = [
  {
    id: 'sentence-structure-2026-07-15',
    title: '26.07.15',
    description: '句子骨架、句型判断、句型转换与扩句练习',
    icon: 'screen',
    tone: 'purple',
    path: 'courseware/26.07.15.html'
  }
];

const COURSEWARE_ICONS = {
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5v15M8 7h8M8 11h6"/>',
  screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'
};

let activeCoursewareId = '';

function renderCoursewareIcon(icon) {
  const paths = COURSEWARE_ICONS[icon] || COURSEWARE_ICONS.book;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function renderCoursewareList() {
  const list = document.getElementById('coursewareList');
  if (!list) return;
  if (COURSEWARE_ITEMS.length === 0) {
    list.innerHTML = '<div class="courseware-empty">还没有课件</div>';
    return;
  }
  list.innerHTML = COURSEWARE_ITEMS.map(item => `
    <button class="game-entry" type="button" onclick="openCourseware('${item.id}')" aria-label="${item.title}，${item.description}">
      <span class="game-entry__icon game-entry__icon--${item.tone}" aria-hidden="true">
        ${renderCoursewareIcon(item.icon)}
      </span>
      <span class="game-entry__content">
        <span class="game-entry__title">${item.title}</span>
        <span class="game-entry__description">${item.description}</span>
      </span>
    </button>
  `).join('');
}

function openCoursewareList() {
  if (!isTeacher()) return;
  renderCoursewareList();
  showScreen('screenCourseware');
}

function openCourseware(id) {
  if (!isTeacher()) return;
  const item = COURSEWARE_ITEMS.find(entry => entry.id === id);
  if (!item) return;
  const title = document.getElementById('coursewareTitle');
  const frame = document.getElementById('coursewareFrame');
  activeCoursewareId = id;
  if (title) title.textContent = item.title;
  if (frame) frame.src = item.path;
  document.body.classList.add('courseware-open');
  showScreen('screenCoursewarePlayer');
}

function closeCourseware() {
  const frame = document.getElementById('coursewareFrame');
  activeCoursewareId = '';
  if (frame) frame.src = 'about:blank';
  document.body.classList.remove('courseware-open');
  renderCoursewareList();
  showScreen('screenCourseware');
}
