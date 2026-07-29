# 执行卡 5｜本地执行与 GPT 交接日志

> 日期：2026-07-29
> 状态：本地 QA 已完成，等待用户验收
> 分支：`codex/vocabulary-adventure-card-5`
> 前置基线：`740c9602ea02f6f60188de053d86c6ae89ec8444`
> 远端状态：未 push、未创建 PR、未 merge、未 deploy

---

## 1. 本轮实际范围

本轮先创建并更新：

```text
docs/vocabulary-adventure/05-执行卡-本地完整QA与MVP验收包.md
```

按实际使用场景明确：

- 删除同一账户多设备同时挑战、版本冲突和 stale-state 竞争作为强制项；
- 不开发同账户多设备并发控制；
- 普通换设备读取和刷新恢复仍验证；
- sister / brother 两个独立用户同时挑战是 P0 数据隔离验收；
- 正式视口是 iPhone 16 竖屏、iPad 11 横屏和普通桌面；
- 不测试或适配 iPhone 横屏；
- 执行卡 4 已知限制改为当前正式表述。

同步修正：

```text
docs/vocabulary-adventure/04-本地执行与GPT交接日志.md
```

没有修改执行卡 1～4 的产品模块。本轮验收未发现需要修改产品代码的缺陷。

---

## 2. 开始状态

开始时当前固定工作区位于：

```text
branch = codex/vocabulary-adventure-card-3
HEAD = b7f482b615d5b01dea62a9be10d1b00b80ec32f0
```

目标执行卡 5 文件在所有本地分支中均不存在。执行卡 4 的完整本地基线位于：

```text
branch = codex/vocabulary-adventure-card-4
HEAD = 740c9602ea02f6f60188de053d86c6ae89ec8444
```

该基线工作树干净，且包含执行卡 4 正式收尾。因此从该本地提交创建：

```text
codex/vocabulary-adventure-card-5
```

没有 fetch、pull、reset、覆盖或远端同步。

---

## 3. 实际修改文件

文档：

```text
docs/vocabulary-adventure/04-本地执行与GPT交接日志.md
docs/vocabulary-adventure/05-执行卡-本地完整QA与MVP验收包.md
docs/vocabulary-adventure/05-本地执行与GPT交接日志.md
```

测试与命令：

```text
package.json
tests/vocabularyAdventureChallenge.test.js
tests/vocabularyAdventureChallengeViewport.mjs
tests/vocabularyAdventureReviewViewport.mjs
tests/vocabularyAdventureViewport.mjs
```

没有修改：

```text
任何产品 JS
任何产品 CSS
index.html
service-worker.js
Supabase 表结构或线上数据
线上默认入口
```

---

## 4. 基线测试

### 4.1 初次环境问题

第一次 `npm test`：

- 探险、播放器、抗遗忘、挑战、共享次数、生词巩固测试已通过；
- `vocabularyLessonImporter.test.js` 因当前工作树未安装 `sharp` 停止。

安装 `package.json` 已声明的本地依赖后，沙箱内再次运行：

- 导入器子进程得到 `status=null`；
- 四个 WebKit 脚本均因 `spawn EPERM` 停止。

这些与执行卡 4 已记录环境行为一致。未修改产品代码绕过测试。

### 4.2 允许子进程后基线结果

```text
npm test
```

结果：8/8 个正式脚本通过。

```text
node tests/createWordbook.test.mjs
```

结果：16/16 通过。

```text
C:\Users\xxz\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m unittest tests.test_publish_vocabulary_review_images
```

结果：6/6 通过。

仓库全部 `*.test.js` 在遇到缺少 `sharp` 前，其余文件全部通过；安装依赖并允许子进程后的正式 `npm test` 完整通过。

基线 WebKit：

```text
npm run test:adventure-viewport
npm run test:adventure-review-viewport
npm run test:adventure-challenge-viewport
npm run test:viewport
```

结果：4/4 个脚本通过。

### 4.3 执行卡 5 最终回归

完成全部测试增强后再次完整运行：

```text
npm test
```

结果：8/8 个正式脚本通过。

```text
仓库全部 tests/*.test.js
```

结果：17/17 个文件通过。

```text
node tests/createWordbook.test.mjs
```

结果：16/16 通过。

```text
Python vocabulary review image tests
```

结果：6/6 通过。

最终 WebKit 矩阵：

```text
npm run test:adventure-viewport
npm run test:adventure-review-viewport
npm run test:adventure-mvp-qa
npm run test:viewport
```

结果：4/4 个脚本通过。

---

## 5. P0 两用户同时挑战隔离

### 5.1 浏览器环境

使用两个独立 WebKit browser context：

```text
context A = sister
context B = brother
shared mocked Supabase kv_store
independent localStorage
```

两边同时读取同一 `main`，但分别读写：

