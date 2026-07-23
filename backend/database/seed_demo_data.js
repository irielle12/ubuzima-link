/*
 * Seeds realistic demo data into the live database: more facilities, staff
 * accounts, patients, and referrals at various stages of the workflow — so
 * the app has enough of a real-looking pilot network to demo, instead of a
 * handful of placeholder rows.
 *
 * Safe to re-run: every insert is keyed off a natural unique value (facility
 * code, staff_id, patient_number, referral_number) and skips rows that
 * already exist instead of duplicating them.
 *
 * Usage: node database/seed_demo_data.js
 */

const pool = require("../src/config/db");
const { hashPassword } = require("../src/utils/hashPassword");

const DEMO_PASSWORD = "Ubuzima@2026";

function daysAgo(n, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function upsertFacility(f) {
  const result = await pool.query(
    `INSERT INTO facilities (code, name, type, district, sector, phone, email)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [f.code, f.name, f.type, f.district, f.sector, f.phone, f.email]
  );
  return result.rows[0].id;
}

async function upsertUser(u, passwordHash) {
  const result = await pool.query(
    `INSERT INTO users
       (staff_id, first_name, last_name, email, password_hash, role, facility_id, active, must_change_password)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,false)
     ON CONFLICT (staff_id) DO UPDATE SET first_name = EXCLUDED.first_name
     RETURNING id`,
    [u.staffId, u.firstName, u.lastName, u.email, passwordHash, u.role, u.facilityId]
  );
  return result.rows[0].id;
}

async function upsertPatient(p) {
  const existing = await pool.query(
    `SELECT id FROM patients WHERE patient_number = $1`,
    [p.patientNumber]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const result = await pool.query(
    `INSERT INTO patients
       (patient_number, national_id, guardian_national_id, first_name, last_name,
        gender, date_of_birth, phone, village, cell, sector, district, emergency_contact, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      p.patientNumber, p.nationalId || null, p.guardianNationalId || null,
      p.firstName, p.lastName, p.gender, p.dateOfBirth, p.phone,
      p.village, p.cell, p.sector, p.district, p.emergencyContact, p.createdAt,
    ]
  );
  return result.rows[0].id;
}

