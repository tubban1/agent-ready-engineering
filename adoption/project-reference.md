# 各项目如何使用本知识库
> 文档编号：ARE-A03

## 推荐分层
1. 共享知识源：本目录 `agent-native-knowledge/`，由 Git 版本管理。
2. 每个项目：只添加一小段只读指针，注明版本/URI，明确项目具体规则优先。
3. 具体实现：在项目内形成 ADR、Schema、Evals 和变更测试；不要复制长期分叉的完整原文。
4. 远端 Agent：优先由授权 MCP Resource 或只读 Git RAW 内容按需读取；不要假设它能访问 Mac 本地绝对路径。

## 建议的简短项目指针（确认项目需要后人工纳入）
> For agent-facing APIs and MCP tool design, consult the shared Agent-Native Interface Design playbook at `../agent-native-knowledge/principles/agent-native-interface-design.md` (v0.1). It is advisory, not authorization. Project AGENTS.md/CLAUDE.md, production permissions, and Owner approvals take precedence. Do not import or publicize private project data.

## 推广门槛
- 不能在未验证跨平台文件可达性时宣称“自动所有 Agent 可用”；
- 各项目保留独立开发规则，安全与权限不得被共享知识覆盖；
- 变更知识库时同步版本号、来源与待验证假设，不静默改写既有准则。
