import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReferralByNumber, updateReferralStatus, receiveOfflineReferral } from "../../services/referralApi";
import { getUser } from "../../services/authApi";

type ResultState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "found"; referral: any }
  | { type: "wrong_facility"; intendedHospital: string; referralNumber: string }
  | { type: "unsynced"; payload: any }
  | { type: "error"; message: string };

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* AudioContext unavailable */
  }
}

function ReceiveQR() {
  const navigate = useNavigate();
  const user = getUser();

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ResultState>({ type: "idle" });
  const [cameraError, setCameraError] = useState("");
  const [scanFlash, setScanFlash] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [refInput, setRefInput] = useState("");

  const scannerRef = useRef<any>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scanning) {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      setShowHint(false);
      return;
    }

    setShowHint(false);
    hintTimerRef.current = setTimeout(() => setShowHint(true), 30_000);

    let stopped = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped || !scannerDivRef.current) return;

      const scanner = new Html5Qrcode("hospital-qr-scanner", {
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      } as any);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 25,
            qrbox: (w: number, h: number) => {
              const side = Math.floor(Math.min(w, h) * 0.72);
              return { width: side, height: side };
            },
          },
          (text: string) => handleScan(text),
          () => {}
        )
        .then(() => {
          setTimeout(() => {
            const el = document.getElementById("hospital-qr-scanner");
            if (el) el.style.transform = "scaleX(-1)";
          }, 250);
        })
        .catch((err: any) => {
          console.error(err);
          setCameraError(
            "Camera access denied. Enable camera permissions and try again."
          );
          setScanning(false);
        });
    });

    return () => {
      stopped = true;
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      const el = document.getElementById("hospital-qr-scanner");
      if (el) el.style.transform = "";
    };
  }, [scanning]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    const el = document.getElementById("hospital-qr-scanner");
    if (el) el.style.transform = "";
    setScanning(false);
  };

  const scrollToResult = () => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleScan = async (text: string) => {
    stopScanner();
    playBeep();
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 700);

    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      setResult({
        type: "error",
        message: "Invalid QR code — this does not appear to be a Ubuzima-Link referral.",
      });
      scrollToResult();
      return;
    }

    if (!payload.referralNumber) {
      setResult({
        type: "error",
        message: "Invalid QR code — referral number missing.",
      });
      scrollToResult();
      return;
    }

    await lookup(payload.referralNumber, payload);
  };

  const lookup = async (referralNumber: string, qrPayload?: any) => {
    setResult({ type: "loading" });
    scrollToResult();
    try {
      let referral = await getReferralByNumber(referralNumber);

      /* Check if this referral is intended for a different hospital */
      if (
        referral.destination_facility_id &&
        referral.destination_facility_id !== user?.facilityId
      ) {
        setResult({
          type: "wrong_facility",
          intendedHospital:
            referral.destination_hospital || "another facility",
          referralNumber: referral.referral_number,
        });
        return;
      }

      /* Auto-promote Draft → Pending Hospital Review (also sets destination) */
      if (referral.workflow_status === "Draft") {
        await updateReferralStatus(referral.id, "Pending Hospital Review");
        referral = { ...referral, workflow_status: "Pending Hospital Review" };
      }

      setResult({ type: "found", referral });
    } catch (err: any) {
      if (err.message?.includes("not found") && qrPayload) {
        setResult({ type: "unsynced", payload: qrPayload });
      } else {
        setResult({
          type: "error",
          message: err.message?.includes("not found")
            ? `No referral found with number "${referralNumber}".`
            : err.message || "Lookup failed. Make sure the server is running.",
        });
      }
    }
  };

  const handleRefSearch = () => {
    const referralNumber = refInput.trim();
    if (!referralNumber) return;
    lookup(referralNumber);
  };

  const checkAgain = () => {
    if (result.type === "unsynced") {
      lookup(result.payload.referralNumber, result.payload);
    }
  };

  const handleAcceptFromQR = async () => {
    if (result.type !== "unsynced") return;
    setAccepting(true);
    setAcceptError("");
    try {
      await receiveOfflineReferral({
        referralNumber: result.payload.referralNumber,
        patientName: result.payload.patientName,
        patientPhone: result.payload.patientPhone,
        patientGender: result.payload.patientGender,
        patientAge: result.payload.patientAge,
        chiefComplaint: result.payload.chiefComplaint,
        diagnosis: result.payload.diagnosis,
        urgency: result.payload.urgency,
        referringFacility: result.payload.referringFacility,
        sourceFacilityId: result.payload.sourceFacilityId,
        referralDate: result.payload.referralDate,
      });
      navigate("/hospital/queue");
    } catch (err: any) {
      setAcceptError(err.message || "Failed to register patient.");
    } finally {
      setAccepting(false);
    }
  };

  const reset = () => {
    setResult({ type: "idle" });
    setCameraError("");
    setScanFlash(false);
    setShowHint(false);
    setRefInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* LEFT — SCANNER */}
        <div>
          <div
            className="hospital-scan-card"
            style={{
              border: scanFlash ? "2px solid #16a34a" : "1px solid #e2e8f0",
              padding: 24,
              transition: "border-color 0.15s",
              animation: "none",
            }}
          >
            <h2 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a" }}>
              Scan QR Code
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
              Point the camera at the QR code on the patient's phone.
            </p>

            {scanning ? (
              <div>
                <div
                  id="hospital-qr-scanner"
                  ref={scannerDivRef}
                  style={{
                    width: "100%",
                    minHeight: 260,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#0f172a",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#2563eb",
                      display: "inline-block",
                      animation: "pulse-dot 1.2s ease-in-out infinite",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#475569" }}>Scanning…</span>
                </div>

                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12,
                    color: "#64748b",
                    textAlign: "center",
                    lineHeight: 1.6,
                  }}
                >
                  Keep the QR code inside the scan box and hold steady.
                  <br />
                  If scanning fails, move the phone further away (30–40 cm).
                  <br />
                  Tilt slightly to reduce screen glare.
                </p>

                {showHint && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "#fef9c3",
                      border: "1px solid #fde68a",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#92400e",
                      lineHeight: 1.5,
                    }}
                  >
                    Having trouble? Try dimming the patient's screen brightness.
                  </div>
                )}

                <button
                  className="hospital-action-btn secondary"
                  onClick={stopScanner}
                  style={{ marginTop: 12, width: "100%" }}
                >
                  Stop Camera
                </button>
              </div>
            ) : (
              <button
                className="hospital-action-btn primary"
                onClick={() => {
                  setCameraError("");
                  setScanning(true);
                }}
                style={{ width: "100%", padding: "12px" }}
              >
                Start Camera Scan
              </button>
            )}

            {cameraError && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#fef3c7",
                  border: "1px solid #f59e0b",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                {cameraError}
              </div>
            )}
          </div>

          {/* SEARCH BY REFERENCE NUMBER */}
          <div
            className="hospital-scan-card"
            style={{ padding: 24, marginTop: 20, animation: "none" }}
          >
            <h2 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a" }}>
              Search by Reference Number
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
              If the QR code can't be scanned, look up the referral by its reference number instead.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="hospital-filter-input"
                placeholder="e.g. REF-1234567890"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRefSearch();
                }}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button
                className="hospital-action-btn primary"
                onClick={handleRefSearch}
                disabled={!refInput.trim() || result.type === "loading"}
                style={{ width: "auto", flexShrink: 0 }}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — RESULT */}
        <div ref={resultRef}>
          {result.type === "idle" && (
            <div
              className="hospital-scan-card"
              style={{ padding: 40, textAlign: "center", color: "#94a3b8", animation: "none" }}
            >
              <p style={{ fontSize: 14 }}>
                Scan a patient's QR code or search by reference number to see the referral here.
              </p>
            </div>
          )}

          {result.type === "loading" && (
            <div
              className="hospital-scan-card"
              style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 14 }}
            >
              Looking up referral…
            </div>
          )}

          {result.type === "wrong_facility" && (
            <div className="hospital-scan-card" style={{ border: "1px solid #fbbf24" }}>
              <div
                style={{
                  padding: "12px 20px",
                  background: "#fffbeb",
                  borderBottom: "1px solid #fbbf24",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  ⚠ Wrong facility
                </p>
              </div>
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Referral <strong>{result.referralNumber}</strong> is intended for{" "}
                  <strong>{result.intendedHospital}</strong>, not your facility.
                  <br /><br />
                  Please redirect the patient to the correct hospital or contact the referring health post.
                </p>
                <button className="hospital-action-btn secondary" onClick={reset}>
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {result.type === "error" && (
            <div className="hospital-scan-card" style={{ border: "1px solid #fecaca", padding: 24 }}>
              <p style={{ color: "#dc2626", fontSize: 14, margin: "0 0 12px", lineHeight: 1.5 }}>
                {result.message}
              </p>
              <button className="hospital-action-btn secondary" onClick={reset}>
                Try Again
              </button>
            </div>
          )}

          {result.type === "found" && (
            <div className="hospital-scan-card" style={{ border: "1px solid #bbf7d0" }}>
              <div
                style={{
                  padding: "12px 20px",
                  background: "#f0fdf4",
                  borderBottom: "1px solid #bbf7d0",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>
                  ✓ Referral found — added to your queue
                </span>
              </div>
              <div style={{ padding: 20 }}>
                {[
                  ["Patient", `${result.referral.first_name} ${result.referral.last_name}`],
                  ["Ref #", result.referral.referral_number],
                  ["Diagnosis", result.referral.diagnosis],
                  ["Urgency", result.referral.urgency],
                  ["From", result.referral.source_facility_name || "—"],
                  ["Status", result.referral.workflow_status],
                ].map(([label, value]) => (
                  <div key={label} className="hospital-panel-row">
                    <strong>{label}</strong>
                    <span>{value}</span>
                  </div>
                ))}

                <button
                  className="hospital-action-btn primary"
                  style={{ marginTop: 16, width: "100%" }}
                  onClick={() => navigate("/hospital/queue")}
                >
                  Go to Referral Queue →
                </button>

                <button
                  className="hospital-action-btn secondary"
                  style={{ marginTop: 8, width: "100%" }}
                  onClick={reset}
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {result.type === "unsynced" && (
            <div className="hospital-scan-card" style={{ border: "1px solid #fed7aa" }}>
              <div
                style={{
                  padding: "12px 20px",
                  background: "#fff7ed",
                  borderBottom: "1px solid #fed7aa",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#c2410c" }}>
                  Referral not yet synced — patient present
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9a3412" }}>
                  Accept the patient now to add them to your queue. The full record will merge once the health post syncs.
                </p>
              </div>
              <div style={{ padding: 20 }}>
                {[
                  ["Patient", result.payload.patientName],
                  ["Age / Gender", [result.payload.patientAge, result.payload.patientGender].filter(Boolean).join(" · ")],
                  ["Phone", result.payload.patientPhone],
                  ["Chief Complaint", result.payload.chiefComplaint],
                  ["Provisional Diagnosis", result.payload.diagnosis],
                  ["Priority", result.payload.urgency],
                  ["From", result.payload.referringFacility],
                  ["Ref #", result.payload.referralNumber],
                  ["Date", result.payload.referralDate],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="hospital-panel-row">
                      <strong>{label}</strong>
                      <span>{value}</span>
                    </div>
                  ))}

                {acceptError && (
                  <p style={{ color: "#dc2626", fontSize: 12, margin: "12px 0 0" }}>{acceptError}</p>
                )}

                <button
                  className="hospital-action-btn primary"
                  style={{ marginTop: 16, width: "100%" }}
                  onClick={handleAcceptFromQR}
                  disabled={accepting}
                >
                  {accepting ? "Registering patient…" : "Accept Patient & Open in Queue →"}
                </button>

                <button
                  className="hospital-action-btn secondary"
                  style={{ marginTop: 8, width: "100%" }}
                  onClick={checkAgain}
                  disabled={accepting}
                >
                  Check Again (if recently synced)
                </button>

                <button
                  className="hospital-action-btn secondary"
                  style={{ marginTop: 8, width: "100%" }}
                  onClick={reset}
                  disabled={accepting}
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.6); }
        }
      `}</style>
    </div>
  );
}

export default ReceiveQR;
