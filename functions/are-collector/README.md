# ARE public-source study worker

Node 24 Neon Function. Native schedule trigger calls POST `/cron`.
Only Neon-origin verified trigger deliveries can start collection. The Neon
HTTP SQL proxy receives the branch-injected DATABASE_URL; it is never sent
to GitHub or browser.

Fixed eight-slot day: 2026-11-15 02:45–09:45 Zurich, eight batches of 30
candidate repositories. Repo sources from the public GitHub Search API.
Repository code is **never executed**. Findings are marked `preliminary`,
assessment_level=NULL, and every sampled public file is cited by URL.
If GitHub rate limits or source access blocks work, batch marks partial/failed.
Avoid claiming 30 successfully analyzed unless the database says so.

The worker is intentionally separate from the public `areeval` function.
