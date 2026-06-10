import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function Dashboard() {
  const navigate = useNavigate();

  const [worker, setWorker] = useState({
    workerName: "Health Worker",
    workerId: "",
    healthPost: "",
  });

  const [referrals, setReferrals] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(
    navigator.onLine
  );

  useEffect(() => {
    const savedWorker =
      localStorage.getItem("worker");

    if (savedWorker) {
      setWorker(JSON.parse(savedWorker));
    }

    loadReferrals();

    const handleOnline = () =>
      setIsOnline(true);

    const handleOffline = () =>
      setIsOnline(false);

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  const loadReferrals = async () => {
    const data =
      await db.referrals.toArray();

    setReferrals(data.reverse());
  };

  const totalReferrals =
    referrals.length;

  const pendingReferrals =
    referrals.filter(
      (r) =>
        r.status === "Pending Sync"
    ).length;

  const syncedReferrals =
    referrals.filter(
      (r) =>
        r.status === "Synced"
    ).length;

  const failedReferrals =
    referrals.filter(
      (r) =>
        r.status === "Failed"
    ).length;

  return (
    <div className="home-screen">

      {/* HEADER */}
      <div className="home-header">

        <div>

          <p className="worker-role">
            Health Worker
          </p>

          <h1 className="worker-name">
            {worker.workerName}
          </h1>

          <p className="worker-details">
            {worker.healthPost} •{" "}
            {worker.workerId}
          </p>

          <div className="offline-pill">
            {isOnline
              ? "🟢 Online"
              : "📡 Offline Mode"}
          </div>

        </div>

        <div className="notification-bell">
          🔔
          <span className="notification-dot"></span>
        </div>

      </div>

      {/* STATS */}
      <div className="stats-row">

        <div className="stat-box total">
          <h2>{totalReferrals}</h2>
          <p>Total</p>
        </div>

        <div className="stat-box pending">
          <h2>{pendingReferrals}</h2>
          <p>Pending</p>
        </div>

        <div className="stat-box verified">
          <h2>{syncedReferrals}</h2>
          <p>Synced</p>
        </div>

        <div className="stat-box conflict">
          <h2>{failedReferrals}</h2>
          <p>Failed</p>
        </div>

      </div>

      {/* SEARCH + NEW */}
      <div className="search-new-row">

        <div className="search-wrapper">

          🔍

          <input
            className="home-search"
            type="text"
            placeholder="Search patients or referrals..."
            style={{
              width: "240px",
            }}
          />

        </div>

        <button
          className="new-referral-btn"
          onClick={() =>
            navigate("/new-referral")
          }
        >
          + New
        </button>

      </div>

      {/* RECENT HEADER */}
      <div className="recent-header">

        <span>
          RECENT REFERRALS
        </span>

        <span className="record-count">
          {referrals.length} records
        </span>

      </div>

      {/* REFERRALS */}

      {referrals.length === 0 ? (

        <div
          style={{
            padding: "30px",
            textAlign: "center",
          }}
        >
          No referrals created yet.
        </div>

      ) : (

        referrals.map((referral) => (

          <div
            key={referral.id}
            className="referral-home-card"
          >

            <h3>
              {referral.patientName}
            </h3>

            <p className="hospital-line">
              {referral.id} •{" "}
              {referral.hospital}
            </p>

            <p className="diagnosis-line">
              {referral.diagnosis}
            </p>

            <div className="card-footer">

              <span
                className={
                  referral.status ===
                  "Synced"
                    ? "status-badge synced-badge"
                    : "status-badge pending-badge"
                }
              >
                ● {referral.status}
              </span>

              <span className="time-label">
                {referral.time}
              </span>

            </div>

          </div>

        ))

      )}

      {/* BOTTOM NAV */}

      <div className="bottom-nav">

        <div className="nav-item active-nav">
          <div>🏠</div>
          <span>Home</span>
        </div>

        <div
          className="nav-item"
          onClick={() =>
            navigate("/referrals")
          }
        >
          <div>📄</div>
          <span>Referrals</span>
        </div>

        <div
          className="nav-item"
          onClick={() =>
            navigate("/sync")
          }
        >
          <div>🔄</div>
          <span>Sync</span>
        </div>

        <div className="nav-item">
          <div>👤</div>
          <span>Profile</span>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;