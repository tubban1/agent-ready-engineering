# Agent-Native Knowledge | Agent 原生接口与可信执行知识库

版本：0.7.0（2026-11-12：新增文档编号与阅读顺序。0.6.0 新增成熟度分级与评估表。0.5.0 新增标准交付物模板。0.4.0 明确定位为企业 AI 转型执行层标准。0.3.0 价值关卡纳入 Agent-Ready Engineering，新增行业参考。0.2.0 新增架构文档索引与实施 Checklist；0.1.0 为 2026-11-11 研究初稿）

这是跨项目知识源，不是 OWL LAB、World2、Bloomroom 或 Interior 任一项目的产品规范。

## 目标
让任何新的 Agent 项目首先回答：
1. 用户在真实场景里为什么需要该服务？是否存在重复使用价值？
2. 模型怎样发现能力、理解前提、选择工具？
3. 业务接口是否 Agent-ready（数据、状态、授权、恢复、证据）？
4. 谁是真正的操作主体、谁授权、谁承担外部效果？
5. 怎样独立验证执行结果、失败和复现性？

## 文档编号
编号写在每份文档标题下方，**只标识文档，不代表阅读顺序**；编号一经分配不再变更，也不复用。引用时可写“见 ARE-A02 的 L3-A2”。
前缀：P = 原则（Principles），R = 参考（References），A = 实施（Adoption），T = 模板（Templates），M = 其他材料（Media）。

| 编号 | 文件 | 内容 |
| :--- | :--- | :--- |
| ARE-P01 | `principles/agent-ready-architecture.md` | Agent-Ready Engineering 的定位与边界、价值前提、架构七个维度 |
| ARE-P02 | `principles/agent-native-interface-design.md` | 面向 Agent 的接口设计理念与原则 1–12 |
| ARE-R01 | `references/tool-calling-mcp-code-mode.md` | Tool Calling / MCP / Code Mode / A2A 的技术区别 |
| ARE-R02 | `references/agent-ready-industry-landscape.md` | 行业中 Agent-Ready 相关资料、来源可信度与已吸收的做法 |
| ARE-A01 | `adoption/agent-ready-implementation-checklist.md` | 实施 Checklist：P0 价值关卡 → P8 价值复盘，含验收标准 |
| ARE-A02 | `adoption/agent-ready-maturity-model.md` | 成熟度分级：L0–L4，按场景评估 |
| ARE-A03 | `adoption/project-reference.md` | 在新 / 已有项目中低侵入引用本知识库 |
| ARE-T00 | `adoption/templates/README.md` | 模板总览与交付物之间的关系 |
| ARE-T01 | `adoption/templates/value-card.md` | 价值卡片（P0） |
| ARE-T02 | `adoption/templates/capability-matrix.md` | 能力矩阵（P1） |
| ARE-T03 | `adoption/templates/operation-contract.md` | 操作契约卡（P2–P3） |
| ARE-T04 | `adoption/templates/authorization-matrix.md` | 授权矩阵（P4） |
| ARE-T05 | `adoption/templates/eval-report.md` | 评测报告（P5 / P7） |
| ARE-T06 | `adoption/templates/value-review.md` | 价值复盘（P8） |
| ARE-T07 | `adoption/templates/maturity-assessment.md` | 成熟度评估表 |
| ARE-M01 | `media/claude-video-brief-20261111.md` | 视频任务书（已作废，仅作记录；不在阅读路径中） |

新增文档时，在对应前缀下取下一个未使用的编号，并同步更新本表与阅读顺序。

## 阅读顺序
**主线（第一次阅读）**
1. ARE-P01 架构：先理解定位、价值前提和七个维度（为什么、做什么）
2. ARE-P02 接口原则：面向 Agent 的接口长什么样
3. ARE-R01 概念区别：分清 Tool Calling、MCP、Code Mode、A2A
4. ARE-A01 实施 Checklist：按 P0–P8 怎么做
5. ARE-A02 成熟度分级：怎么判断做到哪一级、能开放到什么程度
6. ARE-T00 → T01–T07 模板：每个阶段交付什么
7. ARE-R02 行业参考：哪些做法有外部印证

**按角色的捷径**
| 角色 | 阅读路径 |
| :--- | :--- |
| 决策者 | ARE-P01 的“定位与边界”“前提：价值优先”两节 → ARE-A02 → ARE-T01 价值卡片 |
| 架构师 | ARE-P01 → ARE-P02 → ARE-R01 → ARE-R02 |
| 实施团队 | ARE-A01 → ARE-T00 与 T01–T07 → ARE-A02 与 ARE-T07 评估表 |
| 在项目中引用本知识库 | ARE-A03 |

## 使用规则
- 本目录为“知识”，不自动覆盖具体项目的安全政策、产品目标或本地 AGENTS.md / CLAUDE.md。
- 每条观点标明：已验证事实 / 工作假设 / 设计建议；模型推断不得伪装成实测。
- 有冲突时，以项目明确的 Owner 决定、授权边界、真实生产状态和最新验收为准；不得引用此文扩大权限。
- 默认禁止把内部漏洞、私人凭证、用户数据、未发布代码与未修复的缺陷公开。
- 以 Git 管理版本，建立远程只读 URL 后再用于跨机器、跨 Owner、闭源宿主分发。当前目录仅是 Mac 本地源，**并非自动全局生效**。
- 不把整篇文本注入每个 Agent 的系统提示词；用项目指针、按需检索、有限技能模块组合。

## 优先级
真实用户价值 > 已验证的安全/授权 > 执行证据 > 最小明确的业务操作 > 工具数量/协议偏好/架构宏大叙事。
