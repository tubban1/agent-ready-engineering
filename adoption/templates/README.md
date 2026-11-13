# Agent-Ready Engineering Standard Deliverable Templates
> Document ID: ARE-T00
> v0.5 | 2026-11-13 | Related: `../ARE-A01-agent-ready-implementation-checklist.md` (P0–P8), `../ARE-A02-agent-ready-maturity-model.md` (L0–L4)
> Language: English (canonical). Chinese reading aid: `README.zh.md`. Each template also has a `.zh.md` reading aid. Terms follow `../../references/ARE-R03-glossary.md`.

## Rules of use
- Each project **copies the templates it needs into its own directory** (for example `docs/agent-ready/`) before filling them in. Do not write project data back into this repository.
- Every number needs a source (measurement, logs, real records). Without data, write “not measured” instead of an estimate.
- `<angle brackets>` mark fields to fill in; “example” rows only show how to fill them and are deleted after copying.
- Every deliverable carries a version and date; when its content changes, update the version instead of rewriting silently.
- Fill templates in English or Chinese as the project prefers, but keep IDs (check IDs, stage IDs, field names) unchanged.

## Templates and stages
| Template | Stage | Question it answers | Granularity |
| :--- | :--- | :--- | :--- |
| `ARE-T01-value-card.md` Value Card | P0 | Is it worth having an agent do this? | One per scenario |
| `ARE-T02-capability-matrix.md` Capability Matrix | P1 | Which operations are involved? Which come first? | One per project, optionally sectioned by scenario |
| `ARE-T03-operation-contract.md` Operation Contract | P2–P3 | How is this operation made retry-safe, recoverable and interpretable? | One per first-batch operation |
| `ARE-T04-authorization-matrix.md` Authorization Matrix | P4 | Who authorizes, how far can the agent go, how is evidence kept? | One per project |
| `ARE-T05-eval-report.md` Eval Report | P5 / P7 | How do agents actually perform? Can we release? | One per eval run |
| `ARE-T06-value-review.md` Value Review | P8 | Was the value delivered after launch? Expand, maintain or shrink? | One per scenario per review cycle |
| `ARE-T07-maturity-assessment.md` Maturity Assessment | Any stage | Which level are we at? What is missing? How far can we expose it? | One per scenario per assessment |
| `ARE-T08-scenario-screening.md` Scenario Screening | P0 (portfolio) | Which of many candidate ideas deserve a value card? | One per engagement or screening round |
| `ARE-T09-portfolio-report.md` Portfolio Report and Roadmap | Each assessment round | What is the distribution, where are the risks and shared gaps, what comes next? | One per assessment round |

## Machine-readable values
Local checks read filled templates, so some fields use fixed values. Use them in English and Chinese files alike; they are identifiers and are never translated.

| Field | Values | Where |
| :--- | :--- | :--- |
| Check result | `✅` pass / `❌` fail / `➖` not applicable | ARE-T07 |
| Evidence type | `inspected` / `documented` (`self-reported` never passes) | ARE-T07 |
| Currently exposed to agents | `none` / `read-only` / `write` | ARE-T07 |
| Level | `L0`–`L4` | ARE-T07, ARE-T09 |
| Value card decision | `go` / `read-only-first` / `not-now` | ARE-T01 §8 |
| Screening result | `shortlist` / `hand-back` / `defer` | ARE-T08 |
| Dates | `YYYY-MM-DD` (also in file names) | all |

## Workspace layout
Local tools (and the MCP entry's local checks) find deliverables by these paths, so keep the names.

```
engagements/<organization>/          # architects / consultants: one workspace per engagement, kept locally
  portfolio/
    ARE-T08-scenario-screening.md
    ARE-T09-portfolio-report-<round>.md
  scenarios/<scenario-slug>/
    ARE-T01-value-card.md
    ARE-T02-capability-matrix.md
    ARE-T03-operation-contract-<operation>.md
    ARE-T04-authorization-matrix.md
    ARE-T05-eval-report-<date>.md
    ARE-T06-value-review-<date>.md
    ARE-T07-maturity-assessment-<date>.md
    evidence/                        # artifacts received from the client, referenced by evidence location
```
- In a single project repository, put one scenario's files directly in `docs/agent-ready/` with the same names.
- Client data stays in this local workspace. It is never sent to the shared knowledge source or a remote MCP service.

## How the deliverables connect
```
Value Card ──▶ Capability Matrix ──▶ Operation Contract ──▶ Authorization Matrix
    ▲            (prioritize)            (P2–P3)                  (P4)
    │                                                               │
Value Review ◀──────────────── Eval Report ◀────────────────────────┘
 (P8: conclusions written back to the value card; expanded capabilities return to the capability matrix)
```
- The value card's **representative tasks** are the main test cases of the eval report.
- The value card's **baseline and target** are what the value review compares against.
- The capability matrix's **risk level** determines the authorization level in the authorization matrix.
- The operation contract's **error codes and states** are what fault injection checks.
- With several scenarios, the **scenario screening** decides which get value cards, and the **portfolio report** aggregates their maturity assessments each round.

## Interfaces with other layers
| Deliverable | Handed to / received from |
| :--- | :--- |
| Value card | Candidate scenarios received from strategy; “no agent needed” conclusions handed back to the appropriate workstream |
| Authorization matrix, audit evidence | Handed to governance |
| Owner / approver / responsible person in the capability matrix | Requirements placed on the organization |
| Data dependencies in the capability matrix | Agreed with the data layer |

## Change log
- **v0.5 (2026-11-13)**: added machine-readable values (results, evidence types, exposure, decisions, screening results, dates); ARE-T07 gained the exposure field.
- **v0.4 (2026-11-12)**: added ARE-T08 Scenario Screening and ARE-T09 Portfolio Report and Roadmap; added the workspace layout.
- **v0.3 (2026-11-12)**: first English canonical version, translated from Chinese v0.2; added the rule on the language of filled-in templates. The Chinese text becomes `README.zh.md`.
