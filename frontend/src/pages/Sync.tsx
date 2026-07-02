import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wifi,
  RefreshCw,
  ArrowLeft,
  QrCode,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader,
} from "lucide-react";
import { db } from "../services/db";
import { createReferral, updateReferralStatus } from "../services/referralApi";
import { getUser } from "../services/authApi";
import { recordSyncAttempt } from "../services/syncStatus";
import { useLanguage } from "../contexts/LanguageContext";

type CardState = "pending" | "syncing" | "synced" | "error";

function Sync() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [globalSyncing, setGlobalSyncing] = useState(false);

  const syncingRef = useRef(false);

  useEffect(() => {
    loadPending();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadPending = async () => {
    const all = await db.referrals.toArray();
    const pending = all.filter((r) => r.workflowStatus === "Pending Sync");

    setAllReferrals(pending);
    setCardStates(
      Object.fromEntries(pending.map((r) => [r.id, "pending" as CardState]))
    );
    setCardErrors({});

    return pending;
  };

  const triggerSync = async () => {
    if (syncingRef.current || !navigator.onLine) return;

    syncingRef.current = true;
    setGlobalSyncing(true);

    const pending = await db.referrals.toArray().then((all) =>
      all.filter((r) => r.workflowStatus === "Pending Sync")
    );

    if (pending.length === 0) {
      syncingRef.current = false;
      setGlobalSyncing(false);
      return;
    }

    const user = getUser();
    let anyFailed = false;

    for (const r of pending) {
      setCardStates((prev) => ({ ...prev, [r.id]: "syncing" }));

      try {
        const serverReferral = await createReferral({
          patientId: parseInt(r.patientId, 10),
          referralNumber: r.referralNumber,
          sourceFacilityId: user?.facilityId,
          destinationFacilityId: parseInt(r.destinationFacilityId || "0", 10),
          chiefComplaint: r.chiefComplaint,
          medicalHistory: r.medicalHistory,
          vitalBp: r.vitalBp,
          vitalHeartRate: r.vitalHeartRate,
          vitalTemperature: r.vitalTemperature,
          vitalRespiratoryRate: r.vitalRespiratoryRate,
          diagnosis: r.diagnosis,
          actionTaken: r.actionTaken,
          urgency: r.urgency,
        });

        await updateReferralStatus(serverReferral.id, "Pending Hospital Review");

        await db.referrals.update(r.id, {
          syncStatus: "Synced",
          workflowStatus: "Pending Hospital Review",
          synced: true,
        });

        setCardStates((prev) => ({ ...prev, [r.id]: "synced" }));
      } catch (err: any) {
        anyFailed = true;
        const msg = err.message || "Unknown error";
        setCardStates((prev) => ({ ...prev, [r.id]: "error" }));
        setCardErrors((prev) => ({ ...prev, [r.id]: msg }));
      }
    }

    recordSyncAttempt(!anyFailed);
    syncingRef.current = false;
    setGlobalSyncing(false);
  };

  const viewQr = (r: any) => {
    const qrPayload = {
      referralNumber: r.referralNumber || r.id,
      synced: r.synced === true,
      patientName: r.patientName || "",
      patientAge: r.patientAge || "",
      patientGender: r.patientGender || "",
      patientPhone: r.patientPhone || "",
      chiefComplaint: r.chiefComplaint || "",
      diagnosis: r.diagnosis,
      urgency: r.urgency,
      referringFacility: r.referringFacility || "",
      destinationHospital: r.hospital,
      referralDate: r.time,
    };

    navigate("/qr-view", {
      state: {
        qrPayload,
        displayData: {
          referral: r,
          patient: { phone: r.patientPhone },
          hospitalName: r.hospital,
        },
        offline: !r.synced,
      },
    });
  };

  const allSynced =
    allReferrals.length > 0 &&
    allReferrals.every((r) => cardStates[r.id] === "synced");

  const syncedCount = Object.values(cardStates).filter((s) => s === "synced").length;
  const errorCount = Object.values(cardStates).filter((s) => s === "error").length;

  return (
    <div className="patient-search-page">

      {/* HEADER */}
      <div className="patient-header">
        <button className="back-btn-v2" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>{t("Sync Center")}</h1>

            <div className={isOnline ? "connection-badge online" : "connection-badge offline"}>
              <Wifi size={14} />
              {isOnline ? t("Online") : t("Offline")}
            </div>
          </div>

          <p>
            {allReferrals.length === 0
              ? t("No referrals waiting")
              : `${allReferrals.length} referral${allReferrals.length === 1 ? "" : "s"} to upload`}
          </p>
        </div>
      </div>

      {/* ALL SYNCED BANNER */}
      {allSynced && (
        <div
          className="details-card"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 10 }}
        >
          <CheckCircle size={20} color="#16a34a" />
          <div>
            <strong style={{ color: "#15803d" }}>{t("All referrals uploaded")}</strong>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>
              {syncedCount} referral{syncedCount === 1 ? "" : "s"} sent to the server. QR codes remain valid.
            </p>
          </div>
        </div>
      )}

      {/* PARTIAL ERROR BANNER */}
      {!allSynced && !globalSyncing && errorCount > 0 && syncedCount > 0 && (
        <div
          className="details-card"
          style={{ background: "#fef9c3", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 10 }}
        >
          <AlertCircle size={18} color="#d97706" />
          <span style={{ fontSize: 14, color: "#92400e" }}>
            {syncedCount} synced, {errorCount} failed — see cards below.
          </span>
        </div>
      )}

      {/* EMPTY STATE */}
      {allReferrals.length === 0 && (
        <div className="details-card">
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle size={36} color="#16a34a" />
            <p style={{ marginTop: 12, fontWeight: 600, color: "#0f172a" }}>
              {t("Nothing waiting to sync")}
            </p>
            <p style={{ color: "#64748b", fontSize: 13 }}>
              {t("Offline referrals will appear here automatically.")}
            </p>
          </div>
        </div>
      )}

      {/* SYNC NOW BUTTON */}
      {allReferrals.length > 0 && !allSynced && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={triggerSync}
            disabled={!isOnline || globalSyncing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: !isOnline || globalSyncing ? "#94a3b8" : "#2563eb",
              color: "white",
              cursor: !isOnline || globalSyncing ? "not-allowed" : "pointer",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <RefreshCw
              size={16}
              style={globalSyncing ? { animation: "spin 1s linear infinite" } : undefined}
            />
            {globalSyncing
              ? `${t("Syncing...")} (${syncedCount + errorCount} of ${allReferrals.length} done)`
              : isOnline
              ? t("Sync Now")
              : t("Connect to sync")}
          </button>
        </div>
      )}

      {/* REFERRAL CARDS */}
      <div className="queue-list">
        {allReferrals.map((r) => {
          const state = cardStates[r.id] || "pending";
          const err = cardErrors[r.id];

          return (
            <div key={r.id} className="queue-card">

              <div className="queue-top">
                <div>
                  <h3>{r.patientName || "Unknown patient"}</h3>
                  <p className="muted">{r.referralNumber || r.id}</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {state === "pending" && (
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                      <Clock size={13} style={{ verticalAlign: "middle" }} />{" "}
                      {t("Waiting")}
                    </span>
                  )}
                  {state === "syncing" && (
                    <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                      <Loader size={13} style={{ verticalAlign: "middle", animation: "spin 1s linear infinite" }} />{" "}
                      {t("Syncing...")}
                    </span>
                  )}
                  {state === "synced" && (
                    <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                      <CheckCircle size={13} style={{ verticalAlign: "middle" }} />{" "}
                      {t("Synced")}
                    </span>
                  )}
                  {state === "error" && (
                    <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                      <AlertCircle size={13} style={{ verticalAlign: "middle" }} />{" "}
                      {t("Failed")}
                    </span>
                  )}
                </div>
              </div>

              <div className="queue-details" style={{ marginTop: 8 }}>
                <div className="queue-item">
                  <span
                    className={`status-chip ${
                      r.urgency === "Emergency" ? "emergency" : r.urgency === "Urgent" ? "urgent" : "routine"
                    }`}
                  >
                    {r.urgency}
                  </span>
                </div>
                <div className="queue-item">
                  <span style={{ color: "#64748b" }}>→ {r.hospital}</span>
                </div>
              </div>

              {r.diagnosis && (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#475569" }}>{r.diagnosis}</p>
              )}

              {err && (
                <p style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>{err}</p>
              )}

              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  onClick={() => viewQr(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "white",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <QrCode size={13} />
                  {t("View QR")}
                </button>

                {state === "error" && (
                  <button
                    onClick={triggerSync}
                    disabled={!isOnline || globalSyncing}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      fontSize: 13,
                      borderRadius: 8,
                      border: "none",
                      background: isOnline ? "#2563eb" : "#94a3b8",
                      color: "white",
                      cursor: !isOnline || globalSyncing ? "not-allowed" : "pointer",
                    }}
                  >
                    <RefreshCw size={13} />
                    {t("Retry")}
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

export default Sync;
