import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  Building2,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-v2">

      <div className="landing-container">

        <div className="landing-header">

          <h1>Ubuzima-Link</h1>

          <p>
            Healthcare Referral Management System
          </p>

        </div>

        <div className="portal-list">

          <button
            className="portal-card"
            onClick={() => navigate("/login")}
          >
            <div className="portal-icon">
              <Stethoscope size={24} />
            </div>

            <div className="portal-content">
              <h3>Health Worker Portal</h3>

              <p>
                Create and manage patient referrals
              </p>
            </div>

            <ChevronRight size={20} />
          </button>

          <button
            className="portal-card"
            onClick={() => navigate("/hospital-login")}
          >
            <div className="portal-icon">
              <Building2 size={24} />
            </div>

            <div className="portal-content">
              <h3>Hospital Staff Portal</h3>

              <p>
                Receive and process referrals
              </p>
            </div>

            <ChevronRight size={20} />
          </button>

          <button
            className="portal-card"
            onClick={() => navigate("/login?role=admin")}
          >
            <div className="portal-icon">
              <ShieldCheck size={24} />
            </div>

            <div className="portal-content">
              <h3>Administrator Portal</h3>

              <p>
                Manage users, facilities and reports
              </p>
            </div>

            <ChevronRight size={20} />
          </button>

        </div>

        <div className="landing-footer">

          <span>Offline First</span>

          <span>Secure QR Transfer</span>

          <span>Healthcare Ready</span>

        </div>

      </div>

    </div>
  );
}

export default Landing;