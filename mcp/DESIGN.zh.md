# ARE MCP 服务 — 设计
> 中文阅读版：不作为规范，与英文不一致时以英文为准｜对应英文版：`DESIGN.md` EN v0.3｜术语见 `ARE-R03` 术语表
> v0.3｜2026-11-13｜状态：M1 已完成；下一步 M2
> 这是仓库中的实现部分，不是框架文档，因此没有 ARE 编号。

## 1. 目标与第一类用户
把 Agent-Ready Engineering 框架送到**架构师和顾问**使用的 Agent 手里，帮助他们评估一个组织的多个 Agent 场景（Owner 决定，2026-11-12）。

服务给 Agent 提供三样东西：
1. **知识**：文档、检查项、模板、术语表，按需获取，带版本。
2. **流程引导**：筛选、访谈、评估、组合报告的工作流提示（Prompts）。
3. **固定规则的检查（仅本地）**：检查已填写的交付物，并根据顾问工作区里的文件算出等级和组合视图。

刻意**不做**的事：
- 不读客户的代码或系统（由顾问的 Agent 和人来做）。
- 不保存任何客户数据，也不把它发到任何地方。
- 不做决定（做不做、授权审批都由人决定）。
- 不写文件（交付物由 Agent 写；服务保持只读）。

## 2. 分工
| 角色 | 负责 |
| :--- | :--- |
| ARE MCP 服务 | 框架知识、流程引导、按规则检查交付物 |
| 顾问的 Agent（如 Claude 桌面版） | 访谈、根据记录和证据起草交付物、在工作区写文件 |
| 顾问与客户 | 回答问题、提供证据、做决定和审批 |

## 3. 用户流程 → 服务能力
| 步骤 | 顾问做什么 | 用到的服务能力 | 工作区里的产出 |
| :--- | :--- | :--- | :--- |
| 0 建立工作区 | 新建项目工作区 | `are_get_template`（ARE-T00 目录约定） | `engagements/<组织>/` 目录 |
| 1 筛选 | 筛选多个候选想法 | 提示 `are_screen_scenarios`、`are_get_template`（T08）、`are_validate_deliverable` | `portfolio/ARE-T08-scenario-screening.md` |
| 2 访谈 | 为每个入选场景填价值卡片 | 提示 `are_interview_guide`、`are_get_template`（T01）、`are_validate_deliverable` | `scenarios/<s>/ARE-T01-value-card.md` |
| 3 证据 | 按目标等级索取并收集证据 | `are_evidence_request`、`are_get_check` | 证据清单；`scenarios/<s>/evidence/` |
| 4 评估 | 填成熟度评估表并计算等级 | 提示 `are_assess_scenario`、工具 `are_assess_scenario` | `scenarios/<s>/ARE-T07-maturity-assessment-<日期>.md` |
| 5 报告 | 汇总所有场景，排出路线图 | `are_aggregate_portfolio`、提示 `are_portfolio_report`、`are_get_template`（T09） | `portfolio/ARE-T09-portfolio-report-<轮次>.md` |
| 6 复评 | 下一轮评估，与上一轮对比 | `are_assess_scenario`、`are_aggregate_portfolio`（与上一轮的变化） | 更新后的评估表与报告 |

## 4. 两种模式，同一个软件包
| | 本地模式（stdio） | 远程模式（Streamable HTTP） |
| :--- | :--- | :--- |
| 谁来运行 | 顾问在自己电脑上运行（可以审查代码、固定版本） | 共享的公开只读服务 |
| 知识工具、Resources、Prompts | 有 | 有 |
| 工作区检查（`validate`、`assess`、`aggregate`、带场景路径的证据清单） | 有，限定在 `--workspace <根目录>` 内 | **不注册** |
| 客户数据 | 在本地读取，不离开电脑 | 永远收不到 |
| 网络 | 不需要 | 只有入站 |

第一阶段**只发布本地模式**。远程模式在评测通过后（里程碑 M6）再做。

