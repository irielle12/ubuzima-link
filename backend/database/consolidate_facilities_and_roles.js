/*
 * Two consolidations requested for the defense-ready dataset:
 *
 * 1. Down to exactly the two facilities the final report names — Masaka
 *    Health Post and Kanombe Hospital. Every referral and staff account
 *    at the other five demo facilities (Masaka Health Center, Nyamirambo
 *    Health Post, Remera Health Center, Nyanza Health Center, Muhima
 *    District Hospital) is reassigned rather than deleted, then the empty
 *    facilities are removed.
 *
 * 2. The "clinician" role is renamed to "doctor" — DB role value, staff_id
 *    prefix (CLIN-prefixed IDs and CLINIC001 -> DOC-prefixed), and every
 *    event_description that referenced the old facility names or staff
 *    IDs as literal text.
 *
 * Safe to re-run: every step is a guarded UPDATE/DELETE keyed on the old
 * value, so re-running after it's already applied is a no-op.
 *
 * Usage: node database/consolidate_facilities_and_roles.js
 */

const pool = require("../src/config/db");

const KEEP_HEALTH_POST_ID = 1; // Masaka Health Post
const KEEP_HOSPITAL_ID = 3; // Kanombe Hospital
const REMOVE_HEALTH_FACILITY_IDS = [2, 4, 6]; // Masaka Health Center, Nyamirambo Health Post, Nyanza Health Center -> health post
const REMOVE_TO_HEALTH_POST_IDS = [2, 4, 5, 6]; // + Remera Health Center (id 5)
const REMOVE_HOSPITAL_IDS = [7]; // Muhima District Hospital -> hospital

const FACILITY_NAME_REPLACEMENTS = [
  ["Masaka Health Center", "Masaka Health Post"],
  ["Nyamirambo Health Post", "Masaka Health Post"],
  ["Remera Health Center", "Masaka Health Post"],
  ["Nyanza Health Center", "Masaka Health Post"],
  ["Muhima District Hospital", "Kanombe Hospital"],
];

const STAFF_ID_REPLACEMENTS = [
  ["CLINIC001", "DOC001"],
  ["CLIN001", "DOC002"],
  ["CLIN002", "DOC003"],
  ["CLIN003", "DOC004"],
  ["CLIN004", "DOC005"],
];

async function main() {
  console.log("Reassigning referrals...");
  const refSource = await pool.query(
    `UPDATE referrals SET source_facility_id = $1 WHERE source_facility_id = ANY($2::int[]) RETURNING id`,
    [KEEP_HEALTH_POST_ID, REMOVE_TO_HEALTH_POST_IDS]
  );
  const refDest = await pool.query(
    `UPDATE referrals SET destination_facility_id = $1 WHERE destination_facility_id = ANY($2::int[]) RETURNING id`,
    [KEEP_HEALTH_POST_ID, REMOVE_TO_HEALTH_POST_IDS]
  );
  const refDestHosp = await pool.query(
    `UPDATE referrals SET destination_facility_id = $1 WHERE destination_facility_id = ANY($2::int[]) RETURNING id`,
    [KEEP_HOSPITAL_ID, REMOVE_HOSPITAL_IDS]
  );
  console.log(`  source reassigned: ${refSource.rows.length}, destination reassigned: ${refDest.rows.length + refDestHosp.rows.length}`);

  console.log("Reassigning staff...");
  const usersToPost = await pool.query(
    `UPDATE users SET facility_id = $1 WHERE facility_id = ANY($2::int[]) RETURNING staff_id`,
    [KEEP_HEALTH_POST_ID, REMOVE_TO_HEALTH_POST_IDS]
  );
  const usersToHosp = await pool.query(
    `UPDATE users SET facility_id = $1 WHERE facility_id = ANY($2::int[]) RETURNING staff_id`,
    [KEEP_HOSPITAL_ID, REMOVE_HOSPITAL_IDS]
  );
  console.log(`  moved to Masaka Health Post: ${usersToPost.rows.map((r) => r.staff_id).join(", ")}`);
  console.log(`  moved to Kanombe Hospital: ${usersToHosp.rows.map((r) => r.staff_id).join(", ")}`);

  console.log("Rewriting event_description text for renamed/merged facilities...");
  let touched = 0;
  for (const [oldName, newName] of FACILITY_NAME_REPLACEMENTS) {
    const r = await pool.query(
      `UPDATE referral_events SET event_description = REPLACE(event_description, $1, $2)
       WHERE event_description LIKE '%' || $1 || '%' RETURNING id`,
      [oldName, newName]
    );
    touched += r.rows.length;
  }
  console.log(`  ${touched} event_description row(s) updated for facility names`);

  console.log("Deleting now-empty facilities...");
  const allRemoveIds = [...REMOVE_TO_HEALTH_POST_IDS, ...REMOVE_HOSPITAL_IDS];
  const del = await pool.query(
    `DELETE FROM facilities WHERE id = ANY($1::int[]) RETURNING code, name`,
    [allRemoveIds]
  );
  console.log(`  removed: ${del.rows.map((r) => `${r.code} (${r.name})`).join(", ") || "none (already removed)"}`);

  console.log("\nRenaming role 'clinician' -> 'doctor'...");
  const roleUpdate = await pool.query(
    `UPDATE users SET role = 'doctor' WHERE role = 'clinician' RETURNING staff_id`
  );
  console.log(`  ${roleUpdate.rows.length} account(s) updated: ${roleUpdate.rows.map((r) => r.staff_id).join(", ")}`);

  console.log("Renaming staff IDs (CLIN*/CLINIC001 -> DOC*)...");
  for (const [oldId, newId] of STAFF_ID_REPLACEMENTS) {
    const r = await pool.query(
      `UPDATE users SET staff_id = $1 WHERE staff_id = $2 RETURNING id, first_name, last_name`,
      [newId, oldId]
    );
    if (r.rows.length > 0) {
      console.log(`  ${oldId} -> ${newId} (${r.rows[0].first_name} ${r.rows[0].last_name})`);
    }
    await pool.query(
      `UPDATE referral_events SET event_description = REPLACE(event_description, '(' || $2 || ')', '(' || $1 || ')')
       WHERE event_description LIKE '%(' || $2 || ')%'`,
      [newId, oldId]
    );
  }

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("Consolidation failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
