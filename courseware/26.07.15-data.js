const questions = [
  {
    type:"annotate", module:"句子扫描", level:"基础",
    title:"给句子做标记：圈主语，划谓语，框宾语，划掉补充信息。",
    chunks:[
      ["My best friend","S"],["usually","X"],["walks","V"],["to school","X"],["with me","X"]
    ],
    explain:"主干是 My best friend walks。usually、to school、with me 都是在补充时间、地点或陪同信息。"
  },
  {
    type:"annotate", module:"句子扫描", level:"基础",
    title:"先找真正的主语，不要被地点短语带走。",
    chunks:[
      ["The small dog","S"],["under the chair","X"],["looks","V"],["very tired","X"]
    ],
    explain:"主干是 The small dog looks。under the chair 和 very tired 都在补充说明。"
  },
  {
    type:"annotate", module:"句子扫描", level:"提升",
    title:"这个句子有两个宾语，试着把它们都框出来。",
    chunks:[
      ["Our English teacher","S"],["tells","V"],["us","O"],["interesting stories","O"]
    ],
    explain:"tells 后面有两个对象：us（告诉谁）和 interesting stories（告诉什么）。"
  },
  {
    type:"annotate", module:"句子扫描", level:"挑战",
    title:"can 和后面的动作词要一起看成谓语。",
    chunks:[
      ["The boy in a blue jacket","S"],["can carry","V"],["the heavy box","O"],["by himself","X"]
    ],
    explain:"主干是 The boy can carry the heavy box。by himself 是补充方式。"
  },
  {
    type:"classify", module:"句型分流", level:"基础",
    title:"把句子送到正确的句型站。",
    sentence:"She is friendly.", answer:"be",
    explain:"is 是 be 动词，所以这是 be 动词句。"
  },
  {
    type:"classify", module:"句型分流", level:"基础",
    title:"看句子里真正表示动作的词。",
    sentence:"She helps her brother.", answer:"verb",
    explain:"helps 表示动作，句中没有 be 动词，也没有 can，所以是实义动词句。"
  },
  {
    type:"classify", module:"句型分流", level:"提升",
    title:"can 后面的动词要保持原形。",
    sentence:"She can speak English well.", answer:"can",
    explain:"can 是情态动词，后面接动词原形 speak，所以这是 can 句。"
  },
  {
    type:"transform", module:"魔法变身", level:"基础", mode:"negative",
    title:"把肯定句变成否定句。",
    source:"Tom plays basketball after school.",
    target:"否定句",
    answer:["Tom","does not","play","basketball","after school","."],
    bank:["after school","play","Tom","does not","plays","basketball","Does","."]
  },
  {
    type:"transform", module:"魔法变身", level:"基础", mode:"question",
    title:"把肯定句变成一般疑问句。",
    source:"Tom plays basketball after school.",
    target:"一般疑问句",
    answer:["Does","Tom","play","basketball","after school","?"],
    bank:["Tom","play","Does","plays","basketball","after school","does not","?"]
  },
  {
    type:"transform", module:"魔法变身", level:"基础", mode:"negative",
    title:"注意 watches 变回动词原形。",
    source:"Jenny watches TV before dinner.",
    target:"否定句",
    answer:["Jenny","does not","watch","TV","before dinner","."],
    bank:["Jenny","does not","watch","watches","TV","before dinner","Does","."]
  },
  {
    type:"transform", module:"魔法变身", level:"提升", mode:"question",
    title:"助动词提前后，原来的三单动词要还原。",
    source:"Jenny watches TV before dinner.",
    target:"一般疑问句",
    answer:["Does","Jenny","watch","TV","before dinner","?"],
    bank:["Does","Jenny","watches","watch","TV","before dinner","does not","?"]
  },
  {
    type:"transform", module:"魔法变身", level:"基础", mode:"negative",
    title:"can 句变否定，不需要 do 或 does。",
    source:"The boy can swim very fast.",
    target:"否定句",
    answer:["The boy","cannot","swim","very fast","."],
    bank:["The boy","cannot","does not","swim","swims","very fast","Can","."]
  },
  {
    type:"transform", module:"魔法变身", level:"基础", mode:"question",
    title:"can 直接移到主语前面。",
    source:"The boy can swim very fast.",
    target:"一般疑问句",
    answer:["Can","the boy","swim","very fast","?"],
    bank:["Can","The boy","the boy","swim","swims","very fast","Does","?"]
  },
  {
    type:"transform", module:"魔法变身", level:"挑战", mode:"negative",
    title:"be 动词句变否定：直接在 is 后加 not。",
    source:"Lucy is busy today.",
    target:"否定句",
    answer:["Lucy","is not","busy","today","."],
    bank:["Lucy","is not","does not","busy","today","Is","."]
  },
  {
    type:"transform", module:"魔法变身", level:"挑战", mode:"question",
    title:"be 动词句变疑问：把 is 提到主语前。",
    source:"Lucy is busy today.",
    target:"一般疑问句",
    answer:["Is","Lucy","busy","today","?"],
    bank:["Is","Lucy","does","busy","today","is not","?"]
  },
  {
    type:"expand", module:"扩句工坊", level:"基础",
    title:"给 The girl reads. 加入至少两个合适的细节。",
    subject:"The girl", verb:"reads", min:2,
    details:[
      {text:"quietly",pos:5,ok:true},
      {text:"an interesting story",pos:4,ok:true},
      {text:"in the library",pos:6,ok:true},
      {text:"every evening",pos:8,ok:true},
      {text:"very hungry",pos:4,ok:false,reason:"very hungry 不能直接放在 reads 后面当宾语。"},
      {text:"is",pos:3,ok:false,reason:"句子已经有谓语 reads，不能再直接加 is。"}
    ],
    explain:"扩句时可以补充“读什么、在哪里读、什么时候读、怎样读”，但要放在合适的位置。"
  },
  {
    type:"expand", module:"扩句工坊", level:"提升",
    title:"给 The dog runs. 加入至少两个合适的细节。",
    subject:"The dog", verb:"runs", min:2,
    details:[
      {text:"very fast",pos:5,ok:true},
      {text:"around the garden",pos:6,ok:true},
      {text:"every morning",pos:8,ok:true},
      {text:"with its owner",pos:7,ok:true},
      {text:"a red ball",pos:4,ok:false,reason:"run 不能直接接 a red ball 作宾语。"},
      {text:"are",pos:3,ok:false,reason:"The dog 是单数，而且句子已经有谓语 runs。"}
    ],
    explain:"run 常补充“怎样跑、在哪里跑、和谁一起跑、什么时候跑”。"
  },
  {
    type:"expand", module:"扩句工坊", level:"挑战",
    title:"给 My brother plays. 加入至少三个合适的细节。",
    subject:"My brother", verb:"plays", min:3,
    details:[
      {text:"usually",pos:2,ok:true},
      {text:"basketball",pos:4,ok:true},
      {text:"with his classmates",pos:7,ok:true},
      {text:"after school",pos:8,ok:true},
      {text:"very friendly",pos:4,ok:false,reason:"very friendly 不能作 plays 的宾语。"},
      {text:"does",pos:3,ok:false,reason:"肯定句中不需要在 plays 前面再加 does。"}
    ],
    explain:"频度副词 usually 放在实义动词前；活动、同伴和时间通常依次放在动词后面。"
  }
];
