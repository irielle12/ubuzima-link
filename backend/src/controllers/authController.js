const crypto = require("crypto");
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { hashPassword } = require("../utils/hashPassword");
const { validatePasswordStrength } = require("../utils/passwordPolicy");
const { sendOtpEmail, sendPasswordResetEmail } = require("../utils/mailer");
const { OTP_REQUIRED_ROLES } = require("../utils/otpPolicy");

const ACCESS_TOKEN_TTL = "2h";
const REFRESH_TOKEN_TTL = "30d";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PRE_AUTH_TOKEN_TTL = "10m";
const OTP_CODE_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 30 * 1000;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generatePreAuthToken(user) {
  return jwt.sign(
    { id: user.id, type: "pre-auth" },
    process.env.JWT_SECRET,
    { expiresIn: PRE_AUTH_TOKEN_TTL }
  );
}

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(name.length - 1, 3))}@${domain}`;
}

// Generates a fresh 6-digit code, stores its hash (never the code itself)
// with an expiry, and emails it. Used both by login() and by the resend
// endpoint below.
async function issueAndSendOtp(user) {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  await pool.query(
    `UPDATE users SET otp_code_hash = $1, otp_code_expires_at = $2 WHERE id = $3`,
    [hashToken(code), new Date(Date.now() + OTP_CODE_TTL_MS), user.id]
  );

  await sendOtpEmail(user.email, code);
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      facilityId: user.facility_id,
      mustChangePassword: user.must_change_password,
      // Compared against the live DB value on every request (see
      // authMiddleware.js). Bumping credentials_version instantly invalidates
      // every access token issued before the bump, without needing a
      // server-side record of which devices are holding one.
      credentialsVersion: user.credentials_version || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    // `jti` guarantees a distinct token even if two refreshes for the same
    // user land in the same second (JWT signing is otherwise deterministic
    // given identical claims), so rotation always actually invalidates the
    // previous token.
    { id: user.id, type: "refresh", jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

async function issueTokens(user) {
  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await pool.query(
    `UPDATE users SET refresh_token_hash = $1, refresh_token_expires_at = $2 WHERE id = $3`,
    [hashToken(refreshToken), new Date(Date.now() + REFRESH_TOKEN_TTL_MS), user.id]
  );

  return { token, refreshToken };
}

function toPublicUser(user) {
  return {
    id: user.id,
    staffId: user.staff_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    facilityId: user.facility_id,
    mustChangePassword: user.must_change_password,
  };
}

const login = async (req, res) => {
  try {
    const { staffId, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE staff_id = $1",
      [staffId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    if (user.active === false) {
      return res.status(403).json({
        message: "This account has been deactivated.",
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      const attempts = user.failed_login_attempts + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await pool.query(
          `UPDATE users SET failed_login_attempts = 0, locked_until = $1 WHERE id = $2`,
          [new Date(Date.now() + LOCKOUT_MS), user.id]
        );

        return res.status(423).json({
          message: `Too many failed attempts. This account is locked for ${LOCKOUT_MS / 60000} minutes.`,
        });
      }

      await pool.query(
        `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
        [attempts, user.id]
      );

      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Successful password check — clear any prior lockout/attempt state.
    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [user.id]
    );

    if (!OTP_REQUIRED_ROLES.includes(user.role)) {
      const { token, refreshToken } = await issueTokens(user);
      return res.json({ token, refreshToken, user: toPublicUser(user) });
    }

    if (!user.email) {
      return res.status(400).json({
        message: "Two-factor sign-in requires an email on file for this account. Contact an administrator to add one.",
      });
    }

    const preAuthToken = generatePreAuthToken(user);
    await issueAndSendOtp(user);

    return res.json({ otpRequired: true, preAuthToken, maskedEmail: maskEmail(user.email) });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

function decodePreAuthToken(preAuthToken) {
  const decoded = jwt.verify(preAuthToken, process.env.JWT_SECRET);
  if (decoded.type !== "pre-auth") {
    throw new Error("Invalid token.");
  }
  return decoded;
}

