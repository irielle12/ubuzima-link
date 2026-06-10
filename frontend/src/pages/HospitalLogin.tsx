import { useNavigate } from "react-router-dom";
import { useState } from "react";

function HospitalLogin() {
  const navigate = useNavigate();

  const [hospitalId, setHospitalId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    navigate("/dashboard");
  };

  return (
    <div className="login-screen">

      <div className="top-bar">
        <span className="app-title">
          Ubuzima-Link
        </span>

        <div className="offline-status">
          OFFLINE
        </div>
      </div>

      <div className="logo-section">
        <div className="logo-box">🏥</div>
        <h3>Hospital Staff Portal</h3>
      </div>

      <div className="login-form">

        <label>Hospital ID</label>

        <input
          value={hospitalId}
          onChange={(e) =>
            setHospitalId(e.target.value)
          }
          placeholder="HSP-001"
        />

        <label>Password</label>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Enter password"
        />

        <button onClick={handleLogin}>
          Login
        </button>

        <button
          className="switch-role-btn"
          onClick={() => navigate("/worker-login")}
        >
          Login as Health Worker
        </button>

      </div>
    </div>
  );
}

export default HospitalLogin;