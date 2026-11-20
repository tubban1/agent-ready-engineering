-- ARE internal colleague evaluation intake. Private append-only, separate from all public ARE projections.
-- New tables only; does not change the existing public assessment, benchmark, or release tables.
CREATE TABLE IF NOT EXISTS are_eval.private_evaluation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_sha256 char(64) NOT NULL UNIQUE CHECK (submission_sha256 ~ '^[0-9a-f]{64}$'),
  cohort_id text NOT NULL,
  repository_key text NOT NULL,
  assessor_id text NOT NULL,
  assessor_organization text NOT NULL,
  source_revision char(40) NOT NULL CHECK (source_revision ~ '^[0-9a-f]{40}$'),
  observed_version text NOT NULL,
  endpoint text NOT NULL DEFAULT '',
  state text NOT NULL CHECK (state IN ('NEEDS_EVIDENCE','READY_FOR_OUTREACH')),
  report jsonb NOT NULL,
  agent_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_route jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_binding jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  decisive_count integer NOT NULL DEFAULT 0 CHECK (decisive_count BETWEEN 0 AND 32),
  verified_task_count integer NOT NULL DEFAULT 0 CHECK (verified_task_count BETWEEN 0 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_evaluation_catalog_fk FOREIGN KEY (cohort_id,repository_key)
    REFERENCES are_eval.benchmark_study_candidates(cohort_id,repository_key)
);
CREATE INDEX IF NOT EXISTS private_evaluation_runs_created_idx
 ON are_eval.private_evaluation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS private_evaluation_runs_repo_idx
 ON are_eval.private_evaluation_runs(repository_key,created_at DESC);
CREATE TABLE IF NOT EXISTS are_eval.private_outreach_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES are_eval.private_evaluation_runs(id),
  event_type text NOT NULL CHECK (event_type IN ('CONTACTED','REPLY_RECEIVED','NEEDS_RETEST','ARCHIVED')),
  details text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS private_outreach_events_run_idx
 ON are_eval.private_outreach_events(run_id,created_at DESC);
