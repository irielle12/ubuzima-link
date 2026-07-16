import Dexie from "dexie";

/* Mirrors the server's patient shape (snake_case) so a patient fetched
   online and one registered offline can live in the same table. */
export interface Patient {
  id: number | string;
  patient_number?: string;
  national_id?: string;
  guardian_national_id?: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  village?: string;
  cell?: string;
  sector?: string;
  district?: string;
  emergency_contact?: string;
  created_at?: string;
  /* true once this record has been confirmed on the server */
  synced?: boolean;
}

/* Read-through cache of server-shape referral objects (whatever
   getReferralById / getReferralsBySource / getPatientReferrals last
   returned), so already-seen referrals can render while offline.
   Separate from `Referral` below, which is the offline *draft* shape
   used by the create-then-sync flow. */
export interface CachedReferral {
  id: number;
  [key: string]: any;
}

/* Read-through cache of the facility/hospital list, so the destination
   hospital picker on the referral form still works offline. */
export interface CachedFacility {
  id: number;
  name: string;
  district?: string;
  type?: string;
}

/* Local record of the last successful online login for a staff ID, so the
   same device can sign the same worker back in with no network. The
   password itself is never stored — only a salted PBKDF2 hash of it. */
export interface CachedCredential {
  staffId: string;
  passwordHash: string;
  salt: string;
  user: any;
  token: string;
  refreshToken?: string;
  cachedAt: string;
  /* Mirrors the server's login lockout (see authController.js) so a lost
     device can't be used for unlimited offline password guessing against
     the cached hash. */
  failedAttempts?: number;
  lockedUntil?: string;
}

export interface Referral {
  id: string;
  patientId: string;
  referralNumber?: string;
  chiefComplaint?: string;
  medicalHistory?: string;
  diagnosis: string;
  vitalBp?: string;
  vitalHeartRate?: string;
  vitalTemperature?: string;
  vitalRespiratoryRate?: string;
  actionTaken?: string;
  urgency: string;
  hospital: string;
  referringFacility?: string;
  referringProvider?: string;
  destinationFacilityId?: string;
  workflowStatus:
    | "Draft"
    | "Pending Sync"
    | "Pending Hospital Review"
    | "Acknowledged"
    | "Arrived"
    | "Feedback Received"
    | "Closed";
  syncStatus: "Pending" | "Synced";
  synced?: boolean;
  time: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;
}

class UbuzimaDB extends Dexie {
  patients!: Dexie.Table<Patient, string | number>;
  referrals!: Dexie.Table<Referral, string>;
  cachedReferrals!: Dexie.Table<CachedReferral, number>;
  facilities!: Dexie.Table<CachedFacility, number>;
  credentials!: Dexie.Table<CachedCredential, string>;

  constructor() {
    super("UbuzimaDB");

    this.version(4).stores({
      patients:
        "id, fullName, nationalId, phoneNumber",

      referrals:
        "id, workflowStatus, syncStatus, destinationFacilityId",
    });

    this.version(5).stores({
      patients:
        "id, national_id, phone, patient_number, synced",

      referrals:
        "id, workflowStatus, syncStatus, destinationFacilityId",

      cachedReferrals:
        "id, source_facility_id, destination_facility_id, patient_id, workflow_status",
    });

    this.version(6).stores({
      patients:
        "id, national_id, phone, patient_number, synced",

      referrals:
        "id, workflowStatus, syncStatus, destinationFacilityId",

      cachedReferrals:
        "id, source_facility_id, destination_facility_id, patient_id, workflow_status",

      facilities: "id, name",
    });

    this.version(7).stores({
      patients:
        "id, national_id, phone, patient_number, synced",

      referrals:
        "id, workflowStatus, syncStatus, destinationFacilityId",

      cachedReferrals:
        "id, source_facility_id, destination_facility_id, patient_id, workflow_status",

      facilities: "id, name",

      credentials: "staffId",
    });

    this.patients = this.table("patients");
    this.referrals = this.table("referrals");
    this.cachedReferrals = this.table("cachedReferrals");
    this.facilities = this.table("facilities");
    this.credentials = this.table("credentials");
  }
}

export const db = new UbuzimaDB();
