import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";
import { getReferralsBySource } from "../services/referralApi";
import { getUser } from "../services/authApi";
import ConnectionStatus from "../components/ConnectionStatus";

import {
  House,
  FileText,
  Wifi,
  User,
  RefreshCw,
  Search,
} from "lucide-react";

function getUrgencyClass(urgency: string) {
  if (urgency === "Emergency") return "emergency";
  if (urgency === "Urgent") return "urgent";
  return "routine";
}

function hasFeedback(r: any) {
  return Boolean(r.treatment_status || r.hospital_notes);
}

function Referrals() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] =
    useState("");

  const [pendingSync, setPendingSync] =
    useState(0);

  const [referrals, setReferrals] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPendingSync();
    loadQueueData();
  }, []);

  const loadPendingSync = async () => {
    try {
      const local = await db.referrals.toArray();

      setPendingSync(
        local.filter(
          (r) => r.workflowStatus === "Pending Sync"
        ).length
      );
    } catch (err) {
      console.error(err);
      setPendingSync(0);
    }
  };

  const loadQueueData = async () => {
    try {
      setLoading(true);
      setError("");

      const user = getUser();

      if (!user?.facilityId) {
        setReferrals([]);
        return;
      }

      const data = await getReferralsBySource();

      setReferrals(data);
    } catch (err: any) {
      setError(err.message || "Failed to load referrals.");
    } finally {
      setLoading(false);
    }
  };

  const pendingReview = referrals.filter(
    (r) => r.workflow_status === "Pending Hospital Review"
  ).length;

  const closed = referrals.filter(
    (r) => r.workflow_status === "Closed"
  ).length;

  const feedbackReceived = referrals.filter(hasFeedback).length;

  const search = searchTerm.trim().toLowerCase();

  const searchResults = search
    ? referrals.filter((r) => {
        return (
          `${r.first_name} ${r.last_name}`
            .toLowerCase()
            .includes(search) ||
          r.referral_number?.toLowerCase().includes(search) ||
          r.workflow_status?.toLowerCase().includes(search)
        );
      })
    : [];

  const openReferral = (id: number) => {
    navigate(`/referral-details/${id}`);
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

      <div className="search-card">

        <div className="search-input-wrapper">

          <Search size={16} color="#94a3b8" />

          <input
            type="text"
            placeholder="Search patient, referral ID, status..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />

        </div>

      </div>

      {/* SEARCH RESULTS */}

      {search && (
        <div className="queue-list">

          {searchResults.length === 0 && (
            <div className="details-card">
              <h3>No matching referrals.</h3>
            </div>
          )}

          {searchResults.map((r) => (
            <div
              key={r.id}
              className="queue-card"
              onClick={() => openReferral(r.id)}
            >
              <div className="queue-top">
                <div>
                  <h3>
                    {r.first_name} {r.last_name}
                  </h3>
                  <p className="muted">{r.referral_number}</p>
                </div>

                <span className={`status-chip ${getUrgencyClass(r.urgency)}`}>
                  {r.urgency}
                </span>
              </div>

              <div className="queue-details">
                <div className="queue-item">
                  <FileText size={14} />
                  <span>{r.workflow_status}</span>
                </div>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* ERROR / RETRY */}

      {!search && error && (
        <div className="details-card" style={{ color: "red" }}>
          {error}

          <button
            className="primary-action-btn"
            onClick={loadQueueData}
            style={{ marginTop: 10 }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* QUEUES */}

      {!search && !error && (
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
              navigate("/work-queue/pending-review")
            }
          >

            <h3>
              {loading ? "—" : pendingReview}
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
              navigate("/work-queue/feedback-received")
            }
          >

            <h3>
              {loading ? "—" : feedbackReceived}
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
              navigate("/work-queue/closed")
            }
          >

            <h3>
              {loading ? "—" : closed}
            </h3>

            <p>
              Closed
            </p>

            <small>
              Completed cases
            </small>

          </div>

        </div>
      )}

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

        <button
          className="nav-button"
          onClick={() =>
            navigate("/profile")
          }
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

export default Referrals;
