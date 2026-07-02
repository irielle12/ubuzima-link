import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

import {
  getPatientById,
  getPatientReferrals,
} from "../services/patientApi";

function PatientProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();

  const [patient, setPatient] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (id) {
      loadPatient();
      loadReferrals();
    }
  }, [id]);

  const loadPatient = async () => {
    try {
      const data = await getPatientById(id!);
      setPatient(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReferrals = async () => {
    try {
      const data = await getPatientReferrals(id!);
      setReferrals(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!patient) {
    return <div className="patient-search-page">{t("Loading...")}</div>;
  }

  const activeDraft = referrals.find((r) => r.workflow_status === "Draft");
  const activeReferral = referrals.find(
    (r) => r.workflow_status !== "Closed" && r.workflow_status !== "Draft"
  );

  const getUrgencyClass = (urgency: string) => {
    if (urgency === "Emergency") return "emergency";
    if (urgency === "Urgent") return "urgent";
    return "routine";
  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate("/patient-search")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{patient.first_name} {patient.last_name}</h1>
          <p>{t("Patient Profile")}</p>
        </div>
      </div>

      {/* PATIENT INFO CARD */}
      <div className="details-card">
        <h3>{t("Patient Information")}</h3>

        <div className="detail-row">
          <strong>{t("Full Name:")}</strong>
          <span>{patient.first_name} {patient.last_name}</span>
        </div>

        {patient.national_id ? (
          <div className="detail-row">
            <strong>{t("National ID:")}</strong>
            <span>{patient.national_id}</span>
          </div>
        ) : (
          <div className="detail-row">
            <strong>{t("Guardian National ID:")}</strong>
            <span>{patient.guardian_national_id || "—"}</span>
          </div>
        )}

        <div className="detail-row">
          <strong>{t("Phone:")}</strong>
          <span>{patient.phone || "—"}</span>
        </div>

        <div className="detail-row">
          <strong>{t("Gender:")}</strong>
          <span>{patient.gender || "—"}</span>
        </div>

        <div className="detail-row">
          <strong>{t("Date of Birth:")}</strong>
          <span>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"}</span>
        </div>

        <div className="detail-row">
          <strong>{t("Patient Number:")}</strong>
          <span>{patient.patient_number}</span>
        </div>
      </div>

      {/* REFERRAL HISTORY */}
      <div className="details-card">
        <h3>{t("Referral History")}</h3>

        {referrals.length === 0 ? (
          <p>{t("No referrals found.")}</p>
        ) : (
          referrals.map((ref) => (
            <div
              key={ref.id}
              className="history-row clickable-history-row"
              onClick={() => navigate(`/referral-details/${ref.id}`)}
            >
              <div>
                <strong>{ref.referral_number}</strong>
                <p>{ref.workflow_status}</p>
                <small>{new Date(ref.created_at).toLocaleDateString()}</small>
              </div>
              <div className={`status-chip ${getUrgencyClass(ref.urgency)}`}>
                {ref.urgency}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE REFERRAL BUTTON */}
      <div className="actions-container">
        <button
          className="primary-action-btn"
          onClick={() => {
            localStorage.setItem("selectedPatient", JSON.stringify(patient));
            if (activeDraft || activeReferral) {
              setShowWarning(true);
              return;
            }
            navigate("/new-referral");
          }}
        >
          <Plus size={18} />
          {t("Create New Referral")}
        </button>
      </div>

      {/* DRAFT EXISTS - HARD STOP, NO BYPASS */}
      {showWarning && activeDraft && (
        <div className="warning-modal">
          <div className="warning-card">
            <h3>{t("Draft Referral Exists")}</h3>
            <p>{activeDraft.referral_number}</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>
              {t("This patient already has an unsubmitted draft referral. Continue it instead of starting a new one.")}
            </p>
            <div className="warning-actions">
              <button
                className="primary-action-btn"
                onClick={() => navigate(`/referral-details/${activeDraft.id}`)}
              >
                {t("Open Draft")}
              </button>
              <button
                className="secondary-action-btn"
                onClick={() => setShowWarning(false)}
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTHER ACTIVE REFERRAL - SOFT WARNING */}
      {showWarning && !activeDraft && activeReferral && (
        <div className="warning-modal">
          <div className="warning-card">
            <h3>{t("Active Referral Exists")}</h3>
            <p>{activeReferral.referral_number}</p>
            <div className="warning-actions">
              <button
                className="secondary-action-btn"
                onClick={() => navigate(`/referral-details/${activeReferral.id}`)}
              >
                {t("Open Existing")}
              </button>
              <button
                className="primary-action-btn"
                onClick={() => navigate("/new-referral")}
              >
                {t("Create New Anyway")}
              </button>
              <button
                className="secondary-action-btn"
                onClick={() => setShowWarning(false)}
              >
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
