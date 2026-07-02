const pool = require("../config/db");

const createReturnReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      followUpInstructions,
      medicationsPrescribed,
      nextAppointmentDate,
      followUpUrgency,
    } = req.body;

    if (!followUpInstructions) {
      return res.status(400).json({
        message: "follow_up_instructions is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO return_referrals
         (referral_id, follow_up_instructions, medications_prescribed,
          next_appointment_date, follow_up_urgency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        followUpInstructions,
        medicationsPrescribed || null,
        nextAppointmentDate || null,
        followUpUrgency || "Routine",
        req.user.id,
      ]
    );

    await pool.query(
      `UPDATE referrals SET workflow_status = 'Closed' WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description)
       VALUES ($1, $2, $3)`,
      [id, "Return Referral Issued", "Hospital issued return referral with follow-up instructions"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create return referral" });
  }
};

const getReturnReferral = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT rr.*, u.first_name AS created_by_first_name, u.last_name AS created_by_last_name
       FROM return_referrals rr
       LEFT JOIN users u ON rr.created_by = u.id
       WHERE rr.referral_id = $1
       ORDER BY rr.created_at DESC
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No return referral found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch return referral" });
  }
};

module.exports = { createReturnReferral, getReturnReferral };
