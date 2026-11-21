# ARE candidate qualification and tester receipts — 2026-11-21

## Tester-facing receipt
- `/v3/tester/me` is bound to the original Secure HttpOnly browser session cookie, not a provided task ID.
- Receipt rows come from task-scoped `private_task_submissions` joined to `private_evaluation_runs` and the latest `private_review_verdicts`.
- A recorded submission is **database received**, not certification, owner approval, publication, or automatically successful test execution.
- The UI displays the submission UUID, timestamp, evidence readiness, criterion status counts, tool coverage counts, review decision and owner rationale. It does not return raw trace contents, credentials, or another tester's records.
- `are_validate_assessment` is strictly side-effect-free: the system does **not** persist a `preflight_passed` flag. An agent should submit or record an explicit checkpoint. Do not infer submission from preflight.
- Existing Task Tokens remain valid, including those issued before qualification enforcement.

## Candidate qualification
Use the owner portal under **项目过滤**:
1. Save a candidate as **HOLD** with the actual HTTPS MCP endpoint and screening information.
2. Click **核验仓库与维护者联系渠道**: the backend fetches the exact `owner/repo` from GitHub's official fixed API and the upstream README. The source-match flag is true only if a public, non-archived GitHub repo explicitly references the exact screened HTTPS endpoint. The result, upstream README URL/SHA, timestamp and limitations are stored in the private candidate row. This is a **published link**, not proof of the binary deployed behind the endpoint.
3. The maintainer-contact flag is independently true only for explicitly published README contact email; a GitHub Issues link alone is not evidence of a confirmed maintainer contact route, and no email is sent automatically. Unverified contact does not block technical evaluation.
4. Save a private, auditable human quality score with two or more source URLs and rationale. The server computes the 100-point total from:
   - Business value 0–30
   - Adoption/influence 0–20
   - Engineering maturity 0–20
   - Independent evaluability 0–20
   - Outreach potential 0–10
5. Only after the source flag is verified **and** quality score >=75 can the owner set `ELIGIBLE` and a tester/owner claim a **new** task. The database predicates enforce this even if a client attempts to bypass the frontend.
6. The previous `priority` field is only a sort order, **not** a quality score. Existing issued task records and submission history are preserved. Incomplete candidates stay out of the qualified public pool.

## Limits
- Source-to-live-deployment identity requires an independent build/provenance chain. README links and GitHub metadata do **not** meet that standard.
- Business value and engineering ratings are a recorded owner judgment with cited URLs, not an automated third-party certification.
- GitHub API failures fail closed without replacing previously saved evidence or marking an unverified candidate verified.
- No auto outreach, no auto publish, no full backward compatibility layer.

## Recover a lost already-claimed Agent prompt
- A Task Token is generated once and only its SHA-256 is stored; the original cannot be redisplayed after a refresh. A task remains owned by the browser session that claimed it.
- The tester dashboard shows **重新生成并复制完整提示词** for an active, unverified, session-owned task when there is no prompt visible in memory. Confirming this action rotates only that task's Token; any Agent still using the prior token must receive the new complete prompt.
- The rotation uses the same session cookie, requires an explicit user confirmation string and same-origin POST, checks the original task belongs to the session and has not expired or been revoked, locks the task row, and enforces a one-minute rotation cooldown.
- The existing task ID, expiry, progress checkpoints, captured evidence and previous submissions are preserved. Neither the developer nor staff should rotate a user's live Token for them without their explicit action.
- The replacement secret appears only in the current page after confirmed rotation; **copy it immediately**. The browser never stores it persistently, and it is not logged, published, or accessible through read-only task APIs.
