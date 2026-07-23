/*
 * Renames the two original facilities so the whole demo dataset is
 * consistent with the district (Kicukiro) the final report says testing
 * was done in:
 *   Kigarama Health Post      -> Masaka Health Post      (Kicukiro, unchanged)
 *   Kacyiru District Hospital -> Kanombe Hospital         (Gasabo -> Kicukiro)
 *
 * Updates the facilities row itself, staff email domains that referenced
 * the old hospital name, and every referral_events description that had
 * the old facility name baked into its text (those are static strings,
 * not derived from a join, so a rename doesn't cascade to them on its own).
 *
 * Safe to re-run: every update is a targeted WHERE match on the old value,
 * so re-running after it's already applied is a no-op.
 *
 * Usage: node database/rename_facilities.js
 */

const pool = require("../src/config/db");

async function main() {
  const hp = await pool.query(
    `UPDATE facilities SET name = 'Masaka Health Post', sector = 'Masaka'
     WHERE name = 'Kigarama Health Post' RETURNING id`
  );
  console.log(`Facility rename: Kigarama Health Post -> Masaka Health Post (${hp.rows.length} row)`);

  const dh = await pool.query(
    `UPDATE facilities SET name = 'Kanombe Hospital', district = 'Kicukiro', sector = 'Kanombe'
     WHERE name = 'Kacyiru District Hospital' RETURNING id`
  );
  console.log(`Facility rename: Kacyiru District Hospital -> Kanombe Hospital (${dh.rows.length} row)`);

  const emails = await pool.query(
    `UPDATE users SET email = REPLACE(email, '@kacyiru.rw', '@kanombe.rw')
     WHERE email LIKE '%@kacyiru.rw' RETURNING staff_id, email`
  );
  console.log(`Updated ${emails.rows.length} staff email(s):`, emails.rows.map((r) => r.email).join(", "));

  const events = await pool.query(
    `UPDATE referral_events
     SET event_description = REPLACE(
           REPLACE(event_description, 'Kigarama Health Post', 'Masaka Health Post'),
           'Kacyiru District Hospital', 'Kanombe Hospital'
         )
     WHERE event_description ILIKE '%Kigarama Health Post%'
        OR event_description ILIKE '%Kacyiru District Hospital%'
     RETURNING id`
  );
  console.log(`Updated ${events.rows.length} referral_events row(s).`);
}

main()
  .catch((err) => {
    console.error("Rename failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
