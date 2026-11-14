# Authorization Matrix — P4
> Document ID: ARE-T04
> Fictional sample for tests. Example Manufacturing Co. does not exist.

## Basic information
| Item | Content |
| :--- | :--- |
| Project / system | Order service (sample) |
| Matrix version / date | v1 / 2026-11-08 |
| Related capability matrix | ARE-T02-capability-matrix.md v1 |
| Approver (governance) | Sample Governance Board |

## Matrix
| Operation | Risk level | Authorization level | Form of confirmation | Confirmation channel | Amount / frequency limits | Credential scope and validity | Audit evidence fields | Revocation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| search_orders | low | A | — | — | 500 queries per day | read-only, 1 hour | principal, agent, query conditions | revoke the agent credential |
| prepare_order_change | medium | A | — | — | 50 drafts per day | drafts only, 1 hour | principal, agent, draft ID | revoke the agent credential |
| confirm_order_change | high | B | claim | web confirmation link | 20 per day | order changes only, 1 hour | principal, agent, draft ID, revision, claim ID | revoke the agent credential / void the draft |
