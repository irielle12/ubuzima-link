import { Navigate, Outlet } from "react-router-dom";
import { getUser, isAuthenticated, needsPasswordChange } from "../services/authApi";

function RequireNurse() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;

  const user = getUser();
  if (user?.role !== "nurse") return <Navigate to="/login" replace />;

  if (needsPasswordChange()) return <Navigate to="/force-password-change" replace />;

  return <Outlet />;
}

export default RequireNurse;
