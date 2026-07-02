const pool = require("../config/db");

const createReferral = async (req, res) => {
  try {
    const {
      patientId,
      diagnosis,
      urgency,
      destinationFacilityId,
      sourceFacilityId,
      referralNumber: clientReferralNumber,
      chiefComplaint,
      medicalHistory,
      vitalBp,
      vitalHeartRate,
      vitalTemperature,
      vitalRespiratoryRate,
      actionTaken,
    } = req.body;

    const existingDraft = await pool.query(
      `
      SELECT id
      FROM referrals
      WHERE patient_id = $1 AND workflow_status = 'Draft'
      LIMIT 1
      `,
      [patientId]
    );

    if (existingDraft.rows.length > 0) {
      return res.status(409).json({
        message: "This patient already has an unsubmitted draft referral.",
        existingDraftId: existingDraft.rows[0].id,
      });
    }

    const referralNumber = clientReferralNumber || "REF-" + Date.now();
    const resolvedSourceId = req.user?.facilityId || sourceFacilityId || null;

    const result = await pool.query(
      `INSERT INTO referrals
       (referral_number, patient_id, source_facility_id, destination_facility_id,
        diagnosis, urgency, workflow_status, sync_status,
        chief_complaint, medical_history,
        vital_bp, vital_heart_rate, vital_temperature, vital_respiratory_rate,
        action_taken)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        referralNumber,
        patientId,
        resolvedSourceId,
        destinationFacilityId,
        diagnosis,
        urgency,
        "Draft",
        "Pending",
        chiefComplaint || null,
        medicalHistory || null,
        vitalBp || null,
        vitalHeartRate || null,
        vitalTemperature || null,
        vitalRespiratoryRate || null,
        actionTaken || null,
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

    /* When a hospital clinician promotes a referral (via QR scan or manual
       lookup), set destination_facility_id to their facility so the referral
       appears in their queue. Health workers calling this endpoint are nurses
       and their facilityId is the source, not the destination. */
    const isHospitalClaim =
      workflowStatus === "Pending Hospital Review" &&
      req.user?.role === "clinician" &&
      req.user?.facilityId;

    const result = await pool.query(
      isHospitalClaim
        ? `UPDATE referrals
           SET workflow_status = $1,
               destination_facility_id = $3
           WHERE id = $2
           RETURNING *`
        : `UPDATE referrals
           SET workflow_status = $1
           WHERE id = $2
           RETURNING *`,
      isHospitalClaim
        ? [workflowStatus, id, req.user.facilityId]
        : [workflowStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    if (workflowStatus === "Pending Hospital Review") {
      await pool.query(
        `INSERT INTO referral_events (referral_id, event_type, event_description)
         VALUES ($1, $2, $3)`,
        [id, "Referral Submitted", "Referral submitted to hospital"]
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

const closeReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { treatmentStatus, hospitalNotes } = req.body;

    const hasFeedback = !!(treatmentStatus || hospitalNotes);

    const result = await pool.query(
      `
      UPDATE referrals
      SET
        workflow_status = 'Closed',
        treatment_status = $1,
        hospital_notes = $2,
        feedback_at = CASE WHEN $3 THEN NOW() ELSE feedback_at END
      WHERE id = $4
      RETURNING *
      `,
      [treatmentStatus || null, hospitalNotes || null, hasFeedback, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Referral not found",
      });
    }

    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description)
       VALUES ($1, $2, $3)`,
      [
        id,
        "Referral Closed",
        hasFeedback ? "Closed with feedback" : "Closed without feedback",
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to close referral",
    });
  }
};

