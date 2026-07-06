const THEME_QUIZZES = [
  {
    id: 'third-person-sort',
    page: '01',
    title: '三单变位分类',
    path: 'quizzes/third-person-sort.html'
  }
];

function renderThemeQuizList() {
  const list = document.getElementById('themeQuizList');
  if (!list) return;
  list.innerHTML = THEME_QUIZZES.map(quiz => `
    <button class="practice-page-btn" onclick="openThemeQuiz('${quiz.id}')">
      <span class="practice-page-num">${quiz.page}</span>
      <span class="practice-page-name">${quiz.title}</span>
    </button>
  `).join('');
}

function openThemeQuizList() {
  if (isTeacher()) return;
  renderThemeQuizList();
  showScreen('screenThemeQuizzes');
}

function openThemeQuiz(id) {
  const quiz = THEME_QUIZZES.find(item => item.id === id);
  if (!quiz) return;
  const title = document.getElementById('themeQuizTitle');
  const frame = document.getElementById('themeQuizFrame');
  if (title) title.textContent = quiz.title;
  if (frame) frame.src = quiz.path;
  showScreen('screenThemeQuizPlayer');
}

function closeThemeQuiz() {
  const frame = document.getElementById('themeQuizFrame');
  if (frame) frame.src = 'about:blank';
  showScreen('screenThemeQuizzes');
}
