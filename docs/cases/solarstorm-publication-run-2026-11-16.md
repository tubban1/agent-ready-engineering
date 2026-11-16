# ARE Solarstorm distribution run — 2026-11-16

**Case:** [Public limited-scope Solarstorm evaluation](solarstorm-2026-11-16.md)  
**Standard:** [ARE S0–S13 evaluation and publication workflow](../standards/ARE-EVALUATION-PUBLICATION-SOP-v1.md)  
**Methodology disclosure:** This case does not issue a maturity level or official protocol certification. The public source commit has not been bound to the live server's version.

## Actual publication ledger

| Stage / channel | Status | Evidence / next action |
|---|---|---|
| S0–S8 technical evaluation and report | COMPLETE_WITH_LIMITATIONS | 4/4 public tools, 9 bounded protocol checks, one Claude MCP task, NOAA comparisons, and 39 evidence statuses; case linked above |
| S9 private maintainer feedback | EMAIL_SENT / DELIVERY_UNKNOWN | Email sent to officially published project address on 2026-11-16; no acknowledgement asserted; original outreach retained privately |
| S10 public case in ARE GitHub | PUBLISHED | [Case on main](solarstorm-2026-11-16.md) and three [public prompts](../prompts/README.md) |
| S10 ARE site evidence dashboard | PUBLISHED | [are.fde.fan/evaluations](https://are.world2.co/evaluations/) → search **Solarstorm MCP** → detail → seven evidence links. The entry is `source_review`, `assessment_level=NULL`, never `verified` |
| S11 methodology discussion in ARE-owned GitHub | PUBLISHED | [ARE Issue #4: evidence needed for Agent MCP evaluation](https://github.com/tubban1/agent-ready-engineering/issues/4); open discussion, **not** a promotional issue against Solarstorm |
| S11 X / Twitter | PENDING_HUMAN_POST | @tubban1 was signed in, a short public case post was filled in its background Chrome composer; the click required human confirmation (`CURSOR_ACTION_REQUIRES_HUMAN`). No post URL exists. User must inspect and press Post; don't count as published |
| S11 Hugging Face forum | BLOCKED_BY_MODERATION | Prior ARE thread received a 2026-11-15 notice that post #5 was hidden pending staff review. Do not send a repeated promotional reply while moderation is pending |
| S11 ModelScope | BLOCKED_LOGIN | Current browser had no authorized ModelScope login; link-only Chinese post not submitted |
| S11 Reddit / Hacker News | PENDING_HUMAN / NO_VERIFIED_URL | One r/AI_Agents weekly Project Display draft filled but submit blocked by human approval; no public comment URL; no mass posting |
| S11 LinkedIn | CONTENT_READY / NO_VERIFIED_URL | Editor draft only; no verified post permalink; media production removed from revised workflow |
| S12 replies and external citations | WAITING_EXTERNAL | Search official mail and public discussion before claiming engagement |
| S13 post-fix independent retest | WAITING_MAINTAINER_UPDATE | Original public test is the immutable baseline |

This ledger is an auditable **example of statuses**, not proof that every social platform is connected or published.

## 2026-11-16 operational status update

The source-of-truth **public** case manifest is [solarstorm.json](data/solarstorm.json), validated against the existing 39-check independent evidence; run status is [Solarstorm S0–S13](solarstorm-run-status-2026-11-16.md). The tested reusable CLI and its safety gates are described in [ARE Publication Runner](../standards/ARE-PUBLICATION-RUNNER-v1.md).

[Public replay prompt](solarstorm-public-replay-2026-11-16.md) and [maintainer retest prompt](solarstorm-maintainer-retest-2026-11-16.md) are now generated from that fixed case manifest. The initial Gmail send is not repeated; no owner reply or production fix is verified as of the review. X repost attempt again hit `CURSOR_ACTION_REQUIRES_HUMAN`. LinkedIn editor was filled but did not yield a publish URL or unambiguous visible post; it remains CONTENT_READY rather than PUBLISHED. These may only change status after a real receipt.

## S11 simplification: single canonical public case (2026-11-16)

The ARE owner decided to consolidate results, evidence, actual Agent/NOAA checks, 39 status explanations, reproducible findings, limitations, source provenance and optional safe replay prompt on **one persistent case subpage**:

**https://are.world2.co/evidence/solarstorm/**

All future HF / ModelScope / X / LinkedIn / Reddit posts should be brief community-native introductions linking to that **same URL**, rather than producing and hosting parallel datasets, demos, SVG cards or short films. [Short localized post copy](../channels/SOLARSTORM_LINK_POSTS.md) and [current S11 workflow](../standards/ARE-S11-CHANNEL-PLAYBOOKS-v1.md) capture the revised rule.

Previously generated images/video and HF upload bundles were retired from the current release; old ARE /media/solarstorm/ and /datasets/solarstorm-20261116/ landing URLs redirect to this case. Sanitized JSONL assessment evidence remains directly downloadable **within** the case URL. No original private research data or outgoing messages were deleted by this distribution change.

External channel statuses remain independently unresolved: HF forum pending moderation, ModelScope not authenticated, X and Reddit final submit require human review, LinkedIn has no verified permalink. These do not count as published. Any previously prepared external editor draft with multiple links should be updated to cite only the canonical URL before submission.

## Standard outcome accounting

`PUBLISHED` requires an exact, accessible URL. `PENDING_HUMAN_POST`, `BLOCKED_BY_MODERATION`, `NOT_ATTEMPTED`, and `CONTENT_NOT_PRODUCED` never contribute to published-channel counts. Email sent is not email delivered, read or approved. Technical recommendations are not security findings.

Correcting a factual mistake must update the public case and this ledger with a dated correction. Do not erase the original baseline; retest only after a real change is independently observable.
