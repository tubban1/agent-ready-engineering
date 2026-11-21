-- Extend discovery beyond a single fixed GitHub result page.
ALTER TABLE are_eval.private_pool_refill_control
 ADD COLUMN IF NOT EXISTS discovery_page integer NOT NULL DEFAULT 1 CHECK (discovery_page BETWEEN 1 AND 10);
ALTER TABLE are_eval.private_pool_refill_control
 ADD COLUMN IF NOT EXISTS discovery_query_index integer NOT NULL DEFAULT 0 CHECK (discovery_query_index BETWEEN 0 AND 3);
