# Operation Contract — P2–P3
> Document ID: ARE-T03
> Fictional sample for tests. Example Manufacturing Co. does not exist.

## Basic information
| Item | Content |
| :--- | :--- |
| Operation name | confirm_order_change |
| Contract version / date | v1 / 2026-11-07 |
| Business intent | Apply a prepared delivery-date change and notify the supplier |
| Type | commit |
| Risk level | high |
| Responsible | Order team lead |

## 1. When to use / when not to use
- **Use**: after a human claim of a prepared change
- **Do not use**: to look at orders; use search_orders
- **Preconditions**: a prepared_id from prepare_order_change and a claim ID

## 2. Input
| Field | Type | Required | Unit / range / enum | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `idempotency_key` | string | yes | | scope: Owner + operation |
| `expected_revision` | integer | yes | | order revision |
| `prepared_id` | string | yes | | from prepare_order_change |

## 3. Output
| Field | Type | Notes |
| :--- | :--- | :--- |
| `revision` | integer | new revision |

## 4. Retries and concurrency
| Item | Agreement |
| :--- | :--- |
| Idempotency key scope | Owner + operation |
| Idempotency key retention | 7 days |
| Response to a repeated request | returns the original result |
| On revision conflict | rejects the write; returns the latest revision and a summary of differences |

## 5. Errors
| `code` | Meaning | `retryable` | `retry_after` | `hint` (what is missing / how to fix) |
| :--- | :--- | :--- | :--- | :--- |
| `revision_conflict` | the order has changed | no (re-read first) | — | re-read and prepare again |
| `claim_missing` | no human claim | no | — | ask the Owner to confirm |

## 6. Side effects and undo
- **Side effects**: outbound
- **Dry-run available**: prepare_order_change
- **Undo or compensation**: revert_order_change within 24 hours

## 7. Lifecycle (for long-running tasks)
Not applicable: completes within one request.

## 8. Draft (if applicable)
- **Expiry (TTL)**: 48 hours
- **Isolation**: drafts table, not visible to production planning
- **Cleanup**: nightly job

## 9. Acceptance record
| Check | Result | Evidence location |
| :--- | :--- | :--- |
| Replaying the same request N times produces the business effect once | ✅ | evidence/operation-contract-review.md |
| Writes with an outdated revision are rejected and return the latest revision | ✅ | evidence/operation-contract-review.md |
| A program can tell whether each error type is retryable | ✅ | evidence/operation-contract-review.md |
| Status can be recovered by ID after a disconnect | ❌ | not implemented |
