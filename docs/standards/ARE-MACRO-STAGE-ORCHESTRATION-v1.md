# ARE Macro-stage Orchestration v1 — six automatic phases and boundary gates

**Date:** 2026-11-17. **Status:** approved design direction, not a claim that all six phase executors have been deployed. **Canonical micro-SOP:** [S0–S13](ARE-EVALUATION-PUBLICATION-SOP-v1.md). **Publication policy:** [S11 single canonical case](ARE-S11-CHANNEL-PLAYBOOKS-v1.md). **Ops queue:** [Calendar/Gmail scheduler](ARE-CALENDAR-OPS-SCHEDULER-v1.md).

## 1. Product rule

S0–S13 are **internal machine steps**, not 14 user-facing screens and not 14 manual approval prompts.

One macro-stage owns all its constituent S-steps, their retries, the permitted tool calls, evidence production, validation, and durable receipts. Once triggered, it automatically reaches one of: DONE, LIMITED, WAITING_EXTERNAL, WAITING_HUMAN, BLOCKED_POLICY or FAILED_RETRYABLE. It must never silently claim completion when a required dependency is missing. A failed constituent step does not create a separate human task unless there is a genuine decision; technical failures retry/resume under a bounded policy.

**Gates are conditional decisions at macro-stage boundaries, not default human checkpoints.** Every gate first evaluates recorded authorizations, explicit policy, evidence and safety rules. Only a decision impossible to make safely from existing evidence creates a human task. An existing scoped approval may satisfy the gate automatically. No approval grant may be inferred from an MCP annotation, a prior unrelated session, or a user's willingness to browse a report.

**Two layers of status:** each macro-stage exposes a simple user-facing state and evidence summary; each micro-step keeps its exact S-number, tool/test result, coverage denominator, error and source references. Preserve original S0–S13 case manifests and never reinterpret NOT_VERIFIED as FAIL or PASS.

## 2. Six macro-stages

| Macro | Internal S-steps | Autonomous work on entry | Immutable exit deliverable | Boundary |
|---|---|---|---|---|
| W1 DISCOVER_QUALIFY | S0–S1 | Query World2 public MCP service catalog with a durable cursor; normalize IDs, endpoints and versions; deduplicate; prioritize; verify E1–E6 eligibility and contact evidence; route unknowns to a separate candidate pool | candidate, qualification, provenance, reason-coded selection | G1: eligibility and route selection |
| W2 INSPECT_PLAN | S2–S4 | Protocol negotiation; exhaustive paged tool/resource inventory; schema and annotation conflicts; source inspection at pinned SHA; source-to-live binding; tool risk classes; propose representative Agent tasks and independent oracles | protocol, complete tool matrix, source review, risk inventory, plan | G2: authorized execution scope |
| W3 EXECUTE_ASSESS | S5–S7 | Execute permitted tools/call with safe inputs and budget; real Agent task runs; independent oracle; 39 ARE check states, relevant protocol profile, coverage metrics and limitations; retry flaky non-side-effecting tests within bounded policy | tool_runs, agent_runs, oracle_results, 39-check assessment, versioned evidence hash | G3: evidentiary and outgoing-feedback release |
| W4 REPORT_CONTACT | S8–S9 | Produce bilingual-where-relevant developer report, verify reproducibility and claims, redact and QA; check official contact and duplicate/bounce state; send individual authorized mail with provider receipt; attach Gmail thread to one follow-up action | QA-passed developer report, private send/blocked receipt, case-version linkage | G4: public disclosure and site release |
| W5 PUBLISH_DISTRIBUTE | S10–S11 | Generate exactly one redacted canonical evidence page; deploy/read back; render localized short platform-native copy; post via preauthorized platform identities; read back provider permalinks; record independent channel statuses | canonical_url, release SHA, redaction audit, per-channel real receipts and blocked reasons | G5: transition to monitoring; unresolved channel exceptions may be separately escalated |
| W6 FOLLOWUP_RETEST | S12–S13 | Monitor genuine replies, platform moderation, corrections and new live versions; dedupe messages; identify changed deployed revision; re-run only affected authorized tests/oracles; update the **same** canonical case with dated diff and previous baseline preserved | follow-up history, genuine reply attribution, versioned retest and public change log | event-driven loop back to W2/W3; otherwise WAITING_EXTERNAL |