```text
vocab_adventure_v1_sister
vocab_adventure_v1_brother
```

### 5.2 交错操作

自动测试执行：

1. sister 和 brother 同时进入挑战；
2. 确认两人的 session seed 和题目顺序独立；
3. sister 第一题答错，并让该次保存失败；
4. brother 第一题同时答对并成功保存；
5. sister cursor 仍为 0，brother cursor 已为 1；
6. sister 重试同一 prepared state 后才推进到 1；
7. brother 刷新并恢复第 2 题，题目保持不变；
8. sister 退出并计一次机会；
9. brother 继续完成整轮；
10. 最终分别检查 attempts、bestScore、wrongItems 和 session status。

结果：

```text
sister:
  status = abandoned
  attempts = 1
  bestScore = 0
  wrongItems = 1

brother:
  status = completed
  attempts = 1
  bestScore = 100
  wrongItems = 0
```

任意一方的保存失败、刷新、退出和完成均未影响另一方。

### 5.3 相同 wordKey

纯函数测试让 sister 和 brother 从两份独立状态回答相同 `wordKey`：

- sister 答错后仅 sister 的该词写入 `challengeFlagAt`；
- brother 答对后 brother 的该词仍没有 `challengeFlagAt`；
- 两边 cursor 各自推进；
- sister 有 1 条 wrong item，brother 为 0；
- sister 的操作没有改变 brother 的输入状态快照。

浏览器双 context 测试还确认 sister 错词的 `challengeFlagAt` 在 brother 相同 `wordKey` 中保持为空。

结论：未发现串线，P0 隔离通过。

---

## 6. 普通换设备与刷新恢复

没有测试同一账户多设备同时挑战。

顺序测试：

1. sister 在设备环境 A 开始挑战并保存第 1 题；
2. 关闭 A；
3. sister 在新的设备环境 B 从共享持久层读取；
4. B 恢复到 cursor 1；
5. B 显示 `2/10`；
6. 当前题与 A 保存后的确定性题目完全相同。

同一 context 刷新测试也确认：

- cursor 不回退；
- 当前题型、选项、答案位置和题目顺序不改变；
- 刷新不重复计分。

已知限制保持：

- `batchChallenge_*` 仍在当前浏览器 localStorage；
- 旧批次挑战记录本身不跨设备同步；
- 本项目不支持也不需要同一账户多设备同时挑战。

---

## 7. 正式视口

### 7.1 iPhone 16 竖屏

当前 Playwright 版本没有 `iPhone 16` 命名设备描述符。Apple 官方规格为 2556×1179 物理像素；本地自动化使用对应的：

```text
CSS viewport = 393 × 852
orientation = portrait
browser = WebKit
```

没有为词汇探险运行 iPhone 横屏测试，也没有增加横屏适配。旧 vocabulary lesson 自带的既有视口回归保持原样，不属于本卡正式设备矩阵。

自动验证：

- 首页“探险 / 挑战”入口完整可见；
- 无水平滚动；
- 入口和核心控件高度至少 44px；
- choice / input / order 三种交互均实际完成；
- 挑战题型覆盖选择、拼写、字母排序和句子排序；
- 使用 `electroencephalographically`、长中文释义和长英文例句验证换行；
- 顶部、主体和反馈区不重叠；
- 窄屏结果页可以滚到最后错题和操作按钮；
- 结果页操作按钮高度至少 44px。

软键盘边界：

- 自动化在输入框聚焦后把 visual viewport 从 393×852 缩到 393×560；
- 输入框、确认按钮和反馈区仍在可操作范围；
- 桌面 WebKit 不能弹出真实 iOS 系统软键盘，因此真实键盘覆盖仍应在发布前做一次真机确认；
- 未把模拟 visual viewport 缩小伪报成真实 iOS 键盘测试。

截图：

```text
test-results/vocabulary-adventure-challenge-iphone16-portrait-393x852.png
```

人工查看：长单词、长释义和长例句正常换行；错题卡无横向溢出；滚动到底后最后错题和两个操作按钮完整可见。

### 7.2 iPad 11 横屏

使用 Playwright 官方设备：

```text
device = iPad (gen 11) landscape
CSS viewport = 944 × 656
deviceScaleFactor = 2.5
isMobile = true
hasTouch = true
browser = WebKit
```

验证：

- 摸底题和逐词保存；
- 抗遗忘 `visualMatch`；
- 挑战 10 题完整流程；
- 挑战中实际完成 choice / input / order；
- 保存失败重试；
- 顶部、主体和底部反馈区不重叠；
- 结果页无水平滚动；
- 核心按钮至少 44px；
- sister / brother 切换后等待异步首页状态并刷新当前用户数据。

截图：

```text
test-results/vocabulary-adventure-card-2-ipad11-landscape-question-944x656.png
test-results/vocabulary-adventure-challenge-ipad11-landscape-944x656.png
```

