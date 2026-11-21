-- Generic task-scoped human consent request. No OAuth tokens or credentials stored.
CREATE TABLE IF NOT EXISTS are_eval.private_task_authorization_requests (
  task_id uuid PRIMARY KEY REFERENCES are_eval.private_assessment_tasks(id) ON DELETE CASCADE,
  decision text NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING','GRANTED','DECLINED')),
  reason text NOT NULL CHECK (length(reason) BETWEEN 12 AND 500),
  requested_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK ((decision='PENDING' AND decided_at IS NULL) OR (decision<>'PENDING' AND decided_at IS NOT NULL))
);
