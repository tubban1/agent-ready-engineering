#!/usr/bin/env python3
"""ARE S0–S13: safe, evidence-first publication runner.

This CLI NEVER sends email, invokes third-party MCP tools, posts to social sites
or changes a third-party account. It validates recorded results, renders
project-specific prompts, and records verified external receipts idempotently.

Python 3.11+, standard library only. Invocation:
 python3 scripts/are_publication.py validate docs/cases/data/solarstorm.json
 python3 scripts/are_publication.py render docs/cases/data/solarstorm.json --out /tmp/are-solarstorm
 python3 scripts/are_publication.py receipt docs/cases/data/solarstorm.json --channel x \
      --url https://x.com/tubban1/status/123 --method browser_readback \
      --receipt-file /tmp/x_receipt.json --ledger /tmp/solarstorm-ledger.jsonl
 python3 scripts/are_publication.py report docs/cases/data/solarstorm.json --ledger /tmp/solarstorm-ledger.jsonl
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
from typing import Any

PHASES = [f"S{i}" for i in range(14)]
PUBLISH_HOSTS = {
    "github_case": {"github.com"},
    "are_website": {"are.world2.co", "are.fde.fan"},
    "github_discussion": {"github.com"},
    "x": {"x.com", "twitter.com"},
    "linkedin": {"linkedin.com", "www.linkedin.com"},
    "huggingface": {"huggingface.co", "discuss.huggingface.co"},
    "modelscope": {"modelscope.cn", "www.modelscope.cn"},
    "reddit": {"reddit.com", "www.reddit.com"},
    "youtube": {"youtube.com", "www.youtube.com", "youtu.be"},
    "bilibili": {"bilibili.com", "www.bilibili.com"},
    "videohao": {"channels.weixin.qq.com"},
}
POST_PATH_RE = {
    "x": r"^/[^/]+/status/[0-9]{8,}$",
    "linkedin": r"^/(posts/|feed/update/urn:li:activity:)[^/]+",
    "github_discussion": r"^/[^/]+/[^/]+/issues/[0-9]+$",
    "reddit": r"^/r/[^/]+/comments/[^/]+",
    "youtube": r"^/(watch|shorts/[^/]+)",
    "bilibili": r"^/video/BV",
}
RECEIPT_METHODS = {"provider_api", "browser_readback", "independent_public_readback"}
STAGE_STATUSES = {
    "COMPLETE", "COMPLETE_WITH_LIMITATIONS", "WAITING_EXTERNAL",
    "BLOCKED", "NOT_ATTEMPTED", "PARTIAL",
}
CHANNEL_STATUSES = {
    "PUBLISHED", "NOT_ATTEMPTED", "CONTENT_READY", "BLOCKED_HUMAN",
    "BLOCKED_MODERATION", "ACCOUNT_UNVERIFIED", "CONTENT_NOT_PRODUCED",
    "WAITING_EXTERNAL",
}
CHECK_STATUSES = {"PASS", "FAIL", "NOT_APPLICABLE", "NOT_VERIFIED"}
REPO_ROOT = Path(__file__).resolve().parents[1]
# Legacy v1 public case preserved for historical replay. This is a fixed
# identity anchor, not a grant to publish new evaluations or changed evidence.
# Production release still requires a trusted immutable case/version ledger.
LEGACY_PUBLICATION_ANCHORS = {
    "solarstorm-2026-11-16": (
        "https://mcp.solarstorm.today/mcp",
        "5388312a-23b9-58f5-89ef-ec184a389907",
        "2026-11-16",
    ),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(obj: Any) -> bytes:
    return (json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf8")


def load(path: Path) -> dict:
    doc = json.loads(path.read_text(encoding="utf8"))
    if not isinstance(doc, dict):
        raise ValueError("Manifest must be a JSON object")
    return doc


def web_url(value: str) -> bool:
    try:
        p = urlparse(value)
        return p.scheme == "https" and bool(p.netloc) and not p.username and not p.password
    except (ValueError, TypeError):
        return False


def allowed_post_url(channel: str, url: str) -> bool:
    if channel not in PUBLISH_HOSTS or not web_url(url):
        return False
    parsed = urlparse(url)
    if (parsed.hostname or "").lower() not in PUBLISH_HOSTS[channel]:
        return False
    pattern = POST_PATH_RE.get(channel)
    if pattern and not re.match(pattern, parsed.path):
        return False
    return True


def check_ids() -> set[str]:
    text = (REPO_ROOT / "data/checks.yaml").read_text(encoding="utf8")
    ids = re.findall(r"^  - id: (L[1-4]-[A-Z][0-9])$", text, re.M)
    if len(ids) != 39 or len(set(ids)) != 39:
        raise ValueError("Canonical ARE rule set no longer contains exactly 39 unique IDs")
    return set(ids)


def assess_validator(data: dict, assessment_file: Path | None = None) -> list[str]:
    errors: list[str] = []
    are = data.get("assessment", {})
    counts = are.get("counts", {})
    labels = {"PASS", "FAIL", "NOT_APPLICABLE", "NOT_VERIFIED"}
    if set(counts) != labels or any(type(counts.get(k)) is not int or counts[k] < 0 for k in labels):
        errors.append("assessment counts must contain four nonnegative integer categories")
    elif sum(counts.values()) != 39:
        errors.append("ARE check counts must sum to 39")
    if are.get("maturity_level") not in (None, "NOT_ESTABLISHED"):
        if counts.get("NOT_VERIFIED", 0):
            errors.append("cannot claim an ARE maturity level while checks remain NOT_VERIFIED")
        if not are.get("strict_level_evidence_url"):
            errors.append("claimed ARE maturity requires explicit strict-level evidence")
    if assessment_file:
        src = load(assessment_file)
        actual = src.get("checks", [])
        ids = [a.get("check_id") for a in actual]
        if len(actual) != 39 or set(ids) != check_ids() or len(set(ids)) != 39:
            errors.append("actual independent assessment must contain 39 distinct canonical check IDs")
        actual_counts = {k: sum(a.get("status") == k for a in actual) for k in labels}
        if actual_counts != counts:
            errors.append(f"assessment counts mismatch actual artifact: {actual_counts}")
    return errors


def validate(doc: dict, assessment_file: Path | None = None) -> list[str]:
    errors: list[str] = []
    if doc.get("schema") != "are.publication.case.v1":
        errors.append("unknown case schema")
    for field in ("case_id", "name", "world2_id", "assessed_at", "owner_contact"):
        if not doc.get(field):
            errors.append(f"missing {field}")
    if not web_url(doc.get("endpoint", "")):
        errors.append("endpoint must be absolute HTTPS")
    if not web_url(doc.get("report_url", "")):
        errors.append("report_url must be absolute HTTPS")
    src = doc.get("source", {})
    if src.get("binding") not in ("BOUND", "UNVERIFIED", "NO_SOURCE"):
        errors.append("source.binding must be BOUND, UNVERIFIED or NO_SOURCE")
    if src.get("binding") == "UNVERIFIED" and doc.get("claim_deployed_source_tests"):
        errors.append("unbound source tests cannot be claimed as deployed production tests")
    scope = doc.get("scope", {})
    if scope.get("type") != "PUBLIC_READ_ONLY":
        errors.append("this pilot runner only supports PUBLIC_READ_ONLY case manifests")
    tools = scope.get("allowed_tools", [])
    if not tools or not all(re.fullmatch(r"[A-Za-z0-9_-]+", x) for x in tools):
        errors.append("safe public tool inventory required")
    stats = doc.get("tool_coverage", {})
    if any(type(stats.get(k)) is not int for k in ("discovered", "contract_checked", "called")):
        errors.append("all tool_coverage counts must be integers")
    elif not (0 <= stats["called"] <= stats["contract_checked"] <= stats["discovered"] and stats["discovered"] == len(tools)):
        errors.append("tool coverage counts inconsistent with allowed public inventory")
    agent = doc.get("agent", {})
    if agent.get("runs", 0) and not (agent.get("actual_mcp_calls", 0) > 0 and agent.get("independent_oracle")):
        errors.append("an Agent task success requires actual MCP calls and independent oracle")
    errors.extend(assess_validator(doc, assessment_file))
    steps = doc.get("stages", {})
    if set(steps) != set(PHASES):
        errors.append("all S0 through S13 stages must be recorded exactly once")
    for key, value in steps.items():
        if value.get("status") not in STAGE_STATUSES:
            errors.append(f"unknown status for {key}: {value.get('status')}")
    if steps.get("S9", {}).get("status", "").startswith("COMPLETE"):
        if not doc.get("outreach", {}).get("sent_at") or not doc.get("outreach", {}).get("provider_evidence_scope"):
            errors.append("S9 email cannot count as complete without actual send evidence")
    if steps.get("S12", {}).get("status", "").startswith("COMPLETE") and not doc.get("engagement", {}).get("actual_reply_evidence"):
        errors.append("S12 complete requires actual maintainer reply evidence")
    if steps.get("S13", {}).get("status", "").startswith("COMPLETE"):
        retest = doc.get("retest", {})
        if not (retest.get("new_deployed_version") and retest.get("independent_oracle_passed") is True and retest.get("evidence_uri")):
            errors.append("S13 retest complete requires real new deployment, independent oracle and evidence")
    publication = doc.get("channels", {})
    # Fail closed for any NEW v1 public case, regardless of user-supplied date.
    # Only a pinned historical case identity may be replayed; this validation
    # is not an authorization mechanism for the real production publish worker.
    any_public = any(
        isinstance(v, dict) and v.get("status") == "PUBLISHED"
        for v in publication.values()
    )
    case_public = str(steps.get("S10", {}).get("status", "")).startswith("COMPLETE")
    legacy_identity = (
        doc.get("endpoint"), doc.get("world2_id"), doc.get("assessed_at")
    )
    if (any_public or case_public) and (
        LEGACY_PUBLICATION_ANCHORS.get(doc.get("case_id")) != legacy_identity
    ):
        errors.append("new public evaluation requires dual-track release gate; legacy 39/39 is not publication approval")
    for channel, value in publication.items():
        if channel not in PUBLISH_HOSTS:
            errors.append(f"unrecognized channel {channel}")
            continue
        status = value.get("status")
        if status not in CHANNEL_STATUSES:
            errors.append(f"unrecognized channel status {channel}/{status}")
        if status == "PUBLISHED":
            url = value.get("url", "")
            if not allowed_post_url(channel, url):
                errors.append(f"published {channel} needs matching live HTTPS URL")
            if not value.get("published_at") or not value.get("verification_method"):
                errors.append(f"published {channel} needs real published_at and verification_method")
        elif value.get("url") and status != "PUBLISHED":
            errors.append(f"{channel} cannot claim a post URL unless published")
    if doc.get("outreach", {}).get("sent_at") and doc["outreach"].get("delivery") == "CONFIRMED_READ":
        if not doc["outreach"].get("recipient_read_evidence"):
            errors.append("cannot claim recipient read without explicit read evidence")
    return errors


def interpolate(doc: dict, kind: str) -> str:
    case = doc["name"]
    url = doc["endpoint"]
    report = doc["report_url"]
    src = doc["source"]
    allowed = doc["scope"]["allowed_tools"]
    oracle = doc["agent"]["independent_oracle"]
    issue = doc["finding"]
    if kind == "public":
        return f"""# {case} — independent public read-only replay prompt

