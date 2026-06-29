import { useNavigate } from "react-router-dom";
import { db } from "../services/db";
import ConnectionStatus from "../components/ConnectionStatus";
import {
  House,
  FileText,
  Wifi,
  User,
} from "lucide-react";

function ReferralDetails() {
  const navigate = useNavigate();

  const referral = JSON.parse(
    localStorage.getItem(
      "currentReferral"
    ) || "{}"
  );

  const patient = JSON.parse(
    localStorage.getItem(
      "selectedPatient"
    ) || "{}"
  );

  const isOnline =
    navigator.onLine;

  const status =
    referral.workflowStatus ||
    "Draft";

  const handleSubmitReferral =
    async () => {

      const newStatus =
        isOnline
          ? "Pending Hospital Review"
          : "Pending Sync";

      await db.referrals.update(
        referral.id,
        {
          workflowStatus:
            newStatus,
        }
      );

      const updatedReferral = {
        ...referral,
        workflowStatus:
          newStatus,
      };

      localStorage.setItem(
        "currentReferral",
        JSON.stringify(
          updatedReferral
        )
      );

      if (!isOnline) {
        navigate("/qr");
        return;
      }

      alert(
        "Referral submitted successfully."
      );

      navigate(
        "/queue-review"
      );
    };

  return (
    <div className="patient-search-page">

      {/* HEADER */}

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate(-1)
          }
        >
          ←
        </button>

        <div>

          <h1>
            Referral Details
          </h1>

          <p>
            Review referral information
          </p>

          <ConnectionStatus />

        </div>

      </div>

      {/* STATUS */}

      <div className="status-card">

        <div>

          <p className="status-label">
            Status
          </p>

          <div className="status-badge draft">
            {status}
          </div>

        </div>

      </div>

      {/* PATIENT */}

      <div className="details-card">

        <h3>
          Patient Information
        </h3>

        <div className="detail-row">

          <strong>
            Name:
          </strong>

          <span>
            {patient.fullName}
          </span>

        </div>

        <div className="detail-row">

          <strong>
            Gender:
          </strong>

          <span>
            {patient.gender}
          </span>

        </div>

        <div className="detail-row">

          <strong>
            Phone:
          </strong>

          <span>
            {patient.phoneNumber}
          </span>

        </div>

      </div>

      {/* REFERRAL */}

      <div className="details-card">

        <h3>
          Referral Information
        </h3>

        <div className="detail-row">

          <strong>
            Diagnosis:
          </strong>

          <span>
            {referral.diagnosis}
          </span>

        </div>

        <div className="detail-row">

          <strong>
            Urgency:
          </strong>

          <span>
            {referral.urgency}
          </span>

        </div>

        <div className="detail-row">

          <strong>
            Hospital:
          </strong>

          <span>
            {referral.hospital}
          </span>

        </div>

      </div>

      {/* DRAFT ACTIONS */}

      {status === "Draft" && (

        <div className="actions-container">

          <button
            className="secondary-action-btn"
            onClick={() =>
              navigate(
                "/new-referral"
              )
            }
          >
            Edit Referral
          </button>

          <button
            className="primary-action-btn"
            onClick={
              handleSubmitReferral
            }
          >
            Submit Referral
          </button>

        </div>

      )}

      {/* PENDING SYNC */}

      {status ===
        "Pending Sync" && (

        <div className="actions-container">

          <button
            className="primary-action-btn"
            onClick={() =>
              navigate("/qr")
            }
          >
            View Referral QR
          </button>

          <button
            className="secondary-action-btn"
          >
            Retry Synchronization
          </button>

        </div>

      )}

      {/* PENDING REVIEW */}

      {status ===
        "Pending Hospital Review" && (

        <div className="workflow-message">

          <h4>
            Awaiting Hospital Review
          </h4>

          <p>
            The referral has been
            submitted and is
            awaiting review by the
            receiving hospital.
          </p>

        </div>

      )}

      {/* FEEDBACK */}

      {(
        status ===
          "Feedback Received" ||
        status ===
          "Closed"
      ) && (

        <div className="details-card">

          <h3>
            Clinical Feedback
          </h3>

          <div className="detail-row">

            <strong>
              Received:
            </strong>

            <span>

              {referral.feedbackDate ||
                "17 Jun 2026 • 09:30"}

            </span>

          </div>

          <div className="detail-row">

            <strong>
              Treatment:
            </strong>

            <span>

              {referral.treatmentStatus ||
                "Patient Seen & Treated"}

            </span>

          </div>

          <div
            style={{
              marginTop: "12px",
            }}
          >

            <strong>
              Clinical Notes
            </strong>

            <p
              style={{
                marginTop: "8px",
              }}
            >

              {referral.hospitalNotes ||
                "No notes available."}

            </p>

          </div>

        </div>

      )}

      {/* CLOSED */}

      {status ===
        "Closed" && (

        <div className="workflow-message closed">

          <h4>
            Referral Closed
          </h4>

          <p>
            This referral cycle
            has been completed.
          </p>

        </div>

      )}

      {/* BOTTOM NAV */}

      <nav className="bottom-nav-v2">

        <button
          className="nav-button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >

          <House size={20} />

          <span>
            Home
          </span>

        </button>

        <button
          className="nav-button active"
          onClick={() =>
            navigate(
              "/referrals"
            )
          }
        >

          <FileText size={20} />

          <span>
            Work Queue
          </span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/sync")
          }
        >

          <Wifi size={20} />

          <span>
            Sync
          </span>

        </button>

        <button
          className="nav-button"
        >

          <User size={20} />

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
}

export default ReferralDetails;