The six stages are not all required to claim a public preflight: anonymous website preflight is a **W1/W2-limited route**, not a synthetic W3 full evaluation. A private/unqualified project remains in discovery; a merely registered service is not a published evaluation. W6 is a long-lived event-driven subscription, not an indefinitely running worker.

## 3. Gate contracts

| Gate | Automatically pass when | Human interaction **only if** | Safe fallback |
|---|---|---|---|
| G1 QUALIFY | E1–E6 documented for requested route, provenance and identity distinct, lawful evaluation path | Operator/source/contact identity is contested, or owner participation necessary | keep candidate with WAITING_SOURCE, WAITING_AUTH, WAITING_CONTACT or WAITING_ORACLE; do not fill formal evaluation quota |
| G2 AUTHORIZE | Public-only allowlist and no risky side effects; or a current owner-scoped sandbox grant explicitly covers tools, data, budget and expiry | New OAuth consent, sandbox setup, write/financial/destructive scope or nonpublic data needed | perform only allowed public coverage, mark remaining NOT_TESTED and LIMITED; never attempt unauthorized calls |
| G3 EVIDENCE_RELEASE | Independent checks, complete 39-ID accounting, claim provenance and QA pass; outbound mail policy and contact-specific permission preexisting | Risky disclosure, material factual dispute, unverified maintainer identity, consent to send absent | retain internal draft and review task; no external email |
| G4 DISCLOSURE | Redaction, legal/confidentiality, maintainer notice and opt-in/published-review policy satisfied for this specific snapshot | Public evidence/disclosure is disputed, permission absent, or first-time public release scope unclear | private report only, no public case or social post |
| G5 CHANNEL_HANDOFF | Site URL and release verified, selected platforms independently processed or reason-coded blocked, monitoring task registered | Target platform requires interactive login/captcha/final approval, or moderator dispute needs response | retain blocked channel with no fictitious URL; other authorized channels and W6 continue |

A gate decision records: gate_id, case_id, stage_run_id, evidence_snapshot_sha, policy_version, decision (AUTO_PASS / APPROVED / WAITING_HUMAN / WAITING_EXTERNAL / DENIED), reason_code, approver_or_policy, scope, expiry, decided_at. A new source hash, changed target host, elevated risk class or revoked scope invalidates relevant approval; no silent approval carryover.

Human review screen shows **one concise decision card**, not internal tool-by-tool prompts: what is being requested; identified service/version; requested external effect and data; exact grant scope; evidence and residual risk; Approve once / Approve bounded policy / Reject; and audit reason. Human may grant standing bounded policies to avoid 100 per-case dialogs. For safety-sensitive or public disclosures, a policy may require explicit case-level approval.

## 4. Automation ownership and isolation

- **Orchestrator** (new persistent service/worker): drives W1–W5 from durable jobs, requeues retryable failures, maintains stage state and evidence pointers; no browser or long-running chat session is the system of record.
- **World2**: discovery source and canonical service identity. World2 public metadata is not a permission grant, an independent QA attestation, or evidence of repository/deployment binding.
- **ARE evaluators**: protocol/tool inventory, source audit, risk-aware execution, actual Agent scenarios/oracles, 39-check judgments; separate anonymous/static preflight from independent authorized evaluation.
- **Neon**: authoritative per-case stage runs, stage outputs by content hash, gate receipts, approvals, outbox, inbox cursors, channel receipts. Do not use the current Calendar journal as an exactly-once transactional database. Store large logs in access-controlled object storage with hashes instead of unbounded Neon rows.
- **Existing Calendar + Gmail hourly scheduler**: follow-up due dates, private alerts, maintainer threads, actionable WAITING_HUMAN cards; not the primary bulk evaluation job queue. One scheduler per operational domain, not one automation per project.
- **Publication runner and S11 builder**: keep their existing evidence gates; use provider-connected tools for actual email, release and posting. A draft, a button click or an unavailable account is NOT PUBLISHED.

