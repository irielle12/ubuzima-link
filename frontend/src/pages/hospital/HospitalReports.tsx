import { useOutletContext } from "react-router-dom";

function HospitalReports() {
  const { queueData = [] } = (useOutletContext() as any) || {};

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const total = queueData.length;
  const pending = queueData.filter((r: any) => r.workflow_status === "Pending Hospital Review").length;
  const closed = queueData.filter((r: any) => r.workflow_status === "Closed").length;
  const closedWithFeedback = queueData.filter((r: any) => r.workflow_status === "Closed" && r.hospital_notes).length;
  const closedNoFeedback = closed - closedWithFeedback;

  const thisWeek = queueData.filter((r: any) => new Date(r.created_at) >= weekAgo).length;
  const thisMonth = queueData.filter((r: any) => new Date(r.created_at) >= monthAgo).length;

  const byUrgency = {
    Emergency: queueData.filter((r: any) => r.urgency === "Emergency").length,
    Urgent: queueData.filter((r: any) => r.urgency === "Urgent").length,
    Routine: queueData.filter((r: any) => r.urgency === "Routine").length,
  };

  const recentClosed = queueData
    .filter((r: any) => r.workflow_status === "Closed")
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const card = (label: string, value: number | string, sub?: string, accent?: string) => (
    <div className={`hospital-stat-card${accent ? ` accent-${accent}` : ""}`}>
      <p className="hospital-stat-label">{label}</p>
      <p className="hospital-stat-value">{value}</p>
      {sub && <p className="hospital-stat-sub">{sub}</p>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* OVERVIEW */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Overview — All Time</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {card("Referrals Sent to Us", total, "all referrals addressed to this hospital", "gray")}
          {card("Pending Review", pending, "patients not yet seen", pending > 0 ? "blue" : "gray")}
          {card("Closed", closed, "cases fully handled", "green")}
        </div>
      </section>

      {/* VOLUME */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Referral Volume</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {card("This Week", thisWeek, "last 7 days", "blue")}
          {card("This Month", thisMonth, "last 30 days", "blue")}
          {card("Feedback Rate", closed > 0 ? `${Math.round((closedWithFeedback / closed) * 100)}%` : "—", `${closedWithFeedback} of ${closed} closed cases`, "green")}
        </div>
      </section>

      {/* BY URGENCY */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>By Urgency</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {card("Emergency", byUrgency.Emergency, "life-threatening", "red")}
          {card("Urgent", byUrgency.Urgent, "attention within hours", "amber")}
          {card("Routine", byUrgency.Routine, "non-urgent", "gray")}
        </div>
      </section>

      {/* FEEDBACK BREAKDOWN */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Feedback to Health Posts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {card("Closed with Feedback", closedWithFeedback, "notes sent to health post", "green")}
          {card("Closed without Feedback", closedNoFeedback, "no notes provided", "gray")}
        </div>
      </section>

      {/* RECENT CLOSED CASES */}
      {recentClosed.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Recent Closed Cases</h2>
          <div className="hospital-table-card">
            <table className="hospital-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Diagnosis</th>
                  <th>Urgency</th>
                  <th>From</th>
                  <th>Closed</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {recentClosed.map((r: any) => {
                  const urg = (r.urgency || "Routine").toLowerCase();
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                      <td style={{ color: "#475569" }}>{r.diagnosis}</td>
                      <td><span className={`hospital-badge ${urg}`}>{r.urgency}</span></td>
                      <td style={{ color: "#64748b" }}>{r.source_facility_name || "—"}</td>
                      <td style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        {r.hospital_notes ? (
                          <span style={{ color: "#16a34a", fontWeight: 500 }}>✓ Sent</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}

export default HospitalReports;
