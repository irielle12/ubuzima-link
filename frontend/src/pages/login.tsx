import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [workerName, setWorkerName] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");
  const [healthPost, setHealthPost] = useState("");
  

  const handleLogin = () => {
   if (
  !workerName ||
  !workerId ||
  !password ||
  !healthPost
)
  
localStorage.setItem(
  "worker",
  JSON.stringify({
    workerName,
    workerId,
    healthPost,
  })
);

    navigate("/dashboard");
  };

  return (
    <div className="login-screen">

      {/* TOP BAR */}
      <div className="top-bar">
        <span className="app-title">
          Ubuzima-Link
        </span>

        <div className="offline-status">
          OFFLINE
        </div>
      </div>

      {/* LOGO SECTION */}
      <div className="logo-section">

        <div className="logo-box">
          ⚡
        </div>

        <h3>
          Health Worker Referral System
        </h3>

      </div>

      {/* LOGIN FORM */}
      <div className="login-form">
<label>Worker Name</label>

<input
  type="text"
  placeholder="Enter your full name"
  value={workerName}
  onChange={(e) =>
    setWorkerName(e.target.value)
  }
/>
        <label>Worker ID</label>

        <input
          type="text"
          placeholder="e.g. HW-12345"
          value={workerId}
          onChange={(e) =>
            setWorkerId(e.target.value)
          }
        />

        <label>Password</label>

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <label>Health Post</label>

        <select
          value={healthPost}
          onChange={(e) =>
            setHealthPost(e.target.value)
          }
        >
          <option value="">
            Select Health Post
          </option>

          <option>
            Kimironko Health Post
          </option>

          <option>
            Gikondo Health Post
          </option>

          <option>
            Kacyiru Health Post
          </option>

          <option>
            Kanombe Health Post
          </option>

          <option>
            Nyamirambo Health Post
          </option>
        </select>

        <button onClick={handleLogin}>
          Login to Portal
        </button>

        <button
          className="switch-role-btn"
          onClick={() =>
            navigate("/hospital-login")
          }
        >
          Login as Hospital Staff
        </button>

      </div>

      {/* FOOTER */}
      <div className="login-footer">

        <div className="security-badge">
          SECURE MEDICAL ENVIRONMENT
        </div>

        <p>
          Need technical assistance? Contact Support
        </p>

      </div>

    </div>
  );
}

export default Login;