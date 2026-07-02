import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConnectionStatus from "../components/ConnectionStatus";
import { getReferralById } from "../services/referralApi";
import { getReturnReferral } from "../services/returnReferralApi";
import { useLanguage } from "../contexts/LanguageContext";
import {
  House,
  FileText,
  Wifi,
  User,
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
    } catch (err: any) {
      setError(err.message);
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

      {/* PATIENT */}
      <div className="details-card">
        <h3>{t("Patient Information")}</h3>
        <div className="detail-row">
          <strong>{t("Name:")}</strong>
          <span>{referral.first_name} {referral.last_name}</span>
        </div>
        <div className="detail-row">
          <strong>{t("Gender:")}</strong>
          <span>{referral.gender || "—"}</span>
        </div>
        <div className="detail-row">
          <strong>{t("Phone:")}</strong>
          <span>{referral.phone || "—"}</span>
        </div>
      </div>

      {/* CLINICAL INFORMATION */}
      <div className="details-card">
        <h3>{t("Clinical Information")}</h3>

        {referral.chief_complaint && (
          <div style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: 13 }}>{t("Chief Complaint")}</strong>
            <p style={{ marginTop: 4, color: "#334155" }}>{referral.chief_complaint}</p>
          </div>
        )}

        {referral.medical_history && (
          <div style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: 13 }}>{t("Medical History")}</strong>
            <p style={{ marginTop: 4, color: "#334155" }}>{referral.medical_history}</p>
          </div>
        )}

        {(referral.vital_bp || referral.vital_heart_rate || referral.vital_temperature || referral.vital_respiratory_rate) && (
          <div style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: 13 }}>{t("Vital Signs")}</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginTop: 6 }}>
              {referral.vital_bp && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>{t("BP:")}</strong><span>{referral.vital_bp}</span>
                </div>
              )}
              {referral.vital_heart_rate && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>{t("HR:")}</strong><span>{referral.vital_heart_rate}</span>
                </div>
              )}
              {referral.vital_temperature && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>{t("Temp:")}</strong><span>{referral.vital_temperature}</span>
                </div>
              )}
              {referral.vital_respiratory_rate && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>{t("RR:")}</strong><span>{referral.vital_respiratory_rate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>{t("Provisional Diagnosis")}</strong>
          <p style={{ marginTop: 4, color: "#334155" }}>{referral.diagnosis}</p>
        </div>

        {referral.action_taken && (
          <div>
            <strong style={{ fontSize: 13 }}>{t("Action Taken")}</strong>
            <p style={{ marginTop: 4, color: "#334155" }}>{referral.action_taken}</p>
          </div>
        )}
      </div>

      {/* REFERRAL ROUTING */}
      <div className="details-card">
        <h3>{t("Referral Details")}</h3>
        <div className="detail-row">
          <strong>{t("Priority:")}</strong>
          <span>{referral.urgency || "—"}</span>
        </div>
        <div className="detail-row">
          <strong>{t("Receiving Hospital:")}</strong>
          <span>{referral.destination_hospital || "Not specified"}</span>
        </div>
        <div className="detail-row">
          <strong>{t("Status:")}</strong>
          <span>{referral.workflow_status}</span>
        </div>
        <div className="detail-row">
          <strong>{t("Date:")}</strong>
          <span>{referral.created_at ? new Date(referral.created_at).toLocaleDateString() : "—"}</span>
        </div>
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
        <div className="details-card">
          <h3>{t("Hospital Feedback")}</h3>

          <div className="detail-row">
            <strong>{t("Date:")}</strong>
            <span>{referral.feedback_at ? new Date(referral.feedback_at).toLocaleString() : "—"}</span>
          </div>

          <div className="detail-row">
            <strong>{t("Outcome:")}</strong>
            <span>{referral.treatment_status || "—"}</span>
          </div>

          <div style={{ marginTop: "12px" }}>
            <strong>{t("Clinical Notes")}</strong>
            <p style={{ marginTop: "8px" }}>
              {referral.hospital_notes || t("No notes available.")}
            </p>
          </div>
        </div>
      )}

      {/* RETURN REFERRAL */}
      {returnReferral && (
        <div className="details-card">
          <h3>{t("Return Instructions from Hospital")}</h3>

          <div className="detail-row">
            <strong>{t("Follow-up urgency:")}</strong>
            <span>{returnReferral.follow_up_urgency}</span>
          </div>

          {returnReferral.next_appointment_date && (
            <div className="detail-row">
              <strong>{t("Next appointment:")}</strong>
              <span>{returnReferral.next_appointment_date}</span>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <strong>{t("Instructions")}</strong>
            <p style={{ marginTop: 8, color: "#475569" }}>{returnReferral.follow_up_instructions}</p>
          </div>

          {returnReferral.medications_prescribed && (
            <div style={{ marginTop: 8 }}>
              <strong>{t("Medications")}</strong>
              <p style={{ marginTop: 8, color: "#475569" }}>{returnReferral.medications_prescribed}</p>
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
