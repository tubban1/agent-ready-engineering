# Website entry: General MCP evaluation prompt (English-first)

**Target surface:** `https://are.world2.co/` — the canonical ARE service landing page, registered in World2.
**Target MCP:** `https://are.world2.co/mcp` — **online; World2-managed canonical service URL**.
**Canonical MCP:** `https://are.world2.co/mcp`.

This is the **canonical English prompt** now available as “Copy prompt” on the new World2-managed website. It is not the same as the current ARE Benchmark tool's preliminary score action. A Chinese translation can be a secondary localized choice.

## Website short instruction

> Connect an Agent to ARE MCP, paste the prompt, fill in your MCP endpoint and test scope. Results must report evidence and coverage; neither self-evaluation nor public testing yields an ARE-issued certification.

## Copyable general evaluation prompt

<!-- ARE_PROMPT_AUTOGEN_START: run node scripts/sync-are-evaluation-prompts.mjs -->
```text
Use the Agent-Ready Engineering (ARE) methodology with an authorized Agent. Target MCP: <TARGET_MCP_HTTPS_URL>. Source/version: <GITHUB_REPO_AND_COMMIT_OR_UNKNOWN>. My role and scope: <PUBLIC_READONLY_OR_OWNER_SANDBOX>. Representative task and independent oracle: <TASK_AND_ORACLE>.

Standard: ARE-A02@0.5. Preserve all 39 original check IDs and retrieve their canonical definitions on demand via are_list_checks, are_get_check and are_get_template (T07 and T10); do not paste all 39 descriptions into the Agent context.
Access boundary: the public ARE MCP at https://are.world2.co/mcp provides knowledge and templates; it does NOT offer local are_assess_scenario, are_validate_deliverable or are_review_operation_risk. Machine-checked provisional assessments require the local ARE MCP started with --workspace and a complete version-pinned T07/T10 in that authorized workspace. If unavailable, manually report evidence states, never imply a machine-verified grade.
Evidence: pin the target source SHA, observed deployment version, tool inventory and assessment date. Distinguish discovery, inspection, safe authorized tools/call, actual model-driven Agent tasks and independently verified business outcomes. Missing proof is UNKNOWN or NOT_VERIFIED, never an inferred PASS.
N/A: use T10 operation-risk inventory and N/A{scope=operation_id; reason=concrete applicability explanation; evidence=relative/path.md; reviewer=human reviewer; reviewed_at=YYYY-MM-DD}. Required fields: scope, reason, evidence, reviewer, reviewed_at. Confirm tool coverage, source revision, reviewer and evidence. A bare reason, missing file, or unchecked readOnlyHint is not evidence.
In T07, the Result column accepts only ✅ / ❌ / ➖. Record NOT_VERIFIED as ❌ and explain missing evidence in the final column; this blocks the check but is not a confirmed product defect. ➖ requires the full N/A{scope=...; reason=...; evidence=...; reviewer=...; reviewed_at=YYYY-MM-DD} format. ✅ requires evidence type inspected or documented and a valid evidence reference.
Maturity: map each of 39 checks to PASS / FAIL / NOT_APPLICABLE / NOT_VERIFIED, with evidence and scope. Any machine-computed L0–L4 is PROVISIONAL and not certification; with unsupported version, incomplete risk profile or global evidence blocker, return MATURITY_NOT_ESTABLISHED rather than a grade. Historical v0.4 or unpinned L4 is not current validation; do not inherit its checks or authorization.

1. Identify whether this is public anonymous discovery or an owner-authorized sandbox. The public ARE MCP provides methodology only, not access to the target's source, OAuth credentials, or local files. Without owner authorization, continue only in the permitted public read-only route; stop before any action that requires owner authorization or unavailable credentials.
2. Discover and paginate the target's real tools/list and resources/prompts, and examine every tool schema, output, annotations, authentication, limitations and potential external effects. Treat annotations as untrusted.
3. Run actual tools/call only where separately lawful and explicitly authorized with safe inputs and strict limits. Do not write, pay, message, delete or stress-test production. An OAuth service or stdio target needs an authorized local/owner execution path, not an invented public result.
4. If source and sandbox are authorized, inspect handler behavior and source-to-deployment binding. Have a real Agent attempt a representative task and validate the outcome using an independent oracle; an SDK call or model claim alone does not qualify.
5. Fill T07 and T10 for a named scenario. Report all 39 check states with evidence, missing access, applicability and runtime coverage; use the strict standard and N/A fields above. When --workspace is unavailable, do NOT claim are_assess_scenario was called.
6. Produce the top 3 evidence-backed fixes, verified facts, suspected conflicts, UNKNOWNs, safe reproduction steps and comparison baseline. Do not automatically publish findings, create issues, contact maintainers or modify production.

End with what was actually tested, the tool-call denominator, true Agent-task outcome and limitations. Do not claim official certification or a verified current maturity level.
```
<!-- ARE_PROMPT_AUTOGEN_END -->

**Canonical-only policy:** use `https://are.world2.co/mcp`; the former host is not a supported MCP origin.

**Separate website paths:** `/` = human-readable entry and prompt, `/mcp` = Agent interface, `/benchmark/` = low-cost preflight, `/evaluations/` = evidence-indexed public case list. Actual routing must be implemented and verified, not assumed from this Markdown file.
