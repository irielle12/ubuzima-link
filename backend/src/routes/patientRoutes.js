const express = require("express");

const router =
  express.Router();

const {
  createPatient,
  getPatients,
  searchPatients,
  getPatientById,
  getPatientReferrals
} = require(
  "../controllers/patientController"
);

router.post(
  "/",
  createPatient
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