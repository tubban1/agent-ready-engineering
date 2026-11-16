# GitHub Issue prompt: Narrow, source-specific reproduction

**Channel:** official maintainer repository GitHub Issue, but only when a real, non-sensitive, reproducible, project-relevant defect justifies it. **Do not open mass issues to market ARE.** Use private disclosure for sensitive vulnerabilities. Distinguish this from a private email or a public community challenge.

## Issue format

```md
### Observed behavior
<EXACT_TOOL + VERSION + INPUT + ACTUAL_RESPONSE_OR_REDACTED_EXCERPT>

### Expected behavior
<OFFICIAL_SPEC_MUST | PROJECT_DOCUMENTED_CONTRACT | OPTIONAL_ARE_RECOMMENDATION>
If only a recommendation, propose Discussion instead of falsely alleging a protocol bug.

### Reproduction environment
- MCP endpoint: <URL>
- Date / spec version / server-reported version: <VALUES>
- Public source revision: <SHA OR NOT_BOUND_TO_PRODUCTION>
- Authorization and limits: <SCOPE>
- Impact on a real Agent task: <OBSERVED IMPACT OR UNKNOWN>

### Minimal safe reproduction
1. <ONE_SAFE_STEP>
2. <SECOND_SAFE_STEP>
3. Inspect <SPECIFIC FIELD/STATE>. No account or business writes.

### What we verified / didn't verify
<PROTOCOL, TOOL, SOURCE, AGENT ORACLE; LIMITATIONS>

### Optional maintainer coding-Agent prompt
<PROJECT-SPECIFIC_COPYABLE_PROMPT_BELOW>

### Evidence
<REPORT_URL; REQUEST/RESPONSE_HASH; LINKED_SOURCE_REVISION>

This report is an evidence-scoped technical observation. ARE does not claim official MCP certification or owner endorsement.
```

## Project-specific prompt to put in that Issue

```text
In this repository at <PINNED_SHA_OR_BRANCH>, examine the MCP behavior behind
<EXACT_TOOL_NAME> for <MINIMAL_INPUT>.

Observed by the reporter on <DATE_AND_DEPLOYED_VERSION>:
<FACTUAL_REDACTED_OBSERVED_RESPONSE>

Expected per <OFFICIAL_REQUIREMENT_OR_PROJECT_CONTRACT>:
<EXPECTED_RESPONSE_OR_UNKNOWN>
If this is an ARE design suggestion rather than a MUST violation, treat it as an optional enhancement.

Use only the maintainer's explicitly authorized local/sandbox environment. Trace the handler, error serialization and related tests. Reproduce the behavior, propose the smallest fix if actually needed, and add tests that preserve existing valid behavior. Distinguish public-source observations from unbound production behavior. Do not merge/deploy or expose secrets automatically. Return a small result table: reproduced? root cause? suggested change? tests run? possible compatibility impact?
```

### Solarstorm example decision

The latitude `999` / `isError=false` observation is presently classified as an **optional ARE design recommendation**, **not a proven official MCP MUST violation**. With a maintainer not yet responding and no independent demonstration of downstream business impact, **do not post a fault-claim Issue solely for ARE promotion**. Prefer the existing private email and a later Discussion if welcome. This file records the prompt construction and moderation gate, not an actual third-party Issue.
