const express = require("express");

const router = express.Router();

const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const {
  getAllFacilitiesAdmin,
  createFacility,
  updateFacility,
  deactivateFacility,
  restoreFacility,
  permanentDeleteFacility,
} = require("../controllers/facilityController");

const {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deactivateUser,
  restoreUser,
  permanentDeleteUser,
} = require("../controllers/adminController");

router.use(verifyToken, requireAdmin);

router.get(
  "/facilities",
  getAllFacilitiesAdmin
);

router.post(
  "/facilities",
  createFacility
);

router.patch(
  "/facilities/:id",
  updateFacility
);

router.patch(
  "/facilities/:id/deactivate",
  deactivateFacility
);

router.patch(
  "/facilities/:id/restore",
  restoreFacility
);

router.delete(
  "/facilities/:id",
  permanentDeleteFacility
);

router.get(
  "/users",
  getUsers
);

router.post(
  "/users",
  createUser
);

router.patch(
  "/users/:id",
  updateUser
);

router.patch("/users/:id/reset-password", resetPassword);

router.patch(
  "/users/:id/deactivate",
  deactivateUser
);

router.patch(
  "/users/:id/restore",
  restoreUser
);

router.delete(
  "/users/:id",
  permanentDeleteUser
);

module.exports = router;
