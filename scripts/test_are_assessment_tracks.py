"""Regression checks for draft A/B split; no Agent calls or publication."""
from __future__ import annotations
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("are_assessment_tracks", ROOT / "scripts/are_assessment_tracks.py")
assert spec and spec.loader
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
BASE = json.loads((ROOT / "data/are-assessment-track-map.v1.json").read_text(encoding="utf-8"))


class TwoTrackMapTests(unittest.TestCase):
    def test_complete_mapping_is_draft(self):
        self.assertEqual([], m.validate_map(BASE))
        self.assertEqual("DRAFT_NOT_SCOREABLE", BASE["status"])
        self.assertEqual(39, len(BASE["rules"]))
        self.assertEqual(32, len(m.atomic_checks(BASE, "product")))
        self.assertEqual(23, len(m.atomic_checks(BASE, "adopter")))

    def test_lossless_legacy_ids_and_separate_atoms(self):
        mapped = [r["legacy_id"] for r in BASE["rules"]]
        self.assertEqual(set(mapped), m.legacy_ids())
        self.assertEqual(len(mapped), len(set(mapped)))
        new_ids = [r["id"] for side in ("product", "adopter") for r in m.atomic_checks(BASE, side)]
        self.assertEqual(55, len(new_ids))
        self.assertEqual(55, len(set(new_ids)))

    def test_missing_original_id_rejected(self):
        case = copy.deepcopy(BASE)
        case["rules"].pop()
        self.assertTrue(m.validate_map(case))

    def test_misallocated_cross_party_requirement_rejected(self):
        case = copy.deepcopy(BASE)
        candidate = next(x for x in case["rules"] if x["allocation"] == "B")
        candidate["product"] = {"id": "MCP-" + candidate["legacy_id"], "claim": "Wrong"}
        self.assertTrue(m.validate_map(case))

    def test_renaming_legacy_id_does_not_bypass(self):
        case = copy.deepcopy(BASE)
        case["rules"][0]["legacy_id"] = "L9-Z9"
        self.assertTrue(any("39 original" in x for x in m.validate_map(case)))

    def test_relabeling_draft_as_active_is_rejected(self):
        case = copy.deepcopy(BASE)
        case["status"] = "CERTIFIED"
        self.assertTrue(any("draft" in x for x in m.validate_map(case)))

    def test_no_legacy_completion_publication_license(self):
        case = copy.deepcopy(BASE)
        case["score_policy"]["legacy_39_completion_is_not_publication_authorization"] = False
        self.assertTrue(m.validate_map(case))

    def test_unknown_or_untested_is_not_fail(self):
        self.assertEqual([], m.validate_observation({"state": "NOT_TESTED", "reason": "Sandbox not available"}))
        self.assertEqual([], m.validate_observation({"state": "UNKNOWN", "reason": "Live source unbound"}))
        self.assertEqual([], m.validate_observation({"state": "BLOCKED_AUTH", "reason": "No owner permission"}))

    def test_unobserved_pass_fails_evidence_gate(self):
        self.assertTrue(m.validate_observation({"state": "PASS"}))

    def test_mandatory_failure_with_attribution_accepted(self):
        item = {"state": "FAIL", "evidence": ["fixture/trace.json"],
                "test_scope": "read-only tool v1", "observed_version": "commit:abc",
                "mandatory": True, "attributable_to_tested_side": True}
        self.assertEqual([], m.validate_observation(item))
        item["mandatory"] = False
        self.assertTrue(any("mandatory" in x for x in m.validate_observation(item)))

    def test_recommendation_is_not_a_scoring_state(self):
        self.assertTrue(m.validate_observation({"state": "DESIGN_GAP"}))


if __name__ == "__main__":
    unittest.main()
