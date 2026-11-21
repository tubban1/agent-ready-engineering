# ARE MCP Catalog +500 intake — 2026-11-21

## Actual production database outcome
- Cohort: `ARE100-VALUE-20261115`, Neon project `are-evaluations`, schema `are_eval`.
- Before: **100** unique repository candidates.
- New: **500** unique repository candidates, also **500** unique GitHub owners not previously represented.
- After: **600** total source candidates.
- Every new item corresponds to an **active** Official MCP Registry listing that declares an HTTPS MCP remote and a GitHub repository, with a **direct unauthenticated JSON-RPC MCP `initialize` and complete `tools/list` result** that returned **6–139** tool names. Stored evidence includes the exact registry record URL, declared repo, observed endpoint, observation timestamp and hash of returned tool names. No `tools/call` test execution occurred in this intake.
- Current stage: `live_mcp_tools_observed_pending_source_quality`. `repository_match_verified=false` and `creator_contact_verified=false`; **none of these 500 are falsely promoted to ELIGIBLE**.
- Formal ARE issuance still separately requires source/endpoint mapping verification and a quality score of at least 75.

## Source discovery and exclusions
- Official source: https://registry.modelcontextprotocol.io/v0.1/servers?version=latest
- Scanned **14,900** published listing records; after repository-level deduplication, **3,526** GitHub repositories declaring HTTPS remotes.
- A bounded, read-only protocol probe confirmed **938** records with at least 3 tools. The final batch selected **500**, avoiding existing repositories and repeated repository owners, excluding deprecated entries and unsafe/protocol-failing endpoints.
- Authentication challenges were not bypassed; authenticated-only targets were not given fake tool counts.
- The GitHub second-stage source quality audit hit access throttling. Of 76 tentative matching README references in the initial 1,050-request audit, only **73** were the exact endpoint that had also been directly probed. Those 73 were marked as source-reference verified, while deployment binary provenance remains unverified. No new project has yet passed the full 75-point independent quality assessment.
- Public GitHub access is subject to rate limiting; a timed-out or throttled check must not be counted as repository verification or a poor quality verdict.
- The 500 were inserted in 20 idempotent batches (25 records each); temporary-branch batch test passed and was discarded before production writes. Production SQL verified all 500 inserted, all unique and toolcount >=3.

## UI/operations
- Owner pool now reads all 600 candidate rows instead of the old hard cap of 150 and shows observed tool counts separately from quality status. This was verified against the real production Neon SQL read-model: 600 visible candidates, including all 500 new entries. The raw official-registry endpoint is prefilled for later exact README-to-endpoint verification, not marked verified.
- The existing quality-gated replenisher and human Owner review may process these pending records. No prior evaluations, Task Tokens, submissions or reviewer verdicts were changed.
- **This intake meets the count of 500 source-backed, live-tool-observed NEW candidates, not the stronger request for 500 formal quality-approved tasks.** That stronger count must never be asserted without separate GitHub/license/README verification and quality >=75.
