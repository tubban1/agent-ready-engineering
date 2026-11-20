#!/usr/bin/env python3
"""Versioned, preliminary dual-track ARE rules — pilot observations only.

This is NOT a public grade issuer. It cannot approve publication or certify
vendors. Failures require verified, attributable observations and applicable
predeclared rules; unknown feature facts do not imply non-applicability.
"""
from __future__ import annotations
from pathlib import Path
import argparse
import json
from typing import Any
try:
    from .are_assessment_tracks import atomic_checks, load_map, validate_map
except ImportError:  # invoked as standalone python3 scripts/are_criteria_pilot.py
    from are_assessment_tracks import atomic_checks, load_map, validate_map

ROOT = Path(__file__).resolve().parents[1]
RULES = ROOT / "data/are-assessment-criteria-pilot.v1.json"
PROTOCOLS = ROOT / "data/are-criteria-test-protocols.v1.json"
PRIVILEGED_CASES = frozenset({"MCP-L2-O2", "MCP-L3-C4", "MCP-L3-O2"})
DUTIES = {"REQUIRED", "CONDITIONAL_REQUIRED", "RECOMMENDATION"}
OPS = {"eq", "lte", "gte"}
SURFACES = {"NATIVE_MCP", "VERIFIED_VENDOR_SOURCE", "HOST_ADAPTER", "ADOPTER_WORKFLOW"}
OBSERVATION_METHODS = {"DIRECT_TEST", "CODE_INSPECTION", "VERIFIED_LOG", "INDEPENDENT_ORACLE"}


def load_criteria(path: Path = RULES) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("criteria document must be object")
    return data


def validate_criteria(data: dict) -> list[str]:
    errors = []
    mapping = load_map()
    errors.extend(validate_map(mapping))
    if data.get("schema") != "are.two_track_criteria.v1":
        errors.append("wrong criteria schema")
    if data.get("status") != "PILOT_NOT_CERTIFIABLE":
        errors.append("pilot cannot issue formal levels")
    rows = data.get("criteria", [])
    if not isinstance(rows, list):
        return errors + ["criteria must be list"]
    expect = {r["id"]: side for side in ("product", "adopter")
              for r in atomic_checks(mapping, side)}
    actual = [r.get("id") for r in rows if isinstance(r, dict)]
    if len(rows) != len(expect) or set(actual) != set(expect) or len(set(actual)) != len(actual):
        errors.append("criteria must contain exactly the 55 split atoms")
    sources = data.get("evidence_catalog", {}).get("sources", {})
    if not isinstance(sources, dict) or len(sources) < 4:
        errors.append("versioned evidence catalog missing")
    for sid, source in sources.items():
        if (not isinstance(source, dict) or source.get("type") not in
                {"NORMATIVE", "OPTIONAL_EXTENSION", "EMPIRICAL_CONTEXT", "ENGINEERING_GUIDANCE"}
                or not str(source.get("url", "")).startswith("https://") or not str(source.get("scope", "")).strip()):
            errors.append(f"{sid}: missing scoped external source")
    for r in rows:
        if not isinstance(r, dict):
            errors.append("invalid criteria row")
            continue
        key = r.get("id")
        if key not in expect or r.get("side") != expect.get(key):
            errors.append(f"{key}: side mismatch")
        basis = r.get("evidence_basis")
        if (not isinstance(basis, dict) or basis.get("claim_class") not in
                {"ARE_QUALITY", "ADOPTER_GOVERNANCE", "CALIBRATION_HYPOTHESIS"} or
                basis.get("verdict_policy") not in {"SCOPED_PROVISIONAL", "MEASURE_ONLY"} or
                basis.get("implementation_policy") != "EQUIVALENT_BEHAVIOR_ACCEPTED" or
                not isinstance(basis.get("source_ids"), list) or
                any(sid not in sources for sid in basis.get("source_ids", [])) or
                basis.get("evaluated_outcome") != r.get("pass_if", {}).get("metric")):
            errors.append(f"{key}: incomplete or misleading source/equivalence basis")
        elif (basis["claim_class"] == "CALIBRATION_HYPOTHESIS") != (basis["verdict_policy"] == "MEASURE_ONLY"):
            errors.append(f"{key}: calibration items must be unscored")
        duty = r.get("obligation")
        if duty not in DUTIES:
            errors.append(f"{key}: obligation missing/invalid")
        if duty == "CONDITIONAL_REQUIRED" and not r.get("applies_when"):
            errors.append(f"{key}: conditional requirement missing conditions")
        if duty == "REQUIRED" and r.get("applies_when"):
            errors.append(f"{key}: unconditional rule must not have conditional predicates")
        p = r.get("pass_if", {})
        if not isinstance(p, dict) or not isinstance(p.get("metric"), str) or p.get("op") not in OPS or "value" not in p:
            errors.append(f"{key}: measurable pass assertion absent")
        for clause in r.get("applies_when", []):
            if (not isinstance(clause, dict) or not isinstance(clause.get("fact"), str)
                or clause.get("op") not in OPS or "value" not in clause):
                errors.append(f"{key}: invalid applicability predicate")
        if not str(r.get("failure_standard", "")).strip():
            errors.append(f"{key}: no explicit violation standard")
        if r.get("provenance_required") not in {"NATIVE_SERVICE_OR_VERIFIED_VENDOR_SOURCE", "SCOPED_ADOPTER_EVIDENCE"}:
            errors.append(f"{key}: invalid evidence scope")
    protocols = json.loads(PROTOCOLS.read_text(encoding="utf-8"))
    recipes = protocols.get("protocols", {})
    if protocols.get("schema") != "are.criteria.test_protocols.v1" or protocols.get("status") != "NONCERTIFYING_PREDECLARED":
        errors.append("invalid test protocol catalog")
    if set(recipes) != set(actual):
        errors.append("every atomic check needs an exact matching test protocol")
    for check_id, recipe in recipes.items():
        if not isinstance(recipe, dict):
            errors.append(f"{check_id}: invalid protocol")
            continue
        for field in ("setup", "procedure", "pass_rule"):
            if not isinstance(recipe.get(field), str) or len(recipe[field].strip()) < 8:
                errors.append(f"{check_id}: no specific {field}")
        if type(recipe.get("minimum_samples")) is not int or recipe["minimum_samples"] < 1:
            errors.append(f"{check_id}: invalid minimum_samples")
        if len(recipe.get("required_artifacts", [])) < 5:
            errors.append(f"{check_id}: insufficient evidence artifact contract")
        scenarios = recipe.get("required_scenarios", [])
        if (not isinstance(scenarios, list) or len(set(scenarios)) != len(scenarios) or
                any(not isinstance(x, str) or not x.strip() for x in scenarios) or
                len(scenarios) > recipe.get("minimum_samples", 0)):
            errors.append(f"{check_id}: invalid required failure-mode scenarios")
    return errors


