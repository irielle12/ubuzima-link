import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReferralsBySource } from "../services/referralApi";
import { getUser } from "../services/authApi";
import { db } from "../services/db";
import ConnectionStatus from "../components/ConnectionStatus";
import { FileText, RefreshCw } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const TITLE_BY_SLUG: Record<string, string> = {
  "pending-review": "Pending Review",
  "feedback-received": "Feedback Received",
  closed: "Closed Referrals",
};

function getUrgencyClass(urgency: string) {
  if (urgency === "Emergency") return "emergency";
  if (urgency === "Urgent") return "urgent";
  return "routine";
}

function matchesSlug(r: any, slug: string) {
  if (slug === "pending-review") return r.workflow_status === "Pending Hospital Review";
  if (slug === "closed") return r.workflow_status === "Closed";
  if (slug === "feedback-received") return Boolean(r.treatment_status || r.hospital_notes);
  return false;
}

function WorkQueueList() {
  const navigate = useNavigate();
  const { status } = useParams();
  const { t } = useLanguage();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const title = TITLE_BY_SLUG[status || ""] || "Work Queue";

  useEffect(() => {
    loadReferrals();
  }, [status]);

  const loadReferrals = async () => {
    const user = getUser();

    try {
      setLoading(true);
      setError("");

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

      setReferrals(data.filter((r: any) => matchesSlug(r, status || "")));
      await db.cachedReferrals.bulkPut(data);

      if (status === "closed") {
        const closedCount = data.filter((r: any) => r.workflow_status === "Closed").length;
        localStorage.setItem(`seenClosedCount_${user.facilityId}`, closedCount.toString());
      }
    } catch (err: any) {
      // Offline or unreachable — fall back to the cached list.
      try {
        const cached = (await db.cachedReferrals.toArray()).filter(
          (r) => r.source_facility_id === user?.facilityId && matchesSlug(r, status || "")
        );
        setReferrals(cached);
      } catch {
        setError(err.message || "Failed to load referrals.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openReferral = (id: number) => {
    navigate(`/referral-details/${id}`);
  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate(-1)}>←</button>
        <div>
          <h1>{t(title)}</h1>
          <p>{t("Your submitted referrals")}</p>
          <ConnectionStatus />
        </div>
      </div>

      {loading && (
        <div className="details-card">{t("Loading...")}</div>
      )}

      {error && (
        <div className="details-card" style={{ color: "red" }}>
          {error}
          <button
            className="primary-action-btn"
            onClick={loadReferrals}
            style={{ marginTop: 10 }}
          >
            <RefreshCw size={14} /> {t("Retry")}
          </button>
        </div>
      )}

      {!loading && !error && referrals.length === 0 && (
        <div className="details-card">
          <h3>{t("No referrals in this status.")}</h3>
        </div>
      )}

      <div className="queue-list">
        {referrals.map((r) => (
          <div key={r.id} className="queue-card" onClick={() => openReferral(r.id)}>
            <div className="queue-top">
              <div>
                <h3>{r.first_name} {r.last_name}</h3>
                <p className="muted">{r.referral_number}</p>
              </div>
              <span className={`status-chip ${getUrgencyClass(r.urgency)}`}>
                {r.urgency}
              </span>
            </div>
            <div className="queue-details">
              <div className="queue-item">
                <FileText size={14} />
                <span>{r.diagnosis}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default WorkQueueList;
