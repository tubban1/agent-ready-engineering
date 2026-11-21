-- Explicit OAuth opt-in must never implicitly authorize API key disclosure.
ALTER TABLE are_eval.private_task_authorization_requests
 ADD COLUMN IF NOT EXISTS auth_scheme text NOT NULL DEFAULT 'UNKNOWN'
 CHECK (auth_scheme IN ('OAUTH','API_KEY','UNKNOWN'));
