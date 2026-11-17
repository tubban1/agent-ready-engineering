# ARE Independent Third-Party MCP Evaluation — Public review prompt
> v1.1 | 2026-11-17 | English canonical

**Status:** Public community research, **not** ARE-issued certification or project-owner permission to write. See [Chinese](INDEPENDENT_MCP_EVALUATION.zh.md).

## Copy this prompt

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
> Independently inspect public MCP <PUBLIC_MCP_URL> within <PUBLIC_READONLY_SCOPE>. Optional public source: <GITHUB_REPO>. I have no owner authorization to access private accounts or perform writes.
>
> Standard: ARE-A02@0.5. Preserve all 39 original check IDs and retrieve their canonical definitions on demand via are_list_checks, are_get_check and are_get_template (T07 and T10); do not paste all 39 descriptions into the Agent context.
> Access boundary: the public ARE MCP at https://are.world2.co/mcp provides knowledge and templates; it does NOT offer local are_assess_scenario, are_validate_deliverable or are_review_operation_risk. Machine-checked provisional assessments require the local ARE MCP started with --workspace and a complete version-pinned T07/T10 in that authorized workspace. If unavailable, manually report evidence states, never imply a machine-verified grade.
> Evidence: pin the target source SHA, observed deployment version, tool inventory and assessment date. Distinguish discovery, inspection, safe authorized tools/call, actual model-driven Agent tasks and independently verified business outcomes. Missing proof is UNKNOWN or NOT_VERIFIED, never an inferred PASS.
> N/A: use T10 operation-risk inventory and N/A{scope=operation_id; reason=concrete applicability explanation; evidence=relative/path.md; reviewer=human reviewer; reviewed_at=YYYY-MM-DD}. Required fields: scope, reason, evidence, reviewer, reviewed_at. Confirm tool coverage, source revision, reviewer and evidence. A bare reason, missing file, or unchecked readOnlyHint is not evidence.
> Maturity: map each of 39 checks to PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED, with evidence and scope. Any machine-computed L0–L4 is PROVISIONAL and not certification; with unsupported version, incomplete risk profile or global evidence blocker, return MATURITY_NOT_ESTABLISHED rather than a grade. Historical v0.4 or unpinned L4 is not current validation; do not inherit its checks or authorization.
>
> 1. Respect published conditions, rate limits and consent. No credential bypass, arbitrary business writes, payments, messages, deletion, account/device control or traffic load tests.
> 2. Discover the real protocol and all paginated tools/list metadata. Inspect names, schemas, annotations, authorization requirements and suspected side-effect conflicts. A declared readOnlyHint is NOT execution permission.
> 3. Separate static coverage from tools actually called. Only perform genuinely harmless public calls where expressly permitted and within a bounded budget; otherwise mark NOT_TESTED. If source exists, pin SHA and mark deployment binding BOUND/UNBOUND.
> 4. If a real model-based Agent can lawfully run a safe task, independently verify outcome against a public oracle. An SDK script is a protocol probe, not an Agent task.
> 5. Map a named scenario against the 39 checks and T10 applicability. Without owner source, identity/authorization evidence or local --workspace audit capability, return NOT_VERIFIED and MATURITY_NOT_ESTABLISHED, not a speculative L0–L4.
> 6. Publish only safe, reproducible observed facts, clear unknowns and the top 3 optional improvement suggestions. Share sensitive security findings privately, not in public issue comments.
>
> Label Community independent review / Not an ARE-issued certification. Never contact, register or submit on behalf of an external Creator without approval.
<!-- ARE_PROMPT_AUTOGEN_END -->

Use [Self Evaluate](SELF_EVALUATE_MCP.md) for owner-controlled testing and [Maintainer Retest](MAINTAINER_RETEST_MCP.md) after a fix.
