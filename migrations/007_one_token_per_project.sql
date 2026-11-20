-- ARE V3: Remove the old invitation/draw schema.
-- Apply only after verifying private_draw_invitations has 0 rows
-- and private_assessment_tasks has 0 rows with invite_id set.
-- Historical task records, assessment reports, review decisions, and receipts remain intact.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM are_eval.private_draw_invitations) OR
     EXISTS (SELECT 1 FROM are_eval.private_assessment_tasks WHERE invite_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot remove invite workflow: historical invitation records exist';
  END IF;
END $$;
ALTER TABLE are_eval.private_assessment_tasks DROP COLUMN IF EXISTS invite_id;
DROP TABLE IF EXISTS are_eval.private_draw_invitations;
