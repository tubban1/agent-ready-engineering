# ADR-001 — World2 as the Unified Agent Service Platform
> v1.1 | 2026-11-16 | English canonical

**Status:** Executed ARE domain registration and public World2 service publication; legacy endpoint preserved.
**Date:** 2026-11-16
**English canonical; Chinese summary:** [ADR-001.zh.md](ADR-001-world2-are-publishing.zh.md)
**Applies to:** All first-party remote MCP services managed by World2 (ARE, Interior, future services).
**Scope update:** Canonical ARE hostname is now live on the existing Vercel deployment. World2 controls service publication/discovery; its external MCP descriptor does not proxy execution or grant tools.

## Decision — corrected after explicit owner clarification

**World2 is an agent-facing MCP service platform, NOT merely a catalog or link directory.** It should be the **central control plane** responsible for onboarding first-party MCP services, service identity, managed publishing, canonical service subdomains, version inventory, routing, operational health, auditing, access policy, lifecycle and governance. Its API and discovery model should be agent-native. Individual tools remain discoverable and callable through their own service endpoints.

### Canonical intended endpoints

| Service | Intended World2-managed URL | Observed current state on 2026-11-16 |
|---|---|---|
| World2 platform | `https://world2.co/mcp` | Existing public MCP URL |
| Agent-Ready Engineering (ARE) | **`https://are.world2.co/mcp`** | Live CNAME to ARE Vercel project, 2026 bounded protocol 9 PASS/0 FAIL, old `https://are.fde.fan/mcp` still working |
| Interior | `https://interior.world2.co/mcp` | Existing public MCP URL and separate Vercel project |
| Other owned MCPs | `https://<service>.world2.co/mcp` | Names reserved by future per-service registration; do not assert they exist |

For ARE, **`https://are.world2.co/`** will also host the public entry page with the English-first, copyable **general evaluation prompt** and links to fast preflight, deep review, developer reports and project-specific public prompts. This is an ARE service page managed under World2. World2 itself remains an agent-first services platform, not a consumer social network.

### Control plane and execution plane

**World2 Control Plane** (centrally owned and managed): service registry/identity, project→domain mapping, source & deployed revision, endpoint lifecycle, health, SLO policy (measurement not invented), publishing approval, routing configuration, version inventory, shared observability / audit reference, opt-in registry/discovery and account/role governance.

**Service Data/Execution Plane** (per-service isolation): ARE's evaluation logic, Interior's 3D scene lifecycle, Bloomroom's design runtime, OWL LAB's device execution. Each service owns its business state, authorization/consent enforcement, scopes, rate limits, idempotency, audit records and error semantics. The platform must NOT implicitly grant one service access to another service's data or credentials.

**Domain management vs proxy routing:** World2 can manage independent Vercel projects through a registry, domains, deployments and health without introducing a single HTTP proxy hop for every MCP call. A future gateway is optional after explicit performance/security verification. Domain unification is a management decision, **not** a requirement to merge all tools into `world2.co/mcp` or share one Runtime.

### Migration of ARE — planned, not done

1. **P0: Identify live truth**: inventory ARE production project, `are.fde.fan`, current clients and World2 Vercel ownership, active SDK support, OAuth callbacks if any; record current protocol/headers behavior and baseline.
2. **P1: World2 registration and domain preparation**: create the authoritative first-party service entry, publish metadata & owner, plan `are.world2.co` DNS/TLS and attach the hostname to the correct ARE deployment or management-plane routing. Keep existing `are.fde.fan` operational.
3. **P2: Staging and real Agent acceptance**: verify GET landing page separately from **POST MCP** on `are.world2.co/mcp`; test `server/discover` (2026-07-28), legacy `initialize` (supported older clients), `tools/list` all pages and result envelopes, actual safe ARE tool calls, auth/origins, streaming/request semantics, and at least one real ChatGPT and one Claude/Codex task where supported. No assertion of success without actual saved evidence.
4. **P3: Controlled canonical cutover**: update primary links/docs/registry/Agent setup to `are.world2.co/mcp` only **after** P2 gates pass; keep `are.fde.fan/mcp` as a tested compatibility endpoint for a published transition window. Do **not** depend on 301/302/308 alone for POST or stateful MCP clients; check actual clients.
5. **P4: Monitor and rollback**: compare error rates, auth/session continuity, per-host call outcomes and latency (measured), DNS/TLS correctness and client adoption. Roll back the canonical link to the known-good address upon defined regression; never silently drop clients or approvals.

**Acceptance:** new domain DNS+TLS works; real MCP requests behave correctly on both addresses; World2 registry represents ARE identity, deployment and health accurately; users can copy the evaluation prompt on `are.world2.co/`; no auth/scope regressions; published case URLs and email links remain valid; rollback has been demonstrated. An HTTP 405 from GET on a POST-only MCP route is NOT a failed MCP handshake.

### Tradeoffs and guardrails

- **Advantages:** one World2 service portfolio, coherent agent-first brand, central version/health/release management, scalable service onboarding and a stable `<service>.world2.co` naming convention.
- **Risks:** DNS/deployment concentration, platform blast radius, cross-service authorization confusion, origin/OAuth migration, proxy buffering/streaming breakage and report link drift.
- **Mitigations:** isolate service runtimes and credentials, preserve rollback/legacy host, keep full traceable service identity and domain history, test new-host MCP with real clients rather than merely probing homepage.
- **ARE's independent assessment methodology remains identifiable:** World2 and ARE are related first-party services; disclose that affiliation, and never label self-evaluation as independent third-party certification.

### Related specifications

- [Service migration acceptance plan](ARE-WORLD2-ENDPOINT-MIGRATION-PLAN.md)
- [S0–S13 evaluation & publication SOP](ARE-EVALUATION-PUBLICATION-SOP-v1.md)
- [English-first channel prompt directory](../prompts/README.md)

**This ADR supersedes the previous "World2 = discovery/distribution only" interpretation. ARE is registered as World2 public app.mcp `2ca4d14b-2b82-43f9-9eea-d2de82ecb845`, version 1. World2 descriptor is publisher-declared; operational health is separately validated.**