Automation may complete a phase with LIMITED or PARTIAL only with explicit missing evidence, actions skipped, confidence/coverage and follow-up. It must never transform permission failures into low maturity scores.

## 5. Persisted execution model

Minimum recommended relational entities:

- cases: case_id, world2_service_id, endpoint identity, origin (WORLD2 / USER_SUBMITTED / MAINTAINER / RETEST), visibility, selected evaluation route, canonical_url.
- snapshots: immutable target endpoint fingerprint, observed protocol/version, source commit, deployed binding, tool manifest hash, standard revision, created_at.
- workflow_runs: run_id, case_id, snapshot_id, requested_route, current_macro, workflow_status, priority, budget, next_wakeup.
- stage_runs: run_id, macro_id, attempt, S-step progress and denominator, input_sha, output_manifest_sha, status, started_at, completed_at, error_class and retry_after.
- gate_decisions: structured gate contract above; expire and revoke independently.
- evidence_artifacts: immutable uri/sha256, classification and redaction/publication flag; private source data not leaked to the public portfolio.
- provider_outbox and provider_receipts: each external send/post intent, consent/policy scope, review, idempotency key, receipt, public readback and provider-specific status.
- external_events: Gmail thread id + message id, public post permalink, source/deploy revision, dedupe ID and causality.
- stage_events: append-only audit trail of transitions, including BLOCKED and LIMITED; no overwriting historical baseline.

Key constraints:
1. Idempotency key = case_id + source_snapshot_sha + macro_id + execution_scope + side_effect_identity, not a random chat run ID.
2. External side effects use transactional outbox and independent real receipts. Never automatically retry an uncertain email/post without reconciliation.
3. Per-host concurrency limits, call/time/token budgets, strict private-network/SSRF protection, tool-risk allowlists and scope-revocation checks happen *before* live calls.
4. Individual tool coverage, tested scenarios, independent oracle successes, ARE-check states and publication channel receipts have separate denominators.
5. A stage may leave an exception card without preventing other unrelated cases and allowed channels from progressing.
6. Resume from the last checkpoint after crashes; never restart side-effecting steps solely because ChatGPT/connector timed out.
7. A real maintainer reply is not a successful retest; only independently confirmed changed live deployment and Oracle evidence closes S13.

## 6. Public-user routes on the same engine

- **Visitor**: submits HTTPS endpoint and gets limited anonymous static preflight; W1/W2; no account requirement and no claims of certification.
- **Verified creator**: claims a host, gives consent and optional source/sandbox, requests formal review. Its G2 grant is bound to its target and test environment. Can view stages, evidence gaps, private history and choose public release. Ownership does not make self-submitted results independent.
- **Independent ARE operator/Agent**: starts World2-selected research, requires evidence qualification and the same permission rules. Maintainer can be notified with an accurate limited-scope result.
- **Reader**: browses only safely released case pages and evidence. 187 directory metadata entries are not implied to be 187 full reviews.

Public user-facing states: Discovered → Preparing → Testing → Evidence review → Maintainer feedback → Public case → Following up. WAITING_USER_ACTION and LIMITED are visible only where relevant. All underlying S-step names remain available in engineering logs, not as mandatory UI steps.

## 7. Incremental delivery and acceptance

**P0 — Workflow foundation:** Build durable stage/decision model, dispatcher and world2→W1/W2 worker; connect existing S0–S13 artifacts without rewriting standards. Only start W3 under recorded safe scope; keep partials/blocked. Prove one end-to-end public-only case resumes through simulated worker restart, no duplicate calls.

**P1 — Independent evaluation and contact:** Connect real Agent runner, Oracle, 39-check T07/T10 evidence gate, automatic report QA, contact verification, scoped transactional email outbox; Solarstorm as regression fixture, then ten independently qualified services. Prove no unsupported maturity, wrong-recipient email or unsafe call.

**P2 — Public release and event loop:** Connect S11 case renderer, website production readback, authorized platforms and receipt capture, Calendar/Gmail incoming event detector and S13 versioned delta reruns. Prove an unavailable social login does not block other channels; actual permalink required; maintainer update creates an append-only retest rather than overwriting initial evidence.

