# ARE Self Evaluate — MCP 开发者自评提示词（中文）
> 对应英文版：`SELF_EVALUATE_MCP.md` EN v1.1

**用途：** MCP 维护者使用 ChatGPT、Claude Code、Codex 等真实 Agent，在自己拥有或授权的项目中运行可重复的 ARE 自评。结果明确标注 **SELF-ASSESSMENT**，不是 ARE 独立认证。

## 如何使用

将下面提示词复制给能访问项目源码与 MCP 工具的 Agent；公开项目仅需公开源码和 URL。涉及测试账号、OAuth、写入或故障注入，请先得到单独授权，优先专用 Sandbox。

### 可复制提示词

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
> 我是 MCP <PUBLIC_OR_SANDBOX_MCP_ENDPOINT> 的所有者或已获明确授权者。源码 <SOURCE_REPO_AND_COMMIT>；实际部署版本 <DEPLOYMENT_OR_UNKNOWN>；隔离环境与授权操作 <AUTHORIZED_SCOPE>；代表任务与独立 Oracle <SCENARIO_AND_ORACLE>。
>
> 标准：ARE-A02@0.5。保留原有 39 项检查 ID，用公共 ARE MCP 的 are_list_checks、are_get_check、are_get_template 按需取得定义与 T07/T10，不要把 39 项详细说明全部塞入 Agent 上下文。
> 能力边界：公共端点 https://are.world2.co/mcp 只提供知识和模板，没有本地 are_assess_scenario、are_validate_deliverable、are_review_operation_risk。机器计算的暂定等级必须由带 --workspace 的本地 ARE MCP 对固定版本 T07/T10 进行复核。无法连接本地能力时，只能人工列出证据状态，不能声称已完成机器验收。
> 证据：固定源码 SHA、真实部署版本、完整工具清单和评估日期；分开记录工具发现、静态检查、合法授权的 tools/call、模型自主 Agent 任务以及独立业务结果。缺失证据填 UNKNOWN 或 NOT_VERIFIED，不得推测 PASS。
> N/A：根据 T10 操作级风险画像填写 N/A{scope=operation_id; reason=适用性理由; evidence=relative/path.md; reviewer=真实复核人; reviewed_at=YYYY-MM-DD}。五个字段 scope、reason、evidence、reviewer、reviewed_at 均必需，证据应覆盖操作范围并对应相同版本。仅写理由、空文件或 readOnlyHint 注解不构成豁免证明。
> 成熟度：39 项各自标 PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED，并记录范围与证据。机器算出的 L0–L4 一律为 PROVISIONAL（暂定），不是认证；版本不支持、风险画像不完整或存在整体证据阻断时写 MATURITY_NOT_ESTABLISHED。旧 v0.4 或未固定版本的历史 L4 不继承为当前等级，也不得继承旧 PASS 或授权结论。
>
> 1. 分页读取完整 tools/list 及资源、提示词；逐工具核对输入输出 Schema、错误、描述、注解、权限和副作用。分别报告发现覆盖率与实际 tools/call 覆盖率。
> 2. 在单独获批的隔离租户内用合成对象运行合理的只读、错误路径和授权负例；readOnlyHint 不代表允许执行。写入、资金、消息、删除及高权限操作须逐项明确授权，否则 NOT_TESTED。
> 3. 固定源码、部署版本及工具定义哈希，检查 handler、鉴权、幂等、恢复和审计日志，引用 repo@SHA:path:line。无部署绑定证据不得将源码直接当现网事实。
> 4. 让真实模型驱动的 Agent 完成已预先定义的多步业务任务，用外部 Oracle 独立核对结果。SDK 脚本和模型自报成功不算任务成功。
> 5. 在授权工作区生成 ARE-T07 及完整 ARE-T10 JSON。若本地 ARE MCP 已用 --workspace 启动，调用 are_review_operation_risk、are_validate_deliverable、are_assess_scenario；否则人工列出证据并标 MATURITY_NOT_ESTABLISHED。
> 6. 输出 qualification.json、tool_matrix.json、source_review.md、agent_task_results.md、are_39_checks.json、developer_report.md 和脱敏 evidence_manifest.json；优先报告三项最有价值的整改建议。
>
> 标注 Developer Self-Evaluation / Not independently verified by ARE；未经单独批准不得发邮件、提交第三方 Issue、公开敏感漏洞、修改生产代码或发布。
<!-- ARE_PROMPT_AUTOGEN_END -->

**注意：** Self Evaluate 是帮助维护者发现和修复问题的入口，不是授予公开 ARE Verified 徽章的捷径。
