-- ARE Benchmark P0: public evidence-scoped submissions, immutable runs, owner-control proof.
-- No maturity levels inferred from tool manifest scores.
CREATE TABLE IF NOT EXISTS are_eval.benchmark_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity text NOT NULL UNIQUE,
 source_kind text NOT NULL CHECK (source_kind IN ('github','mcp_url')),
 submitted_url text NOT NULL,
 repo_key text,
 display_name text NOT NULL,
 is_public boolean NOT NULL DEFAULT false,
 owner_proof_status text NOT NULL DEFAULT 'unclaimed'
   CHECK(owner_proof_status IN ('unclaimed','challenge_issued','repository_verified','domain_verified')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS are_benchmark_targets_created_idx ON are_eval.benchmark_targets(created_at DESC);

CREATE TABLE IF NOT EXISTS are_eval.benchmark_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 target_id uuid NOT NULL REFERENCES are_eval.benchmark_targets(id),
 evaluator_version text NOT NULL,
 status text NOT NULL CHECK(status IN ('preflight_scored','needs_evidence','probe_unavailable')),
 score integer CHECK(score BETWEEN 0 AND 100),
 score_components jsonb NOT NULL DEFAULT '{}'::jsonb,
 observed_tools integer,
 manifest_bytes integer,
 findings jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
 maturity_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
 source_version text,
 source_provenance text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS are_benchmark_runs_target_idx ON are_eval.benchmark_runs(target_id,created_at DESC);

CREATE TABLE IF NOT EXISTS are_eval.benchmark_claims (
 target_id uuid PRIMARY KEY REFERENCES are_eval.benchmark_targets(id),
 challenge_hash text NOT NULL,
 challenge_expires_at timestamptz NOT NULL,
 owner_token_hash text,
 verified_at timestamptz,
 proof_kind text,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS are_eval.benchmark_submission_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 target_id uuid NOT NULL REFERENCES are_eval.benchmark_targets(id),
 run_id uuid REFERENCES are_eval.benchmark_runs(id),
 event_type text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS are_benchmark_events_target_idx ON are_eval.benchmark_submission_events(target_id,created_at DESC);

-- A bounded global quota for unauthenticated network preflight. Fail closed.
CREATE TABLE IF NOT EXISTS are_eval.benchmark_request_budget (
 bucket text NOT NULL,
 window_at timestamptz NOT NULL,
 used integer NOT NULL DEFAULT 0,
 PRIMARY KEY(bucket,window_at)
);
