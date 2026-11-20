-- ARE tester self-service sessions: distinct from one-use, per-project Task Token.
-- Only opaque session token SHA-256 is stored; HttpOnly Secure cookie owns identity for pilot.
CREATE TABLE IF NOT EXISTS are_eval.private_tester_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_sha256 char(64) NOT NULL UNIQUE,
 tester_id text NOT NULL UNIQUE,
 display_name text NOT NULL,
 organization text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 CHECK (length(display_name) BETWEEN 2 AND 80),
 CHECK (length(organization) BETWEEN 2 AND 150)
);
CREATE INDEX IF NOT EXISTS private_tester_sessions_expires_at_idx
 ON are_eval.private_tester_sessions(expires_at);
CREATE INDEX IF NOT EXISTS private_assessment_tasks_tester_session_idx
 ON are_eval.private_assessment_tasks ((plan_snapshot->>'tester_session_id'),created_at DESC)
 WHERE plan_snapshot ? 'tester_session_id';
REVOKE ALL ON are_eval.private_tester_sessions FROM PUBLIC;
