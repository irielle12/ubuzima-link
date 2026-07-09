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
  Hourglass, MapPinCheck, Archive, Pencil,
} from "lucide-react";

const EDITABLE_STATUSES = ["Draft", "Pending Hospital Review", "Pending Sync"];

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
        <div style={{ flex: 1 }}>
          <h1>{t("Referral Details")}</h1>
          <p>{referral.referral_number}</p>
          <ConnectionStatus />
        </div>
        {EDITABLE_STATUSES.includes(status) && (
          <button
            className="back-btn-v2"
            onClick={() => navigate(`/edit-referral/${id}`)}
            title={t("Edit Referral")}
          >
            <Pencil size={18} />
          </button>
        )}
      </div>

      {/* PATIENT INFORMATION */}
      <div className="info-card">
        <p className="info-card-title">
          <span className="info-card-icon blue"><User size={13} /></span>
          {t("Patient Information")}
        </p>
        {[
          { icon: <User size={14} />, label: t("Full Name"), value: `${referral.first_name} ${referral.last_name}` },
          { icon: <UserCheck size={14} />, label: t("Gender"), value: referral.gender || "—" },
          { icon: <Phone size={14} />, label: t("Phone"), value: referral.phone || "—" },
        ].map((row) => (
          <div key={row.label} className="info-row">
            <span className="info-row-icon">{row.icon}</span>
            <span className="info-row-label">{row.label}</span>
            <span className="info-row-value">{row.value}</span>
          </div>
        ))}
      </div>

      {/* CLINICAL INFORMATION */}
      <div className="info-card">
        <p className="info-card-title">
          <span className="info-card-icon teal"><Stethoscope size={13} /></span>
          {t("Clinical Information")}
        </p>

        {referral.chief_complaint && (
          <div className="info-block">
            <div className="info-block-label"><AlertCircle size={13} />{t("Chief Complaint")}</div>
            <p className="info-block-value">{referral.chief_complaint}</p>
          </div>
        )}

        {referral.medical_history && (
          <div className="info-block">
            <div className="info-block-label"><FileText size={13} />{t("Medical History")}</div>
            <p className="info-block-value">{referral.medical_history}</p>
          </div>
        )}

        {(referral.vital_bp || referral.vital_heart_rate || referral.vital_temperature || referral.vital_respiratory_rate) && (
          <div className="info-block">
            <div className="info-block-label" style={{ marginBottom: 8 }}><Activity size={13} />{t("Vital Signs")}</div>
            <div className="vitals-mini-grid">
              {referral.vital_bp && (
                <div className="vitals-mini-item"><span>{t("BP:")}</span><span>{referral.vital_bp}</span></div>
              )}
              {referral.vital_heart_rate && (
                <div className="vitals-mini-item"><span>{t("HR:")}</span><span>{referral.vital_heart_rate}</span></div>
              )}
              {referral.vital_temperature && (
                <div className="vitals-mini-item"><span>{t("Temp:")}</span><span>{referral.vital_temperature}</span></div>
              )}
              {referral.vital_respiratory_rate && (
                <div className="vitals-mini-item"><span>{t("RR:")}</span><span>{referral.vital_respiratory_rate}</span></div>
              )}
            </div>
          </div>
        )}

        <div className="info-block">
          <div className="info-block-label"><Stethoscope size={13} />{t("Provisional Diagnosis")}</div>
          <p className="info-block-value">{referral.diagnosis}</p>
        </div>

        {referral.action_taken && (
          <div className="info-block">
            <div className="info-block-label"><CheckCircle size={13} />{t("Action Taken")}</div>
            <p className="info-block-value">{referral.action_taken}</p>
          </div>
        )}
      </div>

      {/* REFERRAL DETAILS */}
      <div className="info-card">
        <p className="info-card-title">
          <span className="info-card-icon purple"><Building2 size={13} /></span>
          {t("Referral Details")}
        </p>
        <div className="info-row">
          <span className="info-row-icon"><AlertTriangle size={14} /></span>
          <span className="info-row-label">{t("Priority")}</span>
          <span className={`status-chip ${(referral.urgency || "").toLowerCase()}`} style={{ margin: 0 }}>
            {referral.urgency || "—"}
          </span>
        </div>
        {[
          { icon: <Building2 size={14} />, label: t("Receiving Hospital"), value: referral.destination_hospital || "—" },
          { icon: <Activity size={14} />, label: t("Status"), value: referral.workflow_status },
          { icon: <Calendar size={14} />, label: t("Date"), value: referral.created_at ? new Date(referral.created_at).toLocaleDateString() : "—" },
        ].map((row) => (
          <div key={row.label} className="info-row">
            <span className="info-row-icon">{row.icon}</span>
            <span className="info-row-label">{row.label}</span>
            <span className="info-row-value">{row.value}</span>
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
        <div className="workflow-message with-icon">
          <span className="workflow-message-icon"><Hourglass size={16} /></span>
          <div>
            <h4>{t("Awaiting Hospital Review")}</h4>
            <p>{t("The referral has been submitted and is awaiting review by the receiving hospital.")}</p>
          </div>
        </div>
      )}

      {/* ARRIVED */}
      {status === "Arrived" && (
        <div className="workflow-message with-icon">
          <span className="workflow-message-icon"><MapPinCheck size={16} /></span>
          <div>
            <h4>{t("Patient Has Arrived")}</h4>
            <p>
              {referral.first_name} {referral.last_name} arrived at{" "}
              {referral.destination_hospital || "the receiving hospital"}
              {referral.arrived_at ? ` on ${new Date(referral.arrived_at).toLocaleString()}` : ""}.
            </p>
          </div>
        </div>
      )}

      {/* HOSPITAL FEEDBACK (Closed with feedback) */}
      {status === "Closed" && hasFeedback(referral) && (
        <div className="info-card">
          <p className="info-card-title">
            <span className="info-card-icon green"><CheckCircle size={13} /></span>
            {t("Hospital Feedback")}
          </p>

          {[
            { icon: <Calendar size={14} />, label: t("Date:"), value: referral.feedback_at ? new Date(referral.feedback_at).toLocaleString() : "—" },
            { icon: <CheckCircle size={14} />, label: t("Outcome:"), value: referral.treatment_status || "—" },
          ].map((row) => (
            <div key={row.label} className="info-row">
              <span className="info-row-icon">{row.icon}</span>
              <span className="info-row-label">{row.label}</span>
              <span className="info-row-value">{row.value}</span>
            </div>
          ))}

          <div className="info-block">
            <div className="info-block-label"><FileText size={13} />{t("Clinical Notes")}</div>
            <p className="info-block-value">{referral.hospital_notes || t("No notes available.")}</p>
          </div>
        </div>
      )}

      {/* RETURN REFERRAL */}
      {returnReferral && (
        <div className="info-card">
          <p className="info-card-title">
            <span className="info-card-icon amber"><AlertTriangle size={13} /></span>
            {t("Return Instructions from Hospital")}
          </p>

          {[
            { icon: <AlertTriangle size={14} />, label: t("Follow-up urgency:"), value: returnReferral.follow_up_urgency },
            ...(returnReferral.next_appointment_date
              ? [{ icon: <Calendar size={14} />, label: t("Next appointment:"), value: returnReferral.next_appointment_date }]
              : []),
          ].map((row) => (
            <div key={row.label} className="info-row">
              <span className="info-row-icon">{row.icon}</span>
              <span className="info-row-label">{row.label}</span>
              <span className="info-row-value">{row.value}</span>
            </div>
          ))}

          <div className="info-block">
            <div className="info-block-label"><FileText size={13} />{t("Instructions")}</div>
            <p className="info-block-value">{returnReferral.follow_up_instructions}</p>
          </div>

          {returnReferral.medications_prescribed && (
            <div className="info-block">
              <div className="info-block-label"><FileText size={13} />{t("Medications")}</div>
              <p className="info-block-value">{returnReferral.medications_prescribed}</p>
            </div>
          )}
        </div>
      )}

      {/* CLOSED without feedback */}
      {status === "Closed" && !hasFeedback(referral) && (
        <div className="workflow-message closed with-icon">
          <span className="workflow-message-icon"><Archive size={16} /></span>
          <div>
            <h4>{t("Referral Closed")}</h4>
            <p>{t("Treated — no detailed feedback provided.")}</p>
          </div>
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
