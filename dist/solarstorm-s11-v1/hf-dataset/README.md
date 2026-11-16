---
license: cc-by-4.0
language:
- en
- zh
pretty_name: ARE Solarstorm MCP Public Evidence (2026-11-16)
tags:
- mcp
- ai-agents
- reliability
- reproducibility
size_categories:
- n<1K
---

# ARE Solarstorm MCP Evaluation — Evidence Dataset

Independent World2 / Agent-Ready Engineering limited public-read-only case.
Not official MCP certification, provider endorsement, security assessment, or a multi-run benchmark.

- 39 ARE checks: 4 PASS, 2 FAIL against ARE optional design criteria, 10 N/A, 23 NOT_VERIFIED.
- 4 of 4 public read-only tools inspected and actually called.
- Bounded MCP 2026 checks: 9 PASS, 0 FAIL, 1 UNKNOWN, 1 N/A.
- Public repository source snapshot: 55 offline and 9 live NOAA tests passed; production source binding UNKNOWN.
- One real Claude Agent run called 4 MCP tools. This is a single example, not a reliability rate.
- NOAA comparisons: 2 matched at capture and 1 instantaneous X-ray reading differed;
  the GOES peak class matched. All time-dependent values are dated.
- No ARE maturity level was established.

Dataset files: checks.jsonl (39 rows), tools.jsonl (4), oracle.jsonl (3), case_summary.json.
Open technical report: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
Public safe reproduction prompt: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-public-replay-2026-11-16.md

The snapshot source reported 1.0.3 while the live service reported 1.0.0; source-to-production identity is unverified.
A domain-invalid latitude reported an error text while MCP isError was false; this is an ARE
contract improvement suggestion, NOT an official MCP MUST violation.

License CC BY 4.0 applies only to ARE's original evaluation records/explanations,
not to the Solarstorm repository or external NOAA data.
