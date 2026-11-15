# ARE Semantic Evidence Gate — Round 2 Real-Project Verification

> 2026-11-15 | ARE local self-audit only | MCP package v0.9.0 | Framework ARE-A02 v0.4 (clarifications only)

## Purpose

Fix the main failure seen in Antigravity's Vibe Monitor Round 2: 39/39 audit rows and existing file paths are NOT enough to establish semantic completeness. A structurally clean assessment may still claim PASS with evidence for an adjacent, weaker property, and may mark a running/interruptible scan N/A because it has no daemon.

This change retains the **39 checks and all ARE maturity level thresholds**. It does NOT change remote Benchmark's HTTPS Endpoint-only registration, issue an official ARE score or accept local stdio as a Benchmark submission.

## Shipped functionality

- Added a local-only, read-only semantic reviewer for selected multielement checks, such as strong schemas (L2-C1), agent identity/credential delegation (L2-A1), external content trust boundaries (L2-A2), amounts and frequency limits vs timeout (L3-A4), authorization receipts vs actor/submissionId (L3-O1), correlation chain (L4-O1), and operational rollout/recovery (L4-R1).
- Fixed L3-S1 applicability: an in-flight cancellable worker/scan must be evaluated as a long-running operation even without a long-lived background daemon. The check is a review issue, not proof of product failure.
- Expanded evidence file extraction to modern IDE rule files (including `.mdc`) without truncated `.md` false matches, continuing to enforce workspace containment/symlink boundary and line range validation.
- Historical **rejected** suggestions (e.g., "the previous recommendation to delete skip_current was a false positive") do not automatically trigger an active tool-retirement blocker. Positive suggestions to remove operations without behavioral-equivalence evidence still do.
- Replaced the unconditional blockers for all-scope checks and L3-A2 with an evidence-aware route: explicit scope numerator/denominator plus requirement-specific test evidence permit a *reviewable* result, never an automatic certification. A nonmatching or incomplete scope stays blocked.
- Clarified in ARE-A02 that for solo maintainers substantive owner-reviewed value/first-batch records can live in a compact Markdown section in README/AGENTS; the standard does not require corporate signatures or specific filenames. Reviewed Owner decision, evidence, scope limits and responsibility remain necessary.
- Distinguished deterministic, scripted MCP SDK probes from autonomous Agent planning + independent end-state verification.

## Actual Vibe Monitor report regression

- Round 2 report input: `/Users/wahaha/Documents/Me/Project/cursor/vibe-monitor-internal/ARE_LOCAL_AUDIT_ROUND2_REPORT.md`.
- Original v0.8.0 gate: `STRUCTURALLY_REVIEWABLE_NOT_CERTIFIED`, 0 blockers.
- New v0.9.0 gate: `REVIEW_REQUIRED`, **8 review blockers**, 3 N/A reviewer warnings.
- Flagged checks: **L2-C1, L2-A1, L2-A2, L3-S1, L3-A4, L3-O1, L4-O1, L4-R1**.
- The 8 flags are **insufficient evidence for a particular ARE claim**, not independently verified Vibe Monitor defects. The report's original PASS/FAIL/UNKNOWN/N/A statuses are NOT rewritten, and no maturity level is automatically assigned.
- Gate schema now `are.local-audit-evidence-gate.v2`. CLI exit code 0 remains "no automated blockers" and **not certification**; 2 means review is required; 3 means execution/input failure.

## Tests and known limitations

- Build, TypeScript check and 90/90 local tests passed in an isolated Git worktree.
- New tests cover positive/negative recommendation distinctions, `.mdc` path matching, incorrect N/A status despite active worker, incomplete vs complete coverage, nonblank server-side authorization rejection tests, and lightweight value-card equivalence.
- Keyword/regex matches and source excerpts **cannot** replace full human/Agent semantic verification. When cited evidence names all required elements, a further human review is still necessary to ensure the implementation and the test executions are real.
- Each N/A still requires an explicit human-reviewed reason; a structural gate may only flag likely contradictions, not automatically decide applicability.
- No source, evidence report or project path is uploaded to ARE. This local validator does not run any Vibe Monitor business tool.
