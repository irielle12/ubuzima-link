import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function Sync() {
  const navigate = useNavigate();

  const [pending, setPending] = useState(0);
  const [synced, setSynced] = useState(0);
  const [failed, setFailed] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadStats();

    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const loadStats = async () => {
    const referrals = await db.referrals.toArray();

    setPending(
      referrals.filter(
        (r) => r.status === "Pending Sync"
      ).length
    );

    setSynced(
      referrals.filter(
        (r) => r.status === "Synced"
      ).length
    );

    setFailed(
      referrals.filter(
        (r) => r.status === "Failed"
      ).length
    );
  };

  const handleSync = async () => {
    if (!navigator.onLine) {
      alert("No internet connection available.");
      return;
    }

    const referrals = await db.referrals.toArray();

    for (const referral of referrals) {
      if (referral.status === "Pending Sync") {
        await db.referrals.update(
          referral.id,
          {
            status: "Synced",
          }
        );
      }
    }

    await loadStats();

    alert("Synchronization completed.");
  };

  return (
    <div className="sync-screen">

      {/* HEADER */}
      <div className="sync-header">

        <button
          className="back-circle"
          onClick={() => navigate("/dashboard")}
        >
          ←
        </button>

        <div>
          <h2>Sync & Network</h2>
          <p>Manage data synchronization</p>
        </div>

      </div>

      {/* STATUS */}
      <div className="offline-status-card">

        <div>
          <h3>
            {isOnline
              ? "Online"
              : "Offline Mode"}
          </h3>

          <p>
            {pending} referrals pending sync
          </p>
        </div>

      </div>

      {/* NETWORK */}
      <h4 className="section-title">
        NETWORK DIAGNOSTICS
      </h4>

      <div className="diagnostic-card">

        <div className="diagnostic-row">
          <span>Internet Status</span>

          <span>
            {isOnline
              ? "🟢 Online"
              : "🔴 Offline"}
          </span>
        </div>

        <div className="diagnostic-row">
          <span>Local Database</span>
          <span>🟢 Ready</span>
        </div>

        <div className="diagnostic-row">
          <span>Encryption Layer</span>
          <span>🟢 Active</span>
        </div>

      </div>

      {/* STATS */}
      <div className="sync-stats">

        <div className="sync-stat pending">
          <h2>{pending}</h2>
          <p>Pending</p>
        </div>

        <div className="sync-stat synced">
          <h2>{synced}</h2>
          <p>Synced</p>
        </div>

        <div className="sync-stat failed">
          <h2>{failed}</h2>
          <p>Failed</p>
        </div>

      </div>

      {/* BUTTON */}
      <button
        className="sync-now-btn"
        onClick={handleSync}
      >
        🔄 Sync Now
      </button>

      {/* NAV */}
      <div className="bottom-nav">

  <div
    className="nav-item"
    onClick={() => navigate("/dashboard")}
  >
    🏠
    <span>Home</span>
  </div>

  <div
    className="nav-item"
    onClick={() => navigate("/referrals")}
  >
    📄
    <span>Referrals</span>
  </div>

  <div className="nav-item active-nav">
    🔄
    <span>Sync</span>
  </div>

  <div className="nav-item">
    👤
    <span>Profile</span>
  </div>

</div>

    </div>
  );
}

export default Sync;