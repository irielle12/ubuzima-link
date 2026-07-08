-- Per-facility capacity status (already live in production, but was never
-- captured in schema.sql/a migration — this documents it and makes fresh
-- setups match. Safe to re-run.

ALTER TABLE facilities ADD COLUMN IF NOT EXISTS capacity_status JSONB NOT NULL
  DEFAULT '{"Emergency": "available", "Urgent": "available", "Routine": "available"}';
