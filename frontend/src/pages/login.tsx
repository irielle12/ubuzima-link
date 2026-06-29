import { useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role =
    searchParams.get("role") || "worker";

  const [workerId, setWorkerId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const getTitle = () => {
    switch (role) {
      case "hospital":
        return "Hospital Staff Login";

      case "admin":
        return "Administrator Login";

      default:
        return "Health Worker Login";
    }
  };
  const handleLogin = () => {
  if (!workerId || !password) return;

  localStorage.setItem(
    "user",
    JSON.stringify({
      workerId,
      role,
    })
  );

  navigate("/dashboard");
}; 
return (
    <div className="login-v2">

      <div className="login-container-v2">

        <div className="login-header-v2">

          <h1>Ubuzima-Link</h1>

          <p>
            Healthcare Referral
            Management System
          </p>

        </div>

        <div className="login-card-v2">

          <h2>{getTitle()}</h2>

          <p className="login-subtitle">
            Sign in to continue
          </p>

          <label>
            STAFF ID
          </label>

          <input
            type="text"
            autoComplete="off"
            placeholder="Enter Staff ID"
            value={workerId}
            onChange={(e) =>
              setWorkerId(
                e.target.value
              )
            }
          />

          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="Enter Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            className="login-btn-v2"
            onClick={handleLogin}
          >
            Sign In
          </button>

        </div>

        <div className="login-footer-v2">

          <span>
            Offline First
          </span>

          <span>
            Secure Access
          </span>

          <span>
            QR Enabled
          </span>

        </div>

      </div>

    </div>
  );
}

export default Login;