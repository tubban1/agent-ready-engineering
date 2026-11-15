# ARE：本地 stdio MCP 的独立工程自测（不进入 Benchmark）
> 中文阅读版：不作为规范，与英文不一致时以英文为准｜对应英文版：`LOCAL_STDIO_SELF_AUDIT.md` EN v0.1
> v0.1 | 2026-11-15 | 状态：已提供公开只读自测引导工具

适用：在 Antigravity、Claude Code、Codex 或其他具备本地仓库访问和 MCP 调用能力的 coding Agent 中，由开发者评估自己的本地 stdio MCP。

## 重要边界

- 公共 ARE MCP：`https://are.fde.fan/mcp`
- 只读引导工具：`are_local_mcp_audit_guide({ "service": "项目名", "lang": "zh" })`
- **ARE 公共 Benchmark 仍然只接受真实可连接的 HTTPS Endpoint**。本地 stdio、自行上传的 Schema、GitHub 链接不能经由 `are_score_mcp` 登记或获得官方 `run_id`。
- ARE 公共服务器无法主动访问开发者的本地源码、其他本地 stdio MCP 或运行环境。**连接这两种 MCP 的 coding Agent** 才能在自己已获授权的工作区执行检查。
- 不应把完整源码、路径、私密日志或 MCP 工具定义直接上传 ARE；输出在本地保存并由用户决定分享范围。
- 本地报告中的 39 项仅按证据逐项填写，不能据此声称 ARE 独立认证或正式公布排名。

## Antigravity 的推荐工作流

1. 打开 MCP 项目的本地源码工作区，确认权限范围；连接 ARE 公共 MCP 和项目自身的 stdio MCP。
2. 调用 `are_local_mcp_audit_guide` 取得五阶段审计计划。先按照 ARE-T01 完成价值判断，定义三个真实用户任务、成功标准、替代方案和基线。
3. 固定 Git Commit、软件版本、运行入口，读取实际源码和构建/发布清单。列出 MCP 工具列表，并从代码核实描述、Schema、权限与**真实副作用**，不可只信任注释或 README。
4. 仅在获得用户许可后运行相应安全测试；任何会写本地历史、修改用户配置、发出外部请求或产生 Cloud 遥测的工具，都不应仅因为“不是 HTTP 写接口”就当作无副作用操作。
5. 调用 `are_list_checks`、按需 `are_get_check` 与 `are_get_template(T01/T07)`。对 39 项标记 VERIFIED_PASS、VERIFIED_FAIL、UNKNOWN、NOT_APPLICABLE，并保存证据位置、测试时间和不能验证的原因。
6. 输出本地报告、可复现问题和 P0/P1/P2 建议；要证明效果需在同等任务和环境下复测。不要上传或公开无独立证据的评分。

## Vibe Monitor 项目具体检查重点

截至本工作流核对时，`@vibe-monitor/setup@1.0.14` 的 `server.json` 明确使用 stdio、命令参数 `mcp`。源码 `src/mcp.js` 中含 `vibe_version`、`vibe_project_status`、`vibe_checkpoint`、`vibe_set_product_intent`、`vibe_submit_architecture_review` 等。

值得检查而**尚未构成已验证缺陷**的工程问题：

- 对用户来说，“本地分析只读”是否明确区分源代码不被修改、历史快照会被写入、本地配置变化和可选 Cloud 上报？
- `vibe_checkpoint`、`vibe_set_product_intent`、`vibe_submit_architecture_review` 的实际副作用如何在工具描述、安全声明与用户确认中表达？
- 未授权的网络访问、遥测或 Cloud 策略失败情况下，用户是否能读懂结果，Agent 是否能够验证任务状态？
- 工具发现开销、跨 Agent 调用流程、超时及取消语义是否能通过代表性任务复现？不要没有测量就宣称降低 Token 或提升成功率。

## 可直接复制给 Antigravity 的提示词

> 请使用已连接的 ARE MCP 和当前项目的本地 stdio MCP，执行一次基于 **价值与证据** 的独立工程自测。
> 先调用 `are_local_mcp_audit_guide({ "service": "Vibe Monitor", "lang": "zh" })`，再根据 ARE-T01 确定三个真实用户任务和验收标准。读取**当前已授权的本地仓库**的实现代码、注册工具和安全边界，核对正在运行的 stdio 工具定义及真实副作用。
> 在不修改业务代码、不改变用户配置、不写快照、不发送遥测和不执行有副作用调用的前提下完成安全检查。如需触发这些动作，先获得我明确授权。
> 使用 ARE-A02 的 39 项检查，把每一项分为 **VERIFIED_PASS / VERIFIED_FAIL / UNKNOWN / NOT_APPLICABLE**，附源码文件和行号或可复现实测证据。给出价值、实测、问题、P0/P1/P2 优化方案、假设与复测办法，并保存报告在当前授权工作区。
> **不要调用 `are_score_mcp` 为本地 stdio 登记，不要上传源码或工具清单，不要捏造官方 Benchmark 分数或 run_id。**
