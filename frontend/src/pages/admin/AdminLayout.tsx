import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Building2, Users, LogOut } from "lucide-react";
import { getUser, logout } from "../../services/authApi";
import BrandMark from "../../components/BrandMark";
import "../../styles/admin.css";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <BrandMark size={28} />
          <div>
            <h2>Ubuzima-Link</h2>
            <p>Admin Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${isActive("/admin/facilities") ? "active" : ""}`}
            onClick={() => navigate("/admin/facilities")}
          >
            <Building2 size={18} />
            Facilities
          </button>

          <button
            className={`admin-nav-item ${isActive("/admin/users") ? "active" : ""}`}
            onClick={() => navigate("/admin/users")}
          >
            <Users size={18} />
            Users
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: 13, margin: 0 }}>
            {`${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase()}
          </div>
          <div className="admin-sidebar-footer-info">
            <p>{user?.firstName} {user?.lastName}</p>
          </div>
          <button
            className="admin-logout-btn"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
