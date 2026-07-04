const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { hashPassword } = require("../utils/hashPassword");

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

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        facilityId: user.facility_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        staffId: user.staff_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        facilityId: user.facility_id,
      },
    });
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters.",
      });
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
      "UPDATE users SET password_hash = $1 WHERE id = $2",
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
  changePassword,
};