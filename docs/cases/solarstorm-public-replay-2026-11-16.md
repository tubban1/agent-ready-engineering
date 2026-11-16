# Solarstorm MCP — independent public read-only replay prompt

This is a **community recheck**, not an ARE-issued certification. Original scoped report: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md

```text
Independently reproduce only the PUBLIC READ-ONLY part of the Agent-Ready Engineering report.
Project: Solarstorm MCP
Public MCP URL: https://mcp.solarstorm.today/mcp
Original observed test date: 2026-11-16
Public source at https://github.com/newminya/solarstorm-mcp commit 6d0fed8c9ec43bc2b2efb2fe94be81c45e66d650; deployed-source binding: UNVERIFIED.
Tools permitted (and only these): get_current_kp, get_kp_forecast_3day, get_solar_flares_24h, get_aurora_visibility.
Limits: <= 7 safe public calls, 15 seconds per request; no retry storms.
Never use credentials, payment, email, deletes, mutations, device control, private data or service stress tests.
Have a real Agent answer this concrete user question: Use current public data to report the planetary Kp level, next three days' peak Kp, 24h GOES flare peak and naked-eye aurora likelihood at 48.2° latitude; distinguish forecasts from observations.
Independently cross-check dynamic results against NOAA Space Weather Prediction Center (SWPC) at the time of the request.
Only when appropriate for a safe negative test, call get_aurora_visibility with {latitude: 999} ONCE and compare MCP error semantics against normal validation.
Treat the original observation (A domain validation error message was returned with MCP isError=false; missing required latitude returned isError=true.) as an engineering suggestion, not a claimed MCP MUST violation.
Document actual Agent tool choices, server version, returned facts, independent source timestamps and any changing data.
Do not infer the deployed version from source or issue any L0-L4 grade without all required evidence.
Do not send email or open a GitHub issue in the operator's name.
```
