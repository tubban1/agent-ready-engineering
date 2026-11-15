# ARE MCP-100 — Audit Evidence and Creator Contact Status
Date: 2026-11-15 · Timezone: Europe/Zurich
Classification: **Research checkpoint, NOT 100 completed ARE assessments**

## 1. Actual deliverables and their limits

- World2-sourced selected cohort `ARE100-VALUE-20261115`: **100** service records, **100 different claimed GitHub owners**, **1,330** observed tool declarations.
- Cohort table `are_eval.benchmark_study_candidates`: **100/100** at `manifest_preflight`; **0/100** repository/service identity verified; **0/100** independently verified maintainer contact; **0/100** outreach started.
- Historical repository collection: 187 GitHub/public assessments are `preliminary`; four internal projects are `source_review`. **Zero** independent full 39-check ARE certifications.
- Benchmark self-score records: 3 submitted targets, 4 runs. These are self-score/API smoke cases, not external creator approvals or end-to-end tests.
- No credible source-specific defect report has yet been sent. Do not claim a delivered creator benefit, approved app-store submission, or performance gain.

## 2. Actual static manifest checks across the 100 candidates

Read directly from World2's `world_mcp_services.tool_manifest.tools` and joined to the 100 Neon cohort service IDs; count **1,330 tools**:
- InputSchema with `type:object`: **1,330/1,330**.
- Tool descriptions at least 28 characters: **1,330/1,330**.
- Explicit `readOnlyHint` and `destructiveHint`: **1,330/1,330**.
- Contradictory read-only+destructive annotations: **0**.
- Duplicate tool names within a service: **0**.
- Five of the sampled registry tool manifests were >=50 KB.

These results mean *nothing negative was found by these very shallow static heuristics*. They do NOT validate claimed annotations against real side effects, current runtime, tasks, auth, source version, OpenAI/Anthropic review, or ARE L0–L4. This is insufficient to email developers with quality defects.

## 3. Seven contacted-in-principle projects: live MCP handshake + tools/list

All tests were unauthenticated, non-destructive protocol calls (initialize and tools/list only), 2026-11-15. None invoked tools/call or created business side effects. Counts are live at test time and may change.

