import { Navigate, Outlet } from "react-router-dom";
import { getUser, isAuthenticated } from "../services/authApi";

function RequireNurse() {
  if (!isAuthenticated()) return <Navigate to="/" replace />;

  const user = getUser();
  if (user?.role !== "nurse") return <Navigate to="/" replace />;

  return <Outlet />;
}

export default RequireNurse;
