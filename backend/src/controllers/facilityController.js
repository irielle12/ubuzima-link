const pool = require("../config/db");

const getHospitals = async (req, res) => {
  try {

    const result = await pool.query(
      `
SELECT
    id,
    name,
    district,
    type
FROM facilities
WHERE type IN
(
    'HEALTH_CENTER',
    'DISTRICT_HOSPITAL'
)
ORDER BY name;
      `
    );

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to load facilities",
    });

  }
};

module.exports = {
  getHospitals,
};