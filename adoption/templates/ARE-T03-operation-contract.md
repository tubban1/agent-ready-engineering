# Operation Contract — P2–P3
> Document ID: ARE-T03
> Template v0.3 | One per first-batch operation | Copy into the project directory before filling in
> The contract lives in the domain core; MCP / REST / Code Mode only map it and never change it.
> Language: English (canonical). Chinese reading aid: `ARE-T03-operation-contract.zh.md`.

## Basic information
| Item | Content |
| :--- | :--- |
| Operation name | <e.g. confirm_order_change> |
| Contract version / date | <v1 / YYYY-MM-DD> |
| Business intent | <one sentence: what business outcome this operation achieves> |
| Type | <read / validate / draft / commit> |
| Risk level | <low / medium / high, same as the capability matrix> |
| Responsible | <> |

## 1. When to use / when not to use
- **Use**: <>
- **Do not use**: <e.g. to view an order only, use search_orders>
- **Preconditions**: <e.g. requires a prepared_id returned by prepare>

## 2. Input
| Field | Type | Required | Unit / range / enum | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `idempotency_key` | string | yes | | required for writes; see section 4 |
| `expected_revision` | integer | yes | | required for mutable resources; see section 4 |
| <> | | | | |

## 3. Output
| Field | Type | Notes |
| :--- | :--- | :--- |
| `revision` | integer | new revision after the write |
| `operation_id` | string | returned for long-running tasks, used to query status |
| <> | | |

- **Fields returned by default**: <list; others via `fields` projection>
- **Response size limit**: <e.g. beyond the limit, return `truncated: true` and `next_cursor`>
- **Data source and time**: <does the response carry source, update time, trust level>

## 4. Retries and concurrency
| Item | Agreement |
| :--- | :--- |
| Idempotency key scope | <Owner / agent / operation> |
| Idempotency key retention | <> |
| Response to a repeated request | returns the original result |
| On revision conflict | rejects the write; returns the latest `revision` and a summary of differences |

## 5. Errors
| `code` | Meaning | `retryable` | `retry_after` | `hint` (what is missing / how to fix) |
| :--- | :--- | :--- | :--- | :--- |
| `revision_conflict` | the resource has changed | no (re-read first) | — | re-read and decide based on the latest revision |
| `needs_input` | information missing | no (resubmit after supplying it) | — | list the missing fields |
| `rate_limited` | quota exceeded | yes | <seconds> | — |
| <> | | | | |

## 6. Side effects and undo
- **Side effects**: <none / internal write / outbound sending / involves money>
- **Dry-run available**: <name of the matching validate operation>
- **Undo or compensation**: <matching undo operation, or state that it is irreversible>

## 7. Lifecycle (for long-running tasks)
| State | Meaning | Can move to |
| :--- | :--- | :--- |
| `accepted` | received, not started | running / cancelled |
| `running` | in progress | partial / completed / failed / cancelled |
| `partial` | partly done, with per-item receipts | completed / failed |
| `completed` | done, with evidence of the result | — |
| `failed` | failed, with an error | — |
| `cancelled` | cancelled | — |
| `unknown` | cannot be confirmed (e.g. no receipt from an external system) | needs manual verification |

- **Status query**: <operation name, e.g. get_operation_status>
- **Cancel**: <operation name>
- **Recovery after disconnect**: <query by operation_id>

## 8. Draft (if applicable)
- **Expiry (TTL)**: <>
- **Isolation**: <how drafts are isolated from committed data>
- **Cleanup**: <>

## 9. Acceptance record
| Check | Result | Evidence location |
| :--- | :--- | :--- |
| Replaying the same request N times produces the business effect once | | |
| Writes with an outdated revision are rejected and return the latest revision | | |
| A program can tell whether each error type is retryable | | |
| Status can be recovered by ID after a disconnect | | |