This is a **community recheck**, not an ARE-issued certification. Original scoped report: {report}

```text
Independently reproduce only the PUBLIC READ-ONLY part of the Agent-Ready Engineering report.
Project: {case}
Public MCP URL: {url}
Original observed test date: {doc['assessed_at']}
Public source at {src['repo']} commit {src['sha']}; deployed-source binding: {src['binding']}.
Tools permitted (and only these): {', '.join(allowed)}.
Limits: <= 7 safe public calls, 15 seconds per request; no retry storms.
Never use credentials, payment, email, deletes, mutations, device control, private data or service stress tests.
Have a real Agent answer this concrete user question: {doc['agent']['user_task']}
Independently cross-check dynamic results against {oracle} at the time of the request.
Only when appropriate for a safe negative test, call {issue['tool']} with {issue['input']} ONCE and compare MCP error semantics against normal validation.
Treat the original observation ({issue['observed']}) as an engineering suggestion, not a claimed MCP MUST violation.
Document actual Agent tool choices, server version, returned facts, independent source timestamps and any changing data.
Do not infer the deployed version from source or issue any L0-L4 grade without all required evidence.
Do not send email or open a GitHub issue in the operator's name.
```
"""
    if kind == "maintainer":
        return f"""# {case} — private maintainer retest prompt

