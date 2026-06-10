import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-screen">

      <div
        className="landing-card worker"
        onClick={() => navigate("/worker-login")}
      >
        <div className="landing-icon">🏥</div>

        <h2>Health Worker</h2>

        <p>
          Mobile app for creating and tracking
          patient referrals from health posts
        </p>

        <div className="landing-tags">
          <span>Offline-First</span>
          <span>QR Tokens</span>
          <span>Auto-Sync</span>
        </div>
      </div>

      <div
        className="landing-card hospital"
        onClick={() => navigate("/hospital-login")}
      >
        <div className="landing-icon">🏥</div>

        <h2>Hospital Staff</h2>

        <p>
          Dashboard for receiving, managing,
          and responding to incoming referrals
        </p>

        <div className="landing-tags">
          <span>Live Dashboard</span>
          <span>Status Updates</span>
          <span>Feedback</span>
        </div>
      </div>

      <div className="security-row">
        <span>AES-256 Encrypted</span>
        <span>Offline Capable</span>
        <span>47 Hospitals</span>
        <span>1200+ Workers</span>
        <span>MOH Certified</span>
      </div>

    </div>
  );
}

export default Landing;