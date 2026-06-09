import Dexie from "dexie";

export const db = new Dexie("UbuzimaLink");

db.version(1).stores({
  referrals: "++id,patientName,syncStatus"
});