For the verified owner of {case} ONLY. **Do not resend the initial ARE report automatically.**

```text
I maintain the MCP {case} at {url}.
Review the independent, limited-scope ARE report: {report}
Public source inspected: {src['repo']} at {src['sha']} (source version {src['source_version']}).
Reported live server version: {src['live_version']}; deployed-source binding: {src['binding']}.

Specific ARE finding: {issue['id']} — {issue['classification']}
Tool / safe input: {issue['tool']} / {issue['input']}
Observed: {issue['observed']}
Potential improvement: {issue['recommendation']}
This is NOT an official MCP protocol MUST violation unless separately demonstrated.

1. Inspect the corresponding handler in the actual deployed source version and clarify this version mapping.
2. Reproduce the exact input safely in your own controlled environment. Capture the raw MCP tool result, including isError and any structured details.
3. Decide if the behavior is intended, a design improvement, or a defect; do not alter production on an outside reviewer's assertion.
4. If you approve a fix, work on a branch and run targeted validation and existing regression tests. Re-run a real Agent task if agent behavior may change.
5. Report baseline vs new commit/deployment, observed error envelopes, unit tests, independent success condition and any remaining limitations.
6. Ask ARE for independent post-fix recheck using {report}. Do not falsely claim external certification or disclose credentials.
```
"""
    if kind == "x":
        return (f"MCP discovery ≠ Agent reliability.\n\n"
                f"We tested {case}: {doc['tool_coverage']['called']}/{doc['tool_coverage']['discovered']} public tools, "
                f"{doc['protocol']['pass']} bounded protocol checks and one real Agent task compared with {oracle}. "
                f"No certification claimed.\n\nEvidence + public replay: {report}\n")
    if kind == "linkedin":
        return f"""Can an MCP pass tools/list and still leave Agent engineering questions unanswered?

