# ARE evaluator modes: project self-assessment and independent ARE assessment
> Pilot workflow, 2026-11-19. Not a new maturity standard, certification, or publication authorization.

## Why there are two axes

The **evaluated party** and the **evaluator** are different concepts.

| Evaluated responsibility | Project self-assessment (PROJECT_SELF) | ARE independent assessment (ARE_INDEPENDENT) |
|---|---|---|
| Product / MCP service | Maintainer runs its own tests and submits source/version-bound evidence | A different assessor independently inspects or runs authorized tests |
| Adopter / organizational scenario | The adopting organization documents value, permissions and operational results | A different assessor examines the same scenario with independently gathered evidence |

PR #23 split the 39 legacy ARE-A02 checks into 32 product and 23 adopter pilot atoms. That **product/adopter responsibility split is not itself the requested self/independent evaluation split**. This document adds the evaluator axis without changing the 55 draft rules or the historical L0–L4 rubric.

## Working interfaces

- Maintainers: see [SELF_EVALUATE_MCP.md](../prompts/SELF_EVALUATE_MCP.md) for the real Agent's authorized audit; record findings as PROJECT_SELF, never as independently verified.
- Independent ARE reviewers: see [INDEPENDENT_MCP_EVALUATION.md](../prompts/INDEPENDENT_MCP_EVALUATION.md); the assessor must be organizationally different from the owner. Reviewer-submitted records are not cryptographic attestations.
- The offline scripts/are_evaluator_workflows.py provides machine-readable intake, pilot evaluation and comparison. It uses the existing rules and runs no live MCP calls, third-party writes, database operations, publication or grading.

### Example: same product, two evaluators

Run from the project repository root (outputs are private; do not commit):

    python3 scripts/are_evaluator_workflows.py init --mode PROJECT_SELF --track product --target sample-mcp --version release-sha-123 --source-revision source-sha-123 --endpoint https://example.invalid/mcp --owner-organization 'Sample Maintainer' --assessor maintainer-1 --assessor-organization 'Sample Maintainer' --output /tmp/are-self-input.json

    python3 scripts/are_evaluator_workflows.py init --mode ARE_INDEPENDENT --track product --target sample-mcp --version release-sha-123 --source-revision source-sha-123 --endpoint https://example.invalid/mcp --owner-organization 'Sample Maintainer' --assessor reviewer-1 --assessor-organization 'ARE Research' --output /tmp/are-independent-input.json

Inputs contain initially empty facts and observations. **The tool never invents evidence.** Use the 55 predeclared protocols in data/are-criteria-test-protocols.v1.json to collect test inputs, log refs, observed source/deployment version, sample count, independent oracle and permission receipts. Populate only facts and observations within an authorized test scope. Exclude passwords, keys and private user data. Missing evidence is UNKNOWN / NOT_TESTED / BLOCKED_AUTH, never an inferred failure.

Evidence for observations[metric] follows the pilot fields: value, evidence_id, version, method, surface, protocol_id, sample_count, trace_refs, oracle_id. For independently gathered evidence, also set observed_by to the reviewer ID and evidence_origin to one of ASSESSOR_DIRECT_TEST, ASSESSOR_SOURCE_INSPECTION or INDEPENDENT_ORACLE. For independent N/A/applicability, fact records need equivalent origin and version attribution. The fields are reviewer declarations, not external authentication. Evidence from another version is excluded from decisive PASS/FAIL; unknown/unpinned versions never yield decisive status.

    python3 scripts/are_evaluator_workflows.py evaluate --input /tmp/are-self-input.json --output /tmp/are-self-result.json
    python3 scripts/are_evaluator_workflows.py evaluate --input /tmp/are-independent-input.json --output /tmp/are-independent-result.json
    python3 scripts/are_evaluator_workflows.py compare --self /tmp/are-self-result.json --independent /tmp/are-independent-result.json --output /tmp/are-comparison.json

Result JSON contains explicit evaluator mode, scope, owner, assessor, version, per-check statuses, evidence references and counts. The comparison rejects incompatible IDs, versions, source revisions, endpoints, tracks or scenarios, and reports AGREE / DISAGREE / UNRESOLVED. Project PASS never changes an independent UNKNOWN into PASS. Disagreement requires further human and empirical review.

For adopter-side scenarios, replace product with adopter for --track, provide --scenario-id, and use the adopting organization as the target owner.

## Boundary

This is an implemented **private evidence intake and provisional pilot comparison**, not a hosted UI, live automatic MCP runner, independent claim attestation, verified ARE grade or public report. A product's draft rules and proposed thresholds still require the planned ten representative MCP task experiments with independent oracles before a normative standard or product-grade model is activated.

The historical 39 checks and existing public cases are untouched. Only the **first public release of a new independent evaluation of a third-party MCP/product** requires the Owner's explicit approval in chat for that case's target/version/claims/channels. Internal commits, testing and merges require no extra per-PR owner sign-off. Source merging does not authorize a new public release.
