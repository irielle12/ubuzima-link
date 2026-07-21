/*
 * One-off follow-up to seed_demo_data.js: converts the two demo referrals
 * that were seeded as "Rejected" into "Closed" (seen and treated as an
 * outpatient) instead — there's no legitimate reason for a referral system
 * demo to include a rejected patient, and the "reject" action isn't even
 * wired into the live hospital queue UI (HospitalQueue.tsx) in the first
 * place, only into an unrouted legacy page.
 *
 * Safe to re-run: each update is guarded by a `WHERE workflow_status = 'Rejected'`
 * check, so it only acts on rows still in that state.
 *
 * Usage: node database/update_rejected_referrals.js
 */

const pool = require("../src/config/db");

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function convert(referralNumber, { arrivedByLabel, hospitalNotes }) {
  const existing = await pool.query(
    `SELECT id, created_at FROM referrals WHERE referral_number = $1 AND workflow_status = 'Rejected'`,
    [referralNumber]
  );
  if (existing.rows.length === 0) {
    console.log(`${referralNumber} not in Rejected state — skipped`);
    return;
  }

  const { id, created_at } = existing.rows[0];
  const arrivedAt = addHours(created_at, 2.5);
  const viewedAt = addHours(created_at, 2.25);
  const closedAt = addHours(created_at, 5.5);

  await pool.query(
    `UPDATE referrals
     SET workflow_status = 'Closed',
         rejection_reason = NULL,
         arrived_at = $1,
         hospital_viewed_at = $2,
         treatment_status = 'Patient Seen & Treated',
         hospital_notes = $3,
         feedback_at = $4
     WHERE id = $5`,
    [arrivedAt, viewedAt, hospitalNotes, closedAt, id]
  );

  await pool.query(`DELETE FROM referral_events WHERE referral_id = $1 AND event_type = 'Referral Rejected'`, [id]);

  const events = [
    { type: "Patient Arrived", description: arrivedByLabel, createdAt: arrivedAt },
    { type: "Referral Closed", description: `Closed with feedback by ${arrivedByLabel.replace("Marked arrived by ", "")}`, createdAt: closedAt },
  ];
  for (const ev of events) {
    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description, created_at)
       VALUES ($1, $2, $3, $4)`,
      [id, ev.type, ev.description, ev.createdAt]
    );
  }

  console.log(`${referralNumber} -> Closed`);
}

async function main() {
  await convert("REF-DEMO-012", {
    arrivedByLabel: "Marked arrived by Dr. Amina Uwera (CLINIC001) at Kacyiru District Hospital",
    hospitalNotes: "Reviewed in outpatient clinic. Advised routine orthopedic follow-up and home exercises; no admission required.",
  });

  await convert("REF-DEMO-013", {
    arrivedByLabel: "Marked arrived by Dr. Jean Bosco Nsengimana (CLIN002) at Kacyiru District Hospital",
    hospitalNotes: "Assessed and managed symptomatically as an outpatient. No admission required.",
  });
}

main()
  .catch((err) => {
    console.error("Update failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