**Acceptance for each macro-stage:** an automatically runnable entry event; version-pinned input; bounded retries and timeout; evidence outputs; machine-validation rules; explicit route for missing authorization; durable state; a restart test; one allowed live integration test; and no routine per-micro-step human handoffs. A normative plan or a CLI that only checks a completed JSON manifest does **not** count as the deployed autonomous stage executor.

## 8. Current implementation truth as of 2026-11-17

Present: World2 public catalog query, full S0–S13 SOP, safe static preflight, ARE MCP guidance/39-check methods, Solarstorm bounded real Agent/Oracle case, S11 single public case page, publication validation/rendering CLI, Gmail/Calendar follow-up pilot and real hourly read-only journal receipts.

Not yet proven as a unified production worker: durable World2 candidate ingestion with cursor, all E1–E6 automated qualification, generalized authorized Agent executors/oracles across many services, transactionally safe email/social sending and approvals, and fully event-driven deployed-revision retest. These are implementation gates, not documentation or UI problems. The design must not be labeled as already shipped.

## 9. Relationship to existing standards

This document adds **orchestration grouping and decision boundaries**, not new ARE check definitions or changes to S0–S13 acceptance. Keep the historical Solarstorm per-step evidence, original case-version history, explicit channel statuses and privacy guards. Migration is additive: existing S-step records map into W1–W6 without changing source facts.


## 10. Standing authorization / reusable connected operator identities (2026-11-17)

**Product requirement:** once an ARE operator has connected and authorized an account/provider with a bounded policy, W1–W6 should reuse the current valid session and avoid repeated per-project approvals. Routine read-only discovery, permitted evaluation, report QA and covered outbound technical communication may proceed unattended when all objective quality, provider and budget checks are satisfied. A provider-specific login or an expired/revoked OAuth scope can still require a real user step.

**Identity clarification:** ChatGPT login, OpenAI login and the active Gmail connector are separate contexts. The owner permits either of two explicitly approved ARE operator identities, whose exact addresses and provider account IDs are stored only in the private, gitignored binding. The Gmail connector has been observed on one allowed identity, eligible for reuse only while its live provider session and actual scopes remain valid. Neither a ChatGPT nor an OpenAI login name proves a Gmail or third-party social connection.

**Private bindings:** The exact allowed addresses live only in gitignored `.are-private/identity-binding.v1.json`, and the checked-in `data/are-standing-autonomy-policy.v1.json` refers to the identity group `are_operator_accounts`. Never write OAuth tokens, password, session cookies or private mail contents to Git, Calendar or public evaluation reports. Each external action must use the live provider-observed sender/account ID and only scopes actually granted. Changing between two allowed connected identities is not itself a new approval request; an unconnected identity cannot be silently impersonated.

**Standing actions:** research World2 and GitHub public data; allowed public MCP read-only probes; explicitly owner-authorized isolated sandbox tests; real Agent + independent Oracle runs; report QA; verified individual maintainer email with evidence and outbox idempotency; release redacted canonical ARE website case; platform-native posts only from separately connected/authorized platform accounts; technical reply monitoring and safe retest. Current suggested limits are <=10 new external recipients/day, <=3 posts/channel/day; limits must be enforced transactionally in the future production worker.

**Always outside general standing authorization:** third-party production writes, payments/financial commitments, high-risk security disclosures, sensitive personal data, credential export, bypassing CAPTCHA/OAuth consent, unverified platform accounts, or unsolicited bulk messaging. A Gmail/ChatGPT account being intended as a test account is not permission to modify an unrelated third-party service.

**Status:** `scripts/are_standing_autonomy.py` is a pure, read-only policy adviser. It returns `AUTO_PASS_CANDIDATE`, **not** a production execution permit. The orchestrator, trusted connector adapters, durable stage database, rate-limit ledger and transactional outbox are not yet integrated end to end. The existing Calendar watcher is independent and keeps its current per-event `send=manual_approval` flags until safely migrated. An actual sender/profile mismatch is `BLOCKED_IDENTITY_MISMATCH` and one missing connection blocks only the affected provider, not other stages.
