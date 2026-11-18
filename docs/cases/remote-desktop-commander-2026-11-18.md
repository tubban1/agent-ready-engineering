# Remote Desktop Commander — ARE independent limited-scope reassessment

**Date:** 2026-11-18 (UTC)
**Target:** https://mcp.desktopcommander.app/mcp
**World2 catalog ID:** `592ec3d4-d077-5ab6-83cd-09243285fe02`
**Result:** limited engineering assessment; **no official protocol certificate; ARE maturity NOT_ESTABLISHED**.

## Dated correction — 2026-11-18

**The seven historical `FAIL` labels are not verified failures of the native Remote Desktop Commander hosted MCP server.** They record differences from custom ARE engineering criteria as seen through a ChatGPT host adapter and unexecuted write-tool schemas. Server-side implementation and deployed-source binding were not proven, and some requirements may not apply to this product or constitute mandatory product conditions. The original 2 PASS / 7 FAIL / 30 NOT_VERIFIED record remains intact for auditability, while its attribution, applicability and assessment methodology are being reviewed under the separate MCP-product and adopter-governance questionnaires. This does **not** retract the positive real Agent result or assert a vulnerability.

## Identity, source and scope

- Official public repository: https://github.com/desktop-commander/remote-desktop-commander
- Pinned public repository revision: `c0564c8105018fa76689268f19219e986e9002d4` (2026-11-17, Release 1.1.30).
- The public repository explicitly contains documentation/manifests; the hosted implementation is proprietary. **Public source → live deployment is NOT VERIFIED.** Its revision must not be described as deployed code.
- Live ChatGPT connector: authenticated OAuth session, **one online macOS device**, reported local device agent `0.3.3`. The connected host surface exposes **30 tool declarations**. A direct authenticated `tools/list` against the raw MCP endpoint was **not** independently captured; this is host-adapter coverage, not a verified complete wire-protocol inventory.
- Test authority: only the owner's pre-existing synthetic directory `fixture/`, plus nonmutating local metadata and isolated read-only computation. **No writes, deletes, shell changes, configuration changes, user-file inspection, high-rate calls, or penetration testing.**
- Public product docs: https://desktopcommander.app/help/security-privacy/use-safely-limit-access ; https://github.com/desktop-commander/remote-desktop-commander/blob/main/SECURITY.md

## Evidence-backed positives

1. The remote connection succeeded with an authenticated account and recognized one online paired device.
2. **30/30** host-declared tools have a saved contract snapshot; **11/30** distinct tools were exercised using nonmutating operations. **19/30** remain unexecuted, notably state-changing/control tools.
3. `read_file`, `read_multiple_files`, `list_directory`, `get_file_info`, content search, and `start_process` worked on authorized synthetic or read-only inputs.
4. A real ChatGPT Agent solved one multi-step synthetic CI-triage task: **24 rows, 8 distinct services; 4 latest PASS and 4 latest FAIL; 2 slow latest runs; 5 services requiring action.** Independent Python recomputation agreed exactly; fixture SHA-256 `d9e9d546d9a6f696312e74e2f4d9bbd6d6c449b5269d88a431523a53ce8dcb53`.
5. Current device configuration visibly supports `blockedCommands`; tool usage reports also exist. These facts do not establish a secure sandbox or complete audit trail.

## Seven ARE engineering gaps (scoped to the observed ChatGPT adapter)

| ARE ID | Observed scope and recommendation |
|---|---|
| L2-C2 | Nonexistent fixture `read_file` generated ENOENT as a host exception rather than a stable error result carrying `code`, `retryable`, `retry_after`, and `hint`. Recommend a machine-readable error envelope. |
| L2-X1 | Read/search contracts provide offsets and some search filters but not the entire field-projection + server-filter + cursor contract. Consider structured projections and cursor semantics for large responses. |
| L2-X2 | Paginated text reports remaining lines, but inspected responses do not include machine-readable `truncated` and `next_cursor`. |
| L2-X3 | ChatGPT sees 30 static tool declarations; no index-first, schema-on-demand discovery surface was observed. Progressive discovery could reduce context load. |
| L3-C1 | The exposed `write_file`/`edit_block` input contracts do not accept idempotency keys. No write was performed; server-internal duplicate protections are UNKNOWN. |
| L3-C2 | The exposed mutable-file contracts do not require `expected_revision`, nor document a structured conflict diff. No conflicting writes were performed. |
| L3-C3 | The exposed write/edit/move inputs lack a general `validate`/`dry_run` mode. No writes were performed. |