We reviewed {case} from the World2 catalog, using an explicit read-only scope:
• {doc['tool_coverage']['called']}/{doc['tool_coverage']['discovered']} public tools actually invoked
• {doc['protocol']['pass']} bounded protocol checks passed (not official MCP certification)
• One real model-based task with independent {oracle} comparison

The project's publicly available source is NOT proven to match its running deployment; we did not infer a false maturity score. {doc['assessment']['counts']['NOT_VERIFIED']} of ARE's 39 checks remain NOT_VERIFIED.

Public report: {report}
Project-specific safe replay prompt: https://github.com/tubban1/agent-ready-engineering/blob/main/docs/prompts/channels/PUBLIC_PROJECT_REVIEW.md

What evidence would you need before placing an MCP into a production Agent workflow?
#MCP #AIAgents #AgentReadyEngineering"""
    raise ValueError(f"unsupported render kind {kind}")


def render(doc: dict, dest: Path) -> None:
    errors = validate(doc)
    if errors:
        raise ValueError("\n".join(errors))
    dest.mkdir(parents=True, exist_ok=True)
    outputs = {
        "MAINTAINER_RETEST.md": interpolate(doc, "maintainer"),
        "PUBLIC_READONLY_REPLAY.md": interpolate(doc, "public"),
        "X_POST.txt": interpolate(doc, "x"),
        "LINKEDIN_POST.md": interpolate(doc, "linkedin"),
        "STATUS.md": status_report(doc, []),
    }
    for name, content in outputs.items():
        (dest / name).write_text(content, encoding="utf8")
    hashed = {name: sha256(value.encode("utf8")) for name, value in outputs.items()}
    (dest / "render_manifest.json").write_bytes(canonical_json({
        "case_id": doc["case_id"], "source_manifest_hash": sha256(canonical_json(doc)),
        "outputs_sha256": hashed, "side_effects": "NONE",
    }))


