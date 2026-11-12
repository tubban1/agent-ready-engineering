# Agent-Ready Architecture | The Architect's View
> Document ID: ARE-P01
> v0.5 | 2026-11-12 | Status: design position and working hypotheses, not a validated industry law
> Language: English (canonical). Chinese reading aid: `ARE-P01-agent-ready-architecture.zh.md`. Terms follow `../references/ARE-R03-glossary.md`.
> Related: `ARE-P02-agent-native-interface-design.md` (interface principles), `../references/ARE-R01-tool-calling-mcp-code-mode.md` (concept layers), `../references/ARE-R02-agent-ready-industry-landscape.md` (industry landscape), `../adoption/ARE-A01-agent-ready-implementation-checklist.md` (implementation order and acceptance criteria)
> Scope: in this document, Agent-Ready means **business services and interfaces** that agents can use safely and reliably. It does not mean whether a code repository is ready for coding agents (AGENTS.md / repository readiness is a separate topic).

From a system architect's point of view, **Agent-Ready is not “adding an MCP endpoint to the system”, nor “wrapping APIs as a few tools”.**

In terms of architectural evolution, Agent-Ready is a system re-engineering of **client assumptions, state determinism, resource budgeting, trust boundaries and verifiability**. But before any re-engineering, a simpler question must be answered: **is this worth having an agent do?** This document therefore defines **Agent-Ready Engineering** as:

> **Judge value first; then turn the capabilities worth doing into a form agents can use safely and reliably; and after launch, verify the value with measured data.**

The sections below cover positioning and boundaries, the value premise, and then seven architecture dimensions (dimensions one to five are the core; six and seven are the parts most often missed in practice).

---

### Positioning and boundaries: the execution-layer standard in enterprise AI transformation

**Positioning in one sentence**: Agent-Ready Engineering is the standard process for letting agents **execute safely and deliver verifiably** in an enterprise's core business.

Enterprise AI transformation usually runs on several parallel workstreams: employee productivity, content and analytics, agents acting on the enterprise's own systems, opening services to external agents, traditional machine learning, and organization and talent. Agent-Ready Engineering is **not responsible for the whole transformation**. It covers only the layer where agents actually execute business work. This is the hardest and riskiest part of the transformation and the one that most needs engineering; whether transformation spending becomes measurable business results depends heavily on this layer.

“Standard process” does not mean “the entire process”. It does not need to cover every workstream; it needs to become the repeatable, verifiable default in the execution layer (as cloud native and DevOps did for enterprise IT transformation).

| What we do (core) | Interfaces only (not our job) | Out of scope |
| :--- | :--- | :--- |
| P0 Value Gate: decide which business work is worth having agents do | **Receive from strategy**: list of candidate scenarios | Organization design, role changes |
| P1–P6: capability inventory, core contracts, state, authorization, context, ingress | **Hand to governance**: authorization matrix, audit evidence, risk levels | Employee training, change management |
| P7–P8: evals, launch and operations, value review | **Require from the organization**: every capability has an Owner, an approver and a responsible person | Selecting and rolling out employee productivity tools |
| | **Receive from the data layer**: agreements on data sources, data quality and access rights | General AI strategy |

**Boundary principles**:
* At each boundary, specify only “what we need from the other side and what we deliver to it”; do not do the other side's work.
* For AI governance, take on only what engineering can implement (verifiable authorization, audit logs, risk levels), not governance committees or policy writing.
* P0 lets us take part in early business judgment; P8 lets us prove outcomes with measured data. These two ends are enough to reach the core business without expanding into organization or productivity work.
* Scenarios that P0 judges as “no agent needed” are recorded with reasons and handed back to the appropriate workstream (for example, buying an off-the-shelf tool or a plain integration). They are not processed further here.

**Becoming a “standard” depends on being repeatable and verifiable**: stages with acceptance criteria (available, see the implementation checklist), standard deliverable templates (available, see `../adoption/templates/`: value card, capability matrix, operation contract, authorization matrix, eval report, value review), and a maturity model (available, see `../adoption/ARE-A02-agent-ready-maturity-model.md`: L0 Not Ready → L4 Verified Operations).

---

### Premise: value first (Value Gate)

Architecture by itself produces no value. A capability nobody uses repeatedly is only a cost, however Agent-Ready it is. Value judgment is therefore **the first gate and the final loop** of Agent-Ready Engineering, not a discussion outside engineering:

