import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  QrCode,
  Bell,
  User,
  Building2,
} from "lucide-react";

import ConnectionStatus from "../components/ConnectionStatus";

function HospitalDashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-v2">

      {/* HEADER */}

      <header className="dashboard-header-v2">

        <div className="dashboard-header-content">

          <div>

            <p className="facility-label">
              UBUZIMA-LINK
            </p>

            <h1>
              Kibagabaga Hospital
            </h1>

            <ConnectionStatus />

          </div>

          <div className="notification-bell">

            <Bell size={22} />

          </div>

        </div>

      </header>

      {/* OVERVIEW */}

      <section className="dashboard-section">

        <h2>
          Today's Overview
        </h2>

        <div className="queue-grid">

          <div className="queue-card">

            <h3>12</h3>

            <p>
              Incoming Referrals
            </p>

          </div>

          <div className="queue-card">

            <h3>5</h3>

            <p>
              Awaiting Review
            </p>

          </div>

          <div className="queue-card">

            <h3>3</h3>

            <p>
              Feedback Sent
            </p>

          </div>

          <div className="queue-card">

            <h3>24</h3>

            <p>
              Closed Cases
            </p>

          </div>

        </div>

      </section>

      {/* QUICK ACTIONS */}

      <section className="dashboard-section">

        <h2>
          Quick Actions
        </h2>

        <div className="actions-grid">

          <button
            className="action-card"
            onClick={() =>
              navigate("/receive-referral")
            }
          >

            <QrCode size={28} />

            <span>
              Receive Referral
            </span>

          </button>

          <button
            className="action-card"
            onClick={() =>
              navigate("/hospital-queue")
            }
          >

            <ClipboardList size={28} />

            <span>
              Review Queue
            </span>

          </button>

        </div>

      </section>

      {/* ALERTS */}

      <section className="dashboard-section">

        <h2>
          Hospital Alerts
        </h2>

        <div className="details-card">

          <p>
            • Emergency Department Busy
          </p>

          <p>
            • CT Scanner Unavailable
          </p>

          <p>
            • Cardiology Available
          </p>

        </div>

      </section>

      {/* BOTTOM NAV */}

      <nav className="bottom-nav-v2">

        <button className="nav-button active">

          <Building2 size={20} />

          <span>
            Dashboard
          </span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/receive-referral")
          }
        >

          <QrCode size={20} />

          <span>
            Receive
          </span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/hospital-queue")
          }
        >

          <ClipboardList size={20} />

          <span>
            Queue
          </span>

        </button>

        <button className="nav-button">

          <User size={20} />

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
}

export default HospitalDashboard;