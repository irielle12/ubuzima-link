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
import ForgotPasswordFlow from "../components/ForgotPasswordFlow";
import PasswordInput from "../components/PasswordInput";
import { db } from "../services/db";

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
  const [useEmailReset, setUseEmailReset] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { navigate("/login"); return; }
    setUser(currentUser);
    if (currentUser.facilityId) {
      getFacilityById(currentUser.facilityId).then(setFacility).catch(() => {});
    }
  }, [navigate]);

  const { t } = useLanguage();
  const { success, error: notifyError, confirm } = useNotification();

  const handleLogout = async () => {
    // Data queued here only exists in this device's local storage until it
    // syncs — logging out (often the first step before switching to a new
    // device) is the exact moment a nurse could unknowingly strand it. This
    // can't be recovered after the fact (see ForgotPasswordFlow-adjacent
    // discussion: a device that never reconnects can't hand off data it
    // never transmitted), so the only real fix is warning before it happens.
    const [pendingReferrals, pendingPatients] = await Promise.all([
      db.referrals.toArray().then((all) => all.filter((r) => r.workflowStatus === "Pending Sync")),
      db.patients.toArray().then((all) => all.filter((p) => !p.synced)),
    ]);
    const pendingCount = pendingReferrals.length + pendingPatients.length;

    if (pendingCount > 0) {
      const ok = await confirm(
        t(
          `${pendingCount} referral${pendingCount === 1 ? "" : "s"}/patient record${pendingCount === 1 ? "" : "s"} on this device ${pendingCount === 1 ? "hasn't" : "haven't"} synced yet. If you switch to a different device before syncing, this data will be lost. Connect to the internet and sync before switching devices.`
        ),
        { confirmLabel: t("Sign Out Anyway"), cancelLabel: t("Stay & Sync First"), danger: true }
      );
      if (!ok) return;
    }

    logout();
    navigate("/");
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setUseEmailReset(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleEmailResetDone = (message: string) => {
    closePasswordModal();
    // Resetting a password kills every session for that account, including
    // this one (see resetPasswordWithCode on the backend) — sign out
    // properly now rather than leaving the user on a session that's
    // already dead server-side and would otherwise just get yanked away
    // by surprise on the next authenticated request.
    logout();
    success(`${message} Please sign in again.`);
    navigate("/login");
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
        <div className="avatar-circle" style={{ width: 80, height: 80, fontSize: 26 }}>
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
      <div className="info-card" style={{ margin: "0 16px" }}>
        {rows.map((row) => (
          <div key={row.label} className="info-row" style={{ padding: "14px 18px", gap: 14 }}>
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
          className="secondary-action-btn"
          onClick={() => setShowPasswordModal(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <KeyRound size={15} />
          {t("Reset Password")}
        </button>
      </div>

      {/* SIGN OUT */}
      <div style={{ margin: "12px 16px 0" }}>
        <button
          className="secondary-action-btn"
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            borderColor: "#bfdbfe", color: "#2563eb",
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
            {useEmailReset ? (
              <>
                <h3>{t("Reset Password by Email")}</h3>
                <ForgotPasswordFlow
                  initialStaffId={user.staffId}
                  lockStaffId
                  onDone={handleEmailResetDone}
                  onCancel={() => setUseEmailReset(false)}
                />
              </>
            ) : (
              <>
                <h3>{t("Reset Password")}</h3>

                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "12px 0 6px" }}>
                  {t("Current Password")}
                </label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoFocus
                />

                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "12px 0 6px" }}>
                  {t("New Password")}
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t(PASSWORD_HINT)}
                />

                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "12px 0 6px" }}>
                  {t("Confirm New Password")}
                </label>
                <PasswordInput
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

                {user.email ? (
                  <p style={{ textAlign: "center", marginTop: 14 }}>
                    <button
                      onClick={() => setUseEmailReset(true)}
                      style={{
                        background: "none", border: "none", color: "#2563eb",
                        fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0,
                      }}
                    >
                      {t("Forgot your current password? Reset via email instead")}
                    </button>
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 14 }}>
                    {t("No email on file — an administrator can reset your password if you forget it.")}
                  </p>
                )}
              </>
            )}
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
