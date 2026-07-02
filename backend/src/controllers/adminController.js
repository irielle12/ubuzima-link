const pool = require("../config/db");
const { hashPassword } = require("../utils/hashPassword");

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

    const staffId = await generateStaffId(role);
    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users
       (staff_id, first_name, last_name, email, password_hash, role, facility_id, active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
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

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
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

module.exports = {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deactivateUser,
  restoreUser,
  permanentDeleteUser,
};
