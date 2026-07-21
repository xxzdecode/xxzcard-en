# 英语语法知识点库

任务 011 把语法知识点库作为老师端真实功能接入 `xxzcard-en`。主站入口名称为“知识点库”，加载 `grammar-library/index.html`。

## 文件结构

- `grammar-library/data/topics.json`：63 个稳定 `topic_key`，按 A–F 教学主线和基础参考排序。
- `grammar-library/data/source-coverage.json`：D1 59 项、D2 65 项、D3 29 项的逐项归属。
- `grammar-library/data/initial-progress.json`：当前正式教学状态的幂等初始化输入。
- `docs/grammar-source-coverage.md`：由结构化覆盖数据生成的人类可读矩阵。
- `supabase/migrations/20260721230000_create_grammar_knowledge_library.sql`：四张表、RLS、授权、状态历史和原子进度 RPC。
- `scripts/seed-grammar-library.mjs`：目录、来源映射和初始进度的 dry-run / 幂等写入脚本。

## 权限模型

知识点目录、来源映射和 `shared` 进度允许网站只读。状态写入只能调用 `set_grammar_progress`，并要求：

1. 请求使用 Supabase Auth 的 `authenticated` JWT；
2. JWT 的 `app_metadata.role` 是 `teacher` 或 `admin`；
3. 写入范围固定为 `shared`；
4. 每次变更与事件历史在同一数据库事务中完成。

匿名 key 没有 insert、update 或 delete 权限。不要把 `service_role` key 放入网页或仓库。

当前项目在任务开始时没有 Supabase Auth 用户。部署 migration 后，需要由项目管理员在 Supabase Auth 中创建教师用户，并通过受信任的管理端把该用户 `app_metadata.role` 设置为 `teacher`。不要使用可由用户自行修改的 `user_metadata` 做授权。

## 部署顺序

任务 011 默认只提交代码，不自动变更生产数据库。正式启用前按以下顺序执行：

1. 审阅并部署 migration。
2. 创建教师 Auth 用户并设置 `app_metadata.role=teacher`。
3. 使用环境变量运行 dry-run：

```powershell
node scripts/seed-grammar-library.mjs --dry-run
```

4. 在受信任环境提供 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 后执行一次 seed：

```powershell
node scripts/seed-grammar-library.mjs --apply
```

seed 会更新目录和来源映射，但只插入数据库中尚不存在的初始进度；不会覆盖教师已经人工更新的进度。

## 旧版 localStorage

页面识别 `grammarProgress`、`grammar-progress`、`grammar_checked` 和 `englishGrammarProgress`。只有教师登录后才显示导入入口。导入按稳定 `topic_key`、中文标题或英文标题映射，并以 `p_only_if_missing=true` 写入：数据库已有记录一律跳过，最终显示新增、跳过和无法映射数量。

## 检查

```powershell
node --check grammar-library/app.js
node scripts/seed-grammar-library.mjs --dry-run
node tests/grammarLibrary.test.js
```
