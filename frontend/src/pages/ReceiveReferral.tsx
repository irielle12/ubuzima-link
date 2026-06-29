import { useNavigate } from "react-router-dom";
import ConnectionStatus from "../components/ConnectionStatus";

import {
  Building2,
  QrCode,
  ClipboardList,
  User,
  Search,
  Info,
} from "lucide-react";

function ReceiveReferral() {
  const navigate = useNavigate();

  return (
    <div className="patient-search-page">

      {/* HEADER */}

      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() =>
            navigate("/hospital-dashboard")
          }
        >
          ←
        </button>

        <div>

          <h1>
            Receive Referral
          </h1>

          <p>
            Receive referrals from health workers
          </p>

          <ConnectionStatus />

        </div>

      </div>

      {/* RECEIVE OPTIONS */}

<section className="dashboard-section">

  <h2>
    Receive Referral
  </h2>

  <div className="actions-grid">

    <button
      className="action-card"
      onClick={() =>
        navigate("/referral-preview")
      }
    >

      <QrCode size={32} />

      <span>
        Scan QR Code
      </span>

      <small>
        Receive offline referrals
      </small>

    </button>

    <button
      className="action-card"
    >

      <Search size={32} />

      <span>
        Enter Referral ID
      </span>

      <small>
        Find online referrals
      </small>

    </button>

  </div>

</section>

      {/* INFO CARD / ALERT BANNER */}
     <div className="hospital-alert-card info">

  <Info size={22} />

  <div>

    <h3>
      Referral Intake Information
    </h3>

    <p>

      Online referrals arrive automatically.

      Offline referrals must be scanned
      using a QR code before review.

    </p>

  </div>

</div>

      {/* BOTTOM NAV */}

      <nav className="bottom-nav-v2">

  <button
    className="nav-button"
    onClick={() =>
      navigate("/hospital-dashboard")
    }
  >

    <Building2 size={20} />

    <span>
      Dashboard
    </span>

  </button>

  <button
    className="nav-button active"
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

export default ReceiveReferral;