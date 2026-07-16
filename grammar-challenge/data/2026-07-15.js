(function registerGrammarChallengePractice() {
  // 这份文件只保存当天练习内容；页面、导航、判分和结果复盘都由通用骨架负责。
  window.GRAMMAR_CHALLENGE_PRACTICE = {
    id: 'grammar-2026-07-15-sentence-skeleton',
    date: '2026-07-15',
    title: '句子骨架与句型变身',
    studentTip: '先找主语和谓语，再判断是 be 动词句、实义动词句还是 can 句。',
    knowledgePoints: [
      '句子骨架',
      'be 动词句',
      '实义动词句',
      'can 句',
      'do / does',
      'does + 动词原形',
      '否定句',
      '一般疑问句',
      '扩句与语序'
    ],
    questions: [
      {
        id: 'q1',
        section: '快速判断',
        type: 'choice',
        mode: 'single',
        label: '找主语',
        prompt: '哪一部分是句子的核心主语？',
        sentence: 'The two boys beside the window read comic books after lunch.',
        hint: '先暂时拿开地点和时间信息，再找“谁”。',
        options: ['The two boys', 'beside the window', 'read comic books', 'after lunch'],
        correctAnswer: ['The two boys'],
        knowledgePoints: ['句子骨架'],
        explanation: 'beside the window 只是补充位置。真正做动作的是 The two boys。'
      },
      {
        id: 'q2',
        section: '快速判断',
        type: 'choice',
        mode: 'multiple',
        label: '找完整谓语',
        prompt: '点击共同构成谓语的词块。',
        sentence: 'Grace can carry the big bag by herself.',
        hint: '本题有 2 个正确词块。',
        options: ['Grace', 'can', 'carry', 'the big bag', 'by herself'],
        correctAnswer: ['can', 'carry'],
        knowledgePoints: ['句子骨架', 'can 句'],
        explanation: 'can 和后面的动词原形 carry 要一起看，完整谓语是 can carry。'
      },
      {
        id: 'q3',
        section: '快速判断',
        type: 'choice',
        mode: 'multiple',
        label: '找补充信息',
        prompt: '哪些部分属于补充信息？',
        sentence: 'Our father usually cooks dinner in the kitchen.',
        hint: '可以多选。频率和地点通常是补充信息。',
        options: ['Our father', 'usually', 'cooks', 'dinner', 'in the kitchen'],
        correctAnswer: ['usually', 'in the kitchen'],
        knowledgePoints: ['句子骨架', '扩句与语序'],
        explanation: 'usually 说明频率，in the kitchen 说明地点；主干是 Our father cooks dinner。'
      },
      {
        id: 'q4',
        section: '骨架与句型',
        type: 'choice',
        mode: 'single',
        label: '判断句型',
        prompt: '这个句子属于哪一类？',
        sentence: 'The classroom is quiet after lunch.',
        options: ['be 动词句', '实义动词句', 'can 句'],
        correctAnswer: ['be 动词句'],
        knowledgePoints: ['be 动词句'],
        explanation: '句子的核心是 The classroom is quiet，使用了 be 动词 is。'
      },
      {
        id: 'q5',
        section: '骨架与句型',
        type: 'choice',
        mode: 'single',
        label: '提取句子骨架',
        prompt: '哪个是这个长句的核心骨架？',
        sentence: 'The girl near the school gate brings a blue umbrella every morning.',
        hint: '把地点和时间暂时拿开。',
        options: [
          'The girl brings a blue umbrella.',
          'The school gate brings an umbrella.',
          'The girl near the school gate.',
          'Brings a blue umbrella every morning.'
        ],
        correctAnswer: ['The girl brings a blue umbrella.'],
        knowledgePoints: ['句子骨架', '实义动词句'],
        explanation: 'near the school gate 和 every morning 都是补充信息，主干是 The girl brings a blue umbrella。'
      },
      {
        id: 'q6',
        section: '句型变身',
        type: 'choice',
        mode: 'single',
        label: '变否定句',
        prompt: '选择正确的否定句。',
        sentence: 'Nina studies English after dinner.',
        options: [
          'Nina is not study English after dinner.',
          'Nina does not study English after dinner.',
          'Nina does not studies English after dinner.',
          'Nina not studies English after dinner.'
        ],
        correctAnswer: ['Nina does not study English after dinner.'],
        knowledgePoints: ['实义动词句', 'do / does', 'does + 动词原形', '否定句'],
        explanation: 'Nina 是三单主语，否定句用 does not；does 出现后，studies 要恢复成 study。'
      },
      {
        id: 'q7',
        section: '句型变身',
        type: 'order',
        label: '词块排序',
        prompt: '把肯定句变成一般疑问句。',
        sentence: 'Leo washes his hands before dinner.',
        hint: '点击词块，按正确顺序放进答题区。',
        tokens: ['his hands', 'wash', 'Does', 'before dinner', 'Leo', '?'],
        correctAnswer: ['Does', 'Leo', 'wash', 'his hands', 'before dinner', '?'],
        knowledgePoints: ['do / does', 'does + 动词原形', '一般疑问句'],
        explanation: '一般疑问句用 Does Leo wash...，does 出现后 washes 要恢复为 wash。'
      },
      {
        id: 'q8',
        section: '句型变身',
        type: 'text',
        label: '完整输入',
        prompt: '把句子变成一般疑问句。',
        sentence: 'Ben can ride a bike to school.',
        hint: '直接把 can 放到主语前，不需要 do 或 does。',
        fields: [
          {
            label: '一般疑问句',
            placeholder: '在这里输入完整句子',
            acceptedAnswers: ['Can Ben ride a bike to school?'],
            displayAnswer: 'Can Ben ride a bike to school?'
          }
        ],
        knowledgePoints: ['can 句', '一般疑问句'],
        explanation: 'can 句变疑问时，直接把 can 提到主语 Ben 前面，ride 保持原形。'
      },
      {
        id: 'q9',
        section: '侦探改错',
        type: 'choice',
        mode: 'single',
        label: '找出正确改法',
        prompt: '下面哪一句改对了？',
        sentence: 'Does Lily walks to school every day?',
        options: [
          'Does Lily walk to school every day?',
          'Do Lily walks to school every day?',
          'Is Lily walk to school every day?',
          'Does Lily walking to school every day?'
        ],
        correctAnswer: ['Does Lily walk to school every day?'],
        knowledgePoints: ['do / does', 'does + 动词原形', '一般疑问句'],
        explanation: 'does 已经承担了三单变化，后面的 walks 必须恢复成 walk。'
      },
      {
        id: 'q10',
        section: '综合挑战',
        type: 'text',
        label: '扩句后再变形',
        prompt: '先扩写句子，再把扩写后的句子变成一般疑问句。',
        sentence: 'My sister reads.',
        hint: '使用这些信息：usually / English books / quietly / in her room / before bed',
        fields: [
          {
            label: '① 扩写后的肯定句',
            placeholder: 'My sister ...',
            acceptedAnswers: ['My sister usually reads English books quietly in her room before bed.'],
            displayAnswer: 'My sister usually reads English books quietly in her room before bed.'
          },
          {
            label: '② 一般疑问句',
            placeholder: 'Does my sister ... ?',
            acceptedAnswers: ['Does my sister usually read English books quietly in her room before bed?'],
            displayAnswer: 'Does my sister usually read English books quietly in her room before bed?'
          }
        ],
        knowledgePoints: ['实义动词句', 'do / does', 'does + 动词原形', '一般疑问句', '扩句与语序'],
        explanation: 'usually 放在实义动词前；变疑问句后用 Does，reads 恢复成 read，其他信息保持原来的合理顺序。'
      }
    ]
  };
})();
