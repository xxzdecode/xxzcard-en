(function registerGrammarChallengeCatalog() {
  // 新增练习时：数据型练习使用 dataPath；复用随堂练习 UI 的独立页面使用 pagePath。
  window.GRAMMAR_CHALLENGE_CATALOG = [
    {
      id: 'grammar-2026-07-23-simple-present-2',
      date: '2026-07-23',
      title: '一般现在时第二课｜语法挑战',
      pagePath: './practices/2026-07-23.html'
    },
    {
      id: 'grammar-2026-07-22-simple-present-1',
      date: '2026-07-22',
      title: '一般现在时第一课｜三单',
      pagePath: './practices/2026-07-22-corrected.html'
    },
    {
      id: 'grammar-2026-07-17-articles',
      date: '2026-07-17',
      title: '冠词｜a / an / the / 零冠词',
      pagePath: './practices/2026-07-17-articles.html'
    },
    {
      id: 'grammar-2026-07-17-nouns-uncountable',
      date: '2026-07-17',
      title: '名词与不可数名词',
      pagePath: './practices/2026-07-17.html'
    },
    {
      id: 'grammar-2026-07-16-pronouns-be',
      date: '2026-07-16',
      title: '代词与 be 动词',
      dataPath: './data/2026-07-16.js'
    },
    {
      id: 'grammar-2026-07-15-sentence-skeleton',
      date: '2026-07-15',
      title: '句子骨架与句型变身',
      dataPath: './data/2026-07-15.js'
    }
  ];
})();
