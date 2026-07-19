import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft } from "lucide-react";
import { login as loginRequest, getUser } from "../services/authApi";
import BrandMark from "../components/BrandMark";
import OtpChallenge from "../components/OtpChallenge";
import ForgotPasswordFlow from "../components/ForgotPasswordFlow";
import "../styles/hospital.css";

function HospitalLogin() {
  const navigate = useNavigate();

  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<{
    preAuthToken: string;
    maskedEmail?: string;
  } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  const handlePasswordResetDone = (message: string) => {
    setShowForgotPassword(false);
    setInfoMessage(message);
    setPassword("");
  };

  const navigateAfterLogin = (user: any) => {
    localStorage.setItem(
      "hospitalUser",
      JSON.stringify({ hospitalId: user?.facilityId })
    );

    if (user?.mustChangePassword) {
      navigate("/force-password-change");
    } else {
      navigate("/hospital/queue");
    }
  };

  const handleLogin = async () => {
    if (!staffId || !password) return;

    try {
      setLoggingIn(true);
      setError("");

      const data = await loginRequest(staffId, password);

      if (data?.otpRequired) {
        setOtpChallenge({
          preAuthToken: data.preAuthToken,
          maskedEmail: data.maskedEmail,
        });
        return;
      }

      navigateAfterLogin(getUser());
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

      <div className="hospital-login-card" style={{ position: "relative" }}>
        <button
          className="back-btn-v2"
          onClick={() => navigate("/")}
          title="Back to home"
          style={{ position: "absolute", top: 16, left: 16, zIndex: 2 }}
        >
          <ArrowLeft size={18} />
        </button>

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

        {otpChallenge ? (
          <OtpChallenge
            preAuthToken={otpChallenge.preAuthToken}
            maskedEmail={otpChallenge.maskedEmail}
            staffId={staffId}
            password={password}
            onVerified={navigateAfterLogin}
            onBack={() => setOtpChallenge(null)}
          />
        ) : showForgotPassword ? (
          <ForgotPasswordFlow
            initialStaffId={staffId}
            onDone={handlePasswordResetDone}
            onCancel={() => setShowForgotPassword(false)}
          />
        ) : (
          <>
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

            <p style={{ textAlign: "right", margin: "-8px 0 12px" }}>
              <button
                onClick={() => { setError(""); setInfoMessage(""); setShowForgotPassword(true); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </p>

            {infoMessage && !error && (
              <p style={{ color: "#16a34a", fontSize: 13, margin: "0 0 10px" }}>
                {infoMessage}
              </p>
            )}

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
          </>
        )}

      </div>
    </div>
  );
}

export default HospitalLogin;
