# 执行卡 4｜本地执行与 GPT 交接日志

## 当前结论

- 分支：`codex/vocabulary-adventure-card-4`
- 开始 WIP 提交：`786ed29dacb7b4a2c5056c0df7ff747fd9336dd0`
- 收尾修复提交 1：`230426bbc368d2b02ed7472d0f7d8b54db8d83ef`
- 收尾测试提交 2：`2b2b6c20c4195fd95c66ed903b61d833a309f4c1`
- 当前状态：**主体代码与静态收尾完成；完整仓库测试需要在本地工作区再复跑一次后，才能正式标记执行卡 4 完成。**
- 未建 PR、未 merge、未 deploy、未修改 Service Worker、未修改 Supabase 表结构。

## WIP 提交中已经完成的范围

提交 `786ed29d...` 已实现：

- 预览开关下的“探险 / 挑战”统一词汇入口；
- 10 道无提示挑战；
- 已摸底词候选池；
- 确定性题型、选项和顺序；
- challenge session 保存与刷新恢复；
- 每题 prepared state 和保存失败重试；
- 正式计分、错题列表、每日次数和最高分；
- 挑战错题写入 `challengeFlagAt`；
- 挑战结果不直接修改 D/H/F、interval 或 reviewCount；
- 当前已冻结探险计划不被挑战结果改写；
- sister / brother 独立 adventure state；
- 相关单元测试和 WebKit viewport 测试。

## 本次收尾修复

### 1. 统一首页隐藏范围

原实现开启预览后同时隐藏：

- 旧词汇快捷入口；
- 语法挑战；
- 新词导览；
- 底部功能导航；
- 打卡栏。

现调整为只隐藏：

```text
homeQuickActions
```

因此预览模式只替换旧“今日单词 / 混合单词”词汇入口；语法挑战、新词导览、打卡栏和底部功能仍保留。

### 2. challenge pending 不再进入挑战

`collectChallengeCandidates()` 现在要求：

```text
已完成基础摸底
且 reviewCount > 0
且没有 challengeFlagAt
```

仍有 `challengeFlagAt` 的词必须留给下一次探险进行正式基础确认，不再被下一轮挑战重新抽中或用于不足 10 词时补位。

### 3. 中途退出计分与旧挑战一致

退出仍然：

- 消耗 1 次每日挑战机会；
- 将 session 标为 `abandoned`。

同时补充：

```text
当前答对数 / 固定 10 题
→ 计算退出时得分
→ 更新当日 bestScore
```

例如已答对 1 题后退出，记录 10 分。这与旧挑战退出时调用完整挑战计分函数的用户可见语义一致。

### 4. 单元测试补强

`tests/vocabularyAdventureChallenge.test.js` 新增或更新：

- challenge pending 候选被排除；
- pending 导致有效候选不足 10 时拒绝创建挑战；
- 同一轮不包含 pending 目标词；
- challenge 正确答案不清除已有 pending；
- 退出后 attempts 增加一次；
- 退出后 bestScore 记录当前得分；
- 预览首页只隐藏 `homeQuickActions`；
- Service Worker 仍未接入新挑战模块。

## 每日次数兼容方案

当前统一次数由以下三类共同计算：

```text
旧 todayChallenge
+ 旧 mixedChallenge
+ 新 vocabulary adventure challengeDaily
```

共同上限为每日 2 次。

`batchChallenge_*` 仍保留为单词本详情中的本地批次挑战记录，不计入统一首页主挑战的每日 2 次。原因是它使用独立 localStorage key，属于旧单词本局部练习入口，并非儿童统一首页的正式主挑战。本决定未修改旧批次详情行为，需在执行卡 5 旧功能回归中继续确认。

## 挑战候选规则

```text
当前孩子可见词卡
→ wordKey 去重
→ 已完成基础摸底（reviewCount > 0）
→ 排除 challengeFlagAt
→ F
→ H
→ 已到期
→ 其他已摸底词
→ 稳定词
```

候选不足 10 个时：

