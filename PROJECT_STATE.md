# PROJECT_STATE

更新时间：2026-08-24（UTC+8）

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
* 正式分类词本创建或更新后自动共享给 `sister` 与 `brother`；分类索引、正式词本引用数和两名学生可见词数一致后才算完成。
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

### 未分类词池正式归类

已完成原“总库未分类”344 词的正式分类、导入包、Supabase 原子同步和双学生共享验收：

- 分类骨架共 44 类，覆盖 344/344 原未分类词，遗漏 0、重复归位 0；其中更新 19 个现有分类词本，新建 25 个稳定 ID 分类词本；
- 44 个分类合计 930 条引用；按每次最新生产基线审计，直接复用 774 条、新建 156 张唯一总库卡、补空 0、追加 0、冲突 0、缺失引用 0；
- `clean` 同时属于“形容词｜感受与状态”和“动词｜学习与交往”，两包复用同一张 `adj./v.` 总库卡，没有复制或覆盖非空字段；
- 44 类均按“最新 dry-run → 对应 `planHash` 原子写入 → 写后 dry-run”完成，每类都有独立 `pre_<category-id>_reference_import_2026_08_23_HHMM` 写前快照；
- 写后 44/44 均为 `already_applied`，每类 `cardRefs`、分类索引词数、姐姐可见词数和弟弟可见词数完全一致，`sharedWith` 均为 `["sister", "brother"]`；
- 正式总库由 815 增至 971 个唯一词，单词本由 39 增至 64，总引用由 947 增至 1516；全库缺失引用 0，词本内持久化完整卡片 0；
- 正式导入包位于 `data/imports/book-*.reference.json`；本轮没有删除、归档或隐藏旧词本，也没有生成或修改图片。

已在正式网站分别以姐姐和弟弟视角确认新增分类列表、词数和代表性 `south` 卡片内容；GitHub Pages 已发布本轮分类索引。

### 颜色引用式单词本

已完成生成、预览、重复导入验证、正式写入、学生共享和真实页面显示核对：

- 正式导入包：`data/imports/book-colours.reference.json`；
- 单词本稳定 ID：`book-colours`；
- 颜色分类共 10 词：`red / blue / yellow / green / white / black / pink / purple / orange / brown`；
- 首次审计：直接复用 4 词，新建 6 词，冲突 0，缺失引用 0；
- 重复导入模拟：需要新建 0，6 张新卡全部识别为已有且资料一致，冲突 0；
- 正式写入前快照：Supabase `kv_store.pre_colours_reference_import_2026_07_30_2333`；
- 正式单词本只持久化 10 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 10 词；
- 用户已在真实网页老师端确认“颜色”单词本可以看到；
- 旧 `小学分类_颜色_单词本.json` 未参与生成或导入，继续禁止导入。

### 人物引用式单词本

已按正式分类名称“人物”完成生成、审计、重复导入模拟、Supabase 正式写入和学生共享：

- 分类骨架：`data/vocabularyCategories.json` 中 `people-family / 人物`；
- 正式导入包：`data/imports/book-people.reference.json`；
- 单词本稳定 ID：`book-people`；
- 共 30 词：`friend / boy / girl / mother / father / sister / brother / uncle / man / woman / Mr / Miss / lady / mom / dad / parents / aunt / cousin / son / baby / kid / classmate / queen / visitor / neighbour / principal / pen pal / tourist / people / robot`；
- 首次审计：直接复用 12 词，新建 18 词，无缺失引用；
- `Miss` 与总库动词 `miss` 标准化后共用 `wordKey: miss`，采用引用层覆盖显示称谓 `Miss=小姐；女士`；总库 `miss=错过` 保持不变；
- 正式写入前快照：Supabase `kv_store.pre_people_reference_import_2026_07_31_0022`；
- 正式单词本只持久化 30 个 `cardRefs`，其中 1 个带同形词覆盖，没有持久化完整 `cards`；
- 重复导入模拟：需要新建 0，18 张新卡全部识别为资料一致；
- 已共享给 `sister` 与 `brother`，两名学生均可见 30 词；
- 数据库导入时临时启用的 `http` 扩展已在同一事务中撤销，未留下结构变化。

