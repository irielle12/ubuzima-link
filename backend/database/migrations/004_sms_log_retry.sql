-- Supports one automatic retry when a delivery report comes back as
-- anything other than Success: message text is needed to resend, and
-- is_retry prevents retrying a retry (bounds it to a single extra attempt).

ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS is_retry BOOLEAN NOT NULL DEFAULT FALSE;
