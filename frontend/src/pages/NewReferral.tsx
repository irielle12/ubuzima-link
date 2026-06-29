import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function NewReferral() {
  const navigate = useNavigate();

  const patient = JSON.parse(
    localStorage.getItem(
      "selectedPatient"
    ) || "{}"
  );

  const [diagnosis, setDiagnosis] =
    useState("");

  const [urgency, setUrgency] =
    useState("");

  const [hospital, setHospital] =
    useState("");

  const handleSubmit = async () => {
    if (
      !diagnosis ||
      !urgency ||
      !hospital
    ) {
      alert("Complete all fields");
      return;
    }

  const referral = {
  id: "UBZ-" + Date.now(),

  patientId: patient.id,

  diagnosis,

  urgency,

  hospital,

  workflowStatus: "Draft" as const,

  syncStatus: "Pending" as const,

  time:
    new Date().toLocaleString(),
};
await db.referrals.add(referral);

localStorage.setItem(
  "currentReferral",
  JSON.stringify(referral)
);

navigate("/referral-details");
  };

  return (
    <div className="patient-search-page">

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate("/patient-search")
          }
        >
          ←
        </button>

        <div>
          <h1>Create Referral</h1>

          <p>
            Referral information
          </p>
        </div>

      </div>

      {/* PATIENT CARD */}

      <div className="login-card-v2">

        <h3>
          Patient Information
        </h3>

        <p>
          <strong>Name:</strong>{" "}
          {patient.fullName}
        </p>

        <p>
          <strong>Gender:</strong>{" "}
          {patient.gender}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {patient.phoneNumber}
        </p>

        <p>
          <strong>National ID:</strong>{" "}
          {patient.nationalId}
        </p>

      </div>

      <div
        className="login-card-v2"
        style={{ marginTop: "20px" }}
      >

        <label>
          Referral Reason
        </label>

        <textarea
          value={diagnosis}
          onChange={(e) =>
            setDiagnosis(
              e.target.value
            )
          }
        />

        <label>
          Urgency
        </label>

        <select
          value={urgency}
          onChange={(e) =>
            setUrgency(
              e.target.value
            )
          }
        >
          <option value="">
            Select Urgency
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

        <label>
          Destination Hospital
        </label>

        <select
          value={hospital}
          onChange={(e) =>
            setHospital(
              e.target.value
            )
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

        <button
          className="login-btn-v2"
          onClick={handleSubmit}
        >
          Create Referral
        </button>

      </div>

    </div>
  );
}

export default NewReferral;