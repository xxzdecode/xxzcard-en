window.PRACTICE_DATA = {
  meta: {
    documentTitle: "火车排序练习模板",
    title: "火车排序练习",
    subtitle: "拖动车厢，排列成正确顺序",
    progressLabel: "火车\n排序模板",
    stationLabel: "终点站"
  },

  feedback: {
    idleTitle: "先观察每节车厢，再按要求调整顺序。",
    idleDetail: "当前内容是用于验证模板的中性示例。",
    defaultRule: "检查后显示说明",
    solvedDetail: "火车已经顺利到站。",
    correctDetail: "车厢连接成功，火车出发！",
    wrongTitle: "顺序还不对，再检查一下。",
    firstWrongDetail: "不会公布正确顺序，请继续拖动车厢调整。",
    wrongRule: "答对后显示说明"
  },

  completion: {
    emoji: "🚂✨",
    title: "全部完成！",
    success: "{total} 组车厢全部排列正确，模板流程验证完成。",
    incomplete: "你已经浏览完全部题目，目前完成 {count} / {total}。"
  },

  questions: [
    {
      station: "第一站",
      type: "模板示例｜三个车厢",
      instruction: "把车厢按 A、B、C 的顺序排列",
      correctOrder: ["片段 A", "片段 B", "片段 C"],
      initialOrder: ["片段 C", "片段 A", "片段 B"],
      successTitle: "排列正确：片段 A、片段 B、片段 C",
      explanation: "这是中性模板数据；生成正式练习时请替换整个 practice-data.js。",
      hint: "先找到片段 A，再依次排列 B 和 C。"
    },
    {
      station: "第二站",
      type: "模板示例｜四个车厢",
      instruction: "把车厢按 1、2、3、4 的顺序排列",
      correctOrder: ["步骤 1", "步骤 2", "步骤 3", "步骤 4"],
      initialOrder: ["步骤 3", "步骤 1", "步骤 4", "步骤 2"],
      successTitle: "排列正确：步骤 1、步骤 2、步骤 3、步骤 4",
      explanation: "第二组数据用于验证不同车厢数量下的布局、切题和完成流程。",
      hint: "先找到步骤 1，再按数字递增排列。"
    }
  ]
};
