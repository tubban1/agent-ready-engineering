# ARE Self Evaluate — Copy-paste prompt for MCP maintainers
> v1.1 | 2026-11-17 | English canonical

**Status:** Developer self-assessment; not an ARE independent audit, MCP certification, or security approval. You are responsible for granting a safe scope. See the [Chinese version](SELF_EVALUATE_MCP.zh.md).

For a machine-readable PRIVATE pilot self-assessment record (PROJECT_SELF mode, product or adopter track), see [ARE Evaluator Modes](../standards/ARE-EVALUATOR-MODES-v1.md). The offline CLI does not perform the Agent audit or grant an official grade.

## Copy this prompt into your real Agent host

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
> I own or am explicitly authorized to evaluate MCP <HTTPS_ENDPOINT> at source <REPOSITORY_URL>@<COMMIT_SHA>, deployment <DEPLOYMENT_VERSION_OR_UNKNOWN>, within <SANDBOX_SCOPE>. Representative Agent goal and independent success oracle: <USER_GOAL_AND_ORACLE>.
>
> Standard: ARE-A02@0.5. Preserve all 39 original check IDs and retrieve their canonical definitions on demand via are_list_checks, are_get_check and are_get_template (T07 and T10); do not paste all 39 descriptions into the Agent context.
> Access boundary: the public ARE MCP at https://are.world2.co/mcp provides knowledge and templates; it does NOT offer local are_assess_scenario, are_validate_deliverable or are_review_operation_risk. Machine-checked provisional assessments require the local ARE MCP started with --workspace and a complete version-pinned T07/T10 in that authorized workspace. If unavailable, manually report evidence states, never imply a machine-verified grade.
> Evidence: pin the target source SHA, observed deployment version, tool inventory and assessment date. Distinguish discovery, inspection, safe authorized tools/call, actual model-driven Agent tasks and independently verified business outcomes. Missing proof is UNKNOWN or NOT_VERIFIED, never an inferred PASS.
> N/A: use T10 operation-risk inventory and N/A{scope=operation_id; reason=concrete applicability explanation; evidence=relative/path.md; reviewer=human reviewer; reviewed_at=YYYY-MM-DD}. Required fields: scope, reason, evidence, reviewer, reviewed_at. Confirm tool coverage, source revision, reviewer and evidence. A bare reason, missing file, or unchecked readOnlyHint is not evidence.
> In T07, the Result column accepts only ✅ / ❌ / ➖. Record NOT_VERIFIED as ❌ and explain missing evidence in the final column; this blocks the check but is not a confirmed product defect. ➖ requires the full N/A{scope=...; reason=...; evidence=...; reviewer=...; reviewed_at=YYYY-MM-DD} format. ✅ requires evidence type inspected or documented and a valid evidence reference.
> Maturity: map each of 39 checks to PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED, with evidence and scope. Any machine-computed L0–L4 is PROVISIONAL and not certification; with unsupported version, incomplete risk profile or global evidence blocker, return MATURITY_NOT_ESTABLISHED rather than a grade. Historical v0.4 or unpinned L4 is not current validation; do not inherit its checks or authorization.
>
> 1. Inspect all pages of tools/list and applicable resources/prompts; record every tool's input/output schemas, errors, descriptions, annotations, authorization scopes and side effects. Separate metadata inspection coverage from executed-tool coverage.
> 2. In a separately approved isolated tenant, conduct safe parameterized tool-call tests and negative tests; never infer permission from readOnlyHint. Financial, messaging, destructive, external-impact and high-privilege calls require explicit scoped approval and synthetic objects, otherwise NOT_TESTED.
> 3. Inspect source, handler, authorization, idempotency, recovery and audit logs; cite repo@SHA:path:line. Do not equate a public repository SHA with deployment identity without evidence.
> 4. Let a real model-driven Agent solve a predefined multi-step business task, capture the trace and independently verify real outcome. If unavailable, mark NOT_VERIFIED.
> 5. Create version-pinned ARE-T07 and complete ARE-T10 JSON risk profile in your authorized workspace. If local --workspace ARE is connected, run are_review_operation_risk, are_validate_deliverable and are_assess_scenario; otherwise manually annotate and report MATURITY_NOT_ESTABLISHED.
> 6. Produce qualification.json, tool_matrix.json, source_review.md, agent_task_results.md, are_39_checks.json, developer_report.md and a redacted evidence_manifest.json, and identify the top 3 practical fixes.
>
> Label the report Developer Self-Evaluation / Not independently verified by ARE. Do not silently modify code, publish vulnerabilities, contact third parties, submit to Benchmark or deploy.
<!-- ARE_PROMPT_AUTOGEN_END -->

For a retest after changes use [Maintainer Retest](MAINTAINER_RETEST_MCP.md); for a public outside review use [Independent Evaluation](INDEPENDENT_MCP_EVALUATION.md).
