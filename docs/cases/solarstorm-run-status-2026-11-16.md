# ARE S0–S13 case status — Solarstorm MCP

- World2 catalog: `5388312a-23b9-58f5-89ef-ec184a389907`
- Public report: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md
- Agent result: 1 real run(s), 4 actual MCP calls, independent oracle: NOAA Space Weather Prediction Center (SWPC)
- ARE 39: {'PASS': 4, 'FAIL': 2, 'NOT_APPLICABLE': 10, 'NOT_VERIFIED': 23}; maturity NOT_ESTABLISHED

| Stage | Verified state | Evidence / reason |
|---|---|---|
| S0 | COMPLETE | Selected from existing World2 MCP catalog |
| S1 | COMPLETE_WITH_LIMITATIONS | Open-source service and contact verified; deployment/source binding unknown |
| S2 | COMPLETE | 2026-07-28 bounded protocol profile, 9 PASS / 0 FAIL |
| S3 | COMPLETE | All 4 public tool schemas reviewed |
| S4 | COMPLETE_WITH_LIMITATIONS | Source pinned and tests run; public source not bound to production |
| S5 | COMPLETE | All 4 public read-only tools called; negative input tested |
| S6 | COMPLETE_WITH_LIMITATIONS | One real Claude Agent run with independent NOAA validation, no statistical multi-run claim |
| S7 | COMPLETE_WITH_LIMITATIONS | 39 IDs classified; maturity not established |
| S8 | COMPLETE | Evidence-scoped developer report and QA completed |
| S9 | COMPLETE | One verified-address email accepted by Gmail; recipient delivery/read unknown |
| S10 | COMPLETE | GitHub case and ARE World2 evaluations portal public |
| S11 | PARTIAL | ARE GitHub case, ARE website and own-methodology Issue published; X human-required, HF moderation, other social pending |
| S12 | WAITING_EXTERNAL | No maintainer reply or independent public engagement yet verified |
| S13 | WAITING_EXTERNAL | No confirmed maintainer patch/new deployment and independent post-fix retest |

## Channel receipts

| Channel | Status | Link or blocker |
|---|---|---|
| are_website | PUBLISHED | https://are.world2.co/evaluations/ |
| bilibili | CONTENT_NOT_PRODUCED | No evidence-based video completed yet |
| github_case | PUBLISHED | https://github.com/tubban1/agent-ready-engineering/blob/main/docs/cases/solarstorm-2026-11-16.md |
| github_discussion | PUBLISHED | https://github.com/tubban1/agent-ready-engineering/issues/4 |
| huggingface | BLOCKED_MODERATION | Existing ARE forum discussion post under moderator review; do not duplicate promotional outreach |
| linkedin | CONTENT_READY | Authenticated personal account and post composer, but no persistent post URL/confirmation |
| modelscope | ACCOUNT_UNVERIFIED | ARE brand publishing identity not verified |
| reddit | NOT_ATTEMPTED | No suitable subreddit/host rules and author identity vetted |
| x | BLOCKED_HUMAN | @tubban1 composer filled but posting click returned CURSOR_ACTION_REQUIRES_HUMAN |
| youtube | CONTENT_NOT_PRODUCED | No evidence-based video completed yet |

Only a confirmed URL from a verified posting action is PUBLISHED. An email send receipt is not a maintainer reply. S13 needs a changed deployment and a real independent recheck.
