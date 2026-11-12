# Glossary | 术语表
> Document ID: ARE-R03
> v0.2 | 2026-11-12 | Status: reference
> This is the one bilingual file in the repository: it maps the canonical English terms to the Chinese terms used in `.zh.md` reading aids. 本文件是仓库中唯一的中英对照文件，用于统一英文正式术语与中文阅读版的译法。

## Rules | 规则
1. **English is canonical.** When a Chinese reading aid and the English source disagree, the English source wins.
   英文为正式版本；中文阅读版与英文不一致时，以英文为准。
2. **Never translate identifiers.** Document IDs (`ARE-P01`), check IDs (`L3-A2`), stage IDs (`P0`–`P8`), level IDs (`L0`–`L4`), dimension codes (`V`, `C`, …), field names (`expected_revision`), tool names and code stay identical in both languages.
   标识符不翻译：文档编号、检查项编号、阶段编号、等级编号、维度代号、字段名、工具名和代码在两种语言中完全一致。
3. **Use the Chinese term from this table** in every `.zh.md` file. Terms marked “keep” stay in English in Chinese text.
   中文阅读版统一使用本表译法；标为“保留英文”的术语在中文中也写英文。
4. **Add new terms here first**, then use them in documents.
   新术语先登记到本表，再在文档中使用。

## Core concepts | 核心概念
| English (canonical) | 中文 | Definition |
| :--- | :--- | :--- |
| Agent-Ready Engineering | 保留英文 | A value-first process that turns worthwhile business capabilities into a form agents can use safely and reliably, then verifies the value with measured data after launch. |
| Agent-Ready | 保留英文 | A business service or interface that agents can use safely and reliably. Not the same as an “agent-ready repository”. |
| execution layer | 执行层 | The part of enterprise AI transformation where agents actually act on business systems. The scope of this repository. |
| probabilistic actor | 概率性智能体 | A client that plans and acts autonomously but whose behavior is probabilistic. |
| Owner | 保留英文 | The human principal who authorizes an agent and bears the external consequences of its actions. |
| hand back | 交还 | Return a scenario judged “no agent needed” to the appropriate workstream instead of processing it further. |
| out-of-scope list | 不做清单 | The explicit list of what a scenario will not cover, with reasons. |

## Value | 价值
| English (canonical) | 中文 | Definition |
| :--- | :--- | :--- |
| Value Gate | 价值关卡 | Stage P0: decide whether an agent should do this, and what first. |
| value-first | 价值优先 | Judge value before engineering; review value after launch. |
| value card | 价值卡片 | Deliverable ARE-T01: one per scenario. |
| value review | 价值复盘 | Deliverable ARE-T06: compare measured results with baseline and target. |
| baseline | 基线 | The current measured value of a metric, with its source. |
| representative task | 代表任务 | A typical end-to-end task from the value card; also the main eval case. |
| minimum validation | 最小验证 | One real run of a representative task before any re-engineering. |
| recurring value | 重复使用价值 | Whether the need recurs and who will use it again. |

## Architecture | 架构
| English (canonical) | 中文 | Definition |
| :--- | :--- | :--- |
| context window | 上下文窗口 | The limited, costly working memory of a model. |
| working memory | 工作内存 | Preferred analogy for the context window (“L1 cache” is only an analogy). |
| context economy | 上下文经济 | Designing responses to fit a limited context budget. |
| progressive discovery | 渐进式发现 | Expose a small capability index first; fetch full schemas on demand. |
| field projection | 字段投影 | Return only requested fields (`fields`). |
| cursor pagination | 游标分页 | Stable cursors instead of fixed page numbers. |
| truncation flag | 截断标记 | `truncated: true` plus a next cursor when a response hits its size limit. |
| bounded intent | 有界意图 | A business-level operation with explicit limits on effects, preconditions and scope. |
| catch-all executor | 万能执行器 | One entry point that performs many actions of different risk. To be split. |
| idempotency key | 幂等键 | `idempotency_key`: replaying the same request takes effect once. |
| conditional write (CAS) | 版本条件写 | Write only if `expected_revision` matches; on conflict return the latest revision. |
| structured error | 结构化错误 | `code`, `retryable`, `retry_after`, `hint`, `current_state`. |
| dry-run / validate | 校验（dry-run） | Check an operation without side effects. |
| declarative side effects | 副作用声明 | Explicitly separate read, validate, draft and commit. |
| operation entity | 任务状态实体 | A long-running task modeled as a resource with a status lifecycle. |
| lifecycle | 生命周期 | `accepted → running → partial → completed / failed / cancelled / unknown`. |
| compensation (Saga) | 补偿（Saga） | A follow-up action that reverses or offsets a committed operation. |
| domain core | 领域内核 | Where contracts, state and authorization live. |
| ingress layer | 接入层 | Thin adapters such as MCP, REST/OpenAPI and Code Mode. |
| tool annotations | 工具注解 | MCP hints such as `readOnlyHint`; hints, not enforcement. |
| tool definition integrity | 工具定义完整性 | Versioning and hashing/signing full tool definitions so changes are visible. |

