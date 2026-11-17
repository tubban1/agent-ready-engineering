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
