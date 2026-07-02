import QRCode from "react-qr-code";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../services/db";
import { useLanguage } from "../contexts/LanguageContext";

function QRView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const state: any = location.state;

  const [qrPayload, setQrPayload] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.qrPayload) {
      setQrPayload(state.qrPayload);
      setDisplayData(state.displayData);
      setIsOffline(!!state.offline);
    } else {
      loadFromDexie();
    }
  }, []);

  const loadFromDexie = async () => {
    const referrals = await db.referrals.orderBy("id").reverse().first();
    if (!referrals) return;

    const r = referrals;
    const payload = {
      referralNumber: r.referralNumber || r.id,
      synced: r.synced !== false,
      patientName: r.patientName || "Unknown",
      patientAge: r.patientAge || "",
      patientGender: r.patientGender || "",
      patientPhone: r.patientPhone || "",
      diagnosis: r.diagnosis,
      urgency: r.urgency,
      referringFacility: r.referringFacility || "",
      destinationHospital: r.hospital,
      referralDate: r.time,
    };

    setQrPayload(payload);
    setDisplayData({ patient: { phone: r.patientPhone }, hospitalName: r.hospital });
    setIsOffline(!payload.synced);
  };

  const qrString = qrPayload ? JSON.stringify(qrPayload) : "";

  if (!qrPayload) {
    return (
      <div className="patient-search-page">
        <div className="patient-header">
          <button className="back-btn-v2" onClick={() => navigate("/dashboard")}>←</button>
          <div><h1>{t("QR Code")}</h1></div>
        </div>
        <div className="details-card">
          <h3>{t("No referral data.")}</h3>
          <button
            className="primary-action-btn"
            onClick={() => navigate("/patient-search")}
            style={{ marginTop: 12 }}
          >
            {t("Create a Referral")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate("/dashboard")}>←</button>
        <div>
          <h1>{t("Referral Created")}</h1>
          <p>{qrPayload.referralNumber}</p>
        </div>
      </div>

      {/* OFFLINE NOTICE */}
      {isOffline && (
        <div
          className="details-card"
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong>{t("Created offline")}</strong>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#92400e" }}>
              {t("This referral will sync automatically when connected. The QR code is valid for hospital use in the meantime.")}
            </p>
          </div>
        </div>
      )}

      {/* QR CODE */}
      <div className="details-card" style={{ textAlign: "center", padding: 28 }} ref={qrRef}>
        <QRCode value={qrString} size={260} />

        <div
          style={{
            marginTop: 18,
            padding: "10px 14px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            fontSize: 13,
            color: "#1d4ed8",
            fontWeight: 500,
          }}
        >
          {t("📸 Ask the patient to take a photo of this screen before leaving")}
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "14px 16px",
            background: "#f8fafc",
            border: "2px dashed #cbd5e1",
            borderRadius: 8,
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {t("Reference Number")}
          </p>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "0.08em", color: "#0f172a", fontFamily: "monospace" }}>
            {qrPayload.referralNumber}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("If QR cannot be scanned, hospital staff can use this number to find the referral")}
          </p>
        </div>
      </div>

      {/* PATIENT + REFERRAL SUMMARY */}
      <div className="details-card">
        <h3>{t("Summary")}</h3>

        <div className="detail-row">
          <strong>{t("Patient:")}</strong>
          <span>{qrPayload.patientName}</span>
        </div>

        {qrPayload.patientAge && (
          <div className="detail-row">
            <strong>{t("Age:")}</strong>
            <span>{qrPayload.patientAge}</span>
          </div>
        )}

        <div className="detail-row">
          <strong>{t("Diagnosis:")}</strong>
          <span>{qrPayload.diagnosis}</span>
        </div>

        <div className="detail-row">
          <strong>{t("Urgency:")}</strong>
          <span>{qrPayload.urgency}</span>
        </div>

        <div className="detail-row">
          <strong>{t("To:")}</strong>
          <span>{qrPayload.destinationHospital}</span>
        </div>

        <div className="detail-row">
          <strong>{t("Date:")}</strong>
          <span>{qrPayload.referralDate}</span>
        </div>
      </div>

      {/* RETURN */}
      <button
        className="secondary-action-btn"
        onClick={() => navigate("/dashboard")}
        style={{ marginTop: 8 }}
      >
        {t("Return to Dashboard")}
      </button>

    </div>
  );
}

export default QRView;
