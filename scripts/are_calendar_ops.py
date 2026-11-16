#!/usr/bin/env python3
"""ARE calendar-ops v1: deterministic parsing, gating and read-only execution planning.

Real integration: an authorized hourly ChatGPT Automation reads the private Google
Calendar and Gmail connectors, applies these rules, then appends a verified
receipt to a private daily Google Calendar ledger. This program NEVER calls
provider APIs or sends messages; it accepts sanitized JSON from a trusted
connector/runner for regression and dry-run use.

Usage: python3 scripts/are_calendar_ops.py validate <events.json>
       python3 scripts/are_calendar_ops.py plan <events.json> --now 2026-11-16T20:00:00+01:00
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta
import html
import json
import re
from typing import Any
from zoneinfo import ZoneInfo

SCHEMA = "are.ops.calendar.v1"
TOKEN_START = "ARE_TASK_V1"
TOKEN_END = "END_ARE_TASK"
KEY_RE = re.compile(r"^are:[a-z0-9-]+:(check_reply|check_public_reply|review_outreach|review_publication|retest)$")
GMAIL_ID_RE = re.compile(r"^[a-f0-9]{16}$")
MACHINE_FIELDS = {"key", "project", "action", "state", "mail_thread",
                  "source_message", "cadence", "origin", "safe", "send"}
SAFE_STATES = {"WAITING_REPLY", "BLOCKED_MODERATION", "REPLIED_PENDING_REVIEW",
               "NEEDS_THREAD_RECONCILE", "READY_RETEST", "CLOSED", "PENDING_OUTREACH", "PENDING_PUBLICATION", "PENDING_REVIEW", "WAITING_VERSION"}
CHECK_ACTIONS = {"CHECK_REPLY", "CHECK_PUBLIC_REPLY", "REVIEW_OUTREACH", "REVIEW_PUBLICATION", "RETEST"}


def normalize(text: str) -> str:
    # Google Calendar may transform descriptions to HTML and reflow line breaks.
    return html.unescape(re.sub(r"<[^>]*>", " ", text))


def parse_event(event: dict[str, Any]) -> dict[str, Any] | None:
    """Read machine tokens regardless of provider-induced line wrapping.

    We intentionally use short key/value tokens (not JSON in descriptions).
    For longer project names, derive the canonical ID from the stable key;
    Google's visual formatter may insert a newline at a hyphen in project=.
    """
    if event.get("status") == "cancelled":
        return None
    description = normalize(event.get("description") or "")
    a = description.find(TOKEN_START)
    b = description.find(TOKEN_END)
    if a < 0 and b < 0:
        return None  # log entries, unrelated events, original reminders
    if a < 0 or b <= a:
        raise ValueError("incomplete ARE_TASK_V1 marker block")
    chunk = description[a + len(TOKEN_START):b]
    fields = {}
    for m in re.finditer(r"\b([a-z_]+)=([^\s]+)", chunk):
        if m.group(1) in MACHINE_FIELDS:
            if m.group(1) in fields:
                raise ValueError("duplicate task field " + m.group(1))
            fields[m.group(1)] = m.group(2)
    key = fields.get("key", "")
    if not KEY_RE.fullmatch(key):
        raise ValueError(f"invalid task key: {key!r}")
    project = key.removeprefix("are:").rsplit(":", 1)[0]
    action = fields.get("action")
    if action not in CHECK_ACTIONS or not key.endswith(":" + action.lower()):
        raise ValueError("task key/action mismatch")
    if fields.get("safe") != "read_only" or fields.get("send") != "manual_approval":
        raise ValueError("missing explicit safety/approval boundary")
    if fields.get("state") not in SAFE_STATES:
        raise ValueError("unknown task state")
    thread = fields.get("mail_thread", "")
    if action == "CHECK_REPLY":
        if not GMAIL_ID_RE.fullmatch(thread):
            raise ValueError("CHECK_REPLY must store a real Gmail thread ID")
    elif thread != "NONE":
        raise ValueError("public nonmail task must have mail_thread=NONE")
    if not event.get("id"):
        raise ValueError("calendar event id required")
    return {
        "task_key": key, "project_key": project,
        "action": action, "state": fields["state"],
        "mail_thread": thread, "calendar_event_id": event["id"],
        "start": event.get("start"), "title": event.get("summary"),
        "source_message_id": fields.get("source_message"),
        "cadence": fields.get("cadence"),
    }


def collect_tasks(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    seen: set[str] = set()
    for event in events:
        task = parse_event(event)
        if task is None:
            continue
        if task["task_key"] in seen:
            raise ValueError("duplicate ARE task across calendar events: " + task["task_key"])
        seen.add(task["task_key"])
        tasks.append(task)
    return sorted(tasks, key=lambda t: t["task_key"])


def local_time(value: str) -> datetime:
    d = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if not d.tzinfo:
        raise ValueError("time must include timezone")
    return d.astimezone(ZoneInfo("Europe/Zurich"))


def run_key(value: str) -> str:
    return "run=" + local_time(value).strftime("%Y-%m-%dT%H")


def ledger_has_hour(ledger_description: str, value: str) -> bool:
    normalized = normalize(ledger_description)
    return run_key(value) in normalized


def classify_thread(response: dict[str, Any], own_addresses: set[str]) -> dict[str, Any]:
    """Treat missing/error responses as UNKNOWN, not "no reply".

    Gmail connector exposes the original sender as from_, not from.
    A single original sent message is NOT proof of delivery/read.
    """
    if response.get("error"):
        return {"state": "UNKNOWN_THREAD", "reason": response["error"]}
    if not response.get("thread_id"):
        return {"state": "UNKNOWN_THREAD", "reason": "no resolved thread ID"}
    messages = response.get("messages") or []
    if not messages:
        return {"state": "UNKNOWN_THREAD", "reason": "empty Gmail thread response"}
    if response.get("truncated"):
        return {"state": "NEEDS_MANUAL_REVIEW", "reason": "thread truncated"}
    incoming = []
    ambiguous = []
    for msg in messages:
        sender = str(msg.get("from_") or msg.get("from") or "").lower()
        if not sender:
            ambiguous.append(msg.get("id"))
            continue
        if any(address in sender for address in own_addresses):
            continue
        if any(x in sender for x in ("mailer-daemon", "postmaster", "no-reply", "noreply")):
            continue  # automated messages not counted as human replies
        incoming.append(msg.get("id"))
    if incoming:
        return {"state": "POTENTIAL_REPLY", "message_ids": incoming, "requires_review": True}
    if ambiguous:
        return {"state": "UNKNOWN_SENDER", "message_ids": ambiguous}
    return {"state": "NO_REPLY", "messages_seen": len(messages)}


def plan(events: list[dict[str, Any]], now: str, daily_ledger: str = "") -> dict[str, Any]:
    tasks = collect_tasks(events)
    dt = local_time(now)
    duplicate_hour = ledger_has_hour(daily_ledger, now)
    # Fail closed on duplicated hour; a reminder can still be read-only but
    # must not append a second receipt or produce duplicate external effects.
    mail_tasks = [t for t in tasks if t["action"] == "CHECK_REPLY"
                  and t["state"] not in {"CLOSED"}]
    due = []
    for task in tasks:
        raw = task["start"]
        if not raw:
            raise ValueError("task missing scheduled start")
        start = local_time(raw) if isinstance(raw, str) else local_time(raw["dateTime"])
        if start <= dt and task["state"] not in {"CLOSED"}:
            due.append(task["task_key"])
    # Week boundary requires actual local Monday, not UTC Sunday.
    monday = dt.weekday() == 0
    after_nine = dt.hour >= 9
    date_marker = "daily=" + dt.strftime("%Y-%m-%d")
    weekly_marker = "weekly=" + dt.strftime("%G-W%V")
    daily_unprocessed = not duplicate_hour and date_marker not in normalize(daily_ledger)
    weekly_unprocessed = not duplicate_hour and weekly_marker not in normalize(daily_ledger)
    return {
        "run_key": run_key(now), "skipped_duplicate": duplicate_hour,
        "task_count": len(tasks), "mail_task_count": len(mail_tasks),
        "mail_thread_ids": sorted({t["mail_thread"] for t in mail_tasks}),
        "due_actions": sorted(due) if after_nine and daily_unprocessed else [],
        "weekly_review": monday and after_nine and weekly_unprocessed,
        "daily_due_review": after_nine and daily_unprocessed,
        "daily_marker": date_marker,
        "weekly_marker": weekly_marker,
        "allowed_external_writes": False,
        "journal_required_for_changes": True,
    }


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("operation", choices=("validate", "plan"))
    p.add_argument("events_json")
    p.add_argument("--now", help="timezone-aware ISO time for dry-run plan")
    p.add_argument("--ledger-json", help="JSON daily calendar event")
    args = p.parse_args()
    with open(args.events_json, encoding="utf8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        data = data.get("events", [])
    if not isinstance(data, list):
        raise SystemExit("events must be a list")
    tasks = collect_tasks(data)
    if args.operation == "validate":
        print(json.dumps({"valid_tasks": len(tasks), "unique": True,
                          "mail_tasks": sum(t["action"] == "CHECK_REPLY" for t in tasks)}))
        return
    if not args.now:
        raise SystemExit("--now must be supplied for reproducible planning")
    ledger = ""
    if args.ledger_json:
        with open(args.ledger_json, encoding="utf8") as f:
            ledger = json.load(f).get("description", "")
    print(json.dumps(plan(data, args.now, ledger), indent=2))


if __name__ == "__main__":
    main()
