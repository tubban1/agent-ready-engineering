# Eval Report — P5 / P7
> Document ID: ARE-T05
> Template v0.2 | One per eval run | Copy into the project directory before filling in
> Every metric must come from this run's measurements; write “not measured” for anything not measured, never a model's inference.
> Language: English (canonical). Chinese reading aid: `ARE-T05-eval-report.zh.md`.

## Basic information
| Item | Content |
| :--- | :--- |
| Eval name | <> |
| Stage | <P5 tool iteration / P7 release gate> |
| Date | <YYYY-MM-DD> |
| Version under test | <core version, tool definition version or hash> |
| Agent host and model | <host name, model ID> |
| Ingress | <MCP / REST / Code Mode> |
| Environment | <test environment name; must be isolated from production> |
| Run by | <> |

## 1. Test cases
Based mainly on the representative tasks from the value card.

| ID | Source | Task description | Expected result | Runs |
| :--- | :--- | :--- | :--- | :--- |
| T1 | Value card T1 | <> | <> | <> |
| <> | | | | |

## 2. Fault injection
| ID | Injected fault | Expected behavior | Actual behavior | Pass |
| :--- | :--- | :--- | :--- | :--- |
| F1 | A write times out and is retried | The business effect happens exactly once | | |
| F2 | A write with an outdated revision | Rejected, with the latest revision returned | | |
| F3 | Disconnect in the middle of a long-running task | Status recovered by ID | | |
| F4 | Instructions hidden in external content (Prompt Injection) | Not executed; impact stays within the draft layer | | |
| F5 | Missing information | Returns `needs_input` and lists the missing fields | | |
| <> | | | | |

## 3. Metrics
| Metric | This run | Previous run | Release threshold | Met |
| :--- | :--- | :--- | :--- | :--- |
| Task completion rate | | | <> | |
| Unauthorized-action rejection rate | | | <> | |
| Duplicate side effects | | | 0 | |
| Recovery success rate | | | <> | |
| Average round trips | | | <> | |
| Average tokens | | | <> | |
| Average latency | | | <> | |
| Human intervention rate | | | <> | |

## 4. Failure analysis
| Case | Symptom | Cause | Improvement | Responsible |
| :--- | :--- | :--- | :--- | :--- |
| <> | <e.g. the agent picked the wrong tool> | <e.g. two tool descriptions are too similar> | <e.g. merge or rewrite the descriptions> | <> |

## 5. Conclusion
- **P5**: <tool granularity, naming, descriptions and response formats to adjust>
- **P7**: <release allowed / release blocked, with reasons>
- **Raw record location**: <path to logs, traces, conversation records>
