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
  createPatient
);

router.patch(
  "/:id",
  verifyToken,
  updatePatient
);

router.get("/", getPatients);

router.get(
  "/search",
  searchPatients
);

router.get(
  "/:id/referrals",
  getPatientReferrals
);

router.get(
  "/:id",
  getPatientById
);

module.exports = router;