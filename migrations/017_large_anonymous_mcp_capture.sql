-- ARE P0: fix false 70KB ceiling without discarding old private observations.
-- Apply atomically to production are-evaluations/main before deploying capture-v5.
-- Byte length matches the server's MAX_TRACE_CONTENT_BYTES=1_500_000.
-- This is a bounded expansion, not unlimited storage and not an auth bypass.
BEGIN;
ALTER TABLE are_eval.private_mcp_observations
 DROP CONSTRAINT private_mcp_observations_content_check;
ALTER TABLE are_eval.private_mcp_observations
 ADD CONSTRAINT private_mcp_observations_content_check
 CHECK (octet_length(content) BETWEEN 31 AND 1500000);
COMMIT;
