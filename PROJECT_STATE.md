# PROJECT_STATE

更新时间：2026-07-31 00:22（UTC+8）

## 0. 已确认决策

* 部分重复功能实现可以参考 Italian 版本的功能结构。
* 不改变当前 English 版本的颜色方案或视觉参数。
* 正式单词数据以 Supabase `kv_store.main.masterCards` 为唯一总库；每个 `wordKey` 只保存一张完整卡。
* 单词卡不得保存 `category`、`categories`、`categoryId`、`categoryName` 等分类属性。
* 单词本只是总库引用集合，持久化 `cardRefs`，不重复保存完整卡片；单词本不保存分类字段。
* 分类关系独立维护，当前骨架为 `data/vocabularyCategories.json`；分类可以增删、拆分、合并、改名和调整词表，不写死在单词导入 JSON 中。
* 附件分类表只作为第一版骨架。整理时可以补充明显缺失的小学基础词，高阶词和暂时无法分类的词先保留在总库或待整理范围。
* 新词导览图片独立于单词本，删除或归档单词本不得删除 `assets/vocabulary-lessons/` 及对应登记文件。
* 单词卡“只读查看”和“会写学习进度的学习模式”使用不同读取策略：查看本地优先、后台刷新；写入前必须读取最新云端学习记录。
* 同形词只有在无法安全共用总库卡时才使用 `cardRefs[].overrides`；覆盖只作用于当前单词本，不能修改总库。
* 完整架构约定见 `docs/vocabulary-master-library-contract.md`。

## 1. 当前优先任务

### 引用式单词本导入器

已完成第一版正式实现：

- 新增 `js/referenceWordbookImport.js`，负责总库审计、差异计划和引用式单词本应用；
- `js/vocabularyJsonImport.js` 改为只接受 `schemaVersion: 2` 正式引用式导入包；
- 老师端导入预览分别显示直接复用、新建、补空、去重追加和冲突；
- 已有非空字段冲突不会自动覆盖，必须人工确认后跳过冲突并继续安全项；
- 新建或更新单词本只持久化 `cardRefs`；“添加单词”按 `wordKey` 去重追加引用；
- 同一正式导入包重复导入幂等；
- 正式导入包禁止 `category`、`categories`、`categoryId`、`categoryName`；
- 原有专项测试覆盖复用、新建、补空、数组去重、冲突保护、添加模式、幂等和旧 JSON 拒绝；
- 新增 `tests/reference-wordbook-overrides.test.cjs`，覆盖 `Miss / miss` 同形词引用覆盖不修改总库；
- 正式格式与覆盖边界见 `docs/reference-wordbook-import-format.md`。

### 颜色引用式单词本

已完成生成、预览、重复导入验证、正式写入和真实页面显示核对：

- 正式导入包：`data/imports/book-colours.reference.json`；
- 单词本稳定 ID：`book-colours`；
- 颜色分类共 10 词：`red / blue / yellow / green / white / black / pink / purple / orange / brown`；
- 首次审计：直接复用 4 词，新建 6 词，冲突 0，缺失引用 0；
- 重复导入模拟：需要新建 0，6 张新卡全部识别为已有且资料一致，冲突 0；
- 正式写入前快照：Supabase `kv_store.pre_colours_reference_import_2026_07_30_2333`；
- 正式单词本只持久化 10 个 `cardRefs`，没有持久化完整 `cards`；
- 用户已在真实网页老师端确认“颜色”单词本可以看到；
- 旧 `小学分类_颜色_单词本.json` 未参与生成或导入，继续禁止导入。

### 人物引用式单词本

已按用户确认的正式分类名称“人物”完成生成、审计、重复导入模拟和 Supabase 正式写入：

- 分类骨架：`data/vocabularyCategories.json` 中 `people-family / 人物`；
- 正式导入包：`data/imports/book-people.reference.json`；
- 单词本稳定 ID：`book-people`；
- 共 30 词：`friend / boy / girl / mother / father / sister / brother / uncle / man / woman / Mr / Miss / lady / mom / dad / parents / aunt / cousin / son / baby / kid / classmate / queen / visitor / neighbour / principal / pen pal / tourist / people / robot`；
- 首次审计：直接复用 12 词，新建 18 词，无缺失引用；
- `Miss` 与总库动词 `miss` 标准化后共用 `wordKey: miss`，采用引用层覆盖显示称谓 `Miss=小姐；女士`；总库 `miss=错过` 保持不变；
- 正式写入前快照：Supabase `kv_store.pre_people_reference_import_2026_07_31_0022`；
- 正式单词本只持久化 30 个 `cardRefs`，其中 1 个带同形词覆盖，没有持久化完整 `cards`；
- 重复导入模拟：需要新建 0，18 张新卡全部识别为资料一致；
- 写入后总库唯一词条 545，单词本 20，总引用 586，缺失引用 0，持久化完整卡片的单词本 0；
- `sharedWith` 当前为空，尚未推送给姐姐或弟弟；
- 数据库导入时临时启用的 `http` 扩展已在同一事务中撤销，未留下结构变化。

