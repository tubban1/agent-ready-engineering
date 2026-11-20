# ARE Task Center — One Task, One Revocable Token, One Private Submission

**Implementation:** 20 November 2026. Native ARE MCP supports task-scoped read-only discovery and private evidence submissions. All independent third-party reviews remain unpublished until the owner explicitly approves the first public release.

## Owner: assign in 30 seconds

1. Open **https://are.world2.co/tasks/** (redirect to the existing protected Neon `/v1/tasks/board`).
2. Unlock with the existing private ARE **Owner Token**; do not give this token to colleagues. The browser stores it only in current page memory.
3. Select a GitHub repository in the existing World2/ARE100 catalog, set colleague ID (`colleague-01`), evaluator organization, title/instructions and duration (1, 7 or 14 days).
4. Click **创建任务并生成提示词**. A fresh, cryptographically random token beginning with `aret_` is displayed only once and included in a copyable full Agent prompt.
5. Send the copied prompt to exactly the intended colleague through an appropriate private channel. If it leaks or is no longer needed, use **撤销任务 Token**. You can create a replacement task at any time.
6. Review their results in the **existing** private review/outreach page. Review and optionally ask for corrections. Publishing a new independent third-party evaluation still requires your explicit approval; the task center cannot publish or email anything.

## Colleague: use any authorized ChatGPT, Claude or Codex Agent

Connect the **same existing ARE MCP**: `https://are.world2.co/mcp`.

The generated prompt already includes the project and its task-specific Token. Ask your Agent to:

1. `are_get_task({task_token})` — read only this task's project and instructions.
2. `are_get_criteria({task_token,offset:0})`, then `8`, `16`, `24` — retrieve the exact 32 version-pinned product criteria and their 55-pilot test protocols.
3. Pin the GitHub commit and service version. Gather actual source and native MCP observations. Only execute tools permitted by the user/project's own safety and authorization boundaries. Record real Agent tasks and independent oracles when possible; use `NOT_TESTED`, `BLOCKED_AUTH` or `UNKNOWN` honestly when evidence is unavailable.
4. `are_submit_assessment({task_token,evidence_package})` — the structured `ARE_INDEPENDENT` product report must include all 32 distinct finding IDs, true source SHA, assessor ID matching the assigned colleague, and `public_release_authorized:false`, `certification:false`, `maturity_level:null`. The private Neon backend validates everything and returns a receipt.
5. `are_get_submission({task_token,submission_id})` — verify the persistent receipt and current evidence stage. Same evidence + same task gives the same submission UUID; a revised evidence package creates a new append-only run (max 5 distinct submissions per task).

No colleague needs the owner's Neon credentials, GitHub access or ARE CLI, and a token for one task cannot list, read, or submit another task.

## Security boundaries and behavior

- Task Token = `aret_` + 32 random bytes encoded Base64URL. Only its SHA-256 is persisted in `are_eval.private_assessment_tasks.token_sha256`. The owner UI only receives the token on creation and cannot re-display it.
- Tokens expire in 1–14 days (default 7); owner can revoke instantly. Every agent read, criteria page, submission and receipt checks DB token hash + expiry + revocation.
- The submission transaction also checks repository, cohort, assignee ID, assessor organization, and source SHA (verified against GitHub) before committing any private report.
- The only tables added are `are_eval.private_assessment_tasks` and `are_eval.private_task_submissions`; earlier `private_evaluation_runs`, private review UI, public assessments and the published evidence cases remain intact.
- The Neon private API remains `/v1/tasks`, `/v1/tasks/candidates`, `/v1/tasks/create`, `/v1/tasks/revoke` for the owner and `/v1/task/read`, `/v1/task/criteria`, `/v1/task/submit`, `/v1/task/receipt` for task tokens. The latter four are invoked on behalf of an Agent by the public ARE MCP as fixed-path server-side calls. Only a token and a bounded JSON payload are forwarded, never the Owner Token.
- MCP tools never expose task creation, task revocation, owner inbox, mail sending, report approval or third-party publication.
- The task center is a **private internal workflow** and its server-rendered HTML contains no private data before Owner authentication.
- Quality states are **evidence coverage**, not a certification, pass rate or publish authorization. All 32 criteria are required as rows, but many may legitimately remain UNKNOWN. The owner reviews the attached primary evidence before making public claims.
- Existing `/v1/submit` reviewer-token CLI and `/v1/owner` remain supported for compatibility with already-assigned colleagues.

## QA gates

- `npm run typecheck --prefix mcp` and `npm run test --prefix mcp` validate MCP v2 modern and legacy 2025 transports, tool schemas and honest annotations.
- `node --test functions/are-intake/*.test.mjs` exercises owner-only creation/revoke, token hashing, per-project restrictions, criteria pagination, source verification, forced expiry/revoke and no publication.
- `node scripts/are_release_gate.mjs` must PASS (no public evaluation content may change).
- Synthetic production smoke scripts `node scripts/are_task_center_smoke.mjs create|verify|revoke` and `node scripts/are_task_mcp_smoke.mjs` require *owner-local* private credentials, do not print secrets and must not run on other users' machines.
- The approval boundary is still **first public release of any NEW independent third-party ARE review**; no approval gate for normal research, internal writing, DB submissions, PRs or tests.
