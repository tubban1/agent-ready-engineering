-- ARE Benchmark v2: one target type only, verified public HTTPS MCP Endpoint.
-- Intentionally no backward compatibility for GitHub-only/failed manifest registrations.
-- Preserve non-v2 history in a private archive (not exposed by API/leaderboard).
CREATE TABLE IF NOT EXISTS are_eval.benchmark_retired_v1_20261115 (
  target_id uuid PRIMARY KEY,
  retired_at timestamptz NOT NULL DEFAULT now(),
  archived_data jsonb NOT NULL
);

INSERT INTO are_eval.benchmark_retired_v1_20261115 (target_id, archived_data)
SELECT t.id, jsonb_build_object(
  'target', to_jsonb(t),
  'runs', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM are_eval.benchmark_runs r WHERE r.target_id=t.id),'[]'::jsonb),
  'claims', (SELECT to_jsonb(c) FROM are_eval.benchmark_claims c WHERE c.target_id=t.id),
  'events', COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM are_eval.benchmark_submission_events e WHERE e.target_id=t.id),'[]'::jsonb)
)
FROM are_eval.benchmark_targets t
WHERE t.source_kind <> 'mcp_url'
   OR NOT EXISTS(SELECT 1 FROM are_eval.benchmark_runs r
                 WHERE r.target_id=t.id AND r.status='preflight_scored'
                   AND r.source_provenance='live_mcp_tools_list' AND r.score IS NOT NULL)
ON CONFLICT (target_id) DO NOTHING;

-- Remove retired v1 registrations from operational tables, not from the archive.
DELETE FROM are_eval.benchmark_submission_events
WHERE target_id IN (SELECT target_id FROM are_eval.benchmark_retired_v1_20261115);
DELETE FROM are_eval.benchmark_runs
WHERE target_id IN (SELECT target_id FROM are_eval.benchmark_retired_v1_20261115);
DELETE FROM are_eval.benchmark_claims
WHERE target_id IN (SELECT target_id FROM are_eval.benchmark_retired_v1_20261115);
DELETE FROM are_eval.benchmark_targets
WHERE id IN (SELECT target_id FROM are_eval.benchmark_retired_v1_20261115);

ALTER TABLE are_eval.benchmark_targets
 DROP CONSTRAINT IF EXISTS benchmark_targets_source_kind_check;
ALTER TABLE are_eval.benchmark_targets
 DROP CONSTRAINT IF EXISTS benchmark_targets_owner_proof_status_check;
ALTER TABLE are_eval.benchmark_targets
 ADD CONSTRAINT benchmark_targets_owner_proof_status_check
 CHECK (owner_proof_status IN ('unclaimed','domain_verified'));
ALTER TABLE are_eval.benchmark_targets DROP COLUMN repo_key;
ALTER TABLE are_eval.benchmark_targets DROP COLUMN source_kind;

ALTER TABLE are_eval.benchmark_runs
 DROP CONSTRAINT IF EXISTS benchmark_runs_status_check;
ALTER TABLE are_eval.benchmark_runs
 ADD CONSTRAINT benchmark_runs_status_check
 CHECK (status='preflight_scored');
ALTER TABLE are_eval.benchmark_runs
 ALTER COLUMN score SET NOT NULL;
ALTER TABLE are_eval.benchmark_runs
 ADD CONSTRAINT benchmark_runs_live_transport_only
 CHECK (source_provenance='live_mcp_tools_list');

ALTER TABLE are_eval.benchmark_targets
 ADD CONSTRAINT benchmark_targets_endpoint_identity_only
 CHECK (
   submitted_url LIKE 'https://%'
   AND identity='url:' || lower(submitted_url)
   AND lower(submitted_url) <> 'https://github.com'
   AND lower(submitted_url) NOT LIKE 'https://github.com/%'
 );

-- No official project ID can exist without an actually observed live tool list.
