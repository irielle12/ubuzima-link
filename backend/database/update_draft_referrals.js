/*
 * One-off follow-up to seed_demo_data.js: the two demo referrals that were
 * left in "Draft" (never submitted) read as unfinished in a demo. Advances
 * them further along the real workflow:
 *   - REF-DEMO-001 -> Pending Hospital Review (submitted, awaiting the hospital)
 *   - REF-DEMO-002 -> Closed, with hospital feedback filled in
 *
 * Safe to re-run: each update is guarded by a `WHERE workflow_status = ...`
 * check, so it only acts on rows still sitting in their prior state.
 *
 * Usage: node database/update_draft_referrals.js
 */

const pool = require("../src/config/db");

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  // -- REF-DEMO-001: Draft -> Pending Hospital Review --
  const r1 = await pool.query(
    `SELECT id, created_at FROM referrals WHERE referral_number = 'REF-DEMO-001' AND workflow_status = 'Draft'`
  );
  if (r1.rows.length > 0) {
    const { id, created_at } = r1.rows[0];
    await pool.query(`UPDATE referrals SET workflow_status = 'Pending Hospital Review' WHERE id = $1`, [id]);
    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description, created_at)
       VALUES ($1, 'Referral Submitted', 'Submitted by Eric Habimana (NURSE004) from Remera Health Center', $2)`,
      [id, addHours(created_at, 0.5)]
    );
    console.log("REF-DEMO-001 -> Pending Hospital Review");
  } else {
    console.log("REF-DEMO-001 already past Draft — skipped");
  }

  // -- REF-DEMO-002: Draft -> Closed (with feedback) --
  const r2 = await pool.query(
    `SELECT id, created_at FROM referrals WHERE referral_number = 'REF-DEMO-002' AND workflow_status = 'Draft'`
  );
  if (r2.rows.length > 0) {
    const { id, created_at } = r2.rows[0];
    const submittedAt = addHours(created_at, 0.5);
    const arrivedAt = addHours(created_at, 2);
    const viewedAt = addHours(created_at, 1.75);
    const closedAt = addHours(created_at, 5);

    await pool.query(
      `UPDATE referrals
       SET workflow_status = 'Closed',
           arrived_at = $1,
           hospital_viewed_at = $2,
           treatment_status = $3,
           hospital_notes = $4,
           feedback_at = $5
       WHERE id = $6`,
      [
        arrivedAt,
        viewedAt,
        "Admitted",
        "CT scan confirmed ischemic stroke. Admitted to the stroke unit for thrombolysis evaluation and ongoing monitoring.",
        closedAt,
        id,
      ]
    );

    const events = [
      { type: "Referral Submitted", description: "Submitted by Emmanuel Nshimiyimana (NURSE002) from Nyamirambo Health Post", createdAt: submittedAt },
      { type: "Patient Arrived", description: "Marked arrived by Dr. Immaculee Mukamurenzi (CLIN003) at Muhima District Hospital", createdAt: arrivedAt },
      { type: "Referral Closed", description: "Closed with feedback by Dr. Immaculee Mukamurenzi (CLIN003) at Muhima District Hospital", createdAt: closedAt },
    ];
    for (const ev of events) {
      await pool.query(
        `INSERT INTO referral_events (referral_id, event_type, event_description, created_at)
         VALUES ($1, $2, $3, $4)`,
        [id, ev.type, ev.description, ev.createdAt]
      );
    }
    console.log("REF-DEMO-002 -> Closed (with feedback)");
  } else {
    console.log("REF-DEMO-002 already past Draft — skipped");
  }
}

main()
  .catch((err) => {
    console.error("Update failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
