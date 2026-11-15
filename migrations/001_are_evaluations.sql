-- ARE Evaluation Portfolio v1. Applied to dedicated Neon project are-evaluations.
-- Original deployment: 2026-11-15. Public dashboard is read-only.
CREATE SCHEMA IF NOT EXISTS are_eval;

CREATE TABLE IF NOT EXISTS are_eval.assessments (
  id bigserial PRIMARY KEY,
  project_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  source_kind text NOT NULL CHECK(source_kind IN ('local_repo','github_public')),
  repo_url text,
  source_ref text,
  category text NOT NULL DEFAULT 'Uncategorized',
  status text NOT NULL DEFAULT 'preliminary'
    CHECK(status IN ('preliminary','source_review','verified','error')),
  assessment_level text CHECK(assessment_level IN ('L0','L1','L2','L3','L4')),
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  batch_slot timestamptz
);
CREATE INDEX IF NOT EXISTS are_assessments_batch_idx ON are_eval.assessments(batch_slot);
CREATE INDEX IF NOT EXISTS are_assessments_checked_idx ON are_eval.assessments(checked_at DESC);
CREATE INDEX IF NOT EXISTS are_assessments_category_idx ON are_eval.assessments(category);

CREATE TABLE IF NOT EXISTS are_eval.batches (
  slot_at timestamptz PRIMARY KEY,
  target_count integer NOT NULL DEFAULT 30 CHECK(target_count BETWEEN 1 AND 30),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK(status IN ('scheduled','running','completed','partial','failed')),
  discovered_count integer NOT NULL DEFAULT 0,
  analyzed_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS are_eval.audit_events (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  project_key text,
  slot_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
-- One-day schedule. Europe/Zurich is UTC+1 on 2026-11-15.
INSERT INTO are_eval.batches(slot_at)
SELECT (timestamp '2026-11-15 02:45:00' + i * interval '1 hour') AT TIME ZONE 'Europe/Zurich'
FROM generate_series(0,7) i
ON CONFLICT DO NOTHING;

-- The public API has no INSERT/UPDATE/DELETE; only the authorized analysis
-- automation and Neon connector may write. Do not publish a credential.
