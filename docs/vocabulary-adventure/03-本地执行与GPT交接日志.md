# 执行卡 3｜本地执行与 GPT 交接日志

## 执行结论

- 本地分支：`codex/vocabulary-adventure-card-3`
- 开始 HEAD：`b47577cf200a5da46bc91b2ddb2592495884b67f`
- 执行卡 2 实现提交：`22384fb0403c70b8512828c94691fd8c5b830666`
- 执行卡 3 实现提交：`3b2d8af98230f5f51888e6a5ae7a6c72721bcfdf`
- 本轮完成：抗遗忘播放器、确定性分题、视觉—英文翻翻乐、使用题二次确认、逐词保存、间隔更新和阶段总结。
- 未 push、未建或更新 PR、未 merge、未 deploy。
- 未修改线上网站、Supabase 表结构、线上数据或 Service Worker。

## 题型分配

| review 原因 | 题型边界 |
|---|---|
| challenge | 仅基础意义：visualMatch、wordToMeaning、meaningToWord、audioToWord |
| failed | 基础意义优先，可回退 missingLetters、letterOrder；不使用 usage |
| hinted | 基础意义与词形，可少量 audioSpelling；不使用 usage |
| severeOverdue | 基础意义后词形；不从 usage 开始 |
| due | 基础意义、词形和字段足够的 usage |
| stable | 可使用全部安全题型，仍避开 lastTaskType |

正式 seed 包含 session date、user key、wordKey、plan index、review phase 和 review reason。题型、选项、缺字位置、字母顺序、句子顺序和翻翻乐棋盘均不使用 `Math.random()`。

回退顺序：

```text
同类别其他题型
→ 基础意义题
→ 最低 2 个有效选项
→ 安全停止，不保存、不前进
```

## 复用与新建边界

- 新建 `js/vocabularyAdventureReview.js`，集中提供 11 类题型的纯构题、可用性、判题、确定性排列和安全回退。
- 复用执行卡 2 的 common 可见候选池、wordKey 解析、页面壳、发音、完整卡反馈和保存重试。
- 复用核心 `applyAdventureResult()`；没有复制 `1 → 3 → 7 → 14 → 30 → 60` 算法。
- 没有调用旧 `buildReviewSteps/renderReviewStep/markCardUnknown/saveReviewComplete` 等整轮控制器。
- 没有修改旧 `review.js/questionTypes.js/tasks.js/quiz.js`。

## 视觉—英文翻翻乐

- 一个 plan item 显示目标词加最多 3 个干扰词。
- 视觉来源：调用方提供的现有视觉映射 → card.emoji → 中文 meaning。
- 无错完成为 D，一次错配完成为 H，多次错配进入同词基础意义确认。
- 确认正确为 H，确认错误为 F。
- 只提交当前目标词；干扰词不更新状态、不增加 reviewCount。
- 卡片是可键盘操作的 button，并提供“视觉/意思/英文”文字标签。

## 使用题二次确认

适用：

- collocationCloze
- exampleCloze
- sentenceOrder

流程：

```text
使用题正确 → D
使用题错误 → 不保存 → 同词基础意义确认
基础确认正确 → H + outcomeDetail=usageWeak
基础确认错误 → F
```

H 使用现有间隔算法保持当前 interval；F 回到 1 天。plan item 保留原 usage `taskType`，另存 `confirmationTaskType`，不在 word state 增加长期 usage 等级。

## 保存与恢复

- `prepareVocabularyAdventureReviewResult()` 校验 cursor、pending review、wordKey 和 screening 全部完成。
- 一次准备 word state、plan item、reviewReason、taskType、confirmationTaskType、outcomeDetail、cursor、phase 和 completed。
- 保存成功后才替换内存状态、显示正式反馈和允许继续。
- 保存失败保留同一个 prepared state；重试不再次运行间隔算法，reviewCount 只加一次。
- 最后一个 review 的保存同时原子包含 completed；保存失败不显示 summary。
- 当前卡始终从最新可见候选池按 wordKey 查找，旧 batchId/cardIndex 失效不会串词。
- 同日、前日 session 继续沿用执行卡 1/2 恢复逻辑。
- sister 与 brother 继续使用独立 `vocab_adventure_v1_*` key。

## 阶段总结

