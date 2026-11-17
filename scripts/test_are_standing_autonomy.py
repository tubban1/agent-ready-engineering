"""Pure contract checks for standing-scope authorization in ARE workflows.

Never calls external services; fact flags here are *test fixtures*.
"""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("are_standing_autonomy", ROOT / "scripts/are_standing_autonomy.py")
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
POLICY = json.loads((ROOT / "data/are-standing-autonomy-policy.v1.json").read_text())
BINDING = {
    "schema": "are.private_identity_binding.v1",
    "account_ref": "are_operator_accounts",
    "account_role": "are_operator",
    "allowed_emails": ["operator-a@example.test", "operator-b@example.test"],
    "providers": {
        "gmail": {"accounts": {
            "operator-a@example.test": {"observed_connected": True, "provider_account_id": "test-id-1"},
            "operator-b@example.test": {"observed_connected": True, "provider_account_id": "test-id-2"}
        }},
        "channels": {"x": {"connected": True, "provider_account_id": "test-x-123"}},
        "target_mcp": {"test-target": {"connected": True, "owner_scope_recorded": True, "provider_account_id": "sandbox-42"}}
    }
}


def make_req(action: str, **extra):
    rule = POLICY["actions"][action]
    r = {
        "action": action,
        "account_ref": "are_operator_accounts",
        "facts": {k: True for k in rule["requirements"]},
        "observed_profile": {"email": "operator-a@example.test", "id": "test-id-1"},
        "provider_login_verified_by_adapter": True,
        "idempotency_key": "immutable-evidence/test-case/action/scope",
        "requested_effects": [],
    }
    r.update(extra)
    return r