**These are ARE design gaps; no official MCP MUST violation or exploitable security vulnerability has been established.** The host adapter may hide server-side behavior; maintainer clarification is required before attributing a finding to the proprietary hosted server.

## Security and permission model — critical distinction

The vendor documents that an empty allowed-directory setting allows broad local filesystem access at the OS user's privilege level, and that command blocking is an advisory guardrail rather than a sandbox. **This is a public trust-model description, not an inspection of the owner's private configuration and not a proven breach.** For least-privilege deployments, recommend sandbox/limited OS user, allowlisted folders, revocable OAuth connection, and read/write prompt gates. Do not publish the owner's device identity, account details or filesystem paths.

## Coverage and certification

- ARE: **2 PASS / 7 FAIL against design criteria / 0 N/A / 30 NOT_VERIFIED = 39**; full entries in `assessment.json`.
- Source review: public repository documentation pinned; service implementation unavailable. Live source binding UNVERIFIED.
- Native transport/SDK protocol compliance: NOT_VERIFIED (working authenticated ChatGPT integration ≠ complete MCP conformance).
- Real Agent: **one** independently checked task succeeds; multi-run reliability, Windows/Linux interop, disconnect/retry, state-changing tools, and security fault injection NOT_VERIFIED.
- No L1–L4 maturity certification. These FAIL checks are not a 7/39 overall security rating.

## Minimal safe maintainer reproduction

1. On an authorized, nonproduction paired device, create a synthetic directory with `TASK.md` and `runs.csv` containing no real user data. Our immutable test fixture and `independent_oracle.json` define the exact task and oracle.
2. Connect to `https://mcp.desktopcommander.app/mcp` through an authenticated ChatGPT MCP connector.
3. Read the two files using `read_multiple_files`; identify the most recent UTC row per service, count PASS/FAIL, list failed or >900ms latest services, and compare with an independent CSV parser.
4. Request `read_file` for a nonexistent file *inside that synthetic directory*, and inspect whether the error is a structured code/retryability envelope. Do not attempt path escape or private data access.
5. Review exposed write-tool schemas for idempotency key, version precondition/conflict response, and dry-run **without executing writes**. Maintainers may reproduce write safety in their own dedicated sandbox.

## Feedback questions to the maintainer

- Is the ChatGPT adapter's set of 30 tools the full current native `tools/list` or a filtered subset? Which MCP protocol revision is negotiated?
- Can the remote hosted service expose a typed error envelope for ENOENT and other common failures?
- Is there any server-side idempotency, optimistic concurrency, validate/dry-run, or per-operation claim enforcement beyond the host-exposed input schemas?
- Is the remote service backend associated with a verifiable build/release ID, separate from public documentation release commits?
- Is the documentation on folder restrictions, command blocking and execution scope expected to be the recommended least-privilege deployment baseline?

## Correction and disclosure

ARE is an independent World2 engineering assessment, not a product certification, maintainer endorsement or vulnerability announcement. The source/service identity and authorization limits are explicit. Maintainer corrections should be appended as dated revisions; post-fix status can only be changed after an independently observed new deployed version and rerun against the same oracle.

**Private evidence files:** `candidate.json`, `host_tool_contracts.json`, `tool_runs.json`, `agent_run.json`, `independent_oracle.json`, `fixture/fixture_manifest.json`, `assessment.json`.

**Intended canonical URL (not proof of publication):** https://are.world2.co/evidence/remote-desktop-commander/
