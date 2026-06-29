import QRCode from "react-qr-code";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function QRView() {
  const navigate = useNavigate();

  const [referral, setReferral] =
    useState<any>(null);

  const [patient, setPatient] =
    useState<any>(null);

  useEffect(() => {
    const loadData = async () => {

      const referrals =
        await db.referrals.toArray();

      if (referrals.length === 0)
        return;

      const latestReferral =
        referrals[
          referrals.length - 1
        ];

      setReferral(latestReferral);

      const patientData =
        await db.patients.get(
          latestReferral.patientId
        );

      setPatient(patientData);
    };

    loadData();
  }, []);

  if (!referral || !patient) {
    return (
      <div className="patient-search-page">

        <h2>
          No Referral Found
        </h2>

        <button
          className="login-btn-v2"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          Return to Dashboard
        </button>

      </div>
    );
  }

  const qrPayload = {
    referralId: referral.id,

    patient,

    diagnosis:
      referral.diagnosis,

    urgency:
      referral.urgency,

    hospital:
      referral.hospital,

    createdAt:
      referral.time,
  };

  return (
    <div className="patient-search-page">

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ←
        </button>

        <div>
          <h1>
            Referral Created
          </h1>

          <p>
            Present this QR code
            at the receiving
            hospital
          </p>
        </div>

      </div>

      {/* SUCCESS CARD */}

      <div className="login-card-v2">

        <h3>
          Referral Successfully
          Created
        </h3>

        <p>
          Referral ID:
          {" "}
          {referral.id}
        </p>

      </div>

      {/* QR */}

      <div
        className="login-card-v2"
        style={{
          marginTop: "20px",
          textAlign: "center",
        }}
      >
        <QRCode
          value={JSON.stringify(
            qrPayload
          )}
          size={220}
        />
      </div>

      {/* PATIENT */}

      <div
        className="login-card-v2"
        style={{
          marginTop: "20px",
        }}
      >
        <h3>
          Patient Information
        </h3>

        <p>
          <strong>Name:</strong>
          {" "}
          {patient.fullName}
        </p>

        <p>
          <strong>Gender:</strong>
          {" "}
          {patient.gender}
        </p>

        <p>
          <strong>Phone:</strong>
          {" "}
          {patient.phoneNumber}
        </p>

      </div>

      {/* REFERRAL */}

      <div
        className="login-card-v2"
        style={{
          marginTop: "20px",
        }}
      >
        <h3>
          Referral Details
        </h3>

        <p>
          <strong>
            Diagnosis:
          </strong>
          {" "}
          {referral.diagnosis}
        </p>

        <p>
          <strong>
            Urgency:
          </strong>
          {" "}
          {referral.urgency}
        </p>

        <p>
          <strong>
            Destination:
          </strong>
          {" "}
          {referral.hospital}
        </p>

      </div>

      <button
        className="login-btn-v2"
        style={{
          marginTop: "20px",
        }}
        onClick={() =>
          navigate("/dashboard")
        }
      >
        Return to Dashboard
      </button>

    </div>
  );
}

export default QRView;