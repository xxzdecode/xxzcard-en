# 执行卡 021｜R06 Cloudflare 静态资源部署配置

批次：`B20260801-A`  
需求编号：`R06`  
更新时间：2026-08-01（UTC+8）  
状态：`READY_GPT`  
优先级：P0（批次发布阻塞）  
默认实施者：GPT  

## 1. 根因

Cloudflare Workers Git 集成默认执行 `npx wrangler deploy`，但仓库没有 Worker `main` 入口，也没有声明静态资源目录，因此所有业务 PR 都出现：

```text
Missing entry-point to Worker script or to assets directory
```

这属于仓库级发布配置缺陷，不属于 R01、R02、R04 或 R05 的业务代码问题。

## 2. 目标

把当前无构建步骤的静态站点按 Workers Static Assets 方式部署：

- 使用仓库根目录中的正式 HTML、CSS、JS、图片、字体和数据文件；
- 不引入 Worker 业务脚本；
- 不修改现有页面路由、Service Worker、Supabase 或业务逻辑；
- 不公开上传测试、执行卡、项目规则、依赖和部署配置文件。

## 3. 实施范围

新增：

- `wrangler.jsonc`
- `.assetsignore`

`wrangler.jsonc` 固定声明：

- Worker 名称：`xxzcard-en`；
- `compatibility_date`；
- `assets.directory` 指向仓库根目录 `.`。

`.assetsignore` 至少排除：

- `.git/`、`.github/`、`.wrangler/`；
- `node_modules/`；
- `tests/`、`scripts/`、`docs/`；
- 备份与导入临时目录；
- `package.json`、锁文件；
- `AGENTS.md`、项目状态/索引、其他 Markdown；
- `wrangler.jsonc` 和 `.assetsignore` 本身。

## 4. 禁止事项

- 不在四个业务 PR 中分别复制部署修复；
- 不新增无必要的 Worker `main` 脚本；
- 不把站点迁移为新的框架或构建系统；
- 不启用 SPA fallback 或改写 404 行为，除非有独立证据；
- 不修改 Cloudflare 密钥、域名、路由或环境变量；
- 不修改 R03。

## 5. 验证

至少确认：

1. `wrangler.jsonc` 可被 Wrangler 读取；
2. `assets.directory` 指向存在的目录；
3. 根 `index.html`、`service-worker.js`、正式 JS/CSS 与业务子目录未被 `.assetsignore` 排除；
4. `tests/`、`docs/`、`scripts/`、项目规则与包清单被排除；
5. Cloudflare 对 R06 PR 最新提交不再报缺少入口或资源目录；
6. Preview/部署成功后，首页和至少一个正式子页面可以加载。

无法在 GPT 环境本地模拟的 Cloudflare 远端部署，以 PR 的 Cloudflare 构建结果作为正式验证证据。

## 6. 分支与 PR

分支：

```text
fix/B20260801-A-R06-cloudflare-static-assets-deploy
```

Draft PR：

```text
R06 Fix Cloudflare static assets deployment
```

最小回执：

```text
R06｜PR #编号｜异常说明
```
