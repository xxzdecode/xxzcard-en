# PROJECT_INDEX

## 1. 项目用途

这是一个面向英语单词卡学习的静态前端项目，页面标题为“英语提升计划”。项目主要支持老师维护单词本、学生进行单词学习、复习、挑战、专项小游戏、单词卡查看和音标训练。

项目当前以 `index.html` 为主入口，通过多个 `js/` 文件拆分功能逻辑。数据通过 Supabase REST API 读写 `kv_store`，同时使用 `localStorage` 做本地镜像和离线兜底。

## 2. 主要页面 / 入口文件

- `index.html`：主页面入口，包含所有主要 screen 容器、弹窗、按钮绑定和脚本加载顺序。
- `styles.css`：全局样式、首页、任务按钮、单词卡、复习/挑战、弹窗、老师/学生视图等样式。
- `quizzes/third-person-sort.html`：独立专项小游戏页面，当前由主应用通过 iframe 打开。
- `js/main.js`：把函数暴露到 `window`，供 `index.html` 内联事件使用；同时执行应用初始化。

`index.html` 中的主要 screen：

- `screenHome`：首页、用户切换、学生今日/混合任务与学习入口，以及老师端“单词卡 / 随堂练习 / 生词巩固”三个主入口。
- `screenVocabularyReviewList`：老师端生词巩固目录与单词选择页。
- `screenVocabularyReview`：生词巩固学习/自测卡片页。
- `screenTeacherWordCards`：老师端单词管理入口页，包含任务词库设置、单词去重、新建单词本和单词本列表。
- `screenCourseware` / `screenCoursewarePlayer`：老师端随堂练习目录与独立 iframe 播放页；内部 ID 保留旧名称以兼容已有入口。
- `screenWordCards`：学生单词卡列表和单词卡查看。
- `screenPhonemeTraining`：音标训练。
- `screenThemeQuizzes`：专项小游戏列表。
- `screenThemeQuizPlayer`：专项小游戏 iframe 播放页。
- `screenWordDedupe`：老师端单词去重工具 iframe 页面。
- `screenNewBatch`：新建或追加导入单词。
- `screenDetail`：单个单词本详情、编辑、同步、推送、批次任务。
- `screenReview`：温习任务。
- `screenStudy`：普通学习卡片。
- `screenDailyQuiz`：挑战/测验题目。
- `screenMerge`：混合词库选择。
- `screenResult`：测验结果。

## 3. 主要功能模块

- `js/config.js`：Supabase 地址和请求头、默认卡片、卡片 emoji 和背景池。
- `js/state.js`：全局运行时状态，包括当前用户、当前批次、学习进度、测验状态、混合选择、复习状态、PIN 状态等。
- `js/repository.js`：数据读写层，负责 Supabase REST 访问、本地缓存、初始化数据、离线提示、批次日期和名称规范化。
- `js/utils.js`：通用辅助函数，如当前批次、当前用户记录、老师判断、可见批次、screen 切换。
- `js/auth.js`：用户切换、老师 PIN、用户栏状态、弹窗关闭、学生运行时视图重置。
- `js/home.js`：首页加载、打卡、批次列表、首页任务按钮、全局学习/随机/每日测验入口。
- `js/batch.js`：单词本详情、重命名、编辑面板、单词选择、卡片编辑、删除、同步记录、推送给学生。
- `js/import.js`：新建单词本或追加导入，解析输入文本并确认导入。
- `js/dictionary.js`：英语卡片标准化、词典字段解析、单词索引、词义/词族/搭配/例句展示、单词搜索、音标训练。
- `js/tasks.js`：今日/混合/批次任务状态、任务完成记录、挑战次数限制、任务词库抽取、混合词库设置。
- `js/taskEngine.js`：统一任务入口，按来源和模式启动温习或挑战。
- `js/review.js`：温习流程编排，负责步骤进度、错题卡、错题回顾和完成逻辑。
- `js/questionTypes.js`：统一题型注册入口，包含挑战与温习注册表，以及选择、听力、拼写、排序等共享交互能力。
- `js/quiz.js`：每日挑战/测验题生成、拼写拼图、选项渲染、答题确认和下一题流程。
- `js/study.js`：普通学习卡片翻面、认识/不认识判断、滑动动画。
- `js/merge.js`：多个单词本合并练习、智能抽取、混合模式菜单和结果。
- `js/themeQuizzes.js`：专项小游戏注册表和 iframe 打开/关闭逻辑。
- `js/courseware.js`：独立随堂练习清单、老师端目录渲染和 iframe 播放器开关逻辑；文件名保留用于兼容。
- `js/courseware-data.js`：由练习上传脚本维护的随堂练习目录数据；文件名和旧全局变量别名保留用于兼容。
- `js/wordDedupe.js`：老师端单词去重入口、权限检查和 iframe 页面开关逻辑。
- `js/vocabularyReviewData.js`：生词巩固当前词表、音标、释义和图片路径。
- `js/vocabularyReview.js`：生词巩固目录、学习/自测切换、卡片翻面、滑动和图片预加载。
- `tools/word-dedupe/index.html`：可独立打开的只读 Supabase 单词去重工具。
- `scripts/add-practice.mjs`：随堂练习上传的主命令；`scripts/add-courseware.mjs` 作为旧命令兼容入口保留。详细触发流程由 `xxzdecode/xxz-tools` 的 `xxzcard-en-hub/README.md` 维护。
- `scripts/create-wordbook.mjs`：从已完成内容的真实导入 TXT 自动校验、查重并通过事务 RPC 新建单词本；使用说明见 `docs/create-wordbook-automation.md`。
- `scripts/publish-vocabulary-review-images.py`：生词巩固图片批量发布命令；`prepare` 统一处理全部 pending 批次，推送成功后再用 `finalize` 一次性回写完成状态。

