import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginRequest, getUser } from "../services/authApi";
import "../styles/hospital.css";

function HospitalLogin() {
  const navigate = useNavigate();

  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!staffId || !password) return;

    try {
      setLoggingIn(true);
      setError("");

      await loginRequest(staffId, password);

      const user = getUser();

      localStorage.setItem(
        "hospitalUser",
        JSON.stringify({ hospitalId: user?.facilityId })
      );

      navigate("/hospital/queue");
    } catch (err: any) {
      setError(err.message || "Invalid Staff ID or password.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="hospital-login-shell">
      <div className="hospital-login-card">
        <div className="hospital-login-logo">
          <h1>Ubuzima-Link</h1>
          <p>Healthcare Referral Management System</p>
        </div>

        <div className="hospital-login-divider" />

        <h2 style={{ margin: "0 0 20px", fontSize: 17, color: "#0f172a" }}>
          Hospital Staff Login
        </h2>

        <label>Staff ID</label>
        <input
          type="text"
          autoComplete="off"
          placeholder="Enter your staff ID"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px" }}>
            {error}
          </p>
        )}

        <button
          className="hospital-login-btn"
          onClick={handleLogin}
          disabled={loggingIn}
        >
          {loggingIn ? "Signing in..." : "Sign In"}
        </button>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
          Hospital staff only · Contact your administrator if you need access
        </p>

        <p style={{ textAlign: "center", marginTop: 12 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            ← Back to home
          </button>
        </p>
      </div>
    </div>
  );
}

export default HospitalLogin;
