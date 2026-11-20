"""Adversarial dry-run criteria tests: FAIL is strict, unknown is not FAIL."""
from __future__ import annotations

import copy
import unittest
from scripts import are_criteria_pilot as m

DATA = m.load_criteria()
RULES = {row["id"]: row for row in DATA["criteria"]}


def fact(value):
    return {"value": value, "evidence_id": "scope/risk-profile-verified"}


def obs(value, *, rule_id=None, surface="NATIVE_MCP", version="2026-11-18", evidence_id="run/trace-1", method="DIRECT_TEST"):
    return {"value": value, "surface": surface, "version": version,
            "evidence_id": evidence_id, "method": method,
            "protocol_id": (rule_id or "MCP-L2-X4") + "@pilot-2026-11-21",
            "sample_count": 3, "trace_refs": ["traces/run-1.json"], "oracle_id": "independent/check-1"}


class CriteriaPilotTests(unittest.TestCase):
    def test_every_atom_predeclares_applicability_and_violation(self):
        self.assertEqual([], m.validate_criteria(DATA))
        self.assertEqual(55, len(RULES))
        self.assertEqual(2, sum(r["obligation"] == "REQUIRED" and r["side"] == "product" for r in RULES.values()))

    def test_uncalibrated_context_ceiling_is_research_only(self):
        rule = RULES["MCP-L2-X4"]
        sample = m.evaluate(rule, {"has_read_tools": fact(True)},
                            {"measured_default_read_context_cost": obs(12000)})
        self.assertEqual("ADVISORY_ONLY", sample["status"])
        self.assertNotIn("metric", sample)
        safe = m.evaluate(rule, {"has_read_tools": fact(True)},
                          {"measured_default_read_context_cost": obs(8000)})
        self.assertEqual("ADVISORY_ONLY", safe["status"])

    def test_host_adapter_cannot_be_misclassified_as_native_vendor_fail(self):
        rule = RULES["MCP-L2-X2"]
        case = m.evaluate(rule, {"can_truncate_results": fact(True)},
                          {"truncation_detectable_and_retrievable": obs(False, rule_id=rule["id"], surface="HOST_ADAPTER")})
        self.assertEqual("UNKNOWN", case["status"])

    def test_unobserved_or_unknown_applicability_never_fails(self):
        rule = RULES["MCP-L2-X4"]
        self.assertEqual("UNKNOWN", m.evaluate(rule, {}, {})["status"])
        self.assertEqual("UNKNOWN", m.evaluate(rule, {"has_read_tools": {"value": False}}, {})["status"])
        self.assertEqual("NOT_APPLICABLE",
                         m.evaluate(rule, {"has_read_tools": fact(False)}, {})["status"])
        self.assertEqual("ADVISORY_ONLY",
                         m.evaluate(rule, {"has_read_tools": fact(True)}, {})["status"])

    def test_large_catalog_threshold_predeclared(self):
        rule = RULES["MCP-L2-X3"]
        self.assertEqual("NOT_APPLICABLE",
                         m.evaluate(rule, {"tool_count": fact(24)}, {})["status"])
        self.assertEqual("ADVISORY_ONLY",
                         m.evaluate(rule, {"tool_count": fact(25)},
                                    {"context_control_observed_with_large_catalog": obs(False, rule_id=rule["id"])})["status"])

    def test_no_sandbox_absence_assumed_from_uninspected_product(self):
        rule = RULES["MCP-L4-R1"]
        self.assertEqual("NOT_TESTED", m.evaluate(rule, {"has_writes": fact(True)}, {})["status"])
        self.assertEqual("UNKNOWN", m.evaluate(rule, {"has_writes": fact(True)},
                                               {"vendor_test_or_sandbox_access_available": obs(False, surface="HOST_ADAPTER")})["status"])

    def test_release_ci_is_advisory_not_punitive_black_box(self):
        rule = RULES["MCP-L4-O2"]
        self.assertEqual("RECOMMENDATION", rule["obligation"])
        self.assertEqual("ADVISORY_ONLY", m.evaluate(rule, {}, {})["status"])
        self.assertEqual("ADVISORY_ONLY", m.evaluate(rule, {"has_vendor_release_evidence": fact(True)},
                        {"vendor_release_regression_gate_documented": obs(False, rule_id=rule["id"])})["status"])

    def test_adopter_without_scenario_is_not_l0(self):
        rule = RULES["ADOPT-L1-V1"]
        self.assertEqual("NOT_ASSESSED", m.evaluate(rule, {}, {})["status"])
        result = m.evaluate(rule, {}, {"value_decision_go_or_read_first": obs(False, rule_id=rule["id"], surface="ADOPTER_WORKFLOW")},
                            scenario_id="pilot-company/use-case")
        self.assertEqual("FAIL", result["status"])

    def test_mutating_history_does_not_give_pass(self):
        rule = RULES["MCP-L3-C1"]
        case = m.evaluate(rule, {"has_writes": fact(True)},
                          {"duplicate_effect_prevention_across_retries": obs(True, rule_id=rule["id"], evidence_id="")})
        self.assertEqual("UNKNOWN", case["status"])

    def test_missing_version_does_not_fail(self):
        rule = RULES["MCP-L2-C2"]
        case = m.evaluate(rule, {"has_callable_tools": fact(True)},
                          {"errors_detected_and_correctly_recovered": obs(False, rule_id=rule["id"], version="")})
        self.assertEqual("UNKNOWN", case["status"])


    def test_three_authorization_risks_are_applicable_without_permission(self):
        for name, feature in (("MCP-L2-O2", "has_read_tools"), ("MCP-L3-C4", "has_writes"), ("MCP-L3-O2", "has_writes")):
            with self.subTest(name=name):
                rule = RULES[name]
                self.assertEqual([feature], [x["fact"] for x in rule["applies_when"]])
                no_authorization = m.evaluate(rule, {feature: fact(True)}, {"authorization": {
                    "state": "BLOCKED_AUTH", "evidence_id": "owner_scope/denied", "reason": "owner sandbox consent unavailable"}})
                self.assertEqual("BLOCKED_AUTH", no_authorization["status"])
                self.assertNotEqual("NOT_APPLICABLE", no_authorization["status"])
                self.assertEqual("NOT_TESTED", m.evaluate(rule, {feature: fact(True)}, {})["status"])

    def test_vendor_provenance_not_client_hashed_discovery(self):
        rule = RULES["MCP-L4-I1"]
        self.assertEqual("vendor_contract_version_or_release_provenance", rule["pass_if"]["metric"])
        result = m.evaluate(rule, {"has_tools": fact(True)}, {
            "vendor_contract_version_or_release_provenance": obs(True, rule_id=rule["id"], surface="HOST_ADAPTER")})
        self.assertEqual("UNKNOWN", result["status"])
        authoritative = m.evaluate(rule, {"has_tools": fact(True)}, {
            "vendor_contract_version_or_release_provenance": obs(False, rule_id=rule["id"], surface="VERIFIED_VENDOR_SOURCE")})
        self.assertEqual("FAIL", authoritative["status"])

    def test_protocol_evidence_is_mandatory_for_any_fail(self):
        rule = RULES["MCP-L2-X2"]
        e = obs(False, rule_id=rule["id"])
        for missing in ("protocol_id", "sample_count", "trace_refs", "oracle_id"):
            r = e.copy()
            r.pop(missing)
            self.assertEqual("UNKNOWN", m.evaluate(rule,
                {"can_truncate_results": fact(True)},
                {"truncation_detectable_and_retrievable": r})["status"])

    def test_all_55_claims_have_scoped_evidence_basis(self):
        self.assertTrue(all(r["evidence_basis"]["implementation_policy"] ==
                            "EQUIVALENT_BEHAVIOR_ACCEPTED" for r in RULES.values()))
        d = copy.deepcopy(DATA)
        d["criteria"][0]["evidence_basis"]["source_ids"] = ["untrusted-source"]
        self.assertTrue(any("basis" in x for x in m.validate_criteria(d)))
        d = copy.deepcopy(DATA)
        for r in d["criteria"]:
            if r["id"] == "MCP-L2-X4":
                r["evidence_basis"]["verdict_policy"] = "SCOPED_PROVISIONAL"
        self.assertTrue(any("calibration" in x for x in m.validate_criteria(d)))

    def test_all_applicable_retry_scenarios_are_predeclared(self):
        specs = __import__("json").loads(m.PROTOCOLS.read_text())
        for check, needed in (("MCP-L2-C2", 2), ("MCP-L3-C1", 3),
                              ("MCP-L3-S1", 2), ("MCP-L2-X2", 2)):
            tags = specs["protocols"][check]["required_scenarios"]
            self.assertEqual(needed, len(tags))
            self.assertGreaterEqual(specs["protocols"][check]["minimum_samples"], needed)

    def test_no_fake_score_by_turning_advice_into_fail(self):
        rule = copy.deepcopy(RULES["MCP-L4-O2"])
        rule["obligation"] = "RECOMMENDATION"
        r = m.evaluate(rule, {}, {"vendor_release_regression_gate_documented": obs(False, rule_id=rule["id"])})
        self.assertNotEqual("FAIL", r["status"])


if __name__ == "__main__":
    unittest.main()
