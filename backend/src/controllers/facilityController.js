const pool = require("../config/db");

const getHospitals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, district, type
       FROM facilities
       WHERE type = 'DISTRICT_HOSPITAL'
         AND active = true
       ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load facilities" });
  }
};

const getFacilityById = async (req, res) => {
  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT id, name, type, district, sector, phone, email
      FROM facilities
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to load facility",
    });

  }
};

const getAllFacilitiesAdmin = async (req, res) => {
  try {
    /* ?bin=true → show deleted (inactive) facilities; default → active only */
    const showBin = req.query.bin === "true";

    const result = await pool.query(
      `SELECT
         f.*,
         u.first_name AS created_by_first_name,
         u.last_name  AS created_by_last_name
       FROM facilities f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.active = $1
       ORDER BY f.name`,
      [!showBin]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load facilities" });
  }
};

const createFacility = async (req, res) => {
  try {

    const {
      name,
      type,
      district,
      sector,
      phone,
      email,
    } = req.body;

    if (!name || !type || !district) {
      return res.status(400).json({
        message: "name, type, and district are required",
      });
    }

    const code = "FAC-" + Date.now();

    const result = await pool.query(
      `
      INSERT INTO facilities
      (
        code,
        name,
        type,
        district,
        sector,
        phone,
        email,
        active,
        created_by
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,true,$8)
      RETURNING *
      `,
      [
        code,
        name,
        type,
        district,
        sector || null,
        phone || null,
        email || null,
        req.user.id,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to create facility",
    });

  }
};

const updateFacility = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      name,
      type,
      district,
      sector,
      phone,
      email,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE facilities
      SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        district = COALESCE($3, district),
        sector = COALESCE($4, sector),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email)
      WHERE id = $7
      RETURNING *
      `,
      [name, type, district, sector, phone, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update facility",
    });

  }
};

const deactivateFacility = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE facilities SET active = false WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Facility not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete facility" });
  }
};

const restoreFacility = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE facilities SET active = true WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Facility not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to restore facility" });
  }
};

const permanentDeleteFacility = async (req, res) => {
  try {
    const { id } = req.params;

    /* Block if any referrals still reference this facility */
    const refs = await pool.query(
      `SELECT COUNT(*) FROM referrals
       WHERE source_facility_id = $1 OR destination_facility_id = $1`,
      [id]
    );

    if (parseInt(refs.rows[0].count, 10) > 0) {
      return res.status(409).json({
        message:
          "Cannot permanently delete — this facility has referral records. It will remain in the recycle bin.",
      });
    }

    /* Also clear user references */
    await pool.query(
      `UPDATE users SET facility_id = NULL WHERE facility_id = $1`,
      [id]
    );

    const result = await pool.query(
      `DELETE FROM facilities WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Facility not found" });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to permanently delete facility" });
  }
};

const getCapacity = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, capacity_status FROM facilities WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Facility not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get capacity" });
  }
};

const updateCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const { Emergency, Urgent, Routine } = req.body;

    if (req.user.facilityId !== parseInt(id, 10)) {
      return res.status(403).json({
        message: "You can only update your own facility's capacity",
      });
    }

    const capacity = {
      Emergency: Emergency || "available",
      Urgent: Urgent || "available",
      Routine: Routine || "available",
    };

    const result = await pool.query(
      `UPDATE facilities SET capacity_status = $1 WHERE id = $2 RETURNING id, name, capacity_status`,
      [JSON.stringify(capacity), id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update capacity" });
  }
};

module.exports = {
  getHospitals,
  getFacilityById,
  getAllFacilitiesAdmin,
  createFacility,
  updateFacility,
  deactivateFacility,
  restoreFacility,
  permanentDeleteFacility,
  getCapacity,
  updateCapacity,
};