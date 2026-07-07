const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

const patientRoutes = require("./src/routes/patientRoutes");
const referralRoutes = require("./src/routes/referralRoutes");
const facilityRoutes = require("./src/routes/facilityRoutes");
const referralEventRoutes = require("./src/routes/referralEventRoutes");
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const returnReferralRoutes = require("./src/routes/returnReferralRoutes");

// Render/Vercel terminate TLS in front of this app — trust their
// X-Forwarded-Proto header so req.secure reflects the real client protocol.
app.set("trust proxy", 1);

app.use(helmet());

// HTTPS only in production. Left off in local dev, where there's no TLS
// termination in front of the server at all.
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      return next();
    }
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/referrals", referralEventRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/referrals", returnReferralRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Ubuzima-Link API Running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});