- 不复制词卡；
- 不创建半成品 session；
- 不消耗次数；
- 提示先完成探险待复查。

## 确定性 seed

```text
日期
+ user key
+ challenge attempt index
+ priority group
+ wordKey / question index
```

正式 challenge 模块不使用 `Math.random()`。

## 保存与恢复

- 创建 challenge session 前先保存；
- 单题确认生成 prepared state；
- 保存成功后才更新正式 runtime state；
- 保存失败保留相同 prepared state；
- 重试不再次判题或重复计数；
- 最后一题保存原子包含题目结果、completed、attempts、bestScore 和 challenge pending；
- 刷新后使用已保存题面和 cursor 继续。

## 修改文件

本次收尾修改：

```text
js/vocabularyAdventureChallenge.js
tests/vocabularyAdventureChallenge.test.js
docs/vocabulary-adventure/04-本地执行与GPT交接日志.md
```

WIP 提交原有修改还包括：

```text
index.html
js/home.js
js/main.js
js/tasks.js
js/vocabularyAdventureCore.js
package.json
styles-vocabulary-adventure.css
tests/vocabularyAdventureChallengeViewport.mjs
tests/vocabularyAdventureViewport.mjs
```

## 测试记录

### WIP 提交完成时的执行者报告

用户转交的 WIP 状态记录为：

- JS 通过；
- MJS 通过；
- Python 通过；
- 执行卡 2–4 WebKit / iPad 回归通过；
- 工作区干净。

这些结果对应收尾修复前的 `786ed29d...`。

### 本次收尾可独立验证的内容

对准备上传的完整文件执行：

```text
node --check vocabularyAdventureChallenge.fixed.js
node --check vocabularyAdventureChallenge.test.fixed.js
```

结果：通过。

通过 GitHub 回读确认：

- `challengeFlagAt` 候选过滤已存在；
- 退出 bestScore 更新已存在；
- 首页只隐藏 `homeQuickActions`；
- 测试文件已更新；
- Service Worker 未修改。

### 尚需本地复跑

当前连接环境不能检出完整私有工作树，因此以下命令未在收尾提交后独立复跑，不能虚构为已通过：

```text
npm test
node tests/vocabularyAdventureChallenge.test.js
node tests/vocabularyAdventureChallengeViewport.mjs
执行卡 2–4 全部 WebKit viewport
仓库全部 *.test.js
Python 回归
```

建议在本地工作区同步当前分支后一次性运行。若全部通过，可追加一个仅更新本日志结论的本地完成提交。

## 精确审查结论

静态审查已确认：

- 未直接设置挑战错词为 F/H；
- 未修改 interval、nextReviewAt 或 reviewCount；
- 未改写当前冻结探险 plan；
- pending 只留给下一次探险；
- 每题保存失败保留 prepared state；
- 最后一题完成和次数更新在同一 adventure state 中；
- 预览关闭仍使用旧首页；
- 老师端不会满足 student user 条件；
- 未接入 Service Worker；
- 未修改 Supabase 结构。

## 未完成项

只剩一项：

```text
在完整本地仓库中复跑执行卡 4 的全部测试
```

若出现失败，只修与本次三个收尾点直接相关的问题，不扩大功能范围。

## 给执行卡 5 的接口提示

执行卡 5 开始前应先确认：

1. 当前分支包含 `2b2b6c20c4195fd95c66ed903b61d833a309f4c1`；
2. 执行卡 4 完整测试已经在本地复跑；
3. `challengeFlagAt` 词不会再次进入挑战；
4. 新旧 today / mixed / unified challenge 共用每日 2 次；
5. `batchChallenge_*` 仍作为旧局部批次练习单独记录；
6. 预览首页保留语法挑战、新词导览、底部功能和打卡栏；
7. 退出挑战记录当前得分并消耗一次机会。

## 远程动作

本次未执行：

- PR；
- merge；
- deploy；
- 正式入口切换；
- Service Worker 更新；
- Supabase 表结构或线上数据修改。
