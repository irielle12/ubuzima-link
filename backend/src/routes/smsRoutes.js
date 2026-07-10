const express = require("express");

const router = express.Router();

const { deliveryReportCallback } = require("../controllers/smsController");

// No auth — Africa's Talking calls this directly, not an authenticated client.
router.post("/delivery-report", deliveryReportCallback);

module.exports = router;
