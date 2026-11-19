#!/usr/bin/env python3
"""Run separate developer self-assessments and ARE independent reviews.

This is a PRIVATE evidence workflow and pilot calculator, not a certification,
publication service, claim attestation, or dynamic MCP tool runner.
The evaluator identity axis is independent of the product/adopter axis.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

try:
    from .are_criteria_pilot import evaluate, load_criteria, validate_criteria
except ImportError:
    from are_criteria_pilot import evaluate, load_criteria, validate_criteria

INPUT_SCHEMA = "are.assessment.input.v1"
RESULT_SCHEMA = "are.assessment.result.v1"
COMPARISON_SCHEMA = "are.assessment.comparison.v1"
MODES = {"PROJECT_SELF", "ARE_INDEPENDENT"}
TRACKS = {"product", "adopter"}
DECISIVE = {"PASS", "FAIL"}
SUBJECT_ONLY_ORIGINS = {"SUBJECT_SELF_REPORT", "PROJECT_SELF", "VENDOR_ASSERTION"}


def _required_string(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(field + " must be a non-empty string")
    return value.strip()


def _rules(track: str) -> list[dict]:
    criteria = load_criteria()
    issues = validate_criteria(criteria)
    if issues:
        raise ValueError("pilot criteria invalid: " + "; ".join(issues))
    return [r for r in criteria["criteria"] if r["side"] == track]


def validate_input(run: dict) -> None:
    if not isinstance(run, dict) or run.get("schema") != INPUT_SCHEMA:
        raise ValueError("unsupported input schema")
    if run.get("mode") not in MODES or run.get("track") not in TRACKS:
        raise ValueError("mode and track must be explicit and valid")
    target = run.get("target")
    assessor = run.get("assessor")
    scope = run.get("scope")
    if not isinstance(target, dict) or not isinstance(assessor, dict) or not isinstance(scope, dict):
        raise ValueError("target, assessor and scope objects are required")
    for field in ("id", "observed_version", "owner_organization"):
        _required_string(target.get(field), "target." + field)
    _required_string(assessor.get("id"), "assessor.id")
    _required_string(assessor.get("organization"), "assessor.organization")
    if run["track"] == "adopter":
        _required_string(scope.get("scenario_id"), "scope.scenario_id")
    is_same_org = assessor["organization"].strip().casefold() == target["owner_organization"].strip().casefold()
    if run["mode"] == "ARE_INDEPENDENT" and is_same_org:
        raise ValueError("independent assessor cannot be the assessed organization")
    if run["mode"] == "PROJECT_SELF" and not is_same_org:
        raise ValueError("project self-assessment requires the assessed organization")
    if not isinstance(run.get("facts"), dict) or not isinstance(run.get("observations"), dict):
        raise ValueError("facts and observations must be objects")
    if run.get("publish") is not False or run.get("certify") is not False:
        raise ValueError("this pilot cannot authorize publication or certification")
    if run.get("criteria_version") != "pilot-2026-11-18":
        raise ValueError("unknown criteria version")


def make_input(mode: str, track: str, target_id: str, observed_version: str,
               owner_organization: str, assessor_id: str, assessor_organization: str,
               scenario_id: str | None = None, endpoint: str = "",
               source_revision: str = "") -> dict:
    run = {
        "schema": INPUT_SCHEMA,
        "mode": mode,
        "track": track,
        "criteria_version": "pilot-2026-11-18",
        "target": {"id": target_id, "observed_version": observed_version,
                   "owner_organization": owner_organization, "endpoint": endpoint,
                   "source_revision": source_revision},
        "assessor": {"id": assessor_id, "organization": assessor_organization},
        "scope": {"scenario_id": scenario_id or ""},
        "facts": {},
        "observations": {},
        "publish": False,
        "certify": False,
        "instructions": (
            "Submit evidence with pinned source/version and test scope. In ARE_INDEPENDENT "
            "mode each decisive observation must carry observed_by=assessor.id and "
            "evidence_origin=ASSESSOR_DIRECT_TEST|ASSESSOR_SOURCE_INSPECTION|INDEPENDENT_ORACLE. "
            "Self-assessments remain project claims even when fully supported by local evidence."
        ),
    }
    validate_input(run)
    return run


def _independently_observed(entry: object, assessor_id: str) -> bool:
    return (isinstance(entry, dict) and entry.get("observed_by") == assessor_id
            and entry.get("evidence_origin") in {
                "ASSESSOR_DIRECT_TEST", "ASSESSOR_SOURCE_INSPECTION", "INDEPENDENT_ORACLE"
            })


def assess(run: dict) -> dict:
    validate_input(run)
    rules = _rules(run["track"])
    # Evidence never migrates across observed versions; unknown versions may
    # start a draft but cannot produce a decisive pilot finding.
    version = run["target"]["observed_version"]
    pinned = version.strip().casefold() not in {"unknown", "unverified", "not pinned", "not_pinned"}
    facts = {k: v for k, v in run["facts"].items()
             if pinned and isinstance(v, dict) and v.get("version") == version}
    observations = {k: v for k, v in run["observations"].items()
                    if pinned and isinstance(v, dict) and v.get("version") == version}
    if run["mode"] == "ARE_INDEPENDENT":
        # A maintainer-supplied claim may be considered but cannot substitute
        # for independent provenance when producing a decisive conclusion.
        facts = {k: v for k, v in facts.items()
                 if _independently_observed(v, run["assessor"]["id"])}
        observations = {k: v for k, v in observations.items()
                        if _independently_observed(v, run["assessor"]["id"])}
    findings = [
        evaluate(rule, facts, observations,
                 scenario_id=run["scope"]["scenario_id"] or None)
        for rule in rules
    ]
    for f in findings:
        f["evaluator_mode"] = run["mode"]
        f["evidence_class"] = (
            "PROJECT_SUBMITTED_UNVERIFIED_BY_ARE" if run["mode"] == "PROJECT_SELF"
            else "ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED"
        )
    totals = Counter(f["status"] for f in findings)
    return {
        "schema": RESULT_SCHEMA,
        "mode": run["mode"],
        "track": run["track"],
        "criteria_version": run["criteria_version"],
        "target": run["target"],
        "scope": run["scope"],
        "assessor": run["assessor"],
        "findings": findings,
        "evidence_manifest": [
            {"metric": key, "evidence_id": obs.get("evidence_id"),
             "observed_version": obs.get("version"), "observed_by": obs.get("observed_by"),
             "evidence_origin": obs.get("evidence_origin"),
             "trace_refs": obs.get("trace_refs", [])}
            for key, obs in sorted(observations.items()) if isinstance(obs, dict)
        ],
        "status_counts": dict(totals),
        "maturity_level": None,
        "certification": False,
        "public_release_authorized": False,
        "note": ("Source-local provisional self-claims; ARE has not independently reviewed this run."
                 if run["mode"] == "PROJECT_SELF" else
                 "Independent-assessor-submitted provisional findings; machine checks alone do not prove independence, truth or release approval."),
    }


def _validate_result(result: dict, mode: str) -> None:
    if not isinstance(result, dict) or result.get("schema") != RESULT_SCHEMA or result.get("mode") != mode:
        raise ValueError("wrong result schema or evaluator mode")
    if (result.get("track") not in TRACKS or result.get("certification") is not False
            or result.get("public_release_authorized") is not False
            or result.get("maturity_level") is not None):
        raise ValueError("result cannot certify, assign a maturity level or authorize publication")
    if not isinstance(result.get("target"), dict) or not isinstance(result.get("assessor"), dict):
        raise ValueError("result missing actor or target")
    org = result["assessor"].get("organization", "")
    owner_org = result["target"].get("owner_organization", "")
    if not org or not owner_org or ((org.casefold() == owner_org.casefold()) != (mode == "PROJECT_SELF")):
        raise ValueError("result evaluator identity conflicts with its mode")
    expected = {r["id"] for r in _rules(result["track"])}
    findings = result.get("findings")
    if not isinstance(findings, list):
        raise ValueError("missing findings")
    ids = [f.get("check_id") for f in findings if isinstance(f, dict)]
    if len(ids) != len(expected) or len(set(ids)) != len(ids) or set(ids) != expected:
        raise ValueError("missing, duplicate or unexpected check IDs")
    if any(f.get("evaluator_mode") != mode for f in findings):
        raise ValueError("a finding belongs to another evaluator mode")
    if any(f.get("status") not in {"PASS", "FAIL", "UNKNOWN", "NOT_TESTED", "NOT_APPLICABLE", "BLOCKED_AUTH", "NOT_ASSESSED", "ADVISORY_ONLY"} for f in findings):
        raise ValueError("unknown finding status")


def compare(self_result: dict, independent_result: dict) -> dict:
    _validate_result(self_result, "PROJECT_SELF")
    _validate_result(independent_result, "ARE_INDEPENDENT")
    for key in ("track", "criteria_version"):
        if self_result.get(key) != independent_result.get(key):
            raise ValueError("cannot compare different " + key)
    if self_result["assessor"]["id"] == independent_result["assessor"]["id"]:
        raise ValueError("self and independent assessor identities must differ")
    for key in ("id", "observed_version", "source_revision", "endpoint", "owner_organization"):
        if self_result.get("target", {}).get(key) != independent_result.get("target", {}).get(key):
            raise ValueError("cannot compare different target " + key)
    if self_result.get("scope") != independent_result.get("scope"):
        raise ValueError("scope mismatch")
    a = {f["check_id"]: f for f in self_result["findings"]}
    b = {f["check_id"]: f for f in independent_result["findings"]}
    rows = []
    for check in sorted(a):
        s, ind = a[check], b[check]
        if s["status"] in DECISIVE and ind["status"] in DECISIVE:
            label = "AGREE" if s["status"] == ind["status"] else "DISAGREE"
        else:
            label = "UNRESOLVED"
        rows.append({"check_id": check, "self_status": s["status"],
                     "independent_status": ind["status"], "comparison": label})
    return {
        "schema": COMPARISON_SCHEMA,
        "track": self_result["track"],
        "target": self_result["target"],
        "scope": self_result["scope"],
        "comparisons": rows,
        "summary": dict(Counter(row["comparison"] for row in rows)),
        "certification": False,
        "public_release_authorized": False,
        "note": "Disagreements require human/evidence review; self claims never overwrite independent findings.",
    }


def write_json(path: Path, data: dict) -> None:
    if not path.parent.is_dir():
        raise ValueError("output parent directory does not exist")
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    init = sub.add_parser("init", help="create a private evidence input for one evaluator mode")
    init.add_argument("--mode", choices=sorted(MODES), required=True)
    init.add_argument("--track", choices=sorted(TRACKS), required=True)
    for flag in ("target", "version", "owner-organization", "assessor", "assessor-organization"):
        init.add_argument("--" + flag, required=True)
    init.add_argument("--scenario-id", default="")
    init.add_argument("--endpoint", default="")
    init.add_argument("--source-revision", default="")
    init.add_argument("--output", type=Path, required=True)
    eva = sub.add_parser("evaluate", help="evaluate provided evidence, never publish or certify")
    eva.add_argument("--input", type=Path, required=True)
    eva.add_argument("--output", type=Path, required=True)
    cmp = sub.add_parser("compare", help="compare same-target self and independent results")
    cmp.add_argument("--self", dest="self_path", type=Path, required=True)
    cmp.add_argument("--independent", type=Path, required=True)
    cmp.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.action == "init":
            out = make_input(args.mode, args.track, args.target, args.version,
                             args.owner_organization, args.assessor,
                             args.assessor_organization, args.scenario_id,
                             args.endpoint, args.source_revision)
        elif args.action == "evaluate":
            out = assess(json.loads(args.input.read_text(encoding="utf-8")))
        else:
            out = compare(json.loads(args.self_path.read_text(encoding="utf-8")),
                          json.loads(args.independent.read_text(encoding="utf-8")))
        write_json(args.output, out)
        print(json.dumps({"ok": True, "schema": out["schema"],
                          "output": str(args.output),
                          "status_counts": out.get("status_counts", out.get("summary")),
                          "certification": False, "public_release_authorized": False},
                         ensure_ascii=False))
        return 0
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