人工查看：

- 摸底题顶部进度、四个选择项和反馈区清晰且无重叠；
- 挑战结果、错题、次数、最高分和操作区完整可见；
- 无横向溢出。

### 7.3 普通桌面

使用：

```text
1024 × 768
```

验证：

- 预览关闭时旧首页快捷入口仍存在；
- 今日挑战能进入旧 `screenDailyQuiz`；
- 老师端不显示探险统一入口；
- 非旧词汇功能入口未被隐藏；
- 旧 vocabulary lesson 视口回归通过；
- 无新增水平滚动，入口高度至少 44px。

---

## 8. 保存失败、退出和重复完成

现有与新增测试共同确认：

- 挑战计划首次保存失败时不开始；
- 单题保存失败时 cursor 保持不变；
- 重试保存同一 prepared state 后只推进一次；
- 保存失败不重复计分；
- 挑战退出只消耗一次机会；
- 已退出 session 不能再次退出计数；
- 完成时 attempts 和 bestScore 只更新一次；
- 错题只写 `challengeFlagAt`，不改变 D/H/F、interval、reviewCount 或冻结探险 plan；
- 摸底和抗遗忘保存失败同样不前进，重试复用同一对象。

---

## 9. 测试文件变化

`tests/vocabularyAdventureChallenge.test.js`：

- 新增相同 `wordKey` 的 sister / brother 独立状态测试。

`tests/vocabularyAdventureChallengeViewport.mjs`：

- 支持共享模拟持久层和按用户创建 context；
- 新增两个用户同时挑战的交错操作；
- 新增一方保存失败、另一方继续；
- 新增刷新、退出和完成隔离；
- 新增顺序换设备读取；
- 新增 iPhone 16 竖屏；
- 新增长文本、键盘 visual viewport、滚动到底和 44px 断言；
- 使用 iPad 11 官方设备描述符。

`tests/vocabularyAdventureViewport.mjs`：

- 增加 iPad 11 横屏设备配置和可见题目截图。

`tests/vocabularyAdventureReviewViewport.mjs`：

- 增加 iPad 11 横屏 `visualMatch` 设备配置。

`package.json`：

- 新增本地命令：

```text
npm run test:adventure-mvp-qa
```

---

## 10. 问题、严重级别与处理

### 环境问题 E1：缺少本地依赖

- 现象：`Cannot find module 'sharp'`；
- 类型：本工作树依赖未安装；
- 处理：只安装 `package.json` 已声明依赖用于本地测试；
- 产品修改：无。

### 环境问题 E2：沙箱禁止子进程

- 现象：导入器 `status=null`，WebKit `spawn EPERM`；
- 类型：执行环境权限；
- 处理：在允许 Node/Playwright 子进程的环境中原命令复跑；
- 产品修改：无。

### QA 证据问题 Q1：旧截图时机不清楚

- 现象：iPad 摸底原结果截图主体为空白，不能作为清晰人工证据；
- 严重级别：证据质量，不是产品缺陷；
- 处理：在首题完整渲染后新增稳定截图；
- 结果：题目、选项、进度和反馈区完整可见。

### 产品缺陷

本轮未发现 P0、P1 或其他需要修改产品代码的缺陷。

---

## 11. 残余风险

唯一尚需真机确认：

- 真实 iPhone 16 上 iOS 软键盘弹出、候选栏变化和浏览器工具栏收缩时，输入框、确认按钮、反馈区仍可持续操作。

本地自动化已经覆盖等效 visual viewport 缩小，但不能代替真实系统键盘。

不属于缺陷：

- `batchChallenge_*` 旧记录不跨设备；
- 不支持同账户多设备同时挑战；
- 本轮仍是本地预览，不是线上发布。

---

## 12. 范围隔离

确认：

- 未 push；
- 未创建 PR；
- 未 merge；
- 未 deploy；
- 未修改 Service Worker；
- 未修改 Supabase 表结构；
- 未写线上 Supabase 数据；
- 未切换线上默认入口；
- 未开发同账户多设备并发；
- 未适配或测试词汇探险 iPhone 横屏；
- 未修改无关页面或用户已有内容。

---

## 13. 交接结论

执行卡 5 的本地自动化、数据隔离和视觉验收通过。

关键结论：

- sister / brother 可分别同时挑战，状态完全隔离；
- 相同 `wordKey` 保持各自独立 `challengeFlagAt` 和词汇状态；
- 一方完成、退出、保存失败或刷新不影响另一方；
- iPhone 16 竖屏和 iPad 11 横屏自动验收通过；
- 普通桌面旧功能回归通过；
- 未实现不需要的同账户多设备并发控制；
- 真实 iPhone 软键盘保留为发布前唯一真机确认项。

本卡完成后应停止，等待用户验收。不得自行进入最终发布执行卡。
