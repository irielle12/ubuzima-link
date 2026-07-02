import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingReferrals } from "../services/referralApi";
import ConnectionStatus from "../components/ConnectionStatus";

import {
  FileText,
  Search,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Building2,
  User,
} from "lucide-react";

function QueueReview() {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getPendingReferrals();

      setReferrals(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // REAL-TIME SEARCH (NO API CALLS)
  useEffect(() => {
    const s = search.toLowerCase();

    const result = referrals.filter((r) => {
      return (
        `${r.first_name} ${r.last_name}`
          .toLowerCase()
          .includes(s) ||
        r.referral_number?.toLowerCase().includes(s) ||
        r.diagnosis?.toLowerCase().includes(s)
      );
    });

    setFiltered(result);
  }, [search, referrals]);

  const openReferral = (ref: any) => {
    navigate(`/hospital-referral/${ref.id}`);
  };

  const getUrgencyColor = (u: string) => {
    if (u === "Emergency") return "#dc2626";
    if (u === "Urgent") return "#f59e0b";
    return "#2563eb";
  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button
          className="back-btn-v2"
          onClick={() => navigate("/hospital-dashboard")}
        >
          ←
        </button>

        <div>
          <h1>Hospital Queue</h1>
          <p>Pending review for your facility</p>
          <ConnectionStatus />
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-card">
        <div className="search-input-wrapper">
          <Search size={16} color="#94a3b8" />
          <input
            placeholder="Search patient, referral number, diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* STATES */}
      {loading && (
        <div className="details-card">Loading queue...</div>
      )}

      {error && (
        <div className="details-card" style={{ color: "red" }}>
          {error}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && (
        <div className="details-card">
          <h3>No referrals awaiting review.</h3>

          <button
            className="primary-action-btn"
            onClick={loadQueue}
            style={{ marginTop: 10 }}
          >
            <RefreshCw size={14} /> Refresh Queue
          </button>
        </div>
      )}

      {/* CARDS */}
      <div className="queue-list">

        {filtered.map((r) => (
          <div
            key={r.id}
            className="queue-card"
            onClick={() => openReferral(r)}
          >

            {/* TOP */}
            <div className="queue-top">

              <div>
                <h3>
                  {r.first_name} {r.last_name}
                </h3>

                <p className="muted">
                  {r.referral_number}
                </p>
              </div>

              <span className="status-chip review">
                {r.workflow_status}
              </span>

            </div>

            {/* BODY */}
            <div className="queue-details">

              <div className="queue-item">
                <AlertTriangle size={14} />
                <span
                  style={{ color: getUrgencyColor(r.urgency) }}
                >
                  {r.urgency}
                </span>
              </div>

              <div className="queue-item">
                <FileText size={14} />
                <span>{r.diagnosis}</span>
              </div>

              <div className="queue-item">
                <Building2 size={14} />
                <span>{r.source_facility_name || "Unknown facility"}</span>
              </div>

              <div className="queue-item">
                <Calendar size={14} />
                <span>{r.created_at}</span>
              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}

export default QueueReview;