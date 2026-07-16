-- Replaces authenticator-app (TOTP) 2FA with emailed one-time codes, per
-- product decision — admin/clinician logins get a 6-digit code emailed to
-- the address already on file instead of scanning a QR code into an app.
-- 008_totp.sql's columns were added this same session and never reached
-- real use (blocked by the missing-column bug), so it's safe to drop them
-- outright rather than leave unused dead columns behind.
-- Safe to run against the existing deployed database — additive/guarded
-- where it adds, and the drops are of columns nothing reads anymore.

ALTER TABLE users DROP COLUMN IF EXISTS totp_secret;
ALTER TABLE users DROP COLUMN IF EXISTS totp_enabled;

ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code_expires_at TIMESTAMP;
