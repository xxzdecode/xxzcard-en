(function registerGrammarChallengeCatalog() {
  // 新增练习时：数据型练习使用 dataPath；复用随堂练习 UI 的独立页面使用 pagePath。
  // lessonKey / kpIds 是长期语法挑战记录与周测、月测汇总的正式映射。
  window.GRAMMAR_CHALLENGE_CATALOG = [
    {
      id: 'grammar-2026-08-02-adverb-review',
      date: '2026-08-02',
      title: '副词侦探快速挑战',
      lessonKey: 'adverb-basics-ly',
      kpIds: ['adverb-basics-ly'],
      questionKpIds: {
        GC01: ['adverb-basics-ly'],
        GC02: ['adverb-basics-ly'],
        GC03: ['adverb-basics-ly'],
        GC04: ['adverb-basics-ly'],
        GC05: ['adverb-basics-ly'],
        GC06: ['adverb-basics-ly'],
        GC07: ['adverb-basics-ly'],
        GC08: ['adverb-basics-ly'],
        GC09: ['adverb-basics-ly'],
        GC10: ['adverb-basics-ly']
      },
      pagePath: './practices/2026-08-02.html'
    },
    {
      id: 'grammar-2026-08-01-adjective-review',
      date: '2026-08-01',
      title: '形容词侦探快速挑战',
      lessonKey: 'adjective-basics-suffixes',
      kpIds: ['adjective-basics-suffixes'],
      questionKpIds: {
        GC01: ['adjective-basics-suffixes'],
        GC02: ['adjective-basics-suffixes'],
        GC03: ['adjective-basics-suffixes'],
        GC04: ['adjective-basics-suffixes'],
        GC05: ['adjective-basics-suffixes'],
        GC06: ['adjective-basics-suffixes'],
        GC07: ['adjective-basics-suffixes'],
        GC08: ['adjective-basics-suffixes'],
        GC09: ['adjective-basics-suffixes'],
        GC10: ['adjective-basics-suffixes']
      },
      pagePath: './practices/2026-08-01.html'
    },
    {
      id: 'grammar-2026-07-31-parts-of-speech-review',
      date: '2026-07-31',
      title: '词性地图快速挑战',
      lessonKey: 'parts-of-speech-map',
      kpIds: ['sentence-parts', 'noun-types', 'adjectives-linking-verbs', 'adverbs'],
      questionKpIds: {
        GC01: ['noun-types', 'sentence-parts'],
        GC02: ['sentence-parts'],
        GC03: ['adjectives-linking-verbs'],
        GC04: ['adverbs'],
        GC05: ['noun-types', 'sentence-parts'],
        GC06: ['noun-types', 'adjectives-linking-verbs', 'adverbs'],
        GC07: ['sentence-parts'],
        GC08: ['sentence-parts', 'noun-types', 'adjectives-linking-verbs', 'adverbs'],
        GC09: ['adjectives-linking-verbs', 'adverbs'],
        GC10: ['sentence-parts', 'noun-types', 'adjectives-linking-verbs', 'adverbs']
      },
      pagePath: './practices/2026-07-31.html'
    },
    {
      id: 'grammar-2026-07-30-possessive-pronouns-review',
      date: '2026-07-30',
      title: 'my 还是 mine？快速挑战',
      lessonKey: 'possessive-pronouns-basic',
      kpIds: ['possessive-pronouns-basic'],
      pagePath: './practices/2026-07-30.html'
    },
    {
      id: 'grammar-2026-07-27-subject-object-review',
      date: '2026-07-27',
      title: '主格 · 宾格复习挑战',
      lessonKey: 'subject-object-pronouns',
      kpIds: ['subject-object-pronouns'],
      pagePath: './practices/2026-07-27.html'
    },
    {
      id: 'grammar-2026-07-26-possessive-whose-of-review',
      date: '2026-07-26',
      title: "'s · Whose · of 复习挑战",
      lessonKey: 'possession-choice',
      kpIds: ['noun-possessive', 'whose-questions', 'of-part-whole'],
      pagePath: './practices/2026-07-26.html'
    },
    {
      id: 'grammar-2026-07-25-can-there-be-it-review',
      date: '2026-07-25',
      title: 'can · there be · it 复习挑战',
      lessonKey: 'can-there-be-it',
      kpIds: ['can', 'there-be', 'impersonal-it'],
      pagePath: './practices/2026-07-25.html'
    },
    {
      id: 'grammar-2026-07-24-frequency-review',
      date: '2026-07-24',
      title: '频度副词复习挑战',
      lessonKey: 'frequency-adverbs',
      kpIds: ['frequency-adverbs', 'how-often'],
      pagePath: './practices/2026-07-24-frequency-review.html'
    },
    {
      id: 'grammar-2026-07-24-special-questions',
      date: '2026-07-24',
      title: '特殊疑问句专项课｜语法挑战',
      lessonKey: 'wh-question-method',
      kpIds: ['wh-question-method', 'what-who-where', 'how-many-much'],
      pagePath: './practices/2026-07-24.html'
    },
    {
      id: 'grammar-2026-07-23-simple-present-2',
      date: '2026-07-23',
      title: '一般现在时第二课｜语法挑战',
      lessonKey: 'simple-present-negative-question',
      kpIds: ['simple-present-use', 'simple-present-negative-question'],
      pagePath: './practices/2026-07-23.html'
    },
    {
      id: 'grammar-2026-07-22-simple-present-1',
      date: '2026-07-22',
      title: '一般现在时第一课｜三单',
      lessonKey: 'third-person-singular',
      kpIds: ['simple-present-use', 'third-person-singular'],
      pagePath: './practices/2026-07-22-corrected.html'
    },
    {
      id: 'grammar-2026-07-17-articles',
      date: '2026-07-17',
      title: '冠词｜a / an / the / 零冠词',
      lessonKey: 'articles',
      kpIds: ['articles'],
      pagePath: './practices/2026-07-17-articles.html'
    },
    {
      id: 'grammar-2026-07-17-nouns-uncountable',
      date: '2026-07-17',
      title: '名词与不可数名词',
      lessonKey: 'countable-uncountable',
      kpIds: ['noun-number', 'countable-uncountable', 'quantifiers', 'prices-measures'],
      pagePath: './practices/2026-07-17.html'
    },
    {
      id: 'grammar-2026-07-16-pronouns-be',
      date: '2026-07-16',
      title: '代词与 be 动词',
      lessonKey: 'subject-pronouns-be',
      kpIds: ['subject-pronouns-be', 'be-positive-negative', 'be-questions-answers'],
      dataPath: './data/2026-07-16.js'
    },
    {
      id: 'grammar-2026-07-15-sentence-skeleton',
      date: '2026-07-15',
      title: '句子骨架与句型变身',
      lessonKey: 'sentence-parts',
      kpIds: ['sentence-parts', 'sentence-be-action-aux'],
      dataPath: './data/2026-07-15.js'
    }
  ];
})();
