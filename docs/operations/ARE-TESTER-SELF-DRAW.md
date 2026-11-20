# ARE Self-Service Tester Pool (pilot)

**Entry**: https://are.world2.co/tasks/ — tester-first, Owner login optional at the top of the same page.

## Roles and one-click flow

- **Tester**: visit public pool, enter a nickname and organization to create a 14-day **browser session**, see eligible and claimed projects and the number still awaiting screening. No Owner Token or manual invitation. Choose a repository or click **Draw next**, select max test budget and third-party OAuth willingness. The server atomically generates **one random Task Token for one project**, and the page shows its full prompt, with screened endpoint, 32-criterion ARE workflow, OAuth stop rules, content-addressed evidence and validate-before-submit. Copy/paste the whole prompt to the tester's own Agent. Different projects may run concurrently, with at most **3 unfinished tasks per session** (submitted tasks no longer count as unfinished), at most 6 claims in 24h per browser session.
- **Next work**: after submitting one report, refresh "My tasks" and draw the next eligible project, while the Owner reviews the private report. No need to wait for public publication. Each Task Token remains scoped to one project and cannot call Owner APIs; it is shown only once. The browser session lists task status and progress but never recovers its lost Task Tokens.
- **Owner**: same page > Administrator. Existing secret Owner Token grants filtering, progress/audit, independent evidence review, publication draft and manual release approval. Owner may also emergency-issue a Token if necessary. Owner identity secret never appears in tester data.
- **Project states**: 100 original ARE100 candidates; only **ELIGIBLE** projects with a screened, runnable HTTPS MCP or verified isolated local runner can be claimed. Existing claims, verified completed cases and HOLD / UNSCREENED candidates are not falsely labeled available. Expired/revoked-but-not-reviewed claims can be reclaimed, preserving historical evidence and old token expiry.
- **Neon**: each self-serve browser session is a private row with a SHA-256 of the session cookie, unique random tester id, name and organization. The opaque `ares_...` session credential is Secure + HttpOnly + SameSite=Lax; no session token or owner token in public response. Publicly drawn Task Tokens expire after 48 hours (Owner may reissue as needed), limiting abandoned task lockouts. A Task Token `aret_...` remains cryptographically random and stored hashed only. No existing independent assessments or public reports are changed by this rollout.

## Abuse guard and scope

This is a **controlled public-pilot session**, not strong authenticated tester identity. Nicknames are not verified. Until real account login/OAuth is connected, anonymous visitors can clear cookies and create new identities. To contain exposure:

- New browser sessions: at most 60 globally per rolling 24h.
- Public claims: at most 12 globally per rolling hour; 6 per browser session in a rolling 24h.
- Simultaneously unfinished assessments: 3 per browser session.
- Strictly one active project lease for a given repository via `FOR UPDATE OF p SKIP LOCKED`; task snapshots include the session id for private owner review and quota.
- Production must not contain sensitive source data, credentials, third-party login secrets or publicly released evaluations. Tester session only sees safe repo metadata; authorization to invoke target MCP writes remains explicit, independent and interactive. A public browser session does not itself convey user identity verified by OAuth.
- For a wider open call and stronger anti-abuse, the next security hardening is real tester sign-in (e.g. supported OAuth/OIDC), rate limits backed by trusted gateway identity / challenge, and per-user quota reconciliation.

## Test and release gates

- Unauthenticated public pool and page work, but Owner review and publication still return 401.
- Session cookie is HttpOnly + Secure + SameSite; claims without session cookie 401.
- Two concurrent claims for same project: **at most one wins**; different projects can run simultaneously.
- A successful claim generates a one-time Token and generic Agent prompt; tester's own task list contains status without revealing Token again.
- Server continues to enforce 32 ARE criteria, read-only evidence preflight, private Neon submit and canonical report, and Owner-only verification then manual publication.
- Old Antigravity Etuki run and token unaffected. No destructive schema migration.
- Run real read-only screened MCP discovery to expand the initial pool only when evidence supports it. Current pre-screening evidence for `gribstream/gribstream-mcp`: GitHub MIT, official README HTTPS MCP, live `tools/list` 12. For `sugra-systems/sugra-api-mcp`: GitHub MIT, README HTTPS, live SSE `tools/list` 11; individual tools may require additional auth.
- Production self-draw E2E uses explicitly synthetic QA tester sessions and tasks; records removed by exact QA identifiers and never treated as third-party evaluation evidence.
