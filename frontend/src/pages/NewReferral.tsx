import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createReferral, updateReferralStatus } from "../services/referralApi";
import { getHospitals, getFacilityById, getHospitalCapacity } from "../services/facilityApi";
import { getUser } from "../services/authApi";
import { db } from "../services/db";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { User, CreditCard, Clock, UserCheck, Phone, MapPin } from "lucide-react";

function calcAge(dob: string | undefined): string {
  if (!dob) return "—";
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
  if (isNaN(years)) return "—";
  if (years === 0) {
    const months = Math.floor(ms / (30.44 * 24 * 60 * 60 * 1000));
    return `${months} month${months !== 1 ? "s" : ""}`;
  }
  return `${years} year${years !== 1 ? "s" : ""}`;
}

function generateReferralNumber(): string {
  return "REF-" + Date.now();
}

function NewReferral() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { error: notifyError, confirm } = useNotification();
  const patient = JSON.parse(localStorage.getItem("selectedPatient") || "{}");
  const currentUser = getUser();

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
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [referringFacilityName, setReferringFacilityName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const hospitalList = await getHospitals();
      setHospitals(hospitalList);
      await db.facilities.bulkPut(hospitalList);
    } catch (err) {
      console.error(err);
      try {
        // The same facilities cache also holds this worker's own referring
        // facility (put separately below), which is a Health Post, not a
        // destination hospital — filter it back out, matching the server's
        // own `type = 'DISTRICT_HOSPITAL'` restriction in getHospitals().
        const cached = (await db.facilities.toArray()).filter(
          (f) => f.type === "DISTRICT_HOSPITAL"
        );
        setHospitals(cached);
      } catch (dbErr) {
        console.error(dbErr);
      }
    }

    try {
      if (currentUser?.facilityId) {
        const facility = await getFacilityById(currentUser.facilityId);
        setReferringFacilityName(facility.name);
        await db.facilities.put({ id: currentUser.facilityId, ...facility });
      }
    } catch (err) {
      console.error(err);
      try {
        if (currentUser?.facilityId) {
          const cached = await db.facilities.get(currentUser.facilityId);
          if (cached) setReferringFacilityName(cached.name);
        }
      } catch (dbErr) {
        console.error(dbErr);
      }
    }
  };

  const checkCapacity = async (facilityId: string, currentUrgency: string) => {
    if (!facilityId) { setCapacityWarning(null); return; }
    try {
      const data = await getHospitalCapacity(facilityId);
      const level = data.capacity_status?.[currentUrgency];
      if (level === "unavailable") {
        setCapacityWarning(`${data.name} is NOT accepting ${currentUrgency} referrals. You may still send this referral.`);
      } else if (level === "limited") {
        setCapacityWarning(`${data.name} has LIMITED capacity for ${currentUrgency} referrals.`);
      } else {
        setCapacityWarning(null);
      }
    } catch { setCapacityWarning(null); }
  };

  const getHospitalName = () =>
    hospitals.find((h) => String(h.id) === String(destinationFacilityId))?.name || "Unknown Hospital";

  const patientName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim();
  const patientAge = calcAge(patient.date_of_birth);
  const referringProvider = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.staffId})`
    : "—";

  const buildQrPayload = (referralNumber: string, destinationHospital: string, synced: boolean) => ({
    referralNumber, synced,
    patientName, patientAge,
    patientGender: patient.gender || "",
    patientPhone: patient.phone || "",
    chiefComplaint, diagnosis, urgency,
    referringFacility: referringFacilityName || "Health Post",
    sourceFacilityId: currentUser?.facilityId,
    destinationHospital,
    referralDate: new Date().toLocaleDateString(),
  });

  const handleSubmit = async () => {
    if (!chiefComplaint || !diagnosis || !urgency || !destinationFacilityId) {
      notifyError(t("Please complete: Chief Complaint, Provisional Diagnosis, Priority Level, and Receiving Hospital."));
      return;
    }

    const destinationHospital = getHospitalName();
    const referralNumber = generateReferralNumber();

    // Skip the network entirely when offline, or when the patient is still an
    // unsynced local draft (there's no server-side patient row to reference
    // yet) — go straight to the local draft + QR flow.
    // Don't rely on catch alone: local backends (dev) succeed even without internet.
    const patientIsLocalOnly = String(patient.id).startsWith("LOCAL-");
    if (!navigator.onLine || patientIsLocalOnly) {
      setSubmitting(true);
      try {
        const localRecord = {
          id: "LOCAL-" + Date.now(),
          patientId: String(patient.id),
          referralNumber,
          chiefComplaint, medicalHistory,
          diagnosis,
          vitalBp, vitalHeartRate, vitalTemperature, vitalRespiratoryRate, actionTaken,
          urgency,
          hospital: destinationHospital,
          referringFacility: referringFacilityName,
          referringProvider,
          destinationFacilityId: String(destinationFacilityId),
          workflowStatus: "Pending Sync" as const,
          syncStatus: "Pending" as const,
          synced: false,
          time: new Date().toLocaleString(),
          patientName, patientAge,
          patientGender: patient.gender,
          patientPhone: patient.phone,
        };
        await db.referrals.put(localRecord);
        navigate("/qr-view", {
          state: {
            qrPayload: buildQrPayload(referralNumber, destinationHospital, false),
            displayData: { referral: localRecord, patient, hospitalName: destinationHospital },
            offline: true,
          },
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);

      const referral = await createReferral({
        patientId: patient.id,
        chiefComplaint, medicalHistory,
        vitalBp, vitalHeartRate, vitalTemperature, vitalRespiratoryRate,
        diagnosis, actionTaken, urgency,
        destinationFacilityId,
        sourceFacilityId: currentUser?.facilityId,
        referralNumber,
      });

      // Only promote Draft → Pending Hospital Review. If createReferral returned
      // an already-existing referral (idempotent retry), it may have already
      // moved further along — don't clobber that progress.
      if (referral.workflow_status === "Draft") {
        await updateReferralStatus(referral.id, "Pending Hospital Review");
      }

      const finalStatus =
        referral.workflow_status === "Draft" ? "Pending Hospital Review" : referral.workflow_status;

      await db.referrals.put({
        id: String(referral.id),
        patientId: String(patient.id),
        referralNumber: referral.referral_number,
        chiefComplaint, medicalHistory,
        diagnosis: referral.diagnosis,
        vitalBp, vitalHeartRate, vitalTemperature, vitalRespiratoryRate, actionTaken,
        urgency: referral.urgency,
        hospital: destinationHospital,
        referringFacility: referringFacilityName,
        referringProvider,
        destinationFacilityId: String(destinationFacilityId),
        workflowStatus: finalStatus,
        syncStatus: "Synced",
        synced: true,
        time: referral.created_at || new Date().toLocaleString(),
        patientName, patientAge,
        patientGender: patient.gender,
        patientPhone: patient.phone,
      });

      navigate(`/referral-details/${referral.id}`, { state: { submitted: true } });
    } catch (err: any) {
      if (err.existingDraftId) {
        const openDraft = await confirm(`${err.message} Open the existing draft instead?`, {
          confirmLabel: t("Open Draft"),
          cancelLabel: t("Cancel"),
        });
        if (openDraft) navigate(`/referral-details/${err.existingDraftId}`);
        return;
      }

      if (err.name === "TypeError" || err.message === "Failed to fetch") {
        const localRecord = {
          id: "LOCAL-" + Date.now(),
          patientId: String(patient.id),
          referralNumber,
          chiefComplaint, medicalHistory,
          diagnosis,
          vitalBp, vitalHeartRate, vitalTemperature, vitalRespiratoryRate, actionTaken,
          urgency,
          hospital: destinationHospital,
          referringFacility: referringFacilityName,
          referringProvider,
          destinationFacilityId: String(destinationFacilityId),
          workflowStatus: "Pending Sync" as const,
          syncStatus: "Pending" as const,
          synced: false,
          time: new Date().toLocaleString(),
          patientName, patientAge,
          patientGender: patient.gender,
          patientPhone: patient.phone,
        };

        await db.referrals.put(localRecord);

        navigate("/qr-view", {
          state: {
            qrPayload: buildQrPayload(referralNumber, destinationHospital, false),
            displayData: { referral: localRecord, patient, hospitalName: destinationHospital },
            offline: true,
          },
        });
        return;
      }

      notifyError(err.message || t("Failed to create referral."));
    } finally {
      setSubmitting(false);
    }
  };

  const address = [patient.village, patient.cell, patient.sector, patient.district]
    .filter(Boolean).join(", ");

  return (
    <div className="patient-search-page">

      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate("/patient-search")}>←</button>
        <div>
          <h1>{t("Create Referral")}</h1>
          <p>{t("Complete all required fields")}</p>
        </div>
      </div>

      {/* ── 1. PATIENT INFORMATION ── */}
      <div className="referral-card" style={{ padding: 0, overflow: "hidden" }}>
        <p className="referral-card-title" style={{ padding: "12px 16px 8px" }}>{t("Patient Information")}</p>

        {[
          { icon: <User size={14} />, label: t("Full Name"), value: patientName || "—" },
          { icon: <CreditCard size={14} />, label: patient.national_id ? t("National ID") : t("Guardian ID"), value: patient.national_id || patient.guardian_national_id || "—" },
          { icon: <Clock size={14} />, label: t("Age"), value: patientAge },
          { icon: <UserCheck size={14} />, label: t("Gender"), value: patient.gender || "—" },
          { icon: <Phone size={14} />, label: t("Phone"), value: patient.phone || "—" },
          ...(address ? [{ icon: <MapPin size={14} />, label: t("Address"), value: address }] : []),
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 16px",
            borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>{row.icon}</span>
            <span style={{ fontSize: 13, color: "#64748b", flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* ── 2. CLINICAL INFORMATION ── */}
      <div className="referral-card">
        <p className="referral-card-title">{t("Clinical Information")}</p>

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

      {/* ── 3. VITAL SIGNS ── */}
      <div className="referral-card">
        <p className="referral-card-title">{t("Clinical Findings — Vital Signs")}</p>

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

      {/* ── 4. ASSESSMENT & PLAN ── */}
      <div className="referral-card">
        <p className="referral-card-title">{t("Assessment & Plan")}</p>

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

      {/* ── 5. REFERRAL DETAILS ── */}
      <div className="referral-card">
        <p className="referral-card-title">{t("Referral Details")}</p>

        <label>{t("Priority Level")} <span style={{ color: "#dc2626" }}>*</span></label>
        <select
          value={urgency}
          onChange={(e) => {
            setUrgency(e.target.value);
            checkCapacity(destinationFacilityId, e.target.value);
          }}
        >
          <option value="">{t("Select Priority")}</option>
          <option value="Routine">{t("Routine — non-urgent, can wait")}</option>
          <option value="Urgent">{t("Urgent — needs attention within 24–48 hrs")}</option>
          <option value="Emergency">{t("Emergency — requires immediate attention")}</option>
        </select>

        <label>{t("Receiving Hospital")} <span style={{ color: "#dc2626" }}>*</span></label>
        <select
          value={destinationFacilityId}
          onChange={(e) => {
            setDestinationFacilityId(e.target.value);
            checkCapacity(e.target.value, urgency);
          }}
        >
          <option value="">{t("Select Hospital")}</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        {capacityWarning && (
          <div className="referral-capacity-warning">⚠️ {capacityWarning}</div>
        )}

        <div className="auto-filled-panel">
          <div className="detail-row">
            <strong>{t("Referring Facility")}</strong>
            <span>{referringFacilityName || t("Loading…")}</span>
          </div>
          <div className="detail-row">
            <strong>{t("Referring Provider")}</strong>
            <span>{referringProvider}</span>
          </div>
        </div>

        <button
          className="referral-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t("Creating…") : t("Create Referral")}
        </button>
      </div>

    </div>
  );
}

export default NewReferral;
