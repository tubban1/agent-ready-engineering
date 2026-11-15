# ARE Benchmark self-assessment API

Status: P0 early public preflight; not a formal ARE maturity verifier or official OpenAI/Anthropic submission reviewer.

Production Neon Function: project \`are-evaluations\`, slug \`arescore\`, Node 24. Code in \`index.mjs\` and \`probe.mjs\`. Schema migration: \`migrations/002_are_benchmark_selfscore.sql\`. Public UI: \`/benchmark/\`. MCP tool: \`are_score_mcp\` in \`mcp/src/server.ts\` explicitly writes a preliminary report only on request.

## Routes
- \`GET /v1/health\`: readiness marker.
- \`GET /v1/overview\`: 100-sample World2 research cohort + opt-in public reports only.
- \`GET /v1/report?id=<uuid>\`: public reports only, with immutable assessment run history.
- \`POST /v1/submit\`: \`{"target":"https://...","manifest": {"tools":[...]}}\` (manifest optional). GitHub repository root links look up the World2 observed tools/list when a verified source-level link is not yet available; remote MCP HTTPS URLs get protocol-only initialize + tools/list. Unavailable/private/OAuth tool lists show \`needs_evidence\`, never fabricated scores.
- \`POST /v1/claim/start\`: \`{"target_id":"..." }\` -> 30-minute random challenge.
- \`POST /v1/claim/verify\`: \`{"target_id":"...", "challenge":"are-verification=..."}\` -> once-only Owner token, stored by hash. GitHub claimant commits \`.well-known/are-verification.txt\` in public default branch; MCP URL claimant provides \`/.well-known/are-verification.txt\` on same host. Proof is ONLY repository or domain control, not full service ownership or formal quality.
- \`POST /v1/reassess\`: owner token + target id (+ optional manifest) -> immutable new preliminary run. Failing or changed sources do not silently preserve the old score.
- \`POST /v1/evidence\`: owner token + target id + 1–12 evidence rows (\`check_id\`, \`kind\`, HTTPS \`url\`, \`note\`). Saved as unverified creator evidence, never auto-passed in ARE 39 checks.
- \`POST /v1/publish\`: owner token + target id + \`public\`: boolean; only verified controllers can opt into the public list or withdraw it.

## Score semantics
The 0–100 number is an early **manifest preflight heuristic**, separate from ARE L0–L4: contract 35, descriptions 25, annotations 20, serialized manifest footprint 20. A well-described MCP may score 100 while still being unsafe, broken at runtime, or missing all independent value evidence. All 39 maturity check statuses default to unknown. Public list requires explicit verified owner opt-in; mere registration is private. Every run stores immutable source provenance, version where available, tool count, findings and component breakdown.

## Safe behavior and gaps
- Remote preflight is restricted to public HTTPS domain on port 443, DNS-pinned public IPv4, validated TLS, no credentials/query strings, no redirects, max 550k response, 8-second request timeout. Only \`initialize\`, \`notifications/initialized\` and \`tools/list\`; never \`tools/call\`.
- World2 tools are untrusted registry-observed facts, GitHub repository relationship is explicitly UNVERIFIED, and submitted manifest is tagged self-supplied. No credential is copied to the model.
- Global bounded anonymous write budget 8/min and 90/day. This is an initial safeguard, **not a complete per-user rate limit/abuse system**; strengthen before wide promotion.
- OAuth-only hosts, remote servers without reachable public tools/list, direct IPv6-only services and private source repositories need alternative evidence or authorized testing.
- No automatic independent source audit, isolated end-to-end scenario tests, full 39-item proof, or L0-L4 verification. Those remain separate human-reviewed and authorized workflows. No creator outreach has been sent.
- Read API uses server-side Neon database proxy; no database credentials in public browser code.

## Manual smoke test
Use a test project you control, e.g. \`https://are.fde.fan/mcp\`:
1. GET health, GET overview.
2. POST submit known MCP URL and confirm \`status=preflight_scored\`, \`maturity_level=null\`, 39 unknown checks; external tools/call MUST NOT execute.
3. POST unknown/unauthorized URL and check \`needs_evidence\` or \`probe_unavailable\`.
4. Verify invalid proof and invalid owner token cannot publish, reassess or submit independent evidence.
5. Real owner may verify domain challenge in the sandbox and opt in publicly, then compare immutable runs.

See also \`docs/research/ARE_BENCHMARK_P0_VALUE_20261115.md\`.
