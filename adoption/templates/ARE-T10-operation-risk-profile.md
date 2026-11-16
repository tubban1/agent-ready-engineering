# Operation-level Risk Profile (ARE-T10)
> Document ID: ARE-T10
> v1.0 | ARE-A02@0.5 | English canonical. Chinese guidance: `../../docs/standards/ARE-OPERATION-RISK-PROFILE-v1.md`.

## Purpose

Create a machine-readable risk inventory for **every** observed MCP tool or business operation. It is an assessment aid, **not** an Agent permission or maturity certification.

## Template and fields

Copy the real JSON template [`ARE-T10-operation-risk-profile.json`](ARE-T10-operation-risk-profile.json) to the scenario workspace as `ARE-T10-operation-risk-profile.json`, and replace all placeholder values. Do not copy this explanatory Markdown as the profile itself.

- `source_revision`: immutable assessed source revision matching the T07 `Version assessed` field.
- `tool_catalog_count` and `operation_count`: must equal the actual observed tool inventory.
- `operations[].id`: stable MCP tool name or operation ID; no duplicates.
- `read`: `none`, `public`, `private`, or `sensitive`.
- `write`: `none`, `reversible`, or `irreversible`.
- `external_effect`, `privileged_execution`, `financial`, `long_running`, `draft_state`: independent booleans, not a single rank.
- `annotations`, `evidence` (local relative file), `evidence_type`, `reviewed_by`, `reviewed_at`, `standard_version`.

For review, use the local (not public) ARE MCP tool `are_review_operation_risk({"path":"scenarios/service/ARE-T10-operation-risk-profile.json"})`. Use T07's structured `N/A{scope=...; reason=...; evidence=...; reviewer=...; reviewed_at=...}` only when supported by the operation inventory.

All results are evidence-scoped and provisional. For updates, re-pin source and tool catalog, regenerate the profile, rerun evidence checks, and keep prior versions intact.
