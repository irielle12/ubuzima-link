import { useState } from "react";
import { useNavigate } from "react-router-dom";

function HospitalLogin() {
  const navigate = useNavigate();

  const [hospitalId, setHospitalId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleLogin = () => {

    if (
      !hospitalId ||
      !password
    )
      return;

    localStorage.setItem(
      "hospitalUser",
      JSON.stringify({
        hospitalId,
      })
    );

    navigate(
      "/hospital-dashboard"
    );
  };

  return (
    <div className="login-v2">

      <div className="login-container-v2">

        <div className="login-header-v2">

          <h1>
            Ubuzima-Link
          </h1>

          <p>
            Healthcare Referral
            Management System
          </p>

        </div>

        <div className="login-card-v2">

          <h2>
            Hospital Staff Login
          </h2>

          <p className="login-subtitle">

            Sign in to continue

          </p>

          <label>
            HOSPITAL ID
          </label>

          <input
            type="text"
            placeholder="Enter Hospital ID"
            value={hospitalId}
            onChange={(e) =>
              setHospitalId(
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
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            className="login-btn-v2"
            onClick={
              handleLogin
            }
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

export default HospitalLogin;