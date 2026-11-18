-- ARE owner-signed public evaluation authorization.
-- DRAFT ONLY. DO NOT APPLY TO PRODUCTION UNTIL OWNER EXPLICITLY APPROVES.
-- This table is not sufficient by itself: writer/reader identities must be
-- separated, and the ARE evaluator must verify an offline owner's Ed25519
-- signature on the exact public payload before returning published findings.
CREATE TABLE IF NOT EXISTS are_eval.public_release_events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_key TEXT NOT NULL CHECK (length(project_key) BETWEEN 3 AND 240),
    revision INTEGER NOT NULL CHECK (revision > 0),
    key_id TEXT NOT NULL CHECK (key_id ~ '^[a-z0-9._-]{2,64}$'),
    payload_text TEXT NOT NULL CHECK (octet_length(payload_text) BETWEEN 30 AND 128000),
    signature_b64 TEXT NOT NULL CHECK (length(signature_b64) = 88),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_key, revision)
);

CREATE INDEX IF NOT EXISTS public_release_events_by_project
    ON are_eval.public_release_events(project_key, revision DESC);

REVOKE ALL ON are_eval.public_release_events FROM PUBLIC;

COMMENT ON TABLE are_eval.public_release_events IS
'Append-only signed publication approvals; a database INSERT alone is never release authorization. Must verify exact signed bytes using owner-held Ed25519 key outside Neon.';

-- Deliberately no public INSERT/UPDATE grants and no SECURITY DEFINER bypass.
-- A publisher key must remain outside the Agent's desktop, GitHub repository,
-- Neon Function environment and connector accounts. Only the PUBLIC verifying
-- key can be deployed to areeval.
-- Rotate current DB-owner credentials away from automated collectors; create
-- bounded are_research_writer and are_portfolio_reader identities manually and
-- grant only necessary rights after independent owner review.
-- Existing are_evaluations_owner is a database OWNER with DDL powers. No GRANT,
-- trigger or RLS rule inside its own database can prevent that identity from
-- changing privileges or deploying a different API. This is why identity
-- separation + external owner signature + independent deploy review are needed.
