# 执行卡 4｜本地执行与 GPT 交接日志

## 完成结论

- 分支：`codex/vocabulary-adventure-card-4`
- 本轮同步前本地 SHA：`786ed29dacb7b4a2c5056c0df7ff747fd9336dd0`
- 本轮审查开始 SHA：`b58848038a72f9e5f1c0ce135781c8b148c919c0`
- 正式收尾实现 SHA：`ebd415ee161803a29e9ef60b039e28b5eb200b10`
- 状态：**执行卡 4 已完成本地收尾、完整回归和 WebKit/iPad 验证。**
- 本日志提交在实现提交之后创建；日志提交自身无法自引用，最终 HEAD 以交接报告中的完整 SHA 为准。
- 未 push、未建 PR、未 merge 到其他分支、未 deploy、未修改 Service Worker、未修改 Supabase 表结构、未切换线上默认入口。

## 审查的远程收尾提交

### `230426bbc368d2b02ed7472d0f7d8b54db8d83ef`

确认有效：

- 预览开启后只隐藏 `homeQuickActions`；
- 语法挑战、新词导览、打卡栏和底部功能保留；
- `challengeFlagAt` 非空的词在挑战候选阶段即被排除；
- 中途退出按固定 10 题分母记录当前分数并更新 `bestScore`。

### `2b2b6c20c4195fd95c66ed903b61d833a309f4c1`

测试方向正确，但发现一处夹具错误：断言“10 个候选中有 1 个 pending”，实际传入的 `word0` 至 `word9` 不含唯一 pending 的 `word13`。已改为 9 个正常词加 `word13`，使候选不足断言真实覆盖目标规则。

### `b58848038a72f9e5f1c0ce135781c8b148c919c0`

创建了本日志，但其中把 `batchChallenge_*` 留在独立每日 2 次额度中，且测试仍标记为待复跑。该方案会让儿童通过不同正式计分入口获得额外次数，已在正式收尾实现中修正，并以真实测试结果替换原待办结论。

## 每日次数兼容方案

所有儿童正式计分挑战入口共用当前孩子、当前自然日的 2 次上限：

```text
新统一挑战 challengeDaily
+ todayChallenge
+ mixedChallenge
+ 当日全部 batchChallenge_*
→ 合计最多 2 次
```

实现保持现有存储位置：

- 新统一挑战继续写当前孩子的 `vocab_adventure_v1_*`；
- `todayChallenge` 和 `mixedChallenge` 继续写 `daily_task_*`；
- `batchChallenge_*` 继续写当前孩子、当前日期对应的 `wc_batch_challenge_v1_*` localStorage 记录；
- 进入任一旧挑战前，`canStartChallenge()` 读取上述所有来源的聚合次数；
- 任一入口的 `challengeStatus()` 也显示聚合后的锁定状态和最高分；
- 各入口完成时仍只写自己的单一原有记录，避免为本卡引入跨存储双写。

因此不能再出现“统一 2 次 + 今日 2 次 + 混合 2 次 + 每批次 2 次”。sister、brother 的 key 前缀和 adventure state 独立，互不占用。

## challenge pending 规则

挑战候选顺序为：

```text
当前孩子可见正式词
→ wordKey 合并
→ 已完成基础摸底且 reviewCount > 0
→ 排除 challengeFlagAt
→ F
→ H
→ 已到期
→ 其他已摸底词
→ 稳定词
```

- 已有 `challengeFlagAt` 的词不进入新挑战；
- 它只留给下一次新生成的探险计划；
- 不插入或改写当前冻结的探险计划；
- 候选不足 10 个时不使用 pending 词补足、不复制词卡、不创建半成品 session，也不消耗次数；
- 挑战答对不清除已有 pending；
- 挑战答错只写 `challengeFlagAt`，不修改 D/H/F、`intervalIndex`、`nextReviewAt` 或探险 `reviewCount`。

## 中途退出、保存失败和重试

- 新统一挑战退出前要求确认；
- 退出 prepared state 将 session 标为 `abandoned`，并消耗 1 次；
- 得分始终为 `当前答对数 / 10 × 100`，例如答对 1 题后退出记录 10 分；
- 退出保存失败时 runtime state 不替换，因此正式 attempts 和 `bestScore` 不增加；再次退出会基于仍为 active 的同一状态重试；
- 已成功退出的 session 不再是 active，纯函数再次退出抛出 `CHALLENGE_NOT_ACTIVE`，不会重复计次；
- 旧 `todayChallenge`、`mixedChallenge`、`batchChallenge_*` 的退出都通过 `completeActiveChallenge(dqCorrect, dqQuestions.length || 10)`；
- `activeChallengeRecorded` 和 `challengeAttemptSaving` 防止保存重试或重复点击重复计数；
- 单题和最后一题都先形成 prepared state，保存成功后才替换正式 runtime；保存失败重试相同 prepared state，不再次判题。

## 预览与老师端边界

预览关闭：

- 旧首页、今日单词、混合单词、旧温习和旧挑战保持可用；
- 旧入口仍可进入 10 题挑战。

预览开启：

- 旧“今日单词 / 混合单词”快捷区隐藏；
- 词汇主入口显示“探险 / 挑战”；
- 语法挑战、新词导览、打卡栏和底部功能保持可见；
- 预览 query 与 localStorage 开关沿用已有判断。

老师端：

- 不满足 student user 条件；
- 儿童统一词汇入口隐藏；
- 老师首页导航保持可见；
- 未改变老师端数据或功能入口。

## 本轮最终修改文件

正式收尾实现 `ebd415ee161803a29e9ef60b039e28b5eb200b10`：

