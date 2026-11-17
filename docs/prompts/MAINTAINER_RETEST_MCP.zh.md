# ARE Maintainer Retest — 维护者修复后自检提示词（中文）
> 对应英文版：`MAINTAINER_RETEST_MCP.md` EN v1.1

**用途：** 对收到 ARE 报告的维护者，让其在拥有的代码仓库/测试环境核对问题并产生前后对照证据。不可将“自报修复”直接等同 ARE 独立复测通过。

## 可复制提示词

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
> 我是 MCP <SERVICE_NAME> 的授权维护者；原 ARE 报告 <REPORT_URL_OR_FILE>，旧版 <BASELINE_COMMIT_OR_DEPLOYMENT>，修复版 <NEW_COMMIT_OR_DEPLOYMENT>，明确隔离测试范围 <AUTHORIZED_SCOPE>。
>
> 标准：ARE-A02@0.5。保留原有 39 项检查 ID，用公共 ARE MCP 的 are_list_checks、are_get_check、are_get_template 按需取得定义与 T07/T10，不要把 39 项详细说明全部塞入 Agent 上下文。
> 能力边界：公共端点 https://are.world2.co/mcp 只提供知识和模板，没有本地 are_assess_scenario、are_validate_deliverable、are_review_operation_risk。机器计算的暂定等级必须由带 --workspace 的本地 ARE MCP 对固定版本 T07/T10 进行复核。无法连接本地能力时，只能人工列出证据状态，不能声称已完成机器验收。
> 证据：固定源码 SHA、真实部署版本、完整工具清单和评估日期；分开记录工具发现、静态检查、合法授权的 tools/call、模型自主 Agent 任务以及独立业务结果。缺失证据填 UNKNOWN 或 NOT_VERIFIED，不得推测 PASS。
> N/A：根据 T10 操作级风险画像填写 N/A{scope=operation_id; reason=适用性理由; evidence=relative/path.md; reviewer=真实复核人; reviewed_at=YYYY-MM-DD}。五个字段 scope、reason、evidence、reviewer、reviewed_at 均必需，证据应覆盖操作范围并对应相同版本。仅写理由、空文件或 readOnlyHint 注解不构成豁免证明。
> 在 T07 的 Result 列中，只允许填写 ✅ / ❌ / ➖。NOT_VERIFIED 必须暂记为 ❌，并在最后的证据列说明缺少哪些证据；这会阻断该项通过，但不表示已确认产品缺陷。➖ 必须附完整 N/A{scope=...; reason=...; evidence=...; reviewer=...; reviewed_at=YYYY-MM-DD}，✅ 必须填写 inspected 或 documented 证据类型，并引用有效的证据文件。
> 成熟度：39 项各自标 PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED，并记录范围与证据。机器算出的 L0–L4 一律为 PROVISIONAL（暂定），不是认证；版本不支持、风险画像不完整或存在整体证据阻断时写 MATURITY_NOT_ESTABLISHED。旧 v0.4 或未固定版本的历史 L4 不继承为当前等级，也不得继承旧 PASS 或授权结论。
>
> 1. 保持原评估不可变；把已复现缺陷、偶发异常、工程建议、证据不足分开记录。未知源码部署映射不能当作生产 Bug。
> 2. 使用原输入、原 Oracle 在旧版尝试重现，再在新版运行等价测试，禁止删掉失败断言。记录 MCP 真实响应、isError、版本与授权边界。
> 3. 对受影响的 Agent 业务任务做真实工具调用与独立外部结果核对。写入、负面授权测试和故障注入必须使用额外获批的合成资源和隔离租户。
> 4. 针对新版本单独生成 T07/T10，只有确有新证据的检查项才更新。历史 v0.4 L4 和旧 PASS 不可直接继承成 ARE-A02@0.5 的当前等级。
> 5. 连接带 --workspace 的本地 ARE MCP 才能执行 are_review_operation_risk、are_validate_deliverable、are_assess_scenario；公网 MCP 只用于读取规范/模板，不能伪称已机器验收。
> 6. 提交 before_after.md、reproduction.md、regression.md、脱敏证据清单、真实任务结果及三条后续修复建议。
>
> 每项整改标 VERIFIED / NOT_REPRODUCED / STILL_FAILS / NOT_TESTED，机器等级是 PROVISIONAL，不能当作 ARE 官方认证；未经授权不发布或修改生产。
<!-- ARE_PROMPT_AUTOGEN_END -->

收到维护者复测数据后，ARE 应以**自己的 Agent/工具**在合法环境中再次复测，发布原报告的修订版本和时间戳，而非静默覆盖历史报告。
