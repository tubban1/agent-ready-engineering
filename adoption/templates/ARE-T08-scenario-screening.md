# Scenario Screening — P0 (portfolio)
> Document ID: ARE-T08
> Template v0.2 | One per engagement or screening round | Copy into the workspace before filling in (`portfolio/`)
> Language: English (canonical). Chinese reading aid: `ARE-T08-scenario-screening.zh.md`.

A light first pass of the Value Gate over many candidate ideas at once. Screening is **not** a value card: every shortlisted scenario still needs a full value card (`ARE-T01-value-card.md`) before it moves on.

## Basic information
| Item | Content |
| :--- | :--- |
| Organization / client | <> |
| Screening version / date | <v1 / YYYY-MM-DD> |
| Source of the candidate list | <strategy list / workshop / business units / other> |
| Screened by | <name or role> |
| Reviewed with | <business stakeholders consulted> |

## Screening questions
| Code | Question | Values |
| :--- | :--- | :--- |
| N | Does it need an agent (vague intent, multi-step planning, combining systems, highly variable cases)? | yes / no / unclear |
| S | Would a simpler alternative solve it (fixed script, rules engine, plain integration, better UI, off-the-shelf tool)? | yes (name it) / no |
| R | Is the need recurring? | yes / no / unclear |
| V | Value potential | high / medium / low |
| K | Risk if it goes wrong (money, outbound sending, irreversible effects, data exposure) | high / medium / low |
| B | Basis of the V and K ratings | measured data / documents / interviews / assumption |

> V and K are judgments at this stage, not measurements. Always record their basis (B). Ratings based on “assumption” must be confirmed in the value card.

## Screening table
| ID | Candidate idea | Business owner | N | S | R | V | K | B | Result | Reason | Hand back to / revisit date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C1 | <example: handle supplier delivery-date changes> | <> | yes | no | yes | high | medium | interviews | shortlist | <> | — |
| C2 | <example: weekly sales summary email> | <> | no | yes (report scheduler) | yes | low | low | documents | hand-back | simpler alternative exists | <BI team> |
| C3 | <> | <> | | | | | | | defer | <> | <YYYY-MM-DD> |

Result values: `shortlist` (gets a value card) / `hand-back` (no agent needed; return to the appropriate workstream) / `defer` (revisit later).

## Summary
- **Shortlisted** (create a scenario folder and a value card for each): <IDs and names>
- **Handed back** (with destination): <IDs, destination, reason>
- **Deferred** (with revisit date): <IDs, date, what must change first>
- **Open questions for stakeholders**: <>

## Decision
- **Confirmed by / date**: <business decision maker>
