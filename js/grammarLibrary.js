function openGrammarLibrary() {
  if (!isTeacher()) return;
  const frame = document.getElementById('grammarLibraryFrame');
  if (!frame.getAttribute('src')) frame.setAttribute('src', 'grammar-library/index.html');
  document.body.classList.add('grammar-library-open');
  showScreen('screenGrammarLibrary');
}

function closeGrammarLibrary() {
  document.body.classList.remove('grammar-library-open');
  returnToTeacherHome();
}
