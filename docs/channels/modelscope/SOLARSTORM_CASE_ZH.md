# MCP 接口能连接，不代表 Agent 能完成任务：ARE 对 Solarstorm 的一次真实评估

**作者：Agent-Ready Engineering（ARE）/ World2**
**技术案例：Solarstorm MCP，评估日期 2026-11-16**
**性质：公开只读、独立工程评估；不构成 MCP 官方认证或项目方背书。**

## 一、我们实际测了什么？

Solarstorm 是一个提供空间天气数据的公开 MCP 服务，支持查询当前地磁 Kp、未来三天地磁预报、24 小时太阳耀斑，以及指定纬度的极光可见性。

本轮不是读完 tools/list 就打分，而是从 World2 已收录的 MCP 服务里选出这个具备公开真实业务与独立数据来源的项目：

1. **接口层**：完整检查 4/4 工具定义和参数约束；有范围的 MCP 2026 协议预检，9 PASS、0 FAIL，另有 1 UNKNOWN、1 N/A，不能等同官方全量认证。
2. **工具层**：真实调用 4/4 公共只读工具，覆盖正常路径以及一个无害的参数错误路径。
3. **源码层**：固定 Git commit，公开代码快照通过 55 个离线测试和 9 个 NOAA 在线测试。**注意：线上 serverInfo 为 1.0.0，公开快照声明 1.0.3，未证明二者对应。**
4. **Agent 层**：让真正的 Claude Code Agent 独立选择并调用四个工具，完成一项有实际用户意义的空间天气查询，再和 NOAA SWPC 的公共数据做独立对照。

这是一次真实 Agent 完成任务的证据，但不是多次、多模型的统计可靠性结论。

## 二、39 项 ARE 检查结果

| 状态 | 数量 | 含义 |
|---|---:|---|
| PASS | 4 | 当前有可复核证据 |
| FAIL | 2 | 未满足 ARE 的工程设计建议；不是官方 MCP MUST 违规 |
| NOT_APPLICABLE | 10 | 本场景不适用，附理由 |
| NOT_VERIFIED | 23 | 缺少项目方权限、治理资料或部署绑定等关键证据 |

因此**没有给 Solarstorm 随意定一个 L0–L4 等级**。缺少证据就是缺少证据，不能计作成功，更不能作为商用认证徽章。

## 三、两个有工程价值的现象

**1. 错误表达语义不一致。** 传入纬度 999 时，返回错误文本但 MCP isError=false；缺少必填纬度时返回 isError=true。我们把它归为 ARE 的设计改进建议，建议维护者评估统一的机器可读错误语义，而不是夸大成协议违规。

**2. 上游动态数据不能做静态断言。** 对比 NOAA 的三个验证项，其中两个在采样时吻合；瞬时 GOES X-ray 通量的一项不完全一致，但最强耀斑等级 C5.4 一致。瞬时读数会随时间变化；公开数据必须保留这一差异。

## 四、任何开发者如何自己复测？

英文主版本及实际限制已经整理成公开、只读的项目专属提示词：

- 交互证据浏览器：https://are.world2.co/evidence/solarstorm/
- JSONL 证据数据集：https://are.world2.co/datasets/solarstorm-20261116/
- 全部技术报告：https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
- Solarstorm 公众复测提示词：https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-public-replay-2026-11-16.md
- ARE 官方 MCP 接入地址：https://are.world2.co/mcp

**公共复测权限边界：**仅调用已确认的四个公开只读工具，每次有合理超时，总次数不超过七次；不登录、不发送邮件、不修改第三方资源、不进行大规模压力测试。与 NOAA 最新采样时刻对齐验证，不能复用历史瞬时读数。

## 五、关于可交互在线评测

本次提供的互动 Demo 能筛选 39 项检查、查看 NOAA 对照和复制安全复测提示词；**它不在页面里直接发起实时 MCP 测试**。需要做实时公共 Endpoint 预检，请使用 https://are.world2.co/benchmark/ 。将“历史证据浏览”与“生产环境远程测试”分开，是为了明确权限、避免误调用有副作用的工具。

欢迎中国 MCP 开发者提出反馈：你们希望评测报告具备哪些可复现证据，才值得在生产环境信任？对于没有源代码—部署版本绑定的服务，工程建议和真实线上缺陷应如何区分？

*ARE 是 World2 旗下的 Agent 工程研究服务，与 Solarstorm 项目方无隶属关系。已给维护者发送技术反馈；在取得真实修复版本和独立复测证据前，不会宣布问题已修复。*
