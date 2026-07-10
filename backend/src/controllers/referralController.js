const pool = require("../config/db");

// Resolves the acting user + facility into human-readable labels for
// audit-log event descriptions (e.g. "Referred by Jeanne Mukamana (NURSE001)
// from Kigarama Health Post"), so the hospital-side timeline shows who did
// what, not just what happened.
async function getActorLabel(userId, facilityId) {
  const [userResult, facilityResult] = await Promise.all([
    userId
      ? pool.query(
          `SELECT first_name, last_name, staff_id FROM users WHERE id = $1`,
          [userId]
        )
      : Promise.resolve({ rows: [] }),
    facilityId
      ? pool.query(`SELECT name FROM facilities WHERE id = $1`, [facilityId])
      : Promise.resolve({ rows: [] }),
  ]);

  const u = userResult.rows[0];
  const f = facilityResult.rows[0];

  return {
    who: u ? `${u.first_name} ${u.last_name} (${u.staff_id})` : null,
    where: f ? f.name : null,
  };
}

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

    const resolvedSourceId = req.user?.facilityId || sourceFacilityId || null;

    // Idempotency: if hospital already registered this referral from an offline QR
    // scan, don't create a duplicate — return the existing record.
    if (clientReferralNumber) {
      const existing = await pool.query(
        `SELECT id, source_facility_id FROM referrals WHERE referral_number = $1 LIMIT 1`,
        [clientReferralNumber]
      );
      if (existing.rows.length > 0) {
        // The hospital's offline-QR-accept flow doesn't know the source facility
        // at accept-time, so it leaves source_facility_id null. Backfill it now
        // that the true origin health post is syncing — otherwise this referral
        // stays permanently invisible to that health post's own queues, no
        // matter how far the hospital advances its status.
        if (!existing.rows[0].source_facility_id && resolvedSourceId) {
          await pool.query(
            `UPDATE referrals SET source_facility_id = $1 WHERE id = $2`,
            [resolvedSourceId, existing.rows[0].id]
          );
        }

        // Same idea for the patient: if the hospital scanned this referral's QR
        // before the health post's device synced, it couldn't find a real patient
        // record yet and linked to a placeholder ("QR-...") patient it created on
        // the spot. Now that the health post is syncing with the real patient ID,
        // repoint the referral — otherwise it stays attached to the placeholder
        // forever and never shows up on the real patient's profile.
        if (patientId && String(existing.rows[0].patient_id) !== String(patientId)) {
          await pool.query(
            `UPDATE referrals SET patient_id = $1 WHERE id = $2`,
            [patientId, existing.rows[0].id]
          );
        }

        const full = await pool.query(
          `SELECT r.*, p.first_name, p.last_name
           FROM referrals r
           LEFT JOIN patients p ON r.patient_id = p.id
           WHERE r.id = $1`,
          [existing.rows[0].id]
        );
        return res.status(200).json(full.rows[0]);
      }
    }

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

    const { who, where } = await getActorLabel(req.user?.id, resolvedSourceId);
    const createdDescription =
      who && where
        ? `Referred by ${who} from ${where}`
        : who
        ? `Referred by ${who}`
        : "Referral created by health worker";

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
        createdDescription,
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

const updateReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      chiefComplaint,
      medicalHistory,
      vitalBp,
      vitalHeartRate,
      vitalTemperature,
      vitalRespiratoryRate,
      diagnosis,
      actionTaken,
      urgency,
      destinationFacilityId,
    } = req.body;

    const existing = await pool.query(
      `SELECT workflow_status FROM referrals WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Referral not found" });
    }

    // Once a hospital has started acting on a referral (patient arrived, or
    // it's already closed), the clinical details become part of the record —
    // editing them after the fact would rewrite history the hospital already
    // relied on. Editing is only safe before that point.
    if (!["Draft", "Pending Hospital Review"].includes(existing.rows[0].workflow_status)) {
      return res.status(409).json({
        message: "This referral can no longer be edited — the hospital has already begun processing it.",
      });
    }

    const result = await pool.query(
      `UPDATE referrals
       SET chief_complaint = $1, medical_history = $2,
           vital_bp = $3, vital_heart_rate = $4, vital_temperature = $5, vital_respiratory_rate = $6,
           diagnosis = $7, action_taken = $8, urgency = $9, destination_facility_id = $10
       WHERE id = $11
       RETURNING *`,
      [
        chiefComplaint || null,
        medicalHistory || null,
        vitalBp || null,
        vitalHeartRate || null,
        vitalTemperature || null,
        vitalRespiratoryRate || null,
        diagnosis,
        actionTaken || null,
        urgency,
        destinationFacilityId,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update referral" });
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
      const { who, where } = await getActorLabel(req.user?.id, req.user?.facilityId);

      const description = isHospitalClaim
        ? who && where
          ? `Claimed by ${who} at ${where}`
          : "Claimed by receiving hospital"
        : who && where
        ? `Submitted by ${who} from ${where}`
        : "Referral submitted to hospital";

      await pool.query(
        `INSERT INTO referral_events (referral_id, event_type, event_description)
         VALUES ($1, $2, $3)`,
        [id, "Referral Submitted", description]
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

    const { who, where } = await getActorLabel(req.user?.id, req.user?.facilityId);
    const base = hasFeedback ? "Closed with feedback" : "Closed without feedback";
    const closeDescription = who && where ? `${base} by ${who} at ${where}` : base;

    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description)
       VALUES ($1, $2, $3)`,
      [id, "Referral Closed", closeDescription]
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
      LEFT JOIN patients p
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
    const { id: referralId } = req.params;
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        message: "phone and message are required",
      });
    }

    const atApiKey = process.env.AT_API_KEY;
    const atUsername = process.env.AT_USERNAME;
    const atSenderId = process.env.AT_SENDER_ID;

    if (atApiKey && atUsername) {
      const Africastalking = require("africastalking");
      const at = Africastalking({ apiKey: atApiKey, username: atUsername });
      const sms = at.SMS;

      // `from` must be a registered short code / alphanumeric sender ID, not
      // the account username — omit it entirely to use the account's default
      // (e.g. the shared sandbox shortcode) unless one has been registered.
      const result = await sms.send({
        to: [phone],
        message,
        ...(atSenderId ? { from: atSenderId } : {}),
      });

      // This confirms AT handed the message to the telco, not that the
      // patient's phone actually received it — log the message_id so the
      // delivery-report callback can update the real outcome once it arrives.
      const recipient = result?.SMSMessageData?.Recipients?.[0];
      if (recipient?.messageId) {
        await pool.query(
          `INSERT INTO sms_log (referral_id, phone, message, message_id, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (message_id) DO NOTHING`,
          [referralId || null, phone, message, recipient.messageId, recipient.status || "Sent"]
        );
      }

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

    const { who, where } = await getActorLabel(req.user?.id, req.user?.facilityId);
    const arrivedDescription =
      note ||
      (who && where
        ? `Marked arrived by ${who} at ${where}`
        : "Patient arrived at receiving hospital");

    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description)
       VALUES ($1, $2, $3)`,
      [id, "Patient Arrived", arrivedDescription]
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

const receiveOfflineReferral = async (req, res) => {
  try {
    const {
      referralNumber,
      patientName,
      patientPhone,
      patientGender,
      chiefComplaint,
      diagnosis,
      urgency,
      referringFacility,
      sourceFacilityId,
    } = req.body;

    const hospitalFacilityId = req.user?.facilityId;

    if (!referralNumber || !diagnosis) {
      return res.status(400).json({ message: "referralNumber and diagnosis are required" });
    }

    // Idempotent: if already registered (e.g. button pressed twice), return existing.
    const existingRef = await pool.query(
      `SELECT r.*, p.first_name, p.last_name, p.gender, p.phone,
              df.name AS destination_hospital
       FROM referrals r
       LEFT JOIN patients p ON r.patient_id = p.id
       LEFT JOIN facilities df ON r.destination_facility_id = df.id
       WHERE r.referral_number = $1
       LIMIT 1`,
      [referralNumber]
    );
    if (existingRef.rows.length > 0) {
      // Backfill source_facility_id if it wasn't known at accept-time but is now.
      if (!existingRef.rows[0].source_facility_id && sourceFacilityId) {
        const patched = await pool.query(
          `UPDATE referrals SET source_facility_id = $1 WHERE id = $2 RETURNING *`,
          [sourceFacilityId, existingRef.rows[0].id]
        );
        return res.json({ ...existingRef.rows[0], ...patched.rows[0] });
      }
      return res.json(existingRef.rows[0]);
    }

    // Find patient by phone; create a stub record if not found.
    let patientId = null;
    if (patientPhone) {
      const found = await pool.query(
        `SELECT id FROM patients WHERE phone = $1 LIMIT 1`,
        [patientPhone]
      );
      if (found.rows.length > 0) {
        patientId = found.rows[0].id;
      }
    }

    if (!patientId) {
      const nameParts = (patientName || "Unknown").trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "-";
      const newPatient = await pool.query(
        `INSERT INTO patients (patient_number, first_name, last_name, phone, gender)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ["QR-" + Date.now(), firstName, lastName, patientPhone || null, patientGender || null]
      );
      patientId = newPatient.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO referrals
       (referral_number, patient_id, source_facility_id, destination_facility_id,
        diagnosis, urgency, workflow_status, sync_status, chief_complaint)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending Hospital Review', 'Pending', $7)
       RETURNING *`,
      [referralNumber, patientId, sourceFacilityId || null, hospitalFacilityId || null, diagnosis, urgency || null, chiefComplaint || null]
    );

    const { who, where } = await getActorLabel(req.user?.id, hospitalFacilityId);
    const qrDescription =
      `Patient walked in with offline QR from ${referringFacility || "health post"}` +
      (who && where ? `, received by ${who} at ${where}` : "");

    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description)
       VALUES ($1, $2, $3)`,
      [result.rows[0].id, "QR Received", qrDescription]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to register offline referral" });
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
  receiveOfflineReferral,
  updateReferral,
};