仍需核对：

1. 在真实网页老师端确认“人物”列表出现；
2. 打开 `Miss`，确认显示称谓释义而不是“错过”；
3. 编辑引用式单词卡并保存的完整回归；
4. 新词导览图片登记和图片文件未受影响。

### 单词卡加载性能修复

本轮已完成：

- 根因确认：单词卡入口首次会串行加载老师端脚本，老师端列表还会阻塞读取全部单词本学习记录；页面停留期间不会主动刷新最新 `main`，因此新导入单词本可能暂时不可见；
- 首页加载期间后台预热 `teacherTools`、`wordCardPerformance.js` 和 `wordCardStudySafety.js`；失败时保留原按需加载兜底；
- 老师端和学生端单词本列表先使用当前内存数据立即显示，再后台读取最新 Supabase `main` 并自动重新渲染；
- 打开单词本详情、查看具体单词、字典搜索结果和词内跳转时，先使用本地镜像立即显示，不再等待 `loadUserBatch()`；
- 老师端列表不再为了统计对所有单词本执行阻塞式 `Promise.all`；
- “全部学习 / 随机模式 / 生词池”等可能写入 `known / unknown` 的正式学习模式仍在开始前读取最新云端记录，避免旧镜像覆盖其他设备的新进度；
- Service Worker 已升级为 `xxzcard-app-shell-v47`，相关脚本已进入应用壳缓存；
- 已增加静态回归断言，覆盖预加载、缓存、无阻塞查看和学习写入安全边界；当前提交没有对应 GitHub Actions 运行记录；
- 用户已确认刷新后“颜色”单词本出现，证明后台主数据刷新链路有效；用户尚未明确确认点击速度在所有设备上均已达标。

相关正式边界已写入 `docs/vocabulary-master-library-contract.md`。

下一步：

1. 在真实老师端核对“人物”和 `Miss` 覆盖；
2. 完成引用式单词编辑保存、图片保护和目标设备速度回归；
3. 开始整理“身体部位”引用式单词本。

## 2. 系统总库迁移状态

已完成：

- Supabase 数据结构版本：2；
- 系统总库唯一词条：545；
- 单词本：20；
- 单词本引用：586；
- 缺失引用：0；
- 单词本内持久化完整卡片：0；
- `go` 的两张历史卡已保留式合并；
- Supabase 全量存档：`pre_master_library_2026_07_30_2218`；
- 颜色导入前快照：`pre_colours_reference_import_2026_07_30_2333`；
- 人物导入前快照：`pre_people_reference_import_2026_07_31_0022`；
- Git 存档分支：`archive/pre-master-library-2026-07-30`。

迁移记录见 `docs/master-vocabulary-library-migration-2026-07-30.md`。

## 3. 已确认开发顺序

1. 完成引用式导入器与测试。✅ 第一版完成
2. 重新生成并导入“颜色”单词本。✅ 完成
3. 验证总库复用、资料合并、页面显示和原学习记录。页面显示与学习写入边界已验证；编辑保存和图片保护仍在进行
4. 整理“人物”引用式单词本。✅ 数据与导入完成，待网页显示核对
5. 按小学阶段逐步整理身体部位、动物、食物等分类。
6. 主要分类完成后，旧单词本先归档隐藏，稳定后再决定永久删除。

### 音标训练增强

待处理：

- 音标详情页单词 chip 点击跳转对应单词卡。

## 4. 后续内容建设

### 小学英语语法复习

待建立：

- 缺失知识点补充。
- 系统化语法复习内容。
- 配套 HTML 互动练习。

### 可调整分类词库

第一轮优先整理：

- 颜色 ✅
- 人物 ✅（数据与导入完成，待网页核对）
- 身体部位
- 动物
- 食品与三餐
- 饮料与水果
- 学习用品
- 数字
- 基础动作

后续可增加或调整：

- 天气与季节
- 交通工具
- 衣物
- 地点
- 职业
- 植物与自然
- 节日
- KET 词汇
- 校内词汇
- 固定精选词库
- 拓展词汇
- 待整理词池

分类名称和范围不锁死，一个词可以同时出现在多个分类关系中。

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
