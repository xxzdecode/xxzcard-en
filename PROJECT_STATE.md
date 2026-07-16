# PROJECT_STATE

更新时间：2026-07-16

## 0. 已确认决策
* 部分重复功能实现可以参考 Italian 版本的功能结构。
* 不改变当前 English 版本的颜色方案或视觉参数。

## 1. 当前优先任务

### HW-021｜编号练习半自动 Agent / Worker MVP

当前进度：C01–C05 已完成本地实现与验证；尚未部署到生产 Supabase，尚未开始 C06 的真实定位/OCR。

#### C01 巡检结论

- 真实代码仓库：本仓库 `xxzdecode/xxzcard-en`；`xxz-tools/english-project/projects/homework-prep/` 只保存任务、规则、状态与试点产物，不作为运行时应用。
- Web 入口：`index.html` → 按既有顺序加载 `js/*.js` → `js/main.js` 初始化；当前是无打包步骤的静态 HTML/CSS/JS。
- 数据入口：`js/config.js` 在浏览器端配置 Supabase 项目 URL 与公开 `anon` key，`js/repository.js` 通过 REST 读写 `kv_store` 并以 `localStorage` 兜底；当前没有 Supabase SDK。
- 现有部署：`https://xxzdecode.github.io/xxzcard-en/` 可访问；仓库内没有 GitHub Actions、Vercel、Netlify、Docker 或其他服务端部署配置，因此只能确认静态站点由 GitHub Pages 对外提供，Pages 的仓库设置不在代码内。
- 服务器端现状：没有 `package.json`、API 目录、Worker、Edge Function、迁移目录、`supabase/config.toml` 或本地 Supabase CLI；不得把私有 PDF 读取逻辑放进现有浏览器脚本。
- 权限现状：当前“老师 PIN”由浏览器脚本校验，只是界面门槛，不是服务器授权边界；HW-021 的任务启动、review 处理和 `ready` 确认必须增加真实的服务器端教师授权，不能复用 PIN 作为 API 身份证明。
- 密钥巡检：公开代码中只发现当前浏览器用 `anon` key，未发现 `service_role`、服务端环境变量或私有 Storage 下载逻辑。

#### 既有仓库内的增量落点（C02 起执行）

- 数据库迁移：`supabase/migrations/`。
- 本地 Supabase 配置：`supabase/config.toml`，由 Supabase CLI 初始化生成，不手写第二套脚手架。
- 顺序 Worker/API：单个 `supabase/functions/homework-worker/` Edge Function，内部按路由承载 `process-next`、`retry`、`confirm-ready`、`resolve`，第一版不拆成四个服务。
- 教师审核 UI：继续使用现有 `index.html` screen 体系、`styles.css` 和 `js/main.js` 全局入口；新增一个职责单一的 `js/homeworkPrep.js` 模块，不另建前端项目。
- 源 PDF：继续使用 `xxzworden` 的私有 bucket `homework-source-files` 与前缀 `homework-prep/`；浏览器只请求授权后的裁剪预览和结构化数据。

#### 环境变量边界