const resendOtp = async (req, res) => {
  try {
    const { preAuthToken } = req.body;

    if (!preAuthToken) {
      return res.status(400).json({ message: "Missing sign-in attempt." });
    }

    let decoded;
    try {
      decoded = decodePreAuthToken(preAuthToken);
    } catch (err) {
      return res.status(401).json({ message: "Your sign-in attempt has expired. Please sign in again." });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
    const user = result.rows[0];

    if (!user || user.active === false || !user.email) {
      return res.status(401).json({ message: "Your sign-in attempt has expired. Please sign in again." });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      });
    }

    // A code's expiry doubles as "when it was issued" (expiresAt - TTL) —
    // enforcing a short cooldown off that same timestamp stops a resend
    // button from being used to spam the mailbox, without a extra column.
    if (user.otp_code_expires_at) {
      const issuedAt = new Date(user.otp_code_expires_at).getTime() - OTP_CODE_TTL_MS;
      const waitMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - issuedAt);
      if (waitMs > 0) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`,
        });
      }
    }

    await issueAndSendOtp(user);

    res.json({ otpRequired: true, preAuthToken, maskedEmail: maskEmail(user.email) });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { preAuthToken, code } = req.body;

    if (!preAuthToken || !code) {
      return res.status(400).json({ message: "Verification code is required." });
    }

    let decoded;
    try {
      decoded = decodePreAuthToken(preAuthToken);
    } catch (err) {
      return res.status(401).json({ message: "Your sign-in attempt has expired. Please sign in again." });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
    const user = result.rows[0];

    if (!user || user.active === false) {
      return res.status(401).json({ message: "Your sign-in attempt has expired. Please sign in again." });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      });
    }

    if (
      !user.otp_code_hash ||
      !user.otp_code_expires_at ||
      new Date(user.otp_code_expires_at) < new Date()
    ) {
      return res.status(400).json({ message: "This code has expired. Request a new one." });
    }

    const validCode = hashToken(String(code)) === user.otp_code_hash;

    if (!validCode) {
      // Shares the same lockout counter as password attempts (below) — a
      // wrong code is just as much a failed sign-in attempt as a wrong
      // password, and brute-forcing a 6-digit code is exactly what that
      // lockout exists to stop.
      const attempts = user.failed_login_attempts + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await pool.query(
          `UPDATE users SET failed_login_attempts = 0, locked_until = $1 WHERE id = $2`,
          [new Date(Date.now() + LOCKOUT_MS), user.id]
        );

        return res.status(423).json({
          message: `Too many failed attempts. This account is locked for ${LOCKOUT_MS / 60000} minutes.`,
        });
      }

      await pool.query(
        `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
        [attempts, user.id]
      );

      return res.status(401).json({ message: "Invalid verification code." });
    }

    // Single-use: clear the code so it can't be replayed even within its
    // expiry window.
    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, otp_code_hash = NULL, otp_code_expires_at = NULL WHERE id = $1`,
      [user.id]
    );

    const { token, refreshToken } = await issueTokens(user);

    res.json({ token, refreshToken, user: toPublicUser(user) });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid token." });
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
    const user = result.rows[0];

    if (!user || user.active === false) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const isCurrentToken =
      user.refresh_token_hash === hashToken(refreshToken) &&
      user.refresh_token_expires_at &&
      new Date(user.refresh_token_expires_at) > new Date();

    if (!isCurrentToken) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    // Rotate the refresh token on every use.
    const { token, refreshToken: newRefreshToken } = await issueTokens(user);

    res.json({ token, refreshToken: newRefreshToken });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      await pool.query(
        `UPDATE users SET refresh_token_hash = NULL, refresh_token_expires_at = NULL WHERE id = $1`,
        [req.user.id]
      );
    }

    res.json({ message: "Logged out." });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }

    const policyError = validatePasswordStrength(newPassword);
    if (policyError) {
      return res.status(400).json({ message: policyError });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const passwordHash = await hashPassword(newPassword);

    await pool.query(
      "UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2",
      [passwordHash, user.id]
    );

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Any role can use this — including nurses, who have no email requirement
// at all (deliberately, for offline field access). If a nurse has no email
// on file, forgotPassword below is a no-op behind an identical response;
// they (like an admin/doctor with no email) have to go through an
// administrator instead. Kept separate from the login-OTP code/columns so
// a pending sign-in code and a pending reset code never collide.
async function issueAndSendResetCode(user) {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  await pool.query(
    `UPDATE users SET reset_code_hash = $1, reset_code_expires_at = $2 WHERE id = $3`,
    [hashToken(code), new Date(Date.now() + RESET_CODE_TTL_MS), user.id]
  );

  await sendPasswordResetEmail(user.email, code);
}

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If that Staff ID has an email on file, a password reset code has been sent to it.";

const forgotPassword = async (req, res) => {
  try {
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required." });
    }

    const result = await pool.query("SELECT * FROM users WHERE staff_id = $1", [staffId]);
    const user = result.rows[0];

    // Always the same response no matter what — whether this Staff ID
    // exists, is active, or has an email on file is exactly the kind of
    // detail that shouldn't be distinguishable to whoever is asking.
    if (user && user.active !== false && user.email) {
      const alreadySentRecently =
        user.reset_code_expires_at &&
        Date.now() - (new Date(user.reset_code_expires_at).getTime() - RESET_CODE_TTL_MS) <
          RESET_RESEND_COOLDOWN_MS;

      if (!alreadySentRecently) {
        await issueAndSendResetCode(user);
      }
    }

    res.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const resetPasswordWithCode = async (req, res) => {
  try {
    const { staffId, code, newPassword } = req.body;

    if (!staffId || !code || !newPassword) {
      return res.status(400).json({ message: "Staff ID, code, and new password are required." });
    }

    const policyError = validatePasswordStrength(newPassword);
    if (policyError) {
      return res.status(400).json({ message: policyError });
    }

    const result = await pool.query("SELECT * FROM users WHERE staff_id = $1", [staffId]);
    const user = result.rows[0];

    // Same message whether the Staff ID doesn't exist, has no pending
    // code, or the code is just wrong/expired — same anti-enumeration
    // reasoning as forgotPassword above.
    const invalidCodeResponse = () =>
      res.status(400).json({ message: "Invalid or expired reset code." });

    if (
      !user ||
      user.active === false ||
      !user.reset_code_hash ||
      !user.reset_code_expires_at ||
      new Date(user.reset_code_expires_at) < new Date()
    ) {
      return invalidCodeResponse();
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      });
    }

    const validCode = hashToken(String(code)) === user.reset_code_hash;

    if (!validCode) {
      // Shares the same lockout counter as login attempts — brute-forcing
      // a 6-digit reset code is exactly what that lockout exists to stop.
      const attempts = user.failed_login_attempts + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await pool.query(
          `UPDATE users SET failed_login_attempts = 0, locked_until = $1 WHERE id = $2`,
          [new Date(Date.now() + LOCKOUT_MS), user.id]
        );

        return res.status(423).json({
          message: `Too many failed attempts. This account is locked for ${LOCKOUT_MS / 60000} minutes.`,
        });
      }

      await pool.query(
        `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
        [attempts, user.id]
      );

      return invalidCodeResponse();
    }

    const passwordHash = await hashPassword(newPassword);

    // A password reset is exactly the moment to also kill every other live
    // session — if the reset was needed because the account was
    // compromised, leaving old sessions/devices signed in would defeat
    // the point of resetting it.
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = false,
           failed_login_attempts = 0,
           locked_until = NULL,
           reset_code_hash = NULL,
           reset_code_expires_at = NULL,
           refresh_token_hash = NULL,
           refresh_token_expires_at = NULL,
           credentials_version = credentials_version + 1
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({ message: "Password reset successfully. You can now sign in with your new password." });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  login,
  verifyOtp,
  resendOtp,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPasswordWithCode,
};
