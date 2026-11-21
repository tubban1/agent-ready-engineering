# ARE V5.1: single formal submission, browser-first authorization, quality replenishment

## Task lifecycle (general across projects and Agents)
- A Task Token is short-lived, scoped, and stored in Neon as a hash only. Ordinary expiry still applies.
- Losing an *unfinished* task's prompt: click **取回完整提示词** in the same tester session. No browser confirm dialog is used. A 1-minute server cooldown limits automatic rotation and invalidates the previous Token. Only outstanding unsubmitted tasks may rotate; no report or checkpoint is deleted.
- Any number of read-only preflights and checkpoints before submission. At most **one formal private assessment** per Task ID. The atomic Neon transaction locks the task, claims its once-only finalization record, creates the private evaluation, links its receipt and revokes the Task Token. Failed validation is not a final submission.
- The response returns submission_id and canonical_report before Token revocation. The original browser tester session shows submission and review history. Do **not** attempt are_get_submission with the revoked Token. Network failure after commit requires checking the browser session rather than re-submitting.
- To fix an incomplete report after an explicit human NEEDS_RETEST verdict, a new linked-by-repository task is issued for an immutable new assessment. The previous report is not overwritten; nothing is automatically published.
- Human review of a PARTIAL submission remains reviewable, but cannot be marked VERIFIED as complete; it can be returned for retesting.

## OAuth and API keys: no ARE approval UI
- Agent records discovered authentication with are_request_authorization(auth_scheme=OAUTH|API_KEY|UNKNOWN). ARE saves a task-scoped *challenge/handoff record*, not user consent.
- For OAuth, the Agent MUST actively use the host's native MCP OAuth connect/reconnect to open the provider's official login/consent page in the user's browser. **The user only decides on the provider page**, not on ARE. No ARE approval/rejection buttons or OAuth opt-in checkbox.
- If the host lacks browser/OAuth integration, report the environment limitation and show only a verified official link. ARE itself cannot operate another Agent host's browser; never request passwords, tokens or API keys via chat.
- API_KEY connections may only use already authorized credentials configured in the host; otherwise record BLOCKED_AUTH. The handoff never authorizes destructive actions, payments or third-party messages.
- Existing historical records are not rewritten. In new requests, GRANTED means only that a provider-auth handoff may start, not that any third-party consent took place.

## Continuous quality-gated supply
- When a tester clicks **领取下一任务** and the current qualified pool cannot produce a task, the service checks a durable 20-minute DB lease and scans a bounded batch of pending candidates. Requests are made **only to api.github.com**. Published HTTPS endpoint references are parsed as text from official GitHub README; the replenisher NEVER fetches an arbitrary link found there.
- Automatic scores use transparent observable source signals, including public repository activity, license, stars/forks, documented use cases and the already independently *observed* World2 MCP tool inventory. Auto scores >=75 qualify only if the source link is explicit, the repo is maintained and licensed, and observed tools >=3. The quality metadata is **provisional**; it does NOT certify deployed code identity or business truth.
- Failed/low-confidence candidates are retained as HOLD with reason, never promoted just to satisfy stock demand. Once the current corpus is screened, the system imports additional GitHub MCP repositories as **unverified candidates**, without inventing runtime tool counts; the independent tool observation and vetting gate still applies before they can be claimed.
- Removed the daily **6 total claims** limit; 3 unfinished active projects per tester and a platform hourly claim cap remain for resource governance. Completed tasks free active slots. Projects already submitted stay under review until a human requests retest; fully VERIFIED projects are not repeatedly assigned.
- Neither the initial 100 projects nor GitHub Search can guarantee infinite *qualified* projects. When the supply lacks independently confirmed tool inventories, discovery continues but **claiming must fail closed** until adequate evidence arrives. A separate scheduled screening agent may use World2's real observed tool index to enrich imports.
