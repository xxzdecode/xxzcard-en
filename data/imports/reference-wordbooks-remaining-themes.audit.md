# Remaining theme reference wordbooks audit

Date: 2026-08-01 (Asia/Shanghai)
Branch: `feature/reference-wordbooks-remaining-themes`

## Scope

The screenshot scope excluded the first six categories plus `衣服` and `气象与季节`, which were already complete. The remaining eleven categories are now present as stable reference wordbooks:

| Stable ID | Display name | References | Reused | Created | Missing references |
|---|---:|---:|---:|---:|---:|
| `book-meals-food` | 食品与三餐 | 24 | previously completed | previously completed | 0 |
| `book-drinks-fruit` | 饮料与水果 | 20 | previously completed | previously completed | 0 |
| `book-vegetables` | 蔬菜 | 12 | previously completed | previously completed | 0 |
| `book-vehicles` | 交通工具 | 13 | 3 | 10 | 0 |
| `book-classroom-home` | 杂物｜家具与设备 | 25 | 7 | 18 | 0 |
| `book-tableware-daily` | 杂物｜餐具与日用品 | 16 | 2 | 14 | 0 |
| `book-toys-activities` | 杂物｜玩具与其他物品 | 12 | 2 | 10 | 0 |
| `book-home-school-places` | 地点｜家与学校 | 27 | 7 | 20 | 0 |
| `book-public-places` | 地点｜公共场所 | 10 | 2 | 8 | 0 |
| `book-plants-nature` | 植物与景物 | 24 | 10 | 14 | 0 |
| `book-week-months` | 星期与月份 | 20 | 1 | 19 | 0 |

Newly processed total: 147 references, 34 direct reuses, 113 new master cards, 0 conflicts.

## Supabase snapshots

- `pre_vehicles_reference_import_2026_08_01_2052`
- `pre_classroom_home_reference_import_2026_08_01_2053`
- `pre_tableware_daily_reference_import_2026_08_01_2054`
- `pre_toys_activities_reference_import_2026_08_01_2055`
- `pre_home_school_places_reference_import_2026_08_01_2056`
- `pre_public_places_reference_import_2026_08_01_2057`
- `pre_plants_nature_reference_import_2026_08_01_2058`
- `pre_week_months_reference_import_2026_08_01_2059`

## Post-write validation

- Master cards: 778
- Wordbooks: 37
- Total references: 907
- Missing references: 0
- Persisted full cards inside wordbooks: 0
- Each of the eleven scoped wordbooks exists exactly once.
- Every scoped wordbook is shared with both `sister` and `brother`.
- The eight new imports use `schemaVersion: 2`, stable IDs, `cardRefs`, and full 11-field cards only for genuinely missing master words.

## Pending visual verification

Refresh the real teacher and student pages and confirm that all eleven lists and representative cards render correctly. No branch changes have been merged into `main`.