## 4. 数据流相关文件

- `js/config.js`：定义 Supabase `SB_URL`、`SB_KEY`、`SB_HEADERS`，以及默认数据。
- `js/state.js`：保存运行时全局状态。
- `js/repository.js`：核心数据流文件。
  - `loadData()` / `saveData()` 读写主数据 `main`。
  - `loadUserBatch()` / `saveUserBatch()` 读写学生个人批次记录。
  - `sbGet()` / `sbSet()` 负责 Supabase 和 `localStorage` 镜像。
  - `normalizeAppData()` / `normalizeBatch()` / `normalizeEnglishCard()` 负责数据规范化。
  - 定时轮询会定期拉取云端数据并刷新首页。
- `js/import.js`：把老师输入的文本解析为 cards 并写入 appData。
- `js/batch.js`：修改单词本、编辑单词、推送可见学生、清空学生记录。
- `js/tasks.js`：读写每日任务、挑战次数、混合词库设置。
- `js/home.js`：根据 appData、用户记录和任务状态渲染首页。
- `js/dictionary.js`：对卡片字段做标准化和展示层解析。

随堂练习目录（保留历史路径）：

- `courseware/`：已发布随堂练习文件；为保证历史 URL 可访问，不迁移或改名。
- `js/courseware-data.js`：随堂练习目录数据，由 `scripts/add-practice.mjs` 更新。

## 5. 配置 / 构建相关文件

- `index.html`：静态页面入口，同时定义脚本加载顺序。
- `styles.css`：全局样式入口。
- `js/config.js`：运行时配置和默认数据。
- `scripts/add-practice.mjs`：无构建系统下的随堂练习上传主命令；旧脚本路径继续兼容。
- `scripts/create-wordbook.mjs`：复用网页 `parseCards()` 的新建单词本 CLI，支持夹具/只读 `--dry-run`、事务 `--apply` 和 `result.json` 验收报告。
- `scripts/publish-vocabulary-review-images.py`：生词巩固图片的批量校验、WebP 转换、数据路径与离线缓存更新，以及推送后的本地状态回写。
- `.gitignore`：Git 忽略规则文件。

当前项目目录中没有看到 `package.json`、打包配置或测试配置；项目形态更接近直接由浏览器加载的静态 HTML/CSS/JS。

`index.html` 当前脚本加载顺序：

