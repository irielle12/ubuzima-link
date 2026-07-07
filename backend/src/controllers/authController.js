const crypto = require("crypto");
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { hashPassword } = require("../utils/hashPassword");
const { validatePasswordStrength } = require("../utils/passwordPolicy");

const ACCESS_TOKEN_TTL = "2h";
const REFRESH_TOKEN_TTL = "30d";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      facilityId: user.facility_id,
      mustChangePassword: user.must_change_password,
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

    // Successful login — clear any prior lockout/attempt state.
    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [user.id]
    );

    const { token, refreshToken } = await issueTokens(user);

    res.json({
      token,
      refreshToken,
      user: toPublicUser(user),
    });
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

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
};
