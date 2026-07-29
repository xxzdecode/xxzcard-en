# Card 6 修正执行说明｜使用 v2 视觉素材包

## 0. 本轮性质

这是 Card 6 的视觉与 iPad 方向返工，不是 Card 7。不要接金币结算、随堂练习题目流程或数据库写入。

## 1. 素材为强制输入，不再自由发挥

把整个素材包复制到仓库，例如：

```text
assets/student-home/card6/
```

正式首页至少必须直接使用：

```text
scenes/vocabulary-adventure-scene.png
scenes/word-challenge-scene.png
scenes/grammar-challenge-scene.png
scenes/classroom-practice-scene.png
scenes/new-word-guide-scene.png
```

同时优先使用包内现成元素：

- `ui/section-titles/`：今日复习、挑战测验、今日新课木牌；
- `ui/coins-rewards/`：金币、星星、奖励徽章；
- `ui/bottom-nav/`：单词卡、音标训练、专项小游戏图标；
- `ui/profile/`：头像和学习称号；
- `decorations/`：角色、宝箱、路线节点；
- `ui/quiz/`：后续调整探险答题页时可复用，但本轮不要扩大功能范围。

禁止重新制作一套大内联 SVG，禁止用 emoji 替代包内图标，禁止自创配色。

## 2. 图片与 HTML 的边界

- 插画、角色、木牌、金币图标可以是图片。
- 用户名、金币数、今日金币、题数、进度、模块标题与状态文案必须保持 HTML。
- 固定栏目标题可以直接用带字木牌；更稳妥的方式是用 `wood-plaque-blank.png`，再覆盖真实 HTML 标题。
- 不要把整个页面或整套动态卡片贴成一张截图。
- 所有入口继续使用真实 `button`，触控高度不低于 44px。

## 3. 配色与视觉冻结

导入 `docs/student-home-tokens.css`，在此基础上微调，不得另起一套配色。

视觉必须符合：浅蓝天空、奶白卡框、轻柔阴影、圆润边角、低对比粉彩。禁止粗黑描边、厚重阴影、深色大渐变和执行端自行增加的装饰。

## 4. 页面结构保持 Card 6 已确认顺序

1. 今日复习
2. 挑战测验
3. 今日新课
4. 底部单词卡 / 音标训练 / 专项小游戏

其中：

- 词汇探险为整行主卡；
- 单词挑战 / 语法挑战为双列；
- 随堂练习 / 新词导览为双列；
- 不恢复今日单词、混合单词和旧首页快捷入口；
- 老师首页不改。

## 5. iPad 横屏为强制产品契约

不能再用“最大宽度 820px”冒充 iPad 适配。必须增加明确横屏规则：

```css
@media (min-width:768px) and (max-width:1366px) and (orientation:landscape) {
  .student-home-dashboard {
    width:min(1180px, calc(100vw - 48px));
    margin-inline:auto;
  }
}
```

至少验收：

- 1024×768
- 1180×820
- 1194×834

每个用例断言 `window.innerWidth > window.innerHeight`。两组双卡保持两列，页面无横向滚动，内容不能锁死为 820px 窄列。

iPad 竖屏显示非阻塞提示：

```text
请将 iPad 横过来使用
横屏可以完整看到今天的学习任务
```

横屏后提示自动消失。不要依赖浏览器方向锁定一定成功。

## 6. 文件与缓存

- 建议新建 `styles-student-home-dashboard.css`。
- 所有使用到的 PNG 加入 Service Worker 预缓存。
- 缓存版本按现有 `vN` 规则递增一次。
- 保持 `openVocabularyAdventure()`、`openVocabularyAdventureChallenge()`、`openGrammarChallengeList()`、`openVocabularyReviewList()`、`openStudentClassroomPractice()` 的入口关系不变。

## 7. 必须更新的测试与截图

更新 `tests/studentHomeDashboardViewport.mjs`，明确测试 portrait / landscape，而不是只使用设备名称。

截图至少包括：

```text
sister-home-iphone-portrait.png
brother-home-iphone-portrait.png
teacher-home-iphone-portrait.png
sister-home-ipad-landscape-1024x768.png
sister-home-ipad-air-landscape-1180x820.png
brother-home-ipad-landscape-1180x820.png
ipad-portrait-rotate-prompt.png
classroom-practice-unpublished.png
```

## 8. 完成标准

只有同时满足以下条件才算完成：

1. 五张模块插画直接来自本素材包；
2. 标题、金币、底部入口优先使用包内现成元素；
3. 不再存在自由发挥的大型内联 SVG；
4. iPad 三个横屏尺寸全部通过；
5. 竖屏提示存在；
6. 老师端、状态隔离和原入口行为不变；
7. 全部测试通过；
8. 未实现 Card 7；
9. 未推送、未部署，等待人工验收。

交付报告必须列出实际使用的素材文件、未使用及原因、横屏截图尺寸、测试结果、剩余视觉差异和最终提交 SHA。
