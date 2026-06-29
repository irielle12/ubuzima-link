import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../services/db";

import {
  Plus,
  Wifi,
  House,
  FileText,
  User,
  Bell,
} from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();

  const [pendingSync, setPendingSync] =
    useState(0);

  const [pendingReview, setPendingReview] =
    useState(0);

  const [recentReferrals, setRecentReferrals] =
    useState<any[]>([]);

  const [notifications, setNotifications] =
    useState(0);

  const [isOnline, setIsOnline] =
    useState(navigator.onLine);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {

    const handleOnline = () =>
      setIsOnline(true);

    const handleOffline = () =>
      setIsOnline(false);

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

    };

  }, []);

  const loadDashboardData = async () => {

    const referrals =
      await db.referrals.toArray();

    setPendingSync(

      referrals.filter(
        (r) =>
          r.workflowStatus ===
          "Pending Sync"
      ).length

    );

    setPendingReview(

      referrals.filter(
        (r) =>
          r.workflowStatus ===
          "Pending Hospital Review"
      ).length

    );

    setRecentReferrals(
      referrals.slice(-5).reverse()
    );

    setNotifications(

      referrals.filter(
        (r) =>
          r.workflowStatus ===
            "Outcome Recorded" &&
          !r.feedbackViewed
      ).length

    );

  };

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
              Kimironko Health Post
            </h1>

            <div className="connection-status">

              <Wifi size={16} />

              <span>
                {isOnline
                  ? "Online"
                  : "Offline"}
              </span>

            </div>

          </div>

          <div className="notification-bell">

            <Bell size={22} />

            {notifications > 0 && (

              <span className="notification-count">

                {notifications}

              </span>

            )}

          </div>

        </div>

      </header>

      {/* QUICK ACTIONS */}

      <section className="dashboard-section">

        <h2>
          Quick Actions
        </h2>

        <div className="actions-grid">

          <button
            className="action-card"
            onClick={() =>
              navigate("/patient-search")
            }
          >

            <Plus size={28} />

            <span>
              Find Patient
            </span>

          </button>

          <button
            className="action-card"
            onClick={() =>
              navigate(
                "/register-patient"
              )
            }
          >

            <User size={28} />

            <span>
              Register Patient
            </span>

          </button>

        </div>

      </section>

      {/* OVERVIEW */}
{/* OVERVIEW */}

<section className="dashboard-section">

  <h2>
    Today's Overview
  </h2>

  <div className="overview-card">

    <div className="overview-item">

      <h3>
        {pendingSync}
      </h3>

      <p>
        Pending Sync
      </p>

    </div>

    <div className="overview-item">

      <h3>
        {pendingReview}
      </h3>

      <p>
        Pending Review
      </p>

    </div>

  </div>

</section>

{/* ALERTS */}
     
<section className="dashboard-section">

  <h2>
    Alerts
  </h2>

  <div className="details-card">

    <p>
      No active network alerts.
    </p>

  </div>

</section>
      {/* NAVIGATION */}

      <nav className="bottom-nav-v2">

        <button className="nav-button active">

          <House size={20} />

          <span>
            Home
          </span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/referrals")
          }
        >

          <FileText size={20} />

          <span>
            Work Queue
          </span>

        </button>

        <button
          className="nav-button"
          onClick={() =>
            navigate("/sync")
          }
        >

          <Wifi size={20} />

          <span>
            Sync
          </span>

        </button>

        <button
          className="nav-button"
        >

          <User size={20} />

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
}

export default Dashboard;