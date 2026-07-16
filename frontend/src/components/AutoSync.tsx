import { useEffect, useRef } from "react";
import { isAuthenticated, getUser } from "../services/authApi";
import { db } from "../services/db";
import { runSync } from "../services/syncEngine";
import { useNotification } from "../contexts/NotificationContext";

// Silently syncs pending offline referrals/patients the moment the device
// regains connectivity (or on load, if it's already online) — health
// workers no longer have to remember to visit the Sync page and press
// "Sync Now" themselves. Renders nothing; it's a background effect only.
function AutoSync() {
  const { success, error } = useNotification();
  const syncingRef = useRef(false);

  useEffect(() => {
    const maybeSync = async () => {
      if (syncingRef.current || !navigator.onLine) return;
      if (!isAuthenticated() || getUser()?.role !== "nurse") return;

      const [pendingReferrals, pendingPatients] = await Promise.all([
        db.referrals.toArray().then((all) => all.filter((r) => r.workflowStatus === "Pending Sync")),
        db.patients.toArray().then((all) => all.filter((p) => !p.synced)),
      ]);
      if (pendingReferrals.length === 0 && pendingPatients.length === 0) return;

      syncingRef.current = true;
      try {
        const summary = await runSync();
        if (summary.syncedCount > 0) {
          success(
            `${summary.syncedCount} referral${summary.syncedCount === 1 ? "" : "s"} synced automatically.`
          );
        }
        if (summary.failedCount > 0) {
          error(
            `${summary.failedCount} referral${summary.failedCount === 1 ? "" : "s"} failed to sync — check the Sync page.`
          );
        }
        if (summary.smsFailedCount > 0) {
          error(
            `${summary.smsFailedCount} patient text notification${summary.smsFailedCount === 1 ? "" : "s"} failed to send — the referral${summary.smsFailedCount === 1 ? " itself" : "s themselves"} synced fine, check its details page.`
          );
        }
      } finally {
        syncingRef.current = false;
      }
    };

    // Covers the case where the app is opened already online with items
    // left over from a previous offline session, not just the reconnect edge.
    maybeSync();

    window.addEventListener("online", maybeSync);
    return () => window.removeEventListener("online", maybeSync);
  }, [success, error]);

  return null;
}

export default AutoSync;
