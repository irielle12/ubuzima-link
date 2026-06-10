import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function NewReferral() {
  const navigate = useNavigate();

  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [urgency, setUrgency] = useState("");
  const [hospital, setHospital] = useState("");

  const handleSubmit = async () => {
    if (
      !patientName ||
      !age ||
      !referralReason ||
      !urgency ||
      !hospital
    ) {
      alert("Please complete all required fields");
      return;
    }

    const referral = {
      id: "UBZ-" + Date.now(),
      patientName,
      age,
      diagnosis: referralReason,
      urgency,
      hospital,
      status: "Pending Sync" as const,
      time: new Date().toLocaleString(),
    };

    await db.referrals.add(referral);

    navigate("/qr");
  };

  return (
    <div className="referral-screen">

      {/* HEADER */}
      <div className="new-referral-header">

        <button
          className="back-circle"
          onClick={() => navigate("/dashboard")}
        >
          ←
        </button>

        <div>
          <h2>New Referral</h2>

          <p>
            Complete all required fields
          </p>

          <div className="offline-pill">
            📡 Offline Mode
          </div>
        </div>

      </div>

      {/* INFO CARD */}
      <div className="save-info-card">
        This referral will be saved locally and synced when internet is available.
      </div>

      {/* FORM */}

      <div className="form-group">
        <label>Patient Full Name *</label>

        <input
          type="text"
          placeholder="e.g. Uwimana Marie Claire"
          value={patientName}
          onChange={(e) =>
            setPatientName(e.target.value)
          }
        />
      </div>

      <div className="form-group">
        <label>Age *</label>

        <input
          type="number"
          placeholder="Enter patient age"
          value={age}
          onChange={(e) =>
            setAge(e.target.value)
          }
        />
      </div>

      <div className="form-group">
        <label>Referral Reason *</label>

        <textarea
          placeholder="Describe the patient's condition and reason for referral..."
          value={referralReason}
          onChange={(e) =>
            setReferralReason(e.target.value)
          }
        />
      </div>

      <div className="form-group">
        <label>Urgency Level *</label>

        <select
          value={urgency}
          onChange={(e) =>
            setUrgency(e.target.value)
          }
        >
          <option value="">
            Select urgency level
          </option>

          <option>
            Routine
          </option>

          <option>
            Urgent
          </option>

          <option>
            Emergency
          </option>
        </select>
      </div>

      <div className="form-group">
        <label>Destination Hospital *</label>

        <select
          value={hospital}
          onChange={(e) =>
            setHospital(e.target.value)
          }
        >
          <option value="">
            Select Hospital
          </option>

          <option>
            Kigali University Hospital
          </option>

          <option>
            Kibagabaga Hospital
          </option>

          <option>
            Masaka Hospital
          </option>

          <option>
            Kanombe Hospital
          </option>
        </select>
      </div>

      <button
        className="submit-referral-btn"
        onClick={handleSubmit}
      >
        Create Referral
      </button>

    </div>
  );
}

export default NewReferral;