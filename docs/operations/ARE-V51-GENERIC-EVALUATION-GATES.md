# ARE V5.1 cross-agent authorization, duration and completion gate

## Goal
Use the same protocol for any assigned project and any evaluation Agent. This is not a project-specific exception. Existing evidence and historical submissions remain untouched; new submissions use a stricter protocol.

## Human authorization workflow
1. The Agent discovers a real protected endpoint, advertised OAuth/API-key mode, or an actual auth denial. It calls `are_request_authorization` with a plain-language explanation and requested scopes. The request is stored under the **task ID** in `are_eval.private_task_authorization_requests`. The Agent cannot grant its own request.
2. The original human tester sees a pending request under **我的任务进度与提交回执** in the existing browser session; for owner-issued tasks, the Owner sees it under **项目测试进度**. They can approve or decline. Both paths protect task ownership, require explicit action and record an immutable decision timestamp. Credentials are **never** sent to or stored in ARE.
3. The Agent calls `are_get_authorization_status`. `PENDING` means await human decision. `GRANTED` means only that the user permits initiating the **provider's official OAuth/login process**, not that authentication succeeded; successful authenticated tool calls must still have real native MCP traces. `DECLINED` means leave protected tools blocked and submit a candid partial report.
4. A report with a discovered protected endpoint or any BLOCKED_AUTH tool and **no persisted human authorization request** fails preflight. An actual pending/declined request may enter private review as PARTIAL. The same rule covers predeclared OAUTH/API_KEY and observed 401 when initial plan mode was UNKNOWN.
5. `BLOCKED_AUTH` tool evidence must specify `blocking_scope`: `TOOL` requires an auth error for the **same native tool name**; `ENDPOINT` permits a representative gateway-wide auth rejection to explain protected access **without falsely implying individual tool calls happened**. Neither status counts as executed PASS/FAIL.

## Timing provenance
- `test_metadata.duration` is required for all new submissions.
- Measured: `{kind:"MEASURED",source:"AGENT_HOST_TIMER"|"USER_INTERFACE_TIMER"|"EXTERNAL_TIMER",active_minutes:int,evidence_ref:"duration-artifact-id"}`. `minutes_used` must equal `active_minutes`, and the referenced `duration` evidence artifact JSON contains `source`, `active_minutes`, `instrument` and ISO `recorded_at`. Host-provided timing is still **assessor-reported until independently verified**.
- Not measured: `{kind:"UNMEASURED",source:"UNKNOWN",active_minutes:null}` and `minutes_used:0`. No estimate can be passed off as measured time.
- Server `wall_clock_minutes` is separately computed from task creation, not equivalent to active work or billing time.

## Machine-computed completion vs private evidence acceptance
- `test_completion.status: PARTIAL|COMPLETE` is computed by the server and persisted in the canonical report, not accepted from an Agent's declaration. Incomplete tool coverage, unevaluated applicable scoreable criteria, ungranted auth, unauthenticated protected calls or unknown active time are distinct reasons for PARTIAL.
- `READY_FOR_REVIEW` is a **submission workflow stage**. A PARTIAL report may be valid and stored in Neon, but the Owner cannot label it `VERIFIED` as a full assessment. The human can request retesting via `NEEDS_RETEST`.
- The tester dashboard shows the computed completion status alongside Neon receipts. The Owner review panel also exposes it.

## Security and limits
- Authorization is task-scoped, one pending/decided request per task. Additional authorization scopes after a decision require a new explicitly authorized task; the Agent cannot silently expand a granted scope.
- The user's original Task Token remains active while the user decides; provider authentication is external, with no passwords, OAuth tokens or API keys submitted to ARE.
- For OAuth/STDIO, native raw captures supplied by an Agent are not automatically independently attested. Vendor-published fixture values are not third-party oracle truth.
- The new field contracts apply to new submissions only; existing reports are not silently rewritten. Legacy reports lacking `test_completion` cannot be promoted to a newly verified full evaluation without a new compliant review submission.
