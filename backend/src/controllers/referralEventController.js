const pool = require("../config/db");

const getReferralEvents = async (
  req,
  res
) => {
  try {

    const { id } =
      req.params;

    const result =
      await pool.query(
        `
        SELECT *
        FROM referral_events
        WHERE referral_id = $1
        ORDER BY created_at ASC
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
        "Failed to load events",
    });

  }
};

const createReferralEvent =
  async (req, res) => {

    try {

      const { id } =
        req.params;

      const {
        eventType,
        description,
      } = req.body;

      const result =
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
          RETURNING *
          `,
          [
            id,
            eventType,
            description,
          ]
        );

      res.status(201).json(
        result.rows[0]
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Failed to create event",
      });

    }

  };

module.exports = {
  getReferralEvents,
  createReferralEvent,
};