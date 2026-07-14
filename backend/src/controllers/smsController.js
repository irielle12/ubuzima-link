const pool = require("../config/db");

// Africa's Talking invokes this whenever a message's real delivery status
// changes — the initial send response only confirms AT handed it to the
// telco, not that the patient's phone actually received it.
const deliveryReportCallback = async (req, res) => {
  const { id, status, failureReason } = req.body;

  if (!id) {
    return res.status(400).send("Missing message id");
  }

  try {
    await pool.query(
      `UPDATE sms_log
       SET status = $1, failure_reason = $2, updated_at = NOW()
       WHERE message_id = $3`,
      [status || null, failureReason || null, id]
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.sendStatus(500);
  }
};

module.exports = { deliveryReportCallback };
