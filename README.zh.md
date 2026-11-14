# Agent-Ready Engineering | Agent 原生接口与可信执行知识库
> 中文阅读版：不作为规范，与英文不一致时以英文为准｜对应英文版：`README.md` EN 0.18.0｜术语见 `ARE-R03` 术语表

版本：0.18.0（2026-11-13：MCP 支持实施工程师、治理与决策者；ARE-T02/T03/T04 的机器可读取值。0.17.0 MCP 里程碑 M4，4 个流程提示。0.16.0 MCP 里程碑 M3，只读的工作区检查；ARE-T00 规定证据位置格式。0.15.0 `mcp/` 中的本地只读 MCP 知识服务（里程碑 M2）。0.14.0 为本地检查加入机器可读取值与开放范围字段；框架数据放在 `data/`；MCP 里程碑 M1。0.13.0 面向架构师与顾问的组合评估：ARE-T08 场景筛选表、ARE-T09 组合报告与路线图、证据类型、工作区目录约定。0.12.0 全部文档与模板完成英文正式版，中文均为 `.zh.md` 阅读版。0.11.0 主线文档 P01、A01、A02 完成英文正式版。0.10.0 确定语言规则，新增术语表 ARE-R03。0.9.0 项目由 agent-native-knowledge 更名为 agent-ready-engineering。0.8.0 文件名加上文档编号前缀。0.7.0 新增文档编号与阅读顺序。0.6.0 新增成熟度分级与评估表。0.5.0 新增标准交付物模板。0.4.0 明确定位为企业 AI 转型执行层标准。0.3.0 价值关卡纳入 Agent-Ready Engineering，新增行业参考。0.2.0 新增架构文档索引与实施 Checklist；0.1.0 为 2026-11-11 研究初稿）

这是跨项目知识源，不是 OWL LAB、World2、Bloomroom 或 Interior 任一项目的产品规范。

## 目标
让任何新的 Agent 项目首先回答：
1. 用户在真实场景里为什么需要该服务？是否存在重复使用价值？
2. 模型怎样发现能力、理解前提、选择工具？
3. 业务接口是否 Agent-ready（数据、状态、授权、恢复、证据）？
4. 谁是真正的操作主体、谁授权、谁承担外部效果？
5. 怎样独立验证执行结果、失败和复现性？

## 文档编号
编号写在每份文档标题下方，并作为文件名前缀（两个 README 除外），**只标识文档，不代表阅读顺序**；编号一经分配不再变更，也不复用。引用时可写“见 ARE-A02 的 L3-A2”。
前缀：P = 原则（Principles），R = 参考（References），A = 实施（Adoption），T = 模板（Templates），M = 其他材料（Media）。

| 编号 | 文件 | 内容 |
| :--- | :--- | :--- |
| ARE-P01 | `principles/ARE-P01-agent-ready-architecture.zh.md` | Agent-Ready Engineering 的定位与边界、价值前提、架构七个维度 |
| ARE-P02 | `principles/ARE-P02-agent-native-interface-design.zh.md` | 面向 Agent 的接口设计理念与原则 1–12 |
| ARE-R01 | `references/ARE-R01-tool-calling-mcp-code-mode.zh.md` | Tool Calling / MCP / Code Mode / A2A 的技术区别 |
| ARE-R02 | `references/ARE-R02-agent-ready-industry-landscape.zh.md` | 行业中 Agent-Ready 相关资料、来源可信度与已吸收的做法 |
| ARE-R03 | `references/ARE-R03-glossary.md` | 中英术语表（英文为正式术语），唯一的中英对照文件 |
| ARE-A01 | `adoption/ARE-A01-agent-ready-implementation-checklist.zh.md` | 实施 Checklist：P0 价值关卡 → P8 价值复盘，含验收标准 |
| ARE-A02 | `adoption/ARE-A02-agent-ready-maturity-model.zh.md` | 成熟度分级：L0–L4，按场景评估 |
| ARE-A03 | `adoption/ARE-A03-project-reference.zh.md` | 在新 / 已有项目中低侵入引用本知识库 |
| ARE-T00 | `adoption/templates/README.zh.md` | 模板总览与交付物之间的关系 |
| ARE-T01 | `adoption/templates/ARE-T01-value-card.zh.md` | 价值卡片（P0） |
| ARE-T02 | `adoption/templates/ARE-T02-capability-matrix.zh.md` | 能力矩阵（P1） |
| ARE-T03 | `adoption/templates/ARE-T03-operation-contract.zh.md` | 操作契约卡（P2–P3） |
| ARE-T04 | `adoption/templates/ARE-T04-authorization-matrix.zh.md` | 授权矩阵（P4） |
| ARE-T05 | `adoption/templates/ARE-T05-eval-report.zh.md` | 评测报告（P5 / P7） |
| ARE-T06 | `adoption/templates/ARE-T06-value-review.zh.md` | 价值复盘（P8） |
| ARE-T07 | `adoption/templates/ARE-T07-maturity-assessment.zh.md` | 成熟度评估表 |
| ARE-T08 | `adoption/templates/ARE-T08-scenario-screening.zh.md` | 场景筛选表（P0，多个候选场景） |
| ARE-T09 | `adoption/templates/ARE-T09-portfolio-report.zh.md` | 组合报告与路线图（每轮评估） |
| ARE-M01 | `media/ARE-M01-claude-video-brief-20261111.md` | 视频任务书（已作废，仅作记录，只有中文；不在阅读路径中） |

