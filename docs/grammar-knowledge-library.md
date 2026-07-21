# 英语语法知识点库

任务 011 把语法知识点库作为老师端真实功能接入 `xxzcard-en`。主站入口名称为“知识点库”，加载 `grammar-library/index.html`。

## 文件结构

- `grammar-library/data/topics.json`：63 个稳定 `topic_key`，按 A–F 教学主线和基础参考排序。
- `grammar-library/data/source-coverage.json`：D1 59 项、D2 65 项、D3 29 项的逐项归属。
- `grammar-library/data/initial-progress.json`：当前正式教学状态的幂等初始化输入。
- `docs/grammar-source-coverage.md`：由结构化覆盖数据生成的人类可读矩阵。
- `scripts/seed-grammar-library.mjs`：对 `kv_store/grammar_progress` 做 dry-run 或幂等初始化。

## Supabase 存储模型

按用户确认，知识点库沿用主站现有“老师 PIN 进入、无 Supabase Auth”模型，不增加教师账号登录。

教学进度保存在已有 `public.kv_store` 的独立 `grammar_progress` 记录中，不改动单词卡使用的 `main` 记录。`value` 包含：

- `schemaVersion` 和 `scopeKey=shared`；
- 按稳定 `topic_key` 保存的四状态、最后课程日期、备注和更新时间；
- 最近 1000 条状态变更事件。

静态前端的 anon key 是公开的，老师 PIN 只负责网站界面分流，不是数据库身份认证。不要把 `service_role` 或 secret key 放入网页或仓库。

## 初始化

```powershell
node scripts/seed-grammar-library.mjs --dry-run
```

需要写入时，在环境变量提供 `SUPABASE_URL` 和当前网站的 `SUPABASE_KEY`：

```powershell
node scripts/seed-grammar-library.mjs --apply
```

脚本只补充尚不存在的初始 topic，不覆盖已有人工状态。

## 旧版 localStorage

页面识别 `grammarProgress`、`grammar-progress`、`grammar_checked` 和 `englishGrammarProgress`。检测到旧数据时显示导入入口；云端已有的 topic 一律跳过。

## 检查

```powershell
node --check grammar-library/app.js
node scripts/seed-grammar-library.mjs --dry-run
node tests/grammarLibrary.test.js
```
