# ARE 评估到公开传播标准流程（S0–S13）

**版本**：1.0 / 2026-11-16　**性质**：可复用 SOP、内容标准、门禁；**非已部署的软件流水线**
**现有 ARE 标准**：`adoption/ARE-A02-agent-ready-maturity-model.md`、`conformance/README.md`、`adoption/templates/ARE-T05-eval-report.md`、`adoption/templates/ARE-T07-maturity-assessment.md`
**本次实操案例**：[Solarstorm public read-only case](../cases/solarstorm-2026-11-16.md)
**域名与品牌**：[ADR-001](ADR-001-world2-are-publishing.md)

## 1. 交付定义

一个评估项目的完整商业/传播闭环是 **被合规发现 → 进入合格项目池 → 技术与业务真实验收 → 出具证据报告 → 维护者私下收到报告 → 可安全公开的案例 → 相关平台发布 → 跟踪回复 → 修复后复测及新版本案例**。

`TECHNICAL_ASSESSMENT_RECORDED`、`EMAIL_SENT`、`PUBLIC_CASE_LIVE`、`SOCIAL_POST_LIVE`、`MAINTAINER_ACKNOWLEDGED`、`RETEST_COMPLETED` 是六种独立的事件，不能混成一个 `completed`。

### 1.1 强制证据分层

- **协议**：按照声明的 MCP 版本确认 MUST/SHOULD；9 项预检不等于官方完整协议认证。
- **工具契约**：所有发现的工具必须检查 Schema、描述、注解、权限、错误；可执行性的动态覆盖另算。
- **源代码**：固定 Git SHA、路径行号、测试；必须明示线上版本与源码身份是否绑定。
- **真实 Agent**：真实模型/宿主/工具调用与独立业务 Oracle；一个成功案例不证明统计显著性。
- **ARE 39 项**：按场景、严格 L0–L4；`NOT_VERIFIED` ≠ `FAIL`，`N/A` 必须书面理由。
- **邮件与公开内容**：只引用安全、可独立重现的范围；建议、观察、故障、安全问题不同类；保留维护者修复权与更正记录。

## 2. S0–S9：评估与维护者交付

| 阶段 | 操作 | 必须保存的产物 | 进入下阶段的门禁 |
|---|---|---|---|
| S0 DISCOVERY | 从 World2 现有 MCP 数据源发现，按服务 ID / URL 去重 | `candidate.json` | 身份、目录来源可追踪 |
| S1 QUALIFICATION | 检查在线服务、实际源码、合法测试权限、官方邮箱、真实 Agent 价值和独立 Oracle | `qualification.json` | 正式深评须全部满足；否则 `WAITING_*` |
| S2 CONNECT | 双协议 SDK，分版本发现及资源分页，授权路径 | `protocol.json` | 成功或写明 BLOCKED |
| S3 CONTRACT | 全工具定义校验、风险分级、来源追踪 | `tool_matrix.json` | 100% 发现工具有状态；不是全工具执行 |
| S4 SOURCE | 固定源码 SHA、入口、handler、auth、测试与部署映射 | `source_review.json` | 源码/部署不绑定必须注明 |
| S5 TOOL_EXECUTE | 合法只读工具尽量逐个调用，隔离写入要另行授权 | `tool_runs.jsonl` | 每工具 TESTED/NOT_TESTED + 理由 |
| S6 AGENT_EVAL | 真实 Agent 完成多步业务目标并独立验证 | `agent_runs.jsonl` | 保留模型、宿主、原始轨迹、真值 |
| S7 ARE_ASSESS | 39 ID 按场景逐项状态与理由 | `assessment.json` | 39/39有状态，无证据不授等级 |
| S8 REPORT_QA | 维护者报告和证据包，去敏、二次复现关键问题 | `developer_report.md`,`qa.json` | 事实门禁 PASS |
| S9 OWNER_FEEDBACK | 核对官方邮箱、历史沟通、单项目个性化邮件 | Gmail message/thread ID 与时间 | `SENT`≠`DELIVERED`≠`READ` |

### 2.1 维护者复测提示词

在邮件正文附上或链接到 [Maintainer Retest Prompt](../prompts/MAINTAINER_RETEST_MCP.zh.md)。维护者在其**拥有并授权**的源码/测试环境中运行；不会强迫其给 ARE 写入权限，也不会用自述代替独立复测证据。

