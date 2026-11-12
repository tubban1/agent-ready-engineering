# Agent-Ready Engineering Implementation Checklist (with Value Gate and Implementation Order)
> Document ID: ARE-A01
> v0.6 | 2026-11-12 | Status: design recommendation; not an authorization and not a validated industry standard
> Language: English (canonical). Chinese reading aid: `ARE-A01-agent-ready-implementation-checklist.zh.md`. Terms follow `../references/ARE-R03-glossary.md`.
> Rationale: `../principles/ARE-P01-agent-ready-architecture.md` (value premise + dimensions one to seven), `../principles/ARE-P02-agent-native-interface-design.md` (principles 1–12)
> Industry landscape: `../references/ARE-R02-agent-ready-industry-landscape.md`
> Deliverable templates: `templates/` (value card, capability matrix, operation contract, authorization matrix, eval report, value review, maturity assessment, scenario screening, portfolio report)
> Maturity model: `ARE-A02-agent-ready-maturity-model.md` (L0–L4; read-only exposure requires ≥ L2, write exposure requires ≥ L3, scaling up requires L4)
> A project's own AGENTS.md / CLAUDE.md, production permissions and Owner decisions take precedence over this checklist.

## Scope
In this checklist, Agent-Ready means **business services and interfaces** that agents can use safely and reliably. It does not mean “whether a code repository is ready for coding agents” (that is the AGENTS.md / repository readiness topic).

## Definition of Agent-Ready Engineering
**First judge whether it is worth having an agent do it; then turn the capabilities worth doing into a form agents can use safely and reliably; and after launch, keep verifying the value with measured data.**

Value judgment is not a discussion held before engineering; it is the first stage and the final loop of this process:
- **Entry**: the P0 Value Gate decides whether to proceed and what comes first.
- **During**: P1 uses value priority to set the order of re-engineering, and only the top-ranked capabilities are re-engineered.
- **Exit**: P8 reviews value with real usage data and decides whether to expand, maintain or retire.

## How to use
- Work through the stages in order. Every stage has **acceptance criteria**; do not start a stage that depends on one whose criteria are not met.
- Two tracks (both must pass P0 and P1 first):
  - **Read-only track**: after P0 + P1 + P5, read-only capabilities may be exposed to agents.
  - **Write track**: before any write operation is exposed to agents, **P2 + P3 + P4** must be complete.
- P5 (context economy) can run in parallel with P2–P4; P6 (ingress) must wait until the core is ready.
- Evals are not the last step: P0 runs a minimum validation, P5 / P6 test tools with real agents, and P7 turns evals into a release gate.
- Each project copies this checklist into its own tracking record (ADR / issue). **Do not write project data back into this repository.**
- Assessing many scenarios (architects / consultants): screen candidates with ARE-T08 first, run P0 for each shortlisted scenario, and report each assessment round with ARE-T09. Keep client data in a local workspace (layout in `templates/README.md`).

## Why this order
1. **The P0 Value Gate is the cheapest step**: before any re-engineering, it rules out scenarios that need no agent or that nobody will use repeatedly, avoiding useless re-engineering of every system.
2. **P2 and P3 cost little and remove the most risk**: idempotency, conditional writes, structured errors and task status directly eliminate duplicate charges, dirty writes and blind retries.
3. **P4 determines the blast radius when something goes wrong**, so it must be in place before write operations are exposed.
4. **P5 is about efficiency**, not correctness, so it can run in parallel.
5. **P6 is only a “thin adaptation” once the core is Agent-Ready**; doing it earlier merely wraps messy CRUD.
6. **P7 and P8** make the investment measurable and feed results back to P0 to close the loop.

---

## P0 Value Gate
**Purpose**: answer “why should an agent do this, and what is it worth if it succeeds”, and decide: proceed / read-only first / not now.

- [ ] **Specific scenario**: state who (real user role), in what situation, what task, how often, how it is done today, and where it hurts.
- [ ] **Does it really need an agent**: does the task require understanding vague intent, multi-step planning or combining several systems? If a fixed script, a rules engine, a plain integration or a better UI would solve it, **do not start Agent-Ready re-engineering**.
- [ ] **Recurring value**: is this a one-off need or a recurring one? Who will use it again?
- [ ] **Measurable value hypothesis**: record the current baseline (time spent, error rate, cost, waiting time and so on; measured or from real records), state the target and how it will be measured. Do not write benefit figures that cannot be verified.
- [ ] **Risk and responsibility**: what is the worst case (wrong charge, wrong outbound message, data leak)? Who bears the external consequences? Is the risk proportionate to the value?
- [ ] **Minimum validation**: without re-engineering, use existing interfaces plus human fallback (or a read-only prototype) to have a real agent and real users complete one representative task, confirming that the agent can actually use it and users actually want to use it again.
- [ ] **Scope decision**: decide Go (including writes) / read-only first / not now, and write an explicit out-of-scope list.

