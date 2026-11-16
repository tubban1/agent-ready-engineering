# ADR-001 中文说明：World2 统一管理所有自有 MCP 服务

> 英文规范以 [ADR-001](ADR-001-world2-are-publishing.md) 为准。日期：2026-11-16；状态：**ARE 已完成 World2 服务注册和新域名路由；旧域名继续兼容**。

本 ADR 明确纠正旧版误解：**World2 不是单纯的 MCP 数据目录，而是纯面向 Agent 的 MCP 服务平台及统一管理控制面**。统一管理服务注册、独立子域名、发布/回滚、版本、路由、授权策略、监测和生命周期。每个 MCP 保留独立执行与业务状态，避免一个服务的授权被另一个服务继承。

| 服务 | World2 计划正式入口 | 当前事实 |
|---|---|---|
| World2 | `world2.co/mcp` | 已有公开入口 |
| **ARE** | **`are.world2.co/mcp`** | 已设置 Cloudflare DNS 和 Vercel 关联；旧地址 `are.fde.fan/mcp` 保持可用 |
| Interior | `interior.world2.co/mcp` | 当前已公开 |
| 其他自有 MCP | `<service>.world2.co/mcp` | 服务逐一注册后生效，未创建的不宣称在线 |

**`are.world2.co/` 网页**提供英文优先的通用测试提示词、一键复制、基础预检/深度评估入口以及公开证据与案例；`are.world2.co/mcp` 是 Agent 接入地址，不混淆两者。

**迁移顺序：**现状清单 → World2 服务注册和 DNS/TLS 准备 → MCP 新旧版本/真实 Agent 端到端验收 → 新地址成为 canonical → 旧 `are.fde.fan/mcp` 保留已验证的兼容入口 → 观察并准备回滚。不要仅靠浏览器首页正常或 HTTP Redirect 来宣称 MCP 可用。

ARE 归属/World2 关联透明披露：自有项目的评估不能宣称完全独立的第三方认证。详细技术门禁见 [迁移方案](ARE-WORLD2-ENDPOINT-MIGRATION-PLAN.md)。

**2026-11-16 迁移实施记录：**World2 的 app.mcp 服务发布 ID 为 `2ca4d14b-2b82-43f9-9eea-d2de82ecb845`，新域名已指向原 ARE 服务 Vercel 项目；相关具体测试和邮件记录见项目运维文档。
