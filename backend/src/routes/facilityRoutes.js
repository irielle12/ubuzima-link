const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const {
  getHospitals,
  getFacilityById,
  getCapacity,
  updateCapacity,
} = require("../controllers/facilityController");

router.get(
  "/",
  getHospitals
);

router.get("/:id/capacity", getCapacity);
router.patch("/:id/capacity", verifyToken, updateCapacity);
router.get("/:id", getFacilityById);

module.exports = router;