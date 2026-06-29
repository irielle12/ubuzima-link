import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";
import ConnectionStatus from "../components/ConnectionStatus";

import {
  House,
  FileText,
  Wifi,
  User,
} from "lucide-react";

function Referrals() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] =
    useState("");

  const [pendingSync, setPendingSync] =
    useState(0);

  const [pendingReview, setPendingReview] =
    useState(0);

  const [feedbackReceived, setFeedbackReceived] =
    useState(0);

  const [closed, setClosed] =
    useState(0);

  useEffect(() => {
    loadQueueData();
  }, []);

  const loadQueueData = async () => {
    const referrals =
      await db.referrals.toArray();

    setPendingSync(
      referrals.filter(
        (r) =>
          r.workflowStatus ===
          "Pending Sync"
      ).length
    );

    setPendingReview(
      referrals.filter(
        (r) =>
          r.workflowStatus ===
          "Pending Hospital Review"
      ).length
    );

    setFeedbackReceived(
      referrals.filter(
        (r) =>
          r.workflowStatus ===
          "Feedback Received"
      ).length
    );

    setClosed(
      referrals.filter(
        (r) =>
          r.workflowStatus ===
          "Closed"
      ).length
    );
  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}

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
            Work Queue
          </h1>

          <p>
            Manage referral workflow
          </p>

          <ConnectionStatus />

        </div>

      </div>

      {/* SEARCH */}

      <div className="details-card">

        <input
          type="text"
          placeholder="Search patient, referral ID, phone..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
        />

      </div>

      {/* QUEUES */}

      <div className="queue-grid">

        <div
          className="queue-card"
          onClick={() =>
            navigate("/sync")
          }
        >

          <h3>
            {pendingSync}
          </h3>

          <p>
            Pending Sync
          </p>

          <small>
            Awaiting upload
          </small>

        </div>

        <div
          className="queue-card"
          onClick={() =>
            navigate("/queue-review")
          }
        >

          <h3>
            {pendingReview}
          </h3>

          <p>
            Pending Review
          </p>

          <small>
            Awaiting hospital
          </small>

        </div>

        <div
          className="queue-card"
          onClick={() =>
            navigate("/queue-feedback")
          }
        >

          <h3>
            {feedbackReceived}
          </h3>

          <p>
            Feedback Received
          </p>

          <small>
            Unread updates
          </small>

        </div>

        <div
          className="queue-card"
          onClick={() =>
            navigate("/queue-closed")
          }
        >

          <h3>
            {closed}
          </h3>

          <p>
            Closed
          </p>

          <small>
            Completed cases
          </small>

        </div>

      </div>

      {/* BOTTOM NAV */}

      <nav className="bottom-nav-v2">

        <button
          className="nav-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >

          <House size={20} />

          <span>
            Home
          </span>

        </button>

        <button className="nav-button active">

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

        <button className="nav-button">

          <User size={20} />

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
}

export default Referrals;