import { useEffect, useState } from "react";
import { getUser } from "../../services/authApi";
import { getHospitalCapacity, updateHospitalCapacity } from "../../services/facilityApi";

type Level = "available" | "limited" | "unavailable";
type Capacity = { Emergency: Level; Urgent: Level; Routine: Level };

const OPTIONS: Level[] = ["available", "limited", "unavailable"];
const LABELS: Record<Level, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Not Accepting",
};

function CapacitySettings() {
  const user = getUser();

  const [capacity, setCapacity] = useState<Capacity>({
    Emergency: "available",
    Urgent: "available",
    Routine: "available",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.facilityId) load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getHospitalCapacity(user!.facilityId);
      if (data.capacity_status) {
        setCapacity(data.capacity_status);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (err: any) {
      setError(err.message || "Failed to load capacity");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (urgency: keyof Capacity, value: Level) => {
    if (!user?.facilityId) return;

    const next: Capacity = { ...capacity, [urgency]: value };
    setCapacity(next);
    setSaving(urgency);

    try {
      await updateHospitalCapacity(user.facilityId, next);
      setLastUpdated(new Date().toLocaleString());
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setCapacity(capacity);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="hospital-empty">Loading capacity settings...</div>;
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <p style={{ color: "#64748b", fontSize: 14, marginTop: 0, marginBottom: 24 }}>
        Set your current capacity. Health posts will see this before creating a referral.
        Changes save automatically. "Limited" and "Not Accepting" automatically revert to
        "Available" after 4 hours if left unchanged, so a forgotten setting can't block
        referrals indefinitely.
      </p>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            color: "#dc2626",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div className="capacity-grid">
        {(["Emergency", "Urgent", "Routine"] as (keyof Capacity)[]).map((urg) => (
          <div key={urg} className="capacity-row">
            <div>
              <div className="capacity-row-label">{urg}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {urg === "Emergency" && "Life-threatening cases"}
                {urg === "Urgent" && "Needs attention within hours"}
                {urg === "Routine" && "Non-urgent referrals"}
              </div>
            </div>

            <div className="capacity-options">
              {OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`capacity-option${capacity[urg] === opt ? ` selected ${opt}` : ""}`}
                  onClick={() => toggle(urg, opt)}
                  disabled={saving === urg}
                >
                  {saving === urg && capacity[urg] === opt
                    ? "Saving..."
                    : LABELS[opt]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {lastUpdated && (
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 20 }}>
          Last updated: {lastUpdated}
        </p>
      )}
    </div>
  );
}

export default CapacitySettings;
