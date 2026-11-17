"""Contract checks for the ARE macro-stage blueprint (not a production worker).

These tests prove that a future orchestrator's declarative topology doesn't drift
from the existing S0-S13 SOP. They do not connect to World2 or perform live work.
"""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "data/are-macro-stage-plan.v1.json"
SPEC = ROOT / "docs/standards/ARE-MACRO-STAGE-ORCHESTRATION-v1.md"


class AREMacroStageContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = json.loads(PLAN.read_text(encoding="utf8"))

    def test_config_is_just_a_blueprint_not_a_live_claim(self):
        self.assertEqual(self.doc["schema"], "are.macro_stage_plan.v1")
        self.assertEqual(self.doc["status"], "DESIGN_NOT_PRODUCTION_WORKER")
        self.assertTrue(SPEC.exists())
        self.assertTrue((ROOT / self.doc["source_sop"]).exists())

    def test_s0_s13_exactly_once_in_order(self):
        all_steps = [s for stage in self.doc["stages"] for s in stage["sop_steps"]]
        self.assertEqual([f"S{i}" for i in range(14)], all_steps)
        self.assertEqual(len(set(all_steps)), len(all_steps))

    def test_six_automatic_macro_stages(self):
        stages = self.doc["stages"]
        self.assertEqual([f"W{i}" for i in range(1, 7)], [x["id"] for x in stages])
        for stage in stages:
            self.assertTrue(stage["mode"].startswith(("automatic", "event_driven_automatic")))
            self.assertTrue(stage["outputs"])
            self.assertTrue(stage["trigger"])

    def test_five_boundary_gates_no_micro_step_gate(self):
        stages = self.doc["stages"]
        gates = self.doc["gates"]
        self.assertEqual([f"G{i}" for i in range(1, 6)], [g["id"] for g in gates])
        for i, gate in enumerate(gates):
            self.assertEqual([stages[i]["id"], stages[i + 1]["id"]], gate["between"])
            self.assertEqual(gate["id"], stages[i]["boundary"])
            self.assertTrue(gate["auto_pass_when"])
            self.assertTrue(gate["manual_only_when"])
            self.assertTrue(gate["on_block"])
        self.assertIsNone(stages[-1]["boundary"])

    def test_auth_gate_does_not_authorize_nonpublic_writes(self):
        gate = self.doc["gates"][1]
        self.assertEqual("TEST_SCOPE_AUTHORIZATION", gate["decision"])
        self.assertIn("public_safe_allowlist_only", gate["auto_pass_when"])
        self.assertIn("oauth_consent", gate["manual_only_when"])
        self.assertIn("new_sandbox_or_write_scope", gate["manual_only_when"])
        self.assertEqual("LIMITED_PUBLIC_ONLY", gate["on_block"])

    def test_outbound_and_public_have_separate_gates(self):
        gate3, gate4 = self.doc["gates"][2:4]
        self.assertEqual("EVIDENCE_AND_OUTBOUND_POLICY", gate3["decision"])
        self.assertEqual("DISCLOSURE_RELEASE", gate4["decision"])
        self.assertIn("outbound_policy_preapproved", gate3["auto_pass_when"])
        self.assertIn("publication_scope_preapproved", gate4["auto_pass_when"])
        self.assertIn("redaction_and_public_qa_pass", gate4["auto_pass_when"])

    def test_partial_channels_do_not_block_monitoring(self):
        self.assertEqual("PARTIAL_CHANNELS_CONTINUE_MONITORING", self.doc["gates"][4]["on_block"])
        self.assertIn("DEPLOYED_VERSION_CHANGE", self.doc["stages"][5]["trigger"])

    def test_external_side_effect_requires_provider_evidence(self):
        e = self.doc["external_side_effects"]
        for key in ("approved_scope", "outbox_idempotency_key", "actual_provider_receipt"):
            self.assertIn(key, e["requires"])
        for key in ("draft", "button_click", "timeout", "unverified_url"):
            self.assertIn(key, e["never_infer_success_from"])

    def test_workflow_has_explicit_wait_states(self):
        self.assertTrue({"WAITING_HUMAN", "WAITING_EXTERNAL", "LIMITED", "FAILED_RETRYABLE"}.issubset(
            set(self.doc["stage_statuses"])
        ))
        self.assertTrue({"AUTO_PASS", "WAITING_HUMAN", "DENIED"}.issubset(
            set(self.doc["gate_decisions"])
        ))


if __name__ == "__main__":
    unittest.main()
