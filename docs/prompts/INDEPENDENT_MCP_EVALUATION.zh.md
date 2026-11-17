# ARE Independent MCP Evaluation — 第三方公开评估提示词（中文）
> 对应英文版：`INDEPENDENT_MCP_EVALUATION.md` EN v1.1

**用途：** 社交媒体、社区和独立技术人员可复测公开 MCP 的行为。**公共第三方测试不拥有运营者的源码内网、私有凭据和生产故障注入权。**

## 可复制提示词

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
> 请在 <PUBLIC_READONLY_SCOPE> 内独立研究公网 MCP <PUBLIC_HTTPS_MCP_URL>；可选公开源码 <PUBLIC_GITHUB_URL>。我未获得运营方私有账号或写入权限。
>
> 标准：ARE-A02@0.5。保留原有 39 项检查 ID，用公共 ARE MCP 的 are_list_checks、are_get_check、are_get_template 按需取得定义与 T07/T10，不要把 39 项详细说明全部塞入 Agent 上下文。
> 能力边界：公共端点 https://are.world2.co/mcp 只提供知识和模板，没有本地 are_assess_scenario、are_validate_deliverable、are_review_operation_risk。机器计算的暂定等级必须由带 --workspace 的本地 ARE MCP 对固定版本 T07/T10 进行复核。无法连接本地能力时，只能人工列出证据状态，不能声称已完成机器验收。
> 证据：固定源码 SHA、真实部署版本、完整工具清单和评估日期；分开记录工具发现、静态检查、合法授权的 tools/call、模型自主 Agent 任务以及独立业务结果。缺失证据填 UNKNOWN 或 NOT_VERIFIED，不得推测 PASS。
> N/A：根据 T10 操作级风险画像填写 N/A{scope=operation_id; reason=适用性理由; evidence=relative/path.md; reviewer=真实复核人; reviewed_at=YYYY-MM-DD}。五个字段 scope、reason、evidence、reviewer、reviewed_at 均必需，证据应覆盖操作范围并对应相同版本。仅写理由、空文件或 readOnlyHint 注解不构成豁免证明。
> 成熟度：39 项各自标 PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED，并记录范围与证据。机器算出的 L0–L4 一律为 PROVISIONAL（暂定），不是认证；版本不支持、风险画像不完整或存在整体证据阻断时写 MATURITY_NOT_ESTABLISHED。旧 v0.4 或未固定版本的历史 L4 不继承为当前等级，也不得继承旧 PASS 或授权结论。
>
> 1. 遵守访问条款、速率限制和授权边界；不得绕过 OAuth、读取他人私有数据、付款、发消息、删除、控制设备或故障施压。
> 2. 完整发现协议与 tools/list 分页，逐工具记录 Schema、注解、权限与错误。readOnlyHint 只是提示，不构成真实只读证明或调用许可。
> 3. 分开记录静态观察与真实调用覆盖率；只有明确允许且无害的公共只读操作才可少量测试，其他全部 NOT_TESTED。公开源码固定 SHA；部署绑定证明不足填 UNBOUND。
> 4. 如有合法的真实 Agent Host，运行预定义无副作用业务任务，独立公共真值判断最终结果；手写 SDK 调用不等于 Agent 测试。
> 5. 依据 ARE 39 项与 T10 逐项列出证据/范围。缺少运营方授权、治理资料或本地 --workspace 审计时填 NOT_VERIFIED 和 MATURITY_NOT_ESTABLISHED，绝不编造 L4。
> 6. 输出可复核的已观察优点、已复现问题、未知风险及三条可选整改建议；安全漏洞优先私密披露。
>
> 最终标注 Independent community review / Not an ARE-issued certification；不自动联系维护者、发第三方 Issue 或进行公开注册。
<!-- ARE_PROMPT_AUTOGEN_END -->

公共第三方评估的价值是可重复的工程观察，而不是凭一次错误返回给开源项目打差评。
