-- ARE private candidate screening evidence and independently assigned quality score.
-- A GitHub README publishing an endpoint is NOT source-to-deployment attestation.
ALTER TABLE are_eval.benchmark_study_candidates
 ADD COLUMN IF NOT EXISTS repository_match_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE are_eval.benchmark_study_candidates
 ADD COLUMN IF NOT EXISTS creator_contact_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE are_eval.private_project_pool
 ADD COLUMN IF NOT EXISTS quality_score integer;
ALTER TABLE are_eval.private_project_pool
 ADD COLUMN IF NOT EXISTS quality_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE are_eval.private_project_pool
 ADD COLUMN IF NOT EXISTS quality_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE are_eval.private_project_pool
 ADD CONSTRAINT private_project_pool_quality_score_check CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100);
