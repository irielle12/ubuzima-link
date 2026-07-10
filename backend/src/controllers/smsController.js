const pool = require("../config/db");

async function retrySms({ referral_id, phone, message }) {
  const atApiKey = process.env.AT_API_KEY;
  const atUsername = process.env.AT_USERNAME;
  const atSenderId = process.env.AT_SENDER_ID;
  if (!atApiKey || !atUsername) return;

  const Africastalking = require("africastalking");
  const at = Africastalking({ apiKey: atApiKey, username: atUsername });

  const result = await at.SMS.send({
    to: [phone],
    message,
    ...(atSenderId ? { from: atSenderId } : {}),
  });

  const recipient = result?.SMSMessageData?.Recipients?.[0];
  if (recipient?.messageId) {
    await pool.query(
      `INSERT INTO sms_log (referral_id, phone, message, message_id, status, is_retry)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (message_id) DO NOTHING`,
      [referral_id, phone, message, recipient.messageId, recipient.status || "Sent"]
    );
  }
}

// Africa's Talking invokes this whenever a message's real delivery status
// changes — the initial send response only confirms AT handed it to the
// telco, not that the patient's phone actually received it.
const deliveryReportCallback = async (req, res) => {
  const { id, status, failureReason } = req.body;

  if (!id) {
    return res.status(400).send("Missing message id");
  }

  try {
    const existing = await pool.query(
      `SELECT referral_id, phone, message, is_retry FROM sms_log WHERE message_id = $1`,
      [id]
    );

    await pool.query(
      `UPDATE sms_log
       SET status = $1, failure_reason = $2, updated_at = NOW()
       WHERE message_id = $3`,
      [status || null, failureReason || null, id]
    );

    // AT retries the callback if it doesn't get a 200 — ack first, then
    // handle the (possible) retry send so a slow AT round-trip on our
    // retry attempt can't make AT think this callback itself failed.
    res.sendStatus(200);

    const row = existing.rows[0];
    const isFailure = status && status.toLowerCase() !== "success";

    // Only retry an original send once — never retry a retry.
    if (row && isFailure && !row.is_retry && row.phone && row.message) {
      retrySms(row).catch((err) => console.error("SMS retry failed:", err.message));
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.sendStatus(500);
  }
};

module.exports = { deliveryReportCallback };
