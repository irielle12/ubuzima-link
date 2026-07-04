import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";
import { getReferralsBySource } from "../services/referralApi";
import { getUser } from "../services/authApi";
import ConnectionStatus from "../components/ConnectionStatus";
import { useLanguage } from "../contexts/LanguageContext";

import {
  House,
  FileText,
  Wifi,
  User,
  RefreshCw,
  Search,
  Bell,
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
  const { t } = useLanguage();

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

      // Prune previously-cached referrals from this facility that no
      // longer exist server-side (e.g. deleted), so they can't resurface
      // from the local cache.
      const freshIds = new Set(data.map((r: any) => r.id));
      const staleIds = (
        await db.cachedReferrals.where("source_facility_id").equals(user.facilityId).toArray()
      )
        .filter((r) => !freshIds.has(r.id))
        .map((r) => r.id);
      if (staleIds.length) await db.cachedReferrals.bulkDelete(staleIds);

      setReferrals(data);
      await db.cachedReferrals.bulkPut(data);
    } catch (err: any) {
      // Offline or unreachable — fall back to whatever we've cached from
      // previous visits, rather than showing a hard error.
      try {
        const user = getUser();
        const cached = (await db.cachedReferrals.toArray()).filter(
          (r) => r.source_facility_id === user?.facilityId
        );
        if (cached.length > 0) {
          setReferrals(cached);
        } else {
          setError(err.message || "Failed to load referrals.");
        }
      } catch {
        setError(err.message || "Failed to load referrals.");
      }
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

  const user = getUser();
  const seenClosedCount = user?.facilityId
    ? parseInt(localStorage.getItem(`seenClosedCount_${user.facilityId}`) || "0", 10)
    : 0;
  const unseenClosed = Math.max(0, closed - seenClosedCount);

  const handleBellClick = () => {
    if (user?.facilityId) {
      localStorage.setItem(`seenClosedCount_${user.facilityId}`, closed.toString());
    }
    navigate("/work-queue/closed");
  };

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

      <div className="patient-header" style={{ justifyContent: "space-between" }}>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

          <button
            className="back-btn-v2"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            ←
          </button>

          <div>

            <h1>{t("Work Queue")}</h1>
            <p>{t("Manage referral workflow")}</p>

            <ConnectionStatus />

          </div>

        </div>

        <div
          className="notification-bell"
          onClick={handleBellClick}
          style={{ cursor: "pointer" }}
          title={t("View hospital updates")}
        >
          <Bell size={20} />
          {unseenClosed > 0 && (
            <span className="notification-count">{unseenClosed}</span>
          )}
        </div>

      </div>

      {/* SEARCH */}

      <div className="search-card">

        <div className="search-input-wrapper">

          <Search size={16} color="#94a3b8" />

          <input
            type="text"
            placeholder={t("Search patient, referral ID, status...")}
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
              <h3>{t("No matching referrals.")}</h3>
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
            <RefreshCw size={14} /> {t("Retry")}
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

            <p>{t("Pending Sync")}</p>
            <small>{t("Awaiting upload")}</small>

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

            <p>{t("Pending Review")}</p>
            <small>{t("Awaiting hospital")}</small>

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

            <p>{t("Feedback Received")}</p>
            <small>{t("Unread updates")}</small>

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

            <p>{t("Closed")}</p>
            <small>{t("Completed cases")}</small>

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

          <span>{t("Home")}</span>
        </button>
        <button className="nav-button active">
          <FileText size={20} />
          <span>{t("Work Queue")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/sync")}>
          <Wifi size={20} />
          <span>{t("Sync")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/profile")}>
          <User size={20} />
          <span>{t("Profile")}</span>
        </button>

      </nav>

    </div>
  );
}

export default Referrals;
