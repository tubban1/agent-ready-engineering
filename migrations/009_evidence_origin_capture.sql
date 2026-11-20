-- ARE V5 origin capture is private, task-scoped, bounded and append-only.
-- No user OAuth credentials are captured or stored. No public evaluation is created.
CREATE TABLE IF NOT EXISTS are_eval.private_mcp_capture_usage (
 task_id uuid PRIMARY KEY REFERENCES are_eval.private_assessment_tasks(id) ON DELETE CASCADE,
 used_count integer NOT NULL DEFAULT 0,
 window_used integer NOT NULL DEFAULT 0,
 window_started_at timestamptz NOT NULL DEFAULT now(),
 CHECK(used_count>=0 AND window_used>=0)
);
CREATE TABLE IF NOT EXISTS are_eval.private_mcp_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES are_eval.private_assessment_tasks(id) ON DELETE CASCADE,
 observed_at timestamptz NOT NULL DEFAULT now(),
 endpoint text NOT NULL,
 method text NOT NULL CHECK(method IN ('tools/list','tools/call')),
 tool_name text,
 content text NOT NULL,
 sha256 char(64) NOT NULL,
 CHECK (length(content)>30 AND length(content)<=72000)
);
CREATE INDEX IF NOT EXISTS private_mcp_observations_task_id_idx
 ON are_eval.private_mcp_observations(task_id,observed_at DESC);
REVOKE ALL ON are_eval.private_mcp_capture_usage,are_eval.private_mcp_observations FROM PUBLIC;
