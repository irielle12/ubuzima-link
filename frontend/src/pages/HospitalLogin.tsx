import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { login as loginRequest, getUser } from "../services/authApi";
import BrandMark from "../components/BrandMark";
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

      if (user?.mustChangePassword) {
        navigate("/force-password-change");
      } else {
        navigate("/hospital/queue");
      }
    } catch (err: any) {
      setError(err.message || "Invalid Staff ID or password.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="hospital-login-shell auth-hospital">
      <div className="auth-glow auth-glow-a" />
      <div className="auth-glow auth-glow-b" />

      <div className="hospital-login-card">
        <div className="hospital-login-mark">
          <BrandMark size={44} />
        </div>

        <div className="hospital-login-logo">
          <h1>Ubuzima-Link</h1>
          <p>Healthcare Referral Management System</p>
        </div>

        <div className="hospital-login-role-badge">
          <Building2 size={14} />
          <span>Hospital Staff Login</span>
        </div>

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
