# ARE Publication Runner v1 — reproducible case → developer value → safe public reach

**Status:** Implemented and tested on one bounded public-read-only Solarstorm case, 2026-11-16.
**Canonical service:** https://are.world2.co/mcp
**Process authority:** [ARE S0–S13 SOP](ARE-EVALUATION-PUBLICATION-SOP-v1.md)
**Owner:** Agent-Ready Engineering, a World2-managed first-party MCP service.
**Source:** `scripts/are_publication.py`, `scripts/test_are_publication.py`, and [Solarstorm case manifest](../cases/data/solarstorm.json).

## 1. What is automated and what is not

**Automated, deterministic, side-effect-free:** validate project ID and safe scope, validate all 39 rule IDs against an independent `assessment.json`, prevent unsupported maturity and deployed-source claims, check all-tool metadata vs actual execution coverage, check email delivery/reply distinctions, require a changed deployed version plus independent oracle for S13 closure, render English project-specific public and maintainer prompts, format channel-native post drafts, print the S0–S13 status matrix, and manage append-only channel publish receipts under a host-scoped, idempotent lock.

**Not automated by this runner:** live third-party MCP calls, production writes, OAuth login, source code inspection, actual model/Agent evaluation, Google/GitHub/Gmail/Brevo sending, social publishing, or independent verification that an external maintainer fixed a service. These are delegated to authorized connected tools and can only enter the runner through reviewed evidence. No invented background activity.

## 2. Required inputs and evidence model

1. **World2 source:** fixed service ID/URL, real website/operator identity, public repository SHA when present, and official contact channel. `source.binding=UNVERIFIED` is common; it is not a finding by itself.
2. **All tools:** `discovered`, `contract_checked`, `called` counts and a **complete list** of tools (including tools not safe to execute). The current public-read-only runner requires all discovered tools to be expressly allowed and safe; do not force this manifest on mixed read/write servers without adding a risk-class matrix.
3. **Business Oracle:** model host, run count, actual MCP call count and independent, time-bounded observable oracle. One successful run may support one scenario, not a statistical reliability claim.
4. **ARE 39 checks:** exact canonical IDs from `data/checks.yaml`, per-check status `PASS/FAIL/NOT_APPLICABLE/NOT_VERIFIED`, honest scope reasons and separate maturity assessment. Full coverage of *recording states* is not full verification.
5. **Outreach:** verified maintainer contact, message timestamp, specific provider evidence scope and delivery state. Public case manifests must not contain private email message bodies or secret tokens. Keep raw Gmail/Brevo receipt IDs and confidential correspondence in the access-controlled evidence store.
6. **Channels:** whether website/GitHub/X/LinkedIn/HF/ModelScope/Reddit/video is `PUBLISHED`, `BLOCKED_HUMAN`, `BLOCKED_MODERATION`, `ACCOUNT_UNVERIFIED`, `CONTENT_READY` etc. `PUBLISHED` requires a URL, actual publication timestamp and verifier. External posting needs its own authenticated tool, not an invented script shortcut.
7. **Maintainer reply and retest:** replies and actual changed deployment are external evidence dependencies; do not force closure with just a follow-up email or a second identical baseline test.

Input schema: `are.publication.case.v1`, example `docs/cases/data/solarstorm.json`. No personal passwords, API keys, OAuth secrets, private attachments or users' health/financial information belongs in this checked-in manifest.

## 3. Run exactly one candidate from World2 through the pipeline

Use an isolated Git branch/worktree; never reset unrelated changes. On a new project:

**S0–S1**: query World2; select *one* qualified candidate with verifiable owner and a legitimate safe testing task. Record approved scope and publicly verifiable contact. If no safe path or operator identity, mark `BLOCKED`, do not push ahead simply to hit a quota.

**S2–S5**: perform version-appropriate MCP connection + full paged tool inventory; inspect tool schemas and source handlers, record actual tool execution per risk class in authorized environments; freeze request traces and tool-schema hash. In the public-only runner, use benign low-volume reads and safe validation tests. Do not call auth, write, payment, bulk messaging, deletion or control tools without owner authorization.

**S6–S8**: run an actual model-based Agent against the MCP (not only a direct SDK), check its result against an independent truth, record all 39 checks; classify observed problems vs engineering suggestions vs uncertainty; build a privacy-reviewed developer report.

**S9**: look up the operator's official email and previous sent/replied history. Use *project-specific* English maintainer retest prompt; send once with `Liang Rao <liang.rao@world2.co>` only when Brevo sender identity and send receipt are actually verified, then log the Message-ID/event. Do not re-send on the same day; recipient read/reply remains unknown unless evidenced. Automated notices may use `agent@world2.co` but human relationships should not.

**S10–S11**: publish a non-sensitive public case at `are.world2.co/evaluations/` and a stable GitHub case. Optional channel-native public replay prompt must be specific to that server's safe tools and independent oracle. Use a separate original discussion rather than mass-creating third-party promotional GitHub Issues. Social posts can be attempted only on a verified ARE-appropriate account; if human approval is required, leave `BLOCKED_HUMAN`. A browser click without a returned public permalink is not a `PUBLISHED` result.

