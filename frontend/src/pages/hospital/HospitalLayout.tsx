import { useEffect, useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import {
  ClipboardList,
  BarChart2,
  LogOut,
  QrCode,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import { getUser, logout } from "../../services/authApi";
import { getHospitalQueue } from "../../services/referralApi";
import { getFacilityById } from "../../services/facilityApi";
import { useNavigate } from "react-router-dom";
import BrandMark from "../../components/BrandMark";
import "../../styles/hospital.css";

function HospitalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const [facilityName, setFacilityName] = useState("Hospital Portal");
  const [queueData, setQueueData] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (user?.facilityId) {
      getFacilityById(user.facilityId)
        .then((f) => setFacilityName(f.name))
        .catch(() => {});
    }

    loadQueue();
    const interval = setInterval(loadQueue, 60_000);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const loadQueue = async () => {
    try {
      setQueueLoading(true);
      const data = await getHospitalQueue();
      setQueueData(data);
    } catch {
      /* stay on stale data when offline */
    } finally {
      setQueueLoading(false);
    }
  };

  const pendingCount = queueData.filter(
    (r) => r.workflow_status === "Pending Hospital Review"
  ).length;

  const closedCount = queueData.filter(
    (r) => r.workflow_status === "Closed"
  ).length;

  const handleLogout = () => {
    logout();
    navigate("/hospital/login");
  };

  const pageTitle: Record<string, string> = {
    "/hospital/queue": "Referral Queue",
    "/hospital/closed": "Closed Referrals",
    "/hospital/receive-qr": "Receive QR Referral",
    "/hospital/reports": "My Reports",
    "/hospital/capacity": "Capacity Settings",
  };

  const title = pageTitle[location.pathname] || "Hospital Portal";

  return (
    <div className="hospital-shell">
      {/* SIDEBAR */}
      <aside className="hospital-sidebar">
        <div className="hospital-sidebar-header">
          <BrandMark size={28} />
          <div>
            <h2>{facilityName}</h2>
            <p>
              <span className={`hospital-online-dot${isOnline ? "" : " offline"}`} />
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <nav className="hospital-nav">
          <NavLink
            to="/hospital/queue"
            end
            className={({ isActive }) =>
              `hospital-nav-item${isActive ? " active" : ""}`
            }
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <ClipboardList size={17} />
              Referral Queue
            </span>
            {pendingCount > 0 && (
              <span className="hospital-nav-badge">{pendingCount}</span>
            )}
          </NavLink>

          <NavLink
            to="/hospital/closed"
            className={({ isActive }) =>
              `hospital-nav-item${isActive ? " active" : ""}`
            }
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <CheckCircle2 size={17} />
              Closed Referrals
            </span>
            {closedCount > 0 && (
              <span className="hospital-nav-badge muted">{closedCount}</span>
            )}
          </NavLink>

          <NavLink
            to="/hospital/receive-qr"
            className={({ isActive }) =>
              `hospital-nav-item${isActive ? " active" : ""}`
            }
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <QrCode size={17} />
              Scan QR
            </span>
          </NavLink>

          <NavLink
            to="/hospital/reports"
            className={({ isActive }) =>
              `hospital-nav-item${isActive ? " active" : ""}`
            }
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <BarChart2 size={17} />
              My Reports
            </span>
          </NavLink>

          <NavLink
            to="/hospital/capacity"
            className={({ isActive }) =>
              `hospital-nav-item${isActive ? " active" : ""}`
            }
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Gauge size={17} />
              Capacity Settings
            </span>
          </NavLink>
        </nav>

        <div className="hospital-sidebar-footer">
          <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: 13, margin: 0 }}>
            {`${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase()}
          </div>
          <div className="hospital-sidebar-footer-info">
            <p>{user?.firstName} {user?.lastName}</p>
            <span style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>{user?.role}</span>
          </div>
          <button className="hospital-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="hospital-main">
        <header className="hospital-topbar">
          <h1 className="hospital-topbar-title">{title}</h1>

          <div className="hospital-topbar-right">
            <span className="hospital-topbar-user">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
        </header>

        <main className="hospital-content">
          <Outlet
            context={{
              queueData,
              queueLoading,
              loadQueue,
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default HospitalLayout;
