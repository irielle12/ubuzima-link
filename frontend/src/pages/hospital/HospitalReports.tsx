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

  const card = (label: string, value: number | string, sub?: string, color?: string) => (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "20px 24px",
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: color || "#0f172a" }}>
        {value}
      </p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* OVERVIEW */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Overview — All Time</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {card("Referrals Sent to Us", total, "all referrals addressed to this hospital")}
          {card("Pending Review", pending, "patients not yet seen", pending > 0 ? "#2563eb" : undefined)}
          {card("Closed", closed, "cases fully handled", "#16a34a")}
        </div>
      </section>

      {/* VOLUME */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Referral Volume</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {card("This Week", thisWeek, "last 7 days")}
          {card("This Month", thisMonth, "last 30 days")}
          {card("Feedback Rate", closed > 0 ? `${Math.round((closedWithFeedback / closed) * 100)}%` : "—", `${closedWithFeedback} of ${closed} closed cases`)}
        </div>
      </section>

      {/* BY URGENCY */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>By Urgency</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {card("Emergency", byUrgency.Emergency, "life-threatening", "#dc2626")}
          {card("Urgent", byUrgency.Urgent, "attention within hours", "#d97706")}
          {card("Routine", byUrgency.Routine, "non-urgent", "#475569")}
        </div>
      </section>

      {/* FEEDBACK BREAKDOWN */}
      <section>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Feedback to Health Posts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {card("Closed with Feedback", closedWithFeedback, "notes sent to health post", "#16a34a")}
          {card("Closed without Feedback", closedNoFeedback, "no notes provided")}
        </div>
      </section>

      {/* RECENT CLOSED CASES */}
      {recentClosed.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#0f172a" }}>Recent Closed Cases</h2>
          <div
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Patient", "Diagnosis", "Urgency", "From", "Closed", "Feedback"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentClosed.map((r: any, i: number) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: i < recentClosed.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500 }}>
                      {r.first_name} {r.last_name}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>
                      {r.diagnosis}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          background:
                            r.urgency === "Emergency" ? "#fee2e2" :
                            r.urgency === "Urgent" ? "#fef3c7" : "#f1f5f9",
                          color:
                            r.urgency === "Emergency" ? "#dc2626" :
                            r.urgency === "Urgent" ? "#d97706" : "#475569",
                          fontWeight: 500,
                        }}
                      >
                        {r.urgency}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>
                      {r.source_facility_name || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>
                      {r.hospital_notes ? (
                        <span style={{ color: "#16a34a", fontWeight: 500 }}>✓ Sent</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}

export default HospitalReports;
