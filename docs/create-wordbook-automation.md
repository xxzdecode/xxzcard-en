# 新建单词本自动化

`scripts/create-wordbook.mjs` 把 ChatGPT 已经完成的真实导入 TXT 校验后创建为一个新单词本。脚本不会生成、补写或修改释义、音标、搭配及其他卡片内容。

## 一次性安装事务 RPC

当前 `xxzworden` 项目已于 2026-07-20 应用 `create_wordbook_atomic` migration。新环境或数据库重建后仍需按下列步骤安装。

先在 Supabase SQL Editor 中审阅并执行：

```text
scripts/sql/create-wordbook-atomic.sql
```

函数使用 `security invoker`，锁定 `kv_store` 的 `main` 行，在同一数据库事务内完成最终查重和追加。任何检查或更新异常都会让整个函数调用回滚。SQL 明确撤销 `PUBLIC` 的默认函数执行权，只授予当前项目使用的 `anon`、`authenticated` 角色；若项目之后改为教师专用认证，应同步收紧此授权。

不要用正式单词本验证安装。先运行仓库测试和本地快照 dry-run。

## TXT 要求

输入必须是当前网页导入器接受的逐字段格式，每张卡固定 11 行、卡片间一个空行。脚本首先复用 `js/import.js` 中的 `parseCards()`，随后补充严格检查：

- UTF-8、无 BOM、无制表符和不可见控制字符；
- 11 个字段完整且顺序固定；
- 五个数组字段是单行合法 JSON；
- 数组对象字段和顺序符合当前规则；
- `pos` 使用规定缩写，`phonetic` 使用 `/ /` 且拒绝明确的美式符号；
- 每张卡有 1–5 个搭配，例句使用 `英文 / 中文` 分隔；
- 当前 TXT 内标准化后没有重复词。

内容正确性仍由 ChatGPT 和人工审核负责。脚本只验证可机械确认的格式与结构，不重新生成内容。

## 安全 dry-run

日常固定任务优先使用 `task.json`：

```powershell
node scripts/create-wordbook.mjs `
  --task "D:\任务目录\task.json" `
  --dry-run
```

脚本会相对 `task.json` 解析 `sourceFile`，并强制核对 `taskId`、`date`、`Asia/Singapore`、两个推送对象、`expectedCardCount` 和 `expectedWords`。`result.json` 默认写在任务目录中。

使用仓库测试夹具，不访问 Supabase：

```powershell
node scripts/create-wordbook.mjs `
  --file tests/fixtures/create-wordbook/valid-cards.txt `
  --name "自动化测试" `
  --task-id "fixture-create-wordbook-001" `
  --dry-run `
  --snapshot tests/fixtures/create-wordbook/empty-main.json `
  --result result.json
```

真实任务先做只读云端查重：

```powershell
$env:SUPABASE_URL = "https://PROJECT.supabase.co"
$env:SUPABASE_KEY = "项目允许调用该 RPC 的 key"
node scripts/create-wordbook.mjs `
  --file "D:\待导入\cards.txt" `
  --name "课堂词汇" `
  --task-id "lesson-2026-07-21-wordbook" `
  --dry-run
```

`--dry-run` 只读 `kv_store.main`；不会调用 RPC 或写任何 Supabase 键。

## 正式 apply

确认 dry-run 的 `result.json` 后，日常任务保持同一 task 文件：

```powershell
node scripts/create-wordbook.mjs `
  --task "D:\任务目录\task.json" `
  --apply
```

直接参数模式则保持相同的 `--file`、`--name` 和 `--task-id`：

```powershell
node scripts/create-wordbook.mjs `
  --file "D:\待导入\cards.txt" `
  --name "课堂词汇" `
  --task-id "lesson-2026-07-21-wordbook" `
  --apply
```

流程如下：

1. 读取并完整校验 TXT。
2. 第一次读取 Supabase，检查 taskId、同名批次、现有词和历史卡片指纹。
3. `--apply` 前再次读取并重复检查。
4. 调用 `create_wordbook_atomic`；RPC 在行锁事务内第三次检查并一次追加。
5. 写后重新读取 `main`，验收批次 ID、名称、日期、卡片数量、11 字段、唯一词数、指纹以及 `sharedWith`。
6. 原子写出 `result.json`。

自动名称按 `Asia/Singapore` 生成 `MM.DD｜名称`。新批次固定：

```json
"sharedWith": ["sister", "brother"]
```

脚本只读写 `kv_store.main`，不会创建或覆盖 `sister_<batchId>`、`brother_<batchId>`，也不会在批次内加入 `known` / `unknown`。

## 幂等规则

- 相同 taskId、批次 ID、名称正文和完整指纹集合：返回 `already_applied`，不重复写入；隔天重跑仍保留首次创建的日期与完整批次名。
- taskId 相同但载荷不同：失败。
- 同名批次或同 ID 已存在：失败。
- 任一卡片指纹已由自动化批次使用：失败。
- 任一标准化单词已在正式库存在：失败。

修正输入后如任务语义仍是同一次发布，保留 taskId；若是明确的新任务，使用新的稳定 taskId。不要用随机 taskId 绕过冲突。

## result.json

默认输出到当前目录，也可用 `--result` 指定。报告包含：

- `status`：`dry_run_ready`、`applied`、`already_applied` 或 `failed`；
- 使用 `--task` 时，正式结果使用 `success`、`already_completed`、`no_changes`、`failed` 或 `verify_failed`，并输出计划约定的顶层字段；
- 批次 ID、日期、自动名称、推送对象和卡片指纹；
- 卡片数量与唯一词数；
- 两次发布前查重、事务写入、写后验收和推送状态；
- 失败代码及详情；
- `learningStateWrites: 0`，用于明确本流程没有写学习状态。

## 测试

```powershell
node --test tests/createWordbook.test.mjs
node tests/cardSchema.test.js
```

测试使用本地夹具和 mock Supabase，不连接正式库。

若受限 Windows 沙箱阻止 `node --test` 创建子进程，可直接运行 `node tests/createWordbook.test.mjs`；测试内容相同。
