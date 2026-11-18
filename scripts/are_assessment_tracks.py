#!/usr/bin/env python3
"""Draft ARE product/adopter questionnaire separation; no grading or publishing.

This module is migration-only. The legacy 39-item A02 rubric and historical
assessments remain unchanged until a separately approved standard is activated.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "data/are-assessment-track-map.v1.json"
STATUSES = frozenset({"PASS", "FAIL", "NOT_APPLICABLE", "UNKNOWN", "NOT_TESTED", "BLOCKED_AUTH"})
COUNT_TARGET = {"A": 16, "B": 7, "S": 16}


def legacy_ids() -> set[str]:
    text = (ROOT / "data/checks.yaml").read_text(encoding="utf-8")
    ids = re.findall(r"^  - id: (L[1-4]-[A-Z][0-9])$", text, re.M)
    if len(ids) != 39 or len(set(ids)) != 39:
        raise ValueError("Legacy 39-item canonical catalog changed; review migration")
    return set(ids)


def load_map(path: Path = MAP_PATH) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("track map must be an object")
    return value


def validate_map(mapping: dict) -> list[str]:
    errors = []
    if mapping.get("schema") != "are.assessment.track_map.v1":
        errors.append("invalid mapping schema")
    if mapping.get("status") != "DRAFT_NOT_SCOREABLE":
        errors.append("draft mapping must not issue a grade")
    if mapping.get("rule_counts") != COUNT_TARGET:
        errors.append("mapping counts must be 16/7/16")
    rules = mapping.get("rules", [])
    if not isinstance(rules, list):
        return errors + ["rules must be a list"]
    ids = [r.get("legacy_id") for r in rules if isinstance(r, dict)]
    if len(ids) != 39 or set(ids) != legacy_ids() or len(set(ids)) != 39:
        errors.append("mapping must cover exactly the 39 original IDs, once each")
    counts: Counter[str] = Counter()
    new_ids = []
    for i, row in enumerate(rules):
        if not isinstance(row, dict):
            errors.append(f"row {i} must be an object")
            continue
        key = row.get("legacy_id")
        alloc = row.get("allocation")
        counts[alloc] += 1
        if alloc not in COUNT_TARGET:
            errors.append(f"{key}: invalid allocation {alloc}")
            continue
        for side, prefix, expected in (
            ("product", "MCP-", alloc in ("A", "S")),
            ("adopter", "ADOPT-", alloc in ("B", "S")),
        ):
            claim = row.get(side)
            if expected:
                if not isinstance(claim, dict) or claim.get("id") != prefix + str(key) or not str(claim.get("claim", "")).strip():
                    errors.append(f"{key}: invalid {side} atom")
                else:
                    new_ids.append(claim["id"])
            elif claim is not None:
                errors.append(f"{key}: {side} must be null")
        if not str(row.get("applicability", "")).strip():
            errors.append(f"{key}: missing applicability rationale")
    if dict(counts) != COUNT_TARGET:
        errors.append(f"allocation totals wrong: {dict(counts)}")
    if len(set(new_ids)) != len(new_ids):
        errors.append("duplicate new atomic check ID")
    policy = mapping.get("score_policy", {})
    if policy.get("grade_activation") != "REQUIRES_EXPLICIT_NEW_STANDARD_AND_CALIBRATION":
        errors.append("draft cannot enable new grade")
    if policy.get("legacy_39_completion_is_not_publication_authorization") is not True:
        errors.append("legacy 39-completion must not permit new publication")
    return errors


def atomic_checks(mapping: dict, side: str) -> list[dict]:
    if side not in ("product", "adopter"):
        raise ValueError("unknown side")
    return [
        {"legacy_id": r["legacy_id"], **r[side], "applicability": r["applicability"]}
        for r in mapping["rules"] if r[side] is not None
    ]


def validate_observation(check: dict) -> list[str]:
    """Result shape for draft pilot runs; no level is computed."""
    issues = []
    if check.get("state") not in STATUSES:
        issues.append("unknown state")
    if check.get("state") in {"PASS", "FAIL"}:
        if not check.get("evidence") or not check.get("test_scope") or not check.get("observed_version"):
            issues.append("PASS/FAIL need reproducible evidence, scope and pinned version")
    if check.get("state") in {"NOT_APPLICABLE", "UNKNOWN", "NOT_TESTED", "BLOCKED_AUTH"}:
        if not str(check.get("reason", "")).strip():
            issues.append("non-result states need explicit reason")
    if check.get("state") == "FAIL" and check.get("mandatory") is not True:
        issues.append("FAIL requires a predeclared mandatory applicable requirement")
    if check.get("state") == "FAIL" and not check.get("attributable_to_tested_side"):
        issues.append("FAIL requires attribution to the tested side")
    return issues


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--map", type=Path, default=MAP_PATH)
    ap.add_argument("--export", type=Path, help="write split-check inventory (does not score)")
    args = ap.parse_args()
    mapping = load_map(args.map)
    issues = validate_map(mapping)
    if issues:
        print(json.dumps({"ok": False, "issues": issues}, ensure_ascii=False, indent=2))
        return 2
    product = atomic_checks(mapping, "product")
    adopter = atomic_checks(mapping, "adopter")
    summary = {
        "status": mapping["status"], "original_checks": 39,
        "allocations": dict(COUNT_TARGET), "product_atoms": len(product),
        "adopter_atoms": len(adopter), "new_grading_authorized": False,
        "automatic_publication_authorized": False,
    }
    if args.export:
        args.export.write_text(json.dumps(
            {"schema": "are.assessment.two_track_inventory.v1", **summary,
             "product": product, "adopter": adopter},
            ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
