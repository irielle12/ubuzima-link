import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Building2, Users, LogOut } from "lucide-react";
import { getUser, logout } from "../../services/authApi";
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
          <h2>Ubuzima-Link</h2>
          <p>Admin Console</p>
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
          <p>
            {user?.firstName} {user?.lastName}
          </p>

          <button
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sign Out
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
