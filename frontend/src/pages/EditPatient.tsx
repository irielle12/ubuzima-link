import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { getPatientById, updatePatient } from "../services/patientApi";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { db } from "../services/db";
import Loader from "../components/Loader";

function EditPatient() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();
  const { success, error: notifyError } = useNotification();

  const isLocal = String(id).startsWith("LOCAL-");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [original, setOriginal] = useState<any>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [guardianNationalId, setGuardianNationalId] = useState("");
  const [isBaby, setIsBaby] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const MAX_AGE_YEARS = 120;
  const minDob = new Date(
    new Date().getFullYear() - MAX_AGE_YEARS,
    new Date().getMonth(),
    new Date().getDate()
  )
    .toISOString()
    .split("T")[0];

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const populate = (patient: any) => {
    setOriginal(patient);
    setFullName(`${patient.first_name || ""} ${patient.last_name || ""}`.trim());
    setGender(patient.gender || "");
    setDateOfBirth(patient.date_of_birth ? patient.date_of_birth.split("T")[0] : "");
    setPhoneNumber((patient.phone || "").replace(/^\+250/, ""));
    setNationalId(patient.national_id || "");
    setGuardianNationalId(patient.guardian_national_id || "");
    setIsBaby(!!patient.guardian_national_id && !patient.national_id);
  };

  const load = async () => {
    setLoading(true);
    try {
      if (isLocal) {
        const cached = await db.patients.get(id as string);
        if (!cached) {
          notifyError(t("Patient not found."));
          navigate(-1);
          return;
        }
        populate(cached);
        return;
      }

      try {
        const data = await getPatientById(id as string);
        populate(data);
      } catch (err) {
        const cached = await db.patients.get(Number(id));
        if (!cached) throw err;
        populate(cached);
      }
    } catch (err: any) {
      notifyError(err.message || t("Failed to load patient."));
    } finally {
      setLoading(false);
    }
  };

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
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "-";
    const fullPhone = phoneNumber ? "+250" + phoneNumber : "";

    setSubmitting(true);
    try {
      if (isLocal) {
        const updated = {
          ...original,
          first_name: firstName,
          last_name: lastName,
          gender,
          date_of_birth: dateOfBirth,
          phone: fullPhone,
          national_id: isBaby ? "" : nationalId,
          guardian_national_id: isBaby ? guardianNationalId : "",
        };
        await db.patients.put(updated);

        const selected = JSON.parse(localStorage.getItem("selectedPatient") || "{}");
        if (String(selected.id) === String(id)) {
          localStorage.setItem("selectedPatient", JSON.stringify(updated));
        }

        success(t("Patient updated successfully."));
        navigate(`/patient-profile/${id}`);
        return;
      }

      if (!navigator.onLine) {
        notifyError(t("Connect to the internet to save changes to this patient."));
        return;
      }

      const updated = await updatePatient(id as string, {
        fullName,
        gender,
        dateOfBirth,
        phoneNumber: fullPhone,
        nationalId: isBaby ? "" : nationalId,
        guardianNationalId: isBaby ? guardianNationalId : "",
      });

      await db.patients.put({ ...updated, synced: true });

      const selected = JSON.parse(localStorage.getItem("selectedPatient") || "{}");
      if (String(selected.id) === String(id)) {
        localStorage.setItem("selectedPatient", JSON.stringify(updated));
      }

      success(t("Patient updated successfully."));
      navigate(`/patient-profile/${id}`);
    } catch (err: any) {
      notifyError(err.message || t("Failed to update patient."));
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

  return (
    <div className="patient-search-page">

      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{t("Edit Patient")}</h1>
          <p>{t("Correct this patient's information")}</p>
        </div>
      </div>

      <div className="login-card-v2">

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
          </>
        )}

        <button className="login-btn-v2" onClick={handleSave} disabled={submitting}>
          {submitting ? t("Saving…") : t("Save Changes")}
        </button>

      </div>

    </div>
  );
}

export default EditPatient;
