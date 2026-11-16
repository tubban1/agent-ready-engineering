# Agent-Ready Engineering Maturity Model
> Document ID: ARE-A02
> v0.5 | 2026-11-16 | Empirically grounded engineering framework; predictive correlations require separate measurement; not an industry certification
> Language: English (canonical). Chinese reading aid: `ARE-A02-agent-ready-maturity-model.zh.md`. Terms follow `../references/ARE-R03-glossary.md`.
> Related: `ARE-A01-agent-ready-implementation-checklist.md` (P0–P8), `templates/` (deliverables), `templates/ARE-T07-maturity-assessment.md` (assessment form), `templates/ARE-T08-scenario-screening.md` (screening many candidates), `templates/ARE-T09-portfolio-report.md` (portfolio report and roadmap)

## Purpose
- Show a service maintainer or enterprise which level **a given scenario** has provisionally reached, what evidence is missing and what concrete actions matter for Agent task outcomes.
- Turn “can this be exposed to agents?” into checkable thresholds: read-only exposure, write exposure and scaling up each require a different level.
- Make assessments comparable across projects and over time.

## Assessment rules
1. **Assess per scenario, not per enterprise.** The unit of assessment is the scenario behind one value card (and the systems it involves). At enterprise level, look at the distribution of levels across scenarios; **do not average several scenarios into one enterprise score**, because an average hides the weaknesses of high-risk scenarios.
2. **Every item is a binary check**: pass / fail / not applicable. A verbal explanation never counts as a pass; there must be an evidence location (deliverable, code, test record, log).
   Each pass also records its **evidence type**: `inspected` (the assessor examined the code, configuration or logs directly, or ran the test) or `documented` (an artifact provided by the team, such as a document, test report or log export, not independently re-run). A `self-reported` statement is never enough for a pass. For L3-C1, L3-C2, L3-A2 and L3-O2, `inspected` evidence is recommended; documented-only passes of these checks are flagged in the portfolio report.
3. **Reaching level N = every check from level 1 to level N passes or is not applicable.** If any check fails, the level stops below the level of that check.
4. **N/A is operation-scoped and evidence-backed.** ARE-A02@0.5 requires tool/operation scope, concrete reason, source evidence, human reviewer, review date and complete version-pinned risk profile. A reason alone never qualifies. If an operation exhibits the risk addressed by a check, it cannot be declared exempt. See `../docs/standards/ARE-OPERATION-RISK-PROFILE-v1.md`.
5. **Assessments expire.** When the core, tool definitions or authorization rules change, the affected checks must be reassessed.
6. **Substance, not document bureaucracy.** A solo maintainer or small open-source project may record its value decision, user, baseline source/measurement plan, real validation, capped first batch, and operation owners in concise project Markdown (e.g. README or AGENTS) rather than separate enterprise-form templates. The evidence must still be attributable, reviewed and checkable. **L1-V1 does not require a wet signature or a corporate approver role.** L1-A1 still requires accountable Owner/approver/responsible for the scoped operations; one person may fulfill multiple roles if clearly recorded. There is no automatic maturity certificate.
7. **A code reference is not a semantic pass.** The assessor must verify the full check wording, its scope (all applicable tools/operations), and evidence of executed tests where required. A scripted SDK call is protocol integration evidence, not proof of autonomous Agent planning. A long-running operation can exist without an always-on daemon; do not mark L3-S1 N/A on daemon absence alone. Local automatic evidence gates flag review issues but never establish an official level.

8. **Provisional, versioned assessments.** Pin `ARE-A02@0.5`, assessed source/deployment and tool-catalog revisions and an operation-level risk profile. Computed levels remain **PROVISIONAL**, not certified; v0.4 or unpinned historical assessments must not be silently rescored or compared to v0.5.
9. **Harness vs MCP.** Harnesses plan and select tools; MCP connectors expose capabilities; runtimes/services enforce correct, safe effects. A service need not implement its own general-purpose Agent planning loop.

## Levels
| Level | Name | In one sentence | Allowed action | Main stages |
| :--- | :--- | :--- | :--- | :--- |
| L0 | Not Ready | No value judgment; interfaces are still page-level APIs | Do not expose to agents | — |
| L1 | Value Defined | We know why to do it and what comes first | Start re-engineering | P0–P1 |
| L2 | Read-Ready | Read-only capabilities can be used by agents safely and efficiently | **Expose read-only capabilities** | P5, plus the read-only parts of P2 / P4 |
| L3 | Write-Safe | Writes are retry-safe and recoverable, authorization is verifiable, blast radius is limited | **Expose write operations** | P2–P4, fault injection in P7 |
| L4 | Verified Operations | Continuous evals, full traceability, value reviewed with real data | **Scale up** | P6–P8 |