**Output**: one value card per candidate scenario (scenario, users, frequency, baseline, target, risk, minimum validation result, decision). Template: `templates/ARE-T01-value-card.md`. When there are many candidate ideas, screen them first with `templates/ARE-T08-scenario-screening.md`; only shortlisted scenarios get value cards.

**Acceptance criteria**:
- Every scenario that moves on has a value card, and its baseline data has a source.
- There is at least one real record of a minimum validation.
- Scenarios judged “no agent needed” or “not now” have written reasons.

## P1 Capability Inventory and Prioritization
- [ ] List the business operations involved in the scenarios that passed P0 and classify them: read-only query / validation (dry-run) / draft / final commit.
- [ ] For each operation, record: side effects, whether it can be undone, whether it involves money or outbound sending, and who must authorize it.
- [ ] For each operation, record its **value priority**: how often representative tasks use it, its contribution to the value target, and the cost of re-engineering.
- [ ] Identify catch-all executor interfaces (one entry point performing several actions of different risk) and put them on a split list.
- [ ] Put only the top-priority capabilities into the first batch; the rest go to a waiting pool until P8 data is available.

**Output**: capability matrix. Template: `templates/ARE-T02-capability-matrix.md`.

**Acceptance criteria**: a capability matrix in which every row answers “how high is the value priority, can an agent execute it directly, and if not, what confirmation is needed”; the first batch is explicit and capped.

## P2 Domain Core Contract (change the core only; no MCP yet)
**Output**: one operation contract per first-batch operation; the lifecycle and draft sections for P3 are filled in on the same card. Template: `templates/ARE-T03-operation-contract.md`.

- [ ] Replace page-level CRUD with high-level, bounded business intents (for example `prepare_cancellation` instead of `PATCH /order/field`).
- [ ] Use strongly typed schemas for inputs and outputs: enums, units, value ranges, time zones, source and update time.
- [ ] Every write accepts an `idempotency_key`, with a defined scope (Owner / agent / operation) and retention period; a repeated request returns the original result.
- [ ] Mutable resources carry a `revision`, and writes require `expected_revision`; on conflict, return the latest revision and a summary of differences.
- [ ] Use one error structure: `code`, `retryable`, `retry_after`, `hint` (what is missing, how to fix it), `current_state`.
- [ ] Provide `validate` / dry-run: checks only, no side effects.

**Acceptance criteria**:
- Replaying the same write request N times produces the business effect exactly once.
- Every write with an outdated revision is rejected, and the response includes the latest revision.
- For every error type, a program can tell whether to retry, when to retry, and what is missing.

## P3 State Machine and Long-running Operations
- [ ] Model long-running tasks as job / operation entities: `accepted → running → partial → completed / failed / cancelled / unknown`, with states that reflect only what the system can actually observe.
- [ ] Provide `get_operation_status` and `cancel`, support partial results and per-item receipts, and allow recovery by ID after a disconnect.
- [ ] Draft entities have an expiry (TTL), are isolated from committed data, and are cleaned up on schedule.
- [ ] Committed operations have undo or compensation flows (Saga style); irreversible operations are marked explicitly in the P1 matrix.
- [ ] When information is missing, return `needs_input` and name the missing fields.

**Acceptance criteria**: when a simulated client disconnects mid-task, retries after a timeout or submits concurrently, there are no duplicate charges, no duplicate records and no lost state.

## P4 Trust Boundary and Authorization
**Output**: authorization matrix, handed to governance when complete. Template: `templates/ARE-T04-authorization-matrix.md`.

- [ ] Agent identities are separate from human identities; agents use delegated credentials bound to the Owner, agent, actions, resources and validity period, revocable at any time.
- [ ] Credentials never enter the model context or the Code Mode sandbox (a controlled proxy signs or forwards on their behalf).
- [ ] The server rejects confirmation fields self-reported by the agent (such as `owner_confirmed: true`).
- [ ] Operations fall into three levels: agent may execute automatically / requires human confirmation / human only. Charges, outbound sending and committing records go through a trusted human channel.
- [ ] Human confirmation takes one of two forms, chosen per scenario:
  - **Claim (per-action confirmation)**: a human confirms a specific draft on a web page, by QR scan or by signature.
  - **Pre-authorization**: a human signs a bounded authorization in advance (amount limit, counterparties, time window, number of uses), and the agent may act only within those limits. The authorization must be verifiable by the server, revocable and logged on every use. Industry reference: Google AP2 Intent Mandate / Cart Mandate.
- [ ] Set amount, frequency and resource limits per agent, with a kill switch.
- [ ] Label external content (user files, web pages, third-party responses, messages from other agents) with source and trust level; the server never executes instructions embedded in data.
- [ ] Audit logs record: human principal, agent, session, intent, resource revision, authorization evidence (claim or pre-authorization ID), result.

**Acceptance criteria**:
- In a simulated Prompt Injection in the eval environment, the impact stays within the draft layer or the pre-authorization limits.
- Every final operation can be traced to a piece of human authorization evidence.
- After an agent or a pre-authorization is revoked, subsequent requests are rejected immediately.

