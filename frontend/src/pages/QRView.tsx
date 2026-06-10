import QRCode from "react-qr-code";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function QRView() {
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);

  useEffect(() => {
    const loadReferral = async () => {
      const all = await db.referrals.toArray();

      if (all.length > 0) {
        setReferral(all[all.length - 1]);
      }
    };

    loadReferral();
  }, []);

  if (!referral) {
    return (
      <div className="qr-screen">
        <div className="empty-state">
          <h2>No Referral Found</h2>

          <button
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-screen">

      {/* TOP BAR */}
      <div className="qr-topbar">

        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ←
        </button>

        <h3>Referral Token</h3>

        <div className="offline-indicator">
          OFFLINE
        </div>

      </div>

      {/* SUCCESS CARD */}
      <div className="success-card">

        <div className="success-icon">
          ✓
        </div>

        <h2>Referral Created</h2>

        <p>
          Referral saved locally and ready for hospital verification.
        </p>

      </div>

      {/* QR CARD */}
      <div className="qr-card">

        <QRCode
          value={JSON.stringify(referral)}
          size={180}
        />

      </div>

      {/* REFERRAL ID */}
      <div className="token-card">

        <span className="token-label">
          Referral ID
        </span>

        <h3>{referral.id}</h3>

      </div>

      {/* DETAILS */}
      <div className="patient-card">

        <h4>Patient Information</h4>

        <p>
          <strong>Name:</strong> {referral.patientName}
        </p>

        <p>
          <strong>Hospital:</strong> {referral.hospital}
        </p>

        <p>
          <strong>Status:</strong> {referral.status}
        </p>

      </div>

      {/* ACTION BUTTON */}
      <button
        className="done-btn"
        onClick={() => navigate("/dashboard")}
      >
        Return to Dashboard
      </button>

      {/* FOOTER */}
      <p className="footer-note">
        Present this QR code at the receiving hospital for verification.
      </p>

    </div>
  );
}

export default QRView;