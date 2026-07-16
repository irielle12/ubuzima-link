-- Two-factor auth (TOTP/authenticator app) for admin and clinician logins.
-- Nurses are intentionally excluded (see authController.js OTP_REQUIRED_ROLES)
-- so the offline-critical field workflow never gains a hard OTP dependency.
-- Safe to run against the existing deployed database — additive and
-- guarded, re-running is a no-op.

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
