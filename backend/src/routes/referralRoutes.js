const express = require("express");

const router = express.Router();

const {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferralStatus,
  getPendingReferrals,
  closeReferral,
  getReferralsBySource,
  getFacilityStats,
  getReferralByNumber,
  notifyReferral,
  markArrived,
  updateInternalNotes,
  getHospitalQueue,
  receiveOfflineReferral,
  updateReferral,
} = require("../controllers/referralController");

const { verifyToken } = require("../middleware/authMiddleware");

router.post(
  "/",
  verifyToken,
  createReferral
);

router.post(
  "/receive-offline",
  verifyToken,
  receiveOfflineReferral
);

router.get(
  "/",
  verifyToken,
  getReferrals
);
router.get(
  "/pending",
  verifyToken,
  getPendingReferrals
);
router.get(
  "/by-source",
  verifyToken,
  getReferralsBySource
);
router.get(
  "/stats",
  verifyToken,
  getFacilityStats
);
router.get(
  "/hospital-queue",
  verifyToken,
  getHospitalQueue
);

router.get(
  "/by-number/:referralNumber",
  verifyToken,
  getReferralByNumber
);

router.get(
  "/:id",
  verifyToken,
  getReferralById
);

router.patch(
  "/:id",
  verifyToken,
  updateReferral
);

router.patch(
  "/:id/status",
  verifyToken,
  updateReferralStatus
);

router.patch(
  "/:id/close",
  verifyToken,
  closeReferral
);

router.patch(
  "/:id/arrive",
  verifyToken,
  markArrived
);

router.patch(
  "/:id/internal-notes",
  verifyToken,
  updateInternalNotes
);

router.post(
  "/:id/notify",
  verifyToken,
  notifyReferral
);

module.exports = router;