import QRCode from "react-qr-code";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { db } from "../services/db";
import { useLanguage } from "../contexts/LanguageContext";

function QRView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const state: any = location.state;

  const [qrPayload, setQrPayload] = useState<any>(null);
  const [smsPhone, setSmsPhone] = useState("");

  const qrRef = useRef<HTMLDivElement>(null);

  // Offline referrals never reach the backend, so there's no server-side
  // Africa's Talking send available yet — fall back to the device's own SMS
  // radio (works with no data connection) by opening a pre-filled sms: link,
  // same wording/fallback the backend uses when AT isn't configured. Left
  // editable since the patient's phone on file may be blank or wrong.
  const sendSms = () => {
    if (!smsPhone.trim()) return;
    const message = `Ubuzima-Link: You have been referred to ${qrPayload.destinationHospital}. Your referral reference number is ${qrPayload.referralNumber}. Please keep this number for your visit.`;
    window.location.href = "sms:" + smsPhone.trim() + "?body=" + encodeURIComponent(message);
  };

  useEffect(() => {
    if (state?.qrPayload) {
      setQrPayload(state.qrPayload);
    } else {
      loadFromDexie();
    }
  }, []);

  useEffect(() => {
    if (qrPayload?.patientPhone) setSmsPhone(qrPayload.patientPhone);
  }, [qrPayload]);

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

        {qrPayload.synced === false && (
          <div style={{ marginTop: 14, textAlign: "left" }}>
            <label style={{ display: "block", fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>
              {t("Patient Phone Number")}
            </label>
            <input
              type="tel"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              placeholder="+250781234567"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }}
            />
            <button
              type="button"
              className="secondary-action-btn"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}
              onClick={sendSms}
              disabled={!smsPhone.trim()}
            >
              <MessageSquare size={15} />
              {t("Text Reference Number to Patient")}
            </button>
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
