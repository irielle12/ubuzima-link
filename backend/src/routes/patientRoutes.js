const express = require("express");

const router =
  express.Router();

const {
  createPatient,
  getPatients,
  searchPatients,
  getPatientById,
  getPatientReferrals,
  updatePatient
} = require(
  "../controllers/patientController"
);

const { verifyToken } = require("../middleware/authMiddleware");

router.post(
  "/",
  verifyToken,
  createPatient
);

router.patch(
  "/:id",
  verifyToken,
  updatePatient
);

router.get("/", verifyToken, getPatients);

router.get(
  "/search",
  verifyToken,
  searchPatients
);

router.get(
  "/:id/referrals",
  verifyToken,
  getPatientReferrals
);

router.get(
  "/:id",
  verifyToken,
  getPatientById
);

module.exports = router;