## 3. S10–S13：**新增的公共影响力闭环**

| 阶段 | 标准工作 | 门禁/判断 | 输出 |
|---|---|---|---|
| **S10 PUBLIC_CASE** | 将安全的 S8 报告转换成永久链接：范围、事实、正面结果、可验证缺口、工具/Agent 任务、方法、时间、限制、更新史、反馈窗口 | 仅公开可披露资料；不得公开安全漏洞、账号数据、内部日志；默认先邮件告知维护者，重要争议先核实 | `case.md`、公开 GitHub URL、站内案例记录 |
| **S11 DISTRIBUTE** | GitHub 自有仓库案例、官网、X/LinkedIn、HF 讨论/Space、魔搭、Reddit、短视频/长视频；根据渠道改写而不是全文复制 | GitHub Issue 仅具体可复现且归因的缺陷；不能向他人的 Issue 群发广告；社区规则和账号品牌匹配；媒体与数字可追溯 | 每渠道 `draft / published / blocked / skipped`、真实 URL/时间 |
| **S12 ENGAGE** | 关注维护者、外部讨论、引用、邮件回复、纠错、采纳修复；维护者如有反馈，更新案例版本 | 永不将“已发邮件”算成“被认可”；修订须公开变更日志，不抹去原证据 | `feedback.json`、原始线程引用、人工复核日历 |
| **S13 RETEST/IMPROVEMENT** | 维护者修复后按原输入和新版本重复相同合法任务/协议检查，记录前后差异并再次发布 | 不跨版本比较无可比指标；客观错误纠正必须优先于营销 | `retest.json`、前后证据、第二轮案例与视频 |

### 3.1 S10 公开案例模板

每个案例至少提供：标题、域名、World2 ID、日期、协议、服务端声明版本、开源源码 SHA、源码/部署身份是否绑定、全工具与动态覆盖、实际 Agent 模型/调用、独立真值核验、39 项状态数（不滥发等级）、优点、可重现建议、限制、纠错与维护者回复状态。严禁把评估方法缺失说成第三方功能失败。**只公开经许可的证据**。

### 3.2 S11 渠道分流规则（不搞群发 Issues）

| 渠道 | 内容与注意 | 可量化指标 |
|---|---|---|
| **ARE 官网** | 长期权威案例、覆盖与证据、版本历史、三个提示词入口；站内状态必须反映证据等级 | 访问、点击自评、评估申请 |
| **ARE GitHub 自有仓库** | 原始开放方法、公开报告和复测脚本/提示词；自有 Discussion 可讨论技术方法 | Stars/引用/Issue、报告点击 |
| **第三方 GitHub Issue** | **仅**公开且已复现的具体工程缺陷，适当通知维护者，最小复现、非推广语气；优化建议优先 Discussion/邮件 | 维护者回应、关闭/合并 PR |
| **Hugging Face** | 共享研究方法、开源案例、可交互只读预检 Space（需以后实现，不得假称已发布）；原创内容而非群发 | 有用反馈、试用、Agent 引用 |
| **魔搭** | 中文案例、第三方自评教程；有 Space 时可支持公开低风险协议预检 | 实际体验次数、开发者联系 |
| **X/LinkedIn** | 4–7 张证据卡/短 Thread，强调一次真实测试的置信界限，链接唯一案例 | 点击回源、有效回复 |
| **Reddit/HN** | 先发表方法/实验设计征求批评，遵守社区自推广规则；Show HN 要能实际体验产品 | 讨论与高质量建议 |
| **视频** | 正面实际成功 + 已确认的边界与独立真值；短 45–75 秒、长 3–5 分钟；禁止动画演示冒充实测 | 观看到跳转、开发者互动 |

### 3.3 发布门禁（状态机）

`EVIDENCE_READY → PRIVATE_FEEDBACK_SENT → PUBLIC_SAFE_QA → PUBLIC_CASE_LIVE → CHANNEL_QUEUED → CHANNEL_POSTED → FEEDBACK_OBSERVED → RETESTED`。

每条发布事件至少记录：
`project_id, assessment_run_id, case_version, platform, account, copy_hash, status, url, published_at, source_evidence_ids, content_owner, moderation_state, response_id, next_action`。

