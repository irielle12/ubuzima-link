import { useState } from "react";
import { requestPasswordReset, resetPasswordWithCode } from "../services/authApi";
import { passwordPolicyError, PASSWORD_HINT } from "../utils/passwordPolicy";
import PasswordInput from "./PasswordInput";

interface ForgotPasswordFlowProps {
  /* Pre-filled Staff ID — e.g. whatever the user already typed on the login
     form, or (from Profile, where we already know who's logged in) their
     own staffId. */
  initialStaffId?: string;
  /* Profile already knows exactly who's asking, so there's no reason to
     let them edit it there — but on a login screen the visitor is
     unauthenticated by definition, so it must stay editable. */
  lockStaffId?: boolean;
  onDone: (message: string) => void;
  onCancel: () => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  margin: "12px 0 6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#64748b",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};

/* Shared between both login screens and the Profile page — a self-service
   "forgot password" flow: request a code emailed to the Staff ID's address
   on file, then submit it with a new password. The server always responds
   the same way regardless of whether the Staff ID/email actually exists,
   so this component can't (and shouldn't try to) tell the two cases apart
   either — it just always advances to the code-entry step. */
function ForgotPasswordFlow({
  initialStaffId,
  lockStaffId,
  onDone,
  onCancel,
}: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [staffId, setStaffId] = useState(initialStaffId || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleRequestCode = async () => {
    if (!staffId) return;

    try {
      setSending(true);
      setError("");
      const data = await requestPasswordReset(staffId);
      setInfo(data.message);
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Failed to request a reset code.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    try {
      setSending(true);
      setError("");
      const data = await requestPasswordReset(staffId);
      setInfo(data.message);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setSending(false);
    }
  };

  const handleReset = async () => {
    if (!code || !newPassword || !confirmPassword) {
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
      setResetting(true);
      setError("");
      const data = await resetPasswordWithCode(staffId, code, newPassword);
      onDone(data.message);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  if (step === "request") {
    return (
      <>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px" }}>
          Enter your Staff ID and we'll email a reset code to the address on file for it.
        </p>

        <label style={labelStyle}>Staff ID</label>
        <input
          type="text"
          autoComplete="off"
          value={staffId}
          disabled={lockStaffId}
          onChange={(e) => setStaffId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRequestCode()}
          style={{ ...inputStyle, marginBottom: 4 }}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0" }}>{error}</p>
        )}

        <button
          className="hospital-login-btn"
          onClick={handleRequestCode}
          disabled={sending || !staffId}
          style={{ marginTop: 12 }}
        >
          {sending ? "Sending..." : "Send Reset Code"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onCancel} style={linkButtonStyle}>
            ← Back
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px" }}>
        {info || "If that Staff ID has an email on file, a reset code has been sent to it."}
      </p>

      <label style={labelStyle}>Reset Code</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        style={inputStyle}
      />

      <label style={labelStyle}>New Password</label>
      <PasswordInput
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder={PASSWORD_HINT}
        style={inputStyle}
      />

      <label style={labelStyle}>Confirm New Password</label>
      <PasswordInput
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleReset()}
        style={inputStyle}
      />

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0" }}>{error}</p>
      )}

      <button
        className="hospital-login-btn"
        onClick={handleReset}
        disabled={resetting}
        style={{ marginTop: 12 }}
      >
        {resetting ? "Resetting..." : "Reset Password"}
      </button>

      <p style={{ textAlign: "center", marginTop: 16 }}>
        <button onClick={handleResend} disabled={sending} style={{ ...linkButtonStyle, color: "#2563eb" }}>
          {sending ? "Sending..." : "Resend code"}
        </button>
      </p>

      <p style={{ textAlign: "center", marginTop: 4 }}>
        <button onClick={onCancel} style={linkButtonStyle}>
          ← Back
        </button>
      </p>
    </>
  );
}

export default ForgotPasswordFlow;
