import { useState } from "react";
import { verifyOtp, resendOtp } from "../services/authApi";

interface OtpChallengeProps {
  preAuthToken: string;
  maskedEmail?: string;
  staffId: string;
  password: string;
  onVerified: (user: any) => void;
  onBack: () => void;
}

/* Shared by both login screens (health worker + hospital portal) — the OTP
   step is identical either way, just reached from a different form. */
function OtpChallenge({
  preAuthToken,
  maskedEmail,
  staffId,
  password,
  onVerified,
  onBack,
}: OtpChallengeProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    try {
      setVerifying(true);
      setError("");
      const data = await verifyOtp(preAuthToken, code, staffId, password);
      onVerified(data.user);
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setError("");
      setInfo("");
      await resendOtp(preAuthToken);
      setInfo("A new code has been sent.");
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px" }}>
        We emailed a 6-digit verification code
        {maskedEmail ? <> to <strong>{maskedEmail}</strong></> : null}. Enter it below to continue.
      </p>

      <label>Verification Code</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
        autoFocus
      />

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0" }}>{error}</p>
      )}
      {info && !error && (
        <p style={{ color: "#16a34a", fontSize: 13, margin: "10px 0" }}>{info}</p>
      )}

      <button
        className="hospital-login-btn"
        onClick={handleVerify}
        disabled={verifying || code.length !== 6}
        style={{ marginTop: 12 }}
      >
        {verifying ? "Verifying..." : "Verify"}
      </button>

      <p style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={handleResend}
          disabled={resending}
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </p>

      <p style={{ textAlign: "center", marginTop: 4 }}>
        <button
          onClick={onBack}
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
          ← Back
        </button>
      </p>
    </>
  );
}

export default OtpChallenge;