仍需核对：

1. 在真实网页老师端确认“人物”列表出现；
2. 打开 `Miss`，确认显示称谓释义而不是“错过”；
3. 编辑引用式单词卡并保存的完整回归；
4. 新词导览图片登记和图片文件未受影响。

### 气象与季节引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `weather-seasons / 气象与季节`；
- 正式导入包：`data/imports/book-weather-seasons.reference.json`；
- 单词本稳定 ID：`book-weather-seasons`；
- 共 15 词：`cold / hot / warm / cool / snowy / sunny / rainy / windy / cloudy / weather report / spring / summer / fall / autumn / winter`；
- 首次审计：直接复用 7 词，新建 8 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_weather_seasons_reference_import_2026_07_31_2059`；
- 正式单词本只持久化 15 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 15 词；
- 重复导入模拟：需要新建 0，8 张新卡全部识别为已有且资料一致。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 衣服引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `clothes / 衣服`；
- 正式导入包：`data/imports/book-clothes.reference.json`；
- 单词本稳定 ID：`book-clothes`；
- 共 22 词：`jacket / shirt / T-shirt / skirt / dress / jeans / pants / trousers / socks / shoes / sweater / coat / raincoat / shorts / sandals / boots / hat / cap / tie / sunglasses / scarf / gloves`；
- 首次审计：直接复用 7 词，新建 15 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_clothes_reference_import_2026_07_31_2059`；
- 正式单词本只持久化 22 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 22 词；
- 重复导入模拟：需要新建 0，15 张新卡全部识别为已有且资料一致。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 学习用品引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `school-things / 学习用品`；
- 正式导入包：`data/imports/book-school-things.reference.json`；
- 单词本稳定 ID：`book-school-things`；
- 共 18 词：`pen / pencil / pencil-case / ruler / book / bag / post card / newspaper / schoolbag / eraser / crayon / sharpener / story-book / notebook / Chinese book / English book / maths book / magazine`；
- 首次审计：直接复用 5 词，新建 13 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_school_things_reference_import_2026_07_31_2109`；
- 正式单词本只持久化 18 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 18 词；
- 重复导入模拟：需要新建 0，13 张新卡全部识别为已有且资料一致。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 身体部位引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `body / 身体部位`；
- 正式导入包：`data/imports/book-body.reference.json`；
- 单词本稳定 ID：`book-body`；
- 共 13 词：`foot / head / face / hair / nose / mouth / eye / ear / arm / hand / finger / leg / tail`；
- 首次审计：直接复用 7 词，新建 6 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_body_reference_import_2026_07_31_2109`；
- 正式单词本只持久化 13 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 13 词；
- 重复导入模拟：需要新建 0，6 张新卡全部识别为已有且资料一致。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 职业引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `jobs / 职业`；
- 正式导入包：`data/imports/book-jobs.reference.json`；
- 单词本稳定 ID：`book-jobs`；
- 共 19 词：`teacher / student / doctor / nurse / driver / farmer / singer / writer / artist / actor / actress / TV reporter / reporter / engineer / policeman / salesperson / cleaner / baseball player / assistant`；
- 首次审计：直接复用 2 词，新建 17 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_jobs_reference_import_2026_07_31_2109`；
- 正式单词本只持久化 19 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 19 词；
- 重复导入模拟：需要新建 0，17 张新卡全部识别为已有且资料一致。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 动物引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `animals / 动物`；
- 正式导入包：`data/imports/book-animals.reference.json`；
- 单词本稳定 ID：`book-animals`；
- 共 31 词：`cat / dog / pig / duck / rabbit / horse / elephant / ant / fish / bird / snake / mouse / kangaroo / monkey / panda / bear / lion / tiger / fox / zebra / deer / giraffe / goose / hen / turkey / lamb / sheep / goat / cow / shark / seal`；
- 首次审计：直接复用 11 词，新建 20 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_animals_reference_import_2026_07_31_2109`；
- 正式单词本只持久化 31 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 31 词；
- 重复导入模拟：需要新建 0，20 张新卡全部识别为已有且资料一致。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 食品与三餐引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `meals-food / 食品与三餐`；
- 正式导入包：`data/imports/book-meals-food.reference.json`；
- 单词本稳定 ID：`book-meals-food`；
- 共 24 词：`breakfast / lunch / dinner / egg / rice / cake / bread / jam / biscuit / sausage / sandwich / dumplings / French fries / meat / chicken / mutton / beef / pork / fish / hamburger / hot dog / noodles / soup / salad`；
- 首次审计：直接复用 9 词，新建 15 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_meals_food_reference_import_2026_07_31_2130`；
- 正式单词本只持久化 24 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 24 词；
- 重复导入模拟：需要新建 0，15 张新卡全部识别为已有且资料字段完整。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 饮料与水果引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `drinks-fruit / 饮料与水果`；
- 正式导入包：`data/imports/book-drinks-fruit.reference.json`；
- 单词本稳定 ID：`book-drinks-fruit`；
- 共 20 词：`milk / water / ice-cream / cola / juice / tea / coffee / fruit / apple / banana / pear / orange / watermelon / grape / cherry / lemon / mango / coconut / peach / strawberry`；
- 首次审计：直接复用 2 词，新建 18 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_drinks_fruit_reference_import_2026_07_31_2130`；
- 正式单词本只持久化 20 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 20 词；
- 重复导入模拟：需要新建 0，18 张新卡全部识别为已有且资料字段完整。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 蔬菜引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `vegetables / 蔬菜`；
- 正式导入包：`data/imports/book-vegetables.reference.json`；
- 单词本稳定 ID：`book-vegetables`；
- 共 12 词：`vegetable / eggplant / green beans / tomato / potato / cucumber / onion / pea / carrot / cabbage / pumpkin / sweet potato`；
- 首次审计：直接复用 4 词，新建 8 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_vegetables_reference_import_2026_07_31_2130`；
- 正式单词本只持久化 12 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 12 词；
- 重复导入模拟：需要新建 0，8 张新卡全部识别为已有且资料字段完整。

仍需核对：在真实老师端和学生端刷新后确认列表与卡片展示。

### 数词 1—20 引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `numbers-basic / 数词 1—20`；
- 正式导入包：`data/imports/book-numbers-basic.reference.json`；
- 单词本稳定 ID：`book-numbers-basic`；
- 共 20 词：`one / two / three / four / five / six / seven / eight / nine / ten / eleven / twelve / thirteen / fourteen / fifteen / sixteen / seventeen / eighteen / nineteen / twenty`；
- 首次审计：直接复用 2 词，新建 18 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_numbers_basic_reference_import_2026_08_18_0212`；
- 正式单词本只持久化 20 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 20 词；
- 写后重复 dry-run：`already_applied`，直接复用 20 词，新建 0，冲突 0。

