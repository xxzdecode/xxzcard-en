# xxzcard-en 仓库规则

本仓库以 Git remote `xxzdecode/xxzcard-en` 识别，不依赖本地绝对路径。

- 先用 `PROJECT_INDEX.md` 定位与任务相关的入口；只读取 `PROJECT_STATE.md` 的相关小节。
- 本仓库保存网站代码和随堂练习发布结果，不保存英语项目的长期教学规则或执行卡；“课件”只指 PPT 等真正的教学课件。
- “练习”默认指即时练习、随堂练习或课堂练习；只有明确写“专项”时，才按专项练习处理。
- 收到“上传练习”时，不在本仓库自行猜测待上传文件；唯一详细流程位于 `xxzdecode/xxz-tools` 的 `xxzcard-en-hub/README.md`。
- 未找到有效的 `xxzcard-en-hub/inbox/待上传练习.md` 时立即停止，不上传旧练习或测试副本。
- 不修改 Supabase、网站业务功能、页面设计或无关文件，除非用户当前任务明确要求。
- 只运行与当前改动相称的检查；提交前检查精确 diff，并保留用户已有的无关改动。
