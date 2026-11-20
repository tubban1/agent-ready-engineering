"""Checks both evaluator modes against the 55 pilot criteria, without promotion or release."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from are_evaluator_workflows import (make_input, assess, compare, validate_input,
                                     _validate_result)


class EvaluatorWorkflowTests(unittest.TestCase):
    def input(self, mode="PROJECT_SELF", track="product"):
        return make_input(mode=mode, track=track, target_id="example-mcp",
                          observed_version="sha256:1234", owner_organization="Example Labs",
                          assessor_id=("reviewer-1" if mode == "ARE_INDEPENDENT" else "author-1"),
                          assessor_organization=("ARE Research" if mode == "ARE_INDEPENDENT" else "Example Labs"),
                          scenario_id=("scenario-a" if track == "adopter" else None),
                          endpoint="https://example.com/mcp", source_revision="abc123")

    def test_both_modes_generate_full_product_track(self):
        for mode in ("PROJECT_SELF", "ARE_INDEPENDENT"):
            with self.subTest(mode=mode):
                result = assess(self.input(mode))
                self.assertEqual(len(result["findings"]), 32)
                self.assertIsNone(result["maturity_level"])
                self.assertFalse(result["certification"])
                self.assertFalse(result["public_release_authorized"])
                self.assertTrue(all(f["evaluator_mode"] == mode for f in result["findings"]))
                self.assertNotIn("PASS", result["status_counts"])

    def test_both_modes_generate_adopter_track(self):
        self.assertEqual(len(assess(self.input("PROJECT_SELF", "adopter"))["findings"]), 23)
        self.assertEqual(len(assess(self.input("ARE_INDEPENDENT", "adopter"))["findings"]), 23)

    def test_independence_cannot_be_self_declared_by_same_organization(self):
        run = self.input("PROJECT_SELF")
        run["mode"] = "ARE_INDEPENDENT"
        with self.assertRaisesRegex(ValueError, "independent assessor"):
            validate_input(run)

    def test_adopter_requires_scenario(self):
        run = self.input("PROJECT_SELF", "adopter")
        run["scope"]["scenario_id"] = ""
        with self.assertRaisesRegex(ValueError, "scenario_id"):
            validate_input(run)

    def test_public_release_cannot_be_requested_via_input(self):
        for key in ("publish", "certify"):
            run = self.input()
            run[key] = True
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "cannot authorize"):
                validate_input(run)

    def test_project_self_claim_is_not_automatically_independent(self):
        # A self-reported metric with a complete-looking protocol cannot be reused
        # to manufacture an independent PASS: its claimed origin is filtered out.
        from are_criteria_pilot import load_criteria
        rule = next(r for r in load_criteria()["criteria"]
                    if r["side"] == "product" and r["obligation"] == "REQUIRED")
        metric = rule["pass_if"]["metric"]
        obs = {"value": rule["pass_if"]["value"], "evidence_id": "claim-1",
               "version": "sha256:1234", "method": "DIRECT_TEST",
               "surface": "NATIVE_MCP", "protocol_id": rule["id"] + "@pilot-2026-11-21",
               "sample_count": 100, "trace_refs": ["trace-1"], "oracle_id": "oracle-1",
               "observed_by": "author-1", "evidence_origin": "SUBJECT_SELF_REPORT"}
        run = self.input("ARE_INDEPENDENT")
        run["observations"][metric] = obs
        result = assess(run)
        finding = next(f for f in result["findings"] if f["check_id"] == rule["id"])
        self.assertNotIn(finding["status"], {"PASS", "FAIL"})

    def test_independent_provenance_required_for_decisive_evidence(self):
        from are_criteria_pilot import load_criteria
        rule = next(r for r in load_criteria()["criteria"]
                    if r["side"] == "product" and r["obligation"] == "REQUIRED"
                    and not r["applies_when"])
        metric = rule["pass_if"]["metric"]
        run = self.input("ARE_INDEPENDENT")
        run["observations"][metric] = {
            "value": rule["pass_if"]["value"], "evidence_id": "test-1",
            "version": "sha256:1234", "method": "DIRECT_TEST",
            "surface": "NATIVE_MCP", "protocol_id": rule["id"] + "@pilot-2026-11-21",
            "sample_count": 100, "trace_refs": ["trace-1"], "oracle_id": "oracle-1",
            "observed_by": "reviewer-1", "evidence_origin": "ASSESSOR_DIRECT_TEST",
        }
        res = assess(run)
        finding = next(f for f in res["findings"] if f["check_id"] == rule["id"])
        self.assertEqual(finding["status"], "PASS")
        self.assertEqual(finding["evidence_class"], "ASSESSOR_DECLARED_PROVENANCE_NOT_EXTERNALLY_ATTESTED")
        self.assertIsNone(res["maturity_level"])

    def test_self_mode_cannot_be_claimed_by_a_foreign_assessor(self):
        run = self.input("PROJECT_SELF")
        run["assessor"]["organization"] = "Unrelated Consulting"
        with self.assertRaisesRegex(ValueError, "requires the assessed organization"):
            validate_input(run)

    def test_evidence_version_cannot_be_reused_for_another_release(self):
        from are_criteria_pilot import load_criteria
        rule = next(r for r in load_criteria()["criteria"]
                    if r["side"] == "product" and r["obligation"] == "REQUIRED"
                    and not r["applies_when"])
        metric = rule["pass_if"]["metric"]
        run = self.input("ARE_INDEPENDENT")
        run["observations"][metric] = {
            "value": rule["pass_if"]["value"], "evidence_id": "wrong-version",
            "version": "different-sha", "method": "DIRECT_TEST",
            "surface": "NATIVE_MCP", "protocol_id": rule["id"] + "@pilot-2026-11-21",
            "sample_count": 100, "trace_refs": ["trace-1"], "oracle_id": "oracle-1",
            "observed_by": "reviewer-1", "evidence_origin": "ASSESSOR_DIRECT_TEST",
        }
        result = assess(run)
        finding = next(f for f in result["findings"] if f["check_id"] == rule["id"])
        self.assertNotIn(finding["status"], {"PASS", "FAIL"})

    def test_unpinned_version_cannot_produce_decisive_findings(self):
        run = self.input("PROJECT_SELF")
        run["target"]["observed_version"] = "unknown"
        result = assess(run)
        self.assertNotIn("PASS", result["status_counts"])
        self.assertNotIn("FAIL", result["status_counts"])

    def test_compare_never_promotes_self_results(self):
        self_report = assess(self.input("PROJECT_SELF"))
        independent = assess(self.input("ARE_INDEPENDENT"))
        diff = compare(self_report, independent)
        self.assertEqual(len(diff["comparisons"]), 32)
        self.assertEqual(diff["summary"].get("UNRESOLVED"), 32)
        self.assertFalse(diff["public_release_authorized"])
        self.assertFalse(diff["certification"])

    def test_compare_mismatched_versions_rejected(self):
        self_report = assess(self.input("PROJECT_SELF"))
        independent = assess(self.input("ARE_INDEPENDENT"))
        independent["target"]["observed_version"] = "changed"
        with self.assertRaisesRegex(ValueError, "observed_version"):
            compare(self_report, independent)

    def test_compare_mismatched_scenarios_rejected(self):
        self_report = assess(self.input("PROJECT_SELF", "adopter"))
        independent = assess(self.input("ARE_INDEPENDENT", "adopter"))
        independent["scope"]["scenario_id"] = "other"
        with self.assertRaisesRegex(ValueError, "scope mismatch"):
            compare(self_report, independent)

    def test_compare_rejects_tampered_check_list(self):
        self_report = assess(self.input("PROJECT_SELF"))
        independent = assess(self.input("ARE_INDEPENDENT"))
        independent["findings"].append(copy.deepcopy(independent["findings"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            compare(self_report, independent)


if __name__ == "__main__":
    unittest.main()
