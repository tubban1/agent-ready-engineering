# ARE: two independent assessment tracks

## Track A — Official MCP protocol conformance profile
- Version pinned to **2026-07-28**, official primary authority: https://modelcontextprotocol.io/specification/2026-07-28/
- Machine-readable subset of MUST/SHOULD rules: [mcp-2026-07-28.rules.json](mcp-2026-07-28.rules.json).
- Real tests must inspect transport wire responses, including version negotiation, `server/discover`, per-request metadata, HTTP headers, result envelopes, list-cache metadata and Origin validation.
- Run `node mcp/conformance/probe.mjs https://are.fde.fan/mcp`. It **never calls third-party tools**; it only reads protocol metadata and public lists. Local suite: `npm test --prefix mcp`.
- Rules marked UNKNOWN/NOT_APPLICABLE are **not passes**. Optional extensions and OAuth are not tested by the public anonymous profile. This is not a full official MCP certification.

## Track B — ARE engineering readiness / L0–L4
- Canonical source: [ARE-A02](../adoption/ARE-A02-agent-ready-maturity-model.md) and [ARE-P02](../principles/ARE-P02-agent-native-interface-design.md).
- Machine-readable domain view: [are-engineering.rules.json](are-engineering.rules.json). The existing 39 checks still live in `data/checks.yaml` and remain authoritative.
- Requires scenario-specific evidence: actual task end state, independent audit, meaningful authorization, versioned retries, idempotence, stale-write conflicts, and measured agent effectiveness.
- Do **not** turn a protocol-pass into an L3/L4 business certification. Do **not** treat failure of an ARE design recommendation as a violation of MCP protocol.
- The ARE Benchmark 0–100 preliminary endpoint assessment is a separate opt-in scoring product, also **not** the maturity model and not formal MCP certification.

## Reporting shape
```json
{
  "protocol": { "version": "2026-07-28", "profile": "public-readonly-streamable-http", "result": "PASS_WITH_UNTESTED_AREAS", "findings": [] },
  "engineering": { "scenarioId": null, "L0toL4": "NOT_ASSESSED", "evidence": [] },
  "sourceToDeploymentVerified": false,
  "officialCertification": false
}
```

## Evidence rules and provenance
- Distinguish **local source**, **local test**, and **deployed HTTP evidence**. A local test cannot prove production deployment.
- Use pinned commit SHA, protocol version, request/response evidence, client implementation and sample timestamps.
- Never certify third-party services without identity/ownership proof, maintainer consent for nontrivial tests, independent task results and reproducible artifacts.
- Reviewed using official MCP specs on November 15, 2026. Review after every official March/September release.
