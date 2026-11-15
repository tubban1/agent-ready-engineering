# ARE Benchmark v2 — Endpoint-only self-assessment

**Decision:** only a publicly reachable, unauthenticated HTTPS Streamable HTTP MCP Endpoint may be registered and scored. There is NO backward compatibility with GitHub-only submissions, manually supplied tool manifests, local `stdio`, local offline scores or the `/v1/*` API. GitHub links may be included later as owner-provided source evidence, not as target identities.

Production: Neon Function `arescore` in ARE Neon project. Source `index.mjs` + `probe.mjs`; migration `migrations/003_https_endpoints_only.sql`; frontend `/benchmark/`; MCP tool `are_score_mcp({endpoint})`.

## External API (v2 only)

- `GET /v2/health`, `GET /v2/overview`, `GET /v2/report?id=UUID` (public reports only).
- `POST /v2/submit`: `{"endpoint":"https://service.example/mcp"}`; verifies public DNS/TLS, initializes MCP, obtains ALL `tools/list` pages, computes preliminary static score, privately saves target/run ID. If the Endpoint is unreachable, requires authentication or cannot list tools, returns an explicit failure **without creating a target/score**.
- `POST /v2/claim/start`: `{"target_id":"UUID"}` → 30-minute challenge; owner serves it from `https://MCP-HOST/.well-known/are-verification.txt` on the same domain.
- `POST /v2/claim/verify`: `{"target_id":"UUID","challenge":"are-verification=..."}` → one-time Owner Token (stored hashed).
- `POST /v2/reassess`: `{"target_id":"UUID","owner_token":"..."}` → live Endpoint re-probe, new immutable run. Only verified owners can invoke it.
- `POST /v2/history`: same credentials; private full run and evidence-submission history.
- `POST /v2/evidence`: same credentials plus evidence rows (`check_id`, `kind`, HTTPS `url`, `note`); status stays unverified pending independent review.
- `POST /v2/publish`: same credentials and `public` boolean; verified owners opt in or withdraw public visibility.
- No other v1 operation aliases, alternate JSON property names, or raw manifest upload.

Public scoring is only a static preflight heuristic (contract 35, descriptions 25, annotations 20, manifest footprint 20). **Not** official platform approval and **not** ARE L0–L4: all 39 ARE checks default to UNKNOWN until independently verified.

## Safety and data scope
- HTTPS public DNS address pinned to a public IPv4 target; validated TLS; no redirects, query secrets, private IPs, unauthorized ports, or arbitrary HTTP.
- Only MCP `initialize`, optional `notifications/initialized`, and `tools/list`. No `tools/call` or business side effects.
- Multi-page tools/list supports up to five pages, 250 tools and bounded response bytes.
- Metadata/version/provenance are stored, **not the raw tool catalog**. Report is private by default. Domain proof is distinct from quality certification.
- v1 GitHub-only and preflight-failed records were archived under `are_eval.benchmark_retired_v1_20261115` and removed from live Benchmark. Existing live successful endpoint runs are preserved.
- Global quota 8 anonymous requests/min and 90/day, not a substitute for a complete per-user anti-abuse system.
- OAuth-only/IPv6-only/non-public service evaluation and actual Agent task, recovery or business-value verification are out of scope of this P0 tool. Source code analysis via GitHub is still available as separate ARE engineering work, but cannot create a Benchmark scoring target.

## Verification

Run `node --test functions/are-score/preflight.test.mjs` and `npm test --prefix mcp`.

Live smoke:
1. `POST /v2/submit` with a known reachable public MCP Endpoint.
2. Assert a `run_id`, observed tools, `source_provenance=live_mcp_tools_list` and no mature L-level.
3. `POST /v2/submit` using GitHub URL, `stdio://`, local IP, `manifest`, or old `target` field must fail without a new registration.
4. `GET /v1/overview` must return 404.
5. Verify owner domain claim, retest, private history, publish and revoke are still functioning.
