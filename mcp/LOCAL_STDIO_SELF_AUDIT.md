# ARE — Local stdio MCP Self-Audit (NOT Benchmark registration)
> v0.4 | 2026-11-16 | Status: public read-only self-audit guidance
> English canonical. Chinese reading aid: `LOCAL_STDIO_SELF_AUDIT.zh.md`.

## Scope and separation of responsibilities

A coding Agent (Antigravity, Claude Code, Codex or equivalent) can inspect the source of a local stdio MCP server and run it in a workspace **already authorized by the developer**. The remote ARE MCP endpoint does not gain access to the Agent's local files, other MCP servers or runtime.

- ARE knowledge endpoint: `https://are.fde.fan/mcp`.
- New public read-only guide tool: `are_local_mcp_audit_guide({ "service": "Project name", "lang": "zh" })`.
- The independent ARE public Benchmark `are_score_mcp` accepts **only a reachable public HTTPS MCP Endpoint**, never stdio, a GitHub repository URL or user-provided manifest.
- Local self-audit produces **no official Benchmark score, run_id, maturity certification, public listing or automatic submission**. Store results locally and let the developer decide what to share.

## New ARE-A02@0.5 operation profiles and provisional level

The 39 historical check IDs remain intact. Every new T07 pins the standard version and a complete `ARE-T10-operation-risk-profile.json` (sample in `adoption/templates/`). For N/A, include `scope`, `reason`, local `evidence`, `reviewer`, `reviewed_at`; a free-text explanation is insufficient. Local tool `are_review_operation_risk({path})` detects missing operations and annotation-risk conflicts. No project tool is executed.

`are_assess_scenario` is a *provisional* maturity indication with a shared semantic evidence review: see `level_status`, `evidence_gate`, `verified_level:null`. Historical pre-v0.5 T07 files remain legacy snapshots (`LEGACY_NOT_REVALIDATED`, `consistent=null`) in a separate `legacy_distribution`, never the current portfolio grade distribution. Invalid calendar dates cannot bypass version review. A backdated filename alone is not genuine historical provenance; verify source revisions before re-assessment. Review the operation profiles by inspecting actual source and side effects; structured statements cannot prove permission or security.

For continuously updated real-project and public-MCP evidence, follow [ARE evaluations](https://are.world2.co/evaluations/) and [ARE Benchmark](https://are.world2.co/benchmark/); A02 no longer maintains fixed cohort totals.

## Workflow

1. **P0 Value Gate:** Consult ARE-P01 and ARE-T01. Define three real user tasks, beneficiaries, alternatives, measurable success criteria, and observed baseline. Do not over-engineer features for a grade.
2. **Source and actual runtime:** Pin Git commit, published package version, entrypoint and transport. Inspect registered tools, descriptions, schemas, observed runtime tools/list, sources and tests. Identify local writes, persistence, configuration updates, network access, telemetry, business side effects and trust/authorization boundaries.
3. **Controlled task tests:** In an isolated, developer-authorized test workspace, measure agent tool discovery, task success, independently verifiable end state, request/response bytes, number of calls, latency and token cost only when available. Ask for explicit permission before any state-changing tool invocation, cloud submission or telemetry change. No destructive live testing.
4. **39 check evidence mapping:** Use `are_list_checks` / `are_get_check` and ARE-A02 / ARE-T07. Classify each applicable criterion as VERIFIED_PASS, VERIFIED_FAIL, UNKNOWN or NOT_APPLICABLE, citing concrete source lines or reproducible execution evidence. Never infer official L3/L4 from static fields or a subjective score.
5. **Evidence Quality Gate (mandatory before any level claim):** Run the standalone local CLI shown below (or connect the local ARE MCP with --workspace and call are_validate_local_mcp_audit). Check file/line references, all 39 rows, full-scope coverage, required value/authorization documents, and tool retirement safety. A passing static gate still does NOT independently verify semantics or certify any level.
6. **Value-linked improvement and retest:** Propose P0/P1/P2 improvements, including verified problems, hypotheses, no-change alternatives and false-positive reversals. Measure before/after against identical real tasks in equivalent environments, then save the Value Card, evidence matrix and local report.

## Run the independent local evidence-quality gate (no uploads)

The public ARE MCP can explain the assessment but cannot verify the developer's local file paths. For a real local evidence gate, clone ARE to a separate read-only reference checkout and run:

```sh
git clone https://github.com/tubban1/agent-ready-engineering.git /tmp/are-review
cd /tmp/are-review
npm ci --prefix mcp
npm run build --prefix mcp
node mcp/dist/src/audit-gate-cli.js --workspace /ABSOLUTE/PATH/TO/PROJECT --report ARE_LOCAL_AUDIT_REPORT.md
```

- Exit 0: no structural evidence blockers found; **NOT a maturity certification**.
- Exit 2: review blockers; exit 3: invalid input or execution failure.
- The validator checks 39 check IDs, cited file/line ranges (including .mdc rules), format-neutral lightweight value evidence, basic mandatory semantic elements of selected checks, contradictory N/A claims, incomplete coverage, and affirmative unsafe recommendations. It checks cited evidence only and cannot prove code semantics, actual execution success, independent authorizations, all runtime paths or complete tool/task coverage.
- **N/A is not a shortcut:** an in-flight Worker/scan may trigger L3-S1 despite having no daemon; merely logging an actor and submissionId does not prove L3-O1's authorization receipt. For L3-A4 timeout/kill switch do not replace amount and frequency limits.
- **First-person/OSS value evidence:** ARE-T01/T02 are recommended layouts, not mandatory filenames or corporate signature requirements. A concise README/AGENTS decision table may carry equivalent value metrics, scope cap and roles, but the Owner decision and verification still require review.
- An MCP SDK script with preselected tool calls is a valid transport integration test, but not a measured autonomous Agent planning test. Distinguish the two explicitly.
- With ARE installed as a local MCP using an authorized `--workspace` root, the same read-only check is available as `are_validate_local_mcp_audit({path:"ARE_LOCAL_AUDIT_REPORT.md"})`. This tool is **not exposed** from ARE's public remote MCP.
- Neither path sends the code or report to ARE servers. All report and source paths must remain within the authorized project root.

## Example: Vibe Monitor

The repository `vibe-monitor/server.json` declares stdio distribution via npm `@vibe-monitor/setup@1.0.14`; `src/mcp.js` registers tools such as `vibe_version`, `vibe_project_status`, `vibe_checkpoint`, `vibe_set_product_intent` and `vibe_submit_architecture_review`. Some operations read state, others persist local snapshots/intent or can submit bounded cloud metadata.

**Candidate questions, not proven bugs:** Are “read-only source scanning” and all other operation side effects distinguished clearly? Do descriptions and user permissions reflect actual persistence/network behavior? Are failure states and task outcomes independently verifiable? Is progressive discovery actually necessary given measured tool-list/token cost? Do not infer quality from manifest completeness or README claims alone.

## Suggested developer prompt

Connect BOTH ARE's public MCP and the local project's stdio MCP to your coding Agent. Open an authorized code workspace.

> Call `are_local_mcp_audit_guide` with `{"service":"Vibe Monitor","lang":"zh"}`. Follow the value-first plan, inspect the authorized source and live local MCP, verify tool side effects, perform only permitted safe tests, and map evidence to all 39 ARE checks. Produce a local source-linked report with verified findings, hypotheses, unknowns and prioritized changes. Do not call `are_score_mcp` for a stdio target; do not upload code or fabricate an official `run_id`.
