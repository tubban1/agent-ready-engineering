# Tool Calling / MCP / Code Mode / A2A — 工程区别
> 文档编号：ARE-R01

状态：参考说明，2026-11-11。

## 概念定位与生态分工

不同层面的协议、工具与系统解决的是不同阶段的核心问题：

| 概念 | 解决什么问题 |
| :--- | :--- |
| **Agent-ready API** | 业务服务自身如何设计，才能被自主软件可靠、安全地使用 |
| **MCP** | 不同 Agent 宿主如何标准化发现和调用这些外部能力与数据资源 |
| **Tool Calling** | 大语言模型在内部如何表达调用具体工具的意图与参数 |
| **OWL LAB** | Agent 如何在可控环境中持续、可靠、可授权地执行任务 |
| **World2** | 不同信任主体的 Agent 如何发现彼此并安全交换信息与协作 |
| **A2A** | 独立 Agent 之间如何标准化委托任务与交换最终结果 |
| **Code Mode** | Agent 如何通过生成受限代码组合调用复杂 API 减少多轮往返 |

---

## Tool Calling
模型向宿主表达“调用某个工具 + 参数”的意图。模型本身不执行第三方 API。宿主接收模型输出、决定批准/执行，并把结果返回模型。
典型：模型发出 `cancel_order({order_id:"1234"})`；应用自己写 HTTP/API 桥接和授权逻辑。

## MCP
标准化宿主与外部工具/资源服务的连接。MCP Client 通过 `tools/list` 发现定义，用 `tools/call` 请求 MCP Server 执行，服务端返回结果。模型仍通过内部 Tool Calling 选择 MCP 工具。MCP **不自动提供**身份、授权正确性、成功证明或真实业务能力。
典型：不同模型宿主使用同一个 `https://orders.example.com/mcp`，无需每个宿主自行编写专属订单工具适配。
注：2026 年 7 月的 MCP 规范强化了无状态请求、多轮往返、缓存和授权机制，说明协议自身也正在适应比简单工具调用更复杂的企业级场景。模型原生 Tool Calling 留在内部，MCP 成为可复用的外部能力接口。

## Code Mode
模型先检索可用 API 的类型/Schema，然后**模型/Agent 生成**受限执行代码（如 JavaScript async arrow function）传给 `execute(code)`。服务器搭建隔离运行环境与受控 API 代理、提供辅助运行时代码、严格限制凭证和出口；服务器不是默认由另一个模型自动生成业务计划。
一次 Code Mode 执行可组合多个 API、筛选中间结果、条件判断、循环。遇到写操作仍需每次子操作按身份/Owner 授权/幂等/策略验证。
Cloudflare 例子：`search` 搜 OpenAPI spec，`execute` 运行模型代码并通过 `cloudflare.request()` 访问 Cloudflare API，`docs` 检索帮助；另外有 `whoami`。其源码还支持 `?codemode=false` 的细粒度原生工具表面。
重要：Cloudflare 在 OpenAI 代码仓库的插件包中存在，不等于证明通用 Code Mode 已通过 World2 所遇到的完全相同的公开扫描。不能称有豁免。

## A2A
Agent 之间能力/任务协作与消息、结果交换的互操作协议。和 MCP 的工具/资源连接处于不同层次，互补不互斥。A2A 官方也明确将 MCP 视为互补协议：MCP 解决宿主到能力工具的纵向连接，A2A 解决独立 Agent 之间的横向协作。

## 不要混淆
- Tool Calling ≠ MCP。MCP 可成为标准接入层，Tool Calling 仍可在模型/宿主内部使用。
- 少量工具 ≠ 权限简单。业务子操作每次必须核对风险和后端授权。
- Code Mode ≠ 任意权限、任意网络、直接访问数据库。
- 工具成功/HTTP 200 ≠ 业务完成/外部履约。
- API 数量 ≠ Agent 可用的场景价值。
