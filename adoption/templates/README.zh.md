# Agent-Ready Engineering 标准交付物模板
> 文档编号：ARE-T00
> 中文阅读版：不作为规范，与英文不一致时以英文为准｜对应英文版：`README.md` EN v0.7｜术语见 `ARE-R03` 术语表
> v0.2｜2026-11-12｜配套：`../ARE-A01-agent-ready-implementation-checklist.zh.md`（P0–P8）、`../ARE-A02-agent-ready-maturity-model.zh.md`（L0–L4）

## 使用规则
- 每个项目把需要的模板**复制到自己的项目目录**（如 `docs/agent-ready/`）再填写，不要回写本知识库。
- 所有数字必须有来源（实测、日志、真实记录）；没有数据就写“未测”，不要估一个数填进去。
- `<尖括号>` 是待填写项；“示例”行只说明怎么填，复制后删除。
- 每份交付物都写上版本和日期；内容变化时更新版本，不静默改写。

## 模板与阶段
| 模板 | 阶段 | 回答的问题 | 粒度 |
| :--- | :--- | :--- | :--- |
| `ARE-T01-value-card.zh.md` 价值卡片 | P0 | 值不值得让 Agent 做？ | 每个场景一张 |
| `ARE-T02-capability-matrix.zh.md` 能力矩阵 | P1 | 涉及哪些操作？先改造哪些？ | 每个项目一张，可按场景分节 |
| `ARE-T03-operation-contract.zh.md` 操作契约卡 | P2–P3 | 这个操作怎样做到可重试、可恢复、可判断？ | 每个首批改造的操作一张 |
| `ARE-T04-authorization-matrix.zh.md` 授权矩阵 | P4 | 谁授权、Agent 能做到哪一步、怎么留证据？ | 每个项目一张 |
| `ARE-T05-eval-report.zh.md` 评测报告 | P5 / P7 | Agent 实际用起来怎样？能不能发布？ | 每次评测一份 |
| `ARE-T06-value-review.zh.md` 价值复盘 | P8 | 上线后价值兑现了吗？下一步扩大、维持还是收缩？ | 每个场景每个复盘周期一份 |
| `ARE-T07-maturity-assessment.zh.md` 成熟度评估表 | 任意阶段 | 现在处在哪一级？差什么？能开放到什么程度？ | 每个场景每次评估一份 |
| `ARE-T08-scenario-screening.zh.md` 场景筛选表 | P0（组合） | 多个候选想法中，哪些值得填价值卡片？ | 每个项目或每轮筛选一份 |
| `ARE-T09-portfolio-report.zh.md` 组合报告与路线图 | 每轮评估 | 等级分布如何？风险和共同短板在哪？下一步做什么？ | 每轮评估一份 |

## 机器可读取值
本地检查会读取已填写的模板，因此部分字段使用固定取值。中英文文件都使用这些取值；它们属于标识符，不翻译。

| 字段 | 取值 | 所在模板 |
| :--- | :--- | :--- |
| 检查结果 | `✅` 通过 / `❌` 不通过 / `➖` 不适用 | ARE-T07 |
| 证据类型 | `inspected` / `documented`（`self-reported` 永远不算通过） | ARE-T07 |
| 目前对 Agent 开放的范围 | `none` / `read-only` / `write` | ARE-T07 |
| 等级 | `L0`–`L4` | ARE-T07、ARE-T09 |
| 价值卡片决定 | `go` / `read-only-first` / `not-now` | ARE-T01 第 8 节 |
| 筛选结果 | `shortlist` / `hand-back` / `defer` | ARE-T08 |
| 操作类型 | `read` / `validate` / `draft` / `commit` | ARE-T02、ARE-T03 |
| 副作用 | `none` / `internal-write` / `outbound` / `money` | ARE-T02 |
| 可撤销 | `yes` / `compensable` / `irreversible` / `n/a` | ARE-T02 |
| 风险等级 | `low` / `medium` / `high` | ARE-T02、ARE-T03、ARE-T04 |
| 能力决定 | `first-batch` / `waiting-pool` / `not-exposed` | ARE-T02 |
| 授权级别 | `A` / `B` / `C` | ARE-T04 |
| 确认形态 | `—` / `claim` / `pre-authorization` | ARE-T04 |
| 必填、可重试 | 第一个词为 `yes` / `no` | ARE-T03 |
| 验收结果 | `✅` / `❌` | ARE-T03 第 9 节 |
| 日期 | `YYYY-MM-DD`（文件名中也用此格式） | 全部 |
| 证据位置 | 相对于场景文件夹的文件路径，后面可加空格和章节（如 `ARE-T01-value-card.md §4`、`evidence/load-test.md`）。文件必须存在于工作区内 | ARE-T07 |

## 工作区目录约定
本地工具（以及 MCP 入口的本地检查）按以下路径查找交付物，请保持文件名不变。

```
engagements/<组织>/                   # 架构师 / 顾问：每个项目一个工作区，只保存在本地
  portfolio/
    ARE-T08-scenario-screening.md
    ARE-T09-portfolio-report-<轮次>.md
  scenarios/<场景简称>/
    ARE-T01-value-card.md
    ARE-T02-capability-matrix.md
    ARE-T03-operation-contract-<操作名>.md
    ARE-T04-authorization-matrix.md
    ARE-T05-eval-report-<日期>.md
    ARE-T06-value-review-<日期>.md
    ARE-T07-maturity-assessment-<日期>.md
    evidence/                         # 客户提供的材料，由“证据位置”引用
```
- 在单个项目仓库中，把一个场景的文件直接放在 `docs/agent-ready/` 下，文件名相同。
- 客户资料只保存在本地工作区，不会发送到共享知识库或远程 MCP 服务。

## 交付物之间的关系
```
价值卡片 ──▶ 能力矩阵 ──▶ 操作契约卡 ──▶ 授权矩阵
   ▲          (排序)        (P2–P3)        (P4)
   │                                        │
价值复盘 ◀──────────── 评测报告 ◀────────────┘
 (P8，结论回写价值卡片；扩大的能力回到能力矩阵)
```
- 价值卡片的**代表任务**是评测报告的主要测试用例。
- 价值卡片的**基线与目标**是价值复盘的对比对象。
- 能力矩阵中的**风险等级**决定授权矩阵中的授权级别。
- 操作契约卡中的**错误码与状态**是评测故障注入的检查对象。
- 有多个场景时，**场景筛选表**决定哪些场景填写价值卡片，**组合报告**每轮汇总各场景的成熟度评估表。

## 与其他层的接口
| 交付物 | 交给谁 / 从谁接收 |
| :--- | :--- |
| 价值卡片 | 从战略层接收候选场景；“不需要 Agent”的结论交还对应的线 |
| 授权矩阵、审计证据 | 交给治理层 |
| 能力矩阵中的 Owner / 授权人 / 负责人 | 向组织层提出的要求 |
| 能力矩阵中的数据依赖 | 与数据层约定 |
