-- ARE V2: one URL, five independent phases. Retire V1 endpoints (data retained).
CREATE TABLE IF NOT EXISTS are_eval.private_project_pool (
 cohort_id text NOT NULL,
 repository_key text NOT NULL,
 decision text NOT NULL CHECK (decision IN ('ELIGIBLE','HOLD','EXCLUDED')),
 reason text NOT NULL DEFAULT '',
 tool_count integer NOT NULL DEFAULT 0 CHECK (tool_count BETWEEN 0 AND 3000),
 auth_mode text NOT NULL DEFAULT 'UNKNOWN' CHECK (auth_mode IN ('NONE','OAUTH','API_KEY','UNKNOWN')),
 risk_level text NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW','MEDIUM','HIGH')),
 runtime_endpoint text NOT NULL DEFAULT '',
 priority integer NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 100),
 claimed_task_id uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(cohort_id,repository_key),
 FOREIGN KEY (cohort_id,repository_key) REFERENCES are_eval.benchmark_study_candidates(cohort_id,repository_key)
);
CREATE TABLE IF NOT EXISTS are_eval.private_draw_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 invite_sha256 char(64) NOT NULL UNIQUE CHECK (invite_sha256 ~ '^[0-9a-f]{64}$'),
 tester_id text NOT NULL CHECK (tester_id ~ '^[a-z0-9_-]{3,40}$'),
 tester_organization text NOT NULL DEFAULT 'ARE Research',
 label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
 max_draws integer NOT NULL DEFAULT 1 CHECK (max_draws BETWEEN 1 AND 3),
 used_draws integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (used_draws BETWEEN 0 AND max_draws),
 CHECK (expires_at > created_at AND expires_at <= created_at + interval '15 days')
);
ALTER TABLE are_eval.private_assessment_tasks
 ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES are_eval.private_draw_invitations(id);
ALTER TABLE are_eval.private_assessment_tasks
 ADD COLUMN IF NOT EXISTS plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS are_eval.private_task_progress (
 task_id uuid PRIMARY KEY REFERENCES are_eval.private_assessment_tasks(id),
 coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
 blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
 phase text NOT NULL DEFAULT 'DISCOVERY',
 total_tools integer NOT NULL DEFAULT 0,
 minutes_used integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS are_eval.private_review_verdicts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 run_id uuid NOT NULL REFERENCES are_eval.private_evaluation_runs(id),
 decision text NOT NULL CHECK (decision IN ('NEEDS_RETEST','VERIFIED','REJECTED')),
 explanation text NOT NULL CHECK (char_length(explanation) BETWEEN 5 AND 2000),
 owner_actor text NOT NULL DEFAULT 'owner',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS private_review_verdicts_run_idx ON are_eval.private_review_verdicts(run_id,created_at DESC);
CREATE TABLE IF NOT EXISTS are_eval.private_publication_drafts (
 run_id uuid PRIMARY KEY REFERENCES are_eval.private_evaluation_runs(id),
 status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED_FOR_MANUAL_RELEASE')),
 summary text NOT NULL DEFAULT '',
 owner_approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
