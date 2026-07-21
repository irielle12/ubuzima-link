import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { getUser, isAuthenticated, needsPasswordChange, changePassword } from "../services/authApi";
import BrandMark from "../components/BrandMark";
import PasswordInput from "../components/PasswordInput";
import { passwordPolicyError, PASSWORD_HINT } from "../utils/passwordPolicy";
import "../styles/hospital.css";

function ForcePasswordChange() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated()) {
    navigate("/", { replace: true });
    return null;
  }

  if (!needsPasswordChange()) {
    const user = getUser();
    const hospitalUser = localStorage.getItem("hospitalUser");
    if (user?.role === "admin") navigate("/admin/facilities", { replace: true });
    else if (hospitalUser) navigate("/hospital/queue", { replace: true });
    else navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!navigator.onLine) {
      setError("Connect to the internet to change your password.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await changePassword(currentPassword, newPassword);

      const user = getUser();
      const hospitalUser = localStorage.getItem("hospitalUser");
      if (user?.role === "admin") navigate("/admin/facilities", { replace: true });
      else if (hospitalUser) navigate("/hospital/queue", { replace: true });
      else navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hospital-login-shell auth-security">
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
          <ShieldCheck size={14} />
          <span>Set a New Password</span>
        </div>

        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 18px", textAlign: "center" }}>
          Your account was set up with a temporary password. Choose a new one to continue.
        </p>

        <label>Current (Temporary) Password</label>
        <PasswordInput
          autoComplete="off"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <label>New Password</label>
        <PasswordInput
          placeholder={PASSWORD_HINT}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <label>Confirm New Password</label>
        <PasswordInput
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px" }}>
            {error}
          </p>
        )}

        <button
          className="hospital-login-btn"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving..." : "Set Password & Continue"}
        </button>
      </div>
    </div>
  );
}

export default ForcePasswordChange;