已在正式网站姐姐账号的新词导览列表确认显示“数词 1—20 / 20词”；弟弟账号已通过正式共享计数验收，但未单独切换账号点击核对。

### 整十数与序数词引用式单词本

已完成正式分类、总库审计、Git 导入包、Supabase 原子写入、学生共享和幂等验收：

- 分类骨架：`data/vocabularyCategories.json` 中 `numbers-extended / 整十数与序数词`；
- 正式导入包：`data/imports/book-numbers-extended.reference.json`；
- 单词本稳定 ID：`book-numbers-extended`；
- 共 20 词：`thirty / forty / fifty / sixty / seventy / eighty / ninety / hundred / first / second / third / fourth / fifth / sixth / seventh / eighth / ninth / tenth / eleventh / twelfth`；
- 首次审计：直接复用 1 词，新建 19 词，冲突 0，缺失引用 0；
- 正式写入前快照：Supabase `kv_store.pre_numbers_extended_reference_import_2026_08_18_0214`；
- 正式单词本只持久化 20 个 `cardRefs`，没有持久化完整 `cards`；
- 已共享给 `sister` 与 `brother`，两名学生均可见 20 词；
- 写后重复 dry-run：`already_applied`，直接复用 20 词，新建 0，冲突 0。

已在正式网站姐姐账号的新词导览列表确认显示“整十数与序数词 / 20词”；弟弟账号已通过正式共享计数验收，但未单独切换账号点击核对。

