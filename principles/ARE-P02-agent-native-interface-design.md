# Agent-Native Interface Design
> Document ID: ARE-P02
> v0.2 | 2026-11-12 | Native interface design for agents
> Language: English (canonical). Chinese reading aid: `ARE-P02-agent-native-interface-design.zh.md`. Terms follow `../references/ARE-R03-glossary.md`.

## Research proposition
Having an API does not make it suitable for agents. APIs have usually served UIs and humans working screen by screen. Agents need to discover, understand, execute, recover and verify services around real goals.
**Agent-native does not mean wrapping existing APIs in MCP, and it certainly does not mean letting agents operate without limits.**

### Paradigm shift: from human-computer interaction to contracts for agents
Software systems have traditionally been designed around human-computer interaction:
> **Human understands the interface → human chooses an action → software executes → human interprets the result**

The agent era requires an explicit software contract instead:
> **Agent discovers capabilities → understands semantics and boundaries → obtains authorization → executes → verifies the result → recovers when needed**

The many intermediate steps once carried by human judgment, memory and responsibility must become structured, machine-facing contracts: a shift from data interfaces built for page display to interfaces built around **tasks, queries, state and evidence**.

### Traditional APIs vs. APIs better suited to agents
A web page returns 10–20 records at a time because humans browse page by page. An agent's goal is different: it may need to find the 37 records that meet several conditions among 100,000 and give a traceable basis for its judgment. This does not mean an agent API should drop pagination and return 100,000 records; it needs server-side filtering and stable cursors.

| Dimension | Typical traditional API | API better suited to agents |
| :--- | :--- | :--- |
| **Data retrieval** | Fixed pagination, browsing page by page | Server-side filtering, sorting, field selection, cursors and batch reads |
| **Query expression** | Queries limited to predefined page functions | Structured conditions and combined queries |
| **Results** | Data shaped for rendering a UI | Structured data with source, time and stable references |
| **Operation granularity** | One low-level action per request | Business-level operations with clear boundaries |
| **Long-running tasks** | Returns when the HTTP request completes | Returns a task ID, with progress queries, cancellation and recovery |
| **Repeated requests** | May create or modify twice | Idempotency keys, conditional versions, conflict detection |
| **Error handling** | Error codes or message text | Error types a program can interpret and recover from, with conditions for the next step |
| **Permissions** | Account or API token permissions | Bound to Owner, agent, action, resource, validity period and approval evidence |
| **Batch operations** | Many calls, one item at a time | Bounded batches with partial failure and per-item receipts |
| **State synchronization** | Repeated polling | Incremental changes, subscriptions, cursors, event notifications |
| **Capability discovery** | Developers read API documentation | Machine-readable schemas, effect declarations and preconditions |
| **Verifiability** | HTTP 200 or a business success flag | Distinguishes request accepted, execution result and evidence of external outcome |

Over the past decade, mobile internet and front-end componentization (React/Vue) meant that much of the industry's API output was “specialized for human eyes, screen by screen”:

whatever a page needs to show, the backend builds an interface with hundreds of loosely organized display fields;
pagination is hard-coded as page=1&size=20 because a human can only look at 20 items per page;
interfaces have no idempotency key because the front end simply disables the button after a click;
errors return only a human-readable message string because showing a toast to a person is enough.

When humans call APIs, the human brain quietly acts as the “implicit exception handler, bearer of responsibility and context reasoner”.

When an agent connects to the system as an independent decision maker, these human-oriented shortcomings are magnified at once: the agent pages blindly through 100 pages and burns tokens, places duplicate orders and charges on a flaky network because there is no idempotency, and loops forever because it cannot interpret an error.

The measures in the table are therefore, first of all, “the minimum viable baseline for machine-autonomous use (Agent-Ready Baseline)”. Running agents on a system without cursors, idempotency and explicit state is like building a tower on sand.

### Four deeper design changes
1. **Agents operate on goals, not page actions**: for example, “create a purchase order draft and verify stock” is more robust than having an agent work a dozen buttons. But business-level tools must bound their side effects and must not turn into opaque catch-all executors.
2. **Machine-readable semantics and trustworthiness of data**: is a supplier price a quote, a forecast or a confirmed contract price? Does it include tax? When is it valid? This implicit information, once inferred by humans from page context, must become an explicit contract machines can understand.
3. **Recoverable operation design**: after a disconnect or failure, an agent should be able to check whether the original request was executed, instead of retrying blindly and causing duplicate purchases, emails or payments.
4. **Budget-controlled resource access**: machine-facing interfaces must support result limits, cost estimates, call quotas, asynchronous execution and cancellation, so an agent stuck in an error loop cannot exhaust resources.