* **Whether to do it**: is there a specific user, a specific task, a real frequency? Does the task truly need an agent's understanding and planning, or would a fixed script, a rules engine, a plain integration or a better UI solve it? The latter need no Agent-Ready re-engineering.
* **What first**: value sets the order of work. Re-engineer only the capabilities used most by representative tasks and contributing most to the value target, rather than “rebuilding every system first”.
* **How much it is worth and how risky it is**: the value hypothesis must be measurable (baseline from measurements or real records) and weighed against the worst case and who bears the external consequences.
* **Validate small, then re-engineer**: before re-engineering, use existing interfaces plus human fallback to have a real agent and real users complete one representative task, confirming that “the agent can use it and users want to use it again”.
* **Review after launch**: compare real usage data with the baseline; deepen high-use capabilities and shrink or retire tools almost nobody uses. Fewer tools also mean less selection noise for agents.

> Value judgment answers “why and which”; the seven dimensions below answer “once decided, how to do it safely and reliably”. Both are required: value without engineering lets agents cause incidents in real business; engineering without value produces an “Agent-Ready platform” nobody uses.

---

### Dimension one: a fundamental shift in client assumptions (Client Axiom Shift)

The first principle of software architecture is to define assumptions about the caller. For decades, systems mainly had two kinds of clients:
1. **Deterministic clients (code)**: call order fixed at build time, Boolean logic, inputs and outputs strictly typed.
2. **Human clients (users)**: behavior is random, but humans have common sense, memory and patience. They tolerate misaligned interfaces, piece context together, notice anomalies, recover on their own, and bear responsibility for their actions.

**Agent-Ready faces a third kind of client: the probabilistic actor.**
* It can plan autonomously and understand meaning, but **cannot reliably depend on interface layout, page context or implicit information that “a human gets at a glance”**. Multimodal models and computer use can “see” a screen, but screenshot understanding is expensive and unstable and should not carry business contracts.
* Its behavior is probabilistic. It may hallucinate, and it may loop or retry blindly when the network is flaky or errors are vague.
* Its working memory (the context window) is limited and expensive.
* It does not bear legal or financial responsibility; that stays with the human Owner who authorized it.

> **The architect's first question**:
> **When the client changes from a deterministic program into a probabilistic black box that makes its own decisions, how does my backend still keep state changes strongly deterministic and highly reliable?**

---

### Dimension two: capacity planning for the context window as scarce working memory

Traditional architects measure throughput and resources by QPS, concurrent connections, database connection pools and I/O bandwidth.
With agents, **the context window is expensive, limited working memory that is easily polluted, and token consumption is a new dimension of bandwidth and cost.**

> Note: a common analogy is the “L1 cache”. It helps convey “small, expensive, easily flushed”, but it is imprecise: a cache is transparent to the layer above and can always refetch from the source, whereas content in the context directly shapes the model's reasoning, and the model does not know to refetch information that has been pushed out.

* **Avoid context pollution (anti-context thrashing)**:
  * Dumping raw records with 200 fields on an agent, as traditional APIs do, crowds the limited window, dilutes key information and raises the chance of misreading and hallucination.
* **Lazy loading for discovery (progressive discovery)**:
  * The architecture should expose capabilities progressively (project example: Bloomroom reads its design schema on demand via `get_design_schema`), rather than stuffing every large schema into the context at the initial handshake.
* **Machine-first redesign of data access**:
  * Traditional fixed pagination (20 records at a time) means many round trips (network plus inference) for an agent.
  * An Agent-Ready data layer should support **server-side filtering, field projection, cursor pagination, structured summaries and stable references**, cap response size and mark truncation explicitly, raising the information density of each interaction.
* **Treat tokens as a measurable resource**: measure and record the size of every tool response and the round trips and tokens of every task, instead of optimizing by feel.

---

### Dimension three: strong state machines in a non-deterministic environment, and preventing retry disasters

Traditional distributed systems rely on consensus protocols or transactions for internal consistency. An agent, however, is a non-deterministic client running outside the system and easily falls out of sync with the server's actual state.

Architects must build **defensive resilience** into the domain model:

```
                    ┌──────────────────────────────────┐
                    │  Agent (non-deterministic client) │
                    └────────────────┬─────────────────┘
                                     │ 1. Sends expected revision and idempotency key
                                     ▼
                    ┌──────────────────────────────────┐
                    │  CAS concurrency control and     │  ← strict server-side checks
                    │  revisioned state machine        │
                    │  - expected_revision             │
                    │  - idempotency_key               │
                    │  - status: needs_input           │
                    └────────────────┬─────────────────┘
                                     │ 2. Explicit state, no guessing
                                     ▼
                    ┌──────────────────────────────────┐
                    │  Real business data and          │
                    │  transaction execution           │
                    └──────────────────────────────────┘
```

1. **Conditional writes (CAS / optimistic concurrency control)**:
   * Project example: Interior's `refine_design` requires `expected_revision`. A mismatched revision is rejected, preventing dirty writes based on outdated knowledge.
   * On conflict, **return the current revision and a summary of differences** so the agent can re-read and decide again, instead of returning only “conflict”.