| Project / repo | Live URL | Live tools | tools/list response bytes | Public maintainer channel | Source exposure and next ARE action |
| --- | --- | ---: | ---: | --- | --- |
| Agent Cost Hub / [agentcosthub/agent-cost-hub-mcp](https://github.com/agentcosthub/agent-cost-hub-mcp) | https://agentcosthub.com/mcp | 5 | 5,311 | [GitHub Issues](https://github.com/agentcosthub/agent-cost-hub-mcp/issues); `hello@agentcosthub.com` in README | Source reference + self-contained dist are available; verify end-to-end price correctness and version provenance |
| RuneScape Wiki / [birdwell/runescape-wiki-mcp](https://github.com/birdwell/runescape-wiki-mcp) | https://runescape-wiki-mcp.fly.dev/mcp | 14 | 57,929 | [GitHub Issues](https://github.com/birdwell/runescape-wiki-mcp/issues); README `support@birdwellabs.com` is for support/rights | Broad TS source, tests, permission docs; task performance / context footprint candidate |
| GribStream / [GribStream/gribstream-mcp](https://github.com/GribStream/gribstream-mcp) | https://gribstream.com/mcp | 12 | 62,549 | [GitHub Issues](https://github.com/GribStream/gribstream-mcp/issues) | Public docs/config; OAuth needed for data tasks; request authorized evaluation route |
| Atom.com / [atomdomains/atom-mcp-server](https://github.com/atomdomains/atom-mcp-server) | https://mcp.atom.com/mcp | 25 | 70,122 | [GitHub Issues](https://github.com/atomdomains/atom-mcp-server/issues); https://helpdesk.atom.com | Documentation-only source; World2 snapshot had 22 tools vs 25 live, indicating registry freshness difference, NOT necessarily provider defect |
| Keelen / [jamie7893/keelen-mcp](https://github.com/jamie7893/keelen-mcp) | https://keelen.ai/mcp | 49 | 74,600 | [GitHub Issues](https://github.com/jamie7893/keelen-mcp/issues) | README says **documentation-only**; hosted coding approval/merge flows need scoped sandbox credentials |
| Vinktar / [vinktarhq/agent](https://github.com/vinktarhq/agent) | https://mcp.vinktar.com/mcp | 31 | 122,747 | [GitHub Issues](https://github.com/vinktarhq/agent/issues) | Plugin docs/config, hosted service; measure actual Agent context costs and permission semantics before recommending progressive discovery |
| DomainKits / [ABTdomain/domainkits-mcp](https://github.com/ABTdomain/domainkits-mcp) | https://api.domainkits.com/v1/mcp | 30 | 70,844 | [GitHub Issues](https://github.com/ABTdomain/domainkits-mcp/issues) | Documentation/registry, OAuth/API plan variation; tested successfully using server-negotiated protocol `2025-11-25`. A `2025-06-18` header was rejected, which is **not a bug** when that version is unsupported |

**Contactability definition:** GitHub public repository was independently fetched, and `has_issues=true` in current GitHub repository metadata; emails cited only when explicitly published in the repository README. This does **NOT** verify an individual contact's identity, response willingness, or permission to mass-message. Nobody has been contacted.

## 4. First deeper source review: Agent Cost Hub (false-positive elimination)

Reproducibility source: cloned https://github.com/agentcosthub/agent-cost-hub-mcp at commit `2b08aeb1882721bdac4664795362b4424781943e`.

Initial automated observation: `node -e "import('./src/mcp-core.mjs')"` failed with `ERR_MODULE_NOT_FOUND` because `src/mcp-core.mjs:3–5` imports `../site/src/*`, which is absent from this standalone public repository.

**Source inspection corrected the initial diagnosis:** `README.md` specifically explains that `src/mcp-core.mjs` is a **source reference** importing data from the separate website build, and `dist/mcp-core.js` is the self-contained bundle. `node -e "import('./dist/mcp-core.js')"` succeeded and exported the MCP functions. Production `initialize` returned HTTP 200, and production `tools/list` returned five tools.

Therefore it would be **incorrect** to notify the creator that the hosted MCP or the published bundle is broken. This is an important ARE false-positive prevention example.

Non-critical documentation question worth confirming before contacting: `src/mcp-core.mjs` reports server version `0.1.0`, `package.json` is `1.0.0`, `server.json` is `1.0.1`. These may be intentionally independent version tracks. Ask maintainers only if it materially affects consumers' interoperability or expected registry upgrades. No authenticated task or pricing-comparison accuracy assessment was executed, so **no confirmed creator-facing bug report is ready from this case**.

## 5. What can responsibly be sent now?

- **Can send a non-accusatory, individualized invitation to participate in a deeper ARE evaluation**: yes, seven repository issue/support channels above are public. Respect repository issues policy and community rules; outreach not yet performed.
- **Can send a confirmed, reproducible production-defect report**: no, not from the work completed so far. Current findings are either design hypotheses (big tool lists), documentary/version questions, or registry freshness differences.
- **Can report early positive protocol evidence**: yes, seven independent live handshakes/tools-list successes.
- **Before submitting actual improvement proposals**: pin the source commit; verify repository ↔ deployed service identity; measure a representative Agent task and baseline where possible; confirm effect/reproduction in a safe environment; separate UNKNOWN, HYPOTHESIS, VERIFIED.
- **Do not send** a generic “your MCP is low-scoring” mass message; this would damage ARE credibility and contradict the Value Gate.

## 6. Corrective priority

Stop optimizing dashboards and catalog counts. Convert the 100 preflight candidates into real project-level reports with (1) source/identity verification, (2) at least one concrete reproducible end-to-end task, (3) objective evidence, (4) an actionable improvement or explicit no-finding verdict, (5) maintainer-specific communication and (6) a later re-test. Benchmark effectiveness is not demonstrated until maintainers accept actionable changes and independently verified Agent outcomes improve.
