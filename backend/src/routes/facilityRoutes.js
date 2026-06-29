const express = require("express");

const router = express.Router();

const {
  getHospitals,
} = require("../controllers/facilityController");

router.get(
  "/",
  getHospitals
);

module.exports = router;