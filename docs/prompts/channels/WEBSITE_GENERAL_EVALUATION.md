# Website entry: General MCP evaluation prompt (English-first)

**Target surface:** `https://are.world2.co/` — the desired future ARE service landing page, managed by World2.
**Target MCP:** `https://are.world2.co/mcp` — **planned and not yet live as of 2026-11-16**.
**Current working ARE MCP for interim use:** `https://are.fde.fan/mcp`.

This is the **canonical English prompt** to make available as “Copy evaluation prompt” on the new website **only after endpoint cutover passes**. It is not the same as the current ARE Benchmark tool's preliminary score action. A Chinese translation can be a secondary localized choice.

## Website short instruction

> Connect an Agent to ARE MCP, paste the prompt, fill in your MCP endpoint and test scope. Results must report evidence and coverage; neither self-evaluation nor public testing yields an ARE-issued certification.

## Copyable general evaluation prompt

```text
Use the Agent-Ready Engineering (ARE) methodology through the connected ARE MCP:
https://are.world2.co/mcp

Evaluate this MCP service: <TARGET_MCP_HTTPS_URL>
Public source, if verified: <GITHUB_REPO_AND_COMMIT_OR_UNKNOWN>
My role and authorized scope: <PUBLIC_READONLY | OWNER_SANDBOX_WITH_EXPLICIT_PERMISSION>
Representative user task and independent success condition: <TASK_AND_ORACLE>

Choose the applicable depth:
A) PUBLIC READ-ONLY — no credentials; metadata plus genuinely safe public tool calls.
B) OWNER-AUTHORIZED — access to owner-approved sandbox code, credentials and synthetic data; isolate state-changing calls.
If neither route is lawful, stop and state BLOCKED.

1. Verify the target's actual MCP protocol version(s) and inspect its complete tool inventory and applicable resources/prompts. Keep official protocol MUST compliance separate from ARE engineering guidance.
2. Inspect ALL discovered tool contracts, including input schemas, optional output schemas, descriptions, side-effect annotations, auth scopes and errors. Report metadata coverage separately from actual invocation coverage. Do not assume readOnlyHint alone establishes safety.
3. Run the safe, authorized success and validation paths. Never write, pay, send messages, delete, control devices or stress-test production merely because a tool is exposed.
4. When source access is authorized, pin a source SHA and distinguish source evidence from the deployed version; never invent a source-to-runtime binding.
5. Have a real Agent attempt at least one predefined user task (not just an SDK test call) and verify outcomes with an independent public/owner-approved oracle. If unavailable, mark NOT_VERIFIED.
6. Report all 39 ARE scenario checks as PASS / FAIL / NOT_APPLICABLE (with reason) / NOT_VERIFIED. Assign an L0–L4 level only if the strict evidence gates genuinely pass; otherwise MATURITY_NOT_ESTABLISHED.
7. Produce a concise report with tested URL/version/time, verified positives, reproducible problems, practical fixes, gaps, safe evidence links and retest instructions. Do not call the result official MCP certification or ARE independent approval.
8. Do not send unsolicited email, create GitHub Issues, modify code or publish another project's vulnerability; those require separate evidence/disclosure checks and authorization.

Start with the permitted test scope, exact tools seen and the intended task oracle. At the end say what was actually performed and what remains unverified.
```

**Legacy website note while migration is pending:** substitute `https://are.fde.fan/mcp` for the first ARE MCP URL until World2's new host has passed the acceptance plan, and label the target host “legacy/current” rather than “new canonical.”

**Separate website paths:** `/` = human-readable entry and prompt, `/mcp` = Agent interface, `/benchmark/` = low-cost preflight, `/evaluations/` = evidence-indexed public case list. Actual routing must be implemented and verified, not assumed from this Markdown file.
