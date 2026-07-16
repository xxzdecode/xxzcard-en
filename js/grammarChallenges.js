let activeGrammarChallengeId = '';

function getGrammarChallengeCatalog() {
  const catalog = Array.isArray(window.GRAMMAR_CHALLENGE_CATALOG)
    ? window.GRAMMAR_CHALLENGE_CATALOG
    : [];
  return [...catalog]
    .filter(item => item && item.id && item.date && item.title)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function createGrammarChallengeEntry(challenge) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'grammar-challenge-list-entry';
  button.setAttribute('aria-label', `${challenge.date}，${challenge.title}`);

  const date = document.createElement('span');
  date.className = 'grammar-challenge-list-entry__date';
  date.textContent = challenge.date;

  const title = document.createElement('span');
  title.className = 'grammar-challenge-list-entry__title';
  title.textContent = challenge.title;

  const arrow = document.createElement('span');
  arrow.className = 'grammar-challenge-list-entry__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '›';

  button.append(date, title, arrow);
  button.addEventListener('click', () => openGrammarChallenge(challenge.id));
  return button;
}

function renderGrammarChallengeList() {
  const list = document.getElementById('grammarChallengeList');
  if (!list) return;
  list.innerHTML = '';
  const catalog = getGrammarChallengeCatalog();
  if (catalog.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'grammar-challenge-empty';
    empty.textContent = '暂时还没有发布语法挑战。';
    list.appendChild(empty);
    return;
  }
  catalog.forEach(challenge => list.appendChild(createGrammarChallengeEntry(challenge)));
}

function openGrammarChallengeList() {
  if (isTeacher()) return;
  renderGrammarChallengeList();
  showScreen('screenGrammarChallenges');
}

function closeGrammarChallengeList() {
  showScreen('screenHome');
  loadHome();
}

function openGrammarChallenge(id) {
  if (isTeacher()) return;
  const challenge = getGrammarChallengeCatalog().find(item => item.id === id);
  if (!challenge) return;
  const title = document.getElementById('grammarChallengeTitle');
  const frame = document.getElementById('grammarChallengeFrame');
  activeGrammarChallengeId = challenge.id;
  if (title) title.textContent = challenge.title;
  if (frame) frame.src = `grammar-challenge/index.html?practice=${encodeURIComponent(challenge.id)}&embedded=1`;
  document.body.classList.add('grammar-challenge-open');
  showScreen('screenGrammarChallengePlayer');
}

function unloadGrammarChallenge() {
  const frame = document.getElementById('grammarChallengeFrame');
  activeGrammarChallengeId = '';
  if (frame) frame.src = 'about:blank';
  document.body.classList.remove('grammar-challenge-open');
}

function closeGrammarChallenge() {
  unloadGrammarChallenge();
  renderGrammarChallengeList();
  showScreen('screenGrammarChallenges');
}

function isGrammarChallengeMessageOrigin(origin) {
  if (window.location.protocol === 'file:') return origin === 'null';
  return origin === window.location.origin;
}

window.addEventListener('message', event => {
  const frame = document.getElementById('grammarChallengeFrame');
  if (!frame || event.source !== frame.contentWindow || !isGrammarChallengeMessageOrigin(event.origin)) return;
  const message = event.data;
  if (!message || message.type !== 'grammar-challenge-navigation' || !activeGrammarChallengeId) return;
  if (message.target === 'directory') {
    closeGrammarChallenge();
    return;
  }
  if (message.target === 'home') {
    unloadGrammarChallenge();
    showScreen('screenHome');
    loadHome();
  }
});