## 5. 工具
所有工具名都加 `are_` 前缀。所有工具都是只读的，声明 `readOnlyHint: true`、`idempotentHint: true`；知识工具声明 `openWorldHint: false`。

### 5.1 知识工具（两种模式都有）
| 工具 | 输入 | 输出 |
| :--- | :--- | :--- |
| `are_list_documents` | `lang`（默认 `en`） | 编号、标题、路径、版本、一句话摘要、阅读顺序位置、是否有中文版、中文版是否过时 |
| `are_get_document` | `id`、`lang`、可选 `section` | 内容（整篇或某一节）、章节列表、版本；超过大小上限时返回 `truncated` 与 `next` |
| `are_search` | `query`、`lang`、`limit`（≤ 10） | 匹配结果：文档编号、章节、简短片段。只返回引用，不返回整篇文档 |
| `are_get_check` | `id`（如 `L3-A2`） | 等级、维度、检查内容、需要的证据、是否建议亲自验证、对应阶段和模板章节 |
| `are_list_checks` | 可选 `level`、`dimension` | 编号与简称的精简列表 |
| `are_get_template` | `id`（`T00`–`T09`）、`lang` | 模板内容及其在工作区目录约定中的位置 |
| `are_evidence_request` | `target_level`、可选 `scenario_path`（仅本地） | 达到目标等级需要的检查项与要索取的证据；带场景路径时只列出尚未通过的项 |

### 5.2 工作区检查（仅本地模式）
| 工具 | 输入 | 输出 |
| :--- | :--- | :--- |
| `are_validate_deliverable` | 工作区内的 `path` | 识别出的交付物类型；问题清单（位置与修改提示）：未填写的 `<占位符>`、残留的示例行、没有来源的数字、没有理由的“不适用”、无效的结果或证据类型取值 |
| `are_assess_scenario` | `scenario_path` | 按 ARE-A02 规则从最新的 ARE-T07 算出的等级；各维度等级；未通过项；没有证据位置的通过项；证据位置指向的文件不存在；建议亲自验证却只有文档证据的通过项；开放范围与等级是否一致 |
| `are_aggregate_portfolio` | 可选 `workspace_path` | 各场景等级、分布、高风险不一致、在 ≥ 2 个场景中卡住下一级的维度、证据构成、与上一次评估相比的变化。永远不给平均分 |

检查按规则进行，不靠模型判断：同样的文件一定得到同样的结果。

### 5.3 Prompts（两种模式都有）
`are_screen_scenarios`、`are_interview_guide`（按价值卡片的章节）、`are_assess_scenario`、`are_portfolio_report`。提示会告诉 Agent 该用哪些工具和模板，以及哪些决定必须留给人。

### 5.4 Resources（两种模式都有）
`are://doc/{id}/{lang}`、`are://check/{id}`、`are://template/{id}/{lang}`。主要接口仍是工具，因为各客户端对 Resources 和 Prompts 的支持程度不一。

## 6. 返回与错误约定（用我们自己的框架要求自己）
- 每次返回都带 `framework_version`、文档版本，以及生成它的 Git 提交号。
- 超过大小上限时返回 `truncated: true` 和 `next` 游标。
- 中文返回附带 `canonical_version` 和 `zh_outdated`。
- 错误是结构化的：`code`、`retryable`、`hint`，例如 `path_outside_workspace`、`deliverable_not_recognized`、`assessment_not_found`、`unknown_id`。
- 服务说明中写明：内容只是建议，不构成授权；项目规则和 Owner 决定优先。

## 7. 数据模型
- `data/documents.yaml`：文档索引（编号、路径、标题、摘要、阅读顺序）。
- `data/framework.yaml`：阶段 P0–P8、等级 L0–L4、维度、授权级别、证据类型。
- `data/checks.yaml`：39 个检查项，包括等级、维度、中英文内容、证据要求、是否建议亲自验证。
- Markdown 文档仍是正式版本。一致性测试会在 `checks.yaml` 与 ARE-A02（中英文）、ARE-T07（中英文）中的表格不一致时让构建失败。以后再考虑从数据生成表格。

