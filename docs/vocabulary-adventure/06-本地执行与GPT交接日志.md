# 执行卡 6｜学生首页性能与功能补充交接

## 1. 执行基线与固定设备

- 正式仓库：`xxzdecode/xxzcard-en`
- 本轮起始 SHA：`dc8df5d`
- 执行分支：`codex/student-home-dashboard-card-6`
- 固定验收设备：
  - iPad Air 11 横屏：`1180 × 820`
  - iPhone 16 竖屏：`393 × 852`
- 不再把 1024×768、1194×834 或其他 iPad 尺寸列为本项目验收目标。

## 2. 已完成

### 2.1 学生首页布局

- iPad Air 11 横屏使用三列：左列词汇探险占满，中列单词挑战/语法挑战上下排列，右列随堂练习/新词导览上下排列。
- 顶部信息栏与底部三个入口横跨三列；`#screenHome.active` 使用 `100dvh` 和 `overflow:hidden`。
- `1180×820` 下页面无横向/纵向滚动，五个学习模块、头像/姓名/金币/切换用户和三个底部入口均在首屏。
- iPhone 16 竖屏保持纵向滚动和双卡排列，不套用 iPad 三列压缩。
- 老师首页 DOM 和视觉未改，回归测试确认仍显示老师的三个原入口。

### 2.2 首页图片与头像

- 五张原始 PNG 保留为源素材，运行时改用按卡片比例生成的 WebP。
- 所有首页图片补充固有 `width`/`height` 和 `decoding="async"`；主图使用 `fetchpriority="high"`，其余场景图使用懒加载。
- 姐姐和弟弟头像分别替换为用户提供的新图片，并生成 512×512 运行时 PNG。

| 场景 | 原 PNG | 新 WebP |
| --- | ---: | ---: |
| 词汇探险 | 2,709,269 B | 197,864 B |
| 单词挑战 | 2,455,281 B | 75,146 B |
| 语法挑战 | 2,401,243 B | 83,228 B |
| 随堂练习 | 2,354,844 B | 46,954 B |
| 新词导览 | 2,260,515 B | 69,562 B |
| 合计 | 12,181,152 B | 472,754 B |

五张首页场景图合计减少约 96.1%。

### 2.3 CSS、数据与脚本首屏

- `styles-home-nav.css`、`styles-student-home-dashboard.css` 已直接放入 `index.html` 的 `<head>`，删除 `main.js` 动态插入，避免无样式闪动。
- `initData()` 改为 local-first：存在 `wc_sb_main` 镜像时立即渲染，Supabase 后台静默刷新；首次无镜像时仅显示不拦截点击的顶部轻提示。
- 初始同步脚本由三十多个收敛为 8 个核心脚本；探险、语法、随堂练习、老师工具、具体播放器和新词模块按入口加载。
- 保留既有内联 `onclick` 调用方式；动态脚本加载后仍进入原函数。

### 2.4 随堂练习

- 学生无需老师发布即可打开与老师相同的随堂练习目录并自行选择。
- 每位学生每天只能选择一项；未完成时只能继续当天所选项，完成后当天其他项锁定。
- 同源练习页完成标记由 iframe 观察器识别，并写入 `classroom_practice_daily_v1_<student>`。
- 老师端保持不限次数、原目录和原入口。
- 本轮不为随堂练习结算金币，不修改题目评分逻辑。

### 2.5 金币

- Supabase 原 `main` 数据中没有 417/406 金币字段，也没有既有独立金币键。
- 已按用户确认的当前余额建立：
  - `student_reward_v1_brother.totalCoins = 417`
  - `student_reward_v1_sister.totalCoins = 406`
- 学生首页只读展示以上余额和当天记录；未新增金币奖励/扣减/商城逻辑。

### 2.6 Service Worker

- 缓存升级为 `xxzcard-app-shell-v32` / `xxzcard-runtime-v32`，首页启动时非阻塞注册。
- install 只逐项缓存最小 app shell、五张 WebP、头像、金币、木牌和底部图标；使用 `Promise.allSettled`，单个非关键资源失败不再使安装整体失败。
- 不再预缓存全部 vocabulary-review、新词课件、courseware 和专项资源；这些资源进入对应功能时由同源 `cache-first` 按需缓存。
- 页面导航使用缓存首页立即响应并后台刷新；Supabase GET 使用带 5 秒超时和缓存回退的 network-first。
- activate 清理旧 `xxzcard-*` 与 `vocabulary-review-*` 缓存。

## 3. 验收证据

截图目录（本地验收产物，不进入 Git）：

`D:\xxz-work\projects\xxzcard-en\.codex-backups\card6-visual-qa`

- `sister-home-ipad-air11-landscape-1180x820.png`
- `sister-home-iphone16-portrait-393x852.png`
- `brother-home-iphone16-portrait-393x852.png`
- `teacher-home-iphone16-portrait-393x852.png`
- `classroom-practice-student-directory.png`

自动化结果：

- `npm test`：全部通过。
- `tests/studentHomeDashboardViewport.mjs`：固定两档设备、入口可见性、无溢出、老师端不受影响均通过。
- `STUDENT_HOME_OFFLINE_ONLY=1 tests/studentHomeDashboardViewport.mjs`：已有缓存后断网恢复首页通过，包含 5 秒内恢复断言。
- 人工检查两张固定设备截图：图片清晰、文字未截断、iPad 首屏完整、iPhone 可正常纵向浏览。

## 4. 未修改边界

- 未修改词汇探险、单词挑战、语法挑战和新词导览的业务含义、评分或奖励。
- 未修改老师端首页布局。
- 未新增金币结算、评分、商城、等级、Card 7 或其他产品功能。
- 原始五张 PNG 保留，不作为首页运行时资源。
