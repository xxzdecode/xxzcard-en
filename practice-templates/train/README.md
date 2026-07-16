# 火车排序练习模板

这是生成新练习时使用的开发模板，不是一份正式练习。不要把本目录登记到网站入口或练习注册表。

## 分层

- `index.html`：固定页面结构，只保留 `#playground` 玩法挂载点。
- `css/shell.css`：topbar、stage-head、result-strip、footer controls、completion 等外骨架样式。
- `css/train.css`：车站、轨道、车头、车厢、拖拽状态和火车动画。
- `js/practice-data.js`：唯一的内容层；标题、说明、反馈、完成文案和题目都在这里。
- `js/shell.js`：切题、进度、检查入口、反馈和完成流程，不包含学科知识。
- `js/train.js`：车厢渲染、固定车位拖拽、顺序判定和动画，不包含学科知识。

## 数据契约

每道题必须提供：

```js
{
  station: "第一站",
  type: "题型说明",
  instruction: "当前任务",
  correctOrder: ["片段 A", "片段 B", "片段 C"],
  initialOrder: ["片段 C", "片段 A", "片段 B"],
  successTitle: "排列正确！",
  explanation: "答对后显示的知识说明",
  hint: "第二次答错后显示的提示"
}
```

`initialOrder` 和 `correctOrder` 必须是长度相同的数组。

## 生成正式练习

1. 复制整个 `train/` 目录到正式分类目录。
2. 修改 `js/practice-data.js`，换成正式标题、文案和题目。
3. 如果继续使用火车排序玩法，不修改 `shell.js` 和 `train.js`。
4. 如果更换玩法，保留 shell 层，替换玩法 CSS/JS，并继续通过 `window.PracticeShell.registerPlaygroundComponent(...)` 挂载。
5. 验证切题、拖拽、判错、判对、重置和完成弹层后，再登记到网站目录。
