import QRCode from "react-qr-code";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { db } from "../services/db";
import { useLanguage } from "../contexts/LanguageContext";
import { encodeQrPayload } from "../utils/qrPayload";

function QRView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const state: any = location.state;

  const [qrPayload, setQrPayload] = useState<any>(null);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.qrPayload) {
      setQrPayload(state.qrPayload);
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
  };

  const qrString = qrPayload ? encodeQrPayload(qrPayload) : "";

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

      {/* QR CODE */}
      <div className="details-card" style={{ textAlign: "center", padding: 28 }} ref={qrRef}>

        <div className="qr-success-badge">
          <CheckCircle2 size={26} />
        </div>

        <div
          style={{
            marginBottom: 18,
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

        <div className="qr-frame">
          <div className="qr-frame-inner">
            <QRCode value={qrString} size={240} />
          </div>
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

        {qrPayload.synced === false && qrPayload.patientPhone && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              fontSize: 13,
              color: "#15803d",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              textAlign: "left",
            }}
          >
            <MessageSquare size={15} style={{ flexShrink: 0 }} />
            {t("Patient will be texted their reference number automatically once this device is back online")}
          </div>
        )}
      </div>

      {/* PATIENT + REFERRAL SUMMARY */}
      <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 12 }}>
        <p style={{ margin: 0, padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" }}>
          {t("Summary")}
        </p>
        {[
          { label: t("Patient:"), value: qrPayload.patientName },
          ...(qrPayload.patientAge ? [{ label: t("Age:"), value: qrPayload.patientAge }] : []),
          { label: t("Diagnosis:"), value: qrPayload.diagnosis },
          {
            label: t("Urgency:"),
            value: (
              <span className={`status-chip ${(qrPayload.urgency || "").toLowerCase()}`} style={{ margin: 0 }}>
                {qrPayload.urgency}
              </span>
            ),
          },
          { label: t("To:"), value: qrPayload.destinationHospital },
          { label: t("Date:"), value: qrPayload.referralDate },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* RETURN */}
      <button
        className="secondary-action-btn"
        onClick={() => navigate("/dashboard")}
        style={{ marginTop: 4, marginBottom: 8 }}
      >
        {t("Return to Dashboard")}
      </button>

    </div>
  );
}

export default QRView;
