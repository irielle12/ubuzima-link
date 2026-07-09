const pool = require("../config/db");

const MAX_PATIENT_AGE_YEARS = 120;

function isValidDateOfBirth(dateOfBirth) {
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  if (parsed > today) return false;

  const minDate = new Date(today);
  minDate.setFullYear(minDate.getFullYear() - MAX_PATIENT_AGE_YEARS);
  if (parsed < minDate) return false;

  return true;
}

const createPatient = async (req, res) => {
  try {
    const {
      fullName,
      gender,
      dateOfBirth,
      phoneNumber,
      nationalId,
      guardianNationalId,
    } = req.body;

    if (!isValidDateOfBirth(dateOfBirth)) {
      return res.status(400).json({
        message: `Date of birth must be a valid date, not in the future, and not more than ${MAX_PATIENT_AGE_YEARS} years ago.`,
      });
    }

    /* Duplicate check — two paths:
       - Adult: match on own national_id
       - Baby/minor: match on guardian_national_id + DOB + name */
    if (nationalId) {
      const existing = await pool.query(
        `SELECT * FROM patients WHERE national_id = $1 LIMIT 1`,
        [nationalId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          message: "A patient with this National ID is already registered.",
          existingPatient: existing.rows[0],
        });
      }
    } else if (guardianNationalId) {
      const nameParts = (fullName || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const existing = await pool.query(
        `SELECT * FROM patients
         WHERE guardian_national_id = $1
           AND date_of_birth = $2
           AND LOWER(first_name) = LOWER($3)
         LIMIT 1`,
        [guardianNationalId, dateOfBirth, firstName]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          message: "A patient with this guardian ID, date of birth, and name is already registered.",
          existingPatient: existing.rows[0],
        });
      }
    }

    const patientNumber = "PAT-" + Date.now();
    const nameParts = (fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(" ") || "";

    const result = await pool.query(
      `INSERT INTO patients
       (patient_number, national_id, guardian_national_id, first_name, last_name, gender, date_of_birth, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        patientNumber,
        nationalId || null,
        guardianNationalId || null,
        firstName,
        lastName,
        gender,
        dateOfBirth,
        phoneNumber,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create patient" });
  }
};

const getPatients = async (
  req,
  res
) => {
  try {

    const result =
      await pool.query(
        `
        SELECT *
        FROM patients
        ORDER BY id DESC
        `
      );

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Failed to load patients",
    });

  }
};

const searchPatients = async (
  req,
  res
) => {
  try {

    const q =
      req.query.q || "";

    const result =
      await pool.query(
        `
        SELECT *
        FROM patients
        WHERE
          LOWER(first_name)
          LIKE LOWER($1)
          OR national_id LIKE $1
          OR phone LIKE $1
        ORDER BY id DESC
        `,
        [`%${q}%`]
      );

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Search failed",
    });

  }
};

const getPatientById =
  async (req, res) => {
    try {

      const { id } =
        req.params;

      const result =
        await pool.query(
          `
          SELECT *
          FROM patients
          WHERE id = $1
          `,
          [id]
        );

      if (
        result.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            message:
              "Patient not found",
          });
      }

      res.json(
        result.rows[0]
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Failed to load patient",
      });

    }
  };

const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      gender,
      dateOfBirth,
      phoneNumber,
      nationalId,
      guardianNationalId,
    } = req.body;

    if (!isValidDateOfBirth(dateOfBirth)) {
      return res.status(400).json({
        message: `Date of birth must be a valid date, not in the future, and not more than ${MAX_PATIENT_AGE_YEARS} years ago.`,
      });
    }

    if (nationalId) {
      const existing = await pool.query(
        `SELECT id FROM patients WHERE national_id = $1 AND id != $2 LIMIT 1`,
        [nationalId, id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          message: "Another patient is already registered with this National ID.",
        });
      }
    }

    const nameParts = (fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(" ") || "";

    const result = await pool.query(
      `UPDATE patients
       SET first_name = $1, last_name = $2, gender = $3, date_of_birth = $4,
           phone = $5, national_id = $6, guardian_national_id = $7
       WHERE id = $8
       RETURNING *`,
      [
        firstName,
        lastName,
        gender,
        dateOfBirth,
        phoneNumber || null,
        nationalId || null,
        guardianNationalId || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update patient" });
  }
};

module.exports = {
  createPatient,
  getPatients,
  searchPatients,
  getPatientById,
  updatePatient,
};
const getPatientReferrals =
  async (req, res) => {
    try {

      const { id } =
        req.params;

      const result =
        await pool.query(
          `
          SELECT *
          FROM referrals
          WHERE patient_id = $1
          ORDER BY created_at DESC
          `,
          [id]
        );

      res.json(
        result.rows
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Failed to load referrals",
      });

    }
  };
  module.exports = {
  createPatient,
  getPatients,
  searchPatients,
  getPatientById,
  getPatientReferrals,
  updatePatient,
};