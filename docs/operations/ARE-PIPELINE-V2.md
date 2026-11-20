# ARE V2 — Unified Task Drawing and Independent Assessment Workflow

**Public-facing entry:** https://are.world2.co/tasks/ (redirects to the private Neon Function's `/v2/board`). One URL; role-specific views. V1 assignment, owner page, legacy reviewer CLI and old V1 endpoints are retired. Existing historical private evidence rows and public reports are **preserved**, not migrated or deleted.

## 1. Project filtering (Owner and screening Agents)

Project source: versioned World2/ARE100 open-source candidate list (`are_eval.benchmark_study_candidates`). This is a *candidate list*, not proof that the project is evaluable. Screening checks repository/license/source, runtime or isolated runnable entry, authorization model, safety and likely time budget. Owner chooses:
- `ELIGIBLE` only when a real HTTPS MCP endpoint exists, or a verified isolated local runner is explicitly documented with `[local-runner-verified]`;
- `HOLD` for incomplete source-to-service links, unavailable sandbox, unsupported OAuth, uncertain permission, or missing runnable MCP;
- `EXCLUDED` for duplicate, missing source, unacceptable safety or out-of-scope service.

Record tool count, auth type (NONE/OAUTH/API_KEY/UNKNOWN), risk, priority and screening reason. None of these metadata fields is an ARE score. The original three-pilot cohort starts with two eligible public MCP services and the unhosted Norway project on HOLD.

## 2. Task drawing (Tester with an invitation)

Owner issues a short-lived tester invitation `arei_...` (1–3 task draws, 1–14 days, revocable). The tester opens the **same** `/tasks/` URL and selects available time (90/150/240 minutes) and whether interactive OAuth is possible.

An atomic database operation checks the invitation quota/expiry/revocation, locks a suitable unclaimed `ELIGIBLE` project, creates one private `aret_...` Task Token (SHA-256 only stored), marks that project as claimed, and returns a complete Agent prompt with project, token, 32 checks, testing and stop rules, plus private Neon submission instructions. The Task Token is displayed once and not echoed later. Owner can revoke an invitation or task separately.

No public project pool listing, owner data, or previously submitted private assessments is exposed to a tester.

## 3. End-to-end Agent testing

Every tester uses their **own** ChatGPT, Claude, Codex or other MCP-capable Agent, connecting to `https://are.world2.co/mcp`. Available tools are:

- `are_get_task`: assigned repository, test time/risk plan, source/evidence skeleton and applicable constraints.
- `are_get_criteria`: all 32 product criteria in pages of 8, with conditions, protocol, minimum samples and evidence requirements.
- `are_checkpoint`: private durable progress, full observed tool-name inventory, one status per tool, blockers and elapsed minutes.
- `are_submit_assessment`: version-pinned 32-criterion report, per-tool evidence, blockers, executed Agent tasks, independent oracles and unresolved items written directly into private Neon.
- `are_get_submission`: receipt and private evidence stage for the same Task Token only.

**Plan before execution:** estimate = min(240, max(60, 60 + 15·ceil(expected tools/10) + 20 for OAuth + 15/30 for medium/high risk)). The tester's selected maximum prevents drawing oversized tasks. The phases are discovery, interactive authorization, tool-family coverage, failure reproduction and report. Discovered tool count may differ from filtering metadata: re-plan from actual `tools/list` and report the discrepancy.

All discovered tools are individually accounted for with one of `PASS`, `FAIL`, `BLOCKED_AUTH`, `BLOCKED_DESIGN`, `BLOCKED_ENVIRONMENT`, `NOT_TESTED`, `NOT_APPLICABLE`, plus exact reasoning/trace references as applicable. Every PASS needs an independent Oracle reference; HTTP 200 alone is not success. Group representative real Agent workflows and report tool-level coverage separately.

**Authorization:** initiate provider OAuth only through the official user-visible login. Ask the human to authorize; do not ask for or store passwords or third-party credentials. Unsafe/destructive/unrecoverable writes must not be executed without explicit authorization and a reversible sandbox. If no permission: `BLOCKED_AUTH` with evidence.

**Blocked tool design (Planner 5D-type):** after two same-cause retries or ten minutes, capture reproducible action trace, screen/camera size and selector/coordinate evidence. Mark `BLOCKED_DESIGN`, identify impacted tools, continue safe tests. Do not spend another hour retrying an unaddressable UI or invent a successful placement. Rate limits, backend failures, and poor API contracts have separate blocker causes.

Save `are_checkpoint` at logical milestones and after blocked tools so stalled Agents can resume without losing observations. A result submission is not itself verified.

## 4. Evidence verification (separate owner queue)

Automated intake validates project/assignee scope, source revision existence, exact 32 criterion rows, per-tool unique coverage matching the observed tool count, missing or false oracle references, blocked-tool evidence, bounded payload and idempotency. These are structural checks, not automated adjudication.

Owner manually records `NEEDS_RETEST`, `VERIFIED` or `REJECTED` with explanation. VERIFICATION requires a present tool inventory and reviewed blocker evidence; it means the findings were checked, *not* that all tools passed or a maturity level was certified. If the tool service cannot be exercised, record an explicit environment blocker; verify the limitation rather than fabricate the missing run.

## 5. Publication and outreach (independent owner decision)

Only verified runs may enter a private publication draft. The owner writes/edits the public-facing claims, checks source and scope, and explicitly approves manual publication. The V2 pipeline can stage/approve a private draft but deliberately **has no public publishing endpoint and sends no email**. A separate explicitly owner-approved release operation is required to publish new third-party independent evaluations. The owner may write outreach emails using verified evidence, without accidentally publishing.

The standard is not to gate everyday internal GitHub/CI/research, only **first public release of a new independent third-party evaluation**.

## Storage, permissions, and cleanup

- Private Neon tables: `private_project_pool`, `private_draw_invitations`, `private_assessment_tasks` (with token hash, invite FK and plan), `private_task_progress`, `private_evaluation_runs`, `private_task_submissions`, `private_review_verdicts`, `private_publication_drafts`.
- New API is **V2 only**: `/v2/board`, owner `/v2/pool*`, `/v2/invites*`, `/v2/tasks*`, `/v2/review*`, `/v2/release*`; tester `/v2/draw`; Agent `/v2/task/*`. V1 reviewers, owner page, CLI and manual direct assignments are not supported. Historic tables are retained for auditable evidence only.
- Owner Token is never given to testers; invitation Token is for drawing, Task Token is for one project's read/test/submit. Tokens must not be embedded in source control, public chat or URLs.
- A completed Task Token can be revoked without deleting its submitted evidence. Re-drawing after revocation uses a new task and token.
- Existing user research files, other active worktrees and unrelated Git branches must be preserved during release.

## Acceptance gates

1. Automated tests cover filter, invitation limits/revocation, atomic claim, time/OAuth preferences, task isolation, 32 criteria, per-tool coverage, OAuth/design blockers, evidence submission/receipt and explicit manual approval.
2. Production Neon E2E uses a temporary scoped invitation/task and verifies create → draw → checkpoint → submit → receipt → verify → draft → revoke; no public release. Retain no reusable QA tokens after testing.
3. MCP remote E2E on `https://are.world2.co/mcp`: discover 5 tools and execute permitted authenticated calls with a temporary Task Token; test revoked token denial.
4. Before merge: TypeScript + existing ARE Python/Node tests + public release lock. After merge: production Vercel READY, exact Git main commit, role-aware page and active endpoint verification.
5. Archive and remove only this feature's clean worktree and temporary branches. Leave other PRs and untracked user research files untouched.
