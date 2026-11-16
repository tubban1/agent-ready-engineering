# ARE Operations Scheduler — Calendar Queue × Gmail × Evidence v1

**Status:** Operational pilot connected on 2026-11-16. Python parsing/planning checks implemented and tested; first live calendar/Gmail/manual run completed. The hourly ChatGPT Automation is enabled; autonomous next-run receipt must be verified separately.
**Timezone:** Europe/Zurich (DST-aware).
**Platform:** World2-managed ARE `https://are.world2.co/mcp`, individual MCP deployments remain independent.
**Canonical process:** [ARE S0–S13](ARE-EVALUATION-PUBLICATION-SOP-v1.md) and [ARE Publication Runner](ARE-PUBLICATION-RUNNER-v1.md).

## Why this exists

The old design created one recurring Automation per monitored MCP (e.g. Solarstorm), which scales linearly with projects and leads to duplicate checks and outreach. The new design has **one hourly Operations Scheduler** that discovers **tasks in an allowlisted private Google Calendar**. A project may have multiple separately scheduled actions; the scheduler never assumes the number or identity of projects.

**Separation of responsibilities**

- **Google Calendar** = project/action task queue, due date, review state, source mail thread, human-readable next step.
- **Gmail / GitHub / MCP / World2** = actual external evidence and interaction; only read where permitted.
- **Execution journal** = machine-checkable hourly receipts and idempotency hints. The private Calendar daily `[ARE_OPS_LOG]` event is the currently functioning fallback while Neon connector auth returns HTTP 401. **This is not an atomic database transaction or cross-worker exactly-once guarantee.**
- **ChatGPT Automation** = one central recurring trigger that orchestrates connected tools. Do not create one recurring Automation per project.
- **ARE publication runner** = per-project S0–S13 evidence/QA gates, independent of calendar scheduling.

## Existing pilot: 12 independently scheduled actions

On 2026-11-16 a private dedicated `ARE — MCP Follow-ups` calendar was created and 12 task events were entered for Solarstorm, WorkBuddy, World2 OAuth, ModelScope, Qwen, BFH, HES-SO, SCAI, appliedAI, Liip, Agent Cost Hub, and Hugging Face discussion moderation.

Six older composite reminders in the primary calendar were **preserved** and labelled `[已迁入ARE任务池]`, with duplicate pop-up reminders suppressed; the new queue has one atomic action per partner/project. The one-off ARE100 evaluation-production task is **separate** from periodic maintainer follow-up and remains independently scheduled.

Live bootstrap:
- 12/12 calendar task metadata parsed with unique keys.
- 11/11 Gmail source threads successfully read with exactly one original message each: 0 new replies observed at bootstrapping.
- Four earlier recorded Gmail IDs were **message IDs, not thread IDs**. The canonical thread IDs were independently resolved by fetching each original message and corrected in the Calendar task. This bug is explicitly covered by the scheduler gate.
- One private all-day `[ARE_OPS_LOG] 2026-11-16` event was written and read back, with `run=2026-11-16T20`. A second same-hour rehearsal detected the recorded hour and skipped duplicate writes.
- A single new hourly `ARE 统一跟进调度` Automation was created, next scheduled for 2026-11-16 21:00 Europe/Zurich. The old Solarstorm-only recurring Automation was disabled after confirming the new queue and journal.

## Task-record format (private Google Calendar event)

Never store an entire JSON object on a long line inside Calendar descriptions: the Calendar connector may reflow content, silently inserting newlines *inside quoted strings*. Use **short machine tokens between two markers**; each token value must be short enough not to wrap.

```text
ARE_TASK_V1
key=are:example-mcp:check_reply
project=example-mcp
action=CHECK_REPLY
state=WAITING_REPLY
mail_thread=0000000000000000
cadence=hourly_email
safe=read_only
send=manual_approval
END_ARE_TASK

Reference: <public-report-or-owner-link>
Next: review reply, verify actual deployed version, retest only with a safe oracle
```

The example Gmail thread ID is synthetic and MUST be replaced by an **actual resolved thread_id** before scheduling. For a non-email public discussion task use `action=CHECK_PUBLIC_REPLY`, `mail_thread=NONE`, and a `weekly_public` cadence. The Calendar `event.id` is the actionable record identity, while `key` is the stable cross-calendar deduplication key. Scheduler ignores the human text outside the marker block except for display.

Google may collapse some line breaks to spaces; **parse marker-bounded whitespace-delimited key/value tokens**, not JSON or lines. Derive the project slug from `key` to avoid long `project=` values wrapping at hyphens. Missing markers, duplicate keys, unsafe scope or missing Gmail thread IDs must **block** writes.

## Logical timing on ONE hourly trigger

