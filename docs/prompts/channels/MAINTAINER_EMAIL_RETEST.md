# Maintainer email attachment: Project-specific self-check prompt

**Channel:** private email to the verified, official maintainer contact.
**Language:** English by default, localize only when operator preference is documented.
**Intent:** Give the owner a concrete reproduction and fix-verification tool they can run in their own trusted coding Agent. It is NOT a generic public write-test prompt.

## Required sender fields

- `service_name`, `verified_owner_email`, `tested_endpoint`, `tested_at`, `source_sha` and `production_source_binding`.
- `report_url`, `finding_id`, `finding_class` (verified defect / design recommendation / isolated observation / unknown).
- Minimal `input`, actual `observed`, precise `expected`, independent oracle and safety boundary.
- Suggested engineer action and exact retest acceptance; optional remediation diff if maintainer authorized it.

## Email body structure

**Subject:** `[ARE review] <SERVICE> — <finding summary> (evidence + owner-side retest)`

**Paragraph 1:** Why we tested the service, public read-only scope, verified positive outcomes, and links to the full report.
**Paragraph 2:** One or two actionable **evidence-scoped observations**, each reproducible and clearly classified. If not a proven defect, do not say “bug” or “security issue.”
**Paragraph 3:** Provide the **filled project-specific prompt below**; invite corrections and production-version clarification.
**Signature:** ARE public report URL and affiliation; do not imply operator endorsement.

## Copyable prompt for the operator's own coding Agent

```text
I maintain <SERVICE_NAME>. This is an owner-authorized engineering review of the ARE report:
<EXACT_ARE_PUBLIC_OR_PRIVATE_REPORT_URL>

Endpoint and version observed by ARE: <URL_AND_VERSION_AT_TEST_TIME>
Source repository and pinned SHA: <SOURCE_SHA_OR_UNKNOWN>
Production/source binding: <BOUND | UNBOUND | UNKNOWN>
Specific report finding: <FINDING_ID_AND_CLASS>
Reproduction input: <SAFE_MINIMAL_INPUT>
Expected behavior / business oracle: <EXPECTED_STATE_OR_PROTOCOL_CONTRACT>
Observed behavior with evidence: <ACTUAL_STATE_AND_EVIDENCE_LINK>
Permitted test context: <OWNER_ISOLATED_SANDBOX_OR_PUBLIC_READ_ONLY>

Please:
1. Reproduce this specific observation on the baseline when possible, recording raw tool error envelopes, protocol/version, timestamps and the independent expected result.
2. Determine whether it is a genuine defect, an intentional API choice, a non-mandatory usability recommendation, an isolated latency event, or a report error. Do not treat a partial protocol probe as certification.
3. Inspect the source handler only where the source/deployment identity is verified; never apply fixes to production or reveal credentials without explicit approval.
4. If authorized, make a minimal fix in a controlled branch/sandbox and run matching before/after inputs plus related regression tests. Record whether the real Agent's task outcome improved, not only whether unit tests passed.
5. Return a privacy-safe response with: issue classification, observed before/after, code/deployment revision, what was actually tested, any contradictions and a suggested ARE independent retest. Mark unverified items honestly.
6. Do not claim a new ARE maturity level, send email, open an issue, merge, or deploy without separate explicit permission.

Please provide findings to the maintainer first. ARE will independently retest a published change before updating its own result.
```

### Pilot-filled example — Solarstorm (do not resend as an additional email)

- `SERVICE_NAME`: Solarstorm MCP; `URL`: `https://mcp.solarstorm.today/mcp`.
- `REPORT_URL`: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
- `FINDING_ID_AND_CLASS`: `solarstorm-20261116-domain-error` / **ARE engineering suggestion**, not MCP MUST.
- `SAFE_MINIMAL_INPUT`: call `get_aurora_visibility` with `latitude=999`; compare to a missing-`latitude` tool request.
- `ACTUAL_STATE`: domain-invalid returned an error string while MCP `isError=false`; missing required field yielded `isError=true`.
- `EXPECTED`: consistent machine-readable error-state semantics *if* the service adopts the ARE recommendation.
- Additional questions to owner: source declares 1.0.3 vs live 1.0.0; one 60s Kp timeout with successful fast retries is **inconclusive**, not proven persistent.

Existing 2026-11-16 email has already been sent. This is a reusable future email template, NOT authorization to automatically send another message or duplicate a report.
