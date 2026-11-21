-- One final report per task for new submissions. Do not alter historical submissions.
CREATE TABLE IF NOT EXISTS are_eval.private_task_finalizations (
 task_id uuid PRIMARY KEY REFERENCES are_eval.private_assessment_tasks(id),
 submission_sha256 char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