## P5 Context Economy (data access layer; can run in parallel with P2–P4)
- [ ] Queries support field projection (`fields`), server-side filtering and sorting, cursor pagination and structured summaries.
- [ ] Responses have a size limit; when truncated, they return a `truncated` flag and a next-page cursor.
- [ ] Progressive discovery: provide a small capability index first; agents call `describe_*` / `get_*_schema` for full schemas when needed.
- [ ] Large objects are referenced by stable ID instead of being embedded whole in responses.
- [ ] Measure the response size of every tool and the round trips and tokens of representative tasks.
- [ ] Run real agents on the P0 representative tasks and iterate tool granularity, naming, descriptions and response formats from the results (eval-driven tool design).

**Acceptance criteria**: every tool has measured response-size data; representative tasks have an explicit upper bound on round trips.

## P6 Ingress Adaptation (only now write the MCP server)
- [ ] The MCP server only translates protocols; it contains no business logic and no authorization decisions.
- [ ] Fill in MCP tool annotations correctly (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), remembering they are hints; constraints are enforced by the core.
- [ ] Tool descriptions state when to use the tool, when not to, preconditions and side effects.
- [ ] Map `needs_input` to MCP elicitation (where the host supports it); expose read-only data as Resources where useful.
- [ ] REST / OpenAPI and Code Mode (typed SDK + sandbox + controlled proxy) reuse the same core and the same authorization.
- [ ] Tools and schemas have version numbers and a deprecation policy; hash or sign the full tool definition (description, input and output schemas, annotations) so every change can be detected and reviewed, never changed silently.

**Acceptance criteria**: adding a new ingress requires zero changes to core code; the same operation via MCP, REST and Code Mode yields the same authorization result and business effect; every change to a tool definition is recorded.

## P7 Observability and Evals
**Output**: eval report (P5 tool-iteration evals use the same template). Template: `templates/ARE-T05-eval-report.md`.

- [ ] A correlation ID runs through agent session → tool call → core transaction → external effect.
- [ ] Agent eval suite: based mainly on the P0 representative tasks, injecting timeouts, duplicate requests, revision conflicts and Prompt Injection.
- [ ] All metrics come from measurement: task completion rate, unauthorized-action rejection rate, number of duplicate side effects, recovery rate, tokens, latency, human intervention rate.
- [ ] Comparison experiment (optional): in the same scenario, compare a traditional API / a plain MCP wrapper / an Agent-Ready design (see “Learning / testing path” in the interface design document).

**Acceptance criteria**: evals are part of the release process, and regressions in key metrics block a release.

## P8 Launch, Operations and Value Review
**Output**: one value review per scenario per review cycle, with conclusions written back to the value card. Template: `templates/ARE-T06-value-review.md`. Across several scenarios, each round is summarized in a portfolio report: `templates/ARE-T09-portfolio-report.md`.

- [ ] Provide a sandbox / test environment with test credentials, isolated from production.
- [ ] Quotas and rate limits per agent; write operations rolled out gradually.
- [ ] Usage guide for agents: capability index, typical flows, error handling.
- [ ] **Value review**: using the metrics in the P0 value card, compare real usage data with baseline and target; record which capabilities are used heavily and which almost never.
- [ ] Decide from the review: expand (move capabilities from the waiting pool into the next P1 round) / maintain / shrink or retire low-value tools (less selection noise for agents and less maintenance).
- [ ] Review audit logs and eval results regularly and update the P1 capability matrix.

**Acceptance criteria**:
- Every newly exposed write capability has a rollout plan, a rollback method and an owner.
- Every launched scenario produces a value review within the agreed cycle, with conclusions written back to its value card.

---

## Minimum viable version (when time is short)
If only part can be done, the priorities are:
1. One value card + one minimum validation (P0)
2. Idempotency key + `expected_revision` (P2)
3. Structured errors that tell whether to retry (P2)
4. Status queries for long-running tasks (P3)
5. Final operations go through a human authorization channel: per-action claim or bounded pre-authorization (P4)
6. Field projection + cursors (P5)

Do not expose any write operation to agents until items 2–5 are done.

## Change log
- **v0.6 (2026-11-12)**: added scenario screening (ARE-T08) for many candidates, the portfolio report (ARE-T09) per round, and the portfolio usage note.
- **v0.5 (2026-11-12)**: first English canonical version, translated from Chinese v0.4. No change in content. The Chinese text becomes the reading aid `ARE-A01-agent-ready-implementation-checklist.zh.md`.
- **v0.4**: linked the maturity model (L0–L4) and the maturity assessment.
- **v0.3**: linked each stage to its standard deliverable template (`templates/`).
- **v0.2**: added the P0 Value Gate and carried value judgment through P1 prioritization and P8 review; former P0–P7 renumbered to P1–P8; P4 added pre-authorization; P5 added eval-driven tool design; P6 added tool definition change detection; scope clarified to exclude repository readiness.
- **v0.1**: first version, P0–P7.
