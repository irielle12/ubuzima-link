const pool = require("../config/db");

const createReferral = async (req, res) => {
  try {
    const {
      patientId,
      diagnosis,
      urgency,
      destinationFacilityId,
    } = req.body;

    const referralNumber = "REF-" + Date.now();

    const result = await pool.query(
      `
      INSERT INTO referrals
      (
        referral_number,
        patient_id,
        destination_facility_id,
        diagnosis,
        urgency,
        workflow_status,
        sync_status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        referralNumber,
        patientId,
        destinationFacilityId,
        diagnosis,
        urgency,
        "Draft",
        "Pending",
      ]
    );

    await pool.query(
      `
      INSERT INTO referral_events
      (
        referral_id,
        event_type,
        event_description
      )
      VALUES
      ($1,$2,$3)
      `,
      [
        result.rows[0].id,
        "Referral Created",
        "Referral created by health worker",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create referral",
    });
  }
};

const getReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        r.*,
        f.name as hospital_name,
        p.first_name,
        p.last_name
      FROM referrals r
      LEFT JOIN facilities f
        ON r.destination_facility_id = f.id
      LEFT JOIN patients p
        ON r.patient_id = p.id
      ORDER BY r.id DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load referrals",
    });
  }
};

const getReferralById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        r.*,
        p.first_name,
        p.last_name,
        p.gender,
        p.phone,
        f.name AS destination_hospital
      FROM referrals r
      LEFT JOIN patients p
        ON r.patient_id = p.id
      LEFT JOIN facilities f
        ON r.destination_facility_id = f.id
      WHERE r.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Referral not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load referral",
    });
  }
};

const updateReferralStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { workflowStatus } = req.body;

    const result = await pool.query(
      `
      UPDATE referrals
      SET workflow_status = $1
      WHERE id = $2
      RETURNING *
      `,
      [workflowStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Referral not found",
      });
    }

    if (workflowStatus === "Pending Hospital Review") {
      await pool.query(
        `
        INSERT INTO referral_events
        (
          referral_id,
          event_type,
          event_description
        )
        VALUES
        ($1,$2,$3)
        `,
        [
          id,
          "Referral Submitted",
          "Referral submitted to hospital",
        ]
      );
    }

    if (workflowStatus === "Hospital Accepted") {
      await pool.query(
        `
        INSERT INTO referral_events
        (
          referral_id,
          event_type,
          event_description
        )
        VALUES
        ($1,$2,$3)
        `,
        [
          id,
          "Hospital Accepted",
          "Referral accepted by receiving hospital",
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update referral",
    });
  }
};

const getPendingReferrals = async (req, res) => {
  try {
    let query = `
      SELECT
        r.*,
        p.first_name,
        p.last_name,
        p.gender
      FROM referrals r
      JOIN patients p
        ON r.patient_id = p.id
      WHERE r.workflow_status = 'Pending Hospital Review'`;
    const params = [];

    if (req.query.facilityId) {
      query += `
      AND r.destination_facility_id = $1`;
      params.push(req.query.facilityId);
    }

    query += `
      ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load pending referrals",
    });
  }
};

module.exports = {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferralStatus,
  getPendingReferrals,
};