async function upsertReferral(r, patientId, facilityIdByCode) {
  const existing = await pool.query(
    `SELECT id FROM referrals WHERE referral_number = $1`,
    [r.referralNumber]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const sourceFacilityId = facilityIdByCode[r.sourceCode];
  const destFacilityId = facilityIdByCode[r.destCode];

  const result = await pool.query(
    `INSERT INTO referrals
       (referral_number, patient_id, source_facility_id, destination_facility_id,
        chief_complaint, medical_history, vital_bp, vital_heart_rate, vital_temperature,
        vital_respiratory_rate, diagnosis, action_taken, urgency, workflow_status, sync_status,
        rejection_reason, treatment_status, hospital_notes, feedback_at, created_at, arrived_at,
        hospital_viewed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Synced',$15,$16,$17,$18,$19,$20,$21)
     RETURNING id`,
    [
      r.referralNumber, patientId, sourceFacilityId, destFacilityId,
      r.chiefComplaint, r.medicalHistory || null, r.vitalBp, r.vitalHeartRate, r.vitalTemperature,
      r.vitalRespiratoryRate, r.diagnosis, r.actionTaken || null, r.urgency, r.workflowStatus,
      r.rejectionReason || null, r.treatmentStatus || null, r.hospitalNotes || null,
      r.feedbackAt || null, r.createdAt, r.arrivedAt || null, r.hospitalViewedAt || null,
    ]
  );

  const referralId = result.rows[0].id;

  for (const ev of r.events) {
    await pool.query(
      `INSERT INTO referral_events (referral_id, event_type, event_description, created_at)
       VALUES ($1,$2,$3,$4)`,
      [referralId, ev.type, ev.description, ev.createdAt]
    );
  }

  return referralId;
}

// Deliberately just the two facilities the final report names — Masaka
// Health Post and Kanombe Hospital (both pre-existing, looked up by code
// below). No extra facilities are created here anymore.
const FACILITIES = [];

// facilityId is resolved by code at seed time (see facilityIdByCode below)
const USERS = [
  { staffId: "NURSE002", firstName: "Emmanuel", lastName: "Nshimiyimana", email: "emmanuel.nshimiyimana@ubuzima.rw", role: "nurse", facilityCode: "HP001" },
  { staffId: "NURSE003", firstName: "Solange", lastName: "Uwimana", email: "solange.uwimana@ubuzima.rw", role: "nurse", facilityCode: "HP001" },
  { staffId: "NURSE004", firstName: "Eric", lastName: "Habimana", email: "eric.habimana@ubuzima.rw", role: "nurse", facilityCode: "HP001" },
  { staffId: "NURSE005", firstName: "Claudine", lastName: "Mukeshimana", email: "claudine.mukeshimana@ubuzima.rw", role: "nurse", facilityCode: "HP001" },
  { staffId: "NURSE006", firstName: "Vestine", lastName: "Nyirahabimana", email: "vestine.nyirahabimana@ubuzima.rw", role: "nurse", facilityCode: "HP001" },
  { staffId: "NURSE007", firstName: "Alphonsine", lastName: "Nyiraneza", email: "alphonsine.nyiraneza@ubuzima.rw", role: "nurse", facilityCode: "HP001" },
  { staffId: "DOC003", firstName: "Dr. Jean Bosco", lastName: "Nsengimana", email: "jeanbosco.nsengimana@kanombe.rw", role: "doctor", facilityCode: "DH001" },
  { staffId: "DOC004", firstName: "Dr. Immaculee", lastName: "Mukamurenzi", email: "immaculee.mukamurenzi@kanombe.rw", role: "doctor", facilityCode: "DH001" },
  { staffId: "DOC005", firstName: "Dr. Patrick", lastName: "Ndayisenga", email: "patrick.ndayisenga@kanombe.rw", role: "doctor", facilityCode: "DH001" },
  { staffId: "ADMIN003", firstName: "Chantal", lastName: "Uwase", email: "chantal.uwase@ubuzima.rw", role: "admin", facilityCode: null },
];

const PATIENTS = [
  { key: "p1", patientNumber: "PAT-DEMO-001", nationalId: "1197803001234567", firstName: "Theogene", lastName: "Mugabo", gender: "Male", dateOfBirth: "1978-03-14", phone: "0788123456", village: "Kagarama", cell: "Kibenga", sector: "Kigarama", district: "Kicukiro", emergencyContact: "Spouse - 0788123457", createdAt: daysAgo(28) },
  { key: "p2", patientNumber: "PAT-DEMO-002", nationalId: "1199007002345678", firstName: "Esperance", lastName: "Mukandayisenga", gender: "Female", dateOfBirth: "1990-07-22", phone: "0788234567", village: "Kagarama", cell: "Kibenga", sector: "Kigarama", district: "Kicukiro", emergencyContact: "Husband - 0788234568", createdAt: daysAgo(27) },
  { key: "p3", patientNumber: "PAT-DEMO-003", guardianNationalId: "1198512003456789", firstName: "Kevin", lastName: "Iradukunda", gender: "Male", dateOfBirth: "2025-01-05", phone: null, village: "Nyakabungo", cell: "Kagarama", sector: "Kigarama", district: "Kicukiro", emergencyContact: "Mother - 0788345670", createdAt: daysAgo(26) },
  { key: "p4", patientNumber: "PAT-DEMO-004", nationalId: "1196511004567890", firstName: "Providence", lastName: "Nyiramana", gender: "Female", dateOfBirth: "1965-11-02", phone: "0788345678", village: "Kanserege", cell: "Masaka", sector: "Masaka", district: "Kicukiro", emergencyContact: "Son - 0788345679", createdAt: daysAgo(25) },
  { key: "p5", patientNumber: "PAT-DEMO-005", nationalId: "1195506005678901", firstName: "Jean Damascene", lastName: "Habyarimana", gender: "Male", dateOfBirth: "1955-06-18", phone: "0788456789", village: "Kanserege", cell: "Masaka", sector: "Masaka", district: "Kicukiro", emergencyContact: "Daughter - 0788456780", createdAt: daysAgo(24) },
  { key: "p6", patientNumber: "PAT-DEMO-006", nationalId: "1200309006789012", firstName: "Sandrine", lastName: "Umuhoza", gender: "Female", dateOfBirth: "2003-09-30", phone: "0788567890", village: "Rugarama", cell: "Nyamirambo", sector: "Nyamirambo", district: "Nyarugenge", emergencyContact: "Mother - 0788567891", createdAt: daysAgo(23) },
  { key: "p7", patientNumber: "PAT-DEMO-007", nationalId: "1198212007890123", firstName: "Innocent", lastName: "Byiringiro", gender: "Male", dateOfBirth: "1982-12-25", phone: "0788678901", village: "Rugarama", cell: "Nyamirambo", sector: "Nyamirambo", district: "Nyarugenge", emergencyContact: "Wife - 0788678902", createdAt: daysAgo(22) },
  { key: "p8", patientNumber: "PAT-DEMO-008", nationalId: "1199804008901234", firstName: "Marie Rose", lastName: "Uwamahoro", gender: "Female", dateOfBirth: "1998-04-11", phone: "0788789012", village: "Nyabisindu", cell: "Rukiri", sector: "Remera", district: "Gasabo", emergencyContact: "Brother - 0788789013", createdAt: daysAgo(21) },
  { key: "p9", patientNumber: "PAT-DEMO-009", nationalId: "1197208009012345", firstName: "Dieudonne", lastName: "Nkurunziza", gender: "Male", dateOfBirth: "1972-08-08", phone: "0788890123", village: "Nyabisindu", cell: "Rukiri", sector: "Remera", district: "Gasabo", emergencyContact: "Wife - 0788890124", createdAt: daysAgo(20) },
  { key: "p10", patientNumber: "PAT-DEMO-010", guardianNationalId: "1199001010123456", firstName: "Grace", lastName: "Ishimwe", gender: "Female", dateOfBirth: "2018-02-14", phone: null, village: "Kamatamu", cell: "Kamatamu", sector: "Kacyiru", district: "Gasabo", emergencyContact: "Father - 0788901235", createdAt: daysAgo(19) },
  { key: "p11", patientNumber: "PAT-DEMO-011", nationalId: "1196001011234567", firstName: "Faustin", lastName: "Munyaneza", gender: "Male", dateOfBirth: "1960-01-01", phone: "0788901234", village: "Busasamana", cell: "Busasamana", sector: "Busasamana", district: "Nyanza", emergencyContact: "Son - 0788901236", createdAt: daysAgo(18) },
  { key: "p12", patientNumber: "PAT-DEMO-012", nationalId: "1198805012345678", firstName: "Odette", lastName: "Nyirahabineza", gender: "Female", dateOfBirth: "1988-05-19", phone: "0789012345", village: "Busasamana", cell: "Busasamana", sector: "Busasamana", district: "Nyanza", emergencyContact: "Husband - 0789012346", createdAt: daysAgo(15) },
  { key: "p13", patientNumber: "PAT-DEMO-013", nationalId: "1199510013456789", firstName: "Aime Cedric", lastName: "Tuyishime", gender: "Male", dateOfBirth: "1995-10-03", phone: "0789123456", village: "Nyarugunga", cell: "Kanserege", sector: "Nyarugunga", district: "Kicukiro", emergencyContact: "Sister - 0789123457", createdAt: daysAgo(12) },
  { key: "p14", patientNumber: "PAT-DEMO-014", nationalId: "1194503014567890", firstName: "Bernadette", lastName: "Mukansanga", gender: "Female", dateOfBirth: "1945-03-27", phone: "0789234567", village: "Muhima", cell: "Muhima", sector: "Muhima", district: "Nyarugenge", emergencyContact: "Grandson - 0789234568", createdAt: daysAgo(9) },
  { key: "p15", patientNumber: "PAT-DEMO-015", guardianNationalId: "1198005015678901", firstName: "Yves", lastName: "Ntawuruhunga", gender: "Male", dateOfBirth: "2010-06-15", phone: null, village: "Kimironko", cell: "Kimironko", sector: "Kimironko", district: "Gasabo", emergencyContact: "Mother - 0789345679", createdAt: daysAgo(6) },
];

// event helper builders — each returns the referral_events rows for a given
// stage of the workflow, timestamped relative to when the referral itself
// was created (createdDaysAgo).
function createdEvent(createdDaysAgo, who, where) {
  return { type: "Referral Created", description: `Referred by ${who} from ${where}`, createdAt: daysAgo(createdDaysAgo, 8, 15) };
}
function submittedEvent(createdDaysAgo, who, where) {
  return { type: "Referral Submitted", description: `Submitted by ${who} from ${where}`, createdAt: daysAgo(createdDaysAgo, 8, 45) };
}
function arrivedEvent(createdDaysAgo, note) {
  return { type: "Patient Arrived", description: note, createdAt: daysAgo(createdDaysAgo, 11, 30) };
}
function closedEvent(createdDaysAgo, note) {
  return { type: "Referral Closed", description: note, createdAt: daysAgo(createdDaysAgo, 15, 0) };
}

const REFERRALS = [
  { referralNumber: "REF-DEMO-001", patientKey: "p15", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Fell from a tree, right arm pain and swelling", diagnosis: "Suspected forearm fracture", urgency: "Urgent", vitalBp: "110/70", vitalHeartRate: "92", vitalTemperature: "36.8", vitalRespiratoryRate: "20", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(1, 8, 0), events: [createdEvent(1, "Eric Habimana (NURSE004)", "Masaka Health Post"), submittedEvent(1, "Eric Habimana (NURSE004)", "Masaka Health Post")] },
  { referralNumber: "REF-DEMO-002", patientKey: "p14", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Progressive confusion and weakness on left side since this morning", diagnosis: "Suspected stroke", urgency: "Emergency", vitalBp: "168/104", vitalHeartRate: "98", vitalTemperature: "37.1", vitalRespiratoryRate: "22", workflowStatus: "Closed", treatmentStatus: "Admitted", hospitalNotes: "CT scan confirmed ischemic stroke. Admitted to the stroke unit for thrombolysis evaluation and ongoing monitoring.", createdAt: daysAgo(0, 7, 30), arrivedAt: daysAgo(0, 9, 30), hospitalViewedAt: daysAgo(0, 9, 15), feedbackAt: daysAgo(0, 15, 0), events: [createdEvent(0, "Emmanuel Nshimiyimana (NURSE002)", "Masaka Health Post"), submittedEvent(0, "Emmanuel Nshimiyimana (NURSE002)", "Masaka Health Post"), arrivedEvent(0, "Marked arrived by Dr. Immaculee Mukamurenzi (DOC004) at Kanombe Hospital"), closedEvent(0, "Closed with feedback by Dr. Immaculee Mukamurenzi (DOC004) at Kanombe Hospital")] },

  // -- Pending Hospital Review (submitted, waiting) --
  { referralNumber: "REF-DEMO-003", patientKey: "p13", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Severe right lower abdominal pain, fever, vomiting", diagnosis: "Suspected appendicitis", urgency: "Urgent", vitalBp: "118/76", vitalHeartRate: "104", vitalTemperature: "38.6", vitalRespiratoryRate: "24", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(2, 8, 15), events: [createdEvent(2, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), submittedEvent(2, "Jeanne Mukamana (NURSE001)", "Masaka Health Post")] },
  { referralNumber: "REF-DEMO-004", patientKey: "p12", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Persistent vomiting and diarrhea for 3 days, unable to keep fluids down", diagnosis: "Acute gastroenteritis with moderate dehydration", urgency: "Urgent", vitalBp: "96/60", vitalHeartRate: "112", vitalTemperature: "37.9", vitalRespiratoryRate: "22", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(3, 9, 0), events: [createdEvent(3, "Claudine Mukeshimana (NURSE005)", "Masaka Health Post"), submittedEvent(3, "Claudine Mukeshimana (NURSE005)", "Masaka Health Post")] },
  { referralNumber: "REF-DEMO-005", patientKey: "p9", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Chronic cough for 4 weeks, night sweats, weight loss", diagnosis: "Suspected pulmonary tuberculosis", urgency: "Routine", vitalBp: "112/74", vitalHeartRate: "88", vitalTemperature: "37.4", vitalRespiratoryRate: "20", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(5, 8, 30), events: [createdEvent(5, "Eric Habimana (NURSE004)", "Masaka Health Post"), submittedEvent(5, "Eric Habimana (NURSE004)", "Masaka Health Post")] },
  { referralNumber: "REF-DEMO-006", patientKey: "p6", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Second-degree burns to left hand and forearm from cooking accident", diagnosis: "Second-degree burns, approx. 8% BSA", urgency: "Urgent", vitalBp: "122/80", vitalHeartRate: "96", vitalTemperature: "37.0", vitalRespiratoryRate: "18", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(4, 10, 0), events: [createdEvent(4, "Alphonsine Nyiraneza (NURSE007)", "Masaka Health Post"), submittedEvent(4, "Alphonsine Nyiraneza (NURSE007)", "Masaka Health Post")] },
  { referralNumber: "REF-DEMO-007", patientKey: "p8", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "28 weeks pregnant, severe headache, blurred vision, swollen feet", diagnosis: "Suspected pre-eclampsia", urgency: "Urgent", vitalBp: "156/98", vitalHeartRate: "90", vitalTemperature: "36.9", vitalRespiratoryRate: "20", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(1, 13, 0), events: [createdEvent(1, "Eric Habimana (NURSE004)", "Masaka Health Post"), submittedEvent(1, "Eric Habimana (NURSE004)", "Masaka Health Post")] },

  // -- Arrived (accepted, patient present at hospital) --
  { referralNumber: "REF-DEMO-008", patientKey: "p1", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "High fever, chills, confusion for 2 days", diagnosis: "Severe malaria with altered consciousness", urgency: "Emergency", vitalBp: "100/64", vitalHeartRate: "118", vitalTemperature: "39.8", vitalRespiratoryRate: "28", workflowStatus: "Arrived", createdAt: daysAgo(6, 7, 45), arrivedAt: daysAgo(6, 11, 30), hospitalViewedAt: daysAgo(6, 10, 0), events: [createdEvent(6, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), submittedEvent(6, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), arrivedEvent(6, "Marked arrived by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-009", patientKey: "p4", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Sudden severe chest pain radiating to left arm, sweating", diagnosis: "Suspected acute coronary syndrome", urgency: "Emergency", vitalBp: "88/56", vitalHeartRate: "128", vitalTemperature: "36.6", vitalRespiratoryRate: "26", workflowStatus: "Arrived", createdAt: daysAgo(8, 8, 0), arrivedAt: daysAgo(8, 10, 45), hospitalViewedAt: daysAgo(8, 9, 30), events: [createdEvent(8, "Solange Uwimana (NURSE003)", "Masaka Health Post"), submittedEvent(8, "Solange Uwimana (NURSE003)", "Masaka Health Post"), arrivedEvent(8, "Marked arrived by Dr. Jean Bosco Nsengimana (DOC003) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-010", patientKey: "p7", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Motorbike accident, deformity and swelling of right thigh, unable to bear weight", diagnosis: "Suspected fractured femur", urgency: "Emergency", vitalBp: "104/68", vitalHeartRate: "110", vitalTemperature: "37.2", vitalRespiratoryRate: "24", workflowStatus: "Arrived", createdAt: daysAgo(10, 16, 0), arrivedAt: daysAgo(10, 18, 15), hospitalViewedAt: daysAgo(10, 17, 0), events: [createdEvent(10, "Emmanuel Nshimiyimana (NURSE002)", "Masaka Health Post"), submittedEvent(10, "Emmanuel Nshimiyimana (NURSE002)", "Masaka Health Post"), arrivedEvent(10, "Marked arrived by Dr. Immaculee Mukamurenzi (DOC004) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-011", patientKey: "p11", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Known diabetic, drowsy and breathing rapidly, fruity breath odor", diagnosis: "Suspected diabetic ketoacidosis", urgency: "Emergency", vitalBp: "98/60", vitalHeartRate: "116", vitalTemperature: "37.6", vitalRespiratoryRate: "30", workflowStatus: "Arrived", createdAt: daysAgo(7, 6, 30), arrivedAt: daysAgo(7, 9, 0), hospitalViewedAt: daysAgo(7, 8, 0), events: [createdEvent(7, "Claudine Mukeshimana (NURSE005)", "Masaka Health Post"), submittedEvent(7, "Claudine Mukeshimana (NURSE005)", "Masaka Health Post"), arrivedEvent(7, "Marked arrived by Dr. Patrick Ndayisenga (DOC005) at Kanombe Hospital")] },

  { referralNumber: "REF-DEMO-012", patientKey: "p5", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Chronic knee pain, worse on stairs, no swelling or fever", diagnosis: "Suspected osteoarthritis", urgency: "Routine", vitalBp: "134/84", vitalHeartRate: "78", vitalTemperature: "36.6", vitalRespiratoryRate: "18", workflowStatus: "Closed", treatmentStatus: "Patient Seen & Treated", hospitalNotes: "Reviewed in outpatient clinic. Advised routine orthopedic follow-up and home exercises; no admission required.", createdAt: daysAgo(14, 9, 0), arrivedAt: daysAgo(14, 11, 0), hospitalViewedAt: daysAgo(14, 10, 45), feedbackAt: daysAgo(14, 14, 0), events: [createdEvent(14, "Solange Uwimana (NURSE003)", "Masaka Health Post"), submittedEvent(14, "Solange Uwimana (NURSE003)", "Masaka Health Post"), arrivedEvent(14, "Marked arrived by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital"), closedEvent(14, "Closed with feedback by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-013", patientKey: "p2", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Mild seasonal cough and runny nose, no fever", diagnosis: "Suspected common cold", urgency: "Routine", vitalBp: "116/72", vitalHeartRate: "80", vitalTemperature: "36.9", vitalRespiratoryRate: "18", workflowStatus: "Closed", treatmentStatus: "Patient Seen & Treated", hospitalNotes: "Assessed and managed symptomatically as an outpatient. No admission required.", createdAt: daysAgo(11, 10, 30), arrivedAt: daysAgo(11, 12, 15), hospitalViewedAt: daysAgo(11, 12, 0), feedbackAt: daysAgo(11, 15, 0), events: [createdEvent(11, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), submittedEvent(11, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), arrivedEvent(11, "Marked arrived by Dr. Jean Bosco Nsengimana (DOC003) at Kanombe Hospital"), closedEvent(11, "Closed with feedback by Dr. Jean Bosco Nsengimana (DOC003) at Kanombe Hospital")] },

  // -- Closed (with feedback) --
  { referralNumber: "REF-DEMO-014", patientKey: "p3", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "3-month-old, poor feeding, fast breathing, chest indrawing", diagnosis: "Severe pneumonia", urgency: "Emergency", vitalBp: "-", vitalHeartRate: "148", vitalTemperature: "38.9", vitalRespiratoryRate: "58", workflowStatus: "Closed", treatmentStatus: "Admitted", hospitalNotes: "Started on IV antibiotics and oxygen support. Responding well, expected discharge in 3-4 days.", createdAt: daysAgo(20, 7, 0), arrivedAt: daysAgo(20, 9, 30), hospitalViewedAt: daysAgo(20, 8, 30), feedbackAt: daysAgo(17, 14, 0), events: [createdEvent(20, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), submittedEvent(20, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), arrivedEvent(20, "Marked arrived by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital"), closedEvent(17, "Closed with feedback by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-015", patientKey: "p10", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Fell off a swing, deformity of left wrist, crying in pain", diagnosis: "Suspected wrist fracture", urgency: "Urgent", vitalBp: "-", vitalHeartRate: "104", vitalTemperature: "36.8", vitalRespiratoryRate: "22", workflowStatus: "Closed", treatmentStatus: "Patient Seen & Treated", hospitalNotes: "X-ray confirmed greenstick fracture. Cast applied, follow-up in 2 weeks.", createdAt: daysAgo(16, 9, 30), arrivedAt: daysAgo(16, 11, 0), hospitalViewedAt: daysAgo(16, 10, 15), feedbackAt: daysAgo(16, 13, 0), events: [createdEvent(16, "Eric Habimana (NURSE004)", "Masaka Health Post"), submittedEvent(16, "Eric Habimana (NURSE004)", "Masaka Health Post"), arrivedEvent(16, "Marked arrived by Dr. Jean Bosco Nsengimana (DOC003) at Kanombe Hospital"), closedEvent(16, "Closed with feedback by Dr. Jean Bosco Nsengimana (DOC003) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-016", patientKey: "p9", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "In active labor, prolonged second stage, fetal distress signs", diagnosis: "Obstructed labor", urgency: "Emergency", vitalBp: "128/82", vitalHeartRate: "102", vitalTemperature: "37.3", vitalRespiratoryRate: "24", workflowStatus: "Closed", treatmentStatus: "Referred Onward", hospitalNotes: "Emergency C-section performed, mother and baby stable. Transferred to maternity ward for recovery.", createdAt: daysAgo(23, 3, 0), arrivedAt: daysAgo(23, 4, 30), hospitalViewedAt: daysAgo(23, 3, 45), feedbackAt: daysAgo(22, 10, 0), events: [createdEvent(23, "Eric Habimana (NURSE004)", "Masaka Health Post"), submittedEvent(23, "Eric Habimana (NURSE004)", "Masaka Health Post"), arrivedEvent(23, "Marked arrived by Dr. Immaculee Mukamurenzi (DOC004) at Kanombe Hospital"), closedEvent(22, "Closed with feedback by Dr. Immaculee Mukamurenzi (DOC004) at Kanombe Hospital")] },

  // -- Closed (without feedback / patient did not arrive) --
  { referralNumber: "REF-DEMO-017", patientKey: "p1", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Snake bite to right foot while farming, mild swelling", diagnosis: "Snake bite, monitoring for envenomation", urgency: "Emergency", vitalBp: "118/76", vitalHeartRate: "94", vitalTemperature: "36.9", vitalRespiratoryRate: "20", workflowStatus: "Closed", treatmentStatus: "Patient Did Not Arrive", hospitalNotes: "No record of patient arrival within 24 hours of referral. Health post following up.", createdAt: daysAgo(19, 14, 0), feedbackAt: daysAgo(18, 9, 0), events: [createdEvent(19, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), submittedEvent(19, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), closedEvent(18, "Closed without feedback by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-018", patientKey: "p4", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Elderly patient, fell at home, unable to stand, hip pain", diagnosis: "Suspected hip fracture", urgency: "Urgent", vitalBp: "142/88", vitalHeartRate: "92", vitalTemperature: "36.7", vitalRespiratoryRate: "20", workflowStatus: "Closed", treatmentStatus: "Admitted", hospitalNotes: "Confirmed neck-of-femur fracture on X-ray. Scheduled for surgical fixation, admitted to orthopedic ward.", createdAt: daysAgo(13, 8, 0), arrivedAt: daysAgo(13, 10, 30), hospitalViewedAt: daysAgo(13, 9, 15), feedbackAt: daysAgo(12, 16, 0), events: [createdEvent(13, "Solange Uwimana (NURSE003)", "Masaka Health Post"), submittedEvent(13, "Solange Uwimana (NURSE003)", "Masaka Health Post"), arrivedEvent(13, "Marked arrived by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital"), closedEvent(12, "Closed with feedback by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital")] },

  // -- This week (keeps each facility's "Referrals This Week" stat non-zero) --
  { referralNumber: "REF-DEMO-019", patientKey: "p1", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Persistent fever for 6 days, headache, abdominal discomfort", diagnosis: "Suspected typhoid fever", urgency: "Routine", vitalBp: "118/74", vitalHeartRate: "86", vitalTemperature: "38.2", vitalRespiratoryRate: "18", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(1, 9, 0), events: [createdEvent(1, "Jeanne Mukamana (NURSE001)", "Masaka Health Post"), submittedEvent(1, "Jeanne Mukamana (NURSE001)", "Masaka Health Post")] },
  { referralNumber: "REF-DEMO-020", patientKey: "p5", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "Known chronic kidney disease, increasing swelling and shortness of breath", diagnosis: "Suspected CKD progression, needs dialysis evaluation", urgency: "Urgent", vitalBp: "158/94", vitalHeartRate: "88", vitalTemperature: "36.8", vitalRespiratoryRate: "22", workflowStatus: "Arrived", createdAt: daysAgo(0, 8, 0), arrivedAt: daysAgo(0, 10, 0), hospitalViewedAt: daysAgo(0, 9, 45), events: [createdEvent(0, "Solange Uwimana (NURSE003)", "Masaka Health Post"), submittedEvent(0, "Solange Uwimana (NURSE003)", "Masaka Health Post"), arrivedEvent(0, "Marked arrived by Dr. Amina Uwera (CLINIC001) at Kanombe Hospital")] },
  { referralNumber: "REF-DEMO-021", patientKey: "p12", sourceCode: "HP001", destCode: "DH001", chiefComplaint: "High fever, chills, and body aches for 2 days", diagnosis: "Suspected malaria", urgency: "Urgent", vitalBp: "108/70", vitalHeartRate: "108", vitalTemperature: "39.1", vitalRespiratoryRate: "24", workflowStatus: "Pending Hospital Review", createdAt: daysAgo(1, 10, 0), events: [createdEvent(1, "Claudine Mukeshimana (NURSE005)", "Masaka Health Post"), submittedEvent(1, "Claudine Mukeshimana (NURSE005)", "Masaka Health Post")] },
];

async function main() {
  console.log("Seeding facilities...");
  const facilityIdByCode = {
    HP001: (await pool.query(`SELECT id FROM facilities WHERE code = 'HP001'`)).rows[0]?.id,
    DH001: (await pool.query(`SELECT id FROM facilities WHERE code = 'DH001'`)).rows[0]?.id,
  };
  for (const f of FACILITIES) {
    facilityIdByCode[f.code] = await upsertFacility(f);
    console.log(`  ${f.code} — ${f.name}`);
  }

  console.log("\nSeeding staff users...");
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const createdUsers = [];
  for (const u of USERS) {
    const facilityId = u.facilityCode ? facilityIdByCode[u.facilityCode] : null;
    await upsertUser({ ...u, facilityId }, passwordHash);
    createdUsers.push(u);
    console.log(`  ${u.staffId} — ${u.firstName} ${u.lastName} (${u.role})`);
  }

  console.log("\nSeeding patients...");
  const patientIdByKey = {};
  for (const p of PATIENTS) {
    patientIdByKey[p.key] = await upsertPatient(p);
    console.log(`  ${p.patientNumber} — ${p.firstName} ${p.lastName}`);
  }

  console.log("\nSeeding referrals...");
  for (const r of REFERRALS) {
    await upsertReferral(r, patientIdByKey[r.patientKey], facilityIdByCode);
    console.log(`  ${r.referralNumber} — ${r.diagnosis} [${r.workflowStatus}]`);
  }

  console.log("\nDone.\n");
  console.log("Demo login credentials (shared password for all seeded accounts):");
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  console.log("Nurse accounts (no email 2FA — log in with Staff ID + password directly):");
  for (const u of createdUsers.filter((u) => u.role === "nurse")) {
    console.log(`  ${u.staffId}  —  ${u.firstName} ${u.lastName}`);
  }
  console.log("\nDoctor/Admin accounts (require email 2FA code — needs RESEND_API_KEY configured):");
  for (const u of createdUsers.filter((u) => u.role !== "nurse")) {
    console.log(`  ${u.staffId}  —  ${u.firstName} ${u.lastName}  —  ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
