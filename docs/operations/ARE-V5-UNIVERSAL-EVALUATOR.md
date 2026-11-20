# ARE V5 — universal agent evaluation and evidence integrity

Public task workbench: https://are.world2.co/tasks/
ARE MCP: https://are.world2.co/mcp

This version addresses the Etuki second independent evaluation: the report was structurally complete but some PASS entries tested the wrong criterion and several trace objects were rewritten summaries, not original MCP results.

## Agent-neutral procedure

1. A human tester draws a project and copies its unique scoped Task Token and full prompt. No Owner Token is shared. Up to three different unfinished projects per browser.
2. The Agent connects to ARE MCP and calls are_get_task(task_token), are_get_evidence_contract(task_token), then are_get_criteria(task_token,offset) for offsets 0, 8, 16 and 24. The contract returns all 32 applicable rules and machine-readable V5 artifact grammar; no Git clone or Schema guessing should be necessary.
3. Fix the target Git commit, screened endpoint, tool discovery, transport, authentication and observed versions. Record the complete original tools/list, not a manually curated subset. Distinguish README endpoint association from independent verification of live deployed code.
4. For screened public no-auth HTTPS, use are_capture_readonly with method tools/list, or tools/call and explicitly authorized safe-read-only tool name and arguments. ARE obtains the actual MCP JSON-RPC response, persists a private task-scoped capture and returns a ready-to-attach artifact with capture_id and SHA-256. Calls lacking explicit safe annotations or requiring credentials are blocked. Up to 80 server-origin captures per task, 8/minute.
5. For OAuth, STDIO and protected tools, test in the Agent host with the human completing official authorization. Do not send any OAuth credential to ARE. Preserve exact original requests/responses via the host capture system or scripts/are_mcp_capture.py. These frames are ASSESSOR_REPORTED, not server-origin verified; the Owner must inspect them. A failed/unavailable permission flow is BLOCKED_AUTH rather than an invented PASS.
6. For each discovered tool, record PASS/FAIL/BLOCKED/NOT_TESTED and raw trace. PASS requires an independently sourced expected value, an actual_pointer extracting the actual field from the cited raw response, and a reproducible method, exact source, expected, actual and a computed comparison. Internal arithmetic consistency is not proof of a vendor inventory, external price, or behavior.
7. For each of the 32 criteria, evaluate applies_when using typed test_metadata.applicability_facts with actual evidence references. Unknown applicability becomes UNKNOWN/NOT_TESTED, never N/A. PASS/FAIL must provide observation.metric matching the official pass_if.metric, a value that satisfies (PASS) or violates (FAIL) the published pass comparator, and unique raw trace sample references meeting minimum_samples. Do not use a different criterion to justify a PASS.
8. At least one real Agent goal must link to the original tool call steps, with independent Oracle validation. For blocked operations, record real blocker evidence and limits. Do not fake a multi-step task.
9. Source binding: a GitHub SHA, README link or STDIO proxy to the same server does not prove running source identity. Set source_binding.verified=false and include the actual limitation. V5 intentionally rejects untrusted Agent self-certification of deployed binary provenance; the Owner can separately review vendor attestations.
10. Call are_validate_assessment until valid=true without writes. Correct the actual test or downgrade unsupported assertions; never edit the raw trace to satisfy a hoped-for result. Submit once through are_submit_assessment, then read persisted canonical_report and canonical_metrics with are_get_submission. READY_FOR_REVIEW is private, NOT independently certified, authorized for outreach or public.
11. Only Owner role examines raw evidence, Oracle quality and applicability and can approve review/outreach drafts. No public third-party report publishing tool.

## Optional local raw capture with standard Python

Read tool discovery:
    python3 scripts/are_mcp_capture.py --endpoint https://SCREENED-PROVIDER.EXAMPLE/mcp --out ./private-evidence/discovery.json

Explicitly approved safe read-only tool:
    python3 scripts/are_mcp_capture.py --endpoint https://SCREENED-PROVIDER.EXAMPLE/mcp --method tools/call --tool read_inventory --arguments-json '{"limit":2}' --user-approved --out ./private-evidence/read-inventory.json

STDIO provider:
    python3 scripts/are_mcp_capture.py --stdio-command-json '["node","index.mjs"]' --out ./private-evidence/stdio-tools-list.json

The helper has no third-party Python dependencies; writes owner-only 0600 evidence files; preserves actual JSON-RPC request, response and wire text; refuses overwriting files and recognized secrets; does not send an ARE Task Token to the target and never runs through a shell. For an OAuth target it accepts ONLY a previously consented local ARE_TARGET_MCP_ACCESS_TOKEN environment variable; the helper does not initiate OAuth and never persists the token. Agent hosts with built-in OAuth may instead capture native frames through their own authorized client. All local records remain unverified-origin until reviewed.

## Scope, honesty and safety

V5 uses evidence_protocol=are.evidence.v5 and report.schema=are.assessment.result.v2. Older V4 records are preserved historically, but their verdicts are not silently re-certified. Raw MCP content plus SHA-256 proves integrity of that content, not truth of the provider response. ARE server-origin receipts attest the network response it received at that moment, not model correctness or remote build identity. A third-party server can mislabel a mutating action read-only, so capture is limited to screened providers, no credentials, explicit safe tool annotations, approved calls, DNS public-IP checks, strict quotas, no redirects and bounded response size. Human review is mandatory and distinct from submission and eventual publication.

This is intended to provide consistent machine-readable assessment semantics for ChatGPT, Claude, Antigravity, Codex, Gemini or any agent supporting MCP; non-MCP clients can call the same Task API through a secure authorized wrapper with the same scoped Token. Unsupported transport, lack of OAuth approval, missing Oracle or missing source proof must remain explicit limitations, not false negative or false positive certifications.