## Trust and authorization | 信任与授权
| English (canonical) | 中文 | Definition |
| :--- | :--- | :--- |
| delegated credential | 委托凭证 | A narrow, short-lived, revocable credential issued to an agent on behalf of an Owner. |
| Draft & Claim | 草稿与认领 | Agents create drafts; humans claim final effects through a trusted channel. |
| draft | 草稿 | A time-limited, isolated result an agent may create freely. |
| claim (per-action confirmation) | 认领（逐笔确认） | A human confirms a specific draft through a trusted channel. |
| pre-authorization | 预授权 | A signed, bounded, revocable authorization given in advance (cf. AP2 Intent Mandate). |
| trusted channel | 可信通道 | A human-verifiable path such as web confirmation, QR scan or independent signature. |
| self-reported trust | 代理自报信任 | An agent asserting approval (e.g. `owner_confirmed: true`). Never accepted. |
| authorization levels A / B / C | 授权级别 A / B / C | A automatic, B requires confirmation, C human only. |
| kill switch | 一键停用 | Immediately revoke an agent’s access. |
| untrusted content boundary | 不可信内容边界 | External content is data, never instructions. |
| Prompt Injection | 保留英文 | Instructions hidden in content the agent reads. |
| least agency | 最小自主 | Give agents only the autonomy a bounded task needs (OWASP). |
| blast radius | 破坏半径 | The extent of damage a failure can cause. |

## Observability and evaluation | 可观测与评测
| English (canonical) | 中文 | Definition |
| :--- | :--- | :--- |
| provenance | 来源与证据 | Who authorized which agent, with what intent, on which revision, with what result. |
| audit log | 审计日志 | Persistent record of principal, agent, action, revision, authorization evidence and result. |
| correlation ID | 关联 ID | Links agent session, tool call, core transaction and external effect. |
| evals | 评测 | Running real agents on representative tasks. |
| eval-driven tool design | 评测驱动的工具设计 | Iterate tool granularity, names, descriptions and responses from eval results. |
| fault injection | 故障注入 | Deliberately causing timeouts, duplicates, conflicts, injections. |
| release gate | 发布门槛 | Eval thresholds that block a release when metrics regress. |
| measured, not estimated | 实测而非估算 | Every number needs a source; otherwise write “not measured” (未测). |

## Stages P0–P8 | 阶段
| ID | English (canonical) | 中文 |
| :--- | :--- | :--- |
| P0 | Value Gate | 价值关卡 |
| P1 | Capability Inventory and Prioritization | 能力盘点与价值排序 |
| P2 | Domain Core Contract | 领域内核契约 |
| P3 | State Machine and Long-running Operations | 状态机与长任务 |
| P4 | Trust Boundary and Authorization | 信任边界与授权 |
| P5 | Context Economy | 上下文经济 |
| P6 | Ingress Adaptation | 接入层适配 |
| P7 | Observability and Evals | 可观测与评测 |
| P8 | Launch, Operations and Value Review | 上线运营与价值复盘 |
| — | read-only track / write track | 只读轨道 / 写入轨道 |

## Maturity levels L0–L4 | 成熟度等级
| ID | English (canonical) | 中文 | Allowed action / 允许的动作 |
| :--- | :--- | :--- | :--- |
| L0 | Not Ready | 未就绪 | Do not expose to agents / 不开放 |
| L1 | Value Defined | 价值明确 | Start re-engineering / 开始改造 |
| L2 | Read-Ready | 只读可用 | Expose read-only capabilities / 开放只读 |
| L3 | Write-Safe | 写入可控 | Expose write operations / 开放写入 |
| L4 | Verified Operations | 可验证运营 | Scale up / 规模化扩大 |

## Maturity dimensions | 成熟度维度
| Code | English (canonical) | 中文 |
| :--- | :--- | :--- |
| V | Value | 价值 |
| C | Contract | 契约 |
| S | State and Recovery | 状态与恢复 |
| A | Authority and Trust | 授权与信任 |
| X | Context Economy | 上下文经济 |
| I | Ingress | 接入层 |
| O | Observability and Evals | 可观测与评测 |
| R | Run and Review | 运营与复盘 |

## Deliverables | 交付物
| ID | English (canonical) | 中文 |
| :--- | :--- | :--- |
| ARE-T01 | Value Card | 价值卡片 |
| ARE-T02 | Capability Matrix | 能力矩阵 |
| ARE-T03 | Operation Contract | 操作契约卡 |
| ARE-T04 | Authorization Matrix | 授权矩阵 |
| ARE-T05 | Eval Report | 评测报告 |
| ARE-T06 | Value Review | 价值复盘 |
| ARE-T07 | Maturity Assessment | 成熟度评估表 |
| ARE-T08 | Scenario Screening | 场景筛选表 |
| ARE-T09 | Portfolio Report and Roadmap | 组合报告与路线图 |

## Portfolio assessment | 组合评估
| English (canonical) | 中文 | Definition |
| :--- | :--- | :--- |
| engagement workspace | 项目工作区 | A local folder per engagement holding all deliverables and evidence; client data never leaves it. |
| scenario screening | 场景筛选 | A light Value Gate pass over many candidate ideas: shortlist / hand back / defer. |
| shortlist | 入选 | A candidate that gets a full value card. |
| defer | 暂缓 | A candidate to revisit on a set date. |
| portfolio report | 组合报告 | The per-round, enterprise-level view built from scenario assessments; never an averaged score. |
| roadmap | 路线图 | Now / next / later sequence of scenarios and platform capabilities. |
| high-risk inconsistency | 高风险不一致 | What is exposed to agents goes beyond what the level allows (e.g. writes below L3). |
| platform-level gap | 平台层短板 | A dimension failing in several scenarios, better solved once as a shared capability. |
| evidence type | 证据类型 | `inspected` 亲自验证 / `documented` 文档证据 / `self-reported` 自述 (never passes). |
| evidence request list | 证据清单 | The artifacts to request from a team to assess a target level. |
| interview guide | 访谈提纲 | Questions for stakeholders, organized by value card section. |

## Protocol terms (keep in English) | 协议术语（保留英文）
Tool Calling, MCP, Code Mode, A2A, Resources, Prompts, elicitation, OpenAPI, REST, stdio, Streamable HTTP, Saga, CAS, AP2, Intent Mandate, Cart Mandate.
