import { useEffect, useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import {
  ClipboardList,
  BarChart2,
  LogOut,
  QrCode,
} from "lucide-react";
import { getUser, logout } from "../../services/authApi";
import { getHospitalQueue } from "../../services/referralApi";
import { getFacilityById } from "../../services/facilityApi";
import { useNavigate } from "react-router-dom";
import "../../styles/hospital.css";

function HospitalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const [facilityName, setFacilityName] = useState("Hospital Portal");
  const [queueData, setQueueData] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    if (user?.facilityId) {
      getFacilityById(user.facilityId)
        .then((f) => setFacilityName(f.name))
        .catch(() => {});
    }

    loadQueue();
    const interval = setInterval(loadQueue, 60_000);
    return () => clearInterval(interval);
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

  const handleLogout = () => {
    logout();
    navigate("/hospital/login");
  };

  const pageTitle: Record<string, string> = {
    "/hospital/queue": "Referral Queue",
    "/hospital/receive-qr": "Receive QR Referral",
    "/hospital/reports": "My Reports",
  };

  const title = pageTitle[location.pathname] || "Hospital Portal";

  return (
    <div className="hospital-shell">
      {/* SIDEBAR */}
      <aside className="hospital-sidebar">
        <div className="hospital-sidebar-header">
          <h2>{facilityName}</h2>
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
        </nav>

        <div className="hospital-sidebar-footer">
          <p>
            {user?.firstName} {user?.lastName}
            <br />
            <span style={{ fontSize: 11, color: "#64748b" }}>{user?.role}</span>
          </p>
          <button className="hospital-logout-btn" onClick={handleLogout}>
            <LogOut size={15} />
            Sign Out
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