def matches(value: Any, op: str, expected: Any) -> bool:
    if op == "eq":
        return type(value) == type(expected) and value == expected
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    if not isinstance(expected, (int, float)) or isinstance(expected, bool):
        return False
    return value <= expected if op == "lte" else value >= expected


def evaluate(rule: dict, facts: dict, observations: dict, *, scenario_id: str | None = None) -> dict:
    """Return scoped provisional status, never a maturity grade.

    facts: {name: {value: any, evidence_id: str}}.
    observations: {metric: {value: any, evidence_id: str, version: str,
                            surface: NATIVE_MCP|..., method: DIRECT_TEST|...,
                            protocol_id: str, sample_count: int, trace_refs: list, oracle_id: str}}.
    For privileged operations, authorization={state: BLOCKED_AUTH, evidence_id, reason}
    causes BLOCKED_AUTH only after applicability has been verified.
    """
    result = {"check_id": rule["id"], "status": "UNKNOWN", "certification": False}
    if rule["side"] == "adopter" and not scenario_id:
        return {**result, "status": "NOT_ASSESSED", "reason": "no adopting organization scenario"}
    if rule["obligation"] == "RECOMMENDATION":
        return {**result, "status": "ADVISORY_ONLY", "reason": "non-scored, never FAIL"}
    for clause in rule.get("applies_when", []):
        feature = facts.get(clause["fact"])
        if not isinstance(feature, dict) or not feature.get("evidence_id") or "value" not in feature:
            return {**result, "reason": "missing proven applicability fact " + clause["fact"]}
        if not matches(feature["value"], clause["op"], clause["value"]):
            return {**result, "status": "NOT_APPLICABLE",
                    "reason": "verified applicability predicate false: " + clause["fact"]}
    if rule.get("evidence_basis", {}).get("verdict_policy") == "MEASURE_ONLY":
        return {**result, "status": "ADVISORY_ONLY",
                "reason": "uncalibrated threshold is research-only, not a product failure"}
    if rule["id"] in PRIVILEGED_CASES:
        permission = observations.get("authorization", {})
        if permission.get("state") == "BLOCKED_AUTH":
            if permission.get("evidence_id") and permission.get("reason"):
                return {**result, "status": "BLOCKED_AUTH", "reason": permission["reason"],
                        "evidence_id": permission["evidence_id"]}
            return {**result, "reason": "unverified access blocker"}
    check = rule["pass_if"]
    evidence = observations.get(check["metric"])
    if not isinstance(evidence, dict) or "value" not in evidence:
        return {**result, "status": "NOT_TESTED", "reason": "metric not observed: " + check["metric"]}
    if (not evidence.get("evidence_id") or not evidence.get("version") or
            evidence.get("method") not in OBSERVATION_METHODS or evidence.get("surface") not in SURFACES):
        return {**result, "reason": "insufficient independently checkable evidence"}
    protocol = json.loads(PROTOCOLS.read_text(encoding="utf-8"))["protocols"][rule["id"]]
    if (evidence.get("protocol_id") != rule["id"] + "@pilot-2026-11-21" or
            type(evidence.get("sample_count")) is not int or
            evidence["sample_count"] < protocol["minimum_samples"] or
            not isinstance(evidence.get("trace_refs"), list) or not evidence["trace_refs"] or
            not evidence.get("oracle_id")):
        return {**result, "reason": "pilot test protocol or minimum raw evidence incomplete"}
    if rule["side"] == "product" and evidence["surface"] not in {"NATIVE_MCP", "VERIFIED_VENDOR_SOURCE"}:
        return {**result, "reason": "host adapter finding cannot be attributed to native MCP"}
    if rule["side"] == "adopter" and evidence["surface"] != "ADOPTER_WORKFLOW":
        return {**result, "reason": "finding does not originate in the adopting scenario"}
    passed = matches(evidence["value"], check["op"], check["value"])
    return {**result, "status": "PASS" if passed else "FAIL",
            "reason": "predeclared measured assertion satisfied" if passed else rule["failure_standard"],
            "metric": check["metric"], "observed_value": evidence["value"],
            "evidence_id": evidence["evidence_id"], "observed_version": evidence["version"]}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--file", type=Path, default=RULES)
    args = p.parse_args()
    data = load_criteria(args.file)
    errors = validate_criteria(data)
    print(json.dumps({"ok": not errors, "rules": len(data["criteria"]),
                      "obligations": {k: sum(r["obligation"] == k for r in data["criteria"]) for k in sorted(DUTIES)},
                      "certification": False, "errors": errors}, indent=2, ensure_ascii=False))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
