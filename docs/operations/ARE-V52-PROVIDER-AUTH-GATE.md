> Historical V5.2 document; superseded by ARE-V53-TRUST-BOUNDARIES.md. An Agent-authored USER_DECLINED outcome is no longer accepted for new assessments.

# ARE V5.2 universal provider-auth handoff

- Discovery: use are_request_authorization with auth_scheme=OAUTH|API_KEY|UNKNOWN. The existing DB decision GRANTED means only challenge registration; it does not mean user consent or successful protected MCP invocation.
- OAuth: Agent uses host-native MCP OAuth connect/reconnect and proactively opens the verified provider login/consent page. The human decides in the provider browser, not ARE.
- API_KEY: Agent checks already configured secure host credentials; otherwise independently finds the official provider signup/login/API key page in provider-authored docs, opens it in the user's browser and offers secure host credential setup. No passwords/tokens are pasted into chat or ARE. Account creation, payments and destructive actions require human consent.
- Handoff START: call are_record_provider_handoff with auth_scheme, provider_url, source_url, host_action, host_action_ref and note after actual host navigation or presenting verified official link. A preconfigured credential uses host_action=PRECONFIGURED_CREDENTIAL and a source URL.
- Handoff FINISH: log actual AUTHENTICATED, USER_DECLINED, PROVIDER_FAILED, HOST_UNSUPPORTED or CREDENTIAL_UNAVAILABLE and actual outcome_ref/note. WAITING_FOR_USER must remain unfinished and cannot be formally submitted as a blocked-auth assessment.
- Preconditions: any remaining BLOCKED_AUTH tool/agent task (or protected project without successful tool calls) must have a task-scoped terminal provider handoff record before are_validate_assessment or are_submit_assessment can return valid=true. No shortcut of requesting API_KEY then doing only anonymous tests and submitting.
- The handoff is Agent-host-reported, never independent proof of provider login or user consent; reviewer validates original host/UI event. Authenticated tools require real native MCP traces. ARE cannot force another Agent's host browser to open.
- Each task retains one final immutable Neon report and atomic task token revocation. Prior reports are never rewritten. A reviewer marks NEEDS_RETEST to issue a new task where needed.
