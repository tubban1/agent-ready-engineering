# ARE V3 — One project, one Task Token, one complete Agent prompt

**Owner URL:** https://are.world2.co/tasks/ (Owner Token required to create test tasks).

There is **one page** and exactly five independent workflow stages:
1. **Filter:** review an existing open-source World2/ARE100 candidate, verify its executable MCP or isolated local runner, license/scope/authorization, tool count, OAuth and expected risk. Only ELIGIBLE and not already claimed projects can receive a Task Token.
2. **Generate Task Token:** Owner chooses that project and the assessor, sets 90/150/240 minute testing budget, OAuth preference, token expiry (1–14 days) and clicks once. The server atomically claims one eligible project, generates one cryptographically random `aret_` Task Token, stores **SHA-256 only**, and displays the **entire Agent prompt** containing the project, task ID, Token, time plan, safety restrictions and exact ARE MCP commands. Copy once and privately send the whole prompt to the designated tester. **There is no invitation Token, no separate self-draw action and no extra assignment step.**
3. **Execute:** Tester pastes the prompt into their own ChatGPT / Claude / Codex Agent, which connects to `https://are.world2.co/mcp`. All five scoped tools are available: `are_get_task`, `are_get_criteria` (32 items), `are_checkpoint` (resumable tool inventory), `are_submit_assessment` (private Neon report), `are_get_submission` (receipt). Execute every safe authorized tool where feasible; separate PASS/FAIL/BLOCKED_AUTH/BLOCKED_DESIGN/BLOCKED_ENVIRONMENT/NOT_TESTED/NOT_APPLICABLE. A successful HTTP response alone is NOT an independent business Oracle. Every blocker requires trace/reason, and NOT_TESTED requires a reason. Time plan = 60–240 minutes according to tools, OAuth and risk. For any failed operation, classify the evidence without assuming the cause (authorization, environment, tool design/contract, or independently verified incorrect result). Capture reproduction steps, inputs, outputs, error, runtime versions, before/after state and trace links. Retry no more than twice if safe, or stop that operation after ten minutes; preserve unresolved hypotheses as UNKNOWN and continue other tools. Allow official third-party OAuth only with human consent; never collect credentials or execute unsafe writes without permission.
4. **Verify:** Staff checks full 32 criteria, true source Git SHA, unique tool inventory, real traces/oracles and impediments, then marks NEEDS_RETEST, VERIFIED or REJECTED with explanation. **VERIFIED atomically consumes (revokes) this task Token** so the project can no longer submit additional evidence. NEEDS_RETEST leaves the same token active for revisions within its expiry; owner may revoke and reissue if necessary.
5. **Publish staging:** VERIFIED reports may become an internal draft; only Owner's explicit confirmation permits manual public release. This system contains **no endpoint to publicly release independent third-party evaluations or send emails**. Public release remains a separate, approved action.

## Token security

An Owner Token is only needed to administer the unified task page. The assessor receives only one Task Token embedded in the entire copied prompt. It is project-, assessor-, and organization-scoped, expiring and revocable; only its SHA-256 is saved. The same Task Token is used across multiple MCP calls and evidence checkpoints until verification consumes it, it expires or is explicitly revoked. It is **not an OAuth credential**; third-party OAuth is separate and handled through the provider's real consent screen if the chosen service requires it. If a Task Token leaks, revoke that assignment; already-saved evidence remains private and a new Token may be generated if authorized.

## No old invitation workflow

The old `arei_` invitation model, tester draw API, associated UI and empty `private_draw_invitations` table are removed; V2 invite-linked task column is retired. Historical research reports and one legacy task record remain stored for audit only (no new V1/V2 API accepts it). This is not a backward-compatible interface.

## Acceptance criteria

- Owner only issues one scoped token per eligible unclaimed project, with atomic claim under concurrent requests. A second issuance returns a conflict.
- The single copied prompt contains project, unique token, ARE MCP endpoint, tool-level coverage obligations, OAuth human-consent requirements, time budget, blocker stop rules, private submission and receipt.
- Real MCP calls succeed until the task is VERIFIED, revoked or expired, then deny access. Token never accesses Owner API or another project's evaluation.
- Data recorded in private Neon, owner verification queue, publication draft approved manually only; no third-party reviews or project owner emails are automatically published/sent.
- Node API, MCP protocol, evaluator tests and public release gate pass; production E2E includes issue, checkpoint, submit, receipt, verify/consume and revoked rejection; QA records cleaned safely.
- Merge to main, Vercel production READY and temporary worktree/branch cleanup, while preserving unrelated open PR worktrees and user research files.
