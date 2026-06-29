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

router.get(
  "/:id/events",
  getReferralEvents
);

router.post(
  "/:id/events",
  createReferralEvent
);

module.exports = router;