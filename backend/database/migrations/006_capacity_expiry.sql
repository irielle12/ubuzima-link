-- Tracks when each urgency level's capacity status was last changed, so a
-- "Limited"/"Not Accepting" setting that's forgotten and left stale doesn't
-- silently block referrals forever — it auto-expires back to "available"
-- after a grace period (enforced in application code, not here).

ALTER TABLE facilities ADD COLUMN IF NOT EXISTS capacity_updated_at JSONB NOT NULL DEFAULT '{}'::jsonb;
