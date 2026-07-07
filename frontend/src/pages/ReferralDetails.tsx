import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConnectionStatus from "../components/ConnectionStatus";
import { getReferralById } from "../services/referralApi";
import { getReturnReferral } from "../services/returnReferralApi";
import { useLanguage } from "../contexts/LanguageContext";
import { db } from "../services/db";
import { getUser } from "../services/authApi";
import { markClosedReferralsSeen } from "../services/notifications";
import {
  House, FileText, Wifi, User,
  Phone, UserCheck, AlertCircle, Activity, Stethoscope, CheckCircle, AlertTriangle, Building2, Calendar,
} from "lucide-react";

function hasFeedback(r: any) {
  return Boolean(r.treatment_status || r.hospital_notes);
}

function ReferralDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();

  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returnReferral, setReturnReferral] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadReferral();
      getReturnReferral(id).then(setReturnReferral).catch(() => {});
    }
  }, [id]);

  const loadReferral = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getReferralById(id as string);
      setReferral(data);
      await db.cachedReferrals.put(data);

      if (data.workflow_status === "Closed") {
        const user = getUser();
        if (user?.facilityId) markClosedReferralsSeen(user.facilityId, [data]);
      }
    } catch (err: any) {
      if (err.status === 404) {
        // Genuinely deleted server-side — don't resurrect a stale local
        // copy. Purge it so it can't linger and reappear elsewhere.
        await db.cachedReferrals.delete(Number(id)).catch(() => {});
        setError(err.message);
        return;
      }

      // Offline or unreachable — fall back to the last cached copy, if any.
      const cached = await db.cachedReferrals.get(Number(id)).catch(() => undefined);
      if (cached) {
        setReferral(cached);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-search-page">
        <div className="details-card">{t("Loading referral...")}</div>
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="patient-search-page">
        <div className="details-card" style={{ color: "red" }}>
          {error || t("Referral not found.")}
        </div>
      </div>
    );
  }

  const status = referral.workflow_status;

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate(-1)}>←</button>
        <div>
          <h1>{t("Referral Details")}</h1>
          <p>{referral.referral_number}</p>
          <ConnectionStatus />
        </div>
      </div>

      {/* PATIENT INFORMATION */}
      <div style={{ margin: "0 16px 12px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <p style={{ margin: 0, padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" }}>
          {t("Patient Information")}
        </p>
        {[
          { icon: <User size={14} />, label: t("Full Name"), value: `${referral.first_name} ${referral.last_name}` },
          { icon: <UserCheck size={14} />, label: t("Gender"), value: referral.gender || "—" },
          { icon: <Phone size={14} />, label: t("Phone"), value: referral.phone || "—" },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>{row.icon}</span>
            <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* CLINICAL INFORMATION */}
      <div style={{ margin: "0 16px 12px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <p style={{ margin: 0, padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" }}>
          {t("Clinical Information")}
        </p>

        {referral.chief_complaint && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}><AlertCircle size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Chief Complaint")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>{referral.chief_complaint}</p>
          </div>
        )}

        {referral.medical_history && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}><FileText size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Medical History")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>{referral.medical_history}</p>
          </div>
        )}

        {(referral.vital_bp || referral.vital_heart_rate || referral.vital_temperature || referral.vital_respiratory_rate) && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}><Activity size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Vital Signs")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {referral.vital_bp && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{t("BP:")}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{referral.vital_bp}</span>
                </div>
              )}
              {referral.vital_heart_rate && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{t("HR:")}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{referral.vital_heart_rate}</span>
                </div>
              )}
              {referral.vital_temperature && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{t("Temp:")}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{referral.vital_temperature}</span>
                </div>
              )}
              {referral.vital_respiratory_rate && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{t("RR:")}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{referral.vital_respiratory_rate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: "10px 16px", borderBottom: referral.action_taken ? "1px solid #f1f5f9" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}><Stethoscope size={13} /></span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Provisional Diagnosis")}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>{referral.diagnosis}</p>
        </div>

        {referral.action_taken && (
          <div style={{ padding: "10px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}><CheckCircle size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Action Taken")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>{referral.action_taken}</p>
          </div>
        )}
      </div>

      {/* REFERRAL DETAILS */}
      <div style={{ margin: "0 16px 12px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <p style={{ margin: 0, padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" }}>
          {t("Referral Details")}
        </p>
        {[
          { icon: <AlertTriangle size={14} />, label: t("Priority"), value: referral.urgency || "—" },
          { icon: <Building2 size={14} />, label: t("Receiving Hospital"), value: referral.destination_hospital || "—" },
          { icon: <Activity size={14} />, label: t("Status"), value: referral.workflow_status },
          { icon: <Calendar size={14} />, label: t("Date"), value: referral.created_at ? new Date(referral.created_at).toLocaleDateString() : "—" },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>{row.icon}</span>
            <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* PENDING SYNC */}
      {status === "Pending Sync" && (
        <div className="actions-container">
          <button className="primary-action-btn" onClick={() => navigate("/qr-view")}>
            {t("View Referral QR")}
          </button>
          <button className="secondary-action-btn">
            {t("Retry Synchronization")}
          </button>
        </div>
      )}

      {/* PENDING REVIEW */}
      {status === "Pending Hospital Review" && (
        <div className="workflow-message">
          <h4>{t("Awaiting Hospital Review")}</h4>
          <p>{t("The referral has been submitted and is awaiting review by the receiving hospital.")}</p>
        </div>
      )}

      {/* ARRIVED */}
      {status === "Arrived" && (
        <div className="workflow-message">
          <h4>{t("Patient Has Arrived")}</h4>
          <p>
            {referral.first_name} {referral.last_name} arrived at{" "}
            {referral.destination_hospital || "the receiving hospital"}
            {referral.arrived_at ? ` on ${new Date(referral.arrived_at).toLocaleString()}` : ""}.
          </p>
        </div>
      )}

      {/* HOSPITAL FEEDBACK (Closed with feedback) */}
      {status === "Closed" && hasFeedback(referral) && (
        <div style={{ margin: "0 16px 12px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <p style={{ margin: 0, padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" }}>
            {t("Hospital Feedback")}
          </p>

          {[
            { icon: <Calendar size={14} />, label: t("Date:"), value: referral.feedback_at ? new Date(referral.feedback_at).toLocaleString() : "—" },
            { icon: <CheckCircle size={14} />, label: t("Outcome:"), value: referral.treatment_status || "—" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}>{row.icon}</span>
              <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{row.value}</span>
            </div>
          ))}

          <div style={{ padding: "10px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}><FileText size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Clinical Notes")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>
              {referral.hospital_notes || t("No notes available.")}
            </p>
          </div>
        </div>
      )}

      {/* RETURN REFERRAL */}
      {returnReferral && (
        <div style={{ margin: "0 16px 12px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <p style={{ margin: 0, padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" }}>
            {t("Return Instructions from Hospital")}
          </p>

          {[
            { icon: <AlertTriangle size={14} />, label: t("Follow-up urgency:"), value: returnReferral.follow_up_urgency },
            ...(returnReferral.next_appointment_date
              ? [{ icon: <Calendar size={14} />, label: t("Next appointment:"), value: returnReferral.next_appointment_date }]
              : []),
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}>{row.icon}</span>
              <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{row.value}</span>
            </div>
          ))}

          <div style={{ padding: "10px 16px", borderBottom: returnReferral.medications_prescribed ? "1px solid #f1f5f9" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#94a3b8", flexShrink: 0 }}><FileText size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Instructions")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>{returnReferral.follow_up_instructions}</p>
          </div>

          {returnReferral.medications_prescribed && (
            <div style={{ padding: "10px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ color: "#94a3b8", flexShrink: 0 }}><FileText size={13} /></span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("Medications")}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>{returnReferral.medications_prescribed}</p>
            </div>
          )}
        </div>
      )}

      {/* CLOSED without feedback */}
      {status === "Closed" && !hasFeedback(referral) && (
        <div className="workflow-message closed">
          <h4>{t("Referral Closed")}</h4>
          <p>{t("Treated — no detailed feedback provided.")}</p>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav-v2">
        <button className="nav-button" onClick={() => navigate("/dashboard")}>
          <House size={20} />
          <span>{t("Home")}</span>
        </button>
        <button className="nav-button active" onClick={() => navigate("/referrals")}>
          <FileText size={20} />
          <span>{t("Work Queue")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/sync")}>
          <Wifi size={20} />
          <span>{t("Sync")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/profile")}>
          <User size={20} />
          <span>{t("Profile")}</span>
        </button>
      </nav>

    </div>
  );
}

export default ReferralDetails;
