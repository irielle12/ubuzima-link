const pool = require("../config/db");
const { hashPassword } = require("../utils/hashPassword");
const { validatePasswordStrength } = require("../utils/passwordPolicy");
const { OTP_REQUIRED_ROLES } = require("../utils/otpPolicy");

const ROLE_PREFIX = { nurse: "NURSE", clinician: "CLIN", admin: "ADMIN" };

async function generateStaffId(role) {
  const prefix = ROLE_PREFIX[role] || "STAFF";
  const result = await pool.query(
    `SELECT staff_id FROM users WHERE staff_id LIKE $1 ORDER BY staff_id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (result.rows.length === 0) return `${prefix}001`;
  const num = parseInt(result.rows[0].staff_id.replace(prefix, ""), 10);
  const next = isNaN(num) ? 1 : num + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

const getUsers = async (req, res) => {
  try {
    /* ?bin=true → inactive users; default → active only */
    const showBin = req.query.bin === "true";
    const params = [!showBin];
    let where = `WHERE u.active = $1`;

    if (req.query.facilityId) {
      params.push(req.query.facilityId);
      where += ` AND u.facility_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         u.id, u.staff_id, u.first_name, u.last_name, u.email,
         u.role, u.facility_id, u.active, u.created_at,
         f.name  AS facility_name,
         cb.first_name AS created_by_first_name,
         cb.last_name  AS created_by_last_name
       FROM users u
       LEFT JOIN facilities f  ON u.facility_id = f.id
       LEFT JOIN users cb      ON u.created_by  = cb.id
       ${where}
       ORDER BY u.first_name, u.last_name`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load users" });
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, facilityId } = req.body;

    if (!firstName || !lastName || !password || !role) {
      return res.status(400).json({
        message: "firstName, lastName, password, and role are required",
      });
    }

    // Admin/clinician logins can't complete without an email on file to send
    // their 2FA code to (see authController.js) — enforcing that here means
    // an account that can never sign in never gets created in the first
    // place, rather than discovering the dead end at login time with no
    // self-service way out.
    if (OTP_REQUIRED_ROLES.includes(role) && !email) {
      return res.status(400).json({
        message: `An email address is required for the ${role} role (used for two-factor sign-in).`,
      });
    }

    const policyError = validatePasswordStrength(password);
    if (policyError) {
      return res.status(400).json({ message: policyError });
    }

    const staffId = await generateStaffId(role);
    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users
       (staff_id, first_name, last_name, email, password_hash, role, facility_id, active, created_by, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,true)
       RETURNING id, staff_id, first_name, last_name, email, role, facility_id, active, created_at`,
      [staffId, firstName, lastName, email || null, passwordHash, role, facilityId || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email is already in use" });
    }
    res.status(500).json({ message: "Failed to create user" });
  }
};

const updateUser = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      firstName,
      lastName,
      email,
      role,
      facilityId,
    } = req.body;

    // email/role are both optional here (COALESCE below keeps whatever
    // isn't provided) — so the *effective* post-update value of each can
    // only be known by checking against the existing row, not the request
    // body alone. Needed to catch e.g. changing role to admin without also
    // setting an email, which would otherwise silently create an account
    // that can never complete its own 2FA login.
    if (role || email !== undefined) {
      const existing = await pool.query("SELECT role, email FROM users WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const effectiveRole = role || existing.rows[0].role;
      const effectiveEmail = email !== undefined ? email : existing.rows[0].email;

      if (OTP_REQUIRED_ROLES.includes(effectiveRole) && !effectiveEmail) {
        return res.status(400).json({
          message: `An email address is required for the ${effectiveRole} role (used for two-factor sign-in).`,
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        role = COALESCE($4, role),
        facility_id = COALESCE($5, facility_id)
      WHERE id = $6
      RETURNING id, staff_id, first_name, last_name, email, role, facility_id, active, created_at
      `,
      [firstName, lastName, email, role, facilityId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update user",
    });

  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const policyError = validatePasswordStrength(password);
    if (policyError) {
      return res.status(400).json({ message: policyError });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2
       RETURNING id, staff_id, first_name, last_name`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users SET active = false WHERE id = $1
       RETURNING id, staff_id, first_name, last_name, email, role, facility_id, active, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users SET active = true WHERE id = $1
       RETURNING id, staff_id, first_name, last_name, email, role, facility_id, active, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to restore user" });
  }
};

// Force-signs this user out of every device: bumps credentials_version
// (invalidating every access token already issued, the instant each one
// next hits verifyToken — including a device that's currently offline and
// only rejoins later) and clears the refresh token hash (so none of them
// can silently mint a new one either). Doesn't require the server to know
// which devices exist.
const revokeUserSessions = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET credentials_version = credentials_version + 1,
           refresh_token_hash = NULL,
           refresh_token_expires_at = NULL
       WHERE id = $1
       RETURNING id, staff_id, first_name, last_name, email, role, facility_id, active, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to revoke sessions" });
  }
};

const permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    /* Nullify self-referencing created_by pointers before deleting */
    await pool.query(`UPDATE users       SET created_by  = NULL WHERE created_by  = $1`, [id]);
    await pool.query(`UPDATE facilities  SET created_by  = NULL WHERE created_by  = $1`, [id]);

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to permanently delete user" });
  }
};

const getImpactStats = async (req, res) => {
  try {
    const [totalResult, turnaroundResult, facilitiesResult, timelineResult, leaderboardResult] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) AS total FROM referrals`),

        pool.query(`
          SELECT AVG(EXTRACT(EPOCH FROM (re.created_at - r.created_at))) AS avg_turnaround_seconds
          FROM referrals r
          JOIN LATERAL (
            SELECT created_at
            FROM referral_events
            WHERE referral_id = r.id
              AND event_type = 'Patient Arrived'
            ORDER BY created_at ASC
            LIMIT 1
          ) re ON true
        `),

        pool.query(`
          SELECT COUNT(DISTINCT source_facility_id) AS count
          FROM referrals
          WHERE source_facility_id IS NOT NULL
        `),

        pool.query(`
          SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
          FROM referrals
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY day
          ORDER BY day ASC
        `),

        pool.query(`
          SELECT f.name, COUNT(r.id) AS count
          FROM referrals r
          JOIN facilities f ON r.source_facility_id = f.id
          GROUP BY f.name
          ORDER BY count DESC
          LIMIT 8
        `),
      ]);

    res.json({
      totalReferrals: parseInt(totalResult.rows[0].total, 10),
      avgTurnaroundSeconds: turnaroundResult.rows[0].avg_turnaround_seconds,
      facilitiesConnected: parseInt(facilitiesResult.rows[0].count, 10),
      referralsOverTime: timelineResult.rows.map((row) => ({
        date: row.day,
        count: parseInt(row.count, 10),
      })),
      facilityLeaderboard: leaderboardResult.rows.map((row) => ({
        name: row.name,
        count: parseInt(row.count, 10),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load impact stats" });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deactivateUser,
  restoreUser,
  permanentDeleteUser,
  revokeUserSessions,
  getImpactStats,
};
