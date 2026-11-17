# ARE Self Evaluate — MCP 开发者自评提示词（中文）
> 对应英文版：`SELF_EVALUATE_MCP.md` EN v1.0

**用途：** MCP 维护者使用 ChatGPT、Claude Code、Codex 等真实 Agent，在自己拥有或授权的项目中运行可重复的 ARE 自评。结果明确标注 **SELF-ASSESSMENT**，不是 ARE 独立认证。

## 如何使用

将下面提示词复制给能访问项目源码与 MCP 工具的 Agent；公开项目仅需公开源码和 URL。涉及测试账号、OAuth、写入或故障注入，请先得到单独授权，优先专用 Sandbox。

### 可复制提示词

> 你是独立于业务实现的工程测试 Agent。使用 Agent-Ready Engineering（ARE）最新规则（`https://are.world2.co/mcp`，特别是 39 项场景成熟度检查与 MCP 2026 协议符合性），对以下**由我维护或已获正式授权**的 MCP 进行自评。
>
> 服务地址：`<PUBLIC_OR_SANDBOX_MCP_ENDPOINT>`
> Git 仓库 / 固定 SHA：`<SOURCE_REPO_AND_COMMIT>`
> 授权环境与允许操作：`<AUTHORIZED_SCOPE>`
> 代表性业务任务和最终状态核验：`<SCENARIO_AND_ORACLE>`
>
> 1. 首先标记环境、声明的 MCP 版本、源码/线上部署版本关联证据及工具版本。没有证据标 UNKNOWN，不能猜测。
> 2. 完整读取 tools/list 的所有页及适用的资源和提示词。**对每一个工具**校验名称、描述、inputSchema、可选 outputSchema、注解、权限/副作用和错误契约。把“静态检查”和“实际执行”覆盖率分开。
> 3. 对所有合法、明确公共只读工具尽可能执行单次成功路径与合理的无害错误路径。不能仅信任 readOnlyHint。非只读、高影响或需付费工具，只有获得明确隔离对象和对应操作批准才运行；否则标 NOT_TESTED，不能绕过登录/OAuth、使用主账户误操作。
> 4. 逐项复核源码的鉴权、handler、错误、恢复、幂等、监控、测试等，使用 `repo@SHA:path:line` 引证。仅当能证明部署版本对应时才将源码结论用于生产。
> 5. 让一个**实际 Agent**完成至少一个预注册的用户价值任务，保存工具调用、真实返回和独立业务 Oracle。不能将手写 SDK 脚本调用冒充 Agent，也不能把模型口头“成功”当 Oracle。若不能执行 Agent，明确标 BLOCKED。
> 6. 按场景填写 **39/39 ARE 检查**：PASS/FAIL/NOT_APPLICABLE/NOT_VERIFIED（每条 N/A 写理由），严格逐级判断 L0–L4。若关键证据不足写 MATURITY_NOT_ESTABLISHED，不能简单平均打分。
> 7. 输出 `qualification.json`、`tool_matrix.json`、`source_review.md`、`agent_task_results.md`、`are_39_checks.json`、`developer_report.md`、`evidence_manifest.json`，标明测试日期、完整性和可复测步骤，脱敏所有访问凭据/用户数据。
> 8. 将结果标为 **Developer Self-Evaluation / Not independently verified by ARE**。如果需要 ARE 独立评估，附上授权范围、可重现样例和联系邮箱申请复核。**不要自动发邮件、提交第三方 Issue、修改生产代码或部署。**
>
> 完成后先报告：实际执行了哪些项目、39 项的状态分布、所有工具覆盖率、真实 Agent 结果、未验证原因和最大的三条可落实改进。

**注意：** Self Evaluate 是帮助维护者发现和修复问题的入口，不是授予公开 ARE Verified 徽章的捷径。