summary 由 `summarizeVocabularyAdventureSession()` 从 session plan 纯函数汇总：

- 今日总目标；
- screening/review 完成数；
- D/H/F；
- usage weak；
- 是否完成 severe overdue；
- 无 review 时显示“今日无抗遗忘目标”。

不读取 DOM，不新增统计表，不更新首页、金币或旧打卡。

## 修改文件

- 新增 `js/vocabularyAdventureReview.js`：review 题型注册、构题、回退和判题。
- 修改 `js/vocabularyAdventureCore.js`：reviewReason、outcome detail、原子 review 结果和 summary。
- 修改 `js/vocabularyAdventurePlayer.js`：第二站交互、翻翻乐、二次确认、反馈和总结。
- 修改 `styles-vocabulary-adventure.css`：review、排序、输入、翻翻乐、确认和总结样式。
- 修改 `index.html`：第二站标题节点并加载 review 模块。
- 修改 `js/main.js`：暴露新播放器交互函数。
- 修改 `package.json`：纳入 review 单元和 viewport 测试。
- 新增 `tests/vocabularyAdventureReview.test.js`。
- 新增 `tests/vocabularyAdventureReviewViewport.mjs`。
- 修改既有 adventure 测试，增加 reviewReason 并将旧边界断言更新为正式第二站接续。

## 测试

全部通过：

- 四个 adventure 脚本 `node --check`。
- `npm test`。
- 仓库全部 `*.test.js`。
- `createWordbook.test.mjs`：16/16。
- `vocabularyLessonViewport.mjs`：WebKit 通过。
- `vocabularyAdventureViewport.mjs`：WebKit 通过。
- `vocabularyAdventureReviewViewport.mjs`：WebKit 通过。
- Python `tests.test_publish_vocabulary_review_images`：6/6。

review 真实页面覆盖：

- visualMatch；
- wordToMeaning；
- audioToWord；
- phoneticToWord；
- missingLetters；
- letterOrder；
- audioSpelling；
- collocationCloze；
- exampleCloze；
- sentenceOrder；
- 普通 D/H/F；
- usage correct、usage wrong + meaning correct/incorrect；
- visual 多次错配后的确认；
- 正式结果和 usage 确认保存失败重试；
- 最后一项 completed 保存失败时不显示总结；
- 失效 cardIndex 后按 wordKey 解析；
- sister/brother 隔离；
- 1024×768 与 1180×820 无水平溢出、按钮不小于 44px、反馈条不遮挡。

仓库没有 lint/typecheck 命令，因此没有虚构结果。

## 遇到的问题

1. 创建本地 card 3 分支时，受限环境不能写 `.git/index.lock`；在允许本地 Git 元数据写入的环境重试成功，没有代码冲突。
2. 仓库测试依赖默认未安装；执行 `npm install --no-audit --no-fund` 后测试，最终删除 `node_modules` 和临时 package-lock，未提交依赖产物。
3. WebKit 和导入器测试需要允许启动本地子进程；按执行卡 2 已验证方式运行，没有修改产品逻辑绕过环境限制。
4. Python 使用 Codex bundled runtime 的真实解释器；测试输出中部分中文受控制台编码影响，但 6/6 结果正常。

## 范围隔离

- 未修改 `js/review.js`、`js/tasks.js`、`js/quiz.js`、`js/questionTypes.js`、`js/vocabularyScreening.js`、`service-worker.js`。
- 未改旧“今日单词 / 混合单词”、旧温习、旧挑战或默认首页布局。
- 未实现挑战错词写入、统一首页、地图、小火车、宝箱、金币、老师报告或执行卡 4。
- 未新增 Supabase 表，未修改单词卡字段。
- 执行卡 3 明确禁止 push，因此本轮不按一般“完成后默认 push”规则推送。

## 给执行卡 4 的接口提示

- 完成 session 可由 `state.session.completed` 和纯 summary 读取，summary 不修改首页。
- review plan item 已保留 `reviewReason/taskType/result/outcomeDetail/confirmationTaskType`。
- `challengeFlagAt` 仍由核心候选分类识别，review 正式结果通过统一算法清理。
- challenge pending 的写入仍未实现，应由执行卡 4 接入旧挑战结果，但不得直接设置 F。
- 首页预览开关和两个学生独立状态 key 保持不变。
