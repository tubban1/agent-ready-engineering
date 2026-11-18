# ARE Portfolio public API (Neon Functions)

This repository contains the source of the **deployed read-only API** used
by the frontend at `https://are.world2.co/evaluations/`.

Neon project: `are-evaluations` in Frankfurt, branch `main`,
function slug `areeval`. Invocation URL is embedded in the static
`public/evaluations/app.js` and is public **read only**.

`DATABASE_URL` is injected by Neon; the Function passes it to Neon's
HTTPS SQL proxy in request headers, never sends it to the browser.
Fixed SQL queries only. GET `/v1/health` and GET `/v1/portfolio`.
CORS allows only the canonical `https://are.world2.co` origin; old domains are not supported. No admin methods are exposed.

Deployment via the Neon Functions action: zip the function source
as `index.mjs` and deploy with runtime `nodejs24`.
Source of truth schema: `migrations/001_are_evaluations.sql`.

Known limitations: public data is not a substitute for complete ARE
39-check assessments. Missing source evidence remains unknown, not pass.
Automated findings are preliminary. Historical local reports appear as
source_review but are not accredited.


## Canonical unified public directory policy (2026-11-17)

The read-only \`/v1/portfolio\` API deliberately returns a **public projection**, not internal research rows. It includes only \`source_kind='github_public'\`; ordinary entries expose repository metadata and the date **without unpublished findings, evidence, dimension notes or internal batches**. The sole curated published-case exception is \`mcp/solarstorm.today\`, whose public technical report and source references are independently published. Local repository research (4 current rows) is excluded in SQL, not just hidden in the browser. The \`batches\` property is an empty list retained only as an inert response shape; internal scheduling is not public. Any future published case must be explicitly reviewed and added to this server-side allowlist or a dedicated approved publication table; do not infer consent from a status flag.

Public interface: \`/evaluations/\` (English default, Chinese optional), integrating the formerly separate \`/benchmark/\` self-service operations. No database or schema migrations required for this release.


## Owner-signed releases — unmerged owner-review draft (2026-11-18)

The live API currently exposes an ungraded directory of public GitHub projects and
one historically published Solarstorm case. A database user could change directory
metadata, which is **not** a certified product evaluation; the single Solarstorm
case is the only live detailed public case. The new scheme ensures that a database
research INSERT/UPDATE cannot publish *new* evaluation findings.

This source requires two steps before deployment; neither is done yet:
1. Owner reviews and explicitly approves `migrations/005_owner_signed_public_releases.sql`
   and grants separate low-privilege DB identities. The current connected
   `are_evaluations_owner` has DDL and INSERT/UPDATE privileges and must not
   be used as the unattended collector's permanent DB connection.
2. Owner retains the **private** Ed25519 signing key outside all Agents, Neon,
   GitHub and connected desktops. The Neon `areeval` Function contains only
   `ARE_OWNER_RELEASE_PUBLIC_KEYS_JSON` with public SPKI PEM keys; an approval
   is an exact signed `are.owner-signed-public-release.v1` JSON payload.
   A signed REVOKE with higher revision revokes an earlier release. Unverified,
   missing or tampered signatures cannot publish findings.

The version currently in this draft reads signed records from
`are_eval.public_release_events`, verifies bytes with `release_authority.mjs`,
and returns only the signed public payload. All other database rows remain
`directory_only`, with findings/summary cleared. The previously published
Solarstorm case is pinned to a **static source snapshot**; database edits to its
research row no longer modify public claims.

An owner-reviewed Neon deployment must include all three runtime modules in a
single source ZIP: `index.mjs`, `release_authority.mjs`,
`legacy_solarstorm.mjs` (exclude `*.test.mjs`). Never deploy by only
zipping `index.mjs`, because it now imports the other two files.

**Release guard is not yet complete:** independent owner-side signing and DB
connection rotation must be tested before production activation; the same admin
GitHub/Neon identity could otherwise deploy a modified Function that ignores
signatures. Never claim this draft is protecting the current deployed Neon API.

Read-only offline validation: `node --test functions/are-reports/release_authority.test.mjs`.
Do not store a private signing key, OAuth token, or owner database password in repo.
