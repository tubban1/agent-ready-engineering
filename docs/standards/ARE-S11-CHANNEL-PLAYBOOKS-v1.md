# ARE S11 — Single Canonical Case Page & Link-Only Distribution (v2)

**Effective date:** 2026-11-16. **Owner:** ARE / World2. **Language:** English by default; Chinese is appropriate for ModelScope and Chinese-language communities.

## Decision

Every independently reviewed MCP receives **one canonical public report under are.world2.co**. Its report contains the complete assessment and the evidence needed to interpret and reproduce its findings. Channel distribution consists of a **native, concise explanation plus that one canonical link**. Images, videos, separate Hugging Face Datasets/Spaces, and ModelScope Studio demos are **not required or produced by the default workflow**. They may be separate explicitly approved future projects, never prerequisites.

Example canonical URL: https://are.world2.co/evidence/solarstorm/

The legacy media and dataset *landing routes* redirect to the canonical page. Raw structured evidence is downloadable **from the report page itself**, not promoted as an additional destination.

## S0–S10 — Technical work unchanged

Use the existing S0–S9 independent discovery/qualification, safe contract/tool execution, real Agent task, independent business Oracle, 39 check classification, maintainer-private feedback, and publication QA. S10 must produce a reviewed single public page that includes:

1. **Identity & tested snapshot:** project, original endpoint, World2 catalog identity, date, live version, pinned source commit/version, and whether exact deployment is proven.
2. **Executive assessment:** meaningful positives, concrete negative findings, important limitations. Do not confuse ARE guidance with official MCP MUST failures; never infer certification or rank from insufficient evidence.
3. **Real test coverage:** public tool inventory + static vs actual invocation coverage, applicable bounded protocol checks, real Agent task/model/host, and independent Oracle checks with actual mismatches/timing explained.
4. **39 ARE states:** every ID, PASS/FAIL/N/A/NOT_VERIFIED, brief reason and evidence reference; unknown is not pass, N/A needs a reason.
5. **Evidence and reproducibility:** inspectable safe structured records and source links on the same case page, source SHA, timestamp, public replay prompt and approval boundary. Where private raw logs cannot be exposed, state that limitation rather than pretending an evidence link exists.
6. **Status and updates:** correction history, maintainer feedback status (sent ≠ read ≠ agreed), confirmed fixes only after independently verified deployed-version retest.

The publication gate is public browser readback and exact stable URL. A locally generated page or a successful Git push is not automatically a deployed, accessible report.

## S11 — Four-channel distribution, one target URL

All posts reference the same reviewed ARE case URL. Write **short channel-native content**, not copies of the whole report or fake test footage. A post is counted as published only after the corresponding provider's public permalink is read back.

| Channel | Post format and rule | Avoid |
|---|---|---|
| Hugging Face | Technical research discussion with an evidence question and one canonical case link. Respect prior thread moderation; no duplicate threads | Datasets/Spaces as compulsory assets, repeated promotional posts |
| ModelScope 魔搭 | Chinese technical note explaining test method and finding, plus the same case link. Publish only from authorized login | Requiring a Chinese Space or a second data host |
| X / LinkedIn | X: one concise technical result plus link; LinkedIn: short professional analysis plus link. Avoid copying identical text | Image cards, threads, video production as default |
| Reddit | Native reproducible methodology discussion. Include the case URL only where the specific community permits; weekly showcase when the post is project promotion | Link dumping, unsolicited crossposting, moderator evasion |

The independent report is the source of truth. Outreach email and a concrete GitHub Issue may include their **project-specific maintainer retest prompt**, but public social posts need only the link (optional public safe replay prompt is on the report page). This does not change the English-first generic prompt on https://are.world2.co/ or the official MCP endpoint https://are.world2.co/mcp.

## Publication / follow-up state

Minimum release record: case_id, case_version, canonical_url, evidence_sha or revision, channel, authorized publisher identity, short-copy hash, status, optional public_permalink, moderation, follow-up task.

- CONTENT_READY means draft content exists; not a public post.
- BLOCKED_LOGIN / BLOCKED_MODERATION / PENDING_HUMAN remain explicitly unresolved.
- PUBLISHED requires an actual provider URL and public readback; a filled editor, uploaded file, or pending review cannot count.
- Replies and maintainer input are tracked only with real evidence.
- S13 is a new version of the **same case URL** after independently proving the new live deployment; keep dated original snapshots/corrections.

Use the already established private Google Calendar **ARE — MCP Follow-ups**. Create or update **one project-level REVIEW_PUBLICATION action** for channel dissemination rather than a new weekly/hourly task per channel. Existing central hourly watcher continues to read the calendar and Gmail. Do not create new per-channel Automations.

## Repeatable case publication steps

1. Produce one safe dated evidence manifest from the real reviewed evaluation. Lock original source evidence and version.
2. Render the canonical case page and safe JSONL / JSON evidence downloads; use the script scripts/are_s11_build.py with the verified evidence directory.
3. Validate all 39 IDs, observed tool invocations, Oracle comparisons, SHA, provenance and private-data redaction; open page in a public browser and test table filters / copyable safe replay prompt.
4. Deploy to are.world2.co at a unique stable project slug and update the evaluations library / homepage. Record public URL and deployment revision.
5. Generate four short channel-native posts from the same frozen case (docs/channels/SOLARSTORM_LINK_POSTS.md demonstrates localized copy). Do not add image/video production.
6. Publish only through authorized channels, respect moderation and save exact native permalinks. Incomplete accounts remain blocked, not published.
7. Aggregate feedback into one Calendar project action. On a verified fix, add dated retest evidence and update the SAME public case with an explicit change history.

## Solarstorm transition (2026-11-16)

The 2026-11-16 source-grounded report remains: 4/4 public tools inspected/invoked, scoped MCP 9 PASS / 0 FAIL (+1 UNKNOWN, 1 N/A), one real Claude Agent task, 39 ARE classifications (4 PASS / 2 ARE-specific FAIL / 10 N/A / 23 NOT_VERIFIED), source 1.0.3 not proven to match live 1.0.0, NOAA observations 2 matched and one time-sensitive instantaneous X-ray value differed. No maturity level or official protocol certification was issued.

The previously generated PNG/SVG cards, 15s MP4, HF Dataset/Space *upload bundles*, and standalone ModelScope demo content are **retired from the current S11 deliverable**. These are not evidence gaps: the case report contains the reviewed results and evidence. Existing approved third-party posts are not deleted; unsubmitted drafts should be revised to reference **only** the canonical URL.

Canonical case: https://are.world2.co/evidence/solarstorm/
