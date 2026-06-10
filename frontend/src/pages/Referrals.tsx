import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/db";

function Referrals() {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    const data = await db.referrals.toArray();
    setReferrals(data.reverse());
  };

  const filtered = referrals.filter(
    (referral) =>
      referral.patientName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      referral.id
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="referrals-screen">

      {/* HEADER */}
      <div className="sync-header">

        <button
          className="back-circle"
          onClick={() => navigate("/dashboard")}
        >
          ←
        </button>

        <div>
          <h2>Referrals</h2>
          <p>Manage patient referrals</p>
        </div>

      </div>

      {/* SEARCH */}
      <div className="search-section">

        <input
          className="referrals-search"
          placeholder="Search referrals..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

      {/* COUNT */}
      <div className="recent-header">

        <span>
          TOTAL REFERRALS
        </span>

        <span className="record-count">
          {filtered.length}
        </span>

      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div className="empty-referrals">
          No referrals found
        </div>
      ) : (
        filtered.map((referral) => (
          <div
            key={referral.id}
            className="referral-home-card"
          >

            <h3>
              {referral.patientName}
            </h3>

            <p className="hospital-line">
              {referral.id}
            </p>

            <p className="diagnosis-line">
              {referral.hospital}
            </p>

            <div className="card-footer">

              <span
                className={
                  referral.status === "Synced"
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

      {/* NAV */}
      <div className="bottom-nav">

        <div
          className="nav-item"
          onClick={() => navigate("/dashboard")}
        >
          🏠
          <span>Home</span>
        </div>

        <div className="nav-item active-nav">
          📄
          <span>Referrals</span>
        </div>

        <div
          className="nav-item"
          onClick={() => navigate("/sync")}
        >
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

export default Referrals;