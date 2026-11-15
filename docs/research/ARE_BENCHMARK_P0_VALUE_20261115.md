# ARE Benchmark P0 value card — MCP Creator first
Date: 2026-11-15 · Decision: read-only-first P0 pilot, not full L0–L4 certification.

## Specific outcome and users
- **Primary user:** MCP creator preparing OpenAI/Anthropic submission or seeking higher real-agent success.
- **Task:** submit public MCP URL/GitHub repository, receive justified engineering findings and specific next steps, retest after correction, optionally publish a controlled report.
- **Recurring moment:** initial submission + every material tool/schema/permission/reliability release.
- **Today:** fragmented lint checks, platform docs and manual troubleshooting; precise creator time, approval and success baselines **not measured**.
- **Why an Agent:** semantic tool selection, evidence inspection, paired real-world task evaluation, engineering recommendation; deterministic schema validation and URL normalization do not need an Agent.

## Three value hypotheses, separate from features
1. **Creator benefit:** reduce avoidable review preparation rework; improve real-agent task completion; enable actionable repairs with before/after evidence; create controlled trustworthy visibility.
2. **ARE benefit:** obtain opt-in creator feedback and verified engineering cases, test which ARE check categories predict failures, grow creator repeat usage and quality of evaluated data.
3. **Ecosystem benefit:** consumers select tools with better evidence, agents spend less context/tool-selection effort, and directory/platform owners can inspect reproducible claims rather than marketing-only rankings.

Official platform review decisions remain independent; ARE does not guarantee approval or increased platform exposure. ToolBench already offers broad static MCP scoring, MCPMark execution benchmarks: ARE's intended differentiation is **business value gate + contract/recovery/authorization root cause + validated remediation impact**.

## Measurable metrics and baseline
| Metric | Baseline | Proposed pilot decision signal | Source |
| --- | --- | --- | --- |
| Preflight report validity | Not measured | Independent reproduction of most high-severity issues | Maintainer/source re-review |
| Creator-relevant findings | Not measured | Fraction of findings accepted/actioned | Verified maintainer response |
| Creator follow-up | Not measured | Fraction who retest after a change | Immutable run history |
| Real-agent task effect | Not measured | Matched-task improved completion/recovery, with costs | Host execution logs + independent end-state |
| Creator review cycles | Not measured | Compare first submission and resubmission history | Creator-provided platform review records |
| Public discovery value | Not measured | Opt-in views -> clicks -> qualified adoption | Future opt-in, privacy-respecting analytics |
| ARE cost | Not measured | Infrastructure/LLM/independent audit costs per valid finding | Real bills + report QA hours |

No target improvement is asserted as fact. Do not count initial registration as an adoption outcome.

## Existing credible illustrative evidence
- **Interior, Nov 14:** historical startup full schema ~53.5KB; revised compact capability payload ~1.2–1.5KB, local invocation 1,301 UTF-8 bytes, test suite \`test_parameter_platform_p012.py\` 20/20 PASS when run with project's \`.venv\`. This is source-backed design improvement; real cross-Agent task performance delta remains unmeasured.
- **Planner 5D:** independent Antigravity browser run ~23.5min/222 steps/102 browser actions, incomplete room furniture placement. The log does NOT show WebMCP tools/list or tools/call, thus cannot prove no structured placement APIs exist in Planner 5D. Must test Host exposure before asserting root cause.

## World2 sample design
Neon \`are_eval.benchmark_study_candidates\`, cohort \`ARE100-VALUE-20261115\`: 100 indexed active MCP services, 100 distinct *claimed* GitHub owners, 1,330 observed tools, four tool-count strata of 25. World2 provides registry records, tool hashes and manifests. The 100 claims have **not** passed independent repo-to-service matching, source review, operational tests or contact verification. No developer outreach has yet been sent. These are research candidates, not certified entries.

## Scope and guarded release
P0 public pilot:
- Public user-initiated URL/GitHub submission, bounded non-destructive MCP initialize/tools/list, or World2 catalog observation.
- Heuristic score 0–100 based on tool contract, descriptions, annotations, manifest footprint. A score of 100 can coexist with untested security/recovery and all 39 ARE maturity checks unknown.
- Store immutable Neon versions, preserve provenance, allow verified repository/domain-controller claim, opt-in public listing, re-evaluation and creator-supplied evidence receipts.
- Never execute production writes, exploit prompts, collect private OAuth credentials or auto-pass maturity checks.
- Do not auto-send reports to creators until independently verified, source-specific issues and owner channel are confirmed.

Next P0 acceptance:
1. Review at least 100 candidate matches; remove invalid repo/provider associations and repeat owners where appropriate.
2. Independently inspect source/version and verify each proposed severe issue. Unknown is not fail.
3. Run authorized representative read-only tasks and isolated fault injection only where permitted.
4. Deliver grounded one-to-one reports to creator-maintained channels and measure response/repair/retest at D+7 and D+21.
5. Compare cost per accepted finding against a conventional linter/manual check.
6. Decide expand / revise / stop based on observed creator benefit, not raw catalog size.

## Known remaining engineering needs
- Stronger per-principal quotas and anti-abuse control before broad public promotion.
- OAuth/private MCP support with delegated authorization and trusted test sandboxes.
- Independent check 39 evidence verification engine, standardized P0 value measurements and reviewer workflow.
- Confirming service URL↔GitHub identity; World2 registry linkage alone is not proof.
- Automated creator notification only after verified source and explicit anti-spam policy.
- Runtime performance leaderboard and causal A/B/C experiments are not yet built.

Decision and owner: Owner approval is implicit in the user's requested implementation; **P0 research pilot** only. P8 write-back awaits real users/measurements; no unmeasured success claims.