- 浏览器公开配置：沿用现有 Supabase URL 与公开 `anon` key；不得加入任何秘密值。
- Edge Function 内建服务端秘密：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`；后者仅在服务器端使用，禁止进入浏览器响应、日志和 Git。
- Worker 业务配置：`HOMEWORK_STORAGE_BUCKET=homework-source-files`、`HOMEWORK_STORAGE_PREFIX=homework-prep/`、PDF 大小上限、下载超时和预览有效期；具体数值在 C04 固定。
- 教师授权：需在 C05/C10 前确定 Supabase Auth 身份与服务器端授权规则；不得使用公开 PIN 或浏览器传入的角色值。若使用 JWT 权限，授权数据放在 `app_metadata` 或服务器端表，不使用可由用户修改的 `user_metadata`。
- OCR/模型提供方及对应密钥尚未在 HW-020 中指定；C06 前必须明确，C01 不凭空写入 `OPENAI_API_KEY` 或其他供应商变量。
- 本地秘密文件仅使用被 Git 忽略的 `supabase/.env.local`；提交示例文件时只保留变量名，不保留真实值。

#### 本地运行入口

- 当前前端没有仓库自带启动脚本；Node.js `v24.16.0` 与 npm `11.13.0` 可用，Python 命令当前只是不可用的 Windows Store alias。
- 当前静态前端可临时使用 `npx serve . -l 8137`（首次运行需下载工具）；C02 若引入本地依赖，应固定版本并提交 lockfile。
- C02 建立官方 Supabase 目录后，数据库与 Edge Function 的标准入口预定为 `npx supabase start`、`npx supabase db reset`、`npx supabase functions serve homework-worker --env-file supabase/.env.local`；执行前先用 CLI `--help` 校验当前版本命令。

#### C02–C05 实施状态

- C02：已用 Supabase CLI `2.109.1` 在本仓库初始化 `supabase/config.toml`；已建立 7 张表、固定状态枚举、约束、索引、RLS、客户端拒绝权限、`service_role` 权限及手动回滚迁移。
- C03：`supabase/seed.sql` 已登记 4 份源 PDF、`BLOCK-001`–`BLOCK-009`、试点状态、连续编号范围及已知练习 PDF 页码关系；试点 Markdown 只作为验证参照。
- C04：已建立服务器端私有 PDF 读取模块，限制 bucket、路径前缀、PDF 扩展名、MIME、大小、下载超时和 PDF 文件头；覆盖不存在、拒绝访问、非 PDF、超限、损坏、超时和页码越界错误，不生成或返回签名 URL。
- C05：已建立单个 `homework-worker` Edge Function、教师 `app_metadata` 授权、`process-next` / `retry` 路由，以及数据库 advisory lock、单活动块唯一索引、四步任务幂等创建和从失败步骤续跑函数。
- 依赖已固定并写入 `deno.lock`；Deno 类型、格式、lint 和 8 项 Node 单元测试通过。
- 数据库正向迁移、RLS/权限断言、种子数据、原子抢占、重复点击、续跑和回滚均已在 `xxzworden` 的 Postgres 17 中通过单事务执行后回滚验证，生产库未留下改动。
- 本机没有 Docker，因此未运行本地 Supabase 容器；生产迁移和 Edge Function 部署属于后续确认门槛。
- C06 前的重要决策：HW-020 没有指定 OCR / 多模态模型供应商。实际定位与印刷内容提取前，需确认使用 OpenAI API 还是其他供应商；密钥、费用和调用契约取决于该选择。

----------------------------------------------------

## 2. 已确认开发顺序

### 音标训练增强

待处理：
-   音标详情页单词 chip 点击跳转对应单词卡。

------------------------------------------------------------------------

## 5. 后续内容建设

### 小学英语语法复习

待建立：

-   缺失知识点补充。
-   系统化语法复习内容。
-   配套 HTML 互动练习。

### 固定分类词库

计划增加固定分类：

第一批：

-   水果
-   动物
-   食物
-   家庭
-   学校
-   身体
-   颜色
-   数字

后续：

-   动作
-   天气
-   交通
-   节日
-   KET 词汇
-   校内词汇
-   固定精选词库




### 后续候选题型｜暂不进入当前开发

1. I 型·词形变化
   - 根据 irregularForms 出题。
   - 可覆盖过去式、过去分词、不规则复数、比较级等。

2. W 型·词族与构词
   - 根据 wordFamily 或 morphology 出题。
   - 适合后续专项练习或高阶挑战。

3. G 型·分类题
   - 可按词性、读音、拼写规律或规则变化分类。
   - 属于多单词综合题型，不按单张卡随机出题。

当前状态：
- 已确认题型方向有价值。
- 本轮不开发。
- 不进入当前执行卡。
- 后续根据专项练习需求再确定交互和题量。