## Eight dimensions
| Code | Dimension | Section of ARE-P01 |
| :--- | :--- | :--- |
| V | Value | Premise: value first |
| C | Contract | Dimension three (idempotency, revisions, errors) |
| S | State and Recovery | Dimension three (lifecycle, undo) |
| A | Authority and Trust | Dimensions four and six |
| X | Context Economy | Dimension two |
| I | Ingress | Dimension five |
| O | Observability and Evals | Dimension seven |
| R | Run and Review | Premise: value first (review after launch) |

Besides the overall level, each dimension can be given its own level to reveal weak spots.

---

## L1 Value Defined
| ID | Check | Evidence |
| :--- | :--- | :--- |
| L1-V1 | A value card exists and its decision is “Go” or “read-only first” | Value card |
| L1-V2 | Baselines of the value metrics have sources; those without are marked “not measured” with a plan to measure | Value card §4 |
| L1-V3 | At least one real record of a minimum validation | Value card §7 |
| L1-V4 | The capability matrix is complete, and the first batch is explicit and capped | Capability matrix |
| L1-A1 | Every first-batch operation has an Owner, an approver and a responsible person | Capability matrix |
| L1-C1 | Catch-all executor interfaces are identified and have a split plan | Capability matrix split list |

## L2 Read-Ready
| ID | Check | Evidence |
| :--- | :--- | :--- |
| L2-C1 | Read-only operations have strongly typed schemas: units, enums, source, update time | Operation contract / schema |
| L2-C2 | Errors are structured: `code`, `retryable`, `retry_after`, `hint` | Operation contract §5 |
| L2-X1 | Field projection, server-side filtering and cursor pagination are supported | Interface definition / tests |
| L2-X2 | Responses have a size limit; when truncated they return `truncated` and a next-page cursor | Interface definition / tests |
| L2-X3 | Progressive discovery: a capability index first, full schemas on demand | Tool list |
| L2-X4 | Every read-only tool has a measured response size | Eval report |
| L2-A1 | Agent identity is separate from human identity; read-only delegated credentials are narrow, short-lived and revocable | Authorization matrix |
| L2-A2 | External content (user files, web pages, third-party responses) is labeled with source and trust level | Authorization matrix, “untrusted content boundary” |
| L2-I1 | The ingress layer contains no business logic; read-only tool annotations are correct | Code / tool definitions |
| L2-O1 | Read-only calls are audited: principal, agent, query conditions | Log sample |
| L2-O2 | Real agents have run the read-only part of the representative tasks, with an eval report | Eval report |

## L3 Write-Safe
| ID | Check | Evidence |
| :--- | :--- | :--- |
| L3-C1 | Writes accept an idempotency key; scope and retention are defined; a replay returns the original result | Operation contract §4 + tests |
| L3-C2 | Mutable resources require `expected_revision`; on conflict the latest revision and a summary of differences are returned | Operation contract §4 + tests |
| L3-C3 | Writes have validate / dry-run | Operation contract §6 |
| L3-C4 | Every first-batch write operation has an operation contract, and all its acceptance records pass | Operation contract §9 |
| L3-S1 | Long-running tasks have a state entity, status query and cancel, and can be recovered by ID after a disconnect | Operation contract §7 + tests |
| L3-S2 | Drafts have an expiry, are isolated from committed data and are cleaned up | Operation contract §8 |
| L3-S3 | Committed operations have undo or compensation; irreversible operations are marked explicitly | Operation contract §6 / capability matrix |
| L3-S4 | Missing information returns `needs_input` with the missing fields listed | Operation contract §5 + tests |
| L3-A1 | The authorization matrix is complete and approved by governance | Authorization matrix |
| L3-A2 | Final operations go through a claim or a valid pre-authorization; the server rejects confirmation fields self-reported by the agent | Authorization matrix + tests |
| L3-A3 | Credentials never enter the model context or the Code Mode sandbox | Architecture notes / code |
| L3-A4 | Amount and frequency limits exist, and any agent can be disabled with a kill switch | Authorization matrix + drill record |
| L3-O1 | Audit records include authorization evidence (claim ID or pre-authorization ID) | Log sample |
| L3-O2 | All fault-injection evals pass: retries, revision conflicts, disconnects, Prompt Injection, missing information | Eval report §2 |

