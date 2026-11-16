# ARE endpoint migration — operational acceptance plan (NOT EXECUTED)

**Requested target:** `https://are.world2.co/mcp` and human-readable service page `https://are.world2.co/`.
**Current production:** `https://are.fde.fan/mcp` and existing ARE Vercel deployment.
**World2 ownership:** central MCP platform management and future first-party service family `<service>.world2.co/mcp`.

## Verified baseline (2026-11-16)

- `are.world2.co` does **not** resolve in the current read-only probe. Do not describe this endpoint as live.
- `are.fde.fan/mcp`, `interior.world2.co/mcp`, and `world2.co/mcp` are published POST-oriented MCP routes: simple GET returned HTTP 405, which is not evidence of a failed MCP handshake.
- Vercel projects are distinct but belong to the same team `tubbans-projects-c58b36e6`: `agent-ready-engineering` (ARE), `world2-play` (World2), and `interior-agent-preview` (Interior).
- No production DNS or deployment changes were made during this documentation correction.

## Responsible components / order / go-no-go

| Gate | Owner | Change plan | Exit evidence |
|---|---|---|---|
| M0 baseline | ARE + World2 operator | Capture live endpoint/version, client configs, traffic, service IDs, existing DNS and OAuth | Versioned baseline & rollback references |
| M1 register | World2 platform | Register ARE as first-party managed service; declare project owner, domain, revision source, health probe and policy | Inspectable World2 service record |
| M2 domain | Infrastructure | Attach `are.world2.co` DNS/TLS and hostname to the intended ARE deployment using a service-management workflow | Public DNS, valid TLS, correct Vercel association |
| M3 site entry | ARE web | Publish English-first general test prompt and links on `https://are.world2.co/`; separate `/mcp` route | Page verified on mobile/desktop plus prompt copy |
| M4 MCP conformance | ARE/runtime | POST 2026-07-28 `server/discover`, legacy initialize, tools/list, resource/prompt discovery and safe business tool responses on old + new hosts | Saved request/response SHA, no regressions; use the actual supported protocol list |
| M5 real Agents | QA | Real Agent tasks in ChatGPT and another host with permission boundaries, token/call traces and independent expected outcome; no paid/destructive side effect | Explicit PASS of task Oracle on new host and legacy host |
| M6 controlled cutover | World2 publishing controller | Set new address canonical in docs, registry and client instructions. Preserve old hostname as tested compat route during transition | Client matrix, release receipt, rollback rehearsal |
| M7 monitor | World2 operations | Watch errors/latency/auth, client adoption and service isolation; triage and roll back if failure | Post-cutover report with real metrics |

**No production migration approval is implied by publishing this plan.** Need a separate implementation request, actual service-management controls and passed evidence at each gate.

## Anti-patterns

- Moving DNS alone while still publishing `are.fde.fan/mcp` as canonical.
- Pointing all service subdomains at the same tool list without independent auth.
- Treating a GET 405 or HTTP 200 homepage as MCP compatibility evidence.
- Relying on an HTTP redirect for client POST/stream/session behavior without running real clients.
- Redirecting `are.fde.fan/mcp` immediately and breaking existing embeddings, OAuth callback origins, ChatGPT plugin review or cached host metadata.
- Describing the World2 governance/control plane as fully implemented merely because three Vercel projects share a team.

## User-facing language

Before M6: “ARE currently connects at `https://are.fde.fan/mcp`. Its planned World2-managed canonical endpoint is `https://are.world2.co/mcp`.”
After verified M6: “Connect to ARE at `https://are.world2.co/mcp`; existing clients may continue using the documented legacy endpoint during the compatibility period.”

## Next product implementation (separate change)

World2 registry/control-plane service records; domain attachment; canonical endpoint metadata and release receipts; English copy-prompt page and website CTA; safely versioned old-host compatibility; real Agent dual-host acceptance + rollback and monitoring.
