import { useEffect, useState } from "react";
import { useNotification } from "../../contexts/NotificationContext";
import { passwordPolicyError, PASSWORD_HINT } from "../../utils/passwordPolicy";
import {
  getUsers,
  getUsersBin,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  restoreUser,
  permanentDeleteUser,
  revokeUserSessions,
  getFacilities,
} from "../../services/adminApi";

const ROLES = ["nurse", "clinician", "admin"];

function emptyForm() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "nurse",
    facilityId: "",
  };
}

function UsersList() {
  const { error: notifyError, success: notifySuccess, confirm } = useNotification();
  const [tab, setTab] = useState<"active" | "bin">("active");
  const [users, setUsers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [sortKey, setSortKey] = useState("first_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  /* Credential card shown after create or password reset */
  const [credentials, setCredentials] = useState<{ staffId: string; password: string; name: string } | null>(null);

  /* Reset password modal */
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    load();
  }, [tab, facilityFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data =
        tab === "bin"
          ? await getUsersBin(facilityFilter || undefined)
          : await getUsers(facilityFilter || undefined);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async () => {
    try {
      const data = await getFacilities();
      setFacilities(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setForm({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "nurse",
      facilityId: user.facility_id || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingUser && (!form.firstName || !form.lastName || !form.password)) {
      setFormError("Name and password are required.");
      return;
    }

    // Admin/clinician logins require an email on file to send their 2FA
    // code to — without this check, saving one without an email creates an
    // account that can never complete its own sign-in.
    if ((form.role === "admin" || form.role === "clinician") && !form.email) {
      setFormError(`An email address is required for the ${form.role} role (used for two-factor sign-in).`);
      return;
    }

    if (!editingUser) {
      const policyError = passwordPolicyError(form.password);
      if (policyError) {
        setFormError(policyError);
        return;
      }
    }

    try {
      setSaving(true);
      setFormError("");
      if (editingUser) {
        await updateUser(editingUser.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || null,
          role: form.role,
          facilityId: form.facilityId || null,
        });
      } else {
        const created = await createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || null,
          password: form.password,
          role: form.role,
          facilityId: form.facilityId || null,
        });
        /* Show credential card with the auto-generated staff ID */
        setCredentials({
          staffId: created.staff_id,
          password: form.password,
          name: `${form.firstName} ${form.lastName}`,
        });
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setFormError(err.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      setResetError(policyError);
      return;
    }
    try {
      setResetting(true);
      setResetError("");
      await resetUserPassword(resetTarget.id, newPassword);
      setCredentials({
        staffId: resetTarget.staff_id,
        password: newPassword,
        name: `${resetTarget.first_name} ${resetTarget.last_name}`,
      });
      setResetTarget(null);
      setNewPassword("");
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (user: any) => {
    const ok = await confirm(`Move "${user.first_name} ${user.last_name}" to the recycle bin?`, {
      confirmLabel: "Move to Bin",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteUser(user.id);
      await load();
    } catch (err: any) {
      notifyError(err.message || "Failed to delete user.");
    }
  };

  const handleRestore = async (user: any) => {
    try {
      await restoreUser(user.id);
      await load();
    } catch (err: any) {
      notifyError(err.message || "Failed to restore user.");
    }
  };

  const handleRevokeSessions = async (user: any) => {
    const ok = await confirm(
      `Sign "${user.first_name} ${user.last_name}" out of every device? They'll need to sign in again, including any device currently offline once it reconnects.`,
      { confirmLabel: "Sign Out All Devices", danger: true }
    );
    if (!ok) return;
    try {
      await revokeUserSessions(user.id);
      notifySuccess(`${user.first_name} ${user.last_name} has been signed out of all devices.`);
    } catch (err: any) {
      notifyError(err.message || "Failed to revoke sessions.");
    }
  };

  const handlePermanentDelete = async (user: any) => {
    const ok = await confirm(`Permanently delete "${user.first_name} ${user.last_name}"? This cannot be undone.`, {
      confirmLabel: "Delete Permanently",
      danger: true,
    });
    if (!ok) return;
    try {
      await permanentDeleteUser(user.id);
      await load();
    } catch (err: any) {
      notifyError(err.message || "Failed to permanently delete user.");
    }
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = users
    .filter((u) => {
      const s = search.toLowerCase();
      return (
        !s ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(s) ||
        u.staff_id?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
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
          <h1>Users</h1>
          <p>Manage staff accounts and facility assignments.</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button
          className={`admin-tab-btn ${tab === "active" ? "active" : ""}`}
          onClick={() => setTab("active")}
        >
          Active Users
        </button>
        <button
          className={`admin-tab-btn danger ${tab === "bin" ? "active" : ""}`}
          onClick={() => setTab("bin")}
        >
          🗑 Recycle Bin
        </button>
      </div>

      <div className="admin-toolbar">
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="admin-search-input"
            placeholder="Search by name, staff ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="admin-filter-select"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
          >
            <option value="">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {tab === "active" && (
          <button className="admin-btn-primary" onClick={openCreate}>
            + Add User
          </button>
        )}
      </div>

      <div className="admin-table-card">
        {loading && <div className="admin-empty-state">Loading users...</div>}

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
            {tab === "bin" ? "Recycle bin is empty." : "No active users found."}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("first_name")} style={{ cursor: "pointer" }}>Name</th>
                <th onClick={() => toggleSort("staff_id")} style={{ cursor: "pointer" }}>Staff ID</th>
                <th onClick={() => toggleSort("role")} style={{ cursor: "pointer" }}>Role</th>
                <th>Facility</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.staff_id}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                  <td>{u.facility_name || "—"}</td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>
                    {u.created_by_first_name
                      ? `${u.created_by_first_name} ${u.created_by_last_name}`.trim()
                      : "—"}
                    {u.created_at && (
                      <div style={{ marginTop: 2, color: "#94a3b8", fontSize: 12 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      {tab === "active" ? (
                        <>
                          <button className="admin-btn-secondary" onClick={() => openEdit(u)}>
                            Edit
                          </button>
                          <button
                            className="admin-btn-secondary"
                            onClick={() => { setResetTarget(u); setNewPassword(""); setResetError(""); }}
                          >
                            Reset Password
                          </button>
                          <button className="admin-btn-secondary" onClick={() => handleRevokeSessions(u)}>
                            Sign Out All Devices
                          </button>
                          <button className="admin-btn-danger" onClick={() => handleDelete(u)}>
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="admin-btn-secondary" onClick={() => handleRestore(u)}>
                            Restore
                          </button>
                          <button className="admin-btn-danger" onClick={() => handlePermanentDelete(u)}>
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

      {/* CREDENTIAL CARD — shown after create or password reset */}
      {credentials && (
        <div className="admin-modal-overlay" onClick={() => setCredentials(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 style={{ marginBottom: 4 }}>Account Ready</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              Share these credentials with <strong>{credentials.name}</strong>. Store the password safely — it won't be shown again.
            </p>

            <div
              style={{
                background: "#f8fafc",
                border: "2px dashed #cbd5e1",
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 16,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Staff ID
                </p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: "#0f172a", letterSpacing: "0.06em" }}>
                  {credentials.staffId}
                </p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Password
                </p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: "#0f172a", letterSpacing: "0.06em" }}>
                  {credentials.password}
                </p>
              </div>
            </div>

            <button
              className="admin-btn-primary"
              style={{ width: "100%", marginBottom: 8 }}
              onClick={() => {
                navigator.clipboard?.writeText(
                  `Staff ID: ${credentials.staffId}\nPassword: ${credentials.password}`
                );
              }}
            >
              Copy to Clipboard
            </button>
            <button className="admin-btn-secondary" style={{ width: "100%" }} onClick={() => setCredentials(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetTarget && (
        <div className="admin-modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h2>Reset Password</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Set a new password for <strong>{resetTarget.first_name} {resetTarget.last_name}</strong>.
            </p>

            <div className="admin-form-group">
              <label>New Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={PASSWORD_HINT}
                autoFocus
              />
            </div>

            {resetError && <p className="admin-error-text">{resetError}</p>}

            <div className="admin-modal-actions">
              <button className="admin-btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button>
              <button className="admin-btn-primary" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Saving..." : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? "Edit User" : "Add User"}</h2>

            {!editingUser && (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: 6 }}>
                Staff ID will be auto-generated based on the selected role (e.g. NURSE001).
              </p>
            )}

            <div className="admin-form-group">
              <label>First Name</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label>Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label>
                Email
                {(form.role === "admin" || form.role === "clinician") && (
                  <span style={{ color: "#dc2626" }}> * required for two-factor sign-in</span>
                )}
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {!editingUser && (
              <div className="admin-form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={PASSWORD_HINT}
                />
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                  This is a temporary password — the staff member must change it on first login.
                </p>
              </div>
            )}

            <div className="admin-form-group">
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label>Facility</label>
              <select
                value={form.facilityId}
                onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
              >
                <option value="">No Facility</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {formError && <p className="admin-error-text">{formError}</p>}

            <div className="admin-modal-actions">
              <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
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

export default UsersList;
