# 系统单词总库迁移记录｜2026-07-30

## 迁移前存档

- Supabase 全量存档表：`public.kv_store_archive`
- 存档编号：`pre_master_library_2026_07_30_2218`
- 已存档 `kv_store` 行数：65
- 包含正式主数据 `main`：是
- Git 图片与代码存档分支：`archive/pre-master-library-2026-07-30`
- 存档提交：`fda6c0443763c6b81d551266cf950cb0644b718b`

## 迁移结果

- 数据结构版本：2
- 系统总库词条：521
- 原单词本：18
- 单词本引用总数：546
- 无法解析的引用：0
- 单词本内持久化完整卡片：0

原来的完整卡片已合并到 `main.masterCards`。每个单词本现在持久化 `cardRefs`，运行时再从总库还原 `batch.cards`，从而兼容既有页面、练习、挑战和新词导览。

## 重复资料处理

完全相同的重复卡自动合并。字段不同的同词卡采用保留式合并：

- 固定搭配、词形、同义词、词族等数组去重后合并；
- 不同小知识使用换行保留；
- 不同释义保留并合并；
- 空字段由另一张卡补齐。

`go` 的两张历史卡已合并，保留两套提示、6 个固定搭配和不规则形式。

## 图片保护

以下内容不随单词本归档或删除而删除：

- `assets/vocabulary-lessons/`
- `data/vocabularyLessonVisuals.json`
- `data/vocabularyLessonAssets.js`

图片仍按英文单词匹配，可被任何新的分类单词本复用。保护规则另见 `data/vocabularyAssetProtection.json`。

## 回滚

发生严重问题时，可从存档恢复全部 Supabase 数据：

```sql
update public.kv_store target
set value = archive.value
from public.kv_store_archive archive
where archive.archive_id = 'pre_master_library_2026_07_30_2218'
  and archive.source_key = target.key;

insert into public.kv_store (key, value)
select archive.source_key, archive.value
from public.kv_store_archive archive
where archive.archive_id = 'pre_master_library_2026_07_30_2218'
  and not exists (
    select 1 from public.kv_store target where target.key = archive.source_key
  );
```

代码和图片可从 Git 分支 `archive/pre-master-library-2026-07-30` 恢复。

## 后续规则

1. 新词导入时，已有词只更新或复用 `masterCards`；新词加入 `masterCards`。
2. 新单词本只保存 `wordKey` 引用，可选保存分类展示覆盖。
3. 删除或归档单词本不会删除总库词条。
4. 旧单词本在分类整理完成前继续保留；后续先归档隐藏，再决定永久删除。