## L4 Verified Operations
| ID | Check | Evidence |
| :--- | :--- | :--- |
| L4-O1 | A correlation ID runs through agent session, tool call, core transaction and external effect | Trace sample |
| L4-O2 | Evals are part of the release process; regressions in key metrics block a release | Release pipeline configuration / records |
| L4-I1 | Tool definitions are versioned, the full definition is hashed or signed, and changes can be detected and reviewed | Change records |
| L4-I2 | If there are several ingress paths (MCP / REST / Code Mode), the same operation yields the same authorization result and business effect | Eval report |
| L4-R1 | Test environments are isolated from production; write capabilities have a rollout plan, rollback method and owner | Launch plan |
| L4-R2 | At least one value review is complete, with conclusions written back to the value card | Value review + value card §9 |
| L4-R3 | Low-value capabilities have been shrunk or retired based on the review, or there is a written reason to keep them | Value review §5 |
| L4-R4 | There is a usage guide for agents: capability index, typical flows, error handling | Documentation |

---

## Enterprise view
An enterprise gets no single score; it gets a **distribution of scenario levels**. Candidate scenarios are first screened with `templates/ARE-T08-scenario-screening.md`; each assessment round is reported with `templates/ARE-T09-portfolio-report.md`, which extends the table below with exposure consistency, evidence quality, a roadmap and handoffs.

| Scenario | Current level | Target level | Main weak dimensions | Next step |
| :--- | :--- | :--- | :--- | :--- |
| <Scenario A> | <L2> | <L3> | <A, S> | <complete the authorization matrix and long-running task status> |
| <Scenario B> | <L1> | <L2> | <X> | <> |

How to read it:
- How many scenarios can safely expose read-only capabilities (≥ L2) and writes (≥ L3).
- Whether any high-risk scenario is below L3 yet already exposes writes. This is the situation to fix first.
- Which dimension is a weak spot across several scenarios, which suggests solving it once at platform level (for example, a shared delegated-credential or audit service).

## Relation to industry practice
Repository readiness already has similar models (for example, Factory Agent Readiness grades repositories on several dimensions in five levels). This model borrows the “binary checks, reached level by level” format, but its subject is **business services and interfaces**, and it makes value judgment the first level. See `../references/ARE-R02-agent-ready-industry-landscape.md`.

## Empirical evidence and living results

ARE has been tested on real engineering projects and public MCP services, including Interior, OWL LAB, Vibe Monitor, the ARE100 cohort and Solarstorm. Evidence spans live protocol negotiation, tool contracts, authorized tool calls, real Agent tasks, recovery checks and measured before/after fixes. Verification depth varies: tool discovery is not verified business-task completion, and cohort research is not 100 maturity certifications.

**Living evidence, not fixed sample counts:** See the continuously updated [ARE evaluation portfolio](https://are.world2.co/evaluations/) and [Benchmark/research index](https://are.world2.co/benchmark/). These are the evidence entry points for new projects and versioned records. Each record must specify assessment version, source/deployment revision, evidence scope, time and independent verification status; offline snapshots must be labeled. This methodology document does not need updating every time a new project is assessed.

**Specific open quantitative questions:** What is the predictive relationship of ARE levels to Agent task completion, incident frequency, execution costs and remediation effort? Those claims require matched repeated tasks and independent outcome verification. They are separate from ARE's already demonstrated real-project testing. The 39 check IDs remain stable; v0.5 explicitly versions applicability and provisional grading.

## Change log
- **v0.5 (2026-11-16)**: living empirical evidence references, precise predictive calibration scope, version-pinned operation risk profiles and scoped N/A, provisional-only computed grades. The 39 check IDs are unchanged.
- **v0.4 (2026-11-15)**: clarified lightweight equivalent evidence for solo maintainers (without mandatory signatures), strict semantic/coverage review, scripted MCP tests vs autonomous Agent evaluations, and long-task N/A applicability. Unchanged check IDs, binary level rule and exposure requirements.
- **v0.3 (2026-11-12)**: added evidence types (`inspected` / `documented`; `self-reported` never passes) with inspection recommended for L3-C1, L3-C2, L3-A2, L3-O2; linked scenario screening (ARE-T08) and the portfolio report (ARE-T09). Check IDs and level rules unchanged.
- **v0.2 (2026-11-12)**: first English canonical version, translated from Chinese v0.1. No change in content; check IDs unchanged. The Chinese text becomes the reading aid `ARE-A02-agent-ready-maturity-model.zh.md`.
- **v0.1**: first version: L0–L4, eight dimensions, 39 binary checks.
