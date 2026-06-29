const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const patientRoutes =
  require("./routes/patientRoutes");

const app = express();
const authRoutes = require("./routes/authRoutes");

const referralRoutes =
  require("./routes/referralRoutes");

const referralEventRoutes =
  require(
    "./routes/referralEventRoutes"
  );
const facilityRoutes =
require("./routes/facilityRoutes");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(
  "/api/patients",
  patientRoutes
);
app.use(
  "/api/referrals",
  referralRoutes
);
app.use(
  "/api/referrals",
  referralEventRoutes
);
app.use(
  "/api/facilities",
  facilityRoutes
);

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM facilities");

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});