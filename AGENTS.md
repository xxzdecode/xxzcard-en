# xxzcard-en 仓库规则

本仓库以 Git remote `xxzdecode/xxzcard-en` 识别，不依赖本地绝对路径。

- 先用 `PROJECT_INDEX.md` 定位与任务相关的入口；只读取 `PROJECT_STATE.md` 的相关小节。
- 本仓库保存网站代码和随堂练习发布结果，不保存英语项目的长期教学规则或执行卡；“课件”只指 PPT 等真正的教学课件。
- “练习”默认指即时练习、随堂练习或课堂练习；只有明确写“专项”时，才按专项练习处理。
- 收到“上传练习”时，不在本仓库自行猜测待上传文件；唯一详细流程位于 `xxzdecode/xxz-tools` 的 `xxzcard-en-hub/README.md`。
- 未找到有效的 `xxzcard-en-hub/inbox/待上传练习.md` 时立即停止，不上传旧练习或测试副本。
- 收到“上传生词巩固图片”时，必须读取 `xxzdecode/xxz-tools/xxzcard-en-hub/rules/current/11_生词巩固图片生成与上传流程.md`。
- 用户当次附加总 ZIP 时，优先读取附件并自动解压到本仓库 `_incoming/vocabulary-review-images/`；默认不得让用户再次手动解压。
- 附件不存在或不可读时，来源优先级固定为：用户当次给出的可访问绝对路径 → 本仓库 `_incoming/vocabulary-review-images/` → 当前环境真实存在的 `/mnt/data/vocabulary-review-images/` → 用户明确要求的 GitHub 云端中转目录。
- 不得假设 ChatGPT 的 `/mnt/data` 在当前 Windows 或 Codex 环境可见。`_incoming/` 是默认跨环境本地交接目录，并被 Git 忽略。
- 找到来源后，连续处理其中全部有效 `pending` 批次，按 `createdAt` 从早到晚执行；不得只取最新一批。某批失败时停止后续批次并报告已完成与阻塞范围。
- 本地目录不可见或没有有效批次时立即停止，不使用历史旧图或自行猜测；但必须先按规则检查所有合法来源。
- 不修改 Supabase、网站业务功能、页面设计或无关文件，除非用户当前任务明确要求。
- 只运行与当前改动相称的检查；提交前检查精确 diff，并保留用户已有的无关改动。