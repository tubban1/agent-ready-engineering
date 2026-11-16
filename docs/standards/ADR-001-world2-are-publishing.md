# ADR-001 — World2 与 ARE 的发布、评估与执行边界

**状态：Accepted for process design / architecture migration NOT approved**
**日期：2026-11-16**
**原则：不修改产品代码，不迁移现有公开 MCP Endpoint。**

## 决策

1. **World2 是发现与分发层。** 使用其现有 MCP 目录（2026-11-16 盘点约 67,144 条服务记录）作为 ARE Discovery 的初始数据来源。可索引/引用 ARE 评估公开结果，但 World2 目录记录不等于 ARE 认证，不能擅自宣称第三方所有权。
2. **ARE 是独立的评估与证据层。** 保留 `https://are.fde.fan/mcp` 为稳定、直接可用的评估端点；`are.fde.fan` 为方法、案例和可下载提示词的权威来源。
3. **自有其他 MCP 仍保持独立执行/授权/持久状态责任。** World2 可以作为单一入口的能力目录或带明确分发身份的路由，但不能由目录权限替代 OWL LAB、Interior、Bloomroom 各自的执行权限和审计记录。
4. **发布双标识而不是强制合并为一个服务：** 规范身份 `publisher/service-name`、原始 `canonical_endpoint`、World2 目录 `world2_service_id`、ARE 报告 `assessment_id`、源码和版本证据分开存储。若将来开放 World2 Gateway，只作为可选别名；认证作用域、OAuth 回调、streaming/Tasks、客户端缓存和错误语义必须做双协议回归。
5. **利益关系透明。** ARE 评估 World2 收录、乃至同团队自有的 MCP 时，公开 `catalog_origin=World2`、`evaluation_by=ARE`、`affiliation`，区分内部评估和独立第三方观察。不能自评当作外部权威认证。

## 不采用的选项

- 不立即把每一个 MCP 的原生 HTTPS 地址迁移到 `world2.co/mcp`：会将域名、OAuth、可靠性、版本、回滚和限流风险集中化，且让 ARE 的独立品牌难以辨认。
- 不把 World2 单一入口下的工具集无条件暴露给任何 Agent：发现权限不是执行授权。
- 不让 ARE 报告缺少可审查证据而只在 World2 目录上显示一个等级/徽章。

## 未来考虑迁移的准入条件

维护版本化身份和可验证路由、客户端兼容、新旧 MCP 协议回归、OAuth scopes、隔离、取消/恢复、Origin 校验、长期缓存策略、端到端 Trace 和备援直连。满足后单独编写迁移 ADR 并要求用户确认；本 ADR 不触发技术变更。

## 参考

- ARE 本地标准：[Public evaluation & outreach SOP](ARE-EVALUATION-PUBLICATION-SOP-v1.md)
- World2 官方发现、发布和资源验证能力：保留原生对象 ID 与权属；公开发布必须符合 Owner 授权。
- MCP Registry 的 remote 元数据对发布者身份与 URL 进行区分。
