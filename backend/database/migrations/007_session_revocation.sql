-- Lets an admin force-sign-out a user from every device (including one that's
-- currently offline and will only re-check on its next reconnect), without
-- needing a server-side record of which devices exist. Safe to run against
-- the existing deployed database — additive and guarded, re-running is a no-op.

ALTER TABLE users ADD COLUMN IF NOT EXISTS credentials_version INTEGER NOT NULL DEFAULT 0;
