import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConnectionStatus from "../components/ConnectionStatus";
import { useNotification } from "../contexts/NotificationContext";
import {
  getReferralById,
  updateReferralStatus,
  rejectReferral,
  submitReferralFeedback,
} from "../services/referralApi";

function statusChipClass(status: string) {
  if (status === "Pending Hospital Review") return "review";
  if (status === "Feedback Received") return "feedback";
  if (status === "Closed") return "closed";
  return "";
}

function HospitalReferralReview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { error: notifyError } = useNotification();

  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [treatmentStatus, setTreatmentStatus] = useState(
    "Patient Seen & Treated"
  );
  const [hospitalNotes, setHospitalNotes] = useState("");

  useEffect(() => {
    if (id) loadReferral();
  }, [id]);

  const loadReferral = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getReferralById(id as string);

      setReferral(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!referral) return;

    try {
      setBusy(true);
      await updateReferralStatus(referral.id, "Hospital Accepted");
      await loadReferral();
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!referral) return;

    try {
      setBusy(true);
      await rejectReferral(referral.id, rejectionReason);
      setShowReject(false);
      await loadReferral();
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!referral) return;

    if (!hospitalNotes.trim()) {
      notifyError("Add clinical notes before submitting feedback.");
      return;
    }

    try {
      setBusy(true);
      await submitReferralFeedback(
        referral.id,
        treatmentStatus,
        hospitalNotes
      );
      await loadReferral();
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!referral) return;

    try {
      setBusy(true);
      await updateReferralStatus(referral.id, "Closed");
      await loadReferral();
    } catch (err: any) {
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-search-page">
        <div className="details-card">Loading referral...</div>
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="patient-search-page">
        <div className="details-card" style={{ color: "red" }}>
          {error || "Referral not found."}
        </div>
      </div>
    );
  }

  const status = referral.workflow_status;

  return (
    <div className="patient-search-page">
      {/* HEADER */}
      <div className="patient-header">
        <button
          className="back-btn-v2"
          onClick={() => navigate("/queue-review")}
        >
          ←
        </button>

        <div>
          <h1>Referral Review</h1>
          <p>{referral.referral_number}</p>
          <ConnectionStatus />
        </div>
      </div>

      {/* STATUS */}
      <div className="status-card">
        <div>
          <p className="status-label">Status</p>
          <div className={`status-chip ${statusChipClass(status)}`}>
            {status}
          </div>
        </div>
      </div>

      {/* PATIENT */}
      <div className="details-card">
        <h3>Patient Information</h3>

        <div className="detail-row">
          <strong>Name:</strong>
          <span>{referral.first_name} {referral.last_name}</span>
        </div>
        <div className="detail-row">
          <strong>Gender:</strong>
          <span>{referral.gender || "—"}</span>
        </div>
        {referral.phone && (
          <div className="detail-row">
            <strong>Phone:</strong>
            <span>{referral.phone}</span>
          </div>
        )}
        <div className="detail-row">
          <strong>Priority:</strong>
          <span>{referral.urgency}</span>
        </div>
        <div className="detail-row">
          <strong>Submitted:</strong>
          <span>{new Date(referral.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* CLINICAL INFORMATION */}
      <div className="details-card">
        <h3>Clinical Information</h3>

        {referral.chief_complaint && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>Chief Complaint</strong>
            <p style={{ marginTop: 4, color: "#334155" }}>{referral.chief_complaint}</p>
          </div>
        )}

        {referral.medical_history && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>Medical History</strong>
            <p style={{ marginTop: 4, color: "#334155" }}>{referral.medical_history}</p>
          </div>
        )}

        {(referral.vital_bp || referral.vital_heart_rate || referral.vital_temperature || referral.vital_respiratory_rate) && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>Vital Signs</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginTop: 6 }}>
              {referral.vital_bp && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>BP:</strong><span>{referral.vital_bp}</span>
                </div>
              )}
              {referral.vital_heart_rate && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>HR:</strong><span>{referral.vital_heart_rate}</span>
                </div>
              )}
              {referral.vital_temperature && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>Temp:</strong><span>{referral.vital_temperature}</span>
                </div>
              )}
              {referral.vital_respiratory_rate && (
                <div className="detail-row" style={{ marginBottom: 0 }}>
                  <strong>RR:</strong><span>{referral.vital_respiratory_rate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: referral.action_taken ? 14 : 0 }}>
          <strong style={{ fontSize: 13 }}>Provisional Diagnosis</strong>
          <p style={{ marginTop: 4, color: "#334155" }}>{referral.diagnosis}</p>
        </div>

        {referral.action_taken && (
          <div>
            <strong style={{ fontSize: 13 }}>Action Taken at Referring Facility</strong>
            <p style={{ marginTop: 4, color: "#334155" }}>{referral.action_taken}</p>
          </div>
        )}
      </div>

      {/* PENDING REVIEW: ACCEPT / REJECT */}
      {status === "Pending Hospital Review" && !showReject && (
        <div className="actions-container">
          <button
            className="secondary-action-btn"
            onClick={() => setShowReject(true)}
            disabled={busy}
          >
            Reject
          </button>

          <button
            className="primary-action-btn"
            onClick={handleAccept}
            disabled={busy}
          >
            Accept Referral
          </button>
        </div>
      )}

      {status === "Pending Hospital Review" && showReject && (
        <div className="login-card-v2" style={{ marginTop: 20 }}>
          <h3>Reject Referral</h3>

          <label>Reason</label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this referral is being rejected"
          />

          <div className="actions-container">
            <button
              className="secondary-action-btn"
              onClick={() => setShowReject(false)}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              className="primary-action-btn"
              onClick={handleReject}
              disabled={busy || !rejectionReason.trim()}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {/* HOSPITAL ACCEPTED: FEEDBACK FORM */}
      {status === "Hospital Accepted" && (
        <div className="login-card-v2" style={{ marginTop: 20 }}>
          <h3>Clinical Feedback</h3>

          <label>Treatment Status</label>
          <select
            value={treatmentStatus}
            onChange={(e) => setTreatmentStatus(e.target.value)}
          >
            <option>Patient Seen & Treated</option>
            <option>Admitted</option>
            <option>Referred Onward</option>
            <option>Patient Did Not Arrive</option>
          </select>

          <label>Clinical Notes</label>
          <textarea
            value={hospitalNotes}
            onChange={(e) => setHospitalNotes(e.target.value)}
            placeholder="Summary of treatment and outcome"
          />

          <button
            className="login-btn-v2"
            onClick={handleSubmitFeedback}
            disabled={busy}
          >
            Submit Feedback
          </button>
        </div>
      )}

      {/* FEEDBACK RECEIVED: CLOSE */}
      {status === "Feedback Received" && (
        <>
          <div className="details-card">
            <h3>Clinical Feedback</h3>

            <div className="detail-row">
              <strong>Treatment:</strong>
              <span>{referral.treatment_status}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Notes</strong>
              <p style={{ marginTop: 8 }}>{referral.hospital_notes}</p>
            </div>
          </div>

          <div className="actions-container">
            <button
              className="primary-action-btn"
              onClick={handleClose}
              disabled={busy}
            >
              Close Referral
            </button>
          </div>
        </>
      )}

      {/* REJECTED */}
      {status === "Rejected" && (
        <div className="workflow-message closed">
          <h4>Referral Rejected</h4>
          <p>{referral.rejection_reason || "This referral was rejected."}</p>
        </div>
      )}

      {/* CLOSED */}
      {status === "Closed" && (
        <>
          <div className="details-card">
            <h3>Clinical Feedback</h3>

            <div className="detail-row">
              <strong>Treatment:</strong>
              <span>{referral.treatment_status}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Notes</strong>
              <p style={{ marginTop: 8 }}>{referral.hospital_notes}</p>
            </div>
          </div>

          <div className="workflow-message closed">
            <h4>Referral Closed</h4>
            <p>This referral cycle has been completed.</p>
          </div>
        </>
      )}
    </div>
  );
}

export default HospitalReferralReview;