2. **Idempotency keys**:
   * Every write accepts an idempotency key, with a defined scope (per Owner / agent / operation), a retention period, and the rule that a repeated request returns the original result. CAS prevents “writes based on stale state”; idempotency prevents “the same intent written several times”. They complement each other and both are required.
3. **A machine-readable error contract**:
   * Errors must be structured: error code, whether it is retryable, `retry_after`, the input still needed, and the current state. Agents stuck in retry loops are often not a model problem but a server that returned only a message meant for humans.
4. **Declarative side effects**:
   * Separate read-only discovery, validation (dry-run), temporary drafts and final commits at clear boundaries, and eliminate “catch-all executors”.
5. **Make business processes into entities (lifecycle observability)**:
   * A request being accepted (ACK / HTTP 200) does not mean the business work is done. Model long-running tasks as separate state entities (such as `accepted -> running -> partial -> completed / failed / cancelled / unknown`) so an agent can query progress by task ID after a disconnect, avoiding “duplicate charges and purchases caused by blind retries”.
6. **Undo and compensation**:
   * Drafts protect only the “not yet committed” phase. For committed operations, provide undo or compensation flows (Saga style) wherever possible, and state which operations are irreversible.

---

### Dimension four: zero trust and the separation of authority and execution

On the security side, Agent-Ready does not overturn RBAC; it **adds a layer of delegated authorization on top of RBAC**. The human principal keeps role-based permissions; the agent receives only a narrower, shorter-lived, revocable subset.

* **Reject self-reported trust**:
  * An agent sending `owner_confirmed: true` must never count as real authorization; authorization evidence must come from a human channel the server can verify.
* **Delegated credentials**:
  * Agents use identities and credentials separate from humans, bound to the Owner, the agent, allowed actions, resources and validity period. Credentials are never exposed directly to the model or a code sandbox.
* **Separation of powers: exploration vs. claiming (Draft & Claim)**:
  * **The agent holds the right to explore and orchestrate**: it may call models, adjust parameters and produce temporary drafts (time-limited and isolated).
  * **The human Owner holds the right to final assets and fulfillment**: final charges, outbound sending and committing records must be handed over through a trusted human channel (such as a web claim, QR scan or independent signature).
  * Even if the agent hallucinates or suffers a Prompt Injection, its blast radius stays within temporary drafts.
* **Pre-authorization as another form of claim**:
  * Per-action confirmation suits low-frequency, high-risk operations. For high-frequency scenarios, a human can **sign a bounded authorization in advance** (amount limit, counterparties, time window, number of uses), and the agent may act only within those limits.
  * Pre-authorizations must be verified by the server, revocable at any time and logged on every use. They limit the agent's scope of execution; they do not hand over judgment to the agent wholesale.
  * Industry reference: Google AP2 distinguishes a Cart Mandate signed with the human present from an Intent Mandate signed in advance.
* **Limits and kill switch**: set amount, frequency and resource limits per agent, and keep a switch that can immediately revoke a given agent's access.

---

### Dimension five: decoupling the domain core from the ingress layer (Core Domain vs. Ingress)

A common architectural mistake is **hard-coding MCP throughout business code in order to support agents**.

First separate several concepts that sit on **different layers** (see `../references/ARE-R01-tool-calling-mcp-code-mode.md`); they are not “protocol dialects” of one layer:

