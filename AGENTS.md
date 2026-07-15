# xxzcard-en 仓库规则

本仓库以 Git remote `xxzdecode/xxzcard-en` 识别，不依赖本地绝对路径。

- 先用 `PROJECT_INDEX.md` 定位与任务相关的入口；只读取 `PROJECT_STATE.md` 的相关小节。
- 本仓库保存网站代码和课件发布结果，不保存英语项目的长期教学规则或执行卡。
- 收到“上传课件”或“上课件”时，不在本仓库自行猜测待上传文件；唯一详细流程位于 `xxzdecode/xxz-tools` 的 `english-project/README.md`。
- 未找到有效的 `english-project/inbox/待上传课件.md` 时立即停止，不上传旧课件或测试副本。
- 不修改 Supabase、网站业务功能、页面设计或无关文件，除非用户当前任务明确要求。
- 只运行与当前改动相称的检查；提交前检查精确 diff，并保留用户已有的无关改动。
