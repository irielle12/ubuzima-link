const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const {
  login,
  refresh,
  logout,
  changePassword,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", verifyToken, logout);
router.patch("/change-password", verifyToken, changePassword);

module.exports = router;