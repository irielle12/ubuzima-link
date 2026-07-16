-- Self-service "forgot password" via emailed code, for any role (nurse
-- included, if they have an email on file — see authController.js
-- forgotPassword/resetPasswordWithCode). Kept separate from otp_code_hash/
-- otp_code_expires_at (used for login 2FA) so a pending login code and a
-- pending password-reset code can never collide or clobber each other.
-- Safe to run against the existing deployed database — additive/guarded.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMP;