**只有平台实际报告成功并有真实 URL 才能标 `PUBLISHED`**。账号未连接、网站页面不能新增、需要写入代码或无权限时标 `BLOCKED`，不做臆造。

### 3.4 不同报告/提示词不能混用

- **Self Evaluate**（开发者自测）：[SELF_EVALUATE_MCP.zh.md](../prompts/SELF_EVALUATE_MCP.zh.md)；结果必须标为自评，不能写“ARE independently certified”。
- **Maintainer Retest**（接到反馈的维护者）：[MAINTAINER_RETEST_MCP.zh.md](../prompts/MAINTAINER_RETEST_MCP.zh.md)；要求修复前后同条件复测，允许获得源码/测试租户授权。
- **Independent Third-Party Review**（公众/第三方）：[INDEPENDENT_MCP_EVALUATION.zh.md](../prompts/INDEPENDENT_MCP_EVALUATION.zh.md)；不凭用户访问权限代替运营者许可，严格公共只读。

所有提示词必须含：输入参数/范围、参考最新 ARE MCP、数据/权限边界、完整工具矩阵、真实 Agent 任务 + Oracle、39 检查覆盖与非官方认证声明、可复现产物、禁止造分数。

## 4. 一次完成的 Solarstorm 案例：可公开什么？

- World2 服务 ID `5388312a-23b9-58f5-89ef-ec184a389907`，公开 `https://mcp.solarstorm.today/mcp`。
- 4/4 工具发现与合法只读调用；2026-07-28 有界协议预检 9 PASS/0 FAIL；公开源码离线 55/55、在线 NOAA 9/9 测试通过；真实 Claude Code Sonnet 一次多工具任务成功（4 次 MCP 调用），与 NOAA 部分独立交叉核对。
- 源码标称 1.0.3，线上报告 1.0.0：部署来源 **未确认**。
- 无效纬度的 `isError=false` 与缺字段 `isError=true` 语义差异：ARE 设计改进建议，**不是协议 MUST 违规**。
- 一次长尾超时，两次成功重试，不能宣传服务持续不可用。
- 39 项 4 PASS/2 FAIL（ARE 自定义要求）/10 N/A/23 NOT_VERIFIED，**不授予 L0–L4**。
- 邮件 2026-11-16 已发送官方联系渠道，待回信；公开案例不推断对方已阅读或认可。

## 5. 验收表和责任边界

只有 `S10 PUBLIC_CASE` 已有在线 URL 才算“公开案例走通”； `S11 DISTRIBUTE` 可以局部走通（如 GitHub 自有仓库），不同账号/平台逐项记录。网站新增自评入口当前尚需网站内容/界面变更时，本轮**先不修改代码**，所以可先在 GitHub 文档发布可复制提示词，并记录站内按钮为待实施。World2 不迁移 Endpoint。

**批量化门槛**：单案 S0–S10 全部证据、S11 至少一个合法渠道公开、S12 有联系记录、S13 仅在收到可复测更新后完成；源码绑定、维护者治理或认证无法取得时必须标 `LIMITED`。不能因没有维护者回复而伪称完成 S13。

## 6. 质量指标（不重合）

`qualified / discovered`、`tool_contract_checked / tools_discovered`、`tool_calls_tested / lawful_testable_tools`、`agent_tasks_verified / agent_tasks_attempted`、`complete_are_assessments / qualified`、`safe_cases_published / QA_passed`、`channels_with_live_urls / planned_channels`、`verified_contacts / qualified`、`emails_sent / reports_ready`、`maintainer_replies / delivered`、`retests_verified / fixes_submitted`。对不适用和未知分别计数；费用/Token/人工时间仅用真实计量。

## 7. 不修改代码的本轮实施边界

- 可更新**文档/公开报告内容**，使用现有 GitHub Markdown URL 与已有的 ARE 项目评估数据面。
- 不修改 ARE、World2、OWL LAB 的任何运行代码或部署行为；不迁移域名。
- 不在第三方仓库创建营销 Issue、不向不匹配品牌账号发帖，不在没有复现/披露审查时公开敏感故障。
- 每项第三方发布必须记录公开 URL 与审批/账户是否可用，失败即保留草稿，不声称成功。
