const pool = require("../config/db");

const createPatient = async (req, res) => {
  try {
    const {
      fullName,
      gender,
      dateOfBirth,
      phoneNumber,
      nationalId,
    } = req.body;

    const patientNumber =
      "PAT-" + Date.now();

    const result = await pool.query(
      `
      INSERT INTO patients
      (
        patient_number,
        national_id,
        first_name,
        last_name,
        gender,
        date_of_birth,
        phone
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        patientNumber,
        nationalId,
        fullName,
        "",
        gender,
        dateOfBirth,
        phoneNumber,
      ]
    );

    res.status(201).json(
      result.rows[0]
    );

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Failed to create patient",
    });
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

module.exports = {
  createPatient,
  getPatients,
  searchPatients,
  getPatientById,
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
};