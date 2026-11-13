# Value Card — P0
> Document ID: ARE-T01
> Fictional sample for tests. Example Manufacturing Co. does not exist.

## Basic information
| Item | Content |
| :--- | :--- |
| Scenario name | Supplier invoice matching |
| Card version / date | v1 / 2026-11-03 |
| Business Owner | Finance Operations Lead (sample) |
| Prepared by | Sample Assessor |
| Scenario source | ARE-T08 screening, 2026-11-01 |

## 1. Specific scenario
- **Who**: Accounts payable clerk
- **In what situation**: A supplier invoice arrives that does not match the purchase order
- **Task to complete**: Find the matching order and goods receipt, explain the difference, prepare a correction
- **How often**: not measured
- **How it is done today**: Manual comparison across the ERP and email
- **Pain points**: Backlog at month end

## 2. Does it really need an agent
| Question | Yes / No | Notes |
| :--- | :--- | :--- |
| Requires understanding vague or natural-language intent | yes | sample |
| Requires multi-step planning or combining several systems | yes | sample |
| Cases vary widely and are hard to capture in fixed rules | yes | sample |
| A fixed script / rules engine / plain integration would solve it | no | sample |
| A better UI would solve it | no | sample |

**Conclusion**: needs an agent

## 3. Recurring value
- One-off or ongoing need: ongoing
- Who will use it again, and how often: the same team, every week

## 4. Measurable value hypothesis
| Metric | Current baseline | Baseline source | Target | How measured |
| :--- | :--- | :--- | :--- | :--- |
| Invoices cleared per day | not measured | — | to be set after measurement | ERP report |

## 5. Risk and responsibility
- **Worst case**: A wrong correction triggers an incorrect payment
- **Who bears the external consequences**: the business Owner
- **Involves money / outbound sending / irreversible operations**: yes
- **Is the risk proportionate to the value**: yes, with confirmation on final changes

## 6. Representative tasks (also the main eval cases later)
| ID | Task description | Expected result | Difficulty |
| :--- | :--- | :--- | :--- |
| T1 | Find the matching order and goods receipt, explain the difference, prepare a correction | A correct draft ready for human confirmation | Ambiguous requests |

## 7. Minimum validation
- **Method**: existing interfaces + human fallback
- **Participants**: two sample users, one agent host
- **Date**: 2026-11-05
- **Result**: the agent completed T1 on 3 of 5 sample cases; users want to use it again
- **Evidence location**: evidence/eval-report-2026-11-08.md

## 8. Decision
- **Decision**: go
- **First batch scope**: search_invoices, prepare_invoice_correction
- **Out-of-scope list**: payments and outbound supplier emails (human only)
- **Decided by / date**: business Owner / 2026-11-06

## 9. Review write-back (filled in at P8)
| Review date | Conclusion | Value review location |
| :--- | :--- | :--- |
| — | not reviewed yet | — |