1. `js/config.js`
2. `js/state.js`
3. `js/repository.js`
4. `js/utils.js`
5. `js/dictionary.js`
6. `js/auth.js`
7. `js/home.js`
8. `js/themeQuizzes.js`
9. `js/courseware-data.js`
10. `js/courseware.js`
11. `js/batch.js`
12. `js/import.js`
13. `js/tasks.js`
14. `js/review.js`
15. `js/study.js`
16. `js/quiz.js`
17. `js/questionTypes.js`
18. `js/taskEngine.js`
19. `js/merge.js`
20. `js/wordDedupe.js`
21. `js/vocabularyReviewData.js`
22. `js/vocabularyReview.js`
23. `js/main.js`

## 6. 常见任务应该先看哪些文件

- 看项目整体入口和页面结构：先看 `index.html`，再看 `js/main.js`。
- 看首页显示、用户入口、批次列表：先看 `js/home.js`，再看 `js/utils.js`、`styles.css`。
- 看老师新建/导入单词本：先看 `js/import.js`，再看 `js/repository.js`。
- 看单词本详情、编辑、推送给学生：先看 `js/batch.js`，再看 `js/repository.js`。
- 看 Supabase / 本地缓存 / 离线逻辑：先看 `js/config.js`、`js/repository.js`、`js/state.js`。
- 看批次日期、批次名称、排序相关：先看 `js/repository.js`、`js/tasks.js`。
- 看今日温习、今日挑战、混合温习、混合挑战：先看 `js/taskEngine.js`、`js/tasks.js`，再看 `js/review.js`、`js/quiz.js`、`js/questionTypes.js`。
- 看普通单词卡学习流程：先看 `js/study.js`，再看 `js/batch.js`。
- 看复习题型和错题流程：先看 `js/review.js`。
- 看挑战题型和判题：先看 `js/questionTypes.js`，再看 `js/quiz.js`。
- 看单词卡背面、词典字段、搜索、词族/搭配/例句：先看 `js/dictionary.js`。
- 看音标训练：先看 `js/dictionary.js` 中的 phoneme 相关函数，再看 `index.html` 的 `screenPhonemeTraining`。
- 看专项小游戏入口：先看 `js/themeQuizzes.js`，再看 `quizzes/third-person-sort.html`。
- 看老师端随堂练习目录和播放器：先看 `js/courseware.js`、`js/courseware-data.js`，再看 `index.html` 的 `screenCourseware` 与 `screenCoursewarePlayer`；练习上传任务再看 `scripts/add-practice.mjs`。
- 看老师端单词去重入口：先看 `js/wordDedupe.js`，再看 `tools/word-dedupe/index.html`。
- 执行已完成内容的单词本任务：先看 `docs/create-wordbook-automation.md`，再使用 `scripts/create-wordbook.mjs`；不得跳过 dry-run 或改成普通多次写入。
- 看老师端生词巩固：先看 `js/vocabularyReview.js` 和 `js/vocabularyReviewData.js`，再看 `index.html` 中两个 vocabulary review screen。
- 上传生词巩固图片：先按外部固定流程确认来源，再使用 `scripts/publish-vocabulary-review-images.py prepare`；统一提交推送成功后使用 `finalize`。
- 看样式定位：先看 `styles.css`，再用 `index.html` 中对应 screen 的 class/id 对照。

## 7. 不要随便动的地方

- `js/config.js` 中的 Supabase 配置、默认数据和全局常量。
- `js/repository.js` 中的数据读写、离线兜底、批次规范化和轮询同步逻辑。
- `js/state.js` 中的全局状态变量名；许多模块直接依赖这些变量。
- `index.html` 底部脚本加载顺序；多个模块依赖前面脚本先定义的全局函数和变量。
- `js/main.js` 的 `Object.assign(window, ...)`；`index.html` 里大量内联事件依赖这些全局函数。
- `js/dictionary.js` 中的卡片字段标准化逻辑；它连接旧字段、新字段和展示层。
- `js/tasks.js`、`js/taskEngine.js`、`js/review.js`、`js/quiz.js`、`js/questionTypes.js` 之间的任务/题型协作关系。
- `js/themeQuizzes.js` 中的专项小游戏注册表；主页面入口依赖这里决定可打开的独立练习页。
- `courseware/` 与 `js/courseware-data.js`；只在有效的待上传练习说明和脚本预演通过后更新，且不得破坏历史路径。
