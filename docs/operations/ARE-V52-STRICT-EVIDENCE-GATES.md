# ARE V5.2 — strict evidence acceptance (breaking, no backwards compatibility)

## Effective submission contract
- Evidence protocol: `are.evidence.v5.2` **only**. `are.evidence.v5.1` is rejected.
- Criteria version: `are.criteria.v5.2` **only**. `pilot-2026-11-21` is rejected by the base assessment schema.
- The one-time final report and task-token revocation remain atomic. Previously submitted reports are immutable and are not rewritten or automatically reclassified.
- Raw MCP trace must belong to **exactly the assigned ingress**. Public HTTP, OAuth/user HTTP and local STDIO are different evaluation assignments; cross-ingress trace imports cannot prove this task's outcome.

## Hard gates
1. **Semantic independent Oracle**: Tool PASS must have a domain-substantive pointer/expected value and independently sourced fixture, readback or computation. `/result/content/0/type = text`, `isError=false`, HTTP 200 and JSON-RPC envelope presence are *transport smoke*, not semantic correctness. Agent goal success requires a substantive Oracle, not just an output type.
2. **Status-to-wire integrity**: PASS must have no raw RPC or tool error. A BLOCKED_DESIGN / BLOCKED_ENVIRONMENT verdict must cite a raw call for that exact tool at the assigned endpoint and a real error containing an actual blocking diagnostic. A normal structured response contradicts BLOCKED. A FAIL needs an error or a substantive wrong-result Oracle.
3. **Criterion-specific evidence relevance**: Every decisive criterion needs non-wrapper assertions, unique raw samples and its exact minimum sample count. L2-C1 must cover valid_input + invalid_type. L3-S4 must cover missing_field + corrected_retry. L2-I1 needs comparable before/after state readbacks. L2-O2 needs distinct real Agent steps and a substantive final Oracle. L4-R4 must contain provider documentation evidence for a tool index, workflow and error recovery; an unrelated tool call cannot establish documentation quality.
4. **No fake N/A**: Existing applies_when facts still require evidence and cannot default from a missing fact. Calibration hypotheses remain unscored.
5. **No automatic certification**: Even strict machine-valid records remain private pending independent human adjudication. An assessor-authored Oracle/host trace is not independently attested by ARE itself.

## Raven regression fixtures
- Type-only independent Oracle rejected
- Successfully returning responsive-visibility tool cannot be BLOCKED_ENVIRONMENT
- Blocker citing another native tool rejected
- audit_page success cannot satisfy L4-R4 provider docs
- Single read result cannot prove no persistent state effect
- Read-contract PASS without invalid type negative scenario rejected
- Local stdio trace cannot satisfy public remote assignment
- Prior evidence protocol rejected

## Limitations and next acceptance work
- A determined assessor can still fabricate a provider-authored looking document or external source; require independent human verification or a future trusted capture/attestation provider before certifying a service.
- Live provider write/destructive tests must remain explicitly authorized; the stricter gates never imply permission to create accounts, pay, write or access private user data.
- Time-instrument reconciliation and safe PARTIAL teardown are independent P1 concerns; do not automatically remove configurations without task-owned baseline evidence.
