import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { createPatient } from "../services/patientApi";
import type { PatientDuplicate } from "../services/patientApi";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { db } from "../services/db";

function CreatePatient() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const { t } = useLanguage();
  const { success, error: notifyError } = useNotification();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [guardianNationalId, setGuardianNationalId] = useState("");
  const [isBaby, setIsBaby] = useState(false);
  const [duplicate, setDuplicate] = useState<PatientDuplicate | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const MAX_AGE_YEARS = 120;
  const minDob = new Date(
    new Date().getFullYear() - MAX_AGE_YEARS,
    new Date().getMonth(),
    new Date().getDate()
  )
    .toISOString()
    .split("T")[0];

  const handleSave = async () => {
    if (!fullName || !gender || !dateOfBirth) {
      notifyError(t("Please fill in name, gender, and date of birth."));
      return;
    }

    if (Number.isNaN(new Date(dateOfBirth).getTime())) {
      notifyError(t("Please enter a valid date of birth."));
      return;
    }

    if (dateOfBirth > today) {
      notifyError(t("Date of birth cannot be in the future."));
      return;
    }

    if (dateOfBirth < minDob) {
      notifyError(t(`Date of birth cannot be more than ${MAX_AGE_YEARS} years ago.`));
      return;
    }

    if (!isBaby && nationalId.length !== 16) {
      notifyError(t("National ID must be 16 digits."));
      return;
    }

    if (isBaby && guardianNationalId.length !== 16) {
      notifyError(t("Guardian's National ID must be 16 digits."));
      return;
    }

    if (phoneNumber && phoneNumber.length !== 9) {
      notifyError(t("Phone number must be 9 digits (after +250)."));
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const buildLocalPatient = () => ({
      id: "LOCAL-" + Date.now(),
      patient_number: "PAT-" + Date.now(),
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "-",
      gender,
      date_of_birth: dateOfBirth,
      phone: phoneNumber ? "+250" + phoneNumber : "",
      national_id: isBaby ? "" : nationalId,
      guardian_national_id: isBaby ? guardianNationalId : "",
      synced: false,
    });

    // Skip the network entirely when offline — save locally right away.
    if (!navigator.onLine) {
      const localPatient = buildLocalPatient();
      await db.patients.put(localPatient);
      localStorage.setItem("selectedPatient", JSON.stringify(localPatient));
      success(t("Patient registered successfully."));

      if (mode === "referral") {
        navigate("/new-referral");
      } else {
        navigate("/dashboard");
      }
      return;
    }

    try {
      const patient = await createPatient({
        fullName,
        gender,
        dateOfBirth,
        phoneNumber: phoneNumber ? "+250" + phoneNumber : "",
        nationalId: isBaby ? "" : nationalId,
        guardianNationalId: isBaby ? guardianNationalId : "",
      });

      await db.patients.put({ ...patient, synced: true });
      localStorage.setItem("selectedPatient", JSON.stringify(patient));
      success(t("Patient registered successfully."));

      if (mode === "referral") {
        navigate("/new-referral");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      if (err.existingPatient) {
        setDuplicate(err.existingPatient);
        return;
      }

      if (err.name === "TypeError" || err.message === "Failed to fetch") {
        const localPatient = buildLocalPatient();
        await db.patients.put(localPatient);
        localStorage.setItem("selectedPatient", JSON.stringify(localPatient));
        success(t("Patient registered successfully."));

        if (mode === "referral") {
          navigate("/new-referral");
        } else {
          navigate("/dashboard");
        }
        return;
      }

      notifyError(err.message || t("Failed to register patient."));
    }
  };

  return (
    <div className="patient-search-page">

      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{t("Register Patient")}</h1>
          <p>{t("Create a new patient record")}</p>
        </div>
      </div>

      <div className="login-card-v2">

        {/* BABY TOGGLE */}
        <div
          className={`baby-toggle-card ${isBaby ? "active" : ""}`}
          onClick={() => {
            setIsBaby(!isBaby);
            setNationalId("");
            setGuardianNationalId("");
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isBaby ? "#2563eb" : "#e2e8f0",
              color: isBaby ? "white" : "#64748b",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <Baby size={18} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
              {t("This patient is a baby / has no National ID")}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("Use parent or guardian's National ID instead")}
            </p>
          </div>
        </div>

        <label>{t("Full Name")}</label>
        <input
          value={fullName}
          placeholder={t("Enter full name")}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label>{t("Gender")}</label>
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">{t("Select Gender")}</option>
          <option value="Male">{t("Male")}</option>
          <option value="Female">{t("Female")}</option>
        </select>

        <label>{t("Date of Birth")}</label>
        <input
          type="date"
          max={today}
          min={minDob}
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />

        <label>{t("Phone Number")} {isBaby ? t("(optional)") : ""}</label>
        <div className="phone-input-group">
          <span>+250</span>
          <input
            type="tel"
            maxLength={9}
            placeholder="781234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {/* NATIONAL ID — adult only */}
        {!isBaby && (
          <>
            <label>{t("National ID")}</label>
            <input
              type="text"
              maxLength={16}
              placeholder={t("16-digit National ID")}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
            />
          </>
        )}

        {/* GUARDIAN ID — baby only */}
        {isBaby && (
          <>
            <label>{t("Parent / Guardian National ID")}</label>
            <input
              type="text"
              maxLength={16}
              placeholder={t("16-digit National ID of parent or guardian")}
              value={guardianNationalId}
              onChange={(e) => setGuardianNationalId(e.target.value.replace(/\D/g, ""))}
            />
            <p style={{ fontSize: 12, color: "#64748b", margin: "-8px 0 8px" }}>
              {t("This is used to prevent duplicate registrations for the same baby.")}
            </p>
          </>
        )}

        <button className="login-btn-v2" onClick={handleSave}>
          {t("Register Patient")}
        </button>

      </div>

      {/* DUPLICATE PATIENT MODAL */}
      {duplicate && (
        <div className="warning-modal">
          <div className="warning-card">
            <h3>{t("Patient Already Registered")}</h3>
            <p style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>
              {duplicate.first_name} {duplicate.last_name}
            </p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              {duplicate.national_id
                ? `National ID ${duplicate.national_id} is already in the system.`
                : t("A patient with this guardian ID, date of birth, and name is already registered.")}
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              {t("Patient #:")} {duplicate.patient_number}
            </p>
            <div className="warning-actions">
              <button
                className="primary-action-btn"
                onClick={() => {
                  localStorage.setItem("selectedPatient", JSON.stringify(duplicate));
                  navigate(`/patient-profile/${duplicate.id}`);
                }}
              >
                {t("View Existing Patient")}
              </button>
              <button
                className="secondary-action-btn"
                onClick={() => setDuplicate(null)}
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

export default CreatePatient;
