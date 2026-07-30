# 引用式单词本导入格式

更新时间：2026-07-30
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

## 6. 冲突处理

预览必须分别显示：

- 直接复用；
- 新建；
- 补空；
- 去重追加；
- 非空字段冲突；
- 当前单词本引用。

存在冲突时，确认按钮会再次要求人工确认。确认只表示“跳过冲突并导入其余安全内容”，不表示覆盖总库原值。

## 7. 单词本更新规则

- 新建/正式 JSON：使用 `wordbook.id` 创建或更新对应单词本，并以导入包中的 `cardRefs` 作为该单词本的正式引用集合；
- 老师端“添加单词”：向当前单词本追加引用并按 `wordKey` 去重；
- 持久化结果只保留 `cardRefs`，运行时卡片从 `masterCards` 还原；
- 删除、归档或改名单词本不得删除总库词条，也不得联动删除新词导览图片。
