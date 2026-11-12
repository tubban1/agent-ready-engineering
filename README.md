# Agent-Native Knowledge | Agent 原生接口与可信执行知识库

版本：0.6.0（2026-11-12：新增成熟度分级与评估表。0.5.0 新增标准交付物模板。0.4.0 明确定位为企业 AI 转型执行层标准。0.3.0 价值关卡纳入 Agent-Ready Engineering，新增行业参考。0.2.0 新增架构文档索引与实施 Checklist；0.1.0 为 2026-11-11 研究初稿）

这是跨项目知识源，不是 OWL LAB、World2、Bloomroom 或 Interior 任一项目的产品规范。

## 目标
让任何新的 Agent 项目首先回答：
1. 用户在真实场景里为什么需要该服务？是否存在重复使用价值？
2. 模型怎样发现能力、理解前提、选择工具？
3. 业务接口是否 Agent-ready（数据、状态、授权、恢复、证据）？
4. 谁是真正的操作主体、谁授权、谁承担外部效果？
5. 怎样独立验证执行结果、失败和复现性？

## 文件
- `principles/agent-native-interface-design.md`：核心设计理念、原则、检查清单
- `principles/agent-ready-architecture.md`：Agent-Ready Engineering 的定位与边界、定义（价值前提 + 架构七个维度）
- `references/tool-calling-mcp-code-mode.md`：Tool Calling / MCP / Code Mode / A2A 的技术区别
- `references/agent-ready-industry-landscape.md`：行业中 Agent-Ready 相关资料、来源可信度与已吸收的做法
- `adoption/project-reference.md`：在新/已有项目中低侵入引用
- `adoption/agent-ready-implementation-checklist.md`：Agent-Ready Engineering 实施 Checklist（P0 价值关卡 → P8 价值复盘，含验收标准）
- `adoption/agent-ready-maturity-model.md`：Agent-Ready Engineering 成熟度分级（L0–L4，按场景评估）
- `adoption/templates/`：标准交付物模板（价值卡片、能力矩阵、操作契约卡、授权矩阵、评测报告、价值复盘、成熟度评估表）
- `media/claude-video-brief-20261111.md`：跨时代认识转变的原创科普视频制作任务书

## 使用规则
- 本目录为“知识”，不自动覆盖具体项目的安全政策、产品目标或本地 AGENTS.md / CLAUDE.md。
- 每条观点标明：已验证事实 / 工作假设 / 设计建议；模型推断不得伪装成实测。
- 有冲突时，以项目明确的 Owner 决定、授权边界、真实生产状态和最新验收为准；不得引用此文扩大权限。
- 默认禁止把内部漏洞、私人凭证、用户数据、未发布代码与未修复的缺陷公开。
- 以 Git 管理版本，建立远程只读 URL 后再用于跨机器、跨 Owner、闭源宿主分发。当前目录仅是 Mac 本地源，**并非自动全局生效**。
- 不把整篇文本注入每个 Agent 的系统提示词；用项目指针、按需检索、有限技能模块组合。

## 优先级
真实用户价值 > 已验证的安全/授权 > 执行证据 > 最小明确的业务操作 > 工具数量/协议偏好/架构宏大叙事。
