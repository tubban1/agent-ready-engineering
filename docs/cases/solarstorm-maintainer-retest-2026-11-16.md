# Solarstorm MCP — private maintainer retest prompt

For the verified owner of Solarstorm MCP ONLY. **Do not resend the initial ARE report automatically.**

```text
I maintain the MCP Solarstorm MCP at https://mcp.solarstorm.today/mcp.
Review the independent, limited-scope ARE report: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
Public source inspected: https://github.com/newminya/solarstorm-mcp at 6d0fed8c9ec43bc2b2efb2fe94be81c45e66d650 (source version 1.0.3).
Reported live server version: 1.0.0; deployed-source binding: UNVERIFIED.

Specific ARE finding: solarstorm-20261116-domain-error — ARE_DESIGN_RECOMMENDATION_NOT_PROTOCOL_MUST
Tool / safe input: get_aurora_visibility / {latitude: 999}
Observed: A domain validation error message was returned with MCP isError=false; missing required latitude returned isError=true.
Potential improvement: Consider consistent machine-readable tool error semantics; confirm which source revision matches deployed 1.0.0.
This is NOT an official MCP protocol MUST violation unless separately demonstrated.

1. Inspect the corresponding handler in the actual deployed source version and clarify this version mapping.
2. Reproduce the exact input safely in your own controlled environment. Capture the raw MCP tool result, including isError and any structured details.
3. Decide if the behavior is intended, a design improvement, or a defect; do not alter production on an outside reviewer's assertion.
4. If you approve a fix, work on a branch and run targeted validation and existing regression tests. Re-run a real Agent task if agent behavior may change.
5. Report baseline vs new commit/deployment, observed error envelopes, unit tests, independent success condition and any remaining limitations.
6. Ask ARE for independent post-fix recheck using https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md. Do not falsely claim external certification or disclose credentials.
```
