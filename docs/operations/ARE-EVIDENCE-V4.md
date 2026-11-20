# ARE evidence intake V4 — general Agent testing, validate-first, private Neon

## Design

One filtered project, one scoped Task Token and one complete prompt remain the user workflow. The Owner page is `https://are.world2.co/tasks/`. The MCP is `https://are.world2.co/mcp` (v0.14). Active V3 Task Tokens remain valid, because in-flight independent assessments such as the Etuki case must not be orphaned.

The project pool's screened `runtime_endpoint` is frozen in the new task plan and shown in the generated prompt, together with `auth_mode`, estimated tool count and time limit. An existing issued task without a frozen endpoint obtains the current screened candidate address. **A screened endpoint is not independently verified to be deployed from the pinned repository revision**: the assessor must check that link and identify the evidence, and human reviewers must confirm it.

## Native task MCP workflow

1. `are_get_task({task_token})` obtains scoped project, target Endpoint, expected authentication, plan, and a 32-criterion draft.
2. `are_get_criteria({task_token,offset:0/8/16/24})` returns actual test protocols. Never infer the contents of the 32 checks from the IDs.
3. Discover/execute the target MCP, covering each safe authorized tool. Record every discovered tool and stable primary traces with `are_checkpoint`. If source version or endpoint cannot be tied together, preserve that limitation.
4. Assemble a complete evidence package. The `evidence_artifacts` array has objects with:
   `{id,kind,content,sha256,provenance}`. Allowed kinds are `trace`, `oracle`, `source_binding`, `agent_task`, `authorization`. The SHA-256 is computed from the exact redacted `content` bytes (UTF-8) — not an arbitrary text label. Oracles also require `oracle_method` = `external_source`, `known_fixture`, `state_readback` or `independent_calculation`. This is **assessor-declared provenance**, not server-verified truth. Up to 256 artifacts, max 4000 characters each and overall package <=340 KB.
   Each PASS tool links a `trace_ref` and an `oracle_ref` to real attached artifacts; FAIL links trace; blocked operations link a trace and reason. Every PASS/FAIL criterion links an attached `evidence_ref`. N/A/UNKNOWN/NOT_TESTED requires a reason. `source_binding.verified=true` requires an attached `source_binding` artifact; if not proven, use `verified=false` and a clear reason. At least one real Agent goal must be recorded, which can be `BLOCKED_AUTH` when human OAuth is unavailable.
5. **Mandatory no-write** `are_validate_assessment({task_token,evidence_package})`. Returns `valid`, blocking `errors[{path,code,message}]`, `warnings`, `metrics`, deterministic `normalized_summary`, `report_preview`, payload hash and server-observed elapsed time. No insert, no revision consumed, no change to the task; iterate until valid. A valid blocked-auth package can still be an incomplete private report; it is never human-verified automatically.
6. `are_submit_assessment({task_token,evidence_package})` rejects incomplete evidence with HTTP 422 and per-path issues **before** Neon INSERT, regardless of the SQL task revision count. Validated report is stored append-only, idempotent for identical payloads. A task now allows up to **25 distinct validated revisions**, rather than only five opaque trial revisions. The summary persisted to Neon is generated from the structured findings and tool statuses. Artifacts and server-observed time are persisted with the report JSON.
7. `are_get_submission({task_token,submission_id})` reads persisted canonical metrics and a deterministic `canonical_report`. The Agent must show users **this** report, not an independent narrative inconsistent with the stored 32 results.

Old private reports, including the Etuki Antigravity run `9e6e449b-d340-4421-98d7-fd2d26c3e3a0`, remain unchanged. Existing 5 Etuki revisions do not prevent subsequent corrected submissions under the increased limit, while the Token remains active and unexpired. No automatic public publication.

## OAuth

For HTTP targets the Agent can discover authentication requirements from a `401` response and `WWW-Authenticate: Bearer resource_metadata=...` referencing RFC 9728 OAuth Protected Resource Metadata. In a separate read-only calibration, the official GitHub MCP Endpoint `https://api.githubcopilot.com/mcp/` returned such a 401 and the metadata URL `https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/`, whose `authorization_servers` included `https://github.com/login/oauth`. **No user consent or token grant was tested**, and no GitHub MCP data actions were performed. An actual OAuth end-to-end pilot requires a supported MCP-capable Agent host, an authorized project/account, a human completing official consent, subsequent safe `tools/list`/tool calls, and recovery after expired or denied consent.

For blocked authentication, include `test_metadata.authorization_events` with nonsecret `{status,evidence_ref}` events (status one of CONSENT_REQUIRED, GRANTED, DECLINED, FAILED, EXPIRED); `evidence_ref` must link to an attached `authorization` artifact. A `BLOCKED_AUTH` Agent task and blocker allow a truthful private incomplete report with zero discovered tools; owner verification will still reject it for release readiness.

## Review and publication safety

Owner verification now checks 32 criterion rows, actual artifact index, source-binding statement, at least one Agent task and positive verified evidence/ready state, **not merely 9/9 tool PASS**. `NEEDS_EVIDENCE` and `BLOCKED_AUTH` cannot be marked VERIFIED, cannot create a publication draft and cannot automatically email or publicly post to third parties. The reviewer UI shows all 32 stored verdicts, primary artifacts and Agent tasks for independent inspection. The task Token is revoked once the Owner marks a complete packet VERIFIED; NEEDS_RETEST is allowed for incomplete, legitimate work.

## Production roll-forward

Execute Node private API tests (including read-only preflight, real evidence-hash verification, invalid draft non-write, OAuth blocker, and deterministic report); MCP tests; Python ARE evaluation tests; TypeScript typecheck/build; published case gate. Inspect Neon query plans for issue/read/receipt/review without mutating data. PR merging, production Neon Function and Vercel deployments, then live read-only verification. Do not disclose credentials or test unsupported user OAuth without consent. Historical assessments and existing active tokens are preserved.
