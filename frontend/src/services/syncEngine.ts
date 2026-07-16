import { db } from "./db";
import { createReferral, updateReferralStatus, sendSmsNotify } from "./referralApi";
import { createPatient } from "./patientApi";
import { getUser } from "./authApi";
import { recordSyncAttempt } from "./syncStatus";
import { setSyncInProgress } from "./syncState";

export type CardState = "pending" | "syncing" | "synced" | "error";

export interface SyncCallbacks {
  onCardState?: (id: string, state: CardState) => void;
  onCardError?: (id: string, message: string) => void;
  onPendingPatientCount?: (count: number) => void;
}

export interface SyncSummary {
  syncedCount: number;
  failedCount: number;
  /* Referrals that synced fine but whose patient-notification SMS failed —
     tracked separately from failedCount since the referral itself is not
     in an error state and doesn't need re-syncing, only the text failed. */
  smsFailedCount: number;
}

// Registers any offline-created patients first, so referrals that reference
// them can be resolved to a real server-side patient ID. Returns a map from
// temporary local patient ID -> real server ID, plus any per-patient errors
// so the referral loop can report them clearly.
async function syncPatients() {
  const idMap: Record<string, string> = {};
  const errors: Record<string, string> = {};
  const localPatients = (await db.patients.toArray()).filter((p) => !p.synced);

  for (const p of localPatients) {
    try {
      let serverPatient: any;
      try {
        serverPatient = await createPatient({
          fullName: `${p.first_name} ${p.last_name}`.trim(),
          gender: p.gender,
          dateOfBirth: p.date_of_birth,
          phoneNumber: p.phone,
          nationalId: p.national_id,
          guardianNationalId: p.guardian_national_id,
        });
      } catch (err: any) {
        if (err.existingPatient) {
          // Already registered server-side (e.g. an earlier sync attempt
          // created it but was interrupted before we marked it synced
          // locally) — reuse that record instead of failing.
          serverPatient = err.existingPatient;
        } else {
          throw err;
        }
      }

      idMap[String(p.id)] = String(serverPatient.id);
      await db.patients.delete(p.id);
      await db.patients.put({ ...serverPatient, synced: true });
    } catch (err: any) {
      errors[String(p.id)] = err.message || "Failed to sync patient";
    }
  }

  return { idMap, errors };
}

// Module-level (not per-component) guard: the manual "Sync Now" button and
// the automatic on-reconnect trigger are separate call sites that can fire
// at nearly the same moment (e.g. connectivity returns while the Sync page
// happens to be open) — this ensures only one actually runs at a time no
// matter which triggered it first.
let isSyncing = false;

// Syncs all pending offline patients + referrals to the server.
export async function runSync(callbacks: SyncCallbacks = {}): Promise<SyncSummary> {
  if (isSyncing) return { syncedCount: 0, failedCount: 0, smsFailedCount: 0 };
  isSyncing = true;
  setSyncInProgress(true);

  try {
    return await doSync(callbacks);
  } finally {
    isSyncing = false;
    setSyncInProgress(false);
  }
}

