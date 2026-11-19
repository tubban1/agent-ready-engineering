"""Regression tests for ARE publication state gates (no network or real publishing)."""
from __future__ import annotations
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
spec = importlib.util.spec_from_file_location("are_publication", HERE / "are_publication.py")
assert spec and spec.loader
are = importlib.util.module_from_spec(spec)
spec.loader.exec_module(are)
BASE = json.loads((REPO / "docs/cases/data/solarstorm.json").read_text())


class AREPublicationTests(unittest.TestCase):
    def setUp(self):
        self.case = copy.deepcopy(BASE)

    def test_solarstorm_has_no_overclaims(self):
        self.assertEqual([], are.validate(self.case))
        self.assertEqual(39, sum(self.case["assessment"]["counts"].values()))
        self.assertEqual("UNVERIFIED", self.case["source"]["binding"])
        self.assertEqual("NOT_ESTABLISHED", self.case["assessment"]["maturity_level"])

    def test_new_case_cannot_publish_from_legacy_39_only(self):
        self.case["assessed_at"] = "2026-11-19"
        problems = are.validate(self.case)
        self.assertTrue(any("dual-track release gate" in x for x in problems), problems)
        self.assertEqual(39, sum(self.case["assessment"]["counts"].values()))

    def test_backdated_new_case_cannot_bypass_release_gate(self):
        self.case["case_id"] = "arbitrary-new-case"
        self.case["assessed_at"] = "2026-11-01"
        self.assertTrue(any("dual-track release gate" in x for x in are.validate(self.case)))
        self.case["case_id"] = "solarstorm-2026-11-16"
        self.case["endpoint"] = "https://different.example.test/mcp"
        self.assertTrue(any("dual-track release gate" in x for x in are.validate(self.case)))

    def test_new_case_can_be_held_as_unpublished_draft(self):
        self.case["assessed_at"] = "2026-11-19"
        self.case["stages"]["S10"] = {"status": "NOT_ATTEMPTED", "reason": "pending dual-track QA"}
        for channel in self.case["channels"].values():
            if channel["status"] == "PUBLISHED":
                channel["status"] = "CONTENT_READY"
                channel.pop("url", None)
                channel.pop("published_at", None)
                channel.pop("verification_method", None)
        self.assertEqual([], are.validate(self.case))

    def test_original_39_check_names_and_totals(self):
        self.assertEqual(39, len(are.check_ids()))
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "assessment.json"
            checks = []
            for i, id in enumerate(sorted(are.check_ids())):
                status = (["PASS"] * 4 + ["FAIL"] * 2 +
                          ["NOT_APPLICABLE"] * 10 + ["NOT_VERIFIED"] * 23)[i]
                checks.append({"check_id": id, "status": status})
            f.write_text(json.dumps({"checks": checks}))
            self.assertEqual([], are.validate(self.case, f))
            checks.pop()
            f.write_text(json.dumps({"checks": checks}))
            self.assertTrue(any("39 distinct" in x for x in are.validate(self.case, f)))

    def test_partial_39_check_assessment_cannot_claim_maturity(self):
        self.case["assessment"]["maturity_level"] = "L3"
        self.assertTrue(any("maturity" in x for x in are.validate(self.case)))

    def test_unbound_source_cannot_claim_production(self):
        self.case["claim_deployed_source_tests"] = True
        self.assertTrue(any("unbound source" in x for x in are.validate(self.case)))

    def test_metadata_call_coverage_is_separate(self):
        self.case["tool_coverage"]["called"] = 5
        self.assertTrue(any("tool coverage" in x for x in are.validate(self.case)))

    def test_no_real_agent_without_oracle(self):
        self.case["agent"]["independent_oracle"] = None
        self.assertTrue(any("oracle" in x for x in are.validate(self.case)))

    def test_published_requires_real_url_and_timestamp(self):
        self.case["channels"]["x"] = {"status": "PUBLISHED"}
        self.assertTrue(any("published x" in x for x in are.validate(self.case)))
        self.case["channels"]["x"] = {
            "status":"PUBLISHED", "url":"https://github.com/tubban1/status/111",
            "published_at":"2026-11-16", "verification_method":"browser_readback"}
        self.assertTrue(any("published x" in x for x in are.validate(self.case)))

    def test_x_homepage_is_not_a_post_receipt(self):
        self.case["channels"]["x"] = {
            "status": "PUBLISHED", "url": "https://x.com/home",
            "published_at": "2026-11-16", "verification_method": "browser_readback"}
        self.assertTrue(any("published x" in x for x in are.validate(self.case)))
        self.assertTrue(are.allowed_post_url("x", "https://x.com/tubban1/status/1234567890123"))
        self.assertFalse(are.allowed_post_url("x", "https://x.com/tubban1"))

    def test_social_draft_cannot_fake_post_url(self):
        self.case["channels"]["x"]["url"] = "https://x.com/tubban1/status/123"
        self.assertTrue(any("cannot claim" in x for x in are.validate(self.case)))

    def test_cannot_claim_email_delivery_from_send_receipt(self):
        self.case["outreach"]["delivery"] = "CONFIRMED_READ"
        self.assertTrue(any("recipient read" in x for x in are.validate(self.case)))
        self.case["outreach"]["delivery"] = "UNKNOWN"
        self.assertEqual([], are.validate(self.case))

    def test_cannot_close_external_reply_or_retest_early(self):
        self.case["stages"]["S12"]["status"] = "COMPLETE"
        self.case["stages"]["S13"]["status"] = "COMPLETE"
        problems = are.validate(self.case)
        self.assertTrue(any("S12" in x for x in problems))
        self.assertTrue(any("S13" in x for x in problems))

    def test_render_separate_safe_roles_no_side_effects(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            are.render(self.case, out)
            p = (out / "PUBLIC_READONLY_REPLAY.md").read_text()
            m = (out / "MAINTAINER_RETEST.md").read_text()
            self.assertIn("get_aurora_visibility", p)
            self.assertIn("NOAA Space Weather", p)
            self.assertIn("never use credentials", p.lower())
            self.assertIn("owner", m.lower())
            self.assertNotIn("<SERVICE_NAME>", m)
            self.assertIn("NONE", (out / "render_manifest.json").read_text())
            self.assertEqual(5, len(json.loads((out / "render_manifest.json").read_text())["outputs_sha256"]))

    def test_receipt_requires_external_provider_or_browser_proof(self):
        with tempfile.TemporaryDirectory() as d:
            ledger = Path(d) / "journal.jsonl"
            receipt = Path(d) / "receipt.json"
            url = "https://x.com/tubban1/status/1234567890"
            with self.assertRaises(ValueError):
                are.add_receipt(self.case, ledger, "x", url, "browser_readback", receipt)
            receipt.write_text(json.dumps({"posted": False, "url": url, "observed_via":"browser_readback"}))
            with self.assertRaises(ValueError):
                are.add_receipt(self.case, ledger, "x", url, "browser_readback", receipt)
            receipt.write_text(json.dumps({"posted": True, "url": url, "observed_via":"browser_readback"}))
            self.assertEqual("RECORDED", are.add_receipt(self.case, ledger, "x", url, "browser_readback", receipt))
            self.assertEqual("ALREADY_RECORDED", are.add_receipt(self.case, ledger, "x", url, "browser_readback", receipt))
            events = are.receipt_line(ledger)
            self.assertEqual(1, len(events))
            self.assertIn(url, are.status_report(self.case, events))

    def test_receipt_rejects_wrong_site_and_conflicts(self):
        with tempfile.TemporaryDirectory() as d:
            receipt = Path(d) / "receipt.json"
            ledger = Path(d) / "journal.jsonl"
            u = "https://linkedin.com/posts/real-case-123"
            receipt.write_text(json.dumps({"posted":True,"url":u,"observed_via":"browser_readback"}))
            with self.assertRaises(ValueError):
                are.add_receipt(self.case, ledger, "x", u, "browser_readback", receipt)
            self.assertEqual("RECORDED", are.add_receipt(self.case, ledger, "linkedin", u, "browser_readback", receipt))
            u2 = "https://linkedin.com/posts/second-456"
            receipt.write_text(json.dumps({"posted":True,"url":u2,"observed_via":"browser_readback"}))
            with self.assertRaisesRegex(ValueError,"already has a different receipt"):
                are.add_receipt(self.case, ledger, "linkedin", u2, "browser_readback", receipt)


if __name__ == "__main__":
    unittest.main()
