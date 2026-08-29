# 语法挑战

本目录保存学生端语法挑战的通用答题骨架、兼容旧练习数据和版本化课程题库。学生首页与目录入口由主应用负责。

## 文件分工

- `index.html`：通用页面结构。
- `css/challenge.css`：通用视觉和 iPad / iPhone 响应式布局。
- `js/challenge-shell.js`：题目渲染、内存状态、导航、提交与结果复盘。
- `data/catalog.js`：目录登记，主应用按日期倒序生成挑战目录。
- `data/*.js`：每一天的练习配置和题目数据。
- `data/course-question-banks.json`：由 Material Hub 生成的课程权威题库；网站优先读取它，旧 `question-bank.js` 只作兼容回退。

## 当前课程与组卷

- 老师端只保存一个 `currentCourse`，值为课程 `lessonKey`；选择课程不改变 `grammar_progress` 的授课状态。
- 随堂练习用同一课程记录的 `classroomPracticeId`，语法挑战用同一课程的 `questions`。
- 每轮固定 15 道计分题：当前课程 8 题、正式 `active/improving` 薄弱项 4 题、历史复习 3 题；薄弱项或历史不足时先由当前课程补齐。
- 历史资格只来自已授课课程，或该学生以前实际抽到过的具体 `bankItemId`；课程编号和日期顺序不会自动开放前序课程。
- 答错后进入计分题之外的即时纠错；优先使用同 `variantGroupId` 的现成变式，没有变式则解释后重做原题。纠错结果不改原始分数、金币或首次作答证据。

## 新增练习

复制一份 `data/2026-07-15.js`，只修改其中的 `id`、日期、名称、提示、知识点和题目数据，再在 `data/catalog.js` 登记一次。文件名只能使用小写英文字母、数字和短横线。无需复制或修改 HTML、CSS 和通用 JS。

使用静态服务器打开：

```text
http://127.0.0.1:PORT/grammar-challenge/?practice=grammar-2026-07-15-sentence-skeleton
```

答案、标记和本次分数只保存在当前页面内存中；刷新、关闭或重新进入后会从第 1 题开始。
