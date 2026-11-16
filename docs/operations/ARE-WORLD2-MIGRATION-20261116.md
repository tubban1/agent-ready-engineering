# ARE World2 domain migration — live evidence (2026-11-16)

## Scope and identity

- **New canonical endpoint:** https://are.world2.co/mcp
- **New landing page:** https://are.world2.co/
- **Legacy compatible endpoint:** https://are.fde.fan/mcp (kept attached to same Vercel project; not redirected)
- **World2 Agent registry:** https://world2.co/app/are-agent-ready-engineering-mcp-2ca4d14b
- **World2 app.mcp Resource ID:** `2ca4d14b-2b82-43f9-9eea-d2de82ecb845`; version 1; World2 SHA-256 `7b0b80ffdb77bb3c8a8f48fb552849ae141d69b952d296b85fcf31ecb0a7104a`.
- **Service Vercel project:** `agent-ready-engineering` / team `tubbans-projects-c58b36e6`; source GitHub `tubban1/agent-ready-engineering`.
- **DNS:** Cloudflare zone `world2.co`, CNAME `are.world2.co` → `9507d27340539688.vercel-dns-016.com`; TTL 60, DNS-only; record ID `9eb0b7c27f0af62ceb6fa595eb4f96cc`.
- **Original DNS and unrelated services:** untouched; Interior `interior.world2.co` remains on separate project.

## Independently observed BEFORE UI release

1. Vercel accepted new project hostname as `verified=true`. Its DNS diagnostic reports `configuredBy=CNAME`, `misconfigured=false`, and no conflicts.
2. New and old endpoints support official MCP TS SDK v2 modern handshake, both reporting server `are@0.9.0` and the **same nine public tools** (`are_list_documents`, `are_get_document`, `are_search`, `are_get_check`, `are_list_checks`, `are_get_template`, `are_evidence_request`, `are_local_mcp_audit_guide`, `are_score_mcp`).
3. `node mcp/conformance/probe.mjs` on both hosts: **9 PASS, 0 FAIL, 1 UNKNOWN, 1 NOT_APPLICABLE** in the *bounded* 2026 profile, not an official exhaustive conformance certification.
4. Real public read-only `tools/call`: both `are_list_checks` and `are_list_documents` succeeded on **each host** (4 calls total); observed 170–230 ms; output lengths and framework revision were consistent across hosts.
5. World2 `world_publish(kind=resource)` created the `app.mcp` public object atomically after user explicitly requested service registration. World2 `world_query(resource=resource)`, `catalog` and `app_connection` independently returned the exact object, manifest and new endpoint. This proves **World2 publication/discovery**, not that World2 proxies ARE execution, attests code, or grants other Agents credentials.
6. World2 published manifest declares that `are_score_mcp` Benchmark submissions are opt-in and not equivalent to independent certification.

## Landing page and release checks

- The ARE landing page is English-first, links to fast preflight, deep self-evaluation, assessments and public case evidence, and displays the copyable canonical evaluation prompt exactly from `docs/prompts/channels/WEBSITE_GENERAL_EVALUATION.md`.
- Deployment of the new landing content and final independent model-based Agent acceptance are tracked in the corresponding release verification results. Do not claim a passed gate before observing the deployed page and real Agent trace.
- The current GET `/mcp` may return HTTP 405, which is expected for a POST-only transport and not a failed MCP connection.
- No change to independent ownership, runtime service code, model-based score methodology, or authorization is implied by a hostname or World2 catalog publication.

## Rollback

- If the new hostname or website regresses, keep `are.fde.fan/mcp` attached and available as a known-good fallback.
- DNS record change should be audited and reversible; do not remove shared `world2.co` MX, DKIM or existing subdomain routing.
- World2 public descriptor can be versioned/withdrawn by its publisher if the new endpoint proves incorrect.
- Client-side canonical URL changes are separate from transport reliability; do not assume POST-following redirects work across every MCP client.

## External contact policy

- **Human partnership and ARE maintainer review:** display `liang.rao@world2.co`, Reply-To `liang.rao@world2.co`. No new outreach is sent by merely updating the website.
- **Unattended notifications/support:** retain `agent@world2.co`; no claim that it is unattended when a real support Agent is active.
- Cloudflare Email Routing on `liang.rao@world2.co` now forwards to already verified `liang.rao@gmail.com` via explicit route ID `e05bcb4232134bb48ecd543901538eb7`.
- Existing `agent@world2.co` Cloudflare route to `world2-support-agent` is untouched.
- Sender availability in Brevo still requires a validated Brevo sender identity and SMTP/API credentials in the outbound sending client. **Cloudflare incoming forwarding does not configure outbound Brevo sending.**

## Brevo outbound records and archiving

Brevo Transactional → Logs records messages sent via SMTP/API, and their server events (sent/delivered/bounced, optional open/click depending on tracking). The list/search API is `GET /v3/smtp/emails`; event reports are `GET /v3/smtp/statistics/events`. Provider docs: https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews

Gmail receives forwarded incoming mail, but a Brevo API/SMTP outbound send **does not automatically create a Gmail Sent item**. Implement sender logging using Brevo `messageId`/UUID, recipient and case ID in a restricted datastore; if Gmail copies are desired, use an authorized BCC-to-own-mailbox or explicit Gmail Sent import with duplicate-suppression. Do not include secrets/recipient addresses in public evaluation pages. Sender name for relationship communications: `Liang Rao | World2 / Agent-Ready Engineering`.

**Limitation:** This review has not independently enumerated this account's actual Brevo logs or verified that Brevo's sender registry already permits `liang.rao@world2.co`. Do not mark outbound configured until a safe, authorized send and Brevo event readback can be confirmed.
