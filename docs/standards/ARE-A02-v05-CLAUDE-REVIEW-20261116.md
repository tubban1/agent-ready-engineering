# ARE-A02@0.5 — Independent Claude Acceptance Checklist

**Purpose:** Review a staged code change before merging to main. No public deployment, historical Benchmark database migration or third-party business tool calls are part of this feature branch.

## Non-negotiable user requirements

1. A02 must **not** include fixed sample counts or the misleading broad "no data" narrative. ARE already has real engineering evidence (Interior, Vibe Monitor, OWL LAB, ARE100, Solarstorm). A02 links dynamically updated evidence indexes instead of requiring edits after every batch. Inspect whether live links accurately label sampled vs verified case data.
2. Preserve **all 39 ARE-A02 check IDs** and old evaluation records, do not silently rescore A02@0.4 or older. New T07 pins `ARE-A02@0.5`, source/deployment revision and tool-risk profile.
3. A computed maturity indication must clearly be **PROVISIONAL**, with `verified_level=null`, and cannot be presented as certification. Static keyword matches are not semantic proof. Current `assessScenario` and T07 validation should use the same `semanticReview`, `coverageReview` and `authorizationReview` helpers as the local audit gate.
4. A new N/A must carry operation scope, rationale, evidence, human reviewer and date, and must be checked against a complete, version-matched operation-risk inventory. A generic "no daemon" must not waive a real in-flight long-running task. Sensitive read and privileged execution must activate their relevant checks even when the operation has no financial effect.
5. The public Benchmark UI should show **four separately labeled tool-contract observations**, without an oversized aggregate 0–100. Keep immutable historical score data in Neon. Unclaimed third parties must not be published.
6. Local `are_review_operation_risk` is read-only, bounded, workspace-scoped, never executed over the public HTTP endpoint. `are_get_template({id:"T10"})` is available for low-context discovery.

## Primary review files

- `mcp/src/checks.ts`, `assessment.ts`, `audit-semantics.ts`, `na-review.ts`, `risk-profile.ts`, `server.ts`
- `adoption/ARE-A02-agent-ready-maturity-model.md`, `.zh.md`, and `ARE-T07` templates
- `adoption/templates/ARE-T10-operation-risk-profile.md` / `.json`
- `data/documents.yaml`, `data/framework.yaml`
- `public/benchmark/app.js`, `public/benchmark/index.html`
- `mcp/test/risk-evidence.test.ts`, `mcp/test/workspace.test.ts`

## Suggested independent verification

Run `npm run typecheck --prefix mcp`, `npm run build --prefix mcp`, `npm test --prefix mcp`, `node --test functions/are-score/preflight.test.mjs` and `node --check public/benchmark/app.js`.

Use an isolated synthetic scenario that:

- Inventories every tool; changes a public read to a sensitive read and toggles privileged execution; ensures corresponding authorization checks are activated.
- Marks L3-S1 N/A with "no daemon" while `long_running=true`; asserts that it is rejected.
- Uses a forged or incomplete N/A, missing reviewer, nonmatching tool ID, out-of-workspace path and different T07 / profile source revision; each must raise a blocker and not count as satisfied.
- Uses a real, complete structured N/A for a truly synchronous public read; verifies it may support a **provisional** level but cannot generate `verified_level`.
- Keeps legacy T07 assessments legible and labeled `LEGACY_UNPINNED_PROVISIONAL`; never backfills old grades or silently compares them.
- Tests the Benchmark page in a browser (desktop/mobile) to ensure it displays four clearly labeled components, no dominant total, and still supports submission, report history and Owner opt-in publishing.

## Known boundaries for review (not hidden)

- This is a **static** operation-risk inventory plus file-based evidence check. `tool_catalog_count`, source signatures and human reviewer names are not cryptographically attested by this tool; real tool discovery, source inspection and trust still require independent verification.
- The T07 semantic evaluator checks some multi-element/scope rules, not all 39 meanings and not live runtime behavior. It never certifies maturity, even with zero automated blockers.
- The previous historical `level` field is still returned for compatibility but is explicitly annotated as provisional and paired with `verified_level:null`; consumers ignoring `level_status` must not imply certification.
- A02's living-evidence links point to data-backed portfolio and research pages. Some older records may be narrower than the full ARE100 latest local research; check source and freshness, do not invent broad study completions.
- No statistical prediction of task success from ARE levels is claimed; only that **ARE has already been applied to real projects**.

## Round 1 independent rejection and Round 2 corrections (2026-11-16)

Claude's first review returned **REQUEST_CHANGES**, citing CE1–CE6. Follow-up code repairs are in the same Draft PR, not merged or deployed:

- **CE1:** Semantically blocked PASS checks are excluded in the *actual* assessment and portfolio grade calculation, not merely listed in `evidence_gate`; evidence requests use the same exclusions.
- **CE2 / CE3:** Only T07 records dated before 2026-11-16 with absent or recognized legacy version can be historical. New missing and unsupported versions return `UNSCORABLE_EVIDENCE_BLOCKED`, `level=null` and `provisional_level=null`, with an explicit blocking issue.
- **CE4:** Global risk-profile/source-revision mismatch makes the whole grade unscorable, clears approved N/A and prevents its inclusion in L4 distributions.
- **CE5:** A cancellable long-running operation continues to block L3-S1 N/A.
- **CE6:** Reject filler N/A explanations, unrelated scope evidence and review dates after T07 or before the profile review. Reviewer names and semantic correctness still require independent human/source verification.

The exact 6 Claude counterexamples were run again; a repository-local, strengthened copy lives at `mcp/test/claude-pr13-regressions.test.ts`. Additional regression covers N/A dates before the risk profile and substantive Chinese N/A explanations. The previously unfilled A02@0.5 T07 template fixture now correctly expects an unscorable grade, rather than a fictitious L0. The A02 evidence section also links a directly verifiable Solarstorm case and Vibe Monitor study; Benchmark's copied prompt now uses the canonical `are.world2.co/mcp`. Re-run these tests and look for new ways to exploit version metadata, source evidence, N/A scope or inconsistent consumers. Do not accept this summary as independent proof.

## Acceptance decision

Please report concrete defects with filename, line, reproduction, impact and minimal fix. Return `APPROVE`, `REQUEST_CHANGES` or `BLOCKED`, with regression outcomes and your assessment of unnecessary complexity. Do not merge or deploy on the user's behalf before review.