本表列出中文阅读版路径；每份文档旁边都有同名的英文正式版（去掉 `.zh`）。ARE-R03 是中英对照文件，ARE-M01 只有中文。

实现部分：MCP 服务在 `mcp/` 中；设计、进度与安装方法见 `mcp/DESIGN.zh.md`（没有 ARE 编号，它是实现部分，不是框架文档）。

新增文档时，在对应前缀下取下一个未使用的编号，并同步更新本表与阅读顺序。

## 阅读顺序
**主线（第一次阅读）**
1. ARE-P01 架构：先理解定位、价值前提和七个维度（为什么、做什么）
2. ARE-P02 接口原则：面向 Agent 的接口长什么样
3. ARE-R01 概念区别：分清 Tool Calling、MCP、Code Mode、A2A
4. ARE-A01 实施 Checklist：按 P0–P8 怎么做
5. ARE-A02 成熟度分级：怎么判断做到哪一级、能开放到什么程度
6. ARE-T00 → T01–T09 模板：每个阶段交付什么
7. ARE-R02 行业参考：哪些做法有外部印证

术语不确定时随时查 ARE-R03 术语表。

**按角色的捷径**
| 角色 | 阅读路径 |
| :--- | :--- |
| 决策者 | ARE-P01 的“定位与边界”“前提：价值优先”两节 → ARE-A02 → ARE-T01 价值卡片 |
| 架构师 | ARE-P01 → ARE-P02 → ARE-R01 → ARE-R02 → ARE-R03 |
| 实施团队 | ARE-A01 → ARE-T00 与 T01–T07 → ARE-A02 与 ARE-T07 评估表 |
| 治理 / 审批人 | ARE-P01 维度四 → ARE-A01 P4 → ARE-T04 → ARE-A02 中的 L3-A 检查项 |
| 架构师 / 顾问（组合评估） | ARE-P01 → ARE-A02 → ARE-T00 工作区目录约定 → ARE-T08 → ARE-T01 → ARE-T07 → ARE-T09 |
| 在项目中引用本知识库 | ARE-A03 |

## 语言规则
- **英文为正式版本**（canonical）；中文为阅读辅助，不作为规范。两者不一致时以英文为准。
- **同一编号，两个文件，并排放置**：`ARE-P01-<slug>.md`（英文）与 `ARE-P01-<slug>.zh.md`（中文）。不在同一文件中逐段中英对照（ARE-R03 术语表除外），以免 Agent 读取时 Token 翻倍、两种语言内容走样。
- **标识符不翻译**：文档编号、检查项编号、阶段与等级编号、维度代号、字段名、工具名和代码在两种语言中完全一致。
- **中文文件头部记录对应的英文版本**（例：`Translated from: EN v0.1`）；英文更新而中文未跟上时，中文标为“待更新”。
- **术语以 ARE-R03 为准**；新术语先登记再使用。
- **MCP 入口默认返回英文**；请求中文时同时返回其对应的英文版本与是否过时。
- **迁移状态**：2026-11-12 已完成。全部文档与模板都有英文正式版，ARE-M01（仅作记录）除外。

## 使用规则
- 本目录为“知识”，不自动覆盖具体项目的安全政策、产品目标或本地 AGENTS.md / CLAUDE.md。
- 每条观点标明：已验证事实 / 工作假设 / 设计建议；模型推断不得伪装成实测。
- 有冲突时，以项目明确的 Owner 决定、授权边界、真实生产状态和最新验收为准；不得引用此文扩大权限。
- 默认禁止把内部漏洞、私人凭证、用户数据、未发布代码与未修复的缺陷公开。
- 以 Git 管理版本，建立远程只读 URL 后再用于跨机器、跨 Owner、闭源宿主分发。当前目录仅是 Mac 本地源，**并非自动全局生效**。
- 不把整篇文本注入每个 Agent 的系统提示词；用项目指针、按需检索、有限技能模块组合。

## 优先级
真实用户价值 > 已验证的安全/授权 > 执行证据 > 最小明确的业务操作 > 工具数量/协议偏好/架构宏大叙事。
