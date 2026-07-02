import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  House,
  FileText,
  Wifi,
  User,
  LogOut,
  Building2,
  IdCard,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getUser, logout } from "../services/authApi";
import { getFacilityById } from "../services/facilityApi";

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

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      navigate("/login");
      return;
    }

    setUser(currentUser);

    if (currentUser.facilityId) {
      getFacilityById(currentUser.facilityId)
        .then(setFacility)
        .catch((err) => console.error(err));
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) {
    return null;
  }

  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button
          className="back-btn-v2"
          onClick={() => navigate("/dashboard")}
        >
          ←
        </button>

        <div>
          <h1>Profile</h1>
          <p>Your account details</p>
        </div>
      </div>

      {/* IDENTITY CARD */}
      <div
        className="details-card"
        style={{ textAlign: "center" }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#2563eb",
            color: "white",
            fontSize: 24,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          {initials || <User size={28} />}
        </div>

        <h3 style={{ marginBottom: 4 }}>
          {user.firstName} {user.lastName}
        </h3>

        <p className="muted">
          {ROLE_LABELS[user.role] || user.role}
        </p>
      </div>

      {/* DETAILS */}
      <div className="details-card">
        <h3>Account Information</h3>

        <div className="detail-row">
          <strong>
            <IdCard size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Staff ID
          </strong>
          <span>{user.staffId}</span>
        </div>

        <div className="detail-row">
          <strong>
            <ShieldCheck size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Role
          </strong>
          <span>{ROLE_LABELS[user.role] || user.role}</span>
        </div>

        <div className="detail-row">
          <strong>
            <Building2 size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Facility
          </strong>
          <span>{facility ? facility.name : "—"}</span>
        </div>

        {user.email && (
          <div className="detail-row">
            <strong>
              <Mail size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Email
            </strong>
            <span>{user.email}</span>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="actions-container">
        <button
          className="secondary-action-btn"
          onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav-v2">
        <button
          className="nav-button"
          onClick={() => navigate("/dashboard")}
        >
          <House size={20} />
          <span>Home</span>
        </button>

        <button
          className="nav-button"
          onClick={() => navigate("/referrals")}
        >
          <FileText size={20} />
          <span>Work Queue</span>
        </button>

        <button
          className="nav-button"
          onClick={() => navigate("/sync")}
        >
          <Wifi size={20} />
          <span>Sync</span>
        </button>

        <button className="nav-button active">
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

    </div>
  );
}

export default Profile;