```text
js/tasks.js
package.json
tests/createWordbook.test.mjs
tests/vocabularyAdventureChallenge.test.js
tests/vocabularyAdventureChallengeViewport.mjs
tests/vocabularyChallengeAttempts.test.js
```

其中：

- `js/tasks.js`：将所有 `batchChallenge_*` 纳入共享次数聚合和锁定；
- `tests/vocabularyChallengeAttempts.test.js`：新增 today / mixed / batch / unified 共享次数与孩子隔离测试；
- `tests/vocabularyAdventureChallenge.test.js`：修正 pending 候选不足夹具；
- `tests/vocabularyAdventureChallengeViewport.mjs`：等待异步首页状态完成，并验证非旧词汇功能及老师端边界；
- `tests/createWordbook.test.mjs`：使 CRLF 测试不依赖 Windows checkout 的换行配置；
- `package.json`：把共享次数测试加入 `npm test`。

执行卡 4 整体还包含：

```text
index.html
js/home.js
js/main.js
js/vocabularyAdventureChallenge.js
js/vocabularyAdventureCore.js
js/vocabularyAdventurePlayer.js
js/vocabularyAdventureReview.js
styles-vocabulary-adventure.css
tests/vocabularyAdventureViewport.mjs
docs/vocabulary-adventure/04-本地执行与GPT交接日志.md
```

## 测试记录

### 语法检查

以下 7 条命令均退出码 0，无输出：

```text
node --check js/vocabularyAdventureCore.js
node --check js/vocabularyAdventurePlayer.js
node --check js/vocabularyAdventureReview.js
node --check js/vocabularyAdventureChallenge.js
node --check js/main.js
node --check js/home.js
node --check js/tasks.js
```

结果：`7/7` 通过。

### npm 正式测试

```text
npm test
```

第一次受沙箱子进程权限影响，前 6 个脚本通过后，导入器得到 `status=null`。允许仓库测试启动 Node 子进程后按相同命令完整重跑：

```text
vocabularyAdventure
vocabularyAdventurePlayer
vocabularyAdventureReview
vocabularyAdventureChallenge
vocabularyChallengeAttempts
vocabularyReview
vocabularyLessonImporter
homeNavigationLayout
```

结果：`8/8` 个脚本通过。

### 仓库全部 JS 回归

```text
Get-ChildItem tests -Filter '*.test.js' | Sort-Object Name | ForEach-Object { node $_.FullName }
```

结果：`17/17` 个 `*.test.js` 文件通过。

### 非视口 MJS 回归

```text
node tests/createWordbook.test.mjs
```

首次为 `15/16`：机器级 `core.autocrlf=true` 已把源夹具检出为 CRLF，原测试再次替换换行后构造出混合换行。修正测试先规范为 LF 再构造纯 CRLF 后完整复跑。

结果：`16/16` 通过。

### Python 回归

```text
C:\Users\xxz\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m unittest tests.test_publish_vocabulary_review_images
```

结果：`6/6` 通过。

### WebKit / iPad

```text
npm run test:adventure-viewport
```

结果：执行卡 2 探险播放器 WebKit/iPad 通过。

```text
npm run test:adventure-review-viewport
```

结果：执行卡 3 抗遗忘播放器 WebKit/iPad 通过。

```text
npm run test:adventure-challenge-viewport
```

第一次失败于远程测试第 275 行：切换用户后只等待同步更新的模式文字，未等待异步 `loadHome()` 完成。改为等待挑战按钮状态更新，并增加非旧词汇功能与老师端断言后完整复跑。

结果：执行卡 4 挑战 WebKit/iPad 通过。

```text
npm run test:viewport
```

结果：旧词汇课程 task 016 的 WebKit 视口通过。

WebKit 合计：`4/4` 个脚本最终通过。覆盖 `1024×768`、`1180×820` 等 iPad 视口；挑战结果页自动断言无横向溢出、主体与反馈区不重叠、可见按钮高度至少 44px。人工查看 `1180×820` 挑战结果截图，得分、错题、次数、最高分和操作区均完整可读。

## 已知限制

- 本卡仍是本地预览功能，未发布、未缓存到 Service Worker、未切换线上默认入口。
- `batchChallenge_*` 沿用旧设计保存在当前浏览器 localStorage；它与同一浏览器中的其他入口共用上限，但旧批次记录本身不跨设备同步。
- 共享次数通过各原有单一存储来源聚合读取，不做 Supabase 与 localStorage 跨存储事务；本卡避免了双写部分成功，但不处理多个设备在同一瞬间并发发起挑战的竞态。
- 未开始执行卡 5 的正式视觉重构、最终验收或发布工作。

## 精确范围隔离

- Service Worker：未修改；
- Supabase 表结构与线上数据：未修改；
- 线上默认入口：未修改；
- 发布与部署：未执行；
- 用户无关课件：未读取、未覆盖；
- 视觉结构：未重构；
- 执行卡 5：未开始。

## Git 快照

正式收尾实现提交完成后、写本日志前：

```text
git status --short
```

输出：无，工作区干净。

```text
git log --oneline -8
```

```text
ebd415e fix: finalize vocabulary adventure card 4
b588480 docs: add card 4 handoff log
2b2b6c2 test: cover challenge pending and exit scoring
230426b fix: finish vocabulary adventure challenge safeguards
786ed29 wip: save vocabulary adventure card 4 progress
b7f482b docs: add vocabulary adventure card 3 handoff
3b2d8af feat: add vocabulary adventure review stage
b47577c docs: add vocabulary adventure execution card 3
```

日志提交后的最终 `git status --short` 与 `git log --oneline -8` 以本次交接报告的真实命令输出为准。
