# Capability Matrix — P1
> Document ID: ARE-T02
> Fictional sample for tests. Example Manufacturing Co. does not exist.

## Basic information
| Item | Content |
| :--- | :--- |
| Project / system | Order service (sample) |
| Matrix version / date | v1 / 2026-11-06 |
| Related value card | ARE-T01-value-card.md v1 |
| First batch cap | 3 operations |

## Matrix
| Operation | Type | Side effects | Undoable | Risk level | Frequency of use | Value contribution | Re-engineering cost | Current problems | Owner | Approver | Responsible | Data dependencies | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| search_orders | read | none | n/a | low | every task (sample eval) | high | low | fixed pagination | Head of Purchasing | — | Order team lead | order database | first-batch |
| prepare_order_change | draft | internal-write | yes | medium | every task (sample eval) | high | medium | none yet (new) | Head of Purchasing | Head of Purchasing | Order team lead | order database | first-batch |
| confirm_order_change | commit | outbound | compensable | high | every task (sample eval) | high | high | split from update_order | Head of Purchasing | Head of Purchasing | Order team lead | order database, supplier interface | first-batch |
| export_order_history | read | none | n/a | low | not measured | low | low | responses too large | Head of Purchasing | — | Order team lead | order database | waiting-pool |

## Split list (catch-all executors)
| Original interface | Actions mixed together | Operations after splitting |
| :--- | :--- | :--- |
| update_order | change fields, cancel, notify supplier | prepare_order_change / confirm_order_change |