class AREAutonomyPolicyTests(unittest.TestCase):
    def check(self, action, binding=None, **extra):
        return mod.evaluate(POLICY, BINDING if binding is None else binding, make_req(action, **extra))

    def test_public_research_needs_no_connected_account(self):
        b = {"providers": {}, "account_ref": "other", "account_role": "wrong"}
        for action in ("W1_DISCOVER", "W2_INSPECT", "W3_PUBLIC_TEST", "W4_REPORT_QA", "W6_MONITOR"):
            with self.subTest(action=action):
                self.assertEqual(self.check(action, b)["decision"], "AUTO_PASS_CANDIDATE")

    def test_email_auto_after_one_verified_login(self):
        result = self.check("W4_SEND_MAIL")
        self.assertEqual(result["decision"], "AUTO_PASS_CANDIDATE")
        self.assertTrue(result["advisory_only"])
        self.assertFalse(result["may_execute"])

    def test_both_approved_operator_gmail_accounts_work(self):
        a = self.check("W4_SEND_MAIL", observed_profile={"email": "operator-a@example.test", "id": "test-id-1"})
        b = self.check("W4_SEND_MAIL", observed_profile={"email": "operator-b@example.test", "id": "test-id-2"})
        self.assertEqual(a["decision"], "AUTO_PASS_CANDIDATE")
        self.assertEqual(b["decision"], "AUTO_PASS_CANDIDATE")

    def test_unapproved_gmail_is_blocked(self):
        r = self.check("W4_SEND_MAIL", observed_profile={"email": "attacker@example.com", "id": "unknown-id"})
        self.assertEqual(r["decision"], "BLOCKED_IDENTITY_MISMATCH")

    def test_observed_email_does_not_bypass_provider_id_check(self):
        r = self.check("W4_SEND_MAIL", observed_profile={"email": "operator-b@example.test", "id": "wrong-id"})
        self.assertEqual(r["decision"], "BLOCKED_IDENTITY_MISMATCH")

    def test_pending_allowed_account_cannot_send(self):
        b = copy.deepcopy(BINDING)
        b["providers"]["gmail"]["accounts"]["operator-a@example.test"]["observed_connected"] = False
        self.assertEqual(self.check("W4_SEND_MAIL", b)["decision"], "WAITING_PROVIDER_CONNECTION")

    def test_lack_of_connector_attestation_cannot_send(self):
        self.assertEqual(self.check("W4_SEND_MAIL", provider_login_verified_by_adapter=False)["decision"], "WAITING_PROVIDER_CONNECTION")

    def test_email_receipt_and_limits_required(self):
        r = make_req("W4_SEND_MAIL", facts={k:True for k in POLICY["actions"]["W4_SEND_MAIL"]["requirements"]})
        r["facts"]["daily_quota_available"] = False
        self.assertEqual(mod.evaluate(POLICY, BINDING, r)["decision"], "WAITING_EVIDENCE")
        r["facts"]["daily_quota_available"] = True
        r["idempotency_key"] = ""
        self.assertEqual(mod.evaluate(POLICY, BINDING, r)["decision"], "WAITING_EVIDENCE")

    def test_report_without_independent_evidence_blocked(self):
        r = make_req("W4_REPORT_QA")
        r["facts"]["assessment_39_accounted"] = False
        self.assertEqual(mod.evaluate(POLICY, BINDING, r)["decision"], "WAITING_EVIDENCE")

    def test_sandbox_requires_target_bound_account(self):
        r = self.check("W3_SANDBOX_TEST", target_id="test-target", observed_profile={"provider_account_id": "sandbox-42"})
        self.assertEqual(r["decision"], "AUTO_PASS_CANDIDATE")
        r = self.check("W3_SANDBOX_TEST", target_id="other-target", observed_profile={"provider_account_id": "sandbox-42"})
        self.assertEqual(r["decision"], "WAITING_PROVIDER_CONNECTION")

    def test_sandbox_wrong_account_and_scope_denied(self):
        r = self.check("W3_SANDBOX_TEST", target_id="test-target", observed_profile={"provider_account_id": "wrong"})
        self.assertEqual(r["decision"], "BLOCKED_IDENTITY_MISMATCH")
        req = make_req("W3_SANDBOX_TEST", target_id="test-target", observed_profile={"provider_account_id": "sandbox-42"})
        req["facts"]["owner_granted_target_scope"] = False
        self.assertEqual(mod.evaluate(POLICY, BINDING, req)["decision"], "WAITING_EVIDENCE")

    def test_social_requires_bound_platform_and_exact_account(self):
        a = self.check("W5_POST_CHANNEL", provider="x", observed_profile={"provider_account_id": "test-x-123"})
        self.assertEqual(a["decision"], "AUTO_PASS_CANDIDATE")
        self.assertEqual(self.check("W5_POST_CHANNEL", provider="linkedin", observed_profile={"provider_account_id": "test-x-123"})["decision"], "WAITING_PROVIDER_CONNECTION")
        self.assertEqual(self.check("W5_POST_CHANNEL", provider="x", observed_profile={"provider_account_id": "somebody-else"})["decision"], "BLOCKED_IDENTITY_MISMATCH")

    def test_no_unbounded_sensitive_operations(self):
        for effect in POLICY["denied_without_new_explicit_scope"]:
            with self.subTest(effect=effect):
                self.assertEqual(
                    self.check("W3_PUBLIC_TEST", requested_effects=[effect])["decision"], "BLOCKED_POLICY"
                )

    def test_sandbox_write_cannot_be_smuggled_into_public_retest(self):
        for action in ("W1_DISCOVER", "W3_PUBLIC_TEST", "W6_RETEST"):
            with self.subTest(action=action):
                r = self.check(action, requested_effects=["sandbox_write"])
                self.assertEqual(r["decision"], "BLOCKED_POLICY")

    def test_unknown_action_denied(self):
        self.assertEqual(mod.evaluate(POLICY, BINDING, {"action": "DELETE_PRODUCTION"})["decision"], "BLOCKED_POLICY")

    def test_empty_operator_binding_cannot_impersonate_account(self):
        req = make_req("W4_SEND_MAIL", account_ref="wrong")
        self.assertEqual(mod.evaluate(POLICY, BINDING, req)["decision"], "BLOCKED_IDENTITY_MISMATCH")
        b = copy.deepcopy(BINDING)
        b["allowed_emails"] = []
        self.assertEqual(mod.evaluate(POLICY, b, make_req("W4_SEND_MAIL"))["decision"], "BLOCKED_IDENTITY_MISMATCH")

    def test_some_stages_can_continue_when_posting_is_blocked(self):
        b = copy.deepcopy(BINDING)
        b["providers"]["channels"] = {}
        self.assertEqual(self.check("W5_POST_CHANNEL", b, provider="x", observed_profile={"provider_account_id":"test-x-123"})["decision"], "WAITING_PROVIDER_CONNECTION")
        self.assertEqual(self.check("W6_MONITOR", b)["decision"], "AUTO_PASS_CANDIDATE")


if __name__ == "__main__":
    unittest.main()
