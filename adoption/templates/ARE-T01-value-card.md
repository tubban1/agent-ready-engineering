# Value Card — P0
> Document ID: ARE-T01
> Template v0.3 | One per candidate scenario | Copy into the project directory before filling in
> Language: English (canonical). Chinese reading aid: `ARE-T01-value-card.zh.md`.

## Basic information
| Item | Content |
| :--- | :--- |
| Scenario name | <e.g. Handling supplier order changes> |
| Card version / date | <v1 / YYYY-MM-DD> |
| Business Owner | <person or role accountable for the outcome> |
| Prepared by | <name or role> |
| Scenario source | <strategy list / proposed by a business unit / other> |

## 1. Specific scenario
- **Who**: <real user role, e.g. purchasing specialist>
- **In what situation**: <trigger, e.g. a supplier writes asking to change the delivery date>
- **Task to complete**: <the final outcome in one sentence>
- **How often**: <frequency + data source; write “not measured” if there is no data>
- **How it is done today**: <current process, systems and people involved>
- **Pain points**: <time spent, errors, waiting, omissions; be as specific as possible>

## 2. Does it really need an agent
| Question | Yes / No | Notes |
| :--- | :--- | :--- |
| Requires understanding vague or natural-language intent | | |
| Requires multi-step planning or combining several systems | | |
| Cases vary widely and are hard to capture in fixed rules | | |
| A fixed script / rules engine / plain integration would solve it | | |
| A better UI would solve it | | |

**Conclusion**: <needs an agent / does not (hand back to: off-the-shelf tool / plain integration / UI improvement / other)>

## 3. Recurring value
- One-off or ongoing need: <>
- Who will use it again, and how often: <>

## 4. Measurable value hypothesis
| Metric | Current baseline | Baseline source | Target | How measured |
| :--- | :--- | :--- | :--- | :--- |
| <e.g. time per case> | <measured value or “not measured”> | <logs / sampled records / system reports> | <target> | <how it is collected> |
| <e.g. number of manual reworks> | | | | |

> Without a baseline, measure it first. Do not write benefit figures that cannot be verified.

## 5. Risk and responsibility
- **Worst case**: <e.g. a wrong order change causes a breach of contract>
- **Who bears the external consequences**: <>
- **Involves money / outbound sending / irreversible operations**: <>
- **Is the risk proportionate to the value**: <judgment and reasons>

## 6. Representative tasks (also the main eval cases later)
| ID | Task description | Expected result | Difficulty |
| :--- | :--- | :--- | :--- |
| T1 | <> | <> | <> |
| T2 | <> | <> | <> |

## 7. Minimum validation
- **Method**: <existing interfaces + human fallback / read-only prototype / other>
- **Participants**: <real users, the agent host and model used>
- **Date**: <>
- **Result**: <did the agent complete the representative task, where did it get stuck, do users want to use it again>
- **Evidence location**: <path to records, logs or recordings>

## 8. Decision
- **Decision**: <go / read-only-first / not-now> (`go` includes writes)
- **First batch scope**: <business capabilities involved, passed to the capability matrix>
- **Out-of-scope list**: <what is explicitly excluded, and why>
- **Decided by / date**: <>

## 9. Review write-back (filled in at P8)
| Review date | Conclusion | Value review location |
| :--- | :--- | :--- |
| | <expand / maintain / shrink / retire> | |
