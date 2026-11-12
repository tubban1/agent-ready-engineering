# Agent-Ready 行业参考与现状
> 文档编号：ARE-R02
> 状态：参考说明｜检索日期 2026-11-12｜来源多为厂商博客与二手解读，权威原文已单独标注
> 用途：了解行业怎样使用 “Agent-Ready” 一词，以及哪些做法已有外部印证；不是标准，不构成授权。

## 结论
- 行业里**没有统一的 Agent-Ready 标准**，这个词至少有三种用法：服务/API 设计、代码仓库准备度、安全与授权。
- 本知识库的 Agent-Ready 指**服务与接口**（第一种），同时吸收第三种的安全做法；第二种只是同名，不在范围内。
- 价值判断（Value Gate）在公开资料中很少作为 Agent-Ready 的一部分出现，是本知识库的主动选择，见 `../principles/agent-ready-architecture.md`。

## 一、服务 / API 侧（与本知识库同一话题）
| 来源 | 类型 | 要点 |
| :--- | :--- | :--- |
| Anthropic《Writing effective tools for agents — with agents》（2025-09） | 权威原文 | 工具是确定性系统与非确定性 Agent 之间的契约；评测驱动迭代；少而精、命名空间、省 Token 的响应、可指导修正的错误信息 |
| Cloudflare Code Mode（博客与开发者文档） | 权威原文 | 把工具暴露为 TypeScript API，模型写代码在隔离沙箱执行；据其报道用少量工具覆盖整个 Cloudflare API |
| Agent Experience（AX）系列文章（Netlify 提出，Resend、WorkOS、Speakeasy、Pinecone、Apideck 等） | 厂商博客 | 稳定的返回结构、明确类型、写清限制、可自我修正的错误、高风险操作需人类确认 |
| Agent-ready API 指南（freeCodeCamp、apilayer、Apidog 等） | 厂商 / 社区博客 | 完整 OpenAPI、统一错误、显式状态、幂等键、边界授权；与“好的 API 设计”高度重合 |
| arXiv 2607.12056（Agent-ready 网站框架） | 单篇论文 | 研究对象是网站而非 API；可解读、可执行、决策可靠三维度；概念验证中成功率有明显提升，不能直接推广到 API |

## 二、代码仓库侧（同名，不在本知识库范围）
- AGENTS.md：给编程 Agent 的仓库说明文件，据报道已由 Linux 基金会下的 Agentic AI Foundation 维护。
- Factory Agent Readiness、Larridin 等：给代码仓库按维度和等级打分（测试、CI、文档、可观测等）。
- 可借鉴之处：**成熟度分级**的表达方式；本知识库的 P0–P8 未来可整理成可打分的等级。

## 三、安全与授权（对应架构文档维度四、六）
| 来源 | 类型 | 要点 |
| :--- | :--- | :--- |
| OWASP Top 10 for Agentic Applications（2026 版，2025-12 发布） | 权威原文 | ASI01–ASI10，含目标劫持、工具滥用、身份与权限滥用等；“最小自主”（least agency）原则 |
| OWASP MCP Security Cheat Sheet | 权威原文 | 工具注解是提示不是约束，客户端应视为不可信；对完整工具定义做哈希以发现变更；服务端执行授权；禁止令牌透传 |
| Google AP2（Agent Payments Protocol） | 协议（本次依据二手资料，权威原文为 AP2 官方规范） | 人类在场时签 Cart Mandate；事先签 Intent Mandate 约束价格、时间等，Agent 在约束内执行；交易标明有 Agent 参与 |

## 已吸收进本知识库的做法
| 做法 | 来源 | 位置 |
| :--- | :--- | :--- |
| 预授权（有约束的事先授权）作为 Claim 的另一种形态 | AP2 | 架构文档维度四；Checklist P4 |
| 评测驱动的工具设计，从最小验证就开始 | Anthropic | 架构文档维度七；Checklist P0 / P5 |
| 工具定义版本化并做哈希，变更可发现 | OWASP MCP Cheat Sheet | 架构文档维度五；Checklist P6 |
| 明确范围：服务与接口，不是代码仓库 | 对照仓库准备度资料 | 架构文档开头；Checklist 范围 |

## 判断（工作假设，未验证）
- Agent-Ready Engineering 很可能成为企业 AI 转型中的**标准工程环节**，并被现有的 API 治理、平台工程与安全评审吸收；但转型的起点仍是业务价值。
- 最先固化为标准的大概率是授权、确认与审计（有安全、合规、支付的外部压力）；接入协议与上下文策略变化快，不宜过早固定。

## 来源链接
- https://anthropic.com/engineering/writing-tools-for-agents
- https://blog.cloudflare.com/code-mode/
- https://developers.cloudflare.com/agents/api-reference/codemode
- https://cheatsheetseries.owasp.org/cheatsheets/MCP%5FSecurity%5FCheat%5FSheet.html
- https://www.speakeasy.com/blog/owasp-agentic-top-10-explained
- https://vellum.ai/blog/googles-ap2-a-new-protocol-for-ai-agent-payments
- https://www.descope.com/learn/post/ap2
- https://www.freecodecamp.org/news/how-to-design-apis-for-ai-agents/
- https://blog.apilayer.com/ai-agents-are-the-new-users-of-your-api-how-to-make-your-api-agent-ready/
- https://resend.com/blog/agent-experience
- https://speakeasy.com/blog/agent-experience-introduction
- https://www.pinecone.io/blog/designing-agent-friendly-apis/
- https://radar.apideck.com/blog/api-design-principles-agentic-era
- https://arxiv.org/pdf/2607.12056
- https://docs.factory.ai/web/agent-readiness/overview
- https://www.harness.io/blog/the-agent-native-repo-why-agents-md-is-the-new-standard
