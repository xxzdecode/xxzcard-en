const WORD_DEDUPE_PATH = 'tools/word-dedupe/index.html?embedded=1';

function openWordDedupe() {
  if (!isTeacher()) return;

  const frame = document.getElementById('wordDedupeFrame');
  if (!frame) return;

  const currentSrc = frame.getAttribute('src');
  if (!currentSrc || currentSrc === 'about:blank') {
    frame.src = WORD_DEDUPE_PATH;
  }

  document.body.classList.add('word-dedupe-open');
  showScreen('screenWordDedupe');
}

async function closeWordDedupe() {
  document.body.classList.remove('word-dedupe-open');
  await openTeacherWordCards();
}
