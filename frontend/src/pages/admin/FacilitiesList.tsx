import { useEffect, useState } from "react";
import { useNotification } from "../../contexts/NotificationContext";
import {
  getFacilities,
  getFacilitiesBin,
  createFacility,
  updateFacility,
  deleteFacility,
  restoreFacility,
  permanentDeleteFacility,
} from "../../services/adminApi";

const FACILITY_TYPES = ["HEALTH_POST", "HEALTH_CENTER", "DISTRICT_HOSPITAL"];

function emptyForm() {
  return { name: "", type: "HEALTH_POST", district: "", sector: "", phone: "", email: "" };
}

function FacilitiesList() {
  const { error: notifyError, confirm } = useNotification();
  const [tab, setTab] = useState<"active" | "bin">("active");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [tab]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = tab === "bin" ? await getFacilitiesBin() : await getFacilities();
      setFacilities(data);
    } catch (err: any) {
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingFacility(null);
    setForm(emptyForm());
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (facility: any) => {
    setEditingFacility(facility);
    setForm({
      name: facility.name || "",
      type: facility.type || "HEALTH_POST",
      district: facility.district || "",
      sector: facility.sector || "",
      phone: facility.phone || "",
      email: facility.email || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.type || !form.district) {
      setFormError("Name, type, and district are required.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      if (editingFacility) {
        await updateFacility(editingFacility.id, form);
      } else {
        await createFacility(form);
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setFormError(err.message || "Failed to save facility.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (facility: any) => {
    const ok = await confirm(`Move "${facility.name}" to the recycle bin?`, {
      confirmLabel: "Move to Bin",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteFacility(facility.id);
      await load();
    } catch (err: any) {
      notifyError(err.message || "Failed to delete facility.");
    }
  };

  const handleRestore = async (facility: any) => {
    try {
      await restoreFacility(facility.id);
      await load();
    } catch (err: any) {
      notifyError(err.message || "Failed to restore facility.");
    }
  };

  const handlePermanentDelete = async (facility: any) => {
    const ok = await confirm(`Permanently delete "${facility.name}"? This cannot be undone.`, {
      confirmLabel: "Delete Permanently",
      danger: true,
    });
    if (!ok) return;
    try {
      await permanentDeleteFacility(facility.id);
      await load();
    } catch (err: any) {
      notifyError(err.message || "Failed to permanently delete facility.");
    }
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = facilities
    .filter((f) => {
      const s = search.toLowerCase();
      const matchesSearch = !s || f.name?.toLowerCase().includes(s) || f.district?.toLowerCase().includes(s);
      const matchesType = !typeFilter || f.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const av = (a[sortKey] || "").toString().toLowerCase();
      const bv = (b[sortKey] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Facilities</h1>
          <p>Manage health posts, health centers, and district hospitals.</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button
          onClick={() => setTab("active")}
          style={{
            padding: "7px 20px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: tab === "active" ? "#0f172a" : "white",
            color: tab === "active" ? "white" : "#475569",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Active Facilities
        </button>
        <button
          onClick={() => setTab("bin")}
          style={{
            padding: "7px 20px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: tab === "bin" ? "#dc2626" : "white",
            color: tab === "bin" ? "white" : "#475569",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🗑 Recycle Bin
        </button>
      </div>

      <div className="admin-toolbar">
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="admin-search-input"
            placeholder="Search by name or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="admin-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {tab === "active" && (
          <button className="admin-btn-primary" onClick={openCreate}>
            + Add Facility
          </button>
        )}
      </div>

      <div className="admin-table-card">
        {loading && <div className="admin-empty-state">Loading...</div>}

        {!loading && error && (
          <div className="admin-empty-state">
            {error}
            <div style={{ marginTop: 12 }}>
              <button className="admin-btn-secondary" onClick={load}>Retry</button>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="admin-empty-state">
            {tab === "bin" ? "Recycle bin is empty." : "No active facilities found."}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>Name</th>
                <th onClick={() => toggleSort("type")} style={{ cursor: "pointer" }}>Type</th>
                <th onClick={() => toggleSort("district")} style={{ cursor: "pointer" }}>District</th>
                <th>Contact</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.type?.replace(/_/g, " ")}</td>
                  <td>{f.district}{f.sector ? `, ${f.sector}` : ""}</td>
                  <td>{f.phone || f.email || "—"}</td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>
                    {f.created_by_first_name
                      ? `${f.created_by_first_name} ${f.created_by_last_name}`.trim()
                      : "—"}
                    {f.created_at && (
                      <div style={{ marginTop: 2, color: "#94a3b8", fontSize: 12 }}>
                        {new Date(f.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      {tab === "active" ? (
                        <>
                          <button className="admin-btn-secondary" onClick={() => openEdit(f)}>
                            Edit
                          </button>
                          <button className="admin-btn-danger" onClick={() => handleDelete(f)}>
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="admin-btn-secondary" onClick={() => handleRestore(f)}>
                            Restore
                          </button>
                          <button className="admin-btn-danger" onClick={() => handlePermanentDelete(f)}>
                            Delete Permanently
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingFacility ? "Edit Facility" : "Add Facility"}</h2>

            <div className="admin-form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="admin-form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label>District</label>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </div>

            <div className="admin-form-group">
              <label>Sector</label>
              <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>

            <div className="admin-form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="admin-form-group">
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            {formError && <p className="admin-error-text">{formError}</p>}

            <div className="admin-modal-actions">
              <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacilitiesList;
