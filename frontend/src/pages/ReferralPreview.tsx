import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConnectionStatus from "../components/ConnectionStatus";
import { db } from "../services/db";

function ReferralPreview() {
  const navigate = useNavigate();

  const [referral, setReferral] =
    useState<any>(null);

  const [patient, setPatient] =
    useState<any>(null);

  useEffect(() => {
    loadReferral();
  }, []);

  const loadReferral =
    async () => {

      const referrals =
        await db.referrals.toArray();

      if (
        referrals.length === 0
      )
        return;

      const latestReferral =
        referrals[
          referrals.length - 1
        ];

      setReferral(
        latestReferral
      );

      const patientData =
        await db.patients.get(
          latestReferral.patientId
        );

      setPatient(
        patientData
      );
    };

  const acceptReferral =
    async () => {

      if (!referral) return;

      await db.referrals.update(
        referral.id,
        {
          workflowStatus:
            "Accepted",
        }
      );

      alert(
        "Referral accepted successfully."
      );

      navigate(
        "/queue-review"
      );
    };

  if (!referral || !patient) {
    return (
      <div className="patient-search-page">

        <div className="details-card">

          <h3>
            No Referral Found
          </h3>

          <p>
            No referral is available
            for preview.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="patient-search-page">

      {/* HEADER */}

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate(
              "/receive-referral"
            )
          }
        >
          ←
        </button>

        <div>

          <h1>
            Referral Preview
          </h1>

          <p>
            Review before acceptance
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

          <div className="status-chip review">

            Pending Hospital Review

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
            Referral ID:
          </strong>

          <span>
            {referral.id}
          </span>

        </div>

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
            Destination:
          </strong>

          <span>
            {referral.hospital}
          </span>

        </div>

      </div>

      {/* ACTIONS */}

      <div className="actions-container">

        <button
          className="secondary-action-btn"
          onClick={() =>
            navigate(
              "/receive-referral"
            )
          }
        >
          Reject
        </button>

        <button
          className="primary-action-btn"
          onClick={
            acceptReferral
          }
        >
          Accept Referral
        </button>

      </div>

    </div>
  );
}

export default ReferralPreview;