# 执行卡 6｜本地执行与 GPT 交接日志

## 1. 执行基线

- 正式仓库：`xxzdecode/xxzcard-en`
- 实际起始 SHA：`75fdeb0c27647d98ed7ea86d24feb6d76e5548f8`
- 执行分支：`codex/student-home-dashboard-card-6`
- 视觉参考：
  - `C:\Users\xxz\Desktop\童趣英语学习冒险乐园.png`
  - `C:\Users\xxz\Desktop\6ed629e8-f752-46e6-9dd6-eb291f8dbd57.png`
- 边界：只执行 Card 6；未推送、未部署，未实现 Card 7。

## 2. 实际完成

### 2.1 学生首页

- 学生首页正式改为固定顺序：
  1. 今日复习
  2. 挑战测验
  3. 今日新课
  4. 底部原有功能
- 词汇探险为整行主视觉卡；单词挑战/语法挑战、随堂练习/新词导览分别保持双列。
- 使用内联 SVG 与 CSS 自制场景，没有裁切概念图、没有外链素材、没有引入 UI 框架。
- 模块以外继续使用项目现有纯色渐变背景。
- 手机极窄屏仍保持两列；平板内容最大宽度为 820px。
- 所有入口继续使用真实 `button`，触控高度不低于 44px，并支持 `prefers-reduced-motion`。

### 2.2 入口与状态

- 词汇探险继续调用 `openVocabularyAdventure()`。
- 单词挑战继续调用 `openVocabularyAdventureChallenge()`，名称固定为“单词挑战”。
- 语法挑战继续调用 `openGrammarChallengeList()`。
- 新词导览继续调用 `openVocabularyReviewList()`。
- 新增 `openStudentClassroomPractice()`：只显示非阻塞提示“今天的随堂练习还没有发布”，不进入老师列表，不绕过 `isTeacher()`。
- 新学生首页成为默认布局，不再依赖 URL/localStorage 预览开关；旧预览解析函数保留，避免后续兼容清理扩大本卡范围。
- 姐姐/弟弟的探险、挑战读取仍使用各自现有状态键；没有新增共享状态。

### 2.3 首页旧入口与刷新

- 从首页 DOM 移除 `homeQuickActions`、`todayWordBtn`、`mixedWordBtn`。
- `loadHome()` 不再调用 `updateHomeTaskButtons()`，也不再加载首页旧快捷入口所需批次状态。
- 旧任务函数、旧数据键、单词本详情入口和兼容逻辑均保留。
- 底部“单词卡 / 音标训练 / 专项小游戏”功能和顺序未改。
- 老师首页入口和行为未改，学生仪表板对老师隐藏。

### 2.4 金币只读边界

- 新增 `renderStudentRewardSummary({ totalCoins, todayCoins, todayMaxCoins, available })`。
- 当前没有正式金币数据源，因此首页只显示“金币统计准备中”。
- 没有写入假金币，没有 Supabase/数据库改动，没有结算逻辑。

### 2.5 离线缓存

- `index.html`、`js/home.js`、`styles-home-nav.css` 都在现有预缓存清单内，因此缓存版本从 `v21` 升到标准格式 `v22`。
- 继续使用 `vN` 格式，保证 `publish-vocabulary-review-images.py` 能识别和递增版本。

## 3. 测试与视觉证据

### 3.1 自动化

- `npm test`：通过。
- `node --test "tests/**/*.test.js" "tests/**/*.test.mjs"`：34/34 通过。
- `python -m unittest tests.test_publish_vocabulary_review_images`：6/6 通过。
- `tests/vocabularyAdventureChallengeViewport.mjs`：通过。
- `tests/vocabularyAdventureViewport.mjs`：通过。
- `tests/vocabularyAdventureReviewViewport.mjs`：通过。
- `tests/vocabularyLessonViewport.mjs`：通过。
- `tests/studentHomeDashboardViewport.mjs`：通过。

WebKit 视口测试在本机需要：

```powershell
$env:NODE_PATH='C:\Users\xxz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
```

本轮安装了与项目 Playwright 版本对应的 WebKit 2311。测试显式禁用 Service Worker，避免多个独立 WebKit 上下文争用缓存；Service Worker 资源清单和版本由静态测试覆盖。

### 3.2 Card 6 验收截图

目录：

```text
D:\xxz-work\projects\xxzcard-en\.codex-backups\card6-visual-qa
```

- `01-sister-home-iphone.png`
- `02-brother-home-iphone.png`
- `03-teacher-home-iphone.png`
- `04-sister-home-ipad.png`
- `05-classroom-practice-unpublished.png`

人工检查结果：

- 三个分区清晰，词汇探险层级最高。
- 两组双卡在手机/iPad 均保持两列。
- 主卡 SVG 填满卡片，没有概念图裁切或外链素材。
- 文字未截断，页面无横向溢出，底部三个入口可见。
- 老师端没有学生仪表板。
- 未发布提示为页面内非阻塞状态条。

## 4. 执行中发现并处理的问题

1. 初始分支改名因 `.git/logs` 权限失败；随后从同一 HEAD 正常创建正式分支 `codex/student-home-dashboard-card-6`，工作内容没有丢失。
2. 本地缺少项目 `sharp`/Playwright 模块和 WebKit 浏览器；复用 Codex bundled Node 模块，并安装对应 WebKit。
3. Windows 沙箱内启动 WebKit出现 `spawn EPERM`；在获准的沙箱外环境运行。
4. 旧视口测试仍断言“预览关闭时显示今日单词/混合单词”，与 Card 6 冲突；更新为正式默认首页契约。
5. 多 WebKit 上下文会被 Service Worker 和 `networkidle` 等待拖慢；视口测试改为阻止 Service Worker、在 navigation commit 后显式等待应用元素。
6. 挑战视口测试存在“下一题”后立即操作旧题的竞态；增加题号同步等待。抗遗忘视口曾出现一次末段等待超时，带诊断重跑后完整通过，未发现产品错误。

## 5. 明确未完成 / 下一接口

- 未实现真实累计金币、今日金币、30 金币结算或任何写入。
- 未实现学生随堂练习分配、20 题流程、两次机会、评分或金币。
- 未改造探险答题页视觉；第二张参考图只用于探险风格理解，Card 6 实施范围仍是学生首页。
- 未实现商城、兑换、等级、经验、签到、连续奖励、合作奖励或排行榜。
- 未推送、未部署、未做线上验证。
- 下一步应由 Card 7 接入真实奖励与学生随堂练习数据，再调用本卡提供的只读渲染接口。

## 6. 最终提交

最终提交 SHA 在本日志所在提交完成后，以交付回报中的 `git rev-parse HEAD` 为准。
