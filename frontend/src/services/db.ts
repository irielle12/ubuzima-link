import Dexie from "dexie";

export interface Referral {
  id: string;
  patientName: string;
  age?: string;
  gender?: string;
  diagnosis: string;
  hospital: string;
  status: "Pending Sync" | "Synced" | "Failed";
  time: string;
}

class UbuzimaDB extends Dexie {
  referrals: Dexie.Table<Referral, string>;

  constructor() {
    super("UbuzimaDB");

    this.version(1).stores({
      referrals: "id, status, hospital",
    });

    this.referrals = this.table("referrals");
  }
}

export const db = new UbuzimaDB();