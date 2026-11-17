#!/usr/bin/env python3
"""ARE standing-scope policy *adviser*. No OAuth, email, MCP calls or posting.

Use after trusted integrations have verified provider identities and gathered
facts; never interpret an arbitrary JSON request as proof of provider login.
The final production worker must independently enforce provider identity,
authorization scopes, quotas and transactional outbox constraints.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "data/are-standing-autonomy-policy.v1.json"
DEFAULT_BINDING = ROOT / ".are-private/identity-binding.v1.json"


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf8"))
    if not isinstance(value, dict):
        raise ValueError("object expected")
    return value


def evaluate(policy: dict[str, Any], binding: dict[str, Any],
             request: dict[str, Any]) -> dict[str, Any]:
    """Plan if a *trusted* worker could proceed without another human prompt.

    This function has no side effects and can never itself authorize OAuth or
    external writes. A provider-observed identity must still be verified by
    the actual provider connector immediately before execution.
    """
    action = request.get("action")
    actions = policy.get("actions") or {}
    base = {"action": action, "advisory_only": True, "may_execute": False}
    if action not in actions:
        return {**base, "decision": "BLOCKED_POLICY", "reasons": ["ACTION_NOT_ALLOWLISTED"]}
    rule = actions[action]
    if rule.get("auto") is not True:
        return {**base, "decision": "WAITING_HUMAN", "reasons": ["ACTION_NOT_PREAPPROVED"]}

    effects = request.get("requested_effects", [])
    if not isinstance(effects, list) or not all(isinstance(x, str) for x in effects):
        return {**base, "decision": "BLOCKED_POLICY", "reasons": ["BAD_EFFECTS"]}
    forbidden = sorted(set(effects) & set(policy.get("denied_without_new_explicit_scope", [])))
    if "sandbox_write" in effects and action != "W3_SANDBOX_TEST":
        forbidden.append("sandbox_write_outside_sandbox_route")
    if forbidden:
        return {**base, "decision": "BLOCKED_POLICY", "reasons": ["FORBIDDEN_EFFECT:" + x for x in forbidden]}

    account_needed = bool(rule.get("account_required"))
    if account_needed:
        if (request.get("account_ref") != policy.get("account_ref")
                or binding.get("account_ref") != policy.get("account_ref")
                or binding.get("account_role") not in policy.get("allowed_account_roles", [])):
            return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["UNEXPECTED_OPERATOR_ACCOUNT_GROUP"]}

        auth = rule.get("provider_scope")
        profile = request.get("observed_profile") or {}
        if not isinstance(profile, dict):
            return {**base, "decision": "WAITING_PROVIDER_CONNECTION", "reasons": ["NO_OBSERVED_PROFILE"]}
        connected = binding.get("providers", {})
        if auth == "gmail":
            # ChatGPT login, OpenAI login, and the active Gmail connector
            # are distinct identities. Use whichever operator-approved Gmail
            # address is actually observed by the provider; never invent From.
            actual = str(profile.get("email", "")).strip().casefold()
            allowed = {str(e).strip().casefold() for e in binding.get("allowed_emails", [])}
            if not allowed:
                return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["NO_ALLOWED_OPERATOR_IDENTITIES"]}
            if actual and actual not in allowed:
                return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["SENDER_NOT_ALLOWED_OPERATOR"]}
            account = (connected.get("gmail", {}).get("accounts", {}) or {}).get(actual, {})
            if not actual or not account.get("observed_connected"):
                return {**base, "decision": "WAITING_PROVIDER_CONNECTION", "reasons": ["ALLOWED_GMAIL_NOT_CONNECTED"]}
            expected_id = str(account.get("provider_account_id") or "")
            observed_id = str(profile.get("id") or "")
            if not expected_id or not observed_id or expected_id != observed_id:
                return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["GMAIL_PROVIDER_ID_MISMATCH"]}
        elif auth == "platform":
            provider = request.get("provider")
            connection = connected.get("channels", {}).get(provider, {})
            if not provider or not connection.get("connected"):
                return {**base, "decision": "WAITING_PROVIDER_CONNECTION", "reasons": ["CHANNEL_NOT_CONNECTED"]}
            if str(profile.get("provider_account_id") or "") != str(connection.get("provider_account_id") or ""):
                return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["CHANNEL_IDENTITY_MISMATCH"]}
            if not profile.get("provider_account_id"):
                return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["CHANNEL_IDENTITY_EMPTY"]}
        elif auth == "target_mcp":
            target = request.get("target_id")
            connection = connected.get("target_mcp", {}).get(target, {})
            if not target or not connection.get("connected") or not connection.get("owner_scope_recorded"):
                return {**base, "decision": "WAITING_PROVIDER_CONNECTION", "reasons": ["TARGET_SANDBOX_NOT_AUTHORIZED"]}
            if not profile.get("provider_account_id") or profile["provider_account_id"] != connection.get("provider_account_id"):
                return {**base, "decision": "BLOCKED_IDENTITY_MISMATCH", "reasons": ["TARGET_IDENTITY_MISMATCH"]}
        else:
            return {**base, "decision": "BLOCKED_POLICY", "reasons": ["UNKNOWN_PROVIDER_SCOPE"]}

        # These are prerequisites from a trusted provider adapter, not proof
        # merely from a user-typed email or policy document.
        if not request.get("provider_login_verified_by_adapter"):
            return {**base, "decision": "WAITING_PROVIDER_CONNECTION", "reasons": ["CONNECTOR_PROFILE_NOT_VERIFIED"]}
    facts = request.get("facts") or {}
    if not isinstance(facts, dict):
        return {**base, "decision": "BLOCKED_POLICY", "reasons": ["BAD_FACTS"]}
    required = rule.get("requirements", [])
    missing = [x for x in required if facts.get(x) is not True]
    if missing:
        return {**base, "decision": "WAITING_EVIDENCE", "reasons": ["REQUIRES:" + x for x in missing]}
    if action in ("W4_SEND_MAIL", "W4_REPLY_TECHNICAL", "W5_POST_CHANNEL"):
        if not request.get("idempotency_key"):
            return {**base, "decision": "WAITING_EVIDENCE", "reasons": ["OUTBOX_IDEMPOTENCY_KEY_MISSING"]}
    return {
        **base, "decision": "AUTO_PASS_CANDIDATE", "reasons": [],
        "policy_version": policy.get("version"),
        "stage_action": action,
        "requirements_checked": list(required),
        "provider_execution_required": True,
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("request", type=Path, help="sanitized request facts JSON")
    p.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    p.add_argument("--binding", type=Path, default=DEFAULT_BINDING)
    args = p.parse_args()
    policy = load_json(args.policy)
    binding = load_json(args.binding)
    request = load_json(args.request)
    result = evaluate(policy, binding, request)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["decision"] == "AUTO_PASS_CANDIDATE" else 2


if __name__ == "__main__":
    raise SystemExit(main())