const getPendingReferrals = async (req, res) => {
  try {
    const facilityId = req.user.facilityId;

    let query = `
      SELECT
        r.*,
        p.first_name,
        p.last_name,
        p.gender,
        sf.name AS source_facility_name
      FROM referrals r
      JOIN patients p
        ON r.patient_id = p.id
      LEFT JOIN facilities sf
        ON r.source_facility_id = sf.id
      WHERE r.workflow_status IN ('Pending Hospital Review', 'Arrived')`;
    const params = [];

    if (facilityId) {
      query += `
      AND r.destination_facility_id = $1`;
      params.push(facilityId);
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

const getReferralsBySource = async (req, res) => {
  try {
    const facilityId = req.user.facilityId;

    if (!facilityId) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT
        r.*,
        p.first_name,
        p.last_name,
        f.name AS destination_hospital
      FROM referrals r
      JOIN patients p
        ON r.patient_id = p.id
      LEFT JOIN facilities f
        ON r.destination_facility_id = f.id
      WHERE r.source_facility_id = $1
      ORDER BY r.created_at DESC
      `,
      [facilityId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load referrals for facility",
    });
  }
};

const getFacilityStats = async (req, res) => {
  try {
    const facilityId = req.user.facilityId;

    if (!facilityId) {
      return res.json({
        avgTurnaroundSeconds: null,
        closedCount: 0,
        closedWithFeedbackCount: 0,
        feedbackCompletionRate: null,
        referralsThisWeek: 0,
        referralsLastWeek: 0,
      });
    }

    const turnaroundResult = await pool.query(
      `
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
      WHERE r.source_facility_id = $1
      `,
      [facilityId]
    );

    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE workflow_status = 'Closed') AS closed_count,
        COUNT(*) FILTER (
          WHERE workflow_status = 'Closed' AND treatment_status IS NOT NULL
        ) AS closed_with_feedback_count,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('week', NOW())
        ) AS referrals_this_week,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
            AND created_at < date_trunc('week', NOW())
        ) AS referrals_last_week
      FROM referrals
      WHERE source_facility_id = $1
      `,
      [facilityId]
    );

    const avgTurnaroundSeconds =
      turnaroundResult.rows[0].avg_turnaround_seconds;

    const closedCount = parseInt(
      summaryResult.rows[0].closed_count,
      10
    );

    const closedWithFeedbackCount = parseInt(
      summaryResult.rows[0].closed_with_feedback_count,
      10
    );

    res.json({
      avgTurnaroundSeconds:
        avgTurnaroundSeconds !== null
          ? Number(avgTurnaroundSeconds)
          : null,
      closedCount,
      closedWithFeedbackCount,
      feedbackCompletionRate:
        closedCount > 0
          ? (closedWithFeedbackCount / closedCount) * 100
          : null,
      referralsThisWeek: parseInt(
        summaryResult.rows[0].referrals_this_week,
        10
      ),
      referralsLastWeek: parseInt(
        summaryResult.rows[0].referrals_last_week,
        10
      ),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load facility stats",
    });
  }
};

const getReferralByNumber = async (req, res) => {
  try {
    const { referralNumber } = req.params;

    const result = await pool.query(
      `
      SELECT
        r.*,
        p.first_name,
        p.last_name,
        p.gender,
        p.phone,
        p.date_of_birth,
        sf.name AS source_facility_name,
        df.name AS destination_hospital
      FROM referrals r
      LEFT JOIN patients p ON r.patient_id = p.id
      LEFT JOIN facilities sf ON r.source_facility_id = sf.id
      LEFT JOIN facilities df ON r.destination_facility_id = df.id
      WHERE r.referral_number = $1
      `,
      [referralNumber]
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
      message: "Failed to look up referral",
    });
  }
};

const notifyReferral = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        message: "phone and message are required",
      });
    }

    const atApiKey = process.env.AT_API_KEY;
    const atUsername = process.env.AT_USERNAME;

    if (atApiKey && atUsername) {
      const Africastalking = require("africastalking");
      const at = Africastalking({ apiKey: atApiKey, username: atUsername });
      const sms = at.SMS;

      await sms.send({
        to: [phone],
        message,
        from: atUsername,
      });

      return res.json({ sent: true, method: "sms" });
    }

    const smsUri =
      "sms:" +
      phone +
      "?body=" +
      encodeURIComponent(message);

    return res.json({ sent: false, fallback: smsUri });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to send notification",
    });
  }
};

const markArrived = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const result = await pool.query(
      `UPDATE referrals
       SET workflow_status = 'Arrived', arrived_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description)
       VALUES ($1, $2, $3)`,
      [id, "Patient Arrived", note || "Patient arrived at receiving hospital"]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to mark patient as arrived" });
  }
};

const updateInternalNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(
      `UPDATE referrals SET hospital_internal_notes = $1 WHERE id = $2 RETURNING *`,
      [notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save notes" });
  }
};

const getHospitalQueue = async (req, res) => {
  try {
    const facilityId = req.user.facilityId;

    if (!facilityId) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT
         r.*,
         p.first_name, p.last_name, p.gender, p.phone, p.date_of_birth,
         sf.name AS source_facility_name,
         df.name AS destination_hospital
       FROM referrals r
       JOIN patients p ON r.patient_id = p.id
       LEFT JOIN facilities sf ON r.source_facility_id = sf.id
       LEFT JOIN facilities df ON r.destination_facility_id = df.id
       WHERE r.destination_facility_id = $1
         AND r.workflow_status != 'Draft'
       ORDER BY
         CASE r.urgency
           WHEN 'Emergency' THEN 1
           WHEN 'Urgent' THEN 2
           ELSE 3
         END,
         r.created_at DESC`,
      [facilityId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load hospital queue" });
  }
};

module.exports = {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferralStatus,
  getPendingReferrals,
  closeReferral,
  getReferralsBySource,
  getFacilityStats,
  getReferralByNumber,
  notifyReferral,
  markArrived,
  updateInternalNotes,
  getHospitalQueue,
};