async function doSync(callbacks: SyncCallbacks): Promise<SyncSummary> {
  const { idMap: patientIdMap, errors: patientErrors } = await syncPatients();

  const remainingPatients = await db.patients.toArray();
  callbacks.onPendingPatientCount?.(remainingPatients.filter((p) => !p.synced).length);

  // Persist resolved patient IDs onto any pending referrals right away —
  // patientIdMap only exists for this call. If a referral's own sync fails
  // below and gets retried later, its patient may already be gone from the
  // local "unsynced" list by then, so patientIdMap would come back empty
  // and the referral's stale LOCAL- id would never resolve again, leaving
  // it permanently orphaned (patient_id null) server-side.
  if (Object.keys(patientIdMap).length > 0) {
    const allLocalReferrals = await db.referrals.toArray();
    for (const ref of allLocalReferrals) {
      if (patientIdMap[ref.patientId]) {
        await db.referrals.update(ref.id, { patientId: patientIdMap[ref.patientId] });
      }
    }
  }

  const pending = await db.referrals.toArray().then((all) =>
    all.filter((r) => r.workflowStatus === "Pending Sync")
  );

  if (pending.length === 0) {
    const patientFailed = Object.keys(patientErrors).length > 0;
    recordSyncAttempt(!patientFailed);
    return { syncedCount: 0, failedCount: patientFailed ? 1 : 0, smsFailedCount: 0 };
  }

  const user = getUser();
  let syncedCount = 0;
  let failedCount = 0;
  let smsFailedCount = 0;

  for (const r of pending) {
    callbacks.onCardState?.(r.id, "syncing");

    // If this referral's patient was itself created offline, resolve it
    // to the real server-side ID now that patients have synced above.
    const resolvedPatientId = patientIdMap[r.patientId] || r.patientId;

    if (patientErrors[r.patientId]) {
      failedCount++;
      callbacks.onCardState?.(r.id, "error");
      callbacks.onCardError?.(r.id, `Patient sync failed: ${patientErrors[r.patientId]}`);
      continue;
    }

    const numericPatientId = parseInt(resolvedPatientId, 10);
    if (Number.isNaN(numericPatientId)) {
      // Never silently send an unresolved patient reference — that's how
      // referrals end up created with a null patient_id and vanish from
      // both the work queue and the patient's profile.
      failedCount++;
      callbacks.onCardState?.(r.id, "error");
      callbacks.onCardError?.(r.id, "Could not resolve this referral's patient — try syncing again.");
      continue;
    }

    try {
      const serverReferral = await createReferral({
        patientId: numericPatientId,
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

      // Only promote Draft → Pending Hospital Review. If this referral already
      // exists on the server (e.g. a previous sync attempt created it but was
      // interrupted before this step), it may already have moved further along
      // (Arrived, Closed, feedback given) — don't clobber that progress.
      if (serverReferral.workflow_status === "Draft") {
        await updateReferralStatus(serverReferral.id, "Pending Hospital Review");
      }

      const finalStatus =
        serverReferral.workflow_status === "Draft"
          ? "Pending Hospital Review"
          : serverReferral.workflow_status;

      await db.referrals.update(r.id, {
        syncStatus: "Synced",
        workflowStatus: finalStatus,
        synced: true,
        patientId: resolvedPatientId,
      });

      syncedCount++;
      callbacks.onCardState?.(r.id, "synced");

      // This referral was created offline, so the patient couldn't be
      // texted at creation time — send it now that it has a real server
      // ID. Awaited (not fire-and-forget) so a failure is actually caught
      // and counted here, rather than resolving after this function has
      // already returned with nothing left listening for the result.
      if (r.patientPhone) {
        const message = `Ubuzima-Link: You have been referred to ${r.hospital}. Your referral reference number is ${serverReferral.referral_number}. Please keep this number for your visit.`;
        try {
          await sendSmsNotify(serverReferral.id, r.patientPhone, message);
        } catch (smsErr: any) {
          // The referral itself synced fine — only the notification
          // failed — so this doesn't count toward failedCount or flip the
          // card back to an error state. It's surfaced as its own message
          // instead, so it isn't silently lost the way it used to be
          // (fire-and-forget, console.error only, nothing visible to the
          // nurse at all).
          smsFailedCount++;
          console.error("SMS notify failed:", smsErr);
          callbacks.onCardError?.(
            r.id,
            `Referral synced, but the SMS to the patient failed: ${smsErr.message || "Unknown error"}`
          );
        }
      }
    } catch (err: any) {
      failedCount++;
      const msg = err.message || "Unknown error";
      callbacks.onCardState?.(r.id, "error");
      callbacks.onCardError?.(r.id, msg);
    }
  }

  recordSyncAttempt(failedCount === 0);
  return { syncedCount, failedCount, smsFailedCount };
}
