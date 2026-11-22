-- Agent-reported provider auth actions, distinct from third-party authorization.
-- No passwords, tokens, callbacks or credentials ever stored.
CREATE TABLE IF NOT EXISTS are_eval.private_task_provider_auth_handoffs (
 task_id uuid PRIMARY KEY REFERENCES are_eval.private_assessment_tasks(id),
 auth_scheme text NOT NULL CHECK(auth_scheme IN ('OAUTH','API_KEY')),
 provider_url text,
 source_url text,
 host_action text NOT NULL CHECK(host_action IN ('BROWSER_OPENED','VERIFIED_LINK_SHOWN','HOST_UNSUPPORTED','PRECONFIGURED_CREDENTIAL')),
 host_action_ref text NOT NULL,
 note text NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 outcome text NOT NULL DEFAULT 'WAITING_FOR_USER' CHECK(outcome IN
 ('WAITING_FOR_USER','AUTHENTICATED','USER_DECLINED','PROVIDER_FAILED','HOST_UNSUPPORTED','CREDENTIAL_UNAVAILABLE')),
 outcome_ref text,
 outcome_note text,
 finished_at timestamptz
);