### 单词卡加载性能修复

本轮已完成：

- 根因确认：单词卡入口首次会串行加载老师端脚本，老师端列表还会阻塞读取全部单词本学习记录；页面停留期间不会主动刷新最新 `main`，因此新导入单词本可能暂时不可见；
- 首页加载期间后台预热 `teacherTools`、`wordCardPerformance.js` 和 `wordCardStudySafety.js`；失败时保留原按需加载兜底；
- 老师端和学生端单词本列表先使用当前内存数据立即显示，再后台读取最新 Supabase `main` 并自动重新渲染；
- 打开单词本详情、查看具体单词、字典搜索结果和词内跳转时，先使用本地镜像立即显示，不再等待 `loadUserBatch()`；
- 老师端列表不再为了统计对所有单词本执行阻塞式 `Promise.all`；
- “全部学习 / 随机模式 / 生词池”等可能写入 `known / unknown` 的正式学习模式仍在开始前读取最新云端记录，避免旧镜像覆盖其他设备的新进度；
- Service Worker 当前为 `xxzcard-app-shell-v98` / `xxzcard-runtime-v98`；2026-08-18 至 2026-08-22 的五份语法挑战已加入同代应用壳缓存，老师首页摘要、金币调整和错题整理资源继续保留；Supabase 请求不由 Service Worker 额外缓存，苹果端读取超时为 12 秒并保留自动重试；浏览器已停止整表下载 `kv_store` 和缓存 `pre_*` 历史快照，只按实际访问键保存离线副本；错题批改记录可保存一段可选的老师补充说明并支持桌面拖入图片上传；错题目录支持日测、周测、月测、薄弱专项和暑假作业，并按每张卷的学生归属分别显示；目录同时读取脱敏薄弱项快照并显示按学生切换的圆环图；
- 新词导览已改为分类优先：首页直接显示主题词汇、功能词汇、按四/七年级和日期组织的校内词汇，以及总库未分类；分组直接显示在类别下，完成项以浅绿色和小勾标记并后置。旧普通单词本只从导览隐藏，老师端“＋ 新建单词本”和手动粘贴导入仍保留。
- 已增加静态回归断言，覆盖预加载、缓存、无阻塞查看和学习写入安全边界；CI 状态必须按当前提交或 PR 实时核对，不沿用旧快照结论；
- 用户已确认刷新后“颜色”单词本出现，证明后台主数据刷新链路有效；用户尚未明确确认点击速度在所有设备上均已达标。

相关正式边界已写入 `docs/vocabulary-master-library-contract.md`。

下一步：

1. 在真实老师端核对“人物”和 `Miss` 覆盖；
2. 在真实老师端和学生端核对“气象与季节”“衣服”“学习用品”“身体部位”“职业”“动物”“食品与三餐”“饮料与水果”“蔬菜”列表与卡片展示；
3. 完成引用式单词编辑保存、图片保护和目标设备速度回归；
4. 继续整理基础动作和其他小学基础分类。

## 2. 系统总库迁移状态

已完成：

