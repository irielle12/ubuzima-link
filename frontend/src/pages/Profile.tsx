import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  House, FileText, Wifi, User,
  LogOut, Building2, IdCard, Mail, ShieldCheck, ArrowLeft, KeyRound,
} from "lucide-react";
import { getUser, logout, changePassword } from "../services/authApi";
import { getFacilityById } from "../services/facilityApi";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotification } from "../contexts/NotificationContext";
import { passwordPolicyError, PASSWORD_HINT } from "../utils/passwordPolicy";

const ROLE_LABELS: Record<string, string> = {
  nurse: "Nurse",
  health_worker: "Health Worker",
  clinician: "Clinician",
  doctor: "Doctor",
  admin: "Administrator",
};

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [facility, setFacility] = useState<any>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { navigate("/login"); return; }
    setUser(currentUser);
    if (currentUser.facilityId) {
      getFacilityById(currentUser.facilityId).then(setFacility).catch(() => {});
    }
  }, [navigate]);

  const { t } = useLanguage();
  const { success, error: notifyError } = useNotification();

  const handleLogout = () => { logout(); navigate("/"); };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    if (!navigator.onLine) {
      notifyError(t("Connect to the internet to change your password."));
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      notifyError(t("Please fill in all password fields."));
      return;
    }

    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      notifyError(t(policyError));
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyError(t("New password and confirmation do not match."));
      return;
    }

    try {
      setSaving(true);
      await changePassword(currentPassword, newPassword);
      success(t("Password updated successfully."));
      closePasswordModal();
    } catch (err: any) {
      notifyError(err.message || t("Failed to update password."));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  const rows = [
    { icon: <IdCard size={15} />, label: t("Staff ID"), value: user.staffId },
    { icon: <ShieldCheck size={15} />, label: t("Role"), value: roleLabel },
    { icon: <Building2 size={15} />, label: t("Facility"), value: facility?.name || "—" },
    ...(user.email ? [{ icon: <Mail size={15} />, label: t("Email"), value: user.email }] : []),
  ];

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{t("Profile")}</h1>
        </div>
      </div>

      {/* AVATAR + NAME */}
      <div style={{ textAlign: "center", padding: "28px 20px 24px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "#2563eb", color: "white",
          fontSize: 26, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          {initials || <User size={28} />}
        </div>

        <h2 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 700, color: "#0f172a" }}>
          {user.firstName} {user.lastName}
        </h2>

        <span style={{
          fontSize: 12, fontWeight: 600, color: "#2563eb",
          background: "#eff6ff", padding: "3px 14px",
          borderRadius: 20, display: "inline-block",
        }}>
          {roleLabel}
        </span>
      </div>

      {/* INFO CARD */}
      <div style={{ margin: "0 16px", background: "white", borderRadius: 14, border: "1px solid #e2e8f0" }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 18px",
            borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <span style={{ color: "#94a3b8", display: "flex", flexShrink: 0 }}>{row.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {row.label}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                {row.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* RESET PASSWORD */}
      <div style={{ margin: "16px 16px 0" }}>
        <button
          onClick={() => setShowPasswordModal(true)}
          style={{
            width: "100%", padding: "13px",
            borderRadius: 12, border: "1px solid #e2e8f0",
            background: "white", color: "#334155",
            fontSize: 14, fontWeight: 600,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <KeyRound size={15} />
          {t("Reset Password")}
        </button>
      </div>

      {/* SIGN OUT */}
      <div style={{ margin: "12px 16px 0" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "13px",
            borderRadius: 12, border: "1px solid #bfdbfe",
            background: "white", color: "#2563eb",
            fontSize: 14, fontWeight: 600,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <LogOut size={15} />
          {t("Sign Out")}
        </button>
      </div>

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="warning-modal">
          <div className="warning-card" style={{ width: 320 }}>
            <h3>{t("Reset Password")}</h3>

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "12px 0 6px" }}>
              {t("Current Password")}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
            />

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "12px 0 6px" }}>
              {t("New Password")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t(PASSWORD_HINT)}
            />

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "12px 0 6px" }}>
              {t("Confirm New Password")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />

            <div className="warning-actions">
              <button
                className="primary-action-btn"
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? t("Saving...") : t("Update Password")}
              </button>
              <button className="secondary-action-btn" onClick={closePasswordModal} disabled={saving}>
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav-v2">
        <button className="nav-button" onClick={() => navigate("/dashboard")}>
          <House size={20} /><span>{t("Home")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/referrals")}>
          <FileText size={20} /><span>{t("Work Queue")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/sync")}>
          <Wifi size={20} /><span>{t("Sync")}</span>
        </button>
        <button className="nav-button active">
          <User size={20} /><span>{t("Profile")}</span>
        </button>
      </nav>

    </div>
  );
}

export default Profile;
