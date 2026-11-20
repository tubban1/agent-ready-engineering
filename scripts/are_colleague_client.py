#!/usr/bin/env python3
"""ARE private colleague intake: assemble, submit, and inspect owner outreach queue.
No third-party publication, certification, code modification, or email sending.
Tokens are read ONLY from environment variables, never argv or committed files.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_API = "https://br-raspy-hat-b96bluqn-areintake.compute.c-7.eu-central-1.aws.neon.tech"


def api_request(path: str, *, token_env: str, api: str, payload: object = None,
                reviewer: str = "") -> dict:
    secret = os.environ.get(token_env, "")
    if not secret or len(secret) < 40:
        raise ValueError(f"Set {token_env} in your terminal; never paste tokens into chat or Git.")
    if not api.startswith("https://"):
        raise ValueError("ARE private intake URL must use HTTPS.")
    headers = {"Authorization": "Bearer " + secret,
               "Accept": "application/json",
               "Content-Type": "application/json"}
    if reviewer:
        headers["X-ARE-Reviewer"] = reviewer
    request = urllib.request.Request(
        api.rstrip("/") + path,
        method="POST" if payload is not None else "GET",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            answer = json.loads(response.read(300000))
            return answer
    except urllib.error.HTTPError as exc:
        message = exc.read(2000).decode(errors="replace")
        raise RuntimeError(f"ARE private intake rejected HTTP {exc.code}: {message}") from None


def create_package(args: argparse.Namespace) -> dict:
    report = json.loads(Path(args.result).read_text())
    if report.get("mode") != "ARE_INDEPENDENT" or report.get("track") != "product":
        raise ValueError("Use ARE_INDEPENDENT product evaluator results.")
    task_runs = json.loads(Path(args.tasks).read_text()) if args.tasks else []
    if not isinstance(task_runs, list):
        raise ValueError("--tasks must contain a JSON array.")
    data = {
        "cohort_id": args.cohort,
        "repository_key": args.repository,
        "report": report,
        "agent_tasks": task_runs,
        "recommendations": list(args.recommendation or []),
        "summary": args.summary,
        "contact_route": {"url": "https://github.com/" + args.repository},
        "source_binding": {
            "verified": bool(args.source_binding),
            **({"evidence_ref": args.source_binding} if args.source_binding else {}),
        },
    }
    if data["repository_key"] != report.get("target", {}).get("id"):
        raise ValueError("Repository key must match the evidence-bound target ID.")
    if args.output.exists():
        raise ValueError("Refusing to overwrite an existing evidence package.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    return {"saved": str(args.output), "repository": args.repository,
            "criterion_rows": len(report.get("findings", [])), "agent_tasks": len(task_runs),
            "source_binding": bool(args.source_binding),
            "private": True, "published": False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default=os.getenv("ARE_PRIVATE_INTAKE_URL", DEFAULT_API))
    commands = parser.add_subparsers(dest="operation", required=True)

    package = commands.add_parser("pack", help="Generate a private evidence package without uploading")
    package.add_argument("--result", required=True)
    package.add_argument("--repository", required=True)
    package.add_argument("--cohort", default="ARE100-VALUE-20261115")
    package.add_argument("--tasks", help="JSON file of real Agent task outcomes and oracles")
    package.add_argument("--source-binding", help="Repo-to-service evidence reference, omit unless inspected")
    package.add_argument("--summary", required=True)
    package.add_argument("--recommendation", action="append", default=[])
    package.add_argument("--output", required=True, type=Path)

    submit = commands.add_parser("submit", help="Securely save an independent result to private Neon")
    submit.add_argument("--package", required=True, type=Path)
    submit.add_argument("--reviewer", required=True)
    submit.add_argument("--token-env", default="ARE_INTAKE_TOKEN")

    inbox = commands.add_parser("inbox", help="List private owner outreach queue")
    inbox.add_argument("--token-env", default="ARE_INTAKE_OWNER_TOKEN")
    inbox.add_argument("--json", action="store_true", help="Print full private metadata")

    detail = commands.add_parser("detail", help="Read one private assessment")
    detail.add_argument("--id", required=True)
    detail.add_argument("--token-env", default="ARE_INTAKE_OWNER_TOKEN")

    contact = commands.add_parser("contact", help="Record owner contact action (never sends mail)")
    contact.add_argument("--id", required=True)
    contact.add_argument("--action", required=True, choices=["CONTACTED","REPLY_RECEIVED","NEEDS_RETEST","ARCHIVED"])
    contact.add_argument("--note", required=True)
    contact.add_argument("--token-env", default="ARE_INTAKE_OWNER_TOKEN")

    args = parser.parse_args()
    if args.operation == "pack":
        output = create_package(args)
    elif args.operation == "submit":
        data = json.loads(args.package.read_text())
        output = api_request("/v1/submit", token_env=args.token_env, api=args.api,
                             payload=data, reviewer=args.reviewer)
    elif args.operation == "inbox":
        output = api_request("/v1/inbox", token_env=args.token_env, api=args.api)
        if not args.json:
            for row in output.get("runs", []):
                print(f"{row['repository_key']} | {row['state']} | "
                      f"{row['decisive_count']}/32 decisive | "
                      f"{row['verified_task_count']} verified Agent tasks | "
                      f"{row.get('contact_status') or 'not_contacted'}")
                print("  source:", row["source_revision"])
                print("  summary:", (row.get("summary") or "Not provided")[:260])
                print("  github: https://github.com/" + row["repository_key"])
                for issue in row.get("recommendations", []):
                    print("  improvement:", issue)
            print(f"Total private subjects: {len(output.get('runs', []))}")
            return
    elif args.operation == "detail":
        output = api_request("/v1/run?id=" + args.id, token_env=args.token_env, api=args.api)
    else:
        output = api_request("/v1/contact", token_env=args.token_env, api=args.api,
                             payload={"id": args.id, "event_type": args.action, "details": args.note})
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, RuntimeError, json.JSONDecodeError) as exc:
        print("ARE intake error:", exc, file=sys.stderr)
        sys.exit(2)