def status_report(doc: dict, receipts: list[dict]) -> str:
    lines = [
        f"# ARE S0–S13 case status — {doc['name']}",
        "",
        f"- World2 catalog: `{doc['world2_id']}`",
        f"- Public report: {doc['report_url']}",
        f"- Agent result: {doc['agent']['runs']} real run(s), {doc['agent']['actual_mcp_calls']} actual MCP calls, independent oracle: {doc['agent']['independent_oracle']}",
        f"- ARE 39: {doc['assessment']['counts']}; maturity {doc['assessment']['maturity_level']}",
        "",
        "| Stage | Verified state | Evidence / reason |",
        "|---|---|---|",
    ]
    for stage in PHASES:
        state = doc["stages"][stage]
        lines.append(f"| {stage} | {state['status']} | {state.get('reason', '')} |")
    lines.extend(["", "## Channel receipts", "", "| Channel | Status | Link or blocker |", "|---|---|---|"])
    current = dict(doc["channels"])
    for e in receipts:
        current[e["channel"]] = dict(status="PUBLISHED", url=e["url"], verified_at=e["recorded_at"])
    for name, item in sorted(current.items()):
        lines.append(f"| {name} | {item['status']} | {item.get('url') or item.get('reason') or ''} |")
    lines.extend(["", "Only a confirmed URL from a verified posting action is PUBLISHED. An email send receipt is not a maintainer reply. S13 needs a changed deployment and a real independent recheck."])
    return "\n".join(lines) + "\n"


def receipt_line(path: Path) -> list[dict]:
    if not path.exists():
        return []
    events = []
    for line in path.read_text(encoding="utf8").splitlines():
        if line.strip():
            events.append(json.loads(line))
    return events


def add_receipt(doc: dict, ledger: Path, channel: str, url: str, method: str,
                receipt_path: Path) -> str:
    if channel not in PUBLISH_HOSTS:
        raise ValueError(f"unknown platform channel: {channel}")
    if method not in RECEIPT_METHODS:
        raise ValueError("receipt method must be provider_api, browser_readback or independent_public_readback")
    if not allowed_post_url(channel, url):
        raise ValueError("posted URL does not match platform, or is not HTTPS")
    if not receipt_path.is_file() or not receipt_path.stat().st_size:
        raise ValueError("genuine posting receipt file must already exist")
    receipt = load(receipt_path)
    if not receipt.get("posted") or receipt.get("url") != url:
        raise ValueError("receipt must explicitly attest posted=true and matching URL")
    if receipt.get("observed_via") != method:
        raise ValueError("receipt observed_via must match selected verification method")
    # A single case/channel/post URL is an idempotency key. Never rewrite an existing receipt.
    ledger.parent.mkdir(parents=True, exist_ok=True)
    event = {
        "schema": "are.publication.receipt.v1",
        "case_id": doc["case_id"], "channel": channel, "url": url,
        "method": method, "receipt_sha256": sha256(receipt_path.read_bytes()),
        "recorded_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    import fcntl
    with ledger.open("a+", encoding="utf8") as file:
        fcntl.flock(file.fileno(), fcntl.LOCK_EX)
        file.seek(0)
        previous = [json.loads(s) for s in file if s.strip()]
        existing = [v for v in previous if v.get("case_id") == doc["case_id"] and v.get("channel") == channel]
        if existing:
            if any(e["url"] == url and e["receipt_sha256"] == event["receipt_sha256"] for e in existing):
                return "ALREADY_RECORDED"
            raise ValueError("channel already has a different receipt; handle revisions explicitly")
        file.write(json.dumps(event, sort_keys=True) + "\n")
        file.flush()
        os.fsync(file.fileno())
        return "RECORDED"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "render", "report", "receipt"):
        x = sub.add_parser(name)
        x.add_argument("manifest", type=Path)
        if name == "validate":
            x.add_argument("--assessment", type=Path, help="independent 39-check assessment.json if available")
        if name == "render":
            x.add_argument("--out", type=Path, required=True)
        if name == "report":
            x.add_argument("--ledger", type=Path)
        if name == "receipt":
            for k in ("channel", "url", "method", "receipt-file", "ledger"):
                x.add_argument("--" + k, required=True, type=Path if k in ("receipt-file", "ledger") else str)
    args = parser.parse_args()
    doc = load(args.manifest)
    errors = validate(doc, args.assessment if args.command == "validate" else None)
    if errors:
        for issue in errors:
            print("INVALID:", issue, file=sys.stderr)
        return 2
    if args.command == "validate":
        print(f"PASS: {doc['case_id']}, 14 stage statuses, safe publication gates, 39 ARE check totals")
    elif args.command == "render":
        render(doc, args.out)
        print(f"RENDERED: {args.out} (no external side effects)")
    elif args.command == "report":
        print(status_report(doc, receipt_line(args.ledger) if args.ledger else []))
    elif args.command == "receipt":
        print(add_receipt(doc, args.ledger, args.channel, args.url, args.method, args.receipt_file))
    return 0


if __name__ == "__main__":
    sys.exit(main())
