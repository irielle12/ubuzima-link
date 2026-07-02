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
  patients!: Dexie.Table<Patient, string>;
  referrals!: Dexie.Table<Referral, string>;

  constructor() {
    super("UbuzimaDB");

    this.version(4).stores({
      patients:
        "id, fullName, nationalId, phoneNumber",

      referrals:
        "id, workflowStatus, syncStatus, destinationFacilityId",
    });

    this.patients = this.table("patients");
    this.referrals = this.table("referrals");
  }
}

export const db = new UbuzimaDB();