| Logical action | Cadence / decision | Safety |
|---|---|---|
| `MAIL_REPLY_CHECK` | Every hourly tick; search active `CHECK_REPLY` tasks across the whole allowlisted queue, batch read resolved Gmail threads | Read only; compare message IDs, `from_`, timestamp. A message sent is not a reply |
| `DUE_ACTIONS` | Once per local day, first tick after 09:00; task's scheduled time is due/overdue | Calendar-only state updates unless separate owner approval for actual outreach |
| `WEEKLY_REVIEW` | Monday, first tick after 09:00 Europe/Zurich | Check all tasks, stale replies, platform moderation, actual publication links, missing evidence |
| `VERSION_RETEST` | Event-driven after confirmed new LIVE version and appropriate authorization | Bounded read-only MCP call + independent oracle; no false S13 closure |
| `PUBLICATION_REVIEW` | Included in the weekly sweep, not a separate recurring ChatGPT Automation | No social post without confirmed identity, appropriate content and actual public permalink |

An individual follow-up event need not recur: overdue tasks are found by a wide calendar search including the past. The scheduler must page results, and should use >30 days lookback / >180 days lookahead to avoid losing overdue and future tasks. To extend to more calendars, add their **explicit** calendar IDs to an allowlist and apply their own visibility/privacy/routing policy.

## Execution ledger and "at most once" protections

Before each tick, read or create the private all-day event `[ARE_OPS_LOG] YYYY-MM-DD`. Verify it is unique and contains/doesn't contain the hour key `run=YYYY-MM-DDTHH` in Zurich local time. If present, skip repeated non-idempotent actions. Append a compact receipt only after read-only work genuinely occurred (counts, errors, triggering message IDs or hashes, not raw correspondence).

Use additional markers `daily=YYYY-MM-DD` and `weekly=YYYY-Www` once per respective cadence. The core [parser/planner implementation](../../scripts/are_calendar_ops.py) calculates the DST-aware keys, detects duplicate hour/day/week, and fails when the authorization boundary cannot be established. This is a **best-effort calendar receipt**, not atomic: if overlapping workers become possible, migrate to a transactional datastore with `UNIQUE(calendar_id, event_id, action_type, evidence_id)`, explicit leases, and commit-after-observation receipts.

Neon authorization: the existing connected Neon application returned HTTP 401 in the bootstrap. **No Neon write succeeded**; until repaired, the private Calendar daily journal is the durable remote execution record. Do not write secrets to either place.

## Gmail semantics: an important real-world pitfall

Gmail `search_emails` returns both `id` (message) and `thread_id` (conversation); they are often, but **not always**, equal. Store **thread_id**, and verify it using `batch_read_email_threads(thread_ids=...)`. When recovering legacy records that contain a message ID, use `batch_read_email_threads(message_ids=...)` to resolve the actual parent thread, then update only the exact Calendar event. One failure to read a thread is **UNKNOWN_THREAD**, not NO_REPLY.

Gmail connector responses use `from_` for the original sender in actual message objects; inspect both `from_` and `from` when normalizing. Count only genuine new incoming messages after the known baseline, exclude self-sent mail and automatic bounces, and preserve any ambiguous mail for human review. Do not report that a recipient read the initial email based on a `SENT` label.

## How to test from the ARE repository

```bash
# All synthetic; no private calendar IDs, emails or provider tokens in fixtures.
python3 -m unittest -v scripts/test_are_calendar_ops.py

# Verify a sanitized connector events response (array or {events: [...]}).
python3 scripts/are_calendar_ops.py validate /tmp/are-sanitized-calendar-events.json
python3 scripts/are_calendar_ops.py plan /tmp/are-sanitized-calendar-events.json \
  --now 2026-11-16T20:00:00+01:00 \
  --ledger-json /tmp/are-private-ops-log.json
```

The Python helper does **not** secretly connect to Calendar, Gmail or Neon; the user-authorized connected Automation supplies these tool results. Do not call direct HTTP or unapproved credential APIs to bypass permissions.

## Incident and failure behaviour

- Calendar unreadable → stop execution and report connector failure, do not send messages.
- Incomplete marker or duplicate key → fail closed with task ID, no action.
- Gmail thread read error → `UNKNOWN_THREAD`; try one verified reconciliation via Gmail search. Do not mark NO_REPLY or manufacture a fix.
- New reply → set `REPLIED_PENDING_REVIEW` only when evidence exists; record the new message ID and notify once. No automatic follow-up send.
- Confirmed new deploy → selectively run allowed, low-impact original test with independent Oracle before writing S13.
- Human review needed / social Post button blocked → `BLOCKED_HUMAN`, no false publish receipt.
- Ledger unavailable → read-only work may continue, but no notification/action requiring exactly-once semantics.
- Automation run-now inline success ≠ the scheduled cloud run has independently succeeded. **Verify the first scheduled 21:00 receipt** before claiming unattended runs fully proven.

## Next upgrade

Restore authorized Neon connector access, migrate private daily log entries with stable idempotency keys, preserve Calendar as the primary human task queue and Gmail as source evidence. Do not move user-managed calendars or create duplicate project automations merely to get another database.
