# Capability Matrix — P1
> Document ID: ARE-T02
> Template v0.2 | One per project, optionally sectioned by scenario | Copy into the project directory before filling in
> Language: English (canonical). Chinese reading aid: `ARE-T02-capability-matrix.zh.md`.

## Basic information
| Item | Content |
| :--- | :--- |
| Project / system | <> |
| Matrix version / date | <v1 / YYYY-MM-DD> |
| Related value card | <scenario name and card path> |
| First batch cap | <e.g. at most N operations this round> |

## Field definitions
| Field | Values |
| :--- | :--- |
| Type | read-only query / validation (dry-run) / draft / final commit |
| Side effects | none / internal write / outbound sending / involves money |
| Undoable | yes / compensable / irreversible |
| Risk level | low / medium / high (sets the level in the authorization matrix) |
| Frequency of use | times used in representative tasks or real call records; “not measured” if there is no data |
| Value contribution | which value-card metric it contributes to: high / medium / low |
| Re-engineering cost | high / medium / low (with a short reason) |
| Current problems | catch-all executor / no idempotency / no revision / errors not interpretable / responses too large / no status query, etc. |
| Decision | first batch / waiting pool / not exposed to agents |

## Matrix
| Operation | Type | Side effects | Undoable | Risk level | Frequency of use | Value contribution | Re-engineering cost | Current problems | Owner | Approver | Responsible | Data dependencies | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| <example: search_orders> | read-only query | none | — | low | <> | high | low | fixed pagination, too many fields returned | <> | — | <> | order database | first batch |
| <example: update_order> | final commit | outbound sending | compensable | high | <> | high | high | catch-all executor, no idempotency | <> | <> | <> | order database, supplier interface | first batch (needs split) |
| <> | | | | | | | | | | | | | |

## Split list (catch-all executors)
| Original interface | Actions mixed together | Operations after splitting |
| :--- | :--- | :--- |
| <example: update_order> | change fields, cancel, notify supplier | `prepare_order_change` / `confirm_order_change` / `notify_supplier` |

## First batch and rationale
- **First batch**: <list of operations>
- **Ranking rationale**: <why these first: frequency, value contribution, risk, cost>
- **Waiting pool**: <list of operations, to be decided with P8 review data>
- **Not exposed to agents**: <list of operations and reasons>

## Requirements on other layers
- **Organization**: <which operations lack an Owner / approver / responsible person>
- **Data layer**: <data sources, quality requirements and access rights to agree on>
