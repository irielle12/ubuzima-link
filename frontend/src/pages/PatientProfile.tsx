import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Phone, User, Calendar, CreditCard, Hash } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { getPatientById, getPatientReferrals } from "../services/patientApi";

function PatientProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();

  const [patient, setPatient] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (id) { loadPatient(); loadReferrals(); }
  }, [id]);

  const loadPatient = async () => {
    try { setPatient(await getPatientById(id!)); } catch (err) { console.error(err); }
  };

  const loadReferrals = async () => {
    try { setReferrals(await getPatientReferrals(id!)); } catch (err) { console.error(err); }
  };

  if (!patient) return <div className="patient-search-page">{t("Loading...")}</div>;

  const activeDraft = referrals.find((r) => r.workflow_status === "Draft");
  const activeReferral = referrals.find(
    (r) => r.workflow_status !== "Closed" && r.workflow_status !== "Draft"
  );

  const getUrgencyClass = (urgency: string) => {
    if (urgency === "Emergency") return "emergency";
    if (urgency === "Urgent") return "urgent";
    return "routine";
  };

  const initials = `${patient.first_name?.[0] || ""}${patient.last_name?.[0] || ""}`.toUpperCase();

  const infoRows = [
    { icon: <CreditCard size={14} />, label: patient.national_id ? t("National ID:") : t("Guardian National ID:"), value: patient.national_id || patient.guardian_national_id || "—" },
    { icon: <Phone size={14} />, label: t("Phone:"), value: patient.phone || "—" },
    { icon: <User size={14} />, label: t("Gender:"), value: patient.gender || "—" },
    { icon: <Calendar size={14} />, label: t("Date of Birth:"), value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—" },
    { icon: <Hash size={14} />, label: t("Patient Number:"), value: patient.patient_number },
  ];

  return (
    <div className="patient-search-page" style={{ background: "#f1f5f9" }}>

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate("/patient-search")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{t("Patient Profile")}</h1>
        </div>
      </div>

      {/* AVATAR + NAME */}
      <div style={{ textAlign: "center", padding: "20px 20px 20px" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "#0891b2", color: "white",
          fontSize: 24, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          {initials || <User size={24} />}
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          {patient.first_name} {patient.last_name}
        </h2>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#0891b2",
          background: "#e0f2fe", padding: "3px 12px",
          borderRadius: 20, display: "inline-block",
        }}>
          {patient.gender || "Patient"}
        </span>
      </div>

      {/* INFO CARD */}
      <div style={{ margin: "0 16px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0" }}>
        {infoRows.map((row, i) => (
          <div key={row.label} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            borderBottom: i < infoRows.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>{row.icon}</span>
            <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* REFERRAL HISTORY */}
      <div style={{ margin: "16px 16px 0" }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("Referral History")}
        </p>

        {referrals.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 16px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {t("No referrals found.")}
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {referrals.map((ref, i) => (
              <div
                key={ref.id}
                onClick={() => navigate(`/referral-details/${ref.id}`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", cursor: "pointer",
                  borderBottom: i < referrals.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{ref.referral_number}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>{new Date(ref.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span className={`status-chip ${getUrgencyClass(ref.urgency)}`}>{ref.urgency}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{ref.workflow_status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE REFERRAL */}
      <div style={{ margin: "16px 16px 32px" }}>
        <button
          style={{
            width: "100%", padding: "13px",
            borderRadius: 12, border: "none",
            background: "#2563eb", color: "white",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          onClick={() => {
            localStorage.setItem("selectedPatient", JSON.stringify(patient));
            if (activeDraft || activeReferral) { setShowWarning(true); return; }
            navigate("/new-referral");
          }}
        >
          <Plus size={16} />
          {t("Create New Referral")}
        </button>
      </div>

      {/* DRAFT WARNING MODAL */}
      {showWarning && activeDraft && (
        <div className="warning-modal">
          <div className="warning-card">
            <h3>{t("Draft Referral Exists")}</h3>
            <p>{activeDraft.referral_number}</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>
              {t("This patient already has an unsubmitted draft referral. Continue it instead of starting a new one.")}
            </p>
            <div className="warning-actions">
              <button className="primary-action-btn" onClick={() => navigate(`/referral-details/${activeDraft.id}`)}>
                {t("Open Draft")}
              </button>
              <button className="secondary-action-btn" onClick={() => setShowWarning(false)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE REFERRAL WARNING MODAL */}
      {showWarning && !activeDraft && activeReferral && (
        <div className="warning-modal">
          <div className="warning-card">
            <h3>{t("Active Referral Exists")}</h3>
            <p>{activeReferral.referral_number}</p>
            <div className="warning-actions">
              <button className="secondary-action-btn" onClick={() => navigate(`/referral-details/${activeReferral.id}`)}>
                {t("Open Existing")}
              </button>
              <button className="primary-action-btn" onClick={() => navigate("/new-referral")}>
                {t("Create New Anyway")}
              </button>
              <button className="secondary-action-btn" onClick={() => setShowWarning(false)}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PatientProfile;
