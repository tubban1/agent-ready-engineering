-- Dedicated private ARE task-scoped credentials; no public portfolio or release table changes.
CREATE TABLE IF NOT EXISTS are_eval.private_assessment_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id text NOT NULL,
  repository_key text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 2000),
  assignee_id text NOT NULL CHECK (assignee_id ~ '^[a-z0-9_-]{3,40}$'),
  assessor_organization text NOT NULL CHECK (char_length(assessor_organization) BETWEEN 2 AND 150),
  token_sha256 char(64) NOT NULL UNIQUE CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_task_catalog_fk FOREIGN KEY (cohort_id, repository_key)
    REFERENCES are_eval.benchmark_study_candidates (cohort_id,repository_key),
  CONSTRAINT private_task_expiry CHECK (expires_at > created_at AND expires_at <= created_at + interval '15 days')
);
CREATE INDEX IF NOT EXISTS private_assessment_tasks_owner_index
 ON are_eval.private_assessment_tasks(created_at DESC);
CREATE TABLE IF NOT EXISTS are_eval.private_task_submissions (
  task_id uuid NOT NULL REFERENCES are_eval.private_assessment_tasks(id),
  run_id uuid NOT NULL UNIQUE REFERENCES are_eval.private_evaluation_runs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, run_id)
);
CREATE INDEX IF NOT EXISTS private_task_submissions_created_index
 ON are_eval.private_task_submissions(task_id,created_at DESC);
