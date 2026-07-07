import { Navigate } from "react-router-dom";
import { getUser, isAuthenticated, needsPasswordChange } from "../services/authApi";

function RequireHospital({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/hospital/login" replace />;
  }

  const user = getUser();

  if (user?.role === "nurse") {
    return <Navigate to="/login" replace />;
  }

  if (needsPasswordChange()) {
    return <Navigate to="/force-password-change" replace />;
  }

  return <>{children}</>;
}

export default RequireHospital;
