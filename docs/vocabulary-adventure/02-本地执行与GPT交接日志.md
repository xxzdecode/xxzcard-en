# 执行卡 2｜本地执行与 GPT 交接日志

## 执行结论

- 本地分支：`codex/vocabulary-adventure-card-2`
- 开始提交：`dbed74c`（执行卡 1 提交 `241e854` 加执行卡 2 文档）
- 执行范围：稳定抽查补位修正、本地摸底播放器、一次提示、D/H/F、逐词保存、本地预览入口。
- 远程动作：未 push、未建或更新 PR、未 merge、未 deploy。
- 线上动作：未修改线上网站，未修改 Supabase 表结构或线上数据。

## 执行卡 1 前置边界修正

计划池拆为 `urgentReview` 与 `stableReview`。补位顺序现为：

1. 最多 20 个 screening；
2. 最多 10 个 urgent review；
3. 额外 screening；
4. 额外 urgent review；
5. 最后才用 stable review 补足 30。

回归边界：

- 30 screening + 4 urgent + 20 stable → 26 screening + 4 urgent + 0 stable。
- 3 screening + 5 urgent + 30 stable → 3 screening + 5 urgent + 22 stable。

挑战、F、H、严重逾期、到期的既有优先级未改变。

## 本轮实现

- 新增独立摸底播放器 screen，不复用或重新启用旧生词检验。
- 三种确定性题型：`wordToMeaning`、`audioToWord`、`meaningToWord`。
- 题型和选项由 session 日期、wordKey、plan index 生成稳定 seed；不使用 `Math.random()`。
- 干扰项只取当前学生可见的 common 词本；选项按 4 → 3 → 2 降级，不足 2 个时停在当前项并报告。
- 第一次正确为 D；第一次错只提示一次；提示后正确为 H；再次错误为 F；不允许第三次作答。
- F 反馈显示现有完整卡片字段和发音按钮。
- `prepareVocabularyAdventureResult()` 原子准备 word state、plan item、cursor、phase、completed，且不修改输入对象。
- 保存成功后才更新播放器进度；保存失败保留同一 prepared state，重试不重复运行间隔算法，不重复增加 `reviewCount`。
- 当前卡片按 wordKey 从最新可见候选池解析，不信任旧 batchId/cardIndex。
- cursor 进入 review 时只显示后续阶段边界，不构建或修改 review 项。
- 预览默认关闭；姐姐和弟弟可通过查询参数或 localStorage 开启；老师隐藏。

## 预览方式

查询参数：

```text
?previewVocabularyAdventure=1
```

或本地存储：

```js
localStorage.setItem('wc_vocab_adventure_preview', '1')
location.reload()
```

关闭：

```js
localStorage.removeItem('wc_vocab_adventure_preview')
location.reload()
```

## 自动与页面验收

- 三个新增/修改脚本均通过 `node --check`。
- `vocabularyAdventure.test.js` 通过。
- `vocabularyAdventurePlayer.test.js` 通过。
- `npm test` 通过。
- 仓库全部 `*.test.js` 通过。
- `createWordbook.test.mjs` 16/16 通过。
- 既有 `vocabularyLessonViewport.mjs` WebKit 测试通过。
- 新增 `vocabularyAdventureViewport.mjs` WebKit 测试通过。
- Python `tests.test_publish_vocabulary_review_images` 6/6 通过。
- 仓库没有 lint/typecheck 命令，因此未虚构对应结果。

真实 `index.html` 的 WebKit 验收覆盖：

- 1024×768 和 1180×820 iPad 横屏尺寸；
- 预览关闭时入口隐藏，老师隐藏；
- 旧“今日单词 / 混合单词”仍可见；
- D、H、F 三条结果路径；
- 第一次错后提示、第二次错后完整卡；
- 首次 session 保存失败不进入答题；
- 正式结果保存失败时 UI 不前进，同一 prepared 对象重试后 `reviewCount` 仍为 1；
- 同日 cursor 恢复；
- 使用失效 batchId/cardIndex 时仍按 wordKey 找到当前卡；
- 弟弟只写 `vocab_adventure_v1_brother`，不读取姐姐状态；
- review 项保持 pending，session 不被错误完成；
- 无水平溢出，按钮高度不小于 44px，完整卡和底部反馈条不重叠。

## 执行中遇到的问题

1. 本地起初没有 `node_modules`，`npm test` 因缺少已声明依赖 `sharp` 停止。执行本地 `npm install --no-audit --no-fund` 后通过；依赖目录和临时 lock 不提交。
2. 受限环境启动测试子进程时，导入器测试得到 `spawnSync.status === null`；启动无头 WebKit时报 `spawn EPERM`。在允许启动本地测试进程的环境用相同命令复跑后全部通过。
3. 新视口测试最初在 Windows 上把根路径 `/` 经 `path.normalize()` 变成反斜杠，导致本地服务器对 `index.html` 返回 404。已改为先按原始 URL pathname 判断根路径，并通过真实页面测试。
4. Python 使用 Codex bundled runtime 的真实解释器；输出中的中文乱码来自测试子进程控制台编码，不影响 6/6 结果。

## 范围隔离

- 未修改 `js/tasks.js`、`js/review.js`、`js/quiz.js`、`js/questionTypes.js`、`js/vocabularyScreening.js`、`service-worker.js`。
- 未实现抗遗忘播放器、翻翻乐、使用题二次确认、挑战错词接入、地图、金币或阶段总结。
- 未替换或删除旧首页“今日单词 / 混合单词”。
- 旧温习、挑战和已停用的旧生词检验均保持原行为。
- 未修改单词卡字段、Supabase 表结构或线上数据。

## 给下一张执行卡的接口提示

- 状态仍为 `vocab_adventure_v1_sister / vocab_adventure_v1_brother`，不要另建摸底状态。
- screening 正式结果已在 plan item 保存 `taskType/result/status`，word state 保存 `lastTaskType`。
- review 阶段当前只有边界页；下一张卡应从当前 pending review item 接续，不要复用旧 `js/review.js` 整轮流程。
- 播放器使用完整状态幂等覆盖保存；后续题型也应沿用“纯函数准备 → 完整状态保存成功 → UI 前进”。
