import Dexie from "dexie";

export interface Patient {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  nationalId: string;
}

export interface Referral {
  id: string;

  patientId: string;

  diagnosis: string;

  urgency: string;

  hospital: string;

workflowStatus:
  | "Draft"
  | "Pending Sync"
  | "Pending Hospital Review"
  | "Acknowledged"
  | "Feedback Received"
  | "Closed";

  syncStatus:
    | "Pending"
    | "Synced";

  time: string;
}
class UbuzimaDB extends Dexie {
  patients!: Dexie.Table<Patient, string>;
  referrals!: Dexie.Table<Referral, string>;

  constructor() {
    super("UbuzimaDB");

    this.version(2).stores({
      patients:
        "id, fullName, nationalId, phoneNumber",

      referrals:
        "id, status, hospital",
    });

    this.patients = this.table("patients");
    this.referrals = this.table("referrals");
  }
}

export const db = new UbuzimaDB();