| Layer | Examples | Place in the architecture |
| :--- | :--- | :--- |
| Model capability | Tool Calling (tool use in each vendor's model API) | The model tells the host “what to call and with which arguments”; it does not connect to your system directly |
| Ingress protocol | MCP, REST / OpenAPI | How hosts or clients discover and call your capabilities. This is the ingress layer |
| Execution style | Code Mode | The agent writes constrained code that combines typed APIs in a sandbox; underneath, the same authorization applies |
| Agent-to-agent | A2A | Independent agents delegate tasks and exchange results; complementary to MCP, not a replacement |

```
               ┌───────────┐    ┌───────────┐    ┌──────────────────┐
  Ingress      │    MCP    │    │   REST    │    │ Code Mode sandbox │
               │(agent host)│   │(web/apps) │    │(typed SDK + proxy)│
               └─────┬─────┘    └─────┬─────┘    └─────────┬────────┘
                     └────────────────┼────────────────────┘
                                      ▼
               ┌──────────────────────────────────────────┐
 Domain Core   │        Agent-Ready domain core           │
               │ - Bounded Intent                         │
               │ - Idempotent & Reversible                │
               │ - Provenance & Validation                │
               │ - Authorization (per sub-operation)      │
               └──────────────────────────────────────────┘
```

* **Thick core, thin ingress**:
  * The business core itself should provide bounded intent, idempotency, strongly typed validation, state machines, authorization decisions and traceable evidence.
  * If the domain core is Agent-Ready, adding an MCP server is mostly adaptation work; if the core is still messy page-level CRUD, no amount of wrapping will make it robust.
  * MCP tool annotations (such as `readOnlyHint`, `destructiveHint`, `idempotentHint`) are only **hints** to the host, not security guarantees; real constraints must be enforced in the core.
  * Tool definitions (descriptions, input and output schemas, annotations) are contracts too: they should be versioned, and the full definition should be hashed or signed so every change can be detected and reviewed (see the OWASP MCP Security Cheat Sheet).

---

### Dimension six: separating data from instructions (Untrusted Content Boundary)

Everything an agent reads (uploaded files, web pages, emails, third-party API responses, messages from other agents) may contain text that looks like instructions (Prompt Injection).

* External content returned by tools should be labeled with **source and trust level** and kept distinct from the system's own structured fields.
* The server never widens permissions or skips confirmation because “the data says to perform an action”.
* Preconditions for high-risk operations are checked by the server, not left to the model to “read and obey” some text.
* This dimension works together with dimension four: even if an injection does influence the agent's decisions, Draft & Claim and delegated credentials keep the consequences within a controlled range.

---

### Dimension seven: observability, audit and evals (Provenance & Evals)

Agents run with no one watching, so the system must be able to answer afterwards: **who authorized which agent, with what intent, based on which revision, what it did and what the result was.**

* **End-to-end tracing**: a correlation ID links agent session → tool call → core transaction → external effect.
* **Audit logs**: record the human principal, agent identity, action, resource revision, authorization evidence and final result.
* **Eval-driven tool design**: evals are not the last step before launch. Starting with the minimum validation at the Value Gate, run real agents on representative tasks and iterate tool granularity, naming, descriptions and response formats from the results (see Anthropic, “Writing effective tools for agents — with agents”).
* **Evals**: run real agents on representative tasks and inject faults such as timeouts, duplicate requests, revision conflicts and Prompt Injection; measure task completion, rejected unauthorized actions, duplicate side effects, recovery, tokens and latency. These numbers must come from measurement, never from model inference.
* **Contract versions**: tools and schemas have version numbers and deprecation periods, so silent changes do not make deployed agents drift.

---

### The architect's one-sentence summary

> **Agent-Ready is a re-engineering of enterprise architecture that removes implicit dependence on the human brain.**
>
> It is not about any particular protocol. It is about **how a system establishes strongly deterministic contracts, state machines, trust boundaries, resource defenses and verifiable evidence for non-deterministic reasoning clients**, so that AI agents can still drive real business safely without a human watching over them.

---

## Status and boundaries
- **Project examples (from local project experience, not validated as public benchmarks)**: Bloomroom's on-demand `get_design_schema`; the `expected_revision` of Interior's `refine_design`.
- **Design recommendations**: the value premise and the architectural measures in dimensions one to seven; implementation order and acceptance criteria are in `../adoption/ARE-A01-agent-ready-implementation-checklist.md` (P0 Value Gate → P8 value review).
- **Hypotheses to be validated**: that an Agent-Ready core necessarily lowers end-to-end cost or raises task success; that Agent-Ready Engineering will become a standard engineering stage of enterprise AI transformation. The analogies above (working memory / L1 cache) are for understanding only, not performance models.
- **Positioning decision (Owner decision, 2026-11-12)**: focus on the execution layer of enterprise AI transformation, that is, Agent-Ready Engineering. Organization and talent, employee productivity, content analytics and general AI strategy are out of scope; only the interfaces to them are defined.

## Change log
- **v0.5 (2026-11-12)**: first English canonical version, translated from Chinese v0.4.2. No change in content. The Chinese text becomes the reading aid `ARE-P01-agent-ready-architecture.zh.md`.
- **v0.4.2**: maturity model available; status note in “Positioning and boundaries” updated.
- **v0.4.1**: standard deliverable templates available; status note in “Positioning and boundaries” updated.
- **v0.4**: added “Positioning and boundaries”: execution-layer standard; three boundary types (do / interfaces only / out of scope); standard deliverables.
- **v0.3**: value-first made part of the definition of Agent-Ready Engineering (premise: Value Gate); scope set to services and interfaces; added pre-authorization, tool definition change detection, eval-driven tool design.
- **v0.2**: corrected statements such as “agents have no vision at all”, “protocol dialects” and “overturning RBAC”; added idempotency, error contract, compensation, data/instruction separation, observability and evals.
