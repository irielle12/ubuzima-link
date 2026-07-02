const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createReturnReferral,
  getReturnReferral,
} = require("../controllers/returnReferralController");

router.post("/:id/return", verifyToken, createReturnReferral);
router.get("/:id/return", verifyToken, getReturnReferral);

module.exports = router;
