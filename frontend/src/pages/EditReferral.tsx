import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReferralById, updateReferral } from "../services/referralApi";
import { getHospitals } from "../services/facilityApi";
import { db } from "../services/db";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { AlertTriangle } from "lucide-react";
import Loader from "../components/Loader";

// "Pending Hospital Review" alone isn't enough — that status persists for
// the entire waiting period, so a referral the hospital already opened
// (hospital_viewed_at set) must not stay editable even though its status
// hasn't moved yet.
function isEditable(referral: any) {
  const status = referral.workflow_status;
  return (
    status === "Draft" ||
    status === "Pending Sync" ||
    (status === "Pending Hospital Review" && !referral.hospital_viewed_at)
  );
}

function EditReferral() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();
  const { error: notifyError, success } = useNotification();

  const isLocal = String(id).startsWith("LOCAL-");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notEditable, setNotEditable] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [vitalBp, setVitalBp] = useState("");
  const [vitalHeartRate, setVitalHeartRate] = useState("");
  const [vitalTemperature, setVitalTemperature] = useState("");
  const [vitalRespiratoryRate, setVitalRespiratoryRate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [urgency, setUrgency] = useState("");
  const [destinationFacilityId, setDestinationFacilityId] = useState("");

  useEffect(() => {
    if (id) load();
    loadHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadHospitals = async () => {
    try {
      const list = await getHospitals();
      setHospitals(list);
    } catch {
      try {
        const cached = (await db.facilities.toArray()).filter(
          (f) => f.type === "DISTRICT_HOSPITAL"
        );
        setHospitals(cached);
      } catch {
        setHospitals([]);
      }
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      if (isLocal) {
        const rec = await db.referrals.get(id as string);
        if (!rec) {
          notifyError(t("Referral not found."));
          navigate(-1);
          return;
        }
        setPatientName(rec.patientName || "");
        setChiefComplaint(rec.chiefComplaint || "");
        setMedicalHistory(rec.medicalHistory || "");
        setVitalBp(rec.vitalBp || "");
        setVitalHeartRate(rec.vitalHeartRate || "");
        setVitalTemperature(rec.vitalTemperature || "");
        setVitalRespiratoryRate(rec.vitalRespiratoryRate || "");
        setDiagnosis(rec.diagnosis || "");
        setActionTaken(rec.actionTaken || "");
        setUrgency(rec.urgency || "");
        setDestinationFacilityId(rec.destinationFacilityId || "");
        return;
      }

      let data: any;
      try {
        data = await getReferralById(id as string);
      } catch (err) {
        const cached = await db.cachedReferrals.get(Number(id));
        if (!cached) throw err;
        data = cached;
      }

      setPatientName(`${data.first_name || ""} ${data.last_name || ""}`.trim());

      if (!isEditable(data)) {
        setNotEditable(true);
        return;
      }

      setChiefComplaint(data.chief_complaint || "");
      setMedicalHistory(data.medical_history || "");
      setVitalBp(data.vital_bp || "");
      setVitalHeartRate(data.vital_heart_rate || "");
      setVitalTemperature(data.vital_temperature || "");
      setVitalRespiratoryRate(data.vital_respiratory_rate || "");
      setDiagnosis(data.diagnosis || "");
      setActionTaken(data.action_taken || "");
      setUrgency(data.urgency || "");
      setDestinationFacilityId(String(data.destination_facility_id || ""));
    } catch (err: any) {
      notifyError(err.message || t("Failed to load referral."));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!chiefComplaint || !diagnosis || !urgency || !destinationFacilityId) {
      notifyError(t("Please complete: Chief Complaint, Provisional Diagnosis, Priority Level, and Receiving Hospital."));
      return;
    }

    setSubmitting(true);
    try {
      if (isLocal) {
        const hospitalName =
          hospitals.find((h) => String(h.id) === String(destinationFacilityId))?.name;

        await db.referrals.update(id as string, {
          chiefComplaint, medicalHistory,
          vitalBp, vitalHeartRate, vitalTemperature, vitalRespiratoryRate,
          diagnosis, actionTaken, urgency,
          destinationFacilityId: String(destinationFacilityId),
          ...(hospitalName ? { hospital: hospitalName } : {}),
        });

        success(t("Referral updated."));
        navigate("/sync");
        return;
      }

      if (!navigator.onLine) {
        notifyError(t("Connect to the internet to save changes to this referral."));
        return;
      }

      const updated = await updateReferral(id as string, {
        chiefComplaint, medicalHistory,
        vitalBp, vitalHeartRate, vitalTemperature, vitalRespiratoryRate,
        diagnosis, actionTaken, urgency,
        destinationFacilityId,
      });

      await db.cachedReferrals.put(updated);

      success(t("Referral updated."));
      navigate(`/referral-details/${id}`);
    } catch (err: any) {
      notifyError(err.message || t("Failed to update referral."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-search-page">
        <Loader fullPage label={t("Loading...")} />
      </div>
    );
  }

  if (notEditable) {
    return (
      <div className="patient-search-page">
        <div className="patient-header">
          <button className="back-btn-v2" onClick={() => navigate(-1)}>←</button>
          <div>
            <h1>{t("Edit Referral")}</h1>
            <p>{patientName}</p>
          </div>
        </div>
        <div className="workflow-message with-icon">
          <span className="workflow-message-icon"><AlertTriangle size={16} /></span>
          <div>
            <h4>{t("This referral can no longer be edited")}</h4>
            <p>{t("The hospital has already begun processing it.")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-search-page">

      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate(-1)}>←</button>
        <div>
          <h1>{t("Edit Referral")}</h1>
          <p>{patientName}</p>
        </div>
      </div>

      <div className="referral-card">
        <p className="referral-card-title">
          <span className="referral-card-step">1</span>
          {t("Clinical Information")}
        </p>

        <label>{t("Chief Complaint")} <span style={{ color: "#dc2626" }}>*</span></label>
        <textarea
          rows={2}
          placeholder={t("Primary reason the patient is seeking care")}
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
        />

        <label>{t("Brief Medical History")}</label>
        <textarea
          rows={2}
          placeholder={t("Relevant chronic conditions, past treatments, allergies…")}
          value={medicalHistory}
          onChange={(e) => setMedicalHistory(e.target.value)}
        />
      </div>

      <div className="referral-card">
        <p className="referral-card-title">
          <span className="referral-card-step">2</span>
          {t("Clinical Findings — Vital Signs")}
        </p>

        <div className="vitals-grid">
          <div>
            <label>{t("Blood Pressure")}</label>
            <input placeholder={t("e.g. 120/80 mmHg")} value={vitalBp} onChange={(e) => setVitalBp(e.target.value)} />
          </div>
          <div>
            <label>{t("Heart Rate")}</label>
            <input placeholder={t("e.g. 72 bpm")} value={vitalHeartRate} onChange={(e) => setVitalHeartRate(e.target.value)} />
          </div>
          <div>
            <label>{t("Temperature")}</label>
            <input placeholder={t("e.g. 37.2°C")} value={vitalTemperature} onChange={(e) => setVitalTemperature(e.target.value)} />
          </div>
          <div>
            <label>{t("Respiratory Rate")}</label>
            <input placeholder={t("e.g. 16/min")} value={vitalRespiratoryRate} onChange={(e) => setVitalRespiratoryRate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="referral-card">
        <p className="referral-card-title">
          <span className="referral-card-step">3</span>
          {t("Assessment & Plan")}
        </p>

        <label>{t("Provisional Diagnosis")} <span style={{ color: "#dc2626" }}>*</span></label>
        <textarea
          rows={2}
          placeholder={t("What do you believe the patient has?")}
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
        />

        <label>{t("Action Taken")}</label>
        <textarea
          rows={2}
          placeholder={t("Medications given, first aid, stabilization steps taken here…")}
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
        />
      </div>

      <div className={`referral-card urgency-accent ${urgency.toLowerCase()}`}>
        <p className="referral-card-title">
          <span className="referral-card-step">4</span>
          {t("Referral Details")}
        </p>

        <label>{t("Priority Level")} <span style={{ color: "#dc2626" }}>*</span></label>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option value="">{t("Select Priority")}</option>
          <option value="Routine">{t("Routine — non-urgent, can wait")}</option>
          <option value="Urgent">{t("Urgent — needs attention within 24–48 hrs")}</option>
          <option value="Emergency">{t("Emergency — requires immediate attention")}</option>
        </select>

        <label>{t("Receiving Hospital")} <span style={{ color: "#dc2626" }}>*</span></label>
        <select
          value={destinationFacilityId}
          onChange={(e) => setDestinationFacilityId(e.target.value)}
        >
          <option value="">{t("Select Hospital")}</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        <button
          className="referral-submit-btn"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? t("Saving…") : t("Save Changes")}
        </button>
      </div>

    </div>
  );
}

export default EditReferral;
