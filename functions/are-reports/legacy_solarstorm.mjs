/** 2026-11-16 grandfathered public content, pinned from already-live evidence.
 * DB research-row edits must never silently revise this published review.
 * New revisions require a separately owner-signed release event.
 */
export const LEGACY_SOLARSTORM = {
  "project_key": "mcp/solarstorm.today",
  "display_name": "Solarstorm MCP",
  "repo_url": "https://github.com/newminya/solarstorm-mcp",
  "source_ref": "https://are.world2.co/evidence/solarstorm/",
  "publication": "published_case",
  "narrative_lang": "zh-CN",
  "summary": "2026-11-16 Solarstorm 公共只读 MCP 实测：4/4 工具、9项2026协议预检、64项开源快照测试、Claude Code 1次真实Agent任务及 NOAA 数据核对。部署源码版本未绑定。ARE 39项中4 PASS、2项设计要求未满足、10 N/A、23 NOT_VERIFIED；没有授予正式成熟度。维护者已私信，等待回复。",
  "strengths": [
    "公开 HTTPS MCP：2026-07-28 有界协议9项通过、0失败（非完整认证）",
    "全部四个公开只读工具已检查并执行，正常路径可用",
    "当前开源快照55项离线+9项 NOAA 在线测试通过；真实 Claude Agent 单次4工具任务有独立数据对照"
  ],
  "findings": [
    "待维护者确认：公开源码1.0.3、在线 serverInfo 1.0.0，未证明是同一部署版本",
    "ARE工程建议：纬度999返回error文本但MCP isError=false，与缺参数时的isError=true不一致；不是MCP MUST违规",
    "单次Kp读取60秒超时，其后两次683/252ms成功；属于孤立尾部延迟观察，不是持续故障结论",
    "39项ARE：4 PASS、2 FAIL（自有设计建议）、10 N/A、23 NOT_VERIFIED；成熟度不成立，不能宣传L等级"
  ],
  "dimensions": {
    "A": "匿名公共只读场景；私有权限与治理未验证",
    "C": "4/4工具契约检查；无效纬度错误标志可改进",
    "I": "MCP 2026 有界协议 9 PASS/0 FAIL；非完整官方认证",
    "O": "一次 Claude Agent 真实4工具任务与 NOAA 比对；源码64项测试通过",
    "R": "源码 1.0.3 与线上 1.0.0 未绑定；观察到一次长尾请求",
    "S": "无状态写入工具；恢复/幂等不适用或未验证",
    "V": "公开空间天气业务任务完成；维护者价值基线未审核",
    "X": "四工具接口；未测独立模型 Token 效率"
  },
  "evidence": [
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md",
      "label": "Public Solarstorm technical case"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md",
      "label": "ARE method and publication SOP"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/prompts/MAINTAINER_RETEST_MCP.md",
      "label": "Maintainer retest prompt (EN)"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/prompts/SELF_EVALUATE_MCP.md",
      "label": "Developer self-evaluate prompt"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/prompts/INDEPENDENT_MCP_EVALUATION.md",
      "label": "Public independent-review prompt"
    },
    {
      "url": "https://github.com/newminya/solarstorm-mcp/tree/6d0fed8c9ec43bc2b2efb2fe94be81c45e66d650",
      "label": "Public source at inspected commit"
    },
    {
      "url": "https://services.swpc.noaa.gov",
      "label": "NOAA SWPC (independent data source)"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-publication-run-2026-11-16.md",
      "label": "Public distribution status and content pack"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/issues/4",
      "label": "Public ARE methodology feedback discussion"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-public-replay-2026-11-16.md",
      "label": "Solarstorm project-specific public Agent replay prompt"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-maintainer-retest-2026-11-16.md",
      "label": "Solarstorm project-specific maintainer retest prompt"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/standards/ARE-PUBLICATION-RUNNER-v1.md",
      "label": "S0–S13 publication runner reproducibility standard"
    },
    {
      "url": "https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-run-status-2026-11-16.md",
      "label": "Solarstorm S0–S13 current status ledger"
    }
  ],
  "assessment_level": null
};
