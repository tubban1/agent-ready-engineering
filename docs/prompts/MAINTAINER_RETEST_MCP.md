# ARE Maintainer Retest — Fix verification prompt
> v1.1 | 2026-11-17 | English canonical

**Status:** Operator-managed pre/post regression testing, **not** ARE independent sign-off. See [Chinese](MAINTAINER_RETEST_MCP.zh.md).

## Copy this prompt

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
> I am authorized to retest MCP <SERVICE>. Original report <REPORT_URL_OR_FILE>, baseline revision <BASELINE_SHA>, candidate revision <FIXED_SHA>, explicit sandbox/actions <SANDBOX_SCOPE>.
>
> Standard: ARE-A02@0.5. Preserve all 39 original check IDs and retrieve their canonical definitions on demand via are_list_checks, are_get_check and are_get_template (T07 and T10); do not paste all 39 descriptions into the Agent context.
> Access boundary: the public ARE MCP at https://are.world2.co/mcp provides knowledge and templates; it does NOT offer local are_assess_scenario, are_validate_deliverable or are_review_operation_risk. Machine-checked provisional assessments require the local ARE MCP started with --workspace and a complete version-pinned T07/T10 in that authorized workspace. If unavailable, manually report evidence states, never imply a machine-verified grade.
> Evidence: pin the target source SHA, observed deployment version, tool inventory and assessment date. Distinguish discovery, inspection, safe authorized tools/call, actual model-driven Agent tasks and independently verified business outcomes. Missing proof is UNKNOWN or NOT_VERIFIED, never an inferred PASS.
> N/A: use T10 operation-risk inventory and N/A{scope=operation_id; reason=concrete applicability explanation; evidence=relative/path.md; reviewer=human reviewer; reviewed_at=YYYY-MM-DD}. Required fields: scope, reason, evidence, reviewer, reviewed_at. Confirm tool coverage, source revision, reviewer and evidence. A bare reason, missing file, or unchecked readOnlyHint is not evidence.
> Maturity: map each of 39 checks to PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED, with evidence and scope. Any machine-computed L0–L4 is PROVISIONAL and not certification; with unsupported version, incomplete risk profile or global evidence blocker, return MATURITY_NOT_ESTABLISHED rather than a grade. Historical v0.4 or unpinned L4 is not current validation; do not inherit its checks or authorization.
>
> 1. Preserve the previous assessment unchanged and distinguish a reproducible defect from an unverified observation or non-binding design recommendation.
> 2. Reproduce each finding with the original inputs and independent oracle, then replay equivalent tests on the candidate without weakening assertions. Record actual tools/call envelopes, isError, source/deployment binding and authorization scope.
> 3. Re-run relevant Agent tasks and verify external results independently. High-risk writes, negative auth tests and fault injection require specifically authorized synthetic data in an isolated tenant.
> 4. Create a new version-pinned T07/T10 for the changed scenario; update only checks with new evidence. Old v0.4 L4 or prior PASS cannot become a new v0.5 verified level merely by copying it.
> 5. Where local ARE --workspace is present, run are_review_operation_risk, are_validate_deliverable and are_assess_scenario. If only the public knowledge endpoint is present, use it for definitions/templates, never claim local tools were used.
> 6. Deliver a before/after report, reproducibility, changed check IDs, tool and task coverage, a redacted evidence manifest and the top 3 remaining fixes.
>
> Each remediation is VERIFIED / NOT_REPRODUCED / STILL_FAILS / NOT_TESTED. The computed maturity remains PROVISIONAL; official revalidation requires a separate authorized review. Do not deploy or publish without separate permission.
<!-- ARE_PROMPT_AUTOGEN_END -->

[Original methodology and distribution SOP](../standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md).
