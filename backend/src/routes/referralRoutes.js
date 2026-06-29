const express = require("express");

const router = express.Router();

const {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferralStatus,
  getPendingReferrals,
} = require("../controllers/referralController");

router.post(
  "/",
  createReferral
);

router.get(
  "/",
  getReferrals
);
router.get(
  "/pending",
  getPendingReferrals
);

router.get(
  "/:id",
  getReferralById
);

router.patch(
  "/:id/status",
  updateReferralStatus
);

module.exports = router;