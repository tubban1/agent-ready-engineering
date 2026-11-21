-- Align V5.1 canonical submission stage with the production state constraint.
-- Keep historical READY_FOR_OUTREACH rows valid without changing or erasing them.
ALTER TABLE are_eval.private_evaluation_runs
 DROP CONSTRAINT IF EXISTS private_evaluation_runs_state_check;
ALTER TABLE are_eval.private_evaluation_runs
 ADD CONSTRAINT private_evaluation_runs_state_check
 CHECK (state IN ('NEEDS_EVIDENCE','READY_FOR_REVIEW','READY_FOR_OUTREACH'));