- Supabase 数据结构版本：2；
- 系统总库唯一词条：815；
- 单词本：39；
- 单词本引用：947；
- 缺失引用：0；
- 单词本内持久化完整卡片：0；
- `go` 的两张历史卡已保留式合并；
- Supabase 全量存档：`pre_master_library_2026_07_30_2218`；
- 颜色导入前快照：`pre_colours_reference_import_2026_07_30_2333`；
- 人物导入前快照：`pre_people_reference_import_2026_07_31_0022`；
- 气象与季节导入前快照：`pre_weather_seasons_reference_import_2026_07_31_2059`；
- 衣服导入前快照：`pre_clothes_reference_import_2026_07_31_2059`；
- 学习用品导入前快照：`pre_school_things_reference_import_2026_07_31_2109`；
- 身体部位导入前快照：`pre_body_reference_import_2026_07_31_2109`；
- 职业导入前快照：`pre_jobs_reference_import_2026_07_31_2109`；
- 动物导入前快照：`pre_animals_reference_import_2026_07_31_2109`；
- 食品与三餐导入前快照：`pre_meals_food_reference_import_2026_07_31_2130`；
- 饮料与水果导入前快照：`pre_drinks_fruit_reference_import_2026_07_31_2130`；
- 蔬菜导入前快照：`pre_vegetables_reference_import_2026_07_31_2130`；
- 数词 1—20 导入前快照：`pre_numbers_basic_reference_import_2026_08_18_0212`；
- 整十数与序数词导入前快照：`pre_numbers_extended_reference_import_2026_08_18_0214`；
- Git 存档分支：`archive/pre-master-library-2026-07-30`。

迁移记录见 `reports/master-vocabulary-migration-2026-07-30.md`。

## 3. 已确认开发顺序

1. 完成引用式导入器与测试。✅ 第一版完成
2. 重新生成并导入“颜色”单词本。✅ 完成
3. 验证总库复用、资料合并、页面显示和原学习记录。页面显示与学习写入边界已验证；编辑保存和图片保护仍在进行
4. 整理“人物”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
5. 整理“气象与季节”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
6. 整理“衣服”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
7. 整理“学习用品”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
8. 整理“身体部位”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
9. 整理“职业”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
10. 整理“动物”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
11. 整理“食品与三餐”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
12. 整理“饮料与水果”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
13. 整理“蔬菜”引用式单词本。✅ 数据、导入和共享完成，待网页显示核对
14. 整理“数词 1—20”引用式单词本。✅ 数据、导入和共享完成，姐姐网页已核对
15. 整理“整十数与序数词”引用式单词本。✅ 数据、导入和共享完成，姐姐网页已核对
16. 按小学阶段逐步整理基础动作和其他分类。
17. 主要分类完成后，旧单词本先归档隐藏，稳定后再决定永久删除。

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
- 人物 ✅（数据、导入和共享完成，待网页核对）
- 气象与季节 ✅（数据、导入和共享完成，待网页核对）
- 衣服 ✅（数据、导入和共享完成，待网页核对）
- 身体部位 ✅（数据、导入和共享完成，待网页核对）
- 动物 ✅（数据、导入和共享完成，待网页核对）
- 食品与三餐 ✅（数据、导入和共享完成，待网页核对）
- 饮料与水果 ✅（数据、导入和共享完成，待网页核对）
- 蔬菜 ✅（数据、导入和共享完成，待网页核对）
- 学习用品 ✅（数据、导入和共享完成，待网页核对）
- 职业 ✅（数据、导入和共享完成，待网页核对）
- 数词 1—20 ✅（数据、导入和共享完成，姐姐网页已核对）
- 整十数与序数词 ✅（数据、导入和共享完成，姐姐网页已核对）
- 基础动作

后续可增加或调整：

- 交通工具
- 地点
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
   - 根据 wordFamily 或 morphology 生成题。
   - 适合后续专项练习或高阶挑战。

3. G 型·分类题
   - 可按词性、读音、拼写规律或规则变化分类。
   - 属于多单词综合题型，不按单张卡随机出题。

当前状态：

- 已确认题型方向有价值。
- 本轮不开发。
- 不进入当前执行卡。
- 后续根据专项练习需求再确定交互和题量。
