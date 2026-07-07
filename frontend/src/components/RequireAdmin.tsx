import { Navigate } from "react-router-dom";
import { getUser, isAuthenticated, needsPasswordChange } from "../services/authApi";

function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/" replace />;

  const user = getUser();
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  if (needsPasswordChange()) return <Navigate to="/force-password-change" replace />;

  return <>{children}</>;
}

export default RequireAdmin;
