import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConnectionStatus from "../components/ConnectionStatus";
import { getReferralByNumber } from "../services/referralApi";

import {
  Building2,
  QrCode,
  ClipboardList,
  User,
  Search,
  Info,
  X,
} from "lucide-react";

function ReceiveReferral() {
  const navigate = useNavigate();

  const [showScanner, setShowScanner] = useState(false);
  const [showIdInput, setShowIdInput] = useState(false);
  const [manualId, setManualId] = useState("");
  const [scannedData, setScannedData] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  const scannerRef = useRef<any>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showScanner) return;

    let stopped = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped || !scannerDivRef.current) return;

      const scanner = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {}
        )
        .catch((err: any) => {
          console.error("Scanner start error:", err);
          setLookupError(
            "Camera access denied or unavailable. Use the manual ID entry below."
          );
          setShowScanner(false);
        });
    });

    return () => {
      stopped = true;

      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [showScanner]);

  const handleScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }

    setShowScanner(false);

    let payload: any = {};

    try {
      payload = JSON.parse(decodedText);
    } catch {
      setLookupError("Invalid QR code — could not parse referral data.");
      return;
    }

    if (payload.synced === false) {
      setScannedData(payload);
      return;
    }

    const lookupKey = payload.referralNumber || payload.referralId;

    if (lookupKey) {
      await lookupReferral(String(lookupKey), payload);
    } else {
      setScannedData(payload);
    }
  };

  const lookupReferral = async (
    referralNumber: string,
    fallbackPayload?: any
  ) => {
    try {
      setLooking(true);
      setLookupError("");

      const referral = await getReferralByNumber(referralNumber);

      navigate(`/hospital-referral/${referral.id}`);
    } catch (err: any) {
      if (fallbackPayload) {
        setScannedData(fallbackPayload);
      } else {
        setLookupError(
          err.name === "TypeError" || err.message === "Failed to fetch"
            ? "You are offline. Cannot look up referral."
            : err.message || "Referral not found."
        );
      }
    } finally {
      setLooking(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualId.trim()) return;

    await lookupReferral(manualId.trim());
  };

  const closeScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }

    setShowScanner(false);
  };

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">

        <button
          className="back-btn-v2"
          onClick={() => navigate("/hospital-dashboard")}
        >
          ←
        </button>

        <div>
          <h1>Receive Referral</h1>
          <p>Scan or enter a referral ID</p>
          <ConnectionStatus />
        </div>

      </div>

      {/* SCAN RESULT — offline/unsynced data */}
      {scannedData && (
        <div className="details-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>QR Data Read</h3>

            <button
              className="back-btn-v2"
              onClick={() => setScannedData(null)}
              style={{ width: 32, height: 32 }}
            >
              <X size={16} />
            </button>
          </div>

          {scannedData.synced === false && (
            <div
              className="workflow-message"
              style={{ background: "#fef3c7", marginBottom: 16 }}
            >
              <p>
                Referral not yet synced — showing QR data only.
                The system record will be available once the
                health worker is back online.
              </p>
            </div>
          )}

          <div className="detail-row">
            <strong>Patient:</strong>
            <span>{scannedData.patientName}</span>
          </div>

          <div className="detail-row">
            <strong>Gender:</strong>
            <span>{scannedData.patientGender}</span>
          </div>

          <div className="detail-row">
            <strong>Phone:</strong>
            <span>{scannedData.patientPhone}</span>
          </div>

          <div className="detail-row">
            <strong>Diagnosis:</strong>
            <span>{scannedData.diagnosis}</span>
          </div>

          <div className="detail-row">
            <strong>Urgency:</strong>
            <span>{scannedData.urgency}</span>
          </div>

          <div className="detail-row">
            <strong>From:</strong>
            <span>{scannedData.destinationHospital}</span>
          </div>

          <div className="detail-row">
            <strong>Created:</strong>
            <span>{scannedData.createdAt}</span>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER */}
      {showScanner && (
        <div className="details-card">

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              Align QR code in the frame
            </p>

            <button
              className="back-btn-v2"
              onClick={closeScanner}
              style={{ width: 32, height: 32 }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            id="qr-scanner-container"
            ref={scannerDivRef}
            style={{
              width: "100%",
              minHeight: 280,
              borderRadius: 8,
              overflow: "hidden",
            }}
          />

        </div>
      )}

      {/* ERROR */}
      {lookupError && (
        <div className="details-card" style={{ color: "#dc2626" }}>
          {lookupError}
        </div>
      )}

      {/* RECEIVE OPTIONS */}
      {!showScanner && !scannedData && (
        <section className="dashboard-section">

          <h2>Receive Referral</h2>

          <div className="actions-grid">

            <button
              className="action-card"
              onClick={() => {
                setLookupError("");
                setShowScanner(true);
              }}
            >
              <QrCode size={32} />
              <span>Scan QR Code</span>
              <small>Receive offline referrals</small>
            </button>

            <button
              className="action-card"
              onClick={() => {
                setLookupError("");
                setShowIdInput(true);
              }}
            >
              <Search size={32} />
              <span>Enter Referral ID</span>
              <small>Look up by ID</small>
            </button>

          </div>

          {showIdInput && (
            <div className="details-card" style={{ marginTop: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Referral ID
              </label>

              <input
                type="text"
                placeholder="e.g. 17 or REF-1782862414892"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
              />

              <button
                className="primary-action-btn"
                onClick={handleManualLookup}
                disabled={looking || !manualId.trim()}
                style={{ marginTop: 10 }}
              >
                {looking ? "Looking up..." : "Find Referral"}
              </button>
            </div>
          )}

        </section>
      )}

      {/* INFO CARD */}
      {!showScanner && !scannedData && (
        <div className="hospital-alert-card info">
          <Info size={22} />
          <div>
            <h3>Referral Intake</h3>
            <p>
              Online referrals arrive in the Review Queue automatically.
              Offline referrals must be scanned using the QR code
              the health worker printed before review.
            </p>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav-v2">

        <button
          className="nav-button"
          onClick={() => navigate("/hospital-dashboard")}
        >
          <Building2 size={20} />
          <span>Dashboard</span>
        </button>

        <button className="nav-button active">
          <QrCode size={20} />
          <span>Receive</span>
        </button>

        <button
          className="nav-button"
          onClick={() => navigate("/queue-review")}
        >
          <ClipboardList size={20} />
          <span>Queue</span>
        </button>

        <button className="nav-button">
          <User size={20} />
          <span>Profile</span>
        </button>

      </nav>

    </div>
  );
}

export default ReceiveReferral;