**S12**: read real maintainer responses, moderation events, and discussion receipts. Attach replies as evidence, not marketing claims.

**S13**: ONLY after a changed deployment, authorized safe scope and matching independent oracle comparison, rerun original acceptance criteria and append a dated *before/after* case revision. Preserve original input, timestamps and SHA-256 logs. An unchanged server plus a second live read does not constitute post-fix retest.

## 4. Executable commands (local Mac; no third-party writes)

From the ARE repository root:

```bash
# Verify the model against the real Solarstorm 39-check source evidence (local private data stays local).
python3 scripts/are_publication.py validate docs/cases/data/solarstorm.json \
  --assessment docs/research/ARE_PILOT_SOLARSTORM_20261116/assessment.json

# Render five deterministic deliverables; NO email or post is sent.
python3 scripts/are_publication.py render docs/cases/data/solarstorm.json \
  --out /tmp/are-solarstorm-render

# Print accurate 14-stage and per-channel status.
python3 scripts/are_publication.py report docs/cases/data/solarstorm.json

# Unit gates (should run before merge).
python3 -m unittest -v scripts/test_are_publication.py
```

The sample result: **4/4 tools**, **one real Agent task with NOAA cross-check**, **39/39 checks accounted for** but **4 PASS / 2 FAIL against ARE design recommendations / 10 N/A / 23 NOT_VERIFIED**, **no maturity level**, S12/S13 waiting external. Source version `1.0.3` and live version `1.0.0` are NOT bound.

## 5. Publication receipt procedure (manual proof → idempotent durable record)

After an actual authorized post, use the provider/API or a signed-in background browser to open/read the **public permalink**. Record the posted outcome as a private, reviewed file, for example:

```json
{"posted":true,"url":"https://x.com/tubban1/status/ACTUAL_DIGITS","observed_via":"browser_readback"}
```

Do **not** create an optimistic receipt file or invent a URL. Record it with:

```bash
python3 scripts/are_publication.py receipt docs/cases/data/solarstorm.json \
  --channel x --url "https://x.com/tubban1/status/ACTUAL_DIGITS" \
  --method browser_readback --receipt-file /private/actual-receipt.json \
  --ledger /private/solarstorm-publication-receipts.jsonl
```

The runner validates URL/host, requires a **preexisting nonempty matching receipt**, and uses an exclusive file lock with `fsync`. Repeating the exact same receipt returns `ALREADY_RECORDED`; a different URL for the same case/channel raises a conflict, requiring human review. Keep raw receipts in a private store; publish only safe URLs and aggregate states.

This is a receipt-validation aid, not cryptographic proof a website genuinely published: the external readback MUST happen first. Never claim that creating a local JSON receipt alone verifies the social platform.

## 6. Fail-closed escalation and repeatability

| Issue | Correct disposition |
|---|---|
| Partial protocol compatibility | Record exact version and test subset, no official certification |
| Tools/list succeeds but only a sample of tools/call | Complete *inventory*, partial *execution*; don't merge denominators |
| Source/production cannot be bound | `UNVERIFIED`, no code-to-production causal assertion |
| No independent Agent task | `S6 PARTIAL/NOT_VERIFIED`; no independent task success claim |
| 39 IDs or status totals incomplete | Fail runner validation |
| Email sent but no reply | S9 completed send, S12 WAITING_EXTERNAL, S13 WAITING_EXTERNAL |
| X requires human publish | S11 channel BLOCKED_HUMAN, no permalink; avoid bypassing |
| LinkedIn draft entered but no permalink | `CONTENT_READY`, not published |
| Hugging Face post pending moderation | BLOCKED_MODERATION, don't duplicate |
| Owner-side new code not yet deployed | S13 WAITING_EXTERNAL, no fabricated repair |
| New deployment tested and Oracle passes | Append actual post-fix evidence + version; then S13 can be completed |

**Review and correction policy:** If a previous report is wrong, publicly record a dated correction. Do not rewrite raw historical evidence to make the workflow look successful.

## 7. Extension to ARE100 and other MCPs

Do not pick 100 projects first and mark them all done after an SDK scan. Filter the existing World2 catalog for *open code, testable legal operations, owner contact and independent oracle*. For each eligible project, create a case manifest and separate private run ledger. Run tests with a service-specific budget; publish only once per verified case/channel; monitor responses; retest when evidence actually changes.

Later phases may add first-party connectors (Gmail/Brevo, GitHub, X, ModelScope, Hugging Face), automated receipt readback and Neon's immutable ledger, but each connector must preserve the same explicit authorizations and stage gates. No cross-service tool privileges are inherited merely from World2 registration.

**Solarstorm project-specific live documents:** [case](../cases/solarstorm-2026-11-16.md), [public recheck](../cases/solarstorm-public-replay-2026-11-16.md), [operator retest](../cases/solarstorm-maintainer-retest-2026-11-16.md), [status](../cases/solarstorm-run-status-2026-11-16.md).
