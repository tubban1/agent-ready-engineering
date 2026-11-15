# ARE — Local stdio MCP Self-Audit (NOT Benchmark registration)
> v0.1 | 2026-11-15 | Status: public read-only self-audit guidance
> English canonical. Chinese reading aid: `LOCAL_STDIO_SELF_AUDIT.zh.md`.

## Scope and separation of responsibilities

A coding Agent (Antigravity, Claude Code, Codex or equivalent) can inspect the source of a local stdio MCP server and run it in a workspace **already authorized by the developer**. The remote ARE MCP endpoint does not gain access to the Agent's local files, other MCP servers or runtime.

- ARE knowledge endpoint: `https://are.fde.fan/mcp`.
- New public read-only guide tool: `are_local_mcp_audit_guide({ "service": "Project name", "lang": "zh" })`.
- The independent ARE public Benchmark `are_score_mcp` accepts **only a reachable public HTTPS MCP Endpoint**, never stdio, a GitHub repository URL or user-provided manifest.
- Local self-audit produces **no official Benchmark score, run_id, maturity certification, public listing or automatic submission**. Store results locally and let the developer decide what to share.

## Workflow

1. **P0 Value Gate:** Consult ARE-P01 and ARE-T01. Define three real user tasks, beneficiaries, alternatives, measurable success criteria, and observed baseline. Do not over-engineer features for a grade.
2. **Source and actual runtime:** Pin Git commit, published package version, entrypoint and transport. Inspect registered tools, descriptions, schemas, observed runtime tools/list, sources and tests. Identify local writes, persistence, configuration updates, network access, telemetry, business side effects and trust/authorization boundaries.
3. **Controlled task tests:** In an isolated, developer-authorized test workspace, measure agent tool discovery, task success, independently verifiable end state, request/response bytes, number of calls, latency and token cost only when available. Ask for explicit permission before any state-changing tool invocation, cloud submission or telemetry change. No destructive live testing.
4. **39 check evidence mapping:** Use `are_list_checks` / `are_get_check` and ARE-A02 / ARE-T07. Classify each applicable criterion as VERIFIED_PASS, VERIFIED_FAIL, UNKNOWN or NOT_APPLICABLE, citing concrete source lines or reproducible execution evidence. Never infer official L3/L4 from static fields or a subjective score.
5. **Value-linked improvement and retest:** Propose P0/P1/P2 improvements, including verified problems, hypotheses, no-change alternatives and false-positive reversals. Measure before/after against identical real tasks in equivalent environments, then save the Value Card, evidence matrix and local report.

## Example: Vibe Monitor

The repository `vibe-monitor/server.json` declares stdio distribution via npm `@vibe-monitor/setup@1.0.14`; `src/mcp.js` registers tools such as `vibe_version`, `vibe_project_status`, `vibe_checkpoint`, `vibe_set_product_intent` and `vibe_submit_architecture_review`. Some operations read state, others persist local snapshots/intent or can submit bounded cloud metadata.

**Candidate questions, not proven bugs:** Are “read-only source scanning” and all other operation side effects distinguished clearly? Do descriptions and user permissions reflect actual persistence/network behavior? Are failure states and task outcomes independently verifiable? Is progressive discovery actually necessary given measured tool-list/token cost? Do not infer quality from manifest completeness or README claims alone.

## Suggested developer prompt

Connect BOTH ARE's public MCP and the local project's stdio MCP to your coding Agent. Open an authorized code workspace.

> Call `are_local_mcp_audit_guide` with `{"service":"Vibe Monitor","lang":"zh"}`. Follow the value-first plan, inspect the authorized source and live local MCP, verify tool side effects, perform only permitted safe tests, and map evidence to all 39 ARE checks. Produce a local source-linked report with verified findings, hypotheses, unknowns and prioritized changes. Do not call `are_score_mcp` for a stdio target; do not upload code or fabricate an official `run_id`.
