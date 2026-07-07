import { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Stethoscope, ShieldCheck } from "lucide-react";
import { login as loginRequest, getUser } from "../services/authApi";
import BrandMark from "../components/BrandMark";
import "../styles/hospital.css";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = searchParams.get("role") || "worker";

  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const getTitle = () => {
    switch (role) {
      case "admin":
        return "Administrator Login";
      default:
        return "Health Worker Login";
    }
  };

  const handleLogin = async () => {
    if (!workerId || !password) return;

    try {
      setLoggingIn(true);
      setError("");

      await loginRequest(workerId, password);

      const loggedInUser = getUser();

      if (loggedInUser?.mustChangePassword) {
        navigate("/force-password-change");
      } else if (loggedInUser?.role === "admin") {
        navigate("/admin/facilities");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid Staff ID or password.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className={`hospital-login-shell ${role === "admin" ? "auth-admin" : "auth-worker"}`}>
      <div className="auth-glow auth-glow-a" />
      <div className="auth-glow auth-glow-b" />

      <div className="hospital-login-card">

        <div className="hospital-login-mark">
          <BrandMark size={44} />
        </div>

        <div className="hospital-login-logo">
          <h1>Ubuzima-Link</h1>
          <p>Healthcare Referral Management System</p>
        </div>

        <div className="hospital-login-role-badge">
          {role === "admin" ? <ShieldCheck size={14} /> : <Stethoscope size={14} />}
          <span>{getTitle()}</span>
        </div>

        <label>Staff ID</label>
        <input
          type="text"
          autoComplete="off"
          placeholder="Enter your staff ID"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        {!isOnline && !error && (
          <p style={{ color: "#b45309", fontSize: 12, margin: "0 0 10px" }}>
            You're offline. You can still sign in if you've signed in on this device before.
          </p>
        )}

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px" }}>
            {error}
          </p>
        )}

        <button
          className="hospital-login-btn"
          onClick={handleLogin}
          disabled={loggingIn}
        >
          {loggingIn ? "Signing in..." : "Sign In"}
        </button>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
          Contact your administrator if you need access
        </p>

        <p style={{ textAlign: "center", marginTop: 12 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            ← Back to home
          </button>
        </p>

      </div>
    </div>
  );
}

export default Login;
