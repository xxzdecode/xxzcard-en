(function registerGrammarChallengePractice() {
  // 这份文件只保存当天练习内容；页面、导航、判分和结果复盘都由通用骨架负责。
  window.GRAMMAR_CHALLENGE_PRACTICE = {
    id: 'grammar-2026-07-16-pronouns-be',
    date: '2026-07-16',
    title: '代词与 be 动词',
    studentTip: '先找真正的主语，判断一个还是多个，再选择代词和 am / is / are。',
    knowledgePoints: [
      '人称代词替换',
      '单复数主语',
      'I + am',
      '单数 + is',
      '复数和 you + are',
      '长主语中心词',
      'be 动词否定句',
      'be 动词一般疑问句',
      '简短回答',
      '综合改错'
    ],
    questions: [
      {
        id: 'q1',
        section: '基础进入',
        type: 'choice',
        mode: 'single',
        label: '选择正确代词',
        prompt: '选择能够替换 the little robot 的人称代词。',
        sentence: 'The little robot is on my desk. _____ is new.',
        options: ['He', 'She', 'It', 'They'],
        correctAnswer: ['It'],
        knowledgePoints: ['人称代词替换', '单数 + is'],
        explanation: 'the little robot 是一个物品，单数物品用 it。完整句子是：It is new.'
      },
      {
        id: 'q2',
        section: '基础进入',
        type: 'choice',
        mode: 'multiple',
        label: '判断复数主语',
        prompt: '下面哪些主语表示两个或多个对象？',
        hint: '可以多选。先找每个主语的中心词，也要注意 and。',
        options: ['the yellow kite', 'Mia and Ben', 'three rabbits', 'my English teacher', 'the shoes by the door'],
        correctAnswer: ['Mia and Ben', 'three rabbits', 'the shoes by the door'],
        knowledgePoints: ['单复数主语', '长主语中心词'],
        explanation: 'Mia and Ben 是两个人；three rabbits 是三只兔子；the shoes by the door 的中心词是复数 shoes。'
      },
      {
        id: 'q3',
        section: '基础进入',
        type: 'choice',
        mode: 'single',
        label: '选择 be 动词',
        prompt: '选择正确的 be 动词。',
        sentence: 'I _____ ready for the school play.',
        options: ['am', 'is', 'are'],
        correctAnswer: ['am'],
        knowledgePoints: ['I + am'],
        explanation: 'I 有固定搭档 am。正确句子是：I am ready for the school play.'
      },
      {
        id: 'q4',
        section: '独立运用',
        type: 'choice',
        mode: 'single',
        label: '名字变代词',
        prompt: '哪个句子正确替换了主语 Ben and I？',
        sentence: 'Ben and I are classmates.',
        options: ['We are classmates.', 'They are classmates.', 'We is classmates.', 'I am classmates.'],
        correctAnswer: ['We are classmates.'],
        knowledgePoints: ['人称代词替换', '复数和 you + are'],
        explanation: 'Ben and I 包含“我”，所以要换成 we；we 的 be 动词是 are。'
      },
      {
        id: 'q5',
        section: '独立运用',
        type: 'choice',
        mode: 'multiple',
        label: '选择正确句子',
        prompt: '下面哪两个句子的主语和 be 动词搭配正确？',
        hint: '本题有 2 个正确答案。',
        options: ['You are very helpful.', 'The two birds are small.', 'My mother are at home.', 'I is ten years old.'],
        correctAnswer: ['You are very helpful.', 'The two birds are small.'],
        knowledgePoints: ['I + am', '单数 + is', '复数和 you + are'],
        explanation: 'you 固定用 are；two birds 是复数，也用 are。My mother 应配 is，I 应配 am。'
      },
      {
        id: 'q6',
        section: '独立运用',
        type: 'choice',
        mode: 'single',
        label: '找真正的主语',
        prompt: '选择正确的 be 动词。',
        sentence: 'The boy with three balloons _____ near the school gate.',
        hint: '暂时拿开 with three balloons，再判断中心词。',
        options: ['am', 'is', 'are'],
        correctAnswer: ['is'],
        knowledgePoints: ['单复数主语', '单数 + is', '长主语中心词'],
        explanation: 'with three balloons 只是补充信息。真正的主语是单数 The boy，所以使用 is。'
      },
      {
        id: 'q7',
        section: '独立运用',
        type: 'order',
        label: '词块排序',
        prompt: '把肯定句变成否定句。',
        sentence: 'The kittens are hungry.',
        hint: 'be 动词句变否定，直接在 be 动词后加 not。',
        tokens: ['hungry', 'The kittens', 'not', 'are', '.'],
        correctAnswer: ['The kittens', 'are', 'not', 'hungry', '.'],
        knowledgePoints: ['复数和 you + are', 'be 动词否定句'],
        explanation: 'be 动词句变否定时，不需要 do。直接把 not 放在 are 后面。'
      },
      {
        id: 'q8',
        section: '综合提升',
        type: 'text',
        label: '完整输入',
        prompt: '把下面的句子改成一般疑问句。',
        sentence: 'Your new art teacher is in the classroom.',
        hint: '把原句中的 is 放到完整主语前面。',
        fields: [
          {
            label: '一般疑问句',
            placeholder: '在这里输入完整句子',
            acceptedAnswers: ['Is your new art teacher in the classroom?'],
            displayAnswer: 'Is your new art teacher in the classroom?'
          }
        ],
        knowledgePoints: ['单数 + is', '长主语中心词', 'be 动词一般疑问句'],
        explanation: '中心词 teacher 是单数，原句使用 is。变疑问句时，把 is 整体移到完整主语前面。'
      },
      {
        id: 'q9',
        section: '综合提升',
        type: 'choice',
        mode: 'single',
        label: '选择简短回答',
        prompt: '根据提示选择正确的简短回答。',
        sentence: 'Is Emma at the library? 提示：Emma 不在图书馆。',
        options: ["No, she isn't.", "No, Emma aren't.", "No, they aren't.", 'No, she is.'],
        correctAnswer: ["No, she isn't."],
        knowledgePoints: ['人称代词替换', '单数 + is', '简短回答'],
        explanation: "Emma 是女孩，用 she；问句使用 is，否定回答是：No, she isn't."
      },
      {
        id: 'q10',
        section: '综合提升',
        type: 'choice',
        mode: 'single',
        label: '语法改错',
        prompt: '选择完全正确的修改。',
        sentence: 'Is Noah and Eric at the bus stop? — Yes, he is.',
        options: [
          'Are Noah and Eric at the bus stop? — Yes, they are.',
          'Is Noah and Eric at the bus stop? — Yes, they are.',
          'Are Noah and Eric at the bus stop? — Yes, he is.',
          'Do Noah and Eric are at the bus stop? — Yes, they do.'
        ],
        correctAnswer: ['Are Noah and Eric at the bus stop? — Yes, they are.'],
        knowledgePoints: ['人称代词替换', '单复数主语', '复数和 you + are', 'be 动词一般疑问句', '简短回答', '综合改错'],
        explanation: 'Noah and Eric 是两个人，所以问句用 Are；回答时换成 they，并继续使用 are。'
      }
    ]
  };
})();
