-- Bounded, auditable automatic sourcing. Read-only GitHub checks only.
CREATE TABLE IF NOT EXISTS are_eval.private_pool_refill_control (
 id integer PRIMARY KEY CHECK (id=1),
 next_at timestamptz NOT NULL DEFAULT now(),
 last_started_at timestamptz,
 last_finished_at timestamptz,
 last_result jsonb NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO are_eval.private_pool_refill_control(id) VALUES (1)
ON CONFLICT(id) DO NOTHING;