## Design principles (recommendations; not validated industry laws)
1. **Value first**: prove the outcome specific users need repeatedly before building a general platform. Do not start with a grand interface covering every scenario.
2. **Intent-oriented but bounded**: provide operations with clear business meaning, and bound their side effects, preconditions, objects and permissions. Avoid an all-powerful `execute(anything)`.
3. **Progressive discovery**: fetch precise operation descriptions, input/output schemas and risk categories on demand, instead of putting every tool definition into the model context. Discovering a capability does not grant permission to call it.
4. **Machine-first retrieval**: server-side filtering, structured queries, field projection, stable cursors, batch requests and reasonable query quotas, not only 10–20 items per page fixed for human UIs. Never dump unbounded data.
5. **Semantic contracts**: make units, source, update time, version, trust level, missing values and business preconditions explicit. Distinguish publisher claims, system observations, independent verification and external completion.
6. **Observable lifecycle**: distinguish at least accepted / queued / claimed / running / partial / completed / failed / cancelled / unknown, based on what the system can actually observe; never fabricate execution facts. A transport ACK is not native agent execution.
7. **Recovery by design**: idempotency keys, binding requests to effects, state reads, conditional writes (CAS / version), cancellable tasks, safe repeated requests, per-item receipts for partial success.
8. **Authority as separate layers**: verify authentication, agent credentials, host permissions, the Owner's per-action approval and external sharing permission separately; an agent self-reporting `owner_confirmed:true` never replaces human-verifiable approval.
9. **Declarative side effects**: tools explicitly declare read / private write / external effect / Owner-only or irreversible; one tool should not blur actions of different risk.
10. **Safe composition**: agents may plan and Code Mode may compose calls, but every business sub-operation must be verified independently by the server; code sandboxes get no direct access to secrets, private files or arbitrary network egress.
11. **Resource efficiency**: budgets / rate limits, incremental sync, summaries plus stable references, fine-grained progress; compare task success rate, model round trips, context consumption and latency, not the number of tools.
12. **Host portability**: work with different models and MCP clients; do not assume any closed host can be woken up proactively; the relationship with a host's native sessions needs to be verified on real systems.

## API redesign example
**Traditional UI API:** `GET /orders?page=1&page_size=20` returns one page of order cards.
**Agent-native query:** `search_orders({status, date_range, fields, cursor, limit})` returns explicit units / source / timestamps / stable order_id. Pagination remains, with reliable server-side filtering and query quotas.
**Agent-native action:** `prepare_cancellation({order_id, expected_revision})` returns the required conditions and possible side effects; with authorization, call `confirm_cancellation({prepared_id, approval_receipt, idempotency_key})`; then `get_operation_status({operation_id})` verifies the real result. This example is a suggested business contract, not an existing World2 interface.

## Principles for cross-Owner collaboration
Do not aim for a “complete shared collaboration platform” first. First validate one useful, safe exchange of information that both sides understand between two real Owners and their agents, and test whether it has recurring value. Identity, permission, personal-information boundaries, revocation and delivery evidence must each hold on their own.

## Learning / testing path
Take one real business scenario and compare a traditional API / a plain MCP wrapper / an agent-native design, with the same model, user goal, permission conditions and fault injection; measure end-to-end task completion, rejected unauthorized actions, duplicate side effects, recovery rate, tokens, latency and whether users want to use it again.

## Status and boundaries
- **Observed (project experience)**: World2's eight tools face review pressure from mixed effects / nested sub-operations; native agent wake-up, webhooks, ACKs and task completion can be separate; an Owner's agent self-reporting consent is not independent authorization evidence.
- **Design recommendations**: a unified operation registry, fine-grained declarations by business meaning, provable authorization and server-side execution constraints.
- **Hypotheses to be validated**: that agent-native interfaces necessarily raise task success / lower cost; that MCP becomes the only standard in every environment; that Code Mode is equivalent to task-level tools in OpenAI's public listing review. None of these may be presented as established fact.

## Change log
- **v0.2 (2026-11-12)**: first English canonical version, translated from Chinese v0.1. No change in content. The Chinese text becomes the reading aid `ARE-P02-agent-native-interface-design.zh.md`.
- **v0.1 (2026-11-11)**: first version.