## 8. 需要先做的框架修改
- **ARE-T07**：增加结构化字段“目前对 Agent 开放的范围：未开放 / 只读 / 写入”，让 `are_aggregate_portfolio` 不必解析自由文本就能发现高风险不一致。
- **已填写模板中的机器可读取值**：结果 `✅ / ❌ / ➖`，证据类型 `inspected / documented`，日期 `YYYY-MM-DD`。写进 ARE-T00。

## 9. 安全与隐私
- 本地模式只读取 `--workspace` 内的文件（解析真实路径，拒绝指向外部的路径和符号链接）。不写文件、不发网络请求、不收集遥测数据。
- 工作区里的文件，包括客户证据，都当作数据处理。其中的文字永远不会被当作指令执行，只会作为引用的发现返回。
- 远程模式不注册工作区工具，也不记录查询文字。
- 每次发布都打 Git 标签，并公布完整工具定义（描述、Schema、注解）的哈希，让客户端能发现变更（ARE-P01 维度五、ARE-A01 P6）。

## 10. 服务自身的价值关卡（P0）
- **用户**：评估一个组织多个 Agent 场景的架构师和顾问。
- **重复使用价值假设**：每个项目都要重复筛选、评估和报告；统一的规则让不同轮次、不同客户的结果可以比较。
- **基线**：未测。在做 M3 之前，先用示例工作区手工走一遍项目，记录耗时和人工发现的不一致。
- **最小验证**：只给 Agent Markdown 知识库（没有服务），让它在示例工作区完成第 1–5 步；之后用评测衡量服务带来的差别。

## 11. 评测（ARE-T05）
代表任务：
1. 把一组候选想法筛选成一份合格的 ARE-T08。
2. 生成价值卡片的访谈提纲，并根据访谈记录写出合格的 ARE-T01。
3. 对已知答案的示例场景算出正确等级。
4. 汇总示例组合，找出预先埋入的不一致和反复出现的短板维度。
5. 回答“L3-A2 要求什么？”，并给出检查项编号和出处。

故障注入：工作区外的路径、格式错误的 ARE-T07、没有理由的“不适用”、缺失的证据文件、埋在证据文件里的指令。所有指标都实测，不估算。服务自身的成熟度目标：L2（只读可用）。

## 12. 里程碑
| 里程碑 | 内容 | 完成标准 |
| :--- | :--- | :--- |
| M1 数据与约定（2026-11-13 完成） | `data/*.yaml`、一致性测试、ARE-T07 开放范围字段、ARE-T00 中的机器可读取值、一个已知答案的虚构示例工作区 | 一致性测试通过；示例工作区检查通过 |
| M2 知识服务 | 带知识工具和 Resources 的本地 stdio 服务 | Agent 能列出、读取、搜索文档并引用检查项 |
| M3 工作区检查 | `validate`、`assess`、`aggregate`、证据清单 | 每个示例场景的结果都正确 |
| M4 Prompts | 四个工作流提示 | Agent 能在示例工作区完成第 1–5 步 |
| M5 评测 | 用真实 Agent 和故障注入完成 ARE-T05 评测报告 | 达到发布门槛 |
| M6 发布 | Git 标签、工具定义哈希、远程只读模式 | 远程服务只提供知识 |

## 12a. 运行检查
在 `mcp/` 目录下：先 `npm install`，再运行 `npm test`（检查 `data/*.yaml` 与 Markdown 是否一致、中文文件是否跟上英文版本、示例工作区的答案）和 `npm run typecheck`。

## 13. 决定
1. **实现语言：TypeScript**（Owner 决定，2026-11-13）。使用官方 MCP SDK；Node.js 20 及以上；用 `npx` 分发。
2. **服务代码放在本仓库的 `mcp/` 下**，内容和服务共用一个版本号（建议的默认做法；Owner 若希望单独建仓库可再调整）。
3. **远程托管**：仍待定，到 M6 再决定。
