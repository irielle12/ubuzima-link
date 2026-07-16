const express =
  require("express");

const router =
  express.Router();

const {
  getReferralEvents,
  createReferralEvent,
} = require(
  "../controllers/referralEventController"
);

const { verifyToken } = require("../middleware/authMiddleware");

router.get(
  "/:id/events",
  verifyToken,
  getReferralEvents
);

router.post(
  "/:id/events",
  verifyToken,
  createReferralEvent
);

module.exports = router;