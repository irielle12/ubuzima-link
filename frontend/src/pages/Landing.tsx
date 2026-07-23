import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  Building2,
  ShieldCheck,
  ArrowRight,
  WifiOff,
  QrCode,
  Activity,
} from "lucide-react";
import BrandMark from "../components/BrandMark";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-v2">
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <div className="landing-shell">

        <div className="landing-brand">
          <div className="landing-mark">
            <BrandMark size={42} />
          </div>

          <div className="landing-brand-text">
            <h1>Ubuzima-Link</h1>
            <p className="landing-tagline">Healthcare Referral Management System</p>
          </div>
        </div>

        <div className="landing-hero">

          <div className="landing-pitch">
            <span className="landing-eyebrow">Built for Rwanda's health posts</span>

            <h2>Referrals that keep moving, even when the network doesn't.</h2>

            <p>
              Ubuzima-Link connects health posts and district hospitals with
              offline-first referrals, instant QR handoffs, and automatic
              sync the moment connectivity returns. Nurses see hospital
              capacity before they refer, and hospitals send outcomes
              straight back once a case is closed.
            </p>

            <div className="landing-features">
              <div className="landing-feature">
                <WifiOff size={15} />
                <span>Offline First</span>
              </div>
              <div className="landing-feature">
                <QrCode size={15} />
                <span>Secure QR Transfer</span>
              </div>
              <div className="landing-feature">
                <Activity size={15} />
                <span>Healthcare Ready</span>
              </div>
            </div>
          </div>

          <div className="portal-list">

            <button
              className="portal-card portal-card-worker"
              onClick={() => navigate("/login")}
            >
              <div className="portal-icon">
                <Stethoscope size={22} />
              </div>

              <div className="portal-content">
                <h3>Health Worker Portal</h3>
                <p>Create and manage patient referrals</p>
              </div>

              <ArrowRight size={18} className="portal-arrow" />
            </button>

            <button
              className="portal-card portal-card-hospital"
              onClick={() => navigate("/hospital-login")}
            >
              <div className="portal-icon">
                <Building2 size={22} />
              </div>

              <div className="portal-content">
                <h3>Hospital Staff Portal</h3>
                <p>Receive and process referrals</p>
              </div>

              <ArrowRight size={18} className="portal-arrow" />
            </button>

            <button
              className="portal-card portal-card-admin"
              onClick={() => navigate("/login?role=admin")}
            >
              <div className="portal-icon">
                <ShieldCheck size={22} />
              </div>

              <div className="portal-content">
                <h3>Administrator Portal</h3>
                <p>Manage users, facilities and reports</p>
              </div>

              <ArrowRight size={18} className="portal-arrow" />
            </button>

          </div>

        </div>

        <footer style={{ textAlign: "center", marginTop: 40 }}>
          <button
            onClick={() => navigate("/privacy")}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Privacy Policy
          </button>
        </footer>

      </div>
    </div>
  );
}

export default Landing;
