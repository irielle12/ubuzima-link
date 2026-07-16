const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const {
  login,
  verifyOtp,
  resendOtp,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPasswordWithCode,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/otp/verify", verifyOtp);
router.post("/otp/resend", resendOtp);
router.post("/refresh", refresh);
router.post("/logout", verifyToken, logout);
router.patch("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithCode);

module.exports = router;