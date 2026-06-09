const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let referrals = [];

app.post("/api/login", (req, res) => {

  const { workerId, password } =
    req.body;

  if (
    workerId === "HW12345" &&
    password === "123456"
  ) {
    return res.json({
      message: "Login Success"
    });
  }

  res.status(401).json({
    message: "Invalid Credentials"
  });
});

app.get("/api/referrals", (req, res) => {
  res.json(referrals);
});

app.post("/api/referrals", (req, res) => {

  const referral = {
    id: Date.now(),
    ...req.body
  };

  referrals.push(referral);

  res.status(201).json(referral);
});

app.listen(5000, () => {
  console.log("Server running");
});