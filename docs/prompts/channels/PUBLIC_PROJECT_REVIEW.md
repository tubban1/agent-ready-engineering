# Public project-specific evaluation prompt (English canonical)

**Where:** optionally embed inside a public ARE case, X/LinkedIn post, Hugging Face community post, Reddit technical discussion, ModelScope article or a video description. This prompt is meant to let an independent reader **reproduce only the safe public subset of that exact project**, not to re-evaluate every unknown server in the world.

## Minimum per-project inputs

- Target `<PROJECT_NAME>` and public `<PUBLIC_MCP_URL>`.
- Immutable original report `<ARE_CASE_URL>`, test date and server version (if known), tested tool list.
- Optional public SHA `<SOURCE_SHA>` and deployed-source match status.
- Explicit safe test budget, permitted public read-only tools, unsafe/unavailable operations to skip.
- A small, measurable task with a public oracle and expected result **at current time** (for volatile data).
- Disclosure / attribution status and a note saying that community tests do not imply ARE endorsement.

## Copyable public project prompt

```text
Please independently reproduce the SAFE PUBLIC portion of this ARE MCP case:
Project: <PROJECT_NAME>
Public MCP endpoint: <PUBLIC_MCP_URL>
Original limited-scope report: <ARE_CASE_URL>
Originally observed on: <UTC_DATE_AND_LIVE_SERVER_VERSION>
Public source snapshot: <SOURCE_GIT_SHA_OR_NONE>; deployed source binding: <BOUND_OR_UNKNOWN>
Permitted calls: <SPECIFIC_PUBLIC_READ_ONLY_TOOL_NAMES_WITH_SAFE_ARGUMENTS>
Explicitly forbidden: account access, owner-only tools, writes, payments, email, deletion, unsafe fault injection, high-volume retries and bypassing rate limits.
Budget: <MAX_CALLS_AND_TIMEOUTS>

1. Connect with the protocol that the live server actually negotiates, and inspect all publicly discoverable tool definitions (without claiming a production-source identity from a GitHub SHA alone).
2. Make only the specified, low-impact public read-only calls. Record request time, tool name/arguments, returned status and selected redacted fields. Any failure must be rechecked within a bounded budget before being described as persistent.
3. Attempt this exact, project-relevant non-destructive user goal with a real model-based Agent if your environment supports it: <USER_GOAL>.
4. Verify the result independently against <PUBLIC_ORACLE>, considering data freshness and time drift. Do not copy old live values as though they were current.
5. Compare your observations with the report, separate successful reproductions from counterexamples, and explicitly record NOT_VERIFIED, different server versions and changing upstream data. No official MCP/ARE certification is granted.
6. Do not post to the maintainer's repository or contact them on my behalf. Share a concise, safe reproduction (model/host/version, real calls, oracle, limitations) in the discussion if community rules allow it.
```

### Filled public example — Solarstorm MCP (use current observations, not historical NOAA values)

```text
Independent public read-only recheck of Solarstorm MCP.
MCP URL: https://mcp.solarstorm.today/mcp
ARE reference: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
Original test date: 2026-11-16; live reported 1.0.0; source snapshot 1.0.3/6d0fed8 (production binding UNKNOWN).

Only use: get_current_kp, get_kp_forecast_3day, get_solar_flares_24h,
get_aurora_visibility(latitude=48.2), all PUBLIC and read-only.
Optional harmless negative: get_aurora_visibility(latitude=999) ONCE,
then compare the MCP isError field against a missing required-latitude call.
No auth, writes, stress test or repeated polling. Call budget <= 7; timeout <= 15 s per request.

Have a genuine Agent answer: What is the *current* Kp, the next three calendar days' Kp
forecast, the most significant GOES flare during the past 24 hours, and whether
naked-eye aurora is likely at 48.2° latitude?
Independently compare current results with https://services.swpc.noaa.gov,
at matching capture times. Report if data changes or the public service differs
from the 2026-11-16 snapshot. The error-signaling observation is an optional
ARE engineering recommendation, NOT an official protocol MUST finding.
Don't grade or publish credentials.
```

## Channel adaptation (without changing test scope)

- **X:** 1–2 sentences of what was actually verified + one report link; link to this prompt rather than stuffing long instructions into the post. Tag maintainer only if appropriate/consented.
- **LinkedIn:** 3–5 explanatory sentences focusing on why real Agent + independent oracle matters, plus the project URL and optional reproduction prompt.
- **Hugging Face:** lead with test method and engineering research question; use publicly safe snippet if moderators permit. Do not repost while previous content awaits approval.
- **Reddit/Hacker News:** publish substantial native technical content, uncertainty and request for expert critique, obey each community's rules; don't carpet-bomb subreddits.
- **ModelScope:** technical Chinese translation can follow the English canonical prompt, tailored to Chinese developer expectations; clarify it is independently reproducible, not certified.
- **YouTube/Bilibili/TikTok:** link the prompt in description or pinned comment; visuals must be actual traces or explicitly labeled illustrations, not simulated telemetry.

Only a genuine platform URL/posted receipt makes that channel PUBLISHED.
