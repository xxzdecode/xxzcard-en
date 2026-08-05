# 引用式单词本导入格式

更新时间：2026-07-31
状态：正式导入格式

## 1. 适用范围

本格式用于：

1. 对 `kv_store.main.masterCards` 做必要的新建或安全增量补充；
2. 创建或更新只持久化 `cardRefs` 的引用式单词本。

分类关系不属于导入包职责。导入包及单词卡中不得出现 `category`、`categories`、`categoryId`、`categoryName`。

旧 `小学分类_颜色_单词本.json` 属于迁移前完整卡片格式，不得导入。

## 2. 顶层结构

```json
{
  "schemaVersion": 2,
  "wordbook": {
    "id": "book-colours",
    "name": "颜色",
    "bookType": "reference",
    "bookPurpose": "common",
    "description": "小学基础颜色词",
    "cardRefs": [
      { "wordKey": "red" },
      { "wordKey": "blue" }
    ]
  },
  "masterPatch": {
    "create": [],
    "setIfEmpty": [],
    "appendUnique": []
  }
}
```

`wordbook.id` 必填且必须稳定。同一文件重复导入时，导入器通过该 ID 更新同一本单词本，从而保证幂等。

## 3. masterPatch.create

只放总库中不存在的新词完整卡片。完整卡片必须包含 11 个正式字段：

```json
{
  "word": "turquoise",
  "meaning": "绿松石色；青绿色",
  "pos": "名词/形容词",
  "phonetic": "/ˈtɜːkwɔɪz/",
  "emoji": "🩵",
  "morphology": [],
  "collocations": [],
  "irregularForms": [],
  "synonyms": [],
  "wordFamily": [],
  "tip": ""
}
```

若重复导入后该词已存在且资料完全一致，导入器将其视为直接复用；若已存在但资料不同，则进入冲突预览，不覆盖原卡。

## 4. masterPatch.setIfEmpty

只用于补充总库当前为空的字段：

```json
{
  "wordKey": "red",
  "fields": {
    "phonetic": "/red/",
    "emoji": "🔴"
  }
}
```

规则：

- 目标字段为空：写入；
- 目标字段与提交值相同：不重复写入；
- 目标字段已有不同的非空内容：进入冲突预览，不覆盖。

## 5. masterPatch.appendUnique

只用于数组字段：`morphology`、`collocations`、`irregularForms`、`synonyms`、`wordFamily`。

```json
{
  "wordKey": "red",
  "fields": {
    "collocations": [
      {
        "phrase": "red light",
        "example": "Stop at the red light. / 在红灯处停车。"
      }
    ]
  }
}
```

导入器按稳定对象内容去重，同一文件重复导入不会制造重复例句或搭配。

## 6. cardRefs.overrides

`overrides` 只用于无法通过普通总库卡安全表达的少量同形词或当前单词本专用展示，不用于一般分类差异。

例如总库已有动词 `miss`（错过），而“人物”单词本需要称谓 `Miss`（小姐）。两者标准化后共用 `wordKey: "miss"`，不得用新卡覆盖总库动词，也不得把“错过”直接显示在人物单词本中。此时可以写：

```json
{
  "wordKey": "miss",
  "overrides": {
    "word": "Miss",
    "meaning": "小姐；女士（用于女子姓氏或姓名前）",
    "pos": "title",
    "phonetic": "/mɪs/",
    "emoji": "👩",
    "morphology": [],
    "collocations": [],
    "irregularForms": [],
    "synonyms": [],
    "wordFamily": [],
    "tip": "Miss 作称谓时首字母大写。"
  }
}
```

规则：

- `wordKey` 仍必须指向已经存在的正式总库卡；
- 覆盖只保存在当前引用中，不修改 `masterCards`；
- 网页运行时先读取总库卡，再合并当前引用的覆盖字段；
- 普通释义补充、例句追加和分类差异不得滥用覆盖，应使用 `setIfEmpty`、`appendUnique` 或直接复用；
- 同一单词本中仍按 `wordKey` 去重，不能用多个覆盖制造同一个 key 的多张卡。

## 7. 冲突处理

预览必须分别显示：

- 直接复用；
- 新建；
- 补空；
- 去重追加；
- 非空字段冲突；
- 当前单词本引用。

存在冲突时，确认按钮会再次要求人工确认。确认只表示“跳过冲突并导入其余安全内容”，不表示覆盖总库原值。

## 8. 单词本更新规则

- 新建/正式 JSON：使用 `wordbook.id` 创建或更新对应单词本，并以导入包中的 `cardRefs` 作为该单词本的正式引用集合；
- 老师端“添加单词”：向当前单词本追加引用并按 `wordKey` 去重；
- 持久化结果只保留 `cardRefs`，运行时卡片从 `masterCards` 还原；
- 删除、归档或改名单词本不得删除总库词条，也不得联动删除新词导览图片。

## 9. 分类同步 CLI 与事务门禁

正式分类同步使用 `scripts/sync-category-wordbook.mjs`。分类定义仍只以 `data/vocabularyCategories.json` 为准；脚本不会向导入包或单词卡写入分类字段。

先执行只读预演：

```powershell
$env:SUPABASE_URL = "https://PROJECT.supabase.co"
$env:SUPABASE_KEY = "按当前项目权限单独提供"
node scripts/sync-category-wordbook.mjs --category "人物" --dry-run --result result.json
```

预演会严格核对分类名称、稳定 ID、正式词序、总库复用、新建、补空、追加、同形词覆盖和非空字段冲突。任何冲突、缺失引用、同名异 ID 或分类字段泄漏都会停止。历史映射如 `people-family` 对应 `book-people`，只能通过正式包名称和完整 `cardRefs` 精确匹配复用，不进行猜测式改名。

正式写入必须满足以下全部条件：

1. 管理者已单独审核并安装 `scripts/sql/apply-reference-wordbook-atomic.sql`；
2. 本次已明确授权使用对应 Supabase 凭据和正式写入；
3. 使用同一基线 dry-run 输出的 `planHash`；
4. 执行 `--apply --plan-hash <sha256>`，不得改成普通 REST 多次写入。

RPC 在同一事务中锁定 `kv_store.main`、比较完整基线、创建 `pre_<category-id>_reference_import_YYYY_MM_DD_HHMM` 全量快照并替换 `main`。写入后 CLI 会重新读取 `main` 与快照，核对计划哈希、引用数量、全库缺失引用、持久化 `cards`、稳定 ID 和固定 `sharedWith: ["sister", "brother"]`。重复执行得到 `already_applied`，不会新建第二本词本。

`SUPABASE_URL` 与 `SUPABASE_KEY` 只从命令参数或环境变量读取；不得从浏览器端 `js/config.js` 提取凭据。SQL 文件随代码发布不代表已经安装到正式库，安装、授权角色调整与每次正式写入都保留为人工权限节点。
