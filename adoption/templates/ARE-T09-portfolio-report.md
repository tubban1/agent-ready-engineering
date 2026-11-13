# Portfolio Report and Roadmap
> Document ID: ARE-T09
> Template v0.2 | One per assessment round | Copy into the workspace before filling in (`portfolio/`)
> Built from the scenario maturity assessments (`ARE-T07-maturity-assessment.md`) of this round. Rules are in `../ARE-A02-agent-ready-maturity-model.md`.
> Language: English (canonical). Chinese reading aid: `ARE-T09-portfolio-report.zh.md`.

> **Do not average scenarios into one enterprise score.** Report the distribution, the inconsistencies and the recurring gaps instead.

## Basic information
| Item | Content |
| :--- | :--- |
| Organization / client | <> |
| Report version / date | <v1 / YYYY-MM-DD> |
| Assessment round | <e.g. 2026-Q4> |
| Scenarios included | <number and IDs> |
| Prepared by / reviewed by | <> |
| Related screening | <path to ARE-T08 and its version> |

## 1. Scope and method
- **Scenarios assessed and assessment dates**: <>
- **Evidence collected**: <how evidence was requested and from whom>
- **Limitations**: <scenarios not assessed, evidence not available, systems not inspected>

## 2. Level distribution
| Scenario | Value card decision | Current level | Target level | Currently exposed to agents | Consistent with level | Weak dimensions | Passes: inspected / documented |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| <Scenario A> | <Go> | <L2> | <L3> | <read-only> | <yes> | <A, S> | <12 / 9> |
| <Scenario B> | <read-only first> | <L1> | <L2> | <none> | <yes> | <X> | <3 / 4> |
| <> | | | | | | | |

- **≥ L2 (may expose read-only)**: <count of scenarios>
- **≥ L3 (may expose writes)**: <count of scenarios>
- **L4 (may scale up)**: <count of scenarios>

## 3. High-risk inconsistencies (fix first)
Scenarios where what is exposed today goes beyond what the level allows (for example, writes exposed below L3).

| Scenario | Exposed today | Level | Failed checks behind the gap | Immediate action | Responsible |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <> | | | | <e.g. switch to read-only until L3-A2 passes> | |

## 4. Recurring weak dimensions → platform-level recommendations
A dimension whose checks block the next level in several scenarios is better solved once at platform level.

| Dimension | Scenarios affected | Failed checks | Proposed shared capability | Expected effect |
| :--- | :--- | :--- | :--- | :--- |
| <A Authority and Trust> | <A, C, D> | <L3-A1, L3-A4> | <shared delegated-credential and kill-switch service> | <which checks it would let those scenarios pass> |

## 5. Evidence quality
- **Passes by evidence type**: <inspected n / documented n> (self-reported statements never count as a pass)
- **Checks passed on documents only where inspection is recommended** (L3-C1, L3-C2, L3-A2, L3-O2): <scenario and check IDs>
- **Planned inspections**: <what will be verified directly, when, by whom>

## 6. Roadmap
| Horizon | Item (scenario or platform capability) | Why now (value, gap, risk) | Target level / outcome | Responsible | Target date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Now | <fix high-risk inconsistency in Scenario A> | <> | <> | <> | <> |
| Next | <shared delegated-credential service> | <> | <> | <> | <> |
| Later | <> | <> | <> | <> | <> |

## 7. Handoffs
| To | What is handed over | Decision or action requested |
| :--- | :--- | :--- |
| Decision makers | Roadmap, scenarios to start / stop | <> |
| Governance | Authorization matrices, risk levels, audit evidence | <approvals needed> |
| Implementation teams | Per-scenario gap lists (failed checks and next steps) | <> |
| Organization | Missing Owners / approvers / responsible persons | <> |
| Data layer | Data source, quality and access agreements needed | <> |

## 8. Changes since the previous round
| Scenario | Previous level | Current level | Checks newly passed | Checks newly failed |
| :--- | :--- | :--- | :--- | :--- |
| <> | | | | |

## 9. Handed back and deferred
From the scenario screening: <IDs handed back with destination; deferred IDs with revisit dates>
