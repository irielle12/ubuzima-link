import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { X } from "lucide-react";
import {
  getReferralEvents,
  closeReferral,
} from "../../services/referralApi";
import {
  createReturnReferral,
  getReturnReferral,
} from "../../services/returnReferralApi";

/* workflow_status → badge class */
const STATUS_CLASS: Record<string, string> = {
  "Pending Hospital Review": "pending",
  Arrived: "arrived",
  Closed: "closed",
};

type Toast = { msg: string; type: "success" | "error" } | null;

function calcAge(dob: string | undefined): string {
  if (!dob) return "—";
  const y = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)
  );
  return isNaN(y) ? "—" : `${y} yrs`;
}

function HospitalQueue({ scope = "active" }: { scope?: "active" | "closed" }) {
  const { queueData = [], queueLoading = false, loadQueue } =
    (useOutletContext() as any) || {};

  const scopedData = queueData.filter((r: any) =>
    scope === "closed" ? r.workflow_status === "Closed" : r.workflow_status !== "Closed"
  );

  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("urgency");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selected, setSelected] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [returnReferral, setReturnReferral] = useState<any>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [closeNotes, setCloseNotes] = useState("");

  /* return referral form */
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnData, setReturnData] = useState({
    followUpInstructions: "",
    medicationsPrescribed: "",
    nextAppointmentDate: "",
    followUpUrgency: "Routine",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openPanel = async (r: any) => {
    setSelected(r);
    setShowReturnForm(false);
    setCloseNotes("");
    setPanelLoading(true);

    try {
      const [evts, ret] = await Promise.allSettled([
        getReferralEvents(r.id),
        getReturnReferral(r.id),
      ]);
      setEvents(evts.status === "fulfilled" ? evts.value : []);
      setReturnReferral(ret.status === "fulfilled" ? ret.value : null);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setSelected(null);
    setEvents([]);
    setReturnReferral(null);
  };

  const refreshAndUpdate = async (updated: any) => {
    const referralId = updated?.id ?? selected?.id;
    setSelected((prev: any) => (prev ? { ...prev, ...updated } : prev));
    if (loadQueue) await loadQueue();

    // Re-fetch the timeline too, so actions taken here (close, return
    // referral) show up in the audit log immediately instead of only
    // after closing and reopening the panel.
    if (referralId) {
      try {
        setEvents(await getReferralEvents(referralId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  /* CLOSE */
  const doClose = async () => {
    if (!selected) return;
    try {
      setBusy(true);
      const r = await closeReferral(
        selected.id,
        undefined,
        closeNotes || undefined
      );
      await refreshAndUpdate(r);
      showToast("Referral closed");
      setCloseNotes("");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  /* RETURN REFERRAL */
  const doReturn = async () => {
    if (!selected || !returnData.followUpInstructions.trim()) {
      showToast("Follow-up instructions are required", "error");
      return;
    }
    try {
      setBusy(true);
      const ret = await createReturnReferral(selected.id, returnData);
      setReturnReferral(ret);
      await refreshAndUpdate({ workflow_status: "Closed" });
      setShowReturnForm(false);
      showToast("Return referral issued. Referral closed.");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };


  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const urgencyOrder: Record<string, number> = {
    Emergency: 1,
    Urgent: 2,
    Routine: 3,
  };
  const statusOrder: Record<string, number> = {
    "Pending Hospital Review": 1,
    Arrived: 2,
    Closed: 3,
  };

  const rows = scopedData
    .filter((r: any) => {
      if (statusFilter !== "all" && r.workflow_status !== statusFilter)
        return false;
      if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(s) ||
          r.phone?.includes(s) ||
          r.referral_number?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sortKey === "urgency") {
        av = urgencyOrder[a.urgency] ?? 9;
        bv = urgencyOrder[b.urgency] ?? 9;
      } else if (sortKey === "status") {
        av = statusOrder[a.workflow_status] ?? 9;
        bv = statusOrder[b.workflow_status] ?? 9;
      } else {
        av = (a[sortKey] || "").toString().toLowerCase();
        bv = (b[sortKey] || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const STATUSES: { value: string; label: string }[] =
    scope === "closed"
      ? []
      : [
          { value: "all", label: "All Statuses" },
          { value: "Pending Hospital Review", label: "Pending Hospital Review" },
          { value: "Arrived", label: "Arrived" },
        ];

  const status = selected?.workflow_status;

  return (
    <>
      {/* FILTER BAR */}
      <div className="hospital-filter-bar">
        <input
          className="hospital-filter-input"
          placeholder="Search by patient name, phone, or reference number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {STATUSES.length > 0 && (
          <select
            className="hospital-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        <select
          className="hospital-filter-select"
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
        >
          <option value="all">All Urgency</option>
          <option value="Emergency">Emergency</option>
          <option value="Urgent">Urgent</option>
          <option value="Routine">Routine</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="hospital-table-card">
        <table className="hospital-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("urgency")}>Urgency</th>
                <th onClick={() => toggleSort("first_name")}>Patient</th>
                <th>Referring Facility</th>
                <th>Diagnosis</th>
                <th onClick={() => toggleSort("created_at")}>Received</th>
                <th onClick={() => toggleSort("status")}>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queueLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hospital-skeleton-row">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}>
                        <div
                          className="hospital-skeleton-cell"
                          style={{ width: j === 2 ? "60%" : "80%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {!queueLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="hospital-empty">
                      No referrals match your filters.
                    </div>
                  </td>
                </tr>
              )}

              {!queueLoading &&
                rows.slice(0, 50).map((r: any) => {
                  const urg = (r.urgency || "Routine").toLowerCase() as
                    | "emergency"
                    | "urgent"
                    | "routine";

                  const actionLabel =
                    r.workflow_status === "Pending Hospital Review"
                      ? "Accept"
                      : r.workflow_status === "Arrived"
                      ? "Close"
                      : null;

                  return (
                    <tr
                      key={r.id}
                      className={`urgency-${urg}`}
                      onClick={() => openPanel(r)}
                      style={{
                        background:
                          selected?.id === r.id ? "#eff6ff" : undefined,
                      }}
                    >
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span className={`urgency-dot ${urg}`} />
                          <span className={`hospital-badge ${urg}`}>
                            {r.urgency}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {r.first_name} {r.last_name}
                        </strong>
                        <br />
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {r.referral_number}
                        </span>
                      </td>

                      <td style={{ fontSize: 13, color: "#475569" }}>
                        {r.source_facility_name || "—"}
                      </td>

                      <td
                        style={{
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.diagnosis}
                      </td>

                      <td style={{ fontSize: 13, color: "#64748b" }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>

                      <td>
                        <span
                          className={`hospital-badge ${STATUS_CLASS[r.workflow_status] || ""}`}
                        >
                          {r.workflow_status}
                        </span>
                      </td>

                      <td onClick={(e) => e.stopPropagation()}>
                        {actionLabel && (
                          <button
                            className="hospital-action-btn primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPanel(r);
                            }}
                          >
                            {actionLabel}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
      </div>

      {/* SIDE PANEL */}
      {selected && (
        <>
          <div className="hospital-panel-overlay" onClick={closePanel} />

          <div className="hospital-panel">
            {/* HEADER */}
            <div className="hospital-panel-header">
              <div>
                <h2>
                  {selected.first_name} {selected.last_name}
                </h2>
                <span
                  className={`hospital-badge ${STATUS_CLASS[status] || ""}`}
                >
                  {status}
                </span>
              </div>
              <button className="hospital-panel-close" onClick={closePanel}>
                <X size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="hospital-panel-body">

              {/* PATIENT */}
              <div className="hospital-panel-section">
                <h3>Patient</h3>
                <div className="hospital-panel-row">
                  <strong>Name</strong>
                  <span>
                    {selected.first_name} {selected.last_name}
                  </span>
                </div>
                <div className="hospital-panel-row">
                  <strong>Age / Gender</strong>
                  <span>
                    {calcAge(selected.date_of_birth)} · {selected.gender}
                  </span>
                </div>
                <div className="hospital-panel-row">
                  <strong>Phone</strong>
                  <span>{selected.phone || "—"}</span>
                </div>
              </div>

              {/* REFERRAL */}
              <div className="hospital-panel-section">
                <h3>Referral</h3>
                <div className="hospital-panel-row">
                  <strong>Ref #</strong>
                  <span>{selected.referral_number}</span>
                </div>
                <div className="hospital-panel-row">
                  <strong>From</strong>
                  <span>{selected.source_facility_name || "—"}</span>
                </div>
                <div className="hospital-panel-row">
                  <strong>Diagnosis</strong>
                  <span>{selected.diagnosis}</span>
                </div>
                <div className="hospital-panel-row">
                  <strong>Urgency</strong>
                  <span>{selected.urgency}</span>
                </div>
                <div className="hospital-panel-row">
                  <strong>Created</strong>
                  <span>
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                </div>
                {selected.arrived_at && (
                  <div className="hospital-panel-row">
                    <strong>Arrived</strong>
                    <span>
                      {new Date(selected.arrived_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* CLOSED: feedback if available */}
              {status === "Closed" && (
                <div className="hospital-panel-section">
                  <h3>Outcome</h3>
                  {selected.treatment_status || selected.hospital_notes ? (
                    <>
                      {selected.treatment_status && (
                        <div className="hospital-panel-row">
                          <strong>Treatment</strong>
                          <span>{selected.treatment_status}</span>
                        </div>
                      )}
                      {selected.hospital_notes && (
                        <p
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            color: "#475569",
                            lineHeight: 1.5,
                          }}
                        >
                          {selected.hospital_notes}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>
                      Closed without feedback.
                    </p>
                  )}
                </div>
              )}

              {/* RETURN REFERRAL (read-only when issued) */}
              {returnReferral && (
                <div className="hospital-panel-section">
                  <h3>Return Referral Issued</h3>
                  <div className="hospital-panel-row">
                    <strong>Follow-up urgency</strong>
                    <span>{returnReferral.follow_up_urgency}</span>
                  </div>
                  {returnReferral.next_appointment_date && (
                    <div className="hospital-panel-row">
                      <strong>Next appt.</strong>
                      <span>{returnReferral.next_appointment_date}</span>
                    </div>
                  )}
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#475569",
                    }}
                  >
                    {returnReferral.follow_up_instructions}
                  </p>
                </div>
              )}

              {/* TIMELINE */}
              <div className="hospital-panel-section">
                <h3>Timeline</h3>
                {panelLoading ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</p>
                ) : events.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No events yet.</p>
                ) : (
                  <ul className="hospital-timeline">
                    {events.map((ev, i) => (
                      <li key={ev.id} className="hospital-timeline-item">
                        <div
                          className={`hospital-timeline-dot${i > 0 ? " faded" : ""}`}
                        />
                        <div className="hospital-timeline-content">
                          <div className="hospital-timeline-type">
                            {ev.event_type}
                          </div>
                          {ev.event_description && (
                            <div className="hospital-timeline-desc">
                              {ev.event_description}
                            </div>
                          )}
                          <div className="hospital-timeline-time">
                            {new Date(ev.created_at).toLocaleString()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>


            </div>

            {/* FOOTER — actions */}
            <div className="hospital-panel-footer">

              {/* PENDING HOSPITAL REVIEW or ARRIVED → feedback + close */}
              {(status === "Pending Hospital Review" || (status === "Arrived" && !showReturnForm && !returnReferral)) && (
                <>
                  <div className="hospital-form-group">
                    <label className="hospital-form-label">
                      Feedback for health post (optional)
                    </label>
                    <textarea
                      className="hospital-form-textarea"
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      placeholder="Clinical notes to send back to the referring health post..."
                    />
                  </div>

                  <button
                    className="hospital-action-btn primary"
                    onClick={doClose}
                    disabled={busy}
                    style={{ width: "100%" }}
                  >
                    {busy ? "Closing..." : "Close Referral"}
                  </button>

                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12,
                      color: "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    Feedback is optional — you can close without filling the form.
                  </p>

                  {status === "Arrived" && (
                    <button
                      className="hospital-action-btn secondary"
                      onClick={() => setShowReturnForm(true)}
                      style={{ marginTop: 8 }}
                    >
                      Issue Return Referral instead
                    </button>
                  )}
                </>
              )}

              {/* RETURN REFERRAL FORM */}
              {status === "Arrived" && showReturnForm && !returnReferral && (
                <>
                  <div className="hospital-form-group">
                    <label className="hospital-form-label">
                      Follow-up Instructions *
                    </label>
                    <textarea
                      className="hospital-form-textarea"
                      value={returnData.followUpInstructions}
                      onChange={(e) =>
                        setReturnData((d) => ({
                          ...d,
                          followUpInstructions: e.target.value,
                        }))
                      }
                      placeholder="Instructions for the referring health post"
                    />
                  </div>
                  <div className="hospital-form-group">
                    <label className="hospital-form-label">
                      Medications Prescribed
                    </label>
                    <textarea
                      className="hospital-form-textarea"
                      value={returnData.medicationsPrescribed}
                      onChange={(e) =>
                        setReturnData((d) => ({
                          ...d,
                          medicationsPrescribed: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="hospital-form-group">
                    <label className="hospital-form-label">
                      Next Appointment Date
                    </label>
                    <input
                      type="date"
                      className="hospital-form-input"
                      value={returnData.nextAppointmentDate}
                      onChange={(e) =>
                        setReturnData((d) => ({
                          ...d,
                          nextAppointmentDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="hospital-form-group">
                    <label className="hospital-form-label">
                      Follow-up Urgency
                    </label>
                    <select
                      className="hospital-form-select"
                      value={returnData.followUpUrgency}
                      onChange={(e) =>
                        setReturnData((d) => ({
                          ...d,
                          followUpUrgency: e.target.value,
                        }))
                      }
                    >
                      <option>Routine</option>
                      <option>Urgent</option>
                      <option>Emergency</option>
                    </select>
                  </div>
                  <button
                    className="hospital-action-btn primary"
                    onClick={doReturn}
                    disabled={busy || !returnData.followUpInstructions.trim()}
                    style={{ width: "100%" }}
                  >
                    Issue Return Referral
                  </button>
                  <button
                    className="hospital-action-btn secondary"
                    onClick={() => setShowReturnForm(false)}
                  >
                    Cancel
                  </button>
                </>
              )}

            </div>
          </div>
        </>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`hospital-toast ${toast.type}`}>{toast.msg}</div>
      )}
    </>
  );
}

export default HospitalQueue;
