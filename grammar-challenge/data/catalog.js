(function registerGrammarChallengeCatalog() {
  // 新增练习时：数据型练习使用 dataPath；复用随堂练习 UI 的独立页面使用 pagePath。
  // lessonKey / kpIds 是长期语法挑战记录映射。若题目用于恢复正式薄弱项，还要逐题提供
  // questionWeaknessIds、questionPrimaryWeaknessIds、questionDiagnosticTargets 和 questionContentHashes；
  // 缺少这些精确字段的旧题只参与普通练习统计，不作为 mastered 判定证据。
  window.GRAMMAR_CHALLENGE_CATALOG = [
    {
      id: 'grammar-2026-08-28-parts-of-speech-review',
      date: '2026-08-28',
      title: '词性与句子成分英语标签复习挑战',
      lessonKey: 'parts-of-speech-map',
      kpIds: ['parts-of-speech-map', 'sentence-parts', 'sentence-be-action-aux', 'noun-types', 'adjective-basics-suffixes', 'adverb-basics-ly'],
      questionKpIds: {
        GC01: ['parts-of-speech-map'],
        GC02: ['adjective-basics-suffixes'],
        GC03: ['sentence-be-action-aux'],
        GC04: ['sentence-parts'],
        GC05: ['adverb-basics-ly'],
        GC06: ['parts-of-speech-map', 'noun-types', 'sentence-parts'],
        GC07: ['parts-of-speech-map', 'noun-types', 'sentence-parts'],
        GC08: ['sentence-be-action-aux'],
        GC09: ['parts-of-speech-map'],
        GC10: ['sentence-parts']
      },
      questionWeaknessIds: {
        GC03: ['sister.sentence-be-action-aux.modal-can-predicate'],
        GC04: ['brother.sentence-parts.subject-boundary-no-object-discrimination']
      },
      questionPrimaryWeaknessIds: {
        GC03: 'sister.sentence-be-action-aux.modal-can-predicate',
        GC04: 'brother.sentence-parts.subject-boundary-no-object-discrimination'
      },
      questionDiagnosticTargets: {
        GC03: ['modal-can-predicate', 'modal-plus-base-verb'],
        GC04: ['complete-subject-boundary', 'no-object-discrimination']
      },
      questionContentHashes: {
        GC03: 'sha256:c5e124d26e23d167d267b3ada616f1e70805eb973d36579ab75c39f7ea176210',
        GC04: 'sha256:02a1c94a39b5e972116b5e443986064837c43e4d498f1958eb2f5e0b5f8b51e9'
      },
      pagePath: './practices/2026-08-28.html'
    },
    {
      id: 'grammar-2026-08-27-cardinal-ordinal-review',
      date: '2026-08-27',
      title: '基数词与序数词基础复习挑战',
      lessonKey: 'cardinal-ordinal-numbers-basics',
      kpIds: ['cardinal-ordinal-numbers-basics', 'sentence-parts', 'noun-types'],
      questionKpIds: {
        GC01: ['cardinal-ordinal-numbers-basics'],
        GC02: ['cardinal-ordinal-numbers-basics'],
        GC03: ['sentence-parts'],
        GC04: ['noun-types'],
        GC05: ['cardinal-ordinal-numbers-basics'],
        GC06: ['cardinal-ordinal-numbers-basics'],
        GC07: ['cardinal-ordinal-numbers-basics'],
        GC08: ['cardinal-ordinal-numbers-basics'],
        GC09: ['cardinal-ordinal-numbers-basics'],
        GC10: ['cardinal-ordinal-numbers-basics']
      },
      pagePath: './practices/2026-08-27.html'
    },
    {
      id: 'grammar-2026-08-26-adverb-review',
      date: '2026-08-26',
      title: '方式副词与 -ly 线索复习挑战',
      lessonKey: 'adverb-basics-ly',
      kpIds: ['adverb-basics-ly', 'sentence-parts', 'simple-present-use'],
      questionKpIds: {
        GC01: ['adverb-basics-ly'],
        GC02: ['adverb-basics-ly'],
        GC03: ['adverb-basics-ly'],
        GC04: ['adverb-basics-ly'],
        GC05: ['adverb-basics-ly'],
        GC06: ['adverb-basics-ly'],
        GC07: ['adverb-basics-ly'],
        GC08: ['adverb-basics-ly'],
        GC09: ['sentence-parts'],
        GC10: ['simple-present-use']
      },
      pagePath: './practices/2026-08-26.html'
    },
    {
      id: 'grammar-2026-08-25-place-prepositions-review',
      date: '2026-08-25',
      title: '地点介词上与下复习挑战',
      lessonKey: 'place-prepositions-on-over-above-under-below',
      kpIds: ['place-prepositions-on-over-above-under-below', 'sentence-parts'],
      questionKpIds: {
        GC01: ['place-prepositions-on-over-above-under-below'],
        GC02: ['place-prepositions-on-over-above-under-below'],
        GC03: ['place-prepositions-on-over-above-under-below'],
        GC04: ['place-prepositions-on-over-above-under-below'],
        GC05: ['place-prepositions-on-over-above-under-below'],
        GC06: ['place-prepositions-on-over-above-under-below'],
        GC07: ['place-prepositions-on-over-above-under-below'],
        GC08: ['place-prepositions-on-over-above-under-below'],
        GC09: ['sentence-parts'],
        GC10: ['sentence-parts']
      },
      pagePath: './practices/2026-08-25.html'
    },
    {
      id: 'grammar-2026-08-24-why-because-so-review',
      date: '2026-08-24',
      title: 'why / because / so 复习挑战',
      lessonKey: 'why-because-so',
      kpIds: ['why-because-so', 'wh-question-method', 'simple-present-negative-question'],
      questionKpIds: {
        GC01: ['why-because-so'],
        GC02: ['why-because-so'],
        GC03: ['wh-question-method'],
        GC04: ['simple-present-negative-question'],
        GC05: ['why-because-so'],
        GC06: ['why-because-so'],
        GC07: ['why-because-so'],
        GC08: ['why-because-so'],
        GC09: ['why-because-so'],
        GC10: ['why-because-so']
      },
      pagePath: './practices/2026-08-24.html'
    },
    {
      id: 'grammar-2026-08-23-although-review',
      date: '2026-08-23',
      title: 'although 让步转折复习挑战',
      lessonKey: 'although',
      kpIds: ['although', 'sentence-parts'],
      questionKpIds: {
        GC01: ['although'],
        GC02: ['although'],
        GC03: ['sentence-parts'],
        GC04: ['sentence-parts'],
        GC05: ['although'],
        GC06: ['although'],
        GC07: ['although'],
        GC08: ['although'],
        GC09: ['although'],
        GC10: ['although']
      },
      pagePath: './practices/2026-08-23.html'
    },
    {
      id: 'grammar-2026-08-22-adjectives-linking-verbs-review',
      date: '2026-08-22',
      title: '形容词与系动词复习挑战',
      lessonKey: 'adjectives-linking-verbs',
      kpIds: ['adjectives-linking-verbs', 'sentence-parts'],
      questionKpIds: {
        GC01: ['adjectives-linking-verbs'],
        GC02: ['adjectives-linking-verbs'],
        GC03: ['sentence-parts'],
        GC04: ['sentence-parts'],
        GC05: ['adjectives-linking-verbs'],
        GC06: ['adjectives-linking-verbs'],
        GC07: ['adjectives-linking-verbs'],
        GC08: ['adjectives-linking-verbs'],
        GC09: ['adjectives-linking-verbs'],
        GC10: ['adjectives-linking-verbs']
      },
      questionWeaknessIds: {
        GC03: ['brother.sentence-parts.copular-predicate'],
        GC04: ['brother.sentence-parts.copular-predicate']
      },
      questionPrimaryWeaknessIds: {
        GC03: 'brother.sentence-parts.copular-predicate',
        GC04: 'brother.sentence-parts.copular-predicate'
      },
      questionDiagnosticTargets: {
        GC03: ['copular-predicate', 'be-plus-adjective-state-predicate'],
        GC04: ['copular-predicate', 'plural-subject-be-adjective-predicate']
      },
      questionContentHashes: {
        GC03: 'sha256:e3112ae424b26db225926df8b217b1a62ac9120758b2e84c6599ce0615bb64d9',
        GC04: 'sha256:54d41f0d80055bc82ef0419562773a5f88dbfbcf32f343ae9920341727123ae9'
      },
      pagePath: './practices/2026-08-22.html'
    },
    {
      id: 'grammar-2026-08-21-pronoun-system-review',
      date: '2026-08-21',
      title: '人称代词系统复习挑战',
      lessonKey: 'pronoun-system',
      kpIds: ['pronoun-system', 'subject-pronouns-be'],
      questionKpIds: {
        GC01: ['subject-pronouns-be'],
        GC02: ['subject-pronouns-be'],
        GC03: ['pronoun-system'],
        GC04: ['pronoun-system'],
        GC05: ['pronoun-system'],
        GC06: ['pronoun-system'],
        GC07: ['pronoun-system'],
        GC08: ['pronoun-system'],
        GC09: ['pronoun-system'],
        GC10: ['pronoun-system']
      },
      questionWeaknessIds: {
        GC01: ['brother.subject-pronouns-be.subject-to-pronoun-person-mapping'],
        GC02: ['brother.subject-pronouns-be.subject-to-pronoun-person-mapping']
      },
      questionPrimaryWeaknessIds: {
        GC01: 'brother.subject-pronouns-be.subject-to-pronoun-person-mapping',
        GC02: 'brother.subject-pronouns-be.subject-to-pronoun-person-mapping'
      },
      questionDiagnosticTargets: {
        GC01: ['plural-noun-subject-to-they', 'subject-pronoun-selection'],
        GC02: ['compound-subject-with-i-to-we', 'subject-pronoun-selection']
      },
      questionContentHashes: {
        GC01: 'sha256:54858e65bd2c9a35fa728e006d4937ebef36273177810452974d7f28b36b70af',
        GC02: 'sha256:fd47a2e5e4c6dbf2ef5ac7f6c6d923188bf223144e6ef4d9b2732b2963346d48'
      },
      pagePath: './practices/2026-08-21.html'
    },
    {
      id: 'grammar-2026-08-20-although-review',
      date: '2026-08-20',
      title: 'although 让步转折复习挑战',
      lessonKey: 'although',
      kpIds: ['although', 'subject-pronouns-be', 'third-person-singular'],
      questionKpIds: {
        GC01: ['although'],
        GC02: ['although'],
        GC03: ['although'],
        GC04: ['although'],
        GC05: ['although'],
        GC06: ['although'],
        GC07: ['although'],
        GC08: ['although'],
        GC09: ['subject-pronouns-be'],
        GC10: ['third-person-singular']
      },
      questionWeaknessIds: {
        GC09: ['brother.subject-pronouns-be.subject-to-pronoun-person-mapping'],
        GC10: ['brother.third-person-singular.identify-third-person-singular-subject']
      },
      questionPrimaryWeaknessIds: {
        GC09: 'brother.subject-pronouns-be.subject-to-pronoun-person-mapping',
        GC10: 'brother.third-person-singular.identify-third-person-singular-subject'
      },
      questionDiagnosticTargets: {
        GC09: ['first-person-plural-we', 'subject-to-pronoun-mapping'],
        GC10: ['identify-third-person-singular', 'noun-phrase-to-she']
      },
      questionContentHashes: {
        GC09: 'sha256:1dd5275f2eebb3e233d0a1aad1eaafd91c220de618517050479aeaf54dd26deb',
        GC10: 'sha256:3b546d9f2e334609d0b20af7d7a8bf980ebd502d51b03a53b8d5b4bf3d8010af'
      },
      pagePath: './practices/2026-08-20.html'
    },
    {
      id: 'grammar-2026-08-19-why-because-so-review',
      date: '2026-08-19',
      title: 'why / because / so 复习挑战',
      lessonKey: 'why-because-so',
      kpIds: ['why-because-so', 'sentence-parts', 'sentence-be-action-aux'],
      questionKpIds: {
        GC01: ['why-because-so'],
        GC02: ['why-because-so'],
        GC03: ['why-because-so'],
        GC04: ['why-because-so'],
        GC05: ['why-because-so'],
        GC06: ['why-because-so'],
        GC07: ['why-because-so'],
        GC08: ['why-because-so'],
        GC09: ['sentence-parts'],
        GC10: ['sentence-be-action-aux']
      },
      questionWeaknessIds: {
        GC09: ['brother.sentence-parts.time-adjunct'],
        GC10: ['brother.sentence-be-action-aux.modal-can-predicate']
      },
      questionPrimaryWeaknessIds: {
        GC09: 'brother.sentence-parts.time-adjunct',
        GC10: 'brother.sentence-be-action-aux.modal-can-predicate'
      },
      questionDiagnosticTargets: {
        GC09: ['identify-time-adjunct', 'separate-core-from-time-information'],
        GC10: ['modal-can-predicate', 'can-plus-base-verb']
      },
      questionContentHashes: {
        GC09: 'sha256:2181b2891237df26e71c992dcd7b4e3426e370866cbf0b0b762f85011f0492eb',
        GC10: 'sha256:39546873c903eddc1689a402274e85ace5e2580c9f2137d169ad7c5d8d6c75cc'
      },
      pagePath: './practices/2026-08-19.html'
    },
    {
      id: 'grammar-2026-08-18-place-prepositions-review',
      date: '2026-08-18',
      title: '地点介词上与下复习挑战',
      lessonKey: 'place-prepositions-on-over-above-under-below',
      kpIds: ['place-prepositions-on-over-above-under-below', 'subject-pronouns-be', 'sentence-parts'],
      questionKpIds: {
        GC01: ['place-prepositions-on-over-above-under-below'],
        GC02: ['place-prepositions-on-over-above-under-below'],
        GC03: ['place-prepositions-on-over-above-under-below'],
        GC04: ['place-prepositions-on-over-above-under-below'],
        GC05: ['place-prepositions-on-over-above-under-below'],
        GC06: ['place-prepositions-on-over-above-under-below'],
        GC07: ['place-prepositions-on-over-above-under-below'],
        GC08: ['place-prepositions-on-over-above-under-below'],
        GC09: ['subject-pronouns-be'],
        GC10: ['sentence-parts']
      },
      questionWeaknessIds: {
        GC09: ['brother.subject-pronouns-be.subject-to-pronoun-person-mapping'],
        GC10: ['brother.sentence-parts.subject-boundary-no-object-discrimination']
      },
      questionPrimaryWeaknessIds: {
        GC09: 'brother.subject-pronouns-be.subject-to-pronoun-person-mapping',
        GC10: 'brother.sentence-parts.subject-boundary-no-object-discrimination'
      },
      questionDiagnosticTargets: {
        GC09: ['plural-noun-subject-to-they', 'subject-pronoun-person-mapping'],
        GC10: ['complete-subject-boundary', 'intransitive-no-object', 'place-adjunct-not-object']
      },
      questionContentHashes: {
        GC09: 'sha256:693cac4eda4888edbaab0c61d76e451576cd7a0da1523b92337f663743265cc8',
        GC10: 'sha256:1c5177ee9eebc1b139e54aa77a0838eba045469b38a83a53d83b64c4b23a2741'
      },
      pagePath: './practices/2026-08-18.html'
    },
    {
      id: 'grammar-2026-08-06-time-prepositions-review',
      date: '2026-08-06',
      title: '时间介词快速挑战',
      lessonKey: 'time-prepositions-in-on-at',
      kpIds: ['time-prepositions-in-on-at'],
      questionKpIds: {
        GC01: ['time-prepositions-in-on-at'],
        GC02: ['time-prepositions-in-on-at'],
        GC03: ['time-prepositions-in-on-at'],
        GC04: ['time-prepositions-in-on-at'],
        GC05: ['time-prepositions-in-on-at'],
        GC06: ['time-prepositions-in-on-at'],
        GC07: ['time-prepositions-in-on-at'],
        GC08: ['time-prepositions-in-on-at'],
        GC09: ['time-prepositions-in-on-at'],
        GC10: ['time-prepositions-in-on-at']
      },
      pagePath: './practices/2026-08-06.html'
    },
    {
      id: 'grammar-2026-08-04-cardinal-ordinal-review',
      date: '2026-08-04',
      title: '数字排队快速挑战',
      lessonKey: 'cardinal-ordinal-numbers-basics',
      kpIds: ['cardinal-ordinal-numbers-basics'],
      questionKpIds: {
        GC01: ['cardinal-ordinal-numbers-basics'],
        GC02: ['cardinal-ordinal-numbers-basics'],
        GC03: ['cardinal-ordinal-numbers-basics'],
        GC04: ['cardinal-ordinal-numbers-basics'],
        GC05: ['cardinal-ordinal-numbers-basics'],
        GC06: ['cardinal-ordinal-numbers-basics'],
        GC07: ['cardinal-ordinal-numbers-basics'],
        GC08: ['cardinal-ordinal-numbers-basics'],
        GC09: ['cardinal-ordinal-numbers-basics'],
        GC10: ['cardinal-ordinal-numbers-basics']
      },
      pagePath: './practices/2026-08-04.html'
    },
    {
      id: 'grammar-2026-08-03-word-family-review',
      date: '2026-08-03',
      title: '词族侦探快速挑战',
      lessonKey: 'word-family-basics',
      kpIds: ['word-family-basics'],
      questionKpIds: {
        GC01: ['word-family-basics'],
        GC02: ['word-family-basics'],
        GC03: ['word-family-basics'],
        GC04: ['word-family-basics'],
        GC05: ['word-family-basics'],
        GC06: ['word-family-basics'],
        GC07: ['word-family-basics'],
        GC08: ['word-family-basics'],
        GC09: ['word-family-basics'],
        GC10: ['word-family-basics']
      },
      pagePath: './practices/2026-08-03.html'
    },
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
