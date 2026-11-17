# ARE Operation Risk & N/A Review (v1)

> Applied to ARE-A02@0.5; evidence-aware, **not** an authorization token or certification.

## Scope and intended architecture

Harnesses plan and choose tools. MCP connectors expose capabilities. Service runtimes own the actual effects. Risk is assessed **per operation**, then aggregated for applicable ARE checks; it is not a single four-level scale. A read that exposes private health data may be higher impact than a reversible write; a privileged shell command can be high impact without payment.

Use the local JSON template [ARE-T10-operation-risk-profile.json](../../adoption/templates/ARE-T10-operation-risk-profile.json). Replace **all** example values with real source revisions, tool names, inspected evidence and a reviewer. The profile must cover the complete discovered tool inventory, not a favorable subset.

Fields for each operation: `id`, `read` (`none/public/private/sensitive`), `write` (`none/reversible/irreversible`), `external_effect`, `privileged_execution`, `financial`, `long_running`, `draft_state`, `annotations`, `evidence`, `evidence_type`. The overall `operation_count` and `tool_catalog_count` must match the actual inventory, with no duplicate tools. Pin `source_revision`, `standard_version` and `reviewed_by` / `reviewed_at`.

An annotation is a claim, not side-effect proof. Contradictory `readOnlyHint` and write/external/privileged flags are review blockers. No service may label an operation as read-only to bypass checks. Missing or unsafe evidence paths are also blockers.

## Structured N/A

ARE-T07 records a header `Standard version | ARE-A02@0.5` and `Risk profile | ARE-T10-operation-risk-profile.json`. For each N/A, put in the evidence/reason column:

```text
N/A{scope=tool_a,tool_b; reason=These named operations have no mutable state and no long-running jobs; evidence=evidence/no-long-jobs.md; reviewer=Owner Person; reviewed_at=2026-11-16}
```

The `scope` is one or more tool/operation IDs from the verified inventory, or `all` only when all tools are accounted for. The evidence must exist inside the authorized scenario folder. A generic sentence, filler/repeated-character reason, missing reviewer, short justification or non-inventory ID is rejected. The N/A evidence must identify its named operation IDs (or at least an inventoried ID for an all-tools claim). The review date cannot be later than the T07 date or earlier than the risk-profile review date. These static checks still cannot verify whether the claimed human review actually occurred. N/A is not permitted when the risk profile shows operations to which that check applies.

Examples: `long_running=true` activates L3-S1 even with no daemon; `privileged_execution=true` activates relevant L3 authorization, safety-limit and audit checks; `read=sensitive` activates corresponding read-credential and trust controls; `financial=true` activates authorization and limits. L3-S2 applies when `draft_state=true`.

These tag mappings are **conservative applicability hints**. A profile cannot prove that an undeclared behavior does not exist. A reviewer must inspect sources and live side effects. Static approval never authorizes the Agent to act.

## Assessment consistency and history

- New A02@0.5 T07 uses the same local semantic/coverage review rules as the audit evidence gate. Missing evidence and invalid N/A do **not** count toward provisional level computation.
- A `level` calculated from documentation is ALWAYS `PROVISIONAL_EVIDENCE_REVIEW`, with `verified_level=null`, never an ARE issued certification. A local static gate cannot prove actual behavior or human approval.
- Pre-2026-11-16 v0.4 or unpinned T07 records retain their historical computed levels, labeled `LEGACY_UNPINNED_PROVISIONAL`. They do not revalidate current exposure (`consistent=null`, `LEGACY_NOT_REVALIDATED`), nor count toward the current portfolio `distribution` or evidence-request completion. Use `legacy_distribution` for archival values; nonexistent calendar dates are unscorable. A backdated filename is not proof of original historical provenance.
- Reproduce a new assessment at its pinned source revision and artifact hashes; changing the tool catalog requires a fresh risk profile and evaluation.
- Public HTTPS preflight score is a different, read-only contract inspection (no tools/call). Its stored legacy 0–100 field is retained for historical continuity, but the public UI highlights four observed dimensions, not an unvalidated overall quality score.

## Living evidence

ARE already has real-project evidence (Interior, OWL LAB, Vibe Monitor, ARE100, Solarstorm). New samples and case records are reflected via [live evaluations](https://are.world2.co/evaluations/) and [Benchmark research](https://are.world2.co/benchmark/) rather than editing A02 sample counters. Distinguish live discovery, source review, real Agent tasks and actual independent business outcomes.
