# 执行卡 1｜本地执行与 GPT 交接日志

> 用途：记录 Codex 执行过程中遇到的问题、实现决策、验证证据和下一轮注意事项，供用户验收后转交 GPT 编写后续执行卡。
> 约束：本文件只记录本地执行卡 1；没有 push、PR、merge、deploy 或线上数据结构变更。

## 1. 正式基线

- GitHub `main` 只读 fetch 后的基线：`51e85f05fe9828544e66a6c407e6b9d4ea47de4c`。
- 开发完成前再次只读 fetch，GitHub `main` 已前进到
  `212a6db`；新增提交只涉及随堂练习目录和词性练习文件，与执行卡 1 文件不重叠。
- 本轮通过本地 rebase 把最终提交建立在 `212a6db` 之上；没有 merge 或远程写入。
- 本地开发分支：`codex/vocabulary-adventure-card-1`。
- 开始时工作区干净。
- 两份权威输入均直接从 `origin/main` 读取：
  - `00-完整需求与本地开发流程.md`
  - `01-执行卡-状态取词与每日计划生成引擎.md`

## 2. 修改前发现的问题

### 2.1 grammarLibrary 测试断言落后于正式实现

- 现象：`tests/grammarLibrary.test.js` 同时要求当前 REST 查询参数、旧对象字段
  `key: 'grammar_progress'` 和旧写入头 `resolution=merge-duplicates`。
- 正式实现：`grammar-library/app.js` 当前通过 REST 查询参数
  `key=eq.grammar_progress` 只读加载进度，不再包含页面侧写入代码。
- 判断：两个旧格式断言均已落后于正式只读实现。
- 本地处理：删除旧字段和旧写入头断言，保留当前 REST 读取目标及无登录/管理端代码断言；未修改 grammar library 产品代码。

### 2.2 studyCardFlip 测试写死旧 Service Worker 版本

- 现象：`tests/studyCardFlip.test.js` 写死要求 `vocabulary-review-v18`。
- 正式实现：当前缓存名已为 `vocabulary-review-v21-layoutfix-...`。
- 判断：测试把历史版本号当成行为要求，导致正式版本升级后误报。
- 本地处理：改为验证缓存名保持合法的 `vocabulary-review-v数字...` 格式；未修改 Service Worker、缓存版本或发布行为。

### 2.3 受限环境阻止测试内部启动 Node 子进程

- 现象：`tests/vocabularyLessonImporter.test.js` 在受限环境中得到 `spawnSync.status = null`。
- 核对：允许本地子进程后原测试完整通过。
- 判断：这是 `spawn` 权限环境问题，不是导入器代码失败。
- 后续建议：执行卡要求完整测试时，应把 `status=null` 与普通非零退出码分开记录。

### 2.4 系统 `python` 是 Windows Store 占位命令

- 现象：直接执行 `python` 返回 9009。
- 本地处理：改用 Codex 随附 Python：
  `C:\Users\xxz\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`
- 结果：现有 6 个 Python 测试通过。

### 2.5 本地缺少 package.json 已声明依赖

- 现象：首次运行完整测试时无法加载 `sharp`。
- 本地处理：执行本地 `npm install --no-audit --no-fund` 供测试使用。
- 说明：依赖安装产物不属于执行卡产品改动，不纳入本地 commit。

## 3. 执行卡 1 实现决策

- 核心纯函数集中在 `js/vocabularyAdventureCore.js`，不依赖 DOM、Supabase 或旧任务引擎。
- 浏览器存储适配集中在 `js/vocabularyAdventure.js`。
- 可见词本规则不复制：适配层调用现有 `visibleBatches()` 与
  `filterBatchesByBookPurpose(..., true, false)`，再交给核心层校验卡片和去重。
- 未摸底词顺序采用现有可见正式常用词本返回顺序，再按词本内原始 `cards` 顺序；不随机。
- 抗遗忘同级排序采用：
  `nextReviewAt` 更早 → `lastReviewedAt` 更早 → 原始候选顺序更早。
- 状态 key 集中由 `adventureStateKeyForUser()` 生成，当前只接受 `sister` 和 `brother`。
- 保存继续经过现有 `sbSet`；失败返回 `false`，不写本地假成功。
- 本轮只加载后台模块，不增加按钮、不改变首页和旧任务入口。

## 4. 范围隔离

本轮没有修改：

- `js/home.js`
- `js/tasks.js`
- `js/review.js`
- `js/quiz.js`
- `js/questionTypes.js`
- `js/main.js`
- `service-worker.js`
- 首页结构与按钮
- 单词卡字段
- Supabase 表结构或线上数据

本轮没有实现：

- 摸底或抗遗忘播放器
- 提示交互
- 新题型
- 挑战待复查写入界面
- 首页“探险 / 挑战”切换
- 地图、动画、金币或老师报告

## 5. 测试与结果

### 5.1 新模块

- `node --check js/vocabularyAdventureCore.js`：通过。
- `node --check js/vocabularyAdventure.js`：通过。
- `node tests/vocabularyAdventure.test.js`：通过。
- 固定样例输出：`26 screening + 4 review`，总数 30。

### 5.2 现有完整测试

- 仓库全部 14 个 `*.test.js / *.test.mjs` 文件：通过。
- `npm test`：通过，已包含新增探险测试。
- `npm run test:viewport`：WebKit 视口测试通过；受限环境首次出现
  `spawn EPERM`，允许本地无头浏览器后通过。
- `python -m unittest tests.test_publish_vocabulary_review_images`：
  使用 Codex 随附 Python 运行，6 个测试通过。
- 仓库没有 lint 或类型检查命令。

### 5.3 本地提交

- 完成本文件后创建一个本地 commit。
- commit SHA 以 Codex 最终完成报告为准；本轮明确不 push。

## 6. 当前已知边界

- 执行卡 1 没有 UI，人工验证采用 Node 固定样例输出。
- 新脚本已在本地 `index.html` 加载，但按执行卡约束未修改
  `service-worker.js`。在最终发布执行卡中必须把正式缓存资源列表与版本一起处理。
- 本轮没有真实写入 Supabase；存储适配通过 mock 验证两个学生 key、
  保存失败和同日恢复。线上数据写入应留给后续播放器执行卡及最终发布验收。

## 7. 给后续执行卡的接口提示

- 核心 API 暂由全局 `VocabularyAdventureCore` 提供；Node 测试也可 `require`。
- 浏览器适配函数：
  - `adventureStateKeyForUser`
  - `collectVisibleVocabularyAdventureCandidates`
  - `loadVocabularyAdventureState`
  - `saveVocabularyAdventureState`
  - `previewVocabularyAdventurePlan`
  - `loadOrCreateVocabularyAdventureSession`
- `previewVocabularyAdventurePlan` 只生成或恢复内存结果，不自动保存，适合作为下一张播放器执行卡的只读入口。
- `loadOrCreateVocabularyAdventureSession` 会在首次创建当日计划时保存；同日或前日恢复不会重排或重复写入。
- 播放器提交每个正式结果时，应调用 `applyAdventureResult`，然后保存整个规范化状态；不要重新维护另一套间隔算法。
- 下一张执行卡若要求离线加载新模块，需要在最终发布阶段一并处理 Service Worker 资源列表和缓存版本；执行卡 1 按要求没有修改正式缓存版本。
