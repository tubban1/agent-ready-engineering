# Solarstorm MCP — independent, limited-scope ARE evaluation

**Evaluation date:** 2026-11-16 (UTC)
**Status:** Public read-only technical case; maintainer feedback sent, response not yet observed
**This is not an MCP official certification, not an ARE L0–L4 maturity certification and not an endorsement by Solarstorm.**

## What was evaluated?

Solarstorm provides public space-weather data through MCP. The source came from World2's existing catalog (`service_id=5388312a-23b9-58f5-89ef-ec184a389907`).

- **MCP endpoint:** https://mcp.solarstorm.today/mcp
- **Open-source repository:** https://github.com/newminya/solarstorm-mcp
- **Inspected public source commit:** `6d0fed8c9ec43bc2b2efb2fe94be81c45e66d650` (source declares `1.0.3`)
- **Observed live serverInfo:** `1.0.0`
- **Source-to-production binding:** **UNVERIFIED** — repository analysis is *not* an attestation of currently deployed source.
- **Consent and impact scope:** Publicly available anonymous **read-only** weather/space forecasts; no user credentials, external write actions, rate/load testing or privileged access.

### Verified positive observations

| Test | Scope | Result |
|---|---|---|
| MCP 2026-07-28 | Bounded public-HTTP protocol profile | 9 PASS / 0 FAIL; one optional streaming area unknown and anonymous auth area N/A. **Not official full certification** |
| Tool inventory and contract | All four discovered tools | 4/4 reviewed |
| Public MCP actual tool calls | All four public read-only tools | 4/4 each returned a successful response on at least one bounded invocation |
| Source tests | Public source snapshot, isolated Python 3.12 | 55/55 offline and 9/9 live NOAA tests passed; **not proven to be current deployment** |
| Actual model-based task | Claude Code Sonnet, one run | 4 actual MCP calls across a multi-step space-weather and aurora question; Agent completed one run in approximately 7.2 s |
| Independent public truth | NOAA SWPC feeds | Three-day Kp forecast and aurora threshold agreed; GOES peak flare class matched. Instantaneous X-ray readings differed slightly with capture time |

Tools executed: `get_current_kp`, `get_kp_forecast_3day`, `get_solar_flares_24h`, `get_aurora_visibility`.

### Engineering feedback (not security findings)

**1. Error-response consistency.** The range-invalid request `get_aurora_visibility(latitude=999)` returned a structured error message while setting MCP `isError=false`; omitting required latitude yielded `isError=true`. More consistent machine-readable domain errors would assist Agents. This is **an ARE engineering recommendation**, not a violation of the official MCP MUST requirement.

**2. Version provenance question.** Published source declares `1.0.3` but live `serverInfo` reports `1.0.0`. We did **not** determine whether this is intentional or a deployed mismatch. Maintainer clarification has been requested.

**3. Single tail-latency observation.** The first `get_current_kp` SDK call timed out after approximately 60 s. Two subsequent safe read-only retrials finished in about 683 ms and 252 ms. This is one observed long-tail result, **not proof of an ongoing outage**.

**4. Optional metadata improvements.** Stable result units/timestamps and `outputSchema` could benefit downstream clients; `outputSchema` remains optional under MCP and absence is **not a protocol violation**.

### Evidence-scoped ARE scenario check status

| State | 39 applicable/considered ARE check IDs |
|---|---:|
| PASS | 4 |
| FAIL against ARE's own engineering recommendations | 2 |
| NOT_APPLICABLE with written scope reasons | 10 |
| NOT_VERIFIED | 23 |

**No L0–L4 maturity level established.** We did not have owner governance, current production source binding, internal production run logs or repeated multi-model tasks. The two ARE recommendation findings must not be portrayed as severe protocol noncompliance. A source-reported test pass does not establish a deployed-service production guarantee.

### Method and reproduction

The full case was originally captured in a private local evidence folder (SHA-256 manifest, MCP responses, NOAA independent oracle, Claude real Agent trace, source test logs, 39-check rationale). This public technical summary contains only non-sensitive reproducible inputs and verified observations.

To reproduce ethically, use the independent [Third-Party MCP Review prompt](../prompts/INDEPENDENT_MCP_EVALUATION.md) with `https://mcp.solarstorm.today/mcp`. To reproduce only the domain-error observation, make a normal, bounded read-only call to `get_aurora_visibility` with a latitude of `999` and compare it to missing required latitude. Live solar metrics are time-varying; compare against NOAA data observed at similar times.

For the operator, use the [Maintainer Retest prompt](../prompts/MAINTAINER_RETEST_MCP.md) in the team's own authorized environment.

### Reproduce the public read-only test yourself

- [Project-specific public Agent replay prompt](solarstorm-public-replay-2026-11-16.md) — includes the exact public endpoint, four allowed tools, NOAA independent oracle and strict request budget. This is a community recheck, not ARE certification.
- [Project-specific maintainer retest prompt](solarstorm-maintainer-retest-2026-11-16.md) — for the operator's own authorized code/sandbox, addressing the observed validation behavior and source-version uncertainty. This document is **not** a second outbound email.
- [Machine-readable pipeline case](data/solarstorm.json) and [S0–S13 status report](solarstorm-run-status-2026-11-16.md) — explicit PASS/LIMITED/WAITING and channel receipts, no fabricated maturity grade.

ARE's canonical MCP and self-evaluation entry now live at https://are.world2.co/mcp and https://are.world2.co/. Both evaluation providers are first-party to World2; no operator endorsement is implied.

### Feedback and updates

- **2026-11-16:** Evidence-based results sent privately to the public project contact. Gmail accepted the message; this does **not** establish recipient delivery, acknowledgement or agreement.
- **As of 2026-11-16:** No maintainer reply recorded. Please allow corrections or deployment-version clarification before promoting tentative questions as factual defects.
- Future corrections and reproducible post-fix results should be added as dated revisions without silently overwriting this baseline.

### Disclosure and relationships

ARE is a separate engineering research framework, sourced this MCP through World2's directory. No service owner requested or endorsed this evaluation; no payment, sponsorship or certification is claimed. More about the process: [ARE publication standard](../standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md).  More about self-evaluation: [ARE Self Evaluate prompt](../prompts/SELF_EVALUATE_MCP.md).
