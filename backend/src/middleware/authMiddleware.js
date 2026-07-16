const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  // Real access tokens never carry a `type` claim — only special-purpose,
  // single-endpoint tokens do (refresh tokens, and the OTP pre-auth token
  // issued mid-login). Both are signed with the same JWT_SECRET and would
  // otherwise pass verification here too, letting a refresh token — which
  // has no `role` claim, but that's only enforced by requireAdmin, not by
  // this function — be replayed as a working access token against any
  // non-admin-gated route.
  if (decoded.type) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  // The access token itself stays valid for up to its full TTL regardless of
  // what happens to the account meanwhile, so a deactivated user's existing
  // token would otherwise keep working until it naturally expires. Checking
  // `active` here makes deactivation (e.g. offboarding, a compromised
  // account) take effect immediately instead of up to ACCESS_TOKEN_TTL later.
  try {
    const result = await pool.query(
      "SELECT active, credentials_version FROM users WHERE id = $1",
      [decoded.id]
    );
    if (result.rows.length === 0 || result.rows[0].active === false) {
      return res.status(401).json({
        message: "This account is no longer active.",
      });
    }

    // An admin's "sign out all devices" action bumps credentials_version —
    // any token issued before the bump (on any device, including one that
    // was offline at the time) fails here on its very next request. Tokens
    // issued before this column existed carry no claim at all, so treat a
    // missing claim as version 0 rather than mass-logging-out every existing
    // session the moment this deploys.
    const tokenVersion = decoded.credentialsVersion || 0;
    const currentVersion = result.rows[0].credentials_version || 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({
        message: "This session has been signed out. Please sign in again.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }

  req.user = decoded;
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
};
