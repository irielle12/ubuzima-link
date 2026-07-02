const API_URL =
  "http://localhost:5000/api";

export interface PatientDuplicate {
  id: number;
  patient_number: string;
  national_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
}

export async function createPatient(
  patient: any
) {
  const response =
    await fetch(
      `${API_URL}/patients`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          patient
        ),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    const err: any = new Error(data.message);
    if (response.status === 409 && data.existingPatient) {
      err.existingPatient = data.existingPatient;
    }
    throw err;
  }

  return data;
}

export async function getPatients() {
  const response =
    await fetch(
      `${API_URL}/patients`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function searchPatients(
  search: string
) {
  const response =
    await fetch(
      `${API_URL}/patients/search?q=${encodeURIComponent(
        search
      )}`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getPatientById(
  id: number | string
) {
  const response =
    await fetch(
      `${API_URL}/patients/${id}`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}

export async function getPatientReferrals(
  id: number | string
) {
  const response =
    await fetch(
      `${API_URL}/patients/${id}/referrals`
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message
    );
  }

  return data;
}