import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

import { getReferralsBySource, getFacilityStats } from "../services/referralApi";
import { getUser } from "../services/authApi";
import { getFacilityById, getHospitals } from "../services/facilityApi";
import { db } from "../services/db";
import {
  getLastSyncAttempt,
  getConnectivityState,
  recordConnectivityChange,
} from "../services/syncStatus";
import ConnectionStatus from "../components/ConnectionStatus";
import { getUnseenClosedReferrals, markClosedReferralsSeen } from "../services/notifications";

import {
  Plus,
  Wifi,
  House,
  FileText,
  User,
  Bell,
  RefreshCw,
  AlertTriangle,
  WifiOff,
} from "lucide-react";

const STALE_SYNC_THRESHOLD_HOURS = 24;

function formatFeedbackRate(stats: any) {
  if (!stats || stats.closedCount === 0) return "No data yet";

  return `${Math.round(stats.feedbackCompletionRate)}%`;
}

function Dashboard() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  const [notifications, setNotifications] =
    useState(0);

  const [closedReferrals, setClosedReferrals] =
    useState<any[]>([]);

  const [facilityName, setFacilityName] =
    useState("Health Facility");

  const [stats, setStats] =
    useState<any>(null);

  const [statsLoading, setStatsLoading] =
    useState(true);

  const [statsError, setStatsError] =
    useState("");

  const [staleSyncCount, setStaleSyncCount] =
    useState(0);

  const [pendingSyncCount, setPendingSyncCount] =
    useState(0);

  const [lastSyncAttempt, setLastSyncAttempt] =
    useState<{ timestamp: number; success: boolean } | null>(null);

  const [offlineSince, setOfflineSince] =
    useState<number | null>(null);

  useEffect(() => {
    loadNotifications();
    loadFacility();
    loadHospitals();
    loadStats();
    loadSyncAlerts();

    if (!navigator.onLine) {
      const connectivity = getConnectivityState();

      setOfflineSince(
        connectivity && connectivity.online === false
          ? connectivity.since
          : Date.now()
      );
    }

    const handleOnline = () => {
      recordConnectivityChange(true);
      setOfflineSince(null);
    };

    const handleOffline = () => {
      recordConnectivityChange(false);
      setOfflineSince(Date.now());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadSyncAlerts = async () => {
    try {
      const local = await db.referrals.toArray();
      const now = Date.now();
      const thresholdMs = STALE_SYNC_THRESHOLD_HOURS * 60 * 60 * 1000;

      const pending = local.filter((r) => r.workflowStatus === "Pending Sync");

      const stale = pending.filter((r) => {
        const created = new Date(r.time).getTime();

        if (Number.isNaN(created)) return false;

        return now - created > thresholdMs;
      });

      setPendingSyncCount(pending.length);
      setStaleSyncCount(stale.length);
    } catch (err) {
      console.error(err);
    }

    setLastSyncAttempt(getLastSyncAttempt());
  };

  const loadFacility = async () => {
    const user = getUser();
    if (!user?.facilityId) return;

    try {
      const facility = await getFacilityById(user.facilityId);
      setFacilityName(facility.name);
      await db.facilities.put({ id: user.facilityId, ...facility });
    } catch (err) {
      console.error(err);
      try {
        const cached = await db.facilities.get(user.facilityId);
        if (cached) setFacilityName(cached.name);
      } catch (dbErr) {
        console.error(dbErr);
      }
    }
  };

  // Pre-warms the destination-hospital cache from the dashboard (which every
  // session visits right after login), so the "Receiving Hospital" picker on
  // the referral form has data offline even if that form was never opened
  // while online first.
  const loadHospitals = async () => {
    try {
      const hospitals = await getHospitals();
      await db.facilities.bulkPut(hospitals);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotifications = async () => {
    const user = getUser();
    if (!user?.facilityId) return;

    let referrals: any[];
    try {
      referrals = await getReferralsBySource();
      await db.cachedReferrals.bulkPut(referrals);
    } catch (err) {
      console.error(err);
      try {
        referrals = (await db.cachedReferrals.toArray()).filter(
          (r) => r.source_facility_id === user.facilityId
        );
      } catch (dbErr) {
        console.error(dbErr);
        return;
      }
    }

    const closed = referrals.filter((r: any) => r.workflow_status === "Closed");

    setClosedReferrals(closed);
    setNotifications(getUnseenClosedReferrals(user.facilityId, closed).length);
  };

  const handleBellClick = () => {
    const user = getUser();
    if (user?.facilityId) {
      markClosedReferralsSeen(user.facilityId, closedReferrals);
    }
    setNotifications(0);
    navigate("/work-queue/closed");
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError("");

      const user = getUser();

      if (!user?.facilityId) {
        setStats(null);
        return;
      }

      const data = await getFacilityStats();

      setStats(data);
    } catch (err: any) {
      setStatsError(
        navigator.onLine
          ? err.message || "Failed to load reports."
          : "Reports need a connection — reconnect and retry."
      );
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="dashboard-v2">

      {/* HEADER */}

      <header className="dashboard-header-v2">

        <div className="dashboard-header-content">

          <div>

            <p className="facility-label">
              UBUZIMA-LINK
            </p>

            <h1>
              {facilityName}
            </h1>

            <ConnectionStatus />

          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              className="notification-bell"
              onClick={handleBellClick}
              style={{ cursor: "pointer" }}
              title={t("View hospital updates")}
            >
              <Bell size={22} />
              {notifications > 0 && (
                <span className="notification-count">{notifications}</span>
              )}
            </div>

            <div
              onClick={() => setLang(lang === "en" ? "rw" : "en")}
              style={{ cursor: "pointer", textAlign: "center", lineHeight: 1.2 }}
            >
              <div style={{ fontSize: 16 }}>{lang === "en" ? "🇷🇼" : "🇬🇧"}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", letterSpacing: "0.04em", marginTop: 2 }}>
                {lang === "en" ? "KINYARWANDA" : "ENGLISH"}
              </div>
            </div>
          </div>

        </div>

      </header>

      {/* QUICK ACTIONS */}

      <section className="dashboard-section">

        <h2>{t("Quick Actions")}</h2>

        <div className="actions-grid">

          <button
            className="action-card"
            onClick={() =>
              navigate("/patient-search")
            }
          >

            <Plus size={28} />

            <span>{t("Find Patient")}</span>

          </button>

          <button
            className="action-card"
            onClick={() =>
              navigate(
                "/register-patient"
              )
            }
          >

            <User size={28} />

            <span>{t("Register Patient")}</span>

          </button>

        </div>

      </section>

      {/* REPORTS */}

<section className="dashboard-section">

  <h2>{t("Facility Reports")}</h2>

  {statsLoading && (
    <div className="details-card">{t("Loading reports...")}</div>
  )}

  {!statsLoading && statsError && (
    <div className="details-card" style={{ color: "red" }}>
      {statsError}

      <button
        className="primary-action-btn"
        onClick={loadStats}
        style={{ marginTop: 10 }}
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  )}

  {!statsLoading && !statsError && (

    <div className="queue-grid">

      <div className="queue-card">

        <h3>
          {formatFeedbackRate(stats)}
        </h3>

        <p>{t("Feedback Completion")}</p>

        <small>
          {stats?.closedCount || 0} closed referral{stats?.closedCount === 1 ? "" : "s"}
        </small>

      </div>

      <div className="queue-card">

        <h3>
          {stats?.referralsThisWeek ?? "—"}
        </h3>

        <p>{t("Referrals This Week")}</p>
        <small>{stats?.referralsLastWeek ?? 0} {t("last week")}</small>

      </div>

    </div>

  )}

</section>

{/* ALERTS */}

<section className="dashboard-section">

  <h2>{t("Sync Alerts")}</h2>

  {pendingSyncCount === 0 &&
    staleSyncCount === 0 &&
    !(lastSyncAttempt && !lastSyncAttempt.success) &&
    !offlineSince && (
    <div className="details-card">
      <p>{t("No active network alerts.")}</p>
    </div>
  )}

  {pendingSyncCount > 0 && (

    <div className="details-card alert-card warning">

      <AlertTriangle size={18} />

      <div>

        <p>
          You have {pendingSyncCount} unsynced referral{pendingSyncCount === 1 ? "" : "s"}. Please sync.
        </p>

        <button
          className="secondary-action-btn"
          onClick={() => navigate("/sync")}
          style={{ marginTop: 10 }}
        >
          {t("Sync Now")}
        </button>

      </div>

    </div>

  )}

  {staleSyncCount > 0 && (

    <div className="details-card alert-card warning">

      <AlertTriangle size={18} />

      <p>
        {staleSyncCount} referral{staleSyncCount === 1 ? "" : "s"} waiting
        to sync for over {STALE_SYNC_THRESHOLD_HOURS} hours.
      </p>

    </div>

  )}

  {lastSyncAttempt && !lastSyncAttempt.success && (

    <div className="details-card alert-card error">

      <AlertTriangle size={18} />

      <div>

        <p>
          Last sync attempt failed at{" "}
          {new Date(lastSyncAttempt.timestamp).toLocaleTimeString()}.
        </p>

        <button
          className="secondary-action-btn"
          onClick={() => navigate("/sync")}
          style={{ marginTop: 10 }}
        >
          {t("Retry Sync")}
        </button>

      </div>

    </div>

  )}

  {offlineSince && (

    <div className="details-card alert-card offline">

      <WifiOff size={18} />

      <p>
        {t("Offline since")} {new Date(offlineSince).toLocaleTimeString()}.
      </p>

    </div>

  )}

</section>
      {/* NAVIGATION */}

      <nav className="bottom-nav-v2">

        <button className="nav-button active">

          <House size={20} />

          <span>{t("Home")}</span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/referrals")
          }
        >

          <FileText size={20} />

          <span>{t("Work Queue")}</span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/sync")
          }
        >

          <Wifi size={20} />

          <span>{t("Sync")}</span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/profile")
          }
        >

          <User size={20} />

          <span>{t("Profile")}</span>

        </button>

      </nav>

    </div>
  );
}

export default Dashboard;