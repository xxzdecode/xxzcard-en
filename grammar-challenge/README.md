# 语法挑战

本目录保存学生端语法挑战的通用答题骨架和独立练习数据。学生首页与目录入口由主应用负责；语法挑战不使用数据库或浏览器存储。

## 文件分工

- `index.html`：通用页面结构。
- `css/challenge.css`：通用视觉和 iPad / iPhone 响应式布局。
- `js/challenge-shell.js`：题目渲染、内存状态、导航、提交与结果复盘。
- `data/catalog.js`：目录登记，主应用按日期倒序生成挑战目录。
- `data/*.js`：每一天的练习配置和题目数据。

## 新增练习

复制一份 `data/2026-07-15.js`，只修改其中的 `id`、日期、名称、提示、知识点和题目数据，再在 `data/catalog.js` 登记一次。文件名只能使用小写英文字母、数字和短横线。无需复制或修改 HTML、CSS 和通用 JS。

使用静态服务器打开：

```text
http://127.0.0.1:PORT/grammar-challenge/?practice=grammar-2026-07-15-sentence-skeleton
```

答案、标记和本次分数只保存在当前页面内存中；刷新、关闭或重新进入后会从第 1 题开始。
