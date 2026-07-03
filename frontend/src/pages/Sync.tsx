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
  House,
  FileText,
  User,
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allReferrals.map((r) => {
          const state = cardStates[r.id] || "pending";
          const err = cardErrors[r.id];

          const stateColors: Record<string, { color: string; bg: string }> = {
            pending:  { color: "#64748b", bg: "#f8fafc" },
            syncing:  { color: "#2563eb", bg: "#eff6ff" },
            synced:   { color: "#16a34a", bg: "#f0fdf4" },
            error:    { color: "#dc2626", bg: "#fef2f2" },
          };
          const sc = stateColors[state] || stateColors.pending;

          return (
            <div key={r.id} style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>

              {/* top row: name + state badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{r.patientName || "Unknown patient"}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>{r.referralNumber || r.id}</p>
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg, padding: "4px 10px", borderRadius: 20 }}>
                  {state === "pending"  && <Clock size={11} />}
                  {state === "syncing"  && <Loader size={11} style={{ animation: "spin 1s linear infinite" }} />}
                  {state === "synced"   && <CheckCircle size={11} />}
                  {state === "error"    && <AlertCircle size={11} />}
                  {t(state === "pending" ? "Waiting" : state === "syncing" ? "Syncing..." : state === "synced" ? "Synced" : "Failed")}
                </span>
              </div>

              {/* urgency + destination */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <span className={`status-chip ${r.urgency === "Emergency" ? "emergency" : r.urgency === "Urgent" ? "urgent" : "routine"}`}>
                  {r.urgency}
                </span>
                <span style={{ fontSize: 13, color: "#64748b" }}>→ {r.hospital}</span>
              </div>

              {/* diagnosis */}
              {r.diagnosis && (
                <p style={{ margin: 0, padding: "10px 16px", fontSize: 13, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>{r.diagnosis}</p>
              )}

              {/* error message */}
              {err && (
                <p style={{ margin: 0, padding: "8px 16px", fontSize: 12, color: "#dc2626", background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>{err}</p>
              )}

              {/* action buttons */}
              <div style={{ display: "flex", gap: 8, padding: "10px 16px" }}>
                <button
                  onClick={() => viewQr(r)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#334155", cursor: "pointer" }}
                >
                  <QrCode size={13} />
                  {t("View QR")}
                </button>

                {state === "error" && (
                  <button
                    onClick={triggerSync}
                    disabled={!isOnline || globalSyncing}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: isOnline ? "#2563eb" : "#94a3b8", color: "white", cursor: !isOnline || globalSyncing ? "not-allowed" : "pointer" }}
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

      {/* BOTTOM NAV */}
      <nav className="bottom-nav-v2">
        <button className="nav-button" onClick={() => navigate("/dashboard")}>
          <House size={20} /><span>{t("Home")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/referrals")}>
          <FileText size={20} /><span>{t("Work Queue")}</span>
        </button>
        <button className="nav-button active">
          <Wifi size={20} /><span>{t("Sync")}</span>
        </button>
        <button className="nav-button" onClick={() => navigate("/profile")}>
          <User size={20} /><span>{t("Profile")}</span>
        </button>
      </nav>

    </div>
  );
}

export default Sync;
