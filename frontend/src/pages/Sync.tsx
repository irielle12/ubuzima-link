import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, RefreshCw, ArrowLeft } from "lucide-react";
import { db } from "../services/db";

function Sync() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [pendingReferrals, setPendingReferrals] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadPendingReferrals();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadPendingReferrals = async () => {
    const referrals = await db.referrals.toArray();

    setPendingReferrals(
      referrals.filter((r) => r.workflowStatus === "Pending Sync")
    );
  };

  const filteredReferrals = pendingReferrals.filter(
    (referral) =>
      referral.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.hospital.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const syncAll = async () => {
    if (!isOnline) {
      alert("Internet connection required.");
      return;
    }

    for (const referral of pendingReferrals) {
      await db.referrals.update(referral.id, {
        workflowStatus: "Pending Hospital Review",
        syncStatus: "Synced",
      });
    }

    alert("All referrals synchronized successfully.");

    navigate("/dashboard");
  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }}>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h1>Sync Center</h1>

            <div
              className={
                isOnline
                  ? "connection-badge online"
                  : "connection-badge offline"
              }
            >
              <Wifi size={14} />
              {isOnline ? "Online" : "Offline"}
            </div>
          </div>

          <p>Manage offline referrals</p>
        </div>
      </div>

      {/* SEARCH + LIST CARD */}
      <div
        className="details-card"
        style={{ marginBottom: "16px" }}
      >

        <input
          type="text"
          placeholder="Search referral ID or hospital..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* TITLE + INLINE BUTTON */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "10px",
            marginBottom: "10px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Pending Synchronization ({pendingReferrals.length})
          </h3>

          {pendingReferrals.length > 0 && (
            <button
              onClick={syncAll}
              disabled={!isOnline}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "none",
                background: isOnline ? "#2563eb" : "#94a3b8",
                color: "white",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Sync All
            </button>
          )}
        </div>

        {/* LIST */}
        {filteredReferrals.length === 0 ? (
          <p>
            {searchTerm
              ? "No matching referrals found."
              : "No referrals are waiting for synchronization."}
          </p>
        ) : (
          filteredReferrals.map((referral) => (
            <div key={referral.id} className="detail-row">
              <span>{referral.id}</span>
              <span>{referral.hospital}</span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default Sync;