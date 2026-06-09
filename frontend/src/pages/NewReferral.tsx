import { useState } from "react";
import { db } from "../services/db";

export default function NewReferral() {

  const [patientName, setPatientName] =
    useState("");

  async function submitReferral() {

    await db.table("referrals").add({
      patientName,
      syncStatus: false
    });

    alert("Saved Offline");
  }

  return (
    <div>
      <h1>New Referral</h1>

      <input
        placeholder="Patient Name"
        onChange={(e) =>
          setPatientName(e.target.value)
        }
      />

      <button onClick={submitReferral}>
        Submit Referral
      </button>
    </div>